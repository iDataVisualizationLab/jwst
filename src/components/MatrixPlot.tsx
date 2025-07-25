'use client';

import { usePlotSettings } from '@/context/PlotSettingsContext';
import dynamic from 'next/dynamic';
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

type MatrixPlotProps = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    matrixData: any[];
    labelFontSize: number;
    title?: string;
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
const MatrixPlot = ({ matrixData, labelFontSize, title = "Matrix" }: MatrixPlotProps) => {

    const { colorBy, focusRangeMax,
    } = usePlotSettings();
    if (!matrixData || matrixData.length === 0) return null;
    const dimensions = Object.keys(matrixData[0]);
    const colorFunction = colorBy === 'diff' ? percentDiff : distToXY;


    const colorbarTitle = colorBy === 'diff'
        ? '% Diff from x=y'
        : 'Distance from point to x=y';

    const colorbarCmax = colorBy === 'diff'
        ? focusRangeMax
        : 1;

    if (dimensions.length === 2) {
        const [xKey, yKey] = dimensions;
        const xValues = matrixData.map(row => row[xKey]);
        const yValues = matrixData.map(row => row[yKey]);
        const rawValues = xValues.map((x, i) => colorFunction(x, yValues[i]));
        const colorValues = colorBy === 'diff'
            ? rawValues
            : normalize(rawValues);

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
                    } as Partial<Plotly.PlotData>,
                ]}
                layout={{
                    title: { text: `${title}: ${yKey} vs ${xKey}` },
                    height: 600,
                    font: { size: labelFontSize },
                    xaxis: { title: { text: xKey } },
                    yaxis: { title: { text: yKey } },
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

    const colorValues = colorBy === 'diff'
        ? rawValues
        : normalize(rawValues);

//          // Step 1: Compute all pairwise avg scores only once
  const pairwiseScores = new Map<string, number>();

  for (let i = 0; i < dimensions.length; i++) {
    for (let j = 0; j < dimensions.length; j++) {
      if (i === j) continue;
      const a = dimensions[i];
      const b = dimensions[j];
      const key = `${a}|${b}`;

      const values = matrixData.map(row => {
        const x = row[a];
        const y = row[b];
        return x != null && y != null ? colorFunction(x, y) : null;
      }).filter(v => v !== null) as number[];

      const avg = values.length > 0
        ? values.reduce((sum, v) => sum + v, 0) / values.length
        : 0;

      pairwiseScores.set(key, avg);
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
  // Step 3: Sort columns by avgScore ascending
  const sortedDimensions = columnScores
    .sort((a, b) => b.avgScore - a.avgScore )
    .map(d => d.col);

    const annotations: Partial<Plotly.Annotations>[] = [];

    for (let i = 0; i < dimensions.length; i++) {
        for (let j = i + 1; j < dimensions.length; j++) {
            const xKey = dimensions[i];
            const yKey = dimensions[j];

            const pairValues = matrixData.map(row => {
                const x = row[xKey];
                const y = row[yKey];
                return x != null && y != null ? colorFunction(x, y) : null;
            }).filter(v => v !== null) as number[];

            const avg = pairValues.length > 0
                ? pairValues.reduce((sum, v) => sum + v, 0) / pairValues.length
                : 0;

            annotations.push({
                text: `avg: ${avg.toFixed(2)}`,
                xref: (i === 0 ? "x" : `x${i + 1}`) as
                    | "x" | "paper"
                    | "x2" | "x3" | "x4" | "x5" | "x6" | "x7" | "x8" | "x9" | "x10"
                    | "x11" | "x12" | "x13" | "x14" | "x15" | "x16" | "x17" | "x18" | "x19" | "x20"
                    | "x21" | "x22" | "x23" | "x24" | "x25" | "x26" | "x27" | "x28" | "x29" | "x30"
                    | undefined,
                yref: (j === 0 ? "y" : `y${j + 1}`) as
                    | "y" | "paper"
                    | "y2" | "y3" | "y4" | "y5" | "y6" | "y7" | "y8" | "y9" | "y10"
                    | "y11" | "y12" | "y13" | "y14" | "y15" | "y16" | "y17" | "y18" | "y19" | "y20"
                    | "y21" | "y22" | "y23" | "y24" | "y25" | "y26" | "y27" | "y28" | "y29" | "y30"
                    | undefined,
                x: 0.2,
                y: 0.8,
                showarrow: false,
                font: {
                    size: labelFontSize * 0.8,
                    color: 'gray',
                }
            });
        }
    }

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
                } as Partial<Plotly.PlotData>,
            ]}
            layout={{
                title: { text: title },
                height: 600,
                font: { size: labelFontSize },
                annotations,
            }}
            config={{ responsive: true }}
        />
    );
};

export default MatrixPlot;