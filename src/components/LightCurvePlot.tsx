// ───────────────────── components/LightCurvePlot.tsx ─────────────────────
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback, useRef } from 'react';
import { usePlotSettings } from '@/context/PlotSettingsContext';
import { buildTraces } from '@/utils/buildTraces';
import { colorList } from '@/constants/colors';
import { xKeyMap } from '@/utils/xKeyMap';
import { createAnnotation, ModalInfo } from '@/utils/annotationUtils';
import { RenderTooltip } from '@/constants/hoverUtils';
import { digitize, weightedAvg } from '@/libs/mathUtils';
import { PlotTrace, PlotLayout } from '@/types/PlotTypes';
import { ImageModal } from '@/components/ImageModal';
import RawDataPlotPanel from '@/components/RawDataPlotPanel';
import { Trash2 } from 'lucide-react';
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function LightCurvePlot() {
  const {
    dataType, dataSelection, xAxis, errorBars, noOfBins, noOfDataPoint,
    plotType, pointSize, lineWidth, legendFontSize, labelFontSize, tooltipFontSize,
    figure, rawFigure, avgPointRawMap, setSettings
  } = usePlotSettings();

  const [loading, setLoading] = useState(false);
  const [useRawMode, setUseRawMode] = useState(false);
  const [annotations, setAnnotations] = useState<Partial<Plotly.Annotations>[]>([]);
  const [avgAnnotations, setAvgAnnotations] = useState<Partial<Plotly.Annotations>[]>([]);
  const [modalInfo, setModalInfo] = useState<ModalInfo | null>(null);
  const [tooltipContent, setTooltipContent] = useState<React.ReactNode | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null);
  const [rawPlot, setRawPlot] = useState<{ x: number; y: number; err?: number; customdata: unknown }[] | null>(null);
  const [rawColor, setRawColor] = useState<string>('#1f77b4');

  // const [selectedImages, setSelectedImages] = useState<
  //   { id: string; imgSrc: string; label: string; cd: any }[]
  // >([]);
  // const imageCounter = useRef(1);
  type SelectedImg = {
    key: string;
    imgThumbnailsSrc: string;
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
          const addTrace = (
            wave: 'SW' | 'LW',
            json: any,
            target: PlotTrace[],
            color: string,
            epoch: string,
            r_in: string,
            r_out: string,
            avgPointRawMap: Record<string, { x: number; y: number; err: number; customdata: unknown }[]>
          ) => {
            let x: number[] = [], y: number[] = [], err: number[] = [], customdata: unknown[] = [];
            const type = wave.toLowerCase()
            if (dataType === 'average') {
              if (xAxis === 'phase') {
                const flux = json.psf_flux_phase ?? [], fluxErr = json.psf_flux_unc_phase ?? [];
                const phaseValues = json.phase_values_phase ?? [];
                const original_customdata = json.customdata_phase ?? [];
                const binEdges = Array.from({ length: noOfBins + 1 }, (_, i) => i / noOfBins);
                const binCenters = Array.from({ length: noOfBins }, (_, i) => (binEdges[i] + binEdges[i + 1]) / 2);
                const bins: number[][] = Array.from({ length: noOfBins }, () => []);
                const binErrs: number[][] = Array.from({ length: noOfBins }, () => []);
                const binPhases: number[][] = Array.from({ length: noOfBins }, () => []);
                const binCustomdata: number[][] = Array.from({ length: noOfBins }, () => []);

                const binIndices = digitize(phaseValues, binEdges, false).map(i => i - 1);
                binIndices.forEach((binIndex, idx) => {
                  if (binIndex >= 0 && binIndex < noOfBins) {
                    bins[binIndex].push(flux[idx]);
                    binErrs[binIndex].push(fluxErr[idx]);
                    binPhases[binIndex].push(phaseValues[idx]);
                    binCustomdata[binIndex].push(original_customdata[idx]);
                  }
                });

                for (let i = 0; i < noOfBins; i++) {
                  if (bins[i].length > 0) {
                    const [avg, avgErr] = weightedAvg(bins[i], binErrs[i]);
                    const center = binCenters[i];
                    x.push(center);
                    y.push(avg);
                    err.push(avgErr);

                    customdata.push({
                      type,
                      epoch,
                      r_in,
                      r_out,
                      phase: center.toFixed(5),
                    });
                    const rawPoints = bins[i].map((yVal, j) => ({
                      x: binPhases[i][j],
                      y: yVal,
                      err: binErrs[i][j],
                      customdata: binCustomdata[i][j]
                    }));

                    const key = `${type}_${epoch}_${r_in}_${r_out}_${center.toFixed(5)}`;
                    avgPointRawMap[key] = rawPoints;
                  }
                }

                x = x.concat(x.map(v => v + 1));
                y = y.concat(y);
                err = err.concat(err);
                customdata = customdata.concat(customdata);

              } else {
                const flux = json.psf_flux_time ?? [], fluxErr = json.psf_flux_unc_time ?? [];
                const timeArr = json[timeKey] ?? [];

                const original_customdata = json.customdata_time ?? [];

                const chunkSize = noOfDataPoint;
                const chunks = Math.floor(flux.length / chunkSize);

                for (let i = 0; i < chunks; i++) {
                  const fc = flux.slice(i * chunkSize, (i + 1) * chunkSize);
                  const ec = fluxErr.slice(i * chunkSize, (i + 1) * chunkSize);
                  const tc = timeArr.slice(i * chunkSize, (i + 1) * chunkSize);
                  const cc = original_customdata.slice(i * chunkSize, (i + 1) * chunkSize);
                  const [avg, avgErr] = weightedAvg(fc, ec);

                  const center = tc.reduce((a, b) => a + b) / tc.length;
                  x.push(center);
                  y.push(avg);
                  err.push(avgErr);
                  customdata.push({
                    type,
                    epoch,
                    r_in,
                    r_out,
                    phase: center.toFixed(5),
                  });
                  const rawPoints = fc.map((yVal, j) => ({
                    x: tc[j],
                    y: yVal,
                    err: ec[j],
                    customdata: cc[j]
                  }));

                  const key = `${type}_${epoch}_${r_in}_${r_out}_${center.toFixed(5)}`;
                  avgPointRawMap[key] = rawPoints;
                }

                const remStart = chunks * chunkSize;
                if (remStart < flux.length) {
                  const fc = flux.slice(remStart), ec = fluxErr.slice(remStart), tc = timeArr.slice(remStart), cc = original_customdata.slice(remStart);
                  const [avg, avgErr] = weightedAvg(fc, ec);
                  // x.push(tc.reduce((a, b) => a + b) / tc.length);
                  const center = tc.reduce((a, b) => a + b) / tc.length;
                  x.push(center);
                  y.push(avg);
                  err.push(avgErr);
                  customdata.push({
                    type,
                    epoch,
                    r_in,
                    r_out,
                    phase: center.toFixed(5),
                  });
                  const rawPoints = fc.map((yVal, j) => ({
                    x: tc[j],
                    y: yVal,
                    err: ec[j],
                    customdata: cc[j]
                  }));

                  const key = `${type}_${epoch}_${r_in}_${r_out}_${center.toFixed(5)}`;
                  avgPointRawMap[key] = rawPoints;
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
              hoverinfo: 'none',
              plotType: plotType as 'lines' | 'markers' | 'lines+markers', errorBars: errorBars as 'bar' | 'hide' | 'separate', name: `${epoch}.${r1}.${r2}`, wave, color, pointSize, lineWidth
            });
            // const traces = buildTraces({
            //   x, y, err, customdata,
            //   hoverinfo: 'x+y+name',
            //   hovertemplate: '<b>%{fullData.name}</b><br>t = %{x:.3f}<br>flux = %{y:.2e}<extra></extra>',
            //   plotType: plotType as 'lines' | 'markers' | 'lines+markers', errorBars: errorBars as 'bar' | 'hide' | 'separate', name: `${epoch}.${r1}.${r2}`, wave, color, pointSize, lineWidth
            // });

            target.push(...traces);
          };

          // addTrace('SW', swJson, rawTracesSW, colorMap.get(sel)!);
          // addTrace('LW', lwJson, rawTracesLW, colorMap.get(sel)!);
          addTrace('SW', swJson, rawTracesSW, colorMap.get(sel)!, epoch, r1, r2, avgPointRawMap);
          addTrace('LW', lwJson, rawTracesLW, colorMap.get(sel)!, epoch, r1, r2, avgPointRawMap);
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
      setSettings({ avgPointRawMap });
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

  useEffect(() => {
    clearAll();
  }, [dataType, xAxis]);



  function getContrastingFontColor(color: string): 'black' | 'white' {
    if (!color || typeof color !== 'string') return 'black';

    let r = 0, g = 0, b = 0;

    // rgb() or rgba()
    if (color.startsWith('rgb')) {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        r = parseInt(match[1], 10);
        g = parseInt(match[2], 10);
        b = parseInt(match[3], 10);
      } else {
        console.warn('Invalid rgb color:', color);
        return 'black';
      }
    } else {
      // hex: #fff, #f4a300, etc.
      color = color.replace('#', '');
      if (color.length === 3) {
        color = color.split('').map(c => c + c).join('');
      }
      if (color.length !== 6) {
        console.warn('Invalid hex color:', color);
        return 'black';
      }
      r = parseInt(color.substring(0, 2), 16);
      g = parseInt(color.substring(2, 4), 16);
      b = parseInt(color.substring(4, 6), 16);
    }

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? 'black' : 'white';
  }




  function handleAveragePointClick(figure, pt: Plotly.PlotDatum) {
    const cd = pt.customdata ?? {};
    console.log('Average point click:', pt, cd);
    setRawColor(pt.fullData?.marker?.color ?? '#1f77b4');
    const { type, epoch, r_in, r_out, phase } = cd;
    if (!type || !epoch || !r_in || !r_out || !phase || !avgPointRawMap) return;
    const matches: {
      x: number | string | Date;
      y: number;
      data: PlotTrace;
      cd: any;
    }[] = [];

    figure.data.forEach(trace => {
      if (trace?.legendgroup != type) return;
      if (!Array.isArray(trace.customdata)) return;
      // if (trace.customdata.type.toLowerCase() !== type.toLowerCase()) return;

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
        : `Phase ${phase}`;
      const bgColor = pt.fullData?.marker?.color ?? '#1f77b4';
      const fontColor = getContrastingFontColor(bgColor);
      setAvgAnnotations(
        matches.map(m =>
          createAnnotation(
            { x: m.x, y: m.y, data: m.data },
            {
              ...m.cd,
              text: label,
              bgcolor: bgColor,
              font: {
                color: fontColor,
                size: FONT_SIZE,
                family: FONT_FAMILY,
              },
            }
          )
        )
      );



    }
    const wave = pt.data.name.includes('SW') ? 'SW' : 'LW';
    const key = `${type}_${epoch}_${r_in}_${r_out}_${Number(phase).toFixed(5)}`;
    const rawPoints = avgPointRawMap[key];

    if (rawPoints) {
      setRawPlot(rawPoints);
      setUseRawMode(true);
    } else {
      console.warn(`[Average click] No raw points found for key: ${key}`);
    }
  }

  function handleOriginalPointClick(figure, pt: Plotly.PlotDatum) {
    if (!figure) return;
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
      // if (trace.customdata.type.toLowerCase() !== type.toLowerCase()) return;

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
            font: {
              color: NORMAL_FG,
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
              font: {
                color: FOCUS_FG,
                size: FONT_SIZE,
                family: FONT_FAMILY,
              },
            }
          )
        ),
      ]);

      if (!exist) {
        const imgThumbnailsSrc = `https://raw.githubusercontent.com/iDataVisualizationLab/jwst-data/main/img/thumbnails/${first.cd.filename}`;
        const imgSrc = `https://raw.githubusercontent.com/iDataVisualizationLab/jwst-data/main/img/full-size/${first.cd.filename}`;

        setSelectedImages(prev =>
          prev.map(p => ({
            ...p,
            bgColor: NORMAL_BG,
            fontColor: NORMAL_FG,
          })).concat({
            key,
            imgThumbnailsSrc,
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
  }
  // function findClickedAnnotation(x: number, y: number, threshold = 0.1) {
  //   return annotations.find(ann => {
  //     if (!('x' in ann) || !('y' in ann)) return false;
  //     const dx = Math.abs(x - Number(ann.x));
  //     const dy = Math.abs(y - Number(ann.y));
  //     return Math.sqrt(dx * dx + dy * dy) < threshold;
  //   });
  // }
  // useEffect(() => {
  //   const container = document.querySelector('.js-plotly-plot');
  //   if (!container) return;

  //   const attachClickHandlers = () => {
  //     const annotationGroups = container.querySelectorAll<SVGGElement>('.annotation');

  //     annotationGroups.forEach((groupEl) => {
  //       if ((groupEl as any)._listenerAttached) return; // prevent double binding

  //       const textNode = groupEl.querySelector('.annotation-text-g');
  //       if (!textNode) return;

  //       // Add event listener to the group
  //       groupEl.addEventListener('click', () => {
  //         const text = textNode.textContent?.trim();
  //         if (!text) return;

  //         const match = selectedImages.find((img) => img.label === text);
  //         if (match) {
  //           console.log('✅ Clicked annotation:', text);
  //           focusAnnotation(match.key); // focusAnnotation must be defined
  //         }
  //       });

  //       (groupEl as any)._listenerAttached = true;
  //     });
  //   };

  //   // Initial run
  //   setTimeout(attachClickHandlers, 100); // wait for plot to render

  //   // Observer watches for re-renders
  //   const observer = new MutationObserver(() => {
  //     setTimeout(attachClickHandlers, 50);
  //   });

  //   observer.observe(container, { childList: true, subtree: true });

  //   return () => observer.disconnect();
  // }, [selectedImages]);


  const handlePointClick = useCallback((e: Plotly.PlotMouseEvent) => {
    const pt = e.points[0];
    if (!figure) return;

    // const clickedX = pt.x;
    // const clickedY = pt.y;

    // if (typeof clickedX !== 'number' || typeof clickedY !== 'number') {
    //   return;
    // }

    // const matchedAnn = findClickedAnnotation(clickedX, clickedY);
    // if (matchedAnn) {
    //   console.log('Clicked annotation:', matchedAnn);
    //   const key = (matchedAnn as any).custom_id;
    //   if (key) {
    //     focusAnnotation(key);
    //   }
    // }

    if (dataType === 'average') {
      handleAveragePointClick(figure, pt);
    } else {
      handleOriginalPointClick(figure, pt);
    }
  }, [dataType, avgPointRawMap, figure, selectedImages]);


  function clearAll() {
    setRawPlot(null);
    setUseRawMode(false);
    setAnnotations([]);
    imageCounter.current = 1; // reset counter
    // Reset selected images
    setSelectedImages([]);
  }
  // function focusAnnotation(key: string) {
  //   setAnnotations(prev =>
  //     prev.map(a => ({
  //       ...a,
  //       bgcolor: (a as any).custom_id === key ? FOCUS_BG : NORMAL_BG,
  //       font: {
  //         ...(a.font ?? {}),
  //         color: (a as any).custom_id === key ? FOCUS_FG : NORMAL_FG,
  //         size: FONT_SIZE,
  //         family: FONT_FAMILY,
  //       },
  //     }))
  //   );

  //   setSelectedImages(prev =>
  //     prev.map(p =>
  //       p.key === key
  //         ? { ...p, bgColor: FOCUS_BG, fontColor: FOCUS_FG }
  //         : { ...p, bgColor: NORMAL_BG, fontColor: NORMAL_FG }
  //     )
  //   );
  // }
  function handleHover(e: any) {
    const pt = e.points[0];
    console.log('Hover data:', pt);
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

  return (
    <div className="relative p-6">
      <h1 className="text-xl font-bold mb-4">ZTF J1539 PSF Light Curves</h1>
      {loading && <p>Loading plot…</p>}
      {figure && (
        <Plot
          data={figure.data as Plotly.Data[]}
          layout={{ ...figure.layout, annotations: useRawMode ? avgAnnotations : annotations }}
          config={{ responsive: true, displaylogo: false }}
          onClick={handlePointClick}
          onHover={handleHover}
          onUnhover={handleUnhover}
          style={{ width: '100%', height: '100%' }}
        />
      )}
      {selectedImages.length > 0 && (
        <div className="border rounded-lg shadow-md mt-6 bg-white">
          {/* Header: Delete All button */}
          <div className="flex justify-end items-center px-4 py-2 border-b bg-gray-50 rounded-t-md bg-white">
            <button
              onClick={() => {
                clearAll();
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-semibold shadow"
            >
              Delete All
            </button>
          </div>


          {/* Image grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-4  p-4">
            {/* <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-4"> */}
            {selectedImages.map((img, index) => (
              <div
                key={img.key}
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

                  const seen = new Set<string>();

                  const matches = figure.data.flatMap(trace => {
                    if (!Array.isArray(trace.customdata)) return [];

                    return trace.customdata.map((trCd: any, i: number) => {
                      if (trCd?.phase === img.cd?.phase) {
                        const key = `${trCd.epoch}_${trCd.r_in}_${trCd.r_out}`;
                        if (seen.has(key)) return null;
                        seen.add(key);

                        return {
                          epoch: trCd.epoch,
                          r_in: trCd.r_in,
                          r_out: trCd.r_out,
                          y: trace.y?.[i],
                        };
                      }
                      return null;
                    }).filter(Boolean);
                  });

                  setModalInfo({
                    imgSrc: img.imgSrc,
                    details: {
                      label: img.label,
                      phase: img.cd?.phase,
                      mjd: img.cd?.mjd,
                      filename: img.cd?.filename,
                      rows: matches as { epoch: string; r_in: string; r_out: string; y: number; }[]
                    }
                  });
                  // setModalInfo({
                  //   imgSrc: img.imgSrc,
                  //   details: [
                  //     `Label: ${img.label}`,
                  //     `phase: ${img.cd?.phase}`,
                  //     `type: ${img.cd?.type}`,
                  //     `mjd: ${img.cd?.mjd}`,
                  //     `r_in: ${img.cd?.r_in}`,
                  //     `r_out: ${img.cd?.r_out}`,
                  //   ],
                  // });
                }}
              >
                <span
                  className="absolute top-0 left-0 text-base font-bold px-3 py-1.5 rounded-br"
                  style={{ backgroundColor: img.bgColor, color: img.fontColor }}
                >
                  {img.label}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImages(prev => prev.filter(p => p.key !== img.key));
                    setAnnotations(prev => prev.filter(a => (a as any).custom_id !== img.key));
                  }}
                  className="absolute top-0 right-0 bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-bl text-lg"
                >
                  <Trash2 size={20} />
                </button>
                <img src={img.imgThumbnailsSrc} alt={img.label} className="w-full h-auto object-contain" />
              </div>
            ))}
          </div>
        </div>
      )}


      <ImageModal
        isOpen={!!modalInfo}
        onClose={() => setModalInfo(null)}
        imgSrc={modalInfo?.imgSrc}
        details={modalInfo?.details}
      />
      {rawPlot && (
        <RawDataPlotPanel
          rawData={rawPlot}
          annotations={useRawMode ? annotations : []}
          onClose={() => {
            clearAll();
          }}
          color={rawColor}
          onPointClick={(figure, pt) => handleOriginalPointClick(figure, pt)}
        />
      )}
      {tooltipContent && tooltipPosition && (
        <div className="absolute z-50 pointer-events-none" style={{ left: tooltipPosition.left + 10, top: tooltipPosition.top + 10 }}>
          {tooltipContent}
        </div>
      )}
    </div>
  );
}

