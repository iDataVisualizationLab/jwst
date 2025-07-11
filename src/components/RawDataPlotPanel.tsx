'use client';

import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import dynamic from 'next/dynamic';
import { usePlotSettings } from '@/context/PlotSettingsContext';
import { buildTraces } from '@/utils/buildTraces';
import { PlotTrace } from '@/types/PlotTypes';
import { RenderTooltip } from '@/constants/hoverUtils';
// import * as Plotly from 'plotly.js-dist-min';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

type RawDataPlotPanelProps = {
    rawData: { x: number; y: number; err?: number; customdata?: unknown }[];
    onClose: () => void;
    onPointClick?: (
        figure: { data: unknown[]; layout: Partial<Plotly.Layout> },
        pt: Plotly.PlotDatum
    ) => void;
    annotations?: Partial<Plotly.Annotations>[];
    color?: string;
};

export default function RawDataPlotPanel({ rawData, onClose, onPointClick, annotations, color }: RawDataPlotPanelProps) {
    const {
        plotType,
        pointSize,
        lineWidth,
        errorBars,
        xAxis,
    } = usePlotSettings();

    const isResizing = useRef(false);
    const [width, setWidth] = useState(1000);
    const [height, setHeight] = useState(500);
    const [positionX, setPositionX] = useState(100);
    const [positionY, setPositionY] = useState(100);
    const [tooltipContent, setTooltipContent] = useState<React.ReactNode | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null);
    // const [PlotlyLib, setPlotlyLib] = useState<typeof import('plotly.js-dist-min') | null>(null);
    const [showExtreme, setShowExtreme] = useState(true);

    // useEffect(() => {
    //     import('plotly.js-dist-min').then(setPlotlyLib);
    // }, []);
    function handleHover(e: any) {
        const pt = e.points[0];
        const cd = pt.customdata ?? {};

        const hoverData = {
            ...cd,
            y: pt.y,
            err: pt.error_y?.array?.[pt.pointIndex],
            traceColor: pt.fullData?.marker?.color ?? '#000',
        };


        setTooltipContent(<RenderTooltip cd={hoverData} />);

        const bbox = pt.bbox;
        setTooltipPosition({ left: bbox.x0, top: bbox.y0 });
    }
    function handleUnhover() {
        setTooltipContent(null);
        setTooltipPosition(null);
    }

    // if (!PlotlyLib) return null;

    const x = rawData.map(p => p.x);
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

    const minX = Math.min(...x);
    const maxX = Math.max(...x);
    const minY = Math.min(...y);
    const maxY = Math.max(...y);

    const extremePoints = rawData.filter(p =>
        p.x === minX || p.x === maxX || p.y === minY || p.y === maxY
    );

    const seen = new Set<string>();

    const imageOverlays = extremePoints
        .map(p => {
            const filename = p.customdata?.filename;
            if (!filename) return null;
            const src = `https://raw.githubusercontent.com/iDataVisualizationLab/jwst-data/main/img/thumbnails/${filename}`;
            if (seen.has(src)) return null;
            seen.add(src);
            return {
                source: src,
                xref: 'x',
                yref: 'y',
                x: p.x,
                y: p.y + 10,
                sizex: 0.002,
                sizey: 50,
                xanchor: 'left',
                yanchor: 'bottom',
                layer: 'below',
                sizing: 'contain',
                opacity: 1,
            } as Partial<Plotly.Layout['images'][number]>;
        })
        .filter((img): img is Partial<Plotly.Layout['images'][number]> => img !== null);

    const imagePointTrace: PlotTrace = {
        x: extremePoints.map(p => p.x),
        y: extremePoints.map(p => p.y),
        // text: extremePoints.map(p => p.customdata?.filename ?? 'Image'),
        customdata: extremePoints.map(p => p.customdata),
        type: 'scatter',
        mode: 'markers+text',
        name: 'Extreme Points',
        visible: showExtreme ? true : 'legendonly',
        marker: {
            symbol: 'circle',
            size: 10,
            color: 'red',
        },
        textposition: 'top center',
        hoverinfo: 'none',
        // hovertemplate: `${xAxis} = %{x:.5f}<br>flux = %{y:.2e}<extra></extra>`,
    };
    const xPadding = 0.001;
    const yPadding = 60; // match or exceed image `sizey`

    const layout: Partial<Plotly.Layout> = {
        autosize: true,
        margin: { l: 40, r: 20, t: 20, b: 30 },
        annotations: annotations ?? [],
        images: showExtreme ? imageOverlays : [],
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

    const handleResizeStart = () => {
        // Set the resizing flag to true to prevent auto-centering
        isResizing.current = true;
        console.log('[Debug] Resize started - Disabling auto-centering');
    };

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
            position={{ x: positionX, y: positionY }}
            onDragStop={(e: any, d: any) => { setPositionX(d.x); setPositionY(d.y); }}
            onResizeStart={handleResizeStart}
            onResize={handleResize}
            onResizeStop={() => {
                isResizing.current = false;
                setTooltipContent(null);
                setTooltipPosition(null);
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
                <div className="flex justify-between items-center px-3 py-1 border-b bg-gray-100 cursor-move drag-handle">
                    <span className="font-semibold text-sm">Raw Points</span>
                    <button
                        className="text-red-600 hover:text-red-800 text-sm"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>
                <div className="flex-1 overflow-hidden h-full w-full relative">
                    <Plot
                        divId="raw-data-plot"
                        data={[imagePointTrace, ...traces] as Partial<Plotly.Data>[]}
                        layout={layout}
                        config={{ responsive: true, displayModeBar: true }}
                        useResizeHandler={true}
                        onHover={handleHover}
                        onUnhover={handleUnhover}
                        onLegendClick={(e) => {
                            const trace = e?.data?.[e.curveNumber];
                            if (trace?.name === 'Extreme Points') {
                                // Toggle and track visibility manually
                                setShowExtreme(prev => !prev);
                                return false; // Prevent default Plotly behavior
                            }
                            return true; // Allow default behavior for other traces
                        }}
                        onClick={(e) => {
                            console.log('clicked point:', e.points?.[0]);
                            if (onPointClick && e.points?.[0]) {
                                onPointClick({ data: [imagePointTrace, ...traces] as Partial<Plotly.Data>[], layout }, e.points[0]);
                            }
                        }}
                        style={{ width: '100%', height: '100%' }}
                    />

                    {tooltipContent && tooltipPosition && (
                        <div className="absolute z-50 pointer-events-none" style={{ left: tooltipPosition.left + 10, top: tooltipPosition.top + 10 }}>
                            {tooltipContent}
                        </div>
                    )}
                </div>
            </div>
        </Rnd>
    );
}
