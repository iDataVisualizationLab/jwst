'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePlotSettings } from '@/context/PlotSettingsContext';
import { digitize, weightedAvg } from '@/libs/mathUtils';
import { ImageModal } from '@/components/ImageModal';
// Dynamically import Plotly on the client (avoids SSR issues)
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

/* ────────────────────────── Types ────────────────────────── */
interface PlotTrace {
  x: (number | string | Date)[];
  y: number[];
  type: 'scatter' | 'scattergl';
  mode: 'lines' | 'markers' | 'lines+markers';
  name: string;
  xaxis?: string;
  yaxis?: string;
  marker?: { color: string; size?: number };
  line?: { color: string; width?: number };
  legendgroup?: string;
  legendgrouptitle?: { text: string };
  opacity?: number;
  customdata?: unknown[];         // filenames, etc.
  hoverinfo?: string;             // e.g. 'x+y+name'
  hovertemplate?: string;         // Plotly template string
  error_y?: { type: 'data'; array: number[] };   // bar-style error bars
}

interface PlotLayout {
  height: number;
  // title: { text: string };
  grid: { rows: number; columns: number; pattern: 'independent' };
  margin: { l: number; r: number; t: number; b: number };
  // Axis specs will be added dynamically
  [key: string]: unknown;
}
function buildTraces({
  x,
  y,
  err,
  customdata,
  hoverinfo,
  hovertemplate,
  plotType,
  errorBars,
  name,
  wave,
  color,
  pointSize,
  lineWidth,
}: {
  x: number[];
  y: number[];
  err: number[];                    // same length as y
  customdata: unknown[];
  hoverinfo: string;
  hovertemplate: string;
  plotType: 'lines' | 'markers' | 'lines+markers';
  errorBars: 'bar' | 'hide' | 'separate';
  name: string;
  wave: 'SW' | 'LW';
  color: string;
  pointSize: number;
  lineWidth: number;
}): PlotTrace[] {
  const common: Partial<PlotTrace> = {
    x,
    y,
    type: 'scattergl',
    mode: plotType,
    opacity: 0.8,
    name: `${name} (${y.length})`,
    legendgroup: wave.toLowerCase(),
    legendgrouptitle: { text: `${wave} Group` },
    marker: { color, size: pointSize },
    line: { color, width: lineWidth },
    customdata,
    hoverinfo,
    hovertemplate,
  };

  if (errorBars === 'bar') {
    return [{ ...common, error_y: { type: 'data', array: err } } as PlotTrace];
  }

  if (errorBars === 'separate') {
    return [
      { ...common } as PlotTrace,
      {
        ...common,
        y: y.map((v, i) => v + err[i]),
        name: `${name} Error (+) (${y.length})`,
      } as PlotTrace,
      {
        ...common,
        y: y.map((v, i) => v - err[i]),
        name: `${name} Error (-) (${y.length})`,
      } as PlotTrace,
    ];
  }

  /* 'hide' → no error visual */
  return [{ ...common } as PlotTrace];
}

const colorList = [
  "rgb(0, 0, 216)",       // Bright Blue
  "rgb(253, 192, 69)",    // Bright Yellow-Orange
  "rgb(92, 53, 248)",     // Vibrant Blue
  "rgb(220, 145, 18)",    // Golden Orange
  "rgb(153, 97, 255)",    // Lavender Purple
  "rgb(178, 102, 1)",     // Dark Orange
  "rgb(206, 139, 255)",   // Light Purple
  "rgb(134, 64, 0)",      // Burnt Orange
  "rgb(231, 191, 251)",   // Pale Lilac
  "rgb(92, 27, 0)"        // Deep Brown
]
/* ────────────────────────── Component ────────────────────── */
export default function HomePage() {
  const {
    dataType,
    dataSelection,
    xAxis,
    errorBars,
    noOfBins,
    noOfDataPoint,
    plotType,
    pointSize,
    lineWidth,
    legendFontSize,
    labelFontSize,
    tooltipFontSize,
    // thumbnailsSize,
  } = usePlotSettings();


  const [figure, setFigure] = useState<{ data: PlotTrace[]; layout: PlotLayout } | null>(null);
  const [loading, setLoading] = useState(false);
  const [rawFigure, setRawFigure] = useState<{
    tracesSW: PlotTrace[];
    tracesLW: PlotTrace[];
  } | null>(null);
  /* ─ Key maps from Python variable names → JSON keys ─ */
  const xKeyMap: Record<string, string> = {
    phase: 'phase_values_phase',
    mjd: 'time_mjd',
    time: 'time_mjd', // "Datetime" in dropdown – stored as MJD number
    second: 'time_second',
    minute: 'time_minute',
    hour: 'time_hour',
    day: 'time_day',
  };
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [modalInfo, setModalInfo] = useState<{
    imgSrc?: string;
    details?: React.ReactNode[];
  } | null>(null);
  const [tooltipContent, setTooltipContent] = useState<React.ReactNode | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null);


  useEffect(() => {
    async function loadData() {
      if (dataSelection.length === 0) return;

      setLoading(true);
      const rawTracesSW: PlotTrace[] = [];
      const rawTracesLW: PlotTrace[] = [];

      const colorMap = new Map<string, string>();
      dataSelection.forEach((sel, idx) => {
        const color = colorList[idx % colorList.length];
        colorMap.set(sel, color);
      });
      for (const sel of dataSelection) {
        const [epoch, r1, r2] = sel.split('_');
        const makePath = (wave: 'sw' | 'lw') =>
          `/data/json/ZTF_J1539/rawdata/${epoch}/${wave}/${r1}/${r2}.json`;

        try {
          const [swJson, lwJson] = await Promise.all([
            fetch(makePath('sw')).then((r) => r.json()),
            fetch(makePath('lw')).then((r) => r.json()),
          ]);

          const timeKey = xKeyMap[xAxis];
          const addTrace = (
            wave: 'SW' | 'LW',
            json: {
              time: number[]; // datetime-like (converted from MJD)
              time_mjd: number[];
              time_second: number[];
              time_minute: number[];
              time_hour: number[];
              time_day: number[];

              phase_values: number[];
              psf_flux_time: number[];
              psf_flux_unc_time: number[];
              frame: number[];
              customdata_time: { filename: string }[];

              phase_values_phase: number[];
              time_mjd_phase: number[];
              psf_flux_phase: number[];
              psf_flux_unc_phase: number[];
              frame_phase: number[];
              customdata_phase: { filename: string }[];

              [key: string]: unknown;
            },
            target: PlotTrace[],
            color: string
          ) => {
            let x: number[] = [];
            let y: number[] = [];
            let err: number[] = [];
            let customdata: unknown[] = [];
            // const { time_mjd, psf_flux_time, customdata_time } = json;
            // const filenames = customdata_time.map(d => d.filename);
            if (dataType === 'average') {
              if (xAxis === 'phase') {
                // console.log(json)
                const flux = json.psf_flux_phase as number[];
                const fluxErr = json.psf_flux_unc_phase as number[];

                // Step 1: Prepare bin edges
                const binEdges = Array.from({ length: noOfBins + 1 }, (_, i) => i / noOfBins);
                const binCenters = Array.from({ length: noOfBins }, (_, i) => (binEdges[i] + binEdges[i + 1]) / 2);
                const bins: number[][] = Array.from({ length: noOfBins }, () => []);
                const binErrs: number[][] = Array.from({ length: noOfBins }, () => []);

                // Step 2: Digitize (mimic np.digitize(..., bin_edges) - 1)
                const phaseValues = json.phase_values_phase as number[];
                // console.log(phaseValues)
                const binIndices = digitize(phaseValues, binEdges, false).map(i => i - 1);

                // Step 3: Assign flux and error to bins
                binIndices.forEach((binIndex, idx) => {
                  if (binIndex >= 0 && binIndex < noOfBins) {
                    bins[binIndex].push(flux[idx]);
                    binErrs[binIndex].push(fluxErr[idx]);
                  }
                });

                // Step 4: Compute weighted average for each bin
                for (let i = 0; i < noOfBins; i++) {
                  if (bins[i].length > 0) {
                    const [avg, avgErr] = weightedAvg(bins[i], binErrs[i]);
                    y.push(avg);
                    x.push(binCenters[i]);
                    err.push(avgErr);
                  }
                }

                // Step 5: Duplicate for phase wraparound (0–2 range)
                const xArr = [...x];
                x = xArr.concat(xArr.map(val => val + 1));
                y = y.concat(y);
                err = err.concat(err);
                customdata = customdata.concat(customdata);
              } else {
                const flux = json.psf_flux_time as number[];
                const fluxErr = json.psf_flux_unc_time as number[];
                const timeArr = json[timeKey];
                const chunkSize = noOfDataPoint;
                const chunks = Math.floor(flux.length / chunkSize);

                for (let i = 0; i < chunks; i++) {
                  const fluxChunk = flux.slice(i * chunkSize, (i + 1) * chunkSize);
                  const errChunk = fluxErr.slice(i * chunkSize, (i + 1) * chunkSize);
                  const timeChunk = (timeArr as number[]).slice(i * chunkSize, (i + 1) * chunkSize);
                  const [avg, avgErr] = weightedAvg(fluxChunk, errChunk);
                  y.push(avg);
                  x.push(timeChunk.reduce((a, b) => a + b) / timeChunk.length);
                  err.push(avgErr);
                }

                const remainingStart = chunks * chunkSize;
                if (remainingStart < flux.length) {
                  const fluxChunk = flux.slice(remainingStart);
                  const errChunk = fluxErr.slice(remainingStart);
                  const timeChunk = (timeArr as number[]).slice(remainingStart);
                  const [avg, avgErr] = weightedAvg(fluxChunk, errChunk);
                  y.push(avg);
                  x.push(timeChunk.reduce((a, b) => a + b) / timeChunk.length);
                  err.push(avgErr);
                }
              }
            } else {
              if (xAxis === 'phase') {
                x = json.phase_values_phase ?? [];
                y = json.psf_flux_phase ?? [];
                err = json.psf_flux_unc_phase ?? [];
                customdata = json.customdata_phase ?? [];

                const xArr = [...x];
                x = xArr.concat(xArr.map(val => val + 1));
                y = y.concat(y);
                err = err.concat(err);
                customdata = customdata.concat(customdata);
              } else {
                x = (json[timeKey] as number[]) ?? [];
                y = json.psf_flux_time ?? [];
                err = json.psf_flux_unc_time ?? [];
                customdata = json.customdata_time ?? [];
              }
            }
            if (dataType === 'average') {
              if (xAxis === 'phase') {
                customdata = json.customdata_phase ?? [];
              } else {
                customdata = json.customdata_time ?? [];
              }
            } else {
              customdata = json.customdata_time ?? [];
            }

            const traces = buildTraces({
              x, y, err, customdata,
              hoverinfo: 'x+y+name',
              hovertemplate: '<b>%{fullData.name}</b><br>t = %{x:.3f}<br>flux = %{y:.2e}<extra></extra>',
              plotType: plotType as 'lines' | 'markers' | 'lines+markers', errorBars: errorBars as 'bar' | 'hide' | 'separate', name: `${epoch}.${r1}.${r2}`,
              wave, color, pointSize, lineWidth
            });
            target.push(...traces);
          };

          addTrace('SW', swJson, rawTracesSW, colorMap.get(sel)!);
          addTrace('LW', lwJson, rawTracesLW, colorMap.get(sel)!);
        } catch (err) {
          console.error('Fetch failed for', sel, err);
        }
      }

      const layout: PlotLayout = {
        height: 800,
        grid: { rows: 2, columns: 1, pattern: 'independent' },
        margin: { l: 50, r: 30, t: 40, b: 40 },
        xaxis: {
          title: xAxis,
          matches: 'x2',
          domain: [0.0, 1.0],
          anchor: 'y1',
          titlefont: { size: labelFontSize },
          tickfont: { size: labelFontSize },
          showgrid: true
        },
        yaxis: {
          title: 'SW: Surf Bright (MJy/sr)',
          domain: [0.55, 1.0],
          anchor: 'x',
          titlefont: { size: labelFontSize },
          tickfont: { size: labelFontSize },
          showgrid: true,
          automargin: true
        },
        xaxis2: {
          title: xAxis,
          domain: [0.0, 1.0],
          anchor: 'y2',
          titlefont: { size: labelFontSize },
          tickfont: { size: labelFontSize },
          showgrid: true
        },
        yaxis2: {
          title: 'LW: Surf Bright (MJy/sr)',
          domain: [0.0, 0.45],
          anchor: 'x2',
          titlefont: { size: labelFontSize },
          tickfont: { size: labelFontSize },
          showgrid: true,
          automargin: true
        },
        annotations: [
          {
            text: 'SW Panel',
            font: { size: labelFontSize + 1 },
            x: 0,
            xref: 'paper',
            y: 1,
            yref: 'paper',
            showarrow: false,
            xanchor: 'left',
            yanchor: 'bottom'
          },
          {
            text: 'LW Panel',
            font: { size: labelFontSize + 1 },
            x: 0,
            xref: 'paper',
            y: 0.45,
            yref: 'paper',
            showarrow: false,
            xanchor: 'left',
            yanchor: 'bottom'
          }
        ],
        legend: {
          font: { size: legendFontSize },
          groupclick: 'toggleitem'
        },
        hoverlabel: { font: { size: tooltipFontSize } },
        // hovermode: 'x',
        font: { size: labelFontSize }
      };


      const fullData: PlotTrace[] = [
        ...rawTracesSW.map((tr) => ({ ...tr, xaxis: 'x', yaxis: 'y' })),
        ...rawTracesLW.map((tr) => ({ ...tr, xaxis: 'x2', yaxis: 'y2' })),
      ];
      setRawFigure({ tracesSW: rawTracesSW, tracesLW: rawTracesLW });
      setFigure({ data: fullData, layout });
      setLoading(false);
    }

    loadData();
  }, [dataSelection, dataType, xAxis, errorBars, noOfBins, noOfDataPoint]);

  useEffect(() => {
    if (!rawFigure) return;

    const tracesSW = rawFigure.tracesSW.map(tr => ({
      ...tr,
      mode: plotType as 'lines' | 'markers' | 'lines+markers',
      marker: { color: tr.marker?.color ?? '#000', size: pointSize },
      line: { color: tr.line?.color ?? '#000', width: lineWidth },
      xaxis: 'x',
      yaxis: 'y',
    }));

    const tracesLW = rawFigure.tracesLW.map(tr => ({
      ...tr,
      mode: plotType as 'lines' | 'markers' | 'lines+markers',
      marker: { color: tr.marker?.color ?? '#000', size: pointSize },
      line: { color: tr.line?.color ?? '#000', width: lineWidth },
      xaxis: 'x2',
      yaxis: 'y2',
    }));

    const layout = {
      height: 800,
      grid: { rows: 2, columns: 1, pattern: 'independent' },
      margin: { l: 50, r: 30, t: 40, b: 40 },
      xaxis: {
        title: xAxis,
        matches: 'x2',
        domain: [0.0, 1.0],
        anchor: 'y1',
        titlefont: { size: labelFontSize },
        tickfont: { size: labelFontSize },
        showgrid: true
      },
      yaxis: {
        title: 'SW: Surf Bright (MJy/sr)',
        domain: [0.55, 1.0],
        anchor: 'x',
        titlefont: { size: labelFontSize },
        tickfont: { size: labelFontSize },
        showgrid: true,
        automargin: true
      },
      xaxis2: {
        title: xAxis,
        domain: [0.0, 1.0],
        anchor: 'y2',
        titlefont: { size: labelFontSize },
        tickfont: { size: labelFontSize },
        showgrid: true
      },
      yaxis2: {
        title: 'LW: Surf Bright (MJy/sr)',
        domain: [0.0, 0.45],
        anchor: 'x2',
        titlefont: { size: labelFontSize },
        tickfont: { size: labelFontSize },
        showgrid: true,
        automargin: true
      },
      annotations: [
        {
          text: 'SW Panel',
          font: { size: labelFontSize + 1 },
          x: 0,
          xref: 'paper',
          y: 1,
          yref: 'paper',
          showarrow: false,
          xanchor: 'left',
          yanchor: 'bottom'
        },
        {
          text: 'LW Panel',
          font: { size: labelFontSize + 1 },
          x: 0,
          xref: 'paper',
          y: 0.45,
          yref: 'paper',
          showarrow: false,
          xanchor: 'left',
          yanchor: 'bottom'
        }
      ],
      legend: {
        font: { size: legendFontSize },
        groupclick: 'toggleitem'
      },
      hoverlabel: { font: { size: tooltipFontSize } },
      // hovermode: 'x',
      font: { size: labelFontSize }
    };

    setFigure({ data: [...tracesSW, ...tracesLW], layout });
  }, [plotType, pointSize, lineWidth, labelFontSize, legendFontSize, tooltipFontSize, xAxis, rawFigure]);
  function handlePointClick(e: Readonly<any>) {
    const pt = e.points[0];
    const { x, y, data: trace, pointNumber } = pt;
    const cd = trace.customdata?.[pointNumber] ?? {};
    const id = `${cd.type}_${cd.phase}`;

    const newAnno = {
      x,
      y,
      xref: trace.xaxis,
      yref: trace.yaxis,
      text: id,
      showarrow: true,
      arrowhead: 7,
      xanchor: 'center',
      yanchor: 'bottom',
      ax: 0,
      ay: -40,
      bgcolor: 'rgba(0,240,255,0.7)',
      font: { color: 'black', size: 14 },
    };

    setAnnotations((prev) => [...prev.filter((a) => a.text !== id), newAnno]);
    setModalInfo({
      imgSrc: cd.img_src,
      details: [
        <p key="phase">Phase: {cd.phase}</p>,
        <p key="type">Type: {cd.type}</p>,
        <p key="rin">r_in: {cd.r_in}, r_out: {cd.r_out}</p>,
        <p key="file">File: {cd.filename}</p>,
      ],
    });
  }
  function handleHover(e: Readonly<any>) {
    const pt = e.points[0];
    const { x, y, customdata } = pt;
    const cd = customdata ?? {};
    const { phase, r_in, r_out, type, filename } = cd;

    setTooltipContent(
      <div className="text-xs p-2 bg-white rounded shadow border border-gray-300">
        <div><strong>Phase:</strong> {phase}</div>
        <div><strong>Type:</strong> {type}</div>
        <div><strong>r_in:</strong> {r_in}, <strong>r_out:</strong> {r_out}</div>
        <div><strong>File:</strong> {filename}</div>
      </div>
    );

    const bbox = pt.bbox; // {x0, y0, x1, y1}
    setTooltipPosition({ left: bbox.x0, top: bbox.y0 });
  }
  function handleUnhover() {
    setTooltipContent(null);
    setTooltipPosition(null);
  }
  /* ────────────────────────── Render ─────────────────────── */
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">ZTF J1539 PSF Light Curves</h1>
      {loading && <p>Loading plot…</p>}
      {figure && (
        <Plot
          data={figure.data}
          layout={{ ...figure.layout, annotations }}
          config={{ responsive: true, displaylogo: false }}
          onClick={handlePointClick}
          onHover={handleHover}
          onUnhover={handleUnhover}
          style={{ width: '100%', height: '100%' }}
        />
      )}
      <ImageModal
        isOpen={!!modalInfo}
        onClose={() => setModalInfo(null)}
        imgSrc={modalInfo?.imgSrc}
        details={modalInfo?.details}
      />
      {
        tooltipContent && tooltipPosition && (
          <div
            className="absolute z-50 pointer-events-none"
            style={{ left: tooltipPosition.left + 10, top: tooltipPosition.top + 10 }}
          >
            {tooltipContent}
          </div>
        )
      }
    </div>


  );
}
