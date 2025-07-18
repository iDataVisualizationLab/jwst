'use client';

import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import dynamic from 'next/dynamic';
import { usePlotSettings } from '@/context/PlotSettingsContext';
import { buildTraces } from '@/utils/buildTraces';
import { PlotTrace, AveragePointCustomData } from '@/types/PlotTypes';
import { RenderTooltip } from '@/constants/hoverUtils';
// import * as Plotly from 'plotly.js-dist-min';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

type RawDataPlotPanelProps = {
    rawData: {
        x: number; y: number; err?: number; customdata?: AveragePointCustomData;
        phase?: number;
        mjd?: number;
        time?: Date | string;
        second?: number;
        minute?: number;
        hour?: number;
        day?: number;
    }[];
    averageValue?: number;
    averageError?: number;
    onClose: () => void;
    onPointClick?: (
        figure: { data: unknown[]; layout: Partial<Plotly.Layout> },
        pt: Plotly.PlotDatum
    ) => void;
    posX?: number;
    posY?: number;
    annotations?: Partial<Plotly.Annotations>[];
    color?: string;
    onHover?: (content: React.ReactNode, position: { left: number; top: number }) => void;
    onUnhover?: () => void;
};

export default function RawDataPlotPanel({ rawData, averageValue, averageError, onClose, onPointClick, posX, posY, annotations, color, onHover, onUnhover }: RawDataPlotPanelProps) {
    const {
        plotType,
        pointSize,
        lineWidth,
        errorBars,
        xAxis
    } = usePlotSettings();

    const isResizing = useRef(false);
    const [width, setWidth] = useState(500);
    const [height, setHeight] = useState(250);
    const [positionX, setPositionX] = useState(posX);
    const [positionY, setPositionY] = useState(posY);
    const [figure, setFigure] = useState<{ data: Partial<Plotly.Data>[]; layout: Partial<Plotly.Layout> }>({ data: [], layout: {} });
    const [rawTrace, setRawTrace] = useState<PlotTrace[]>([]);


    const xAxisOptions = [
        { value: 'phase', label: 'Phase' },
        { value: 'mjd', label: 'MJD' },
        { value: 'time', label: 'Datetime' },
        { value: 'day', label: 'Days' },
        { value: 'hour', label: 'Hours' },
        { value: 'minute', label: 'Minutes' },
        { value: 'second', label: 'Seconds' },
    ];
    const [selectedXAxis, setSelectedXAxis] = useState(xAxis || 'phase');

    function nudgeModal(setX: React.Dispatch<React.SetStateAction<number | undefined>>) {
        setX(prev => (typeof prev === 'number' ? prev + 1 : 1));
        setTimeout(() => setX(prev => (typeof prev === 'number' ? prev - 1 : 0)), 10);
    }
    useEffect(() => {
        const timer = setTimeout(() => {
            return nudgeModal(setPositionX);
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        setPositionX(posX);
        setPositionY(posY);
    }, [posX, posY]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleHover(e: any) {
        const pt = e.points[0];
        const cd = pt.customdata ?? {};

        const hoverData = {
            ...cd,
            y: pt.y,
            err: pt.error_y?.array?.[pt.pointIndex],
            traceColor: pt.fullData?.marker?.color ?? '#000',
        };
        onHover?.(<RenderTooltip cd={hoverData} />, { left: e.event.clientX - (positionX ?? 0) / 2, top: e.event.clientY - (positionY ?? 0) / 2 });
        // onHover?.(<RenderTooltip cd={hoverData} />, { left: e.event.clientX, top: e.event.clientY});
    }
    function handleUnhover() {
        onUnhover?.();
    }

    useEffect(() => {

        // Ensure x is a homogeneous array (all numbers, all strings, or all Dates)
        let x: number[] | string[] | Date[];
        const rawX = rawData.map((p) => p[selectedXAxis as keyof typeof p]);
        if (rawX.every(val => typeof val === 'number')) {
            x = rawX as number[];
        } else if (rawX.every(val => typeof val === 'string')) {
            x = rawX as string[];
        } else if (rawX.every(val => val instanceof Date)) {
            x = rawX as Date[];
        } else {
            // fallback to p.x (number[])
            x = rawData.map(p => p.x);
        }
        // console.log('x values:', x);
        const y = rawData.map(p => p.y);
        const err = rawData.map(p => p.err ?? 0);
        const customdata = rawData.map(p => p.customdata ?? {});

        const traces: PlotTrace[] = buildTraces({
            x,
            y,
            err,
            customdata,
            hoverinfo: 'none',
            plotType: plotType as 'lines' | 'markers' | 'lines+markers',
            errorBars: errorBars as 'bar' | 'hide' | 'separate',
            name: 'Raw Points',
            color: color ?? '#1f77b4',
            pointSize,
            lineWidth,
        });

        let minX: number, maxX: number;
        if (Array.isArray(x) && x.length > 0 && typeof x[0] === 'number') {
            minX = Math.min(...(x as number[]));
            maxX = Math.max(...(x as number[]));
        } else if (Array.isArray(x) && x.length > 0 && typeof x[0] === 'string') {
            // For string x-axis (e.g., datetime), use indices for min/max
            minX = 0;
            maxX = (x as string[]).length - 1;
        } else if (Array.isArray(x) && x.length > 0 && x[0] instanceof Date) {
            // For Date x-axis, convert to timestamps
            const timestamps = (x as Date[]).map(date => date.getTime());
            minX = Math.min(...timestamps);
            maxX = Math.max(...timestamps);
        } else {
            minX = 0;
            maxX = 1;
        }

        const minY = Math.min(...y);
        const maxY = Math.max(...y);
        const averageLineTrace: PlotTrace = {
            x: [minX, maxX],
            y: [averageValue ?? 0, averageValue ?? 0],
            mode: 'lines',
            type: 'scatter',
            name: 'Average',
            line: {
                color: 'black',
                width: 2,
                dash: 'dashed',
            },
            hoverinfo: 'skip',
        };

        const averageErrorUpperTrace: PlotTrace | null =
            averageValue != null && averageError != null
                ? {
                    x: [minX, maxX],
                    y: [averageValue + averageError, averageValue + averageError],
                    mode: 'lines',
                    type: 'scatter',
                    name: 'Avg + Error',
                    line: {
                        color: 'rgba(0,0,0,0.7)',
                        width: 1,
                        dash: 'dot',
                    },
                    hoverinfo: 'skip',
                }
                : null;

        const averageErrorLowerTrace: PlotTrace | null =
            averageValue != null && averageError != null
                ? {
                    x: [minX, maxX],
                    y: [averageValue - averageError, averageValue - averageError],
                    mode: 'lines',
                    type: 'scatter',
                    name: 'Avg - Error',
                    line: {
                        color: 'rgba(0,0,0,0.7)',
                        width: 1,
                        dash: 'dot',
                    },
                    hoverinfo: 'skip',
                }
                : null;

        let xPadding: number = 0;

        // If x-axis is Date, we already converted to timestamps above
        if (
            Array.isArray(x) &&
            x.length > 0 &&
            x[0] instanceof Date &&
            typeof minX === 'number' &&
            typeof maxX === 'number'
        ) {
            // Add fixed 1-second padding for date axes (timestamps)
            xPadding = 10000; // 1 second in ms
        } else if (typeof minX === 'number' && typeof maxX === 'number') {
            const range = maxX - minX;

            if (range > 1000) {
                xPadding = 500;
            } else if (range > 100) {
                xPadding = 50;
            } else if (range > 10) {
                xPadding = 5;
            } else if (range > 1) {
                xPadding = 0.1;
            } else if (range > 0.1) {
                xPadding = 0.01;
            } else {
                xPadding = 0.001;
            }
        }
        const yPadding = 60; // match or exceed image `sizey`

        const layout: Partial<Plotly.Layout> = {
            autosize: true,
            margin: { l: 40, r: 20, t: 20, b: 30 },
            annotations: annotations ?? [],
            // images: showExtreme ? imageOverlays : [],
            modebar: {
                orientation: 'v', // Vertical modebar
            },
            xaxis: {
                range: [minX - xPadding, maxX + xPadding],
            },
            yaxis: {
                range: [minY - yPadding, maxY + yPadding],
            },
        };
        setRawTrace(traces);
        setFigure({
            data: [
                ...traces as Partial<Plotly.Data>[],
                ...(averageValue != null ? [averageLineTrace] : []),
                ...(averageErrorUpperTrace ? [averageErrorUpperTrace] : []),
                ...(averageErrorLowerTrace ? [averageErrorLowerTrace] : []),
            ].map(trace => trace as Partial<Plotly.Data>), layout
        });
    }, [rawData, selectedXAxis, plotType, errorBars, pointSize, lineWidth, color]);


    const handleResizeStart = () => {
        // Set the resizing flag to true to prevent auto-centering
        isResizing.current = true;
        console.log('[Debug] Resize started - Disabling auto-centering');
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleResize = (e: any, direction: string, ref: HTMLElement, delta: any, position: any) => {
        // Get new dimensions
        const newWidth = parseInt(ref.style.width);
        const newHeight = parseInt(ref.style.height);

        // Calculate position adjustment based on resize direction
        let newX = positionX;
        let newY = positionY;

        // Only adjust position when resizing from left or top edges
        if (direction.includes('left')) {
            newX = position.x;
        }

        if (direction.includes('top')) {
            newY = position.y;
        }

        // Update dimensions and position
        setWidth(newWidth);
        setHeight(newHeight);
        setPositionX(newX);
        setPositionY(newY);
    };

    return (
        <Rnd
            size={{ width, height }}
            bounds="parent"
            position={{ x: positionX ?? 0, y: positionY ?? 0 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onDragStop={(e: any, d: any) => { setPositionX(d.x); setPositionY(d.y); }}
            onResizeStart={handleResizeStart}
            onResize={handleResize}
            onResizeStop={() => {
                isResizing.current = false;
                handleUnhover();
            }}
            minWidth={300}
            minHeight={300}
            dragHandleClassName="drag-handle"
            className="z-51 rounded-lg shadow-2xl overflow-hidden"
            enableResizing={{
                top: true, right: true, bottom: true, left: true,
                topRight: true, bottomRight: true, bottomLeft: true, topLeft: true
            }}
            // Add custom resize handles with identifiable classes for debugging
            resizeHandleClasses={{
                top: 'resize-handle top',
                right: 'resize-handle right',
                bottom: 'resize-handle bottom',
                left: 'resize-handle left',
                topRight: 'resize-handle top-right',
                bottomRight: 'resize-handle bottom-right',
                bottomLeft: 'resize-handle bottom-left',
                topLeft: 'resize-handle top-left'
            }}
        >
            <div className="flex flex-col w-full h-full">
                <div className="flex justify-between items-center px-3 py-2 border-b bg-gray-100 drag-handle text-sm">
                    {/* Title */}
                    <span className="font-semibold text-gray-800">Raw Points</span>

                    {/* X-Axis Dropdown */}
                    <div className="flex items-center gap-2">
                        <label htmlFor="x-axis-select" className="text-gray-700 font-medium">
                            x-axis:
                        </label>
                        <select
                            id="x-axis-select"
                            className="border border-gray-300 rounded-md px-2 py-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            value={selectedXAxis}
                            onChange={(e) => setSelectedXAxis(e.target.value)}
                        >
                            {xAxisOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Close Button */}
                    <button
                        className="text-gray-400 hover:text-red-600 transition-colors text-lg"
                        onClick={onClose}
                        title="Close"
                    >
                        ✕
                    </button>
                </div>
                <div className="flex-1 overflow-hidden h-full w-full relative">
                    <Plot
                        divId="raw-data-plot"
                        data={figure.data as Partial<Plotly.Data>[]}
                        layout={{ ...figure.layout }}
                        config={{ responsive: true, displayModeBar: true }}
                        useResizeHandler={true}
                        onHover={handleHover}
                        onUnhover={handleUnhover}
                        onClick={(e) => {
                            console.log('clicked point:', e.points?.[0]);
                            if (onPointClick && e.points?.[0]) {
                                onPointClick({ data: [...rawTrace] as Partial<Plotly.Data>[], layout: figure.layout }, e.points[0]);
                            }
                        }}
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>
            </div>
        </Rnd >
    );
}
