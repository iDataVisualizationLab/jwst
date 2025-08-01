'use client';

import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { usePlotSettings } from '@/context/PlotSettingsContext';
import { SimpleLinearRegression } from 'ml-regression-simple-linear';

export type MatrixPlotProps = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    matrixData: any[];
    title: string;
    subtitle: string;
    labelFontSize: number;
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

const D3MatrixPlot = ({ matrixData, title, subtitle, labelFontSize }: MatrixPlotProps) => {
    const ref = useRef<SVGSVGElement | null>(null);
    const { colorBy, focusRangeMax, setSettings, focusRangeMaxManuallySet } = usePlotSettings();
    // // Precompute pairwise values
    const {
        pairwiseScores,
        pairwiseSlopes,
        pairwiseScoreValues,
        pairwisePoints,
        globalMaxRaw,
        // columnScores,
        sortedDimensions
    } = useMemo(() => {
        console.log('[useMemo] computing pairwise stats...');
        const scores = new Map<string, number>();
        const slopes = new Map<string, number>();
        const scoreValues = new Map<string, number[]>();
        const points = new Map<string, { x: number; y: number }[]>();
        const colorFunction = colorBy === 'diff' ? percentDiff : distToXY;
        let maxRaw = 0;
        const dimensions = Object.keys(matrixData[0] || {});
        for (let i = 0; i < dimensions.length; i++) {
            for (let j = 0; j < dimensions.length; j++) {
                if (i === j) continue;

                const a = dimensions[i];
                const b = dimensions[j];
                const key = `${a}|${b}`;
                const xVals: number[] = [];
                const yVals: number[] = [];
                const pointValues: number[] = [];
                const xyPairs: { x: number; y: number }[] = [];

                for (const row of matrixData) {
                    const x = row[a];
                    const y = row[b];
                    if (x != null && y != null && !isNaN(x) && !isNaN(y)) {
                        xVals.push(x);
                        yVals.push(y);
                        pointValues.push(colorFunction(x, y));
                        xyPairs.push({ x, y });
                    }
                }

                const rawValues = pointValues;
                const colorValues = colorBy === 'diff' ? rawValues : normalize(rawValues);

                if (rawValues.length > 0) {
                    const localMax = Math.max(...rawValues);
                    if (localMax > maxRaw) maxRaw = localMax;
                }

                const avg = colorValues.length > 0 ? d3.mean(colorValues)! : 0;

                let slope = 0;
                try {
                    const model = new SimpleLinearRegression(xVals, yVals);
                    slope = model.slope;
                } catch {
                    slope = NaN;
                }

                scores.set(key, avg);
                slopes.set(key, slope);
                scoreValues.set(key, colorValues);
                points.set(key, xyPairs);
            }
        }

        // Compute columnScores
        const columnScores = dimensions.map(col => {
            const avgScore = dimensions
                .filter(other => other !== col)
                .map(other => {
                    const key1 = `${col}|${other}`;
                    const key2 = `${other}|${col}`;
                    return scores.get(key1) ?? scores.get(key2) ?? 0;
                })
                .reduce((a, b) => a + b, 0) / (dimensions.length - 1);
            return { col, avgScore };
        });

        // Sort dimensions by column score
        const sortedDimensions = [...columnScores]
            .sort((a, b) => b.avgScore - a.avgScore)
            .map(d => d.col);

        // if (!focusRangeMaxManuallySet) {
        //     if (focusRangeMax === 100 || maxRaw > focusRangeMax) {
        //         if (maxRaw > 100) {
        //             setSettings({ focusRangeMax: 100 });
        //         } else {
        //             setSettings({
        //                 focusRangeMax: maxRaw,
        //             });
        //         }
        //     }
        // }
        return {
            pairwiseScores: scores,
            pairwiseSlopes: slopes,
            pairwiseScoreValues: scoreValues,
            pairwisePoints: points,
            globalMaxRaw: maxRaw,
            // columnScores,
            sortedDimensions
        };
    }, [matrixData, colorBy]);


    useEffect(() => {
        if (!focusRangeMaxManuallySet) {
            if (focusRangeMax === 100 || globalMaxRaw > focusRangeMax) {
                if (globalMaxRaw > 100) {
                    setSettings({ focusRangeMax: 100 });
                } else {
                    setSettings({
                        focusRangeMax: Math.ceil(globalMaxRaw),
                    });
                }
            }
        }
    }, [globalMaxRaw, focusRangeMax, focusRangeMaxManuallySet]);


    useEffect(() => {
        console.log(sortedDimensions, labelFontSize, colorBy, focusRangeMax);
        if (!ref.current || matrixData.length === 0) return;

        const size = sortedDimensions.length > 2 ? 120 : 150;
        const padding = 100;
        const svg = d3.select(ref.current);
        svg.selectAll('*').remove();
        const width = sortedDimensions.length * size;
        const fullWidth = width + padding * 2 + 100;
        const fullHeight = sortedDimensions.length * size + padding * 2;
        svg
            .attr('viewBox', `0 0 ${fullWidth} ${fullHeight}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .attr('width', '100%')
            .attr('height', '100%')
            .style('background', 'white');

        // Add Title
        svg.append('text')
            .attr('x', (width + padding * 2 + 100) / 2)
            .attr('y', padding / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', `${labelFontSize * 1.4}px`)
            .style('font-weight', 'bold')
            .text(title);

        // Add Subtitle
        // Subtitle formatting based on 'sw' or 'lw'
        const prefix = subtitle.toUpperCase();
        const subtitleParts = [
            { text: `Source Brightness measured with BG annulus at each frame (e.g., ${prefix}.`, style: "normal" },
            { text: "r", style: "italic" },
            { text: "in", style: "subscript" },
            { text: ".", style: "normal" },
            { text: "r", style: "italic" },
            { text: "out", style: "subscript" },
            { text: ` → ${prefix}.10.30)`, style: "normal" }
        ];

        const subtitleEl = svg.append('text')
            .attr('x', (width + padding * 2 + 100) / 2)
            .attr('y', padding / 2 + labelFontSize * 1.6)
            .attr('text-anchor', 'middle')
            .style('font-size', `${labelFontSize}px`)
            .style('fill', '#555');

        subtitleParts.forEach(part => {
            subtitleEl.append('tspan')
                .text(part.text)
                .style('font-style', part.style === 'italic' ? 'italic' : 'normal')
                .style('font-style', part.style === 'subscript' ? 'italic' : 'normal')
                .style('font-size', part.style === 'subscript' ? '0.7em' : '1em')
                .attr('baseline-shift', part.style === 'subscript' ? 'sub' : null);
        });
        const g = svg.append('g').attr('transform', `translate(${padding},${padding})`);

        const colorScale = d3.scaleSequential(d3.interpolateViridis)
            .domain([0, colorBy === 'diff' ? focusRangeMax : 1]);

        // Draw cells
        // if (!sortedDimensions) return;
        sortedDimensions.forEach((yDim, row) => {
            sortedDimensions.forEach((xDim, col) => {
                const cell = g
                    .append('g')
                    .attr('class', 'matrix-cell')
                    .attr('data-row', yDim)
                    .attr('data-col', xDim)
                    .attr('transform', `translate(${col * size},${row * size})`);
                const axisPadding = 18; // inner margin for ticks
                const tickFontSize = labelFontSize * 0.8;
                const x = d3.scaleLinear()
                    .domain(d3.extent(matrixData, d => d[xDim]) as [number, number])
                    .range([axisPadding, size - 4]); // smaller right padding

                const y = d3.scaleLinear()
                    .domain(d3.extent(matrixData, d => d[yDim]) as [number, number])
                    .range([size - axisPadding, 4]); // smaller top padding


                // Only show axes for lower triangle
                if (row > col) {
                    // Shrink axis area so ticks don't overflow into neighbors
                    const axisX = d3.axisBottom(x).ticks(3).tickSize(2);
                    const axisY = d3.axisLeft(y).ticks(3).tickSize(2);
                    // X-axis (bottom)
                    cell.append('g')
                        .attr('transform', `translate(0, ${size - axisPadding})`)
                        .call(axisX)
                        .call(g => {
                            g.selectAll("text")
                                .style('font-size', `${tickFontSize}px`)
                                .style('fill', 'gray')
                                .attr('dy', '0.7em');

                            g.selectAll('path, line')  // target axis line and ticks
                                .style('stroke', 'gray')
                                .style('stroke-width', 1);
                        });

                    // Y-axis (left)
                    cell.append('g')
                        .attr('transform', `translate(${axisPadding}, 0)`)
                        .call(axisY)
                        .call(g => {
                            g.selectAll("text")
                                .style('font-size', `${tickFontSize}px`)
                                .style('fill', 'gray')
                                .attr('dx', '-0.3em');

                            g.selectAll('path, line')
                                .style('stroke', 'gray')
                                .style('stroke-width', 1);
                        });
                }


                const pad = size * 0.1;
                if (row === col) {
                    // Diagonal: label

                    cell.append('rect')
                        .attr('x', pad)
                        .attr('y', pad)
                        .attr('width', size - 2 * pad)
                        .attr('height', size - 2 * pad)
                        .style('fill', 'white')
                        .style('stroke', 'lightgray')
                        .style('stroke-width', 1);
                    cell.append('text')
                        .attr('x', size / 2)
                        .attr('y', size / 2)
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .attr('class', 'diagonal-label')
                        .attr('data-dim', xDim)
                        .style('font-size', `${labelFontSize}px`)
                        .style('cursor', 'pointer')
                        .text(xDim);
                } else if (row > col) {
                    const key = `${xDim}|${yDim}`;
                    const data = pairwisePoints.get(key) ?? [];
                    const values = pairwiseScoreValues.get(key) ?? [];
                    // Lower triangle: scatter plot with tooltip
                    // Draw background grid lines
                    const gridLines = 5;
                    const xTicks = d3.range(0, gridLines + 1).map(i => axisPadding + i * (size - 2 * axisPadding) / gridLines);
                    const yTicks = d3.range(0, gridLines + 1).map(i => axisPadding + i * (size - 2 * axisPadding) / gridLines);

                    // Vertical grid lines
                    xTicks.forEach(xPos => {
                        cell.append('line')
                            .attr('x1', xPos)
                            .attr('y1', 0)
                            .attr('x2', xPos)
                            .attr('y2', size)
                            .style('stroke', '#ddd')
                            .style('stroke-width', 0.5);
                    });

                    // Horizontal grid lines
                    yTicks.forEach(yPos => {
                        cell.append('line')
                            .attr('x1', 0)
                            .attr('y1', yPos)
                            .attr('x2', size)
                            .attr('y2', yPos)
                            .style('stroke', '#ddd')
                            .style('stroke-width', 0.5);
                    });
                    const circles = cell.selectAll('circle')
                        .data(data)
                        .enter()
                        .append('circle')
                        .attr('cx', d => x(d.x))
                        .attr('cy', d => y(d.y))
                        .attr('r', 2.5)
                        .attr('fill', (_d, i) => {
                            const v = values[i] ?? 0;
                            return colorScale(v);
                        })
                        .attr('opacity', 0.7);

                    // Tooltip on hover (title attribute)
                    circles.append('title')
                        .text((d, i) => {
                            const x = d.x?.toFixed(3);
                            const y = d.y?.toFixed(3);
                            const score = (values[i] ?? 0).toFixed(3);
                            return `${xDim}: ${x},\n${yDim}: ${y}\n${colorBy === 'diff' ? '% Diff' : 'Distance'}: ${score}`;
                        });

                } else {
                    const key = `${xDim}|${yDim}`;
                    const score = pairwiseScores.get(key) ?? 0;
                    const slope = pairwiseSlopes.get(key) ?? 0;

                    cell.append('rect')
                        .attr('x', pad)
                        .attr('y', pad)
                        .attr('width', size - 2 * pad)
                        .attr('height', size - 2 * pad)
                        .style('fill', String(slope.toFixed(2)) === '1.00' ? 'rgba(182, 175, 175, 0.5)':'rgba(255, 255, 255, 0.5)')
                        .style('stroke', 'black')
                        .style('stroke-width', 1);
                    cell.append('text')
                        .attr('x', size / 2)
                        .attr('y', size / 2 - 10)
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .style('font-size', `${labelFontSize * 0.8}px`)
                        .style('fill', 'black')
                        .selectAll('tspan')
                        .data([
                            `Avg ${colorBy === 'diff' ? '% Diff' : 'Distance'} ${score.toFixed(2)}`,
                            `Slope ${slope.toFixed(2)}`
                        ])
                        .enter()
                        .append('tspan')
                        .attr('x', size / 2)
                        .attr('dy', (_, i) => i === 0 ? 0 : '1.2em') // vertical offset for lines
                        .text(d => d);
                }
            });
        });
        svg.selectAll('.diagonal-label')
            .on('mouseover', function () {
                const dim = d3.select(this).attr('data-dim');

                svg.selectAll('.matrix-cell')
                    .each(function () {
                        const cell = d3.select(this);
                        const row = cell.attr('data-row');
                        const col = cell.attr('data-col');
                        const shouldHighlight = row === dim || col === dim;
                        const diagonalHighlight = row === col || row === dim;

                        if (shouldHighlight) {
                            cell.classed('highlight', shouldHighlight)
                                .style('opacity', 1);

                            cell.selectAll('text')
                                .style('fill', 'black')
                                .style('font-weight', 'bold');
                        } else if (diagonalHighlight) {
                            cell.classed('highlight', true)
                                .style('opacity', 1);
                        } else {
                            cell.classed('highlight', shouldHighlight)
                                .style('opacity', 0.2);

                            cell.selectAll('text')
                                .style('fill', 'gray')
                                .style('font-weight', null);
                        }
                    });
            })
            .on('mouseout', function () {
                svg.selectAll('.matrix-cell')
                    .classed('highlight', false)
                    .style('opacity', 1)
                    .each(function () {
                        const cell = d3.select(this);
                        cell.selectAll('circle')
                            .style('opacity', 0.7)
                            .style('stroke', null)
                            .style('stroke-width', null);

                        cell.selectAll('text')
                            .style('fill', 'black')
                            .style('font-weight', null);
                    });
            });

        // Add hover behavior for all non-diagonal matrix cells
        svg.selectAll('.matrix-cell')
            .filter(function () {
                const row = d3.select(this).attr('data-row');
                const col = d3.select(this).attr('data-col');
                return row !== col;
            })
            .on('mouseover', function () {
                const row = d3.select(this).attr('data-row');
                const col = d3.select(this).attr('data-col');

                svg.selectAll('.matrix-cell')
                    .each(function () {
                        const cell = d3.select(this);
                        const r = cell.attr('data-row');
                        const c = cell.attr('data-col');

                        const isTargetDiagonal = (r === c) && (r === row || r === col);
                        const isHoveredCell = (r === row && c === col);
                        const isOppositeCell = (r === col && c === row);

                        if (isTargetDiagonal || isHoveredCell || isOppositeCell) {
                            cell.classed('highlight', true)
                                .style('opacity', 1);

                            cell.selectAll('text')
                                .style('fill', 'black')
                                .style('font-weight', 'bold');

                        } else {
                            cell.classed('highlight', false)
                                .style('opacity', 0.2);

                            cell.selectAll('text')
                                .style('fill', 'gray')
                                .style('font-weight', null);

                        }
                    });
            })
            .on('mouseout', function () {
                svg.selectAll('.matrix-cell')
                    .classed('highlight', false)
                    .style('opacity', 1)
                    .each(function () {
                        const cell = d3.select(this);
                        cell.selectAll('text')
                            .style('fill', 'black')
                            .style('font-weight', null);

                    });
            });


        // // X-axis labels
        // dimensions.forEach((dim, i) => {
        //     svg.append('text')
        //         .attr('x', padding + i * size + size / 2)
        //         .attr('y', padding + dimensions.length * size + 20)
        //         .attr('text-anchor', 'middle')
        //         .style('font-size', `${labelFontSize * 0.8}px`)
        //         .text(dim);
        // });

        // // Y-axis labels
        // dimensions.forEach((dim, i) => {
        //     svg.append('text')
        //         .attr('x', 5)
        //         .attr('y', padding + i * size + size / 2)
        //         .attr('text-anchor', 'start')
        //         .attr('dominant-baseline', 'middle')
        //         .style('font-size', `${labelFontSize * 0.8}px`)
        //         .text(dim);
        // });

        // Colorbar (vertical)
        const defs = svg.append('defs');
        const gradientId = 'color-gradient';

        const gradient = defs.append('linearGradient')
            .attr('id', gradientId)
            .attr('x1', '0%')
            .attr('y1', '100%')
            .attr('x2', '0%')
            .attr('y2', '0%'); // Vertical gradient (bottom-to-top)

        // Define gradient stops
        d3.range(0, 1.01, 0.01).forEach(t => {
            gradient.append('stop')
                .attr('offset', `${t * 100}%`)
                .attr('stop-color', d3.interpolateViridis(t));
        });

        const barWidth = 20;
        const barHeight = Math.max(sortedDimensions.length * size - padding, 120);

        // Color bar rectangle
        svg.append('rect')
            .attr('x', width + padding + 60)
            .attr('y', padding + 60)
            .attr('width', barWidth)
            .attr('height', barHeight)
            .style('fill', `url(#${gradientId})`)
            .style('stroke', 'black')
            .style('stroke-width', 0.5);

        // Color bar axis scale
        const colorScaleAxis = d3.scaleLinear()
            .domain([0, colorBy === 'diff' ? focusRangeMax : 1])
            .range([barHeight, 0]);

        // Color bar axis (right side of colorbar)
        const colorBarAxis = d3.axisRight(colorScaleAxis)
            .ticks(5)
            .tickSize(4)
            .tickPadding(3);

        // Render color bar axis
        svg.append('g')
            .attr('transform', `translate(${width + padding + 60 + barWidth}, ${padding + 60})`)
            .call(colorBarAxis)
            .selectAll('text')
            .style('font-size', `${labelFontSize}px`)
            .style('fill', 'black');

        // Color bar title label
        svg.append('text')
            .attr('transform', `translate(${width + padding + 110 + barWidth}, ${padding + 60 + barHeight / 2}) rotate(270)`)
            .attr('text-anchor', 'middle')
            .style('font-size', `${labelFontSize}px`)
            .text(colorBy === 'diff' ? '% Diff from x=y' : 'Distance to x=y');

    }, [sortedDimensions, labelFontSize, colorBy, focusRangeMax]);

    if (!matrixData || matrixData.length === 0) return null;
    return (
        <div className="w-full max-w-full overflow-x-auto">
            <svg ref={ref} className="w-full h-auto" />
        </div>
    );
};

export default D3MatrixPlot;
