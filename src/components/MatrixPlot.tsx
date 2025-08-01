'use client';

import { usePlotSettings } from '@/context/PlotSettingsContext';
import dynamic from 'next/dynamic';
import { SimpleLinearRegression } from 'ml-regression-simple-linear';
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

type MatrixPlotProps = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    matrixData: any[];
    labelFontSize: number;
    title?: string;
    subtitle?: string;
    height?: number;
};

function percentDiff(x: number, y: number): number {
    const denom = (Math.abs(x) + Math.abs(y)) / 2;
    return denom === 0 ? 0 : (Math.abs(x - y) / denom) * 100;
}
function distToXY(x: number, y: number): number {
    return Math.log10(1 + Math.abs(x - y) / Math.sqrt(2)); // log(1 + dist)
}
function normalize(values: number[]): number[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1; // prevent divide-by-zero
    return values.map(v => (v - min) / range);
}
const MatrixPlot = ({ matrixData, labelFontSize, title = "Matrix", subtitle = "", height = 600 }: MatrixPlotProps) => {

    const { colorBy, focusRangeMax, setSettings, focusRangeMaxManuallySet } = usePlotSettings();
    if (!matrixData || matrixData.length === 0) return null;
    const dimensions = Object.keys(matrixData[0]);
    const colorFunction = colorBy === 'diff' ? percentDiff : distToXY;


    const colorbarTitle = colorBy === 'diff'
        ? '% Diff from x=y'
        : 'Distance from point to x=y';
    const avgTitle = colorBy === 'diff'
        ? '% Diff'
        : 'Distance';

    if (dimensions.length === 2) {
        const [xKey, yKey] = dimensions;
        const xValues = matrixData.map(row => row[xKey]);
        const yValues = matrixData.map(row => row[yKey]);
        const rawValues = xValues.map((x, i) => colorFunction(x, yValues[i]));
        const colorValues = colorBy === 'diff'
            ? rawValues
            : normalize(rawValues);
        const maxRaw = Math.max(...rawValues);
        if (!focusRangeMaxManuallySet) {
            if (focusRangeMax === 100 || maxRaw > focusRangeMax) {
                if (maxRaw > 100) {
                    setSettings({ focusRangeMax: 100 });
                } else {
                    setSettings({
                        focusRangeMax: maxRaw,
                    });
                }
            }
        }
        const colorbarCmax = colorBy === 'diff'
            ? focusRangeMax
            : 1;
        return (
            <Plot
                data={[
                    {
                        x: xValues,
                        y: yValues,
                        mode: 'markers',
                        type: 'scatter',
                        marker: {
                            color: colorValues,
                            colorscale: 'Viridis',
                            cmin: 0,
                            cmax: colorbarCmax,
                            showscale: true,
                            colorbar: {
                                title: {
                                    text: colorbarTitle,
                                    side: 'right'
                                },
                                titleside: 'right',
                            },
                        },
                        name: `${yKey} vs ${xKey}`,
                        hovertemplate: `${xKey}: %{x}<br>${yKey}: %{y}<br>${colorbarTitle}: %{marker.color:.2f}%<extra></extra>`,
                    } as Partial<Plotly.PlotData>,
                ]}
                layout={{
                    title: { text: `${title}<br><sub>${subtitle}</sub>` },
                    height: height,
                    font: { size: labelFontSize },
                    xaxis: { title: { text: xKey } },
                    yaxis: { title: { text: yKey } },
                    modebar: {
                        orientation: 'v', // Vertical modebar
                    },
                }}
                config={{ responsive: true }}
            />
        );
    }
    // Case 2: >2D scatter matrix (use first 2 dimensions for coloring)
    const [xKey, yKey] = dimensions;
    const rawValues = matrixData.map(row => {
        const x = row[xKey];
        const y = row[yKey];
        return x != null && y != null ? colorFunction(x, y) : 0;
    });

    const maxRaw = Math.max(...rawValues);
    if (!focusRangeMaxManuallySet) {
        if (focusRangeMax === 100 || maxRaw > focusRangeMax) {
            if (maxRaw > 100) {
                setSettings({ focusRangeMax: 100 });
            } else {
                setSettings({
                    focusRangeMax: maxRaw,
                });
            }
        }
    }
    const colorbarCmax = colorBy === 'diff'
        ? focusRangeMax
        : 1;
    const colorValues = colorBy === 'diff'
        ? rawValues
        : normalize(rawValues);

    // Compute all pairwise avg scores only once
    const pairwiseScores = new Map<string, number>();
    const pairwiseSlopes = new Map<string, number>();

    for (let i = 0; i < dimensions.length; i++) {
        for (let j = 0; j < dimensions.length; j++) {
            if (i === j) continue;
            const a = dimensions[i];
            const b = dimensions[j];
            const key = `${a}|${b}`;
            const xVals: number[] = [];
            const yVals: number[] = [];
            const values = matrixData.map(row => {
                const x = row[a];
                const y = row[b];
                if (x != null && y != null) {
                    xVals.push(x);
                    yVals.push(y);
                    return colorFunction(x, y);
                }
                return null;
            }).filter(v => v !== null) as number[];

            const avg = values.length > 0
                ? values.reduce((sum, v) => sum + v, 0) / values.length
                : 0;
            let slope = 0;
            try {
                const model = new SimpleLinearRegression(xVals, yVals);
                slope = model.slope;
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (err) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                slope = NaN;
            }
            pairwiseScores.set(key, avg);
            pairwiseSlopes.set(key, slope);
        }
    }


    const columnScores = dimensions.map(col => {
        const avgScore = dimensions
            .filter(other => other !== col)
            .map(other => {
                const key1 = `${col}|${other}`;
                const key2 = `${other}|${col}`;
                return pairwiseScores.get(key1) ?? pairwiseScores.get(key2) ?? 0;
            })
            .reduce((a, b) => a + b, 0) / (dimensions.length - 1);

        return { col, avgScore };
    });
    // Sort columns by avgScore descending
    const sortedDimensions = columnScores
        .sort((a, b) => b.avgScore - a.avgScore)
        // .sort((a, b) => a.avgScore - b.avgScore)
        .map(d => d.col);

    const annotations: Partial<Plotly.Annotations>[] = [];
    for (let i = 0; i < sortedDimensions.length; i++) {
        for (let j = i + 1; j < sortedDimensions.length; j++) {
            const xKey = sortedDimensions[i];
            const yKey = sortedDimensions[j];

            // const pairValues = matrixData.map(row => {
            //     const x = row[xKey];
            //     const y = row[yKey];
            //     return x != null && y != null ? colorFunction(x, y) : null;
            // }).filter(v => v !== null) as number[];

            // const avg = pairValues.length > 0
            //     ? pairValues.reduce((sum, v) => sum + v, 0) / pairValues.length
            //     : 0;
            const avg = pairwiseScores.get(`${xKey}|${yKey}`) ?? 0;
            const slope = pairwiseSlopes.get(`${xKey}|${yKey}`) ?? 0;
            annotations.push({
                text: `Avg ${avgTitle}: ${avg.toFixed(2)}<br>Slope: ${slope.toFixed(2)}`,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                xref: `x${i + 1} domain` as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                yref: `y${j + 1} domain` as any,
                x: 0.05,
                y: 0.95,
                showarrow: false,
                font: {
                    size: labelFontSize * 0.8,
                    color: 'black',
                },
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                bordercolor: 'gray',
                borderwidth: 1,
            });
        }
    }
    // const annotations: Partial<Plotly.Annotations>[] = [];

    // for (let i = 0; i < sortedDimensions.length; i++) {
    //     for (let j = 0; j < sortedDimensions.length; j++) {
    //         const xKey = sortedDimensions[i];
    //         const yKey = sortedDimensions[j];

    //         if (i === j) {
    //             // Diagonal label
    //             annotations.push({
    //                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //                 xref: `x${i + 1} domain` as any,
    //                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //                 yref: `y${j + 1} domain` as any,
    //                 x: 0.5,
    //                 y: 0.5,
    //                 showarrow: false,
    //                 text: xKey,
    //                 // textangle: '-45',
    //                 font: {
    //                     size: labelFontSize,
    //                     color: 'gray',
    //                 },
    //             });
    //         } else if (i > j) {
    //             // Upper triangle slope value
    //             const slope = pairwiseSlopes.get(`${xKey}|${yKey}`) ?? 0;
    //             annotations.push({
    //                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //                 xref: `x${i + 1} domain` as any,
    //                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //                 yref: `y${j + 1} domain` as any,
    //                 x: 0.5,
    //                 y: 0.5,
    //                 showarrow: false,
    //                 text: `Slope: ${slope.toFixed(2)}`,
    //                 font: {
    //                     size: labelFontSize * 0.8,
    //                     color: 'black',
    //                 },
    //                 bgcolor: 'rgba(255, 255, 255, 0.8)',
    //                 bordercolor: 'gray',
    //                 borderwidth: 1,
    //             });
    //         }
    //     }
    // }

    return (
        <Plot
            data={[
                {
                    type: 'splom',
                    // dimensions: dimensions.map(col => ({
                    dimensions: sortedDimensions.map(col => ({
                        label: col,
                        values: matrixData.map(row => row[col]),
                    })),
                    marker: {
                        color: colorValues,
                        colorscale: 'Viridis',
                        cmin: 0,
                        cmax: colorbarCmax,
                        showscale: true,
                        colorbar: {
                            title: {
                                text: colorbarTitle,
                                side: 'right'
                            },
                            titleside: 'right',
                        },
                        line: { color: 'black', width: 0.5 },
                    },
                    diagonal: { visible: false },
                    showupperhalf: false,
                    // diagonal: { visible: false },       // hide histograms
                    // showlowerhalf: true,               // hide scatter
                    // showupperhalf: true,                // enable for annotations only
                    hovertemplate: '%{xaxis.title.text}: %{x}<br>%{yaxis.title.text}: %{y}<br>' +
                        `${colorbarTitle}: %{marker.color:.2f}%<extra></extra>`
                } as Partial<Plotly.PlotData>,
            ]}
            layout={{
                title: {
                    text: `${title}<br><sub>${subtitle}</sub>`,
                },
                modebar: {
                    orientation: 'v', // Vertical modebar
                },
                height: height,
                font: { size: labelFontSize },
                annotations,
                updatemenus: [
                    {
                        type: 'dropdown',
                        direction: 'down',
                        x: 0.75,
                        y: 1,
                        showactive: true,
                        buttons: [
                            {
                                label: 'Show Details',
                                method: 'relayout',
                                args: ['annotations', annotations],
                            },
                            {
                                label: 'Hide Details',
                                method: 'relayout',
                                args: ['annotations', []],
                            },
                        ],
                        pad: { r: 10, t: 10 },
                        xanchor: 'left',
                        yanchor: 'top',
                    },
                ],

            }}
            config={{ responsive: true }}
        />
    );
};

export default MatrixPlot;