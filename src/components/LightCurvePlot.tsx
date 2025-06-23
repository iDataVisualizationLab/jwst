// ───────────────────── components/LightCurvePlot.tsx ─────────────────────
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback, useRef } from 'react';
import { usePlotSettings } from '@/context/PlotSettingsContext';
import { buildTraces } from '@/utils/buildTraces';
import { colorList } from '@/constants/colors';
import { xKeyMap } from '@/utils/xKeyMap';
import { createAnnotation, ModalInfo } from '@/utils/annotationUtils';
import { renderTooltip } from '@/constants/hoverUtils';
import { digitize, weightedAvg } from '@/libs/mathUtils';
import { PlotTrace, PlotLayout } from '@/types/PlotTypes';
import { ImageModal } from '@/components/ImageModal';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function LightCurvePlot() {
  const {
    dataType, dataSelection, xAxis, errorBars, noOfBins, noOfDataPoint,
    plotType, pointSize, lineWidth, legendFontSize, labelFontSize, tooltipFontSize,
    figure, rawFigure, setSettings
  } = usePlotSettings();

  const [loading, setLoading] = useState(false);
  const [annotations, setAnnotations] = useState<Partial<Plotly.Annotations>[]>([]);
  const [modalInfo, setModalInfo] = useState<ModalInfo | null>(null);
  const [tooltipContent, setTooltipContent] = useState<React.ReactNode | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null);
  // const [selectedImages, setSelectedImages] = useState<
  //   { id: string; imgSrc: string; label: string; cd: any }[]
  // >([]);
  // const imageCounter = useRef(1);
  type SelectedImg = {
    key: string;
    imgSrc: string;
    label: string;
    cd: any;
    bgColor: string;
    fontColor: string;
  };
  const NORMAL_BG = 'rgba(0, 0, 0, 0.7)';
  const NORMAL_FG = 'white';
  const FOCUS_BG = 'rgba(0,240,255,0.7)';
  const FOCUS_FG = 'black';
  const FONT_SIZE = 13;
  const FONT_FAMILY = 'sans-serif';
  /* ───── 2.  State ───── */
  const [selectedImages, setSelectedImages] = useState<SelectedImg[]>([]);
  const imageCounter = useRef(1);          // stays outside of renders
  useEffect(() => {
    async function loadData() {
      if (dataSelection.length === 0) return;
      setLoading(true);

      const rawTracesSW: PlotTrace[] = [];
      const rawTracesLW: PlotTrace[] = [];
      const colorMap = new Map<string, string>();
      dataSelection.forEach((sel, idx) => colorMap.set(sel, colorList[idx % colorList.length]));

      for (const sel of dataSelection) {
        const [epoch, r1, r2] = sel.split('_');
        const makePath = (wave: 'sw' | 'lw') => `/data/json/ZTF_J1539/rawdata/${epoch}/${wave}/${r1}/${r2}.json`;

        try {
          const [swJson, lwJson] = await Promise.all([
            fetch(makePath('sw')).then(r => r.json()),
            fetch(makePath('lw')).then(r => r.json())
          ]);

          const timeKey = xKeyMap[xAxis];
          const addTrace = (wave: 'SW' | 'LW', json: any, target: PlotTrace[], color: string) => {
            let x: number[] = [], y: number[] = [], err: number[] = [], customdata: unknown[] = [];

            if (dataType === 'average') {
              if (xAxis === 'phase') {
                const flux = json.psf_flux_phase ?? [], fluxErr = json.psf_flux_unc_phase ?? [];
                const phaseValues = json.phase_values_phase ?? [];

                const binEdges = Array.from({ length: noOfBins + 1 }, (_, i) => i / noOfBins);
                const binCenters = Array.from({ length: noOfBins }, (_, i) => (binEdges[i] + binEdges[i + 1]) / 2);
                const bins: number[][] = Array.from({ length: noOfBins }, () => []);
                const binErrs: number[][] = Array.from({ length: noOfBins }, () => []);

                const binIndices = digitize(phaseValues, binEdges, false).map(i => i - 1);
                binIndices.forEach((binIndex, idx) => {
                  if (binIndex >= 0 && binIndex < noOfBins) {
                    bins[binIndex].push(flux[idx]);
                    binErrs[binIndex].push(fluxErr[idx]);
                  }
                });

                for (let i = 0; i < noOfBins; i++) {
                  if (bins[i].length > 0) {
                    const [avg, avgErr] = weightedAvg(bins[i], binErrs[i]);
                    x.push(binCenters[i]);
                    y.push(avg);
                    err.push(avgErr);
                  }
                }

                x = x.concat(x.map(v => v + 1));
                y = y.concat(y);
                err = err.concat(err);
              } else {
                const flux = json.psf_flux_time ?? [], fluxErr = json.psf_flux_unc_time ?? [];
                const timeArr = json[timeKey] ?? [];

                const chunkSize = noOfDataPoint;
                const chunks = Math.floor(flux.length / chunkSize);

                for (let i = 0; i < chunks; i++) {
                  const fc = flux.slice(i * chunkSize, (i + 1) * chunkSize);
                  const ec = fluxErr.slice(i * chunkSize, (i + 1) * chunkSize);
                  const tc = timeArr.slice(i * chunkSize, (i + 1) * chunkSize);
                  const [avg, avgErr] = weightedAvg(fc, ec);
                  x.push(tc.reduce((a, b) => a + b) / tc.length);
                  y.push(avg);
                  err.push(avgErr);
                }

                const remStart = chunks * chunkSize;
                if (remStart < flux.length) {
                  const fc = flux.slice(remStart), ec = fluxErr.slice(remStart), tc = timeArr.slice(remStart);
                  const [avg, avgErr] = weightedAvg(fc, ec);
                  x.push(tc.reduce((a, b) => a + b) / tc.length);
                  y.push(avg);
                  err.push(avgErr);
                }
              }
            } else {
              x = json[xAxis === 'phase' ? 'phase_values_phase' : timeKey] ?? [];
              y = xAxis === 'phase' ? json.psf_flux_phase ?? [] : json.psf_flux_time ?? [];
              err = xAxis === 'phase' ? json.psf_flux_unc_phase ?? [] : json.psf_flux_unc_time ?? [];
              customdata = xAxis === 'phase' ? json.customdata_phase ?? [] : json.customdata_time ?? [];
              if (xAxis === 'phase') {
                x = x.concat(x.map(v => v + 1));
                y = y.concat(y);
                err = err.concat(err);
                customdata = customdata.concat(customdata);
              }
            }

            const traces = buildTraces({
              x, y, err, customdata,
              hoverinfo: 'x+y+name',
              hovertemplate: '<b>%{fullData.name}</b><br>t = %{x:.3f}<br>flux = %{y:.2e}<extra></extra>',
              plotType: plotType as 'lines' | 'markers' | 'lines+markers', errorBars: errorBars as 'bar' | 'hide' | 'separate', name: `${epoch}.${r1}.${r2}`, wave, color, pointSize, lineWidth
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
          title: xAxis, matches: 'x2', domain: [0.0, 1.0], anchor: 'y1',
          titlefont: { size: labelFontSize }, tickfont: { size: labelFontSize }, showgrid: true
        },
        yaxis: {
          title: 'SW: Surf Bright (MJy/sr)', domain: [0.51, 1.0], anchor: 'x2',
          titlefont: { size: labelFontSize }, tickfont: { size: labelFontSize }, showgrid: true, automargin: true
        },
        xaxis2: {
          title: xAxis, domain: [0.0, 1.0], anchor: 'y2',
          titlefont: { size: labelFontSize }, tickfont: { size: labelFontSize }, showgrid: true
        },
        yaxis2: {
          title: 'LW: Surf Bright (MJy/sr)', domain: [0.0, 0.49], anchor: 'x2',
          titlefont: { size: labelFontSize }, tickfont: { size: labelFontSize }, showgrid: true, automargin: true
        },
        annotations: annotations,
        legend: { font: { size: legendFontSize }, groupclick: 'toggleitem' },
        hoverlabel: { font: { size: tooltipFontSize } },
        font: { size: labelFontSize }
      };

      const fullData = [
        ...rawTracesSW.map(tr => ({ ...tr, xaxis: 'x2', yaxis: 'y' })),
        ...rawTracesLW.map(tr => ({ ...tr, xaxis: 'x2', yaxis: 'y2' })),
      ];

      setSettings({ rawFigure: { tracesSW: rawTracesSW, tracesLW: rawTracesLW } });
      setSettings({ figure: { data: fullData, layout: layout } });
      setLoading(false);
    }

    loadData();
  }, [dataSelection, dataType, xAxis, errorBars, noOfBins, noOfDataPoint]);

  useEffect(() => {
    if (!rawFigure) return;
    const applyStyle = (tr: PlotTrace, axisX: string, axisY: string) => ({
      ...tr,
      mode: plotType as 'lines' | 'markers' | 'lines+markers',
      marker: { color: tr.marker?.color ?? '#000', size: pointSize },
      line: { color: tr.line?.color ?? '#000', width: lineWidth },
      xaxis: axisX,
      yaxis: axisY,
    });

    setSettings({
      figure: {
        data: [
          ...rawFigure.tracesSW.map(tr => applyStyle(tr, 'x2', 'y')),
          ...rawFigure.tracesLW.map(tr => applyStyle(tr, 'x2', 'y2')),
        ], layout: figure?.layout || {}
      }
    });

  }, [plotType, pointSize, lineWidth, rawFigure]);

  const handlePointClick = useCallback((e: Plotly.PlotMouseEvent) => {
    if (!figure) return;

    const pt = e.points[0];
    const cd = pt.customdata ?? {};
    const { phase, type } = cd;
    if (!phase || !type) return;

    const matches: {
      x: number | string | Date;
      y: number;
      data: PlotTrace;
      cd: any;
    }[] = [];

    figure.data.forEach(trace => {
      if (trace?.legendgroup != type) return;
      if (!Array.isArray(trace.customdata)) return;

      trace.customdata.forEach((trCd, idx) => {
        if (trCd?.phase === phase) {
          matches.push({
            x: (trace.x as any[])[idx],
            y: (trace.y as any[])[idx],
            data: trace,
            cd: trCd,
          });
        }
      });
    });

    if (matches.length > 0) {
      const first = matches[0];
      const key = `${type}_${phase}`;            // stable key
      const exist = selectedImages.some(p => p.key === key);
      const label = exist ?                       // reuse old label if exists
        selectedImages.find(p => p.key === key)!.label
        : `No. ${imageCounter.current}`;

      setAnnotations(prev => [
        ...prev
          .filter(a => (a as any).custom_id !== key) // remove current key (if any)
          .map(a => ({
            ...a,
            bgcolor: NORMAL_BG,
            font: { color: NORMAL_FG,
                size: FONT_SIZE,
                family: FONT_FAMILY,
              },
          })),
        ...matches.map(m =>
          createAnnotation(
            { x: m.x, y: m.y, data: m.data },
            {
              ...m.cd,
              text: label,
              bgcolor: FOCUS_BG,
              font: { color: FOCUS_FG,
                size: FONT_SIZE,
                family: FONT_FAMILY,
               },
            }
          )
        ),
      ]);

      if (!exist) {
        const imgSrc = `https://raw.githubusercontent.com/iDataVisualizationLab/jwst-data/main/img/thumbnails/${first.cd.filename}`;

        setSelectedImages(prev =>
          prev.map(p => ({
            ...p,
            bgColor: NORMAL_BG,
            fontColor: NORMAL_FG,
          })).concat({
            key,
            imgSrc,
            label,
            cd,
            bgColor: FOCUS_BG,
            fontColor: FOCUS_FG,
          })
        );

        imageCounter.current += 1;
      } else {
        setSelectedImages(prev =>
          prev.map(p =>
            p.key === key
              ? { ...p, bgColor: FOCUS_BG, fontColor: FOCUS_FG }
              : { ...p, bgColor: NORMAL_BG, fontColor: NORMAL_FG }
          )
        );
      }

    }
  }, [figure, selectedImages]);



  function handleHover(e: any) {
    const pt = e.points[0];
    const cd = pt.customdata ?? {};
    setTooltipContent(renderTooltip(cd));
    const bbox = pt.bbox;
    setTooltipPosition({ left: bbox.x0, top: bbox.y0 });
  }

  function handleUnhover() {
    setTooltipContent(null);
    setTooltipPosition(null);
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">ZTF J1539 PSF Light Curves</h1>
      {loading && <p>Loading plot…</p>}
      {figure && (
        <Plot
          data={figure.data}
          layout={{ ...figure.layout, annotations: annotations }}
          config={{ responsive: true, displaylogo: false }}
          onClick={handlePointClick}
          onHover={handleHover}
          onUnhover={handleUnhover}
          style={{ width: '100%', height: '100%' }}
        />
      )}
      {selectedImages.length > 0 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {selectedImages.map((img, index) => (
            <div
              key={img.id}
              className="relative group border rounded shadow cursor-pointer"
              onClick={() => {
                // 1. Update annotations
                setAnnotations(prev =>
                  prev.map(a => {
                    const isTarget = (a as any).custom_id === img.key;
                    return {
                      ...a,
                      bgcolor: isTarget ? 'rgba(0, 240, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                      font: { color: isTarget ? 'black' : 'white' },
                    };
                  })
                );

                // 2. Update image styles
                setSelectedImages(prev =>
                  prev.map(p =>
                    p.key === img.key
                      ? { ...p, bgColor: 'rgba(0, 240, 255, 0.7)', fontColor: 'black' }
                      : { ...p, bgColor: 'black', fontColor: 'white' }
                  )
                );
                setModalInfo({
                  imgSrc: img.imgSrc,
                  details: [
                    `Label: ${img.label}`,
                    `phase: ${img.cd?.phase}`,
                    `type: ${img.cd?.type}`,
                    `mjd: ${img.cd?.mjd}`,
                    `r_in: ${img.cd?.r_in}`,
                    `r_out: ${img.cd?.r_out}`,
                  ],
                });
              }}
            >
              <span
                className="absolute top-0 left-0 text-xs font-bold px-2 py-1 rounded-br"
                style={{ backgroundColor: img.bgColor, color: img.fontColor }}
              >
                {img.label}
              </span>
              <button
                onClick={() => {
                  setSelectedImages(prev => prev.filter(p => p.key !== img.key));
                  setAnnotations(prev => prev.filter(a => (a as any).custom_id !== img.key));
                }}
                className="absolute top-0 right-0 bg-orange-400 hover:bg-orange-500 text-white text-xs px-1 py-0.5 rounded-bl"
              >
                🗑
              </button>
              <img src={img.imgSrc} alt={img.label} className="w-full h-auto object-contain" />
            </div>
          ))}
        </div>
      )}
      <ImageModal
        isOpen={!!modalInfo}
        onClose={() => setModalInfo(null)}
        imgSrc={modalInfo?.imgSrc}
        details={modalInfo?.details}
      />
      {tooltipContent && tooltipPosition && (
        <div className="absolute z-50 pointer-events-none" style={{ left: tooltipPosition.left + 10, top: tooltipPosition.top + 10 }}>
          {tooltipContent}
        </div>
      )}
    </div>
  );
}

