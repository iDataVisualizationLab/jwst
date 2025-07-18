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
import { PlotTrace, PlotDatumWithBBox, PlotLayout, AveragePointCustomData } from '@/types/PlotTypes';
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
  const [rawPlot, setRawPlot] = useState<{
    x: number; y: number; err?: number; customdata: unknown;
    phase?: number;
    mjd?: number;
    time?: number;
    second?: number;
    minute?: number;
    hour?: number;
    day?: number;
  }[] | null>(null);
  const [rawColor, setRawColor] = useState<string>('#1f77b4');
  const [rawAverageValue, setRawAverageValue] = useState<number | undefined>(undefined);
  const [rawAverageError, setRawAverageError] = useState<number | undefined>(undefined);
  const [posX, setPosX] = useState<number | undefined>(undefined);
  const [posY, setPosY] = useState<number | undefined>(undefined);
  const [fig, setFig] = useState<{ data: PlotTrace[] }>({ data: [] });

  function mjdToDate(mjd: number): Date {
    const MJD_EPOCH = Date.UTC(1858, 10, 17); // November 17, 1858
    const msPerDay = 86400 * 1000;
    return new Date(MJD_EPOCH + mjd * msPerDay);
  }

  // const [selectedImages, setSelectedImages] = useState<
  //   { id: string; imgSrc: string; label: string; cd: any }[]
  // >([]);
  // const imageCounter = useRef(1);
  type SelectedImg = {
    key: string;
    imgThumbnailsSrc: string;
    imgSrc: string;
    label: string;
    cd: Record<string, unknown>;
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
        const makePath = (wave: 'sw' | 'lw') => `${process.env.BASE_PATH}/data/json/ZTF_J1539/rawdata/${epoch}/${wave}/${r1}/${r2}.json`;

        try {
          const [swJson, lwJson] = await Promise.all([
            fetch(makePath('sw')).then(r => r.json()),
            fetch(makePath('lw')).then(r => r.json())
          ]);

          const timeKey = xKeyMap[xAxis];
          const addTrace = (
            wave: 'SW' | 'LW',
            json: Record<string, unknown>,
            target: PlotTrace[],
            color: string,
            epoch: string,
            r_in: string,
            r_out: string,
            avgPointRawMap: Record<string, { x: number; y: number; err: number; customdata: unknown }[]>
          ) => {
            let x: (number | string | Date)[] = [], y: number[] = [], err: number[] = [], customdata: unknown[] = [];
            const type = wave.toLowerCase()
            if (dataType === 'average') {
              if (xAxis === 'phase') {
                const flux: number[] = Array.isArray(json.psf_flux_phase) ? json.psf_flux_phase : [];
                const fluxErr: number[] = Array.isArray(json.psf_flux_unc_phase) ? json.psf_flux_unc_phase : [];
                const phaseValuesRaw: number[] = Array.isArray(json.phase_values_phase) ? json.phase_values_phase : [];
                const phaseValues: number[] = Array.isArray(phaseValuesRaw) ? phaseValuesRaw : [];
                const original_customdata: unknown[] = Array.isArray(json.customdata_phase) ? json.customdata_phase : [];
                const binEdges = Array.from({ length: noOfBins + 1 }, (_, i) => i / noOfBins);
                const binCenters = Array.from({ length: noOfBins }, (_, i) => (binEdges[i] + binEdges[i + 1]) / 2);
                const bins: number[][] = Array.from({ length: noOfBins }, () => [] as number[]);
                const binErrs: number[][] = Array.from({ length: noOfBins }, () => [] as number[]);
                const binPhases: number[][] = Array.from({ length: noOfBins }, () => [] as number[]);
                const binCustomdata: unknown[][] = Array.from({ length: noOfBins }, () => [] as unknown[]);


                // Optional: include time context for richer rawPoints
                const mjd = Array.isArray(json.time_mjd) ? json.time_mjd : [];
                const time = Array.isArray(json.time_mjd) ? json.time_mjd : [];
                const second = Array.isArray(json.time_second) ? json.time_second : [];
                const minute = Array.isArray(json.time_minute) ? json.time_minute : [];
                const hour = Array.isArray(json.time_hour) ? json.time_hour : [];
                const day = Array.isArray(json.time_day) ? json.time_day : [];
                // Optional: time-context bins
                const binMjd = Array.from({ length: noOfBins }, () => [] as number[]);
                const binSecond = Array.from({ length: noOfBins }, () => [] as number[]);
                const binMinute = Array.from({ length: noOfBins }, () => [] as number[]);
                const binHour = Array.from({ length: noOfBins }, () => [] as number[]);
                const binDay = Array.from({ length: noOfBins }, () => [] as number[]);
                const binTime = Array.from({ length: noOfBins }, () => [] as number[]);

                const binIndices = digitize(phaseValues, binEdges, false).map(i => i - 1);
                binIndices.forEach((binIndex, idx) => {
                  if (binIndex >= 0 && binIndex < noOfBins) {
                    bins[binIndex].push(flux[idx]);
                    binErrs[binIndex].push(fluxErr[idx]);
                    binPhases[binIndex].push(phaseValues[idx]);
                    binCustomdata[binIndex].push(original_customdata[idx]);
                    // Add time context to bins
                    binMjd[binIndex].push(mjd[idx]);
                    binTime[binIndex].push(time[idx]);
                    binSecond[binIndex].push(second[idx]);
                    binMinute[binIndex].push(minute[idx]);
                    binHour[binIndex].push(hour[idx]);
                    binDay[binIndex].push(day[idx]);
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
                      avgErr
                    });
                    const rawPoints = bins[i].map((yVal, j) => ({
                      x: binPhases[i][j],
                      y: yVal,
                      err: binErrs[i][j],
                      customdata: binCustomdata[i][j],
                      phase: binPhases[i][j],
                      mjd: binMjd[i][j],
                      time: binTime[i][j],
                      second: binSecond[i][j],
                      minute: binMinute[i][j],
                      hour: binHour[i][j],
                      day: binDay[i][j],
                    }));

                    const key = `${type}_${epoch}_${r_in}_${r_out}_${center.toFixed(5)}`;
                    avgPointRawMap[key] = rawPoints;
                  }
                }

                x = x.concat(x.map(v => typeof v === 'number' ? v + 1 : v));
                y = y.concat(y);
                err = err.concat(err);
                customdata = customdata.concat(customdata);

              } else {
                const flux = Array.isArray(json.psf_flux_time) ? json.psf_flux_time : [];
                const fluxErr = Array.isArray(json.psf_flux_unc_time) ? json.psf_flux_unc_time : [];
                const timeArr = Array.isArray(json[timeKey]) ? json[timeKey] : [];

                const phase = Array.isArray(json['phase_values_phase']) ? json['phase_values_phase'] : [];
                const mjd = Array.isArray(json['time_mjd']) ? json['time_mjd'] : [];
                const time = Array.isArray(json['time_mjd']) ? json['time_mjd'] : [];
                const second = Array.isArray(json['time_second']) ? json['time_second'] : [];
                const minute = Array.isArray(json['time_minute']) ? json['time_minute'] : [];
                const hour = Array.isArray(json['time_hour']) ? json['time_hour'] : [];
                const day = Array.isArray(json['time_day']) ? json['time_day'] : [];


                const original_customdata = Array.isArray(json.customdata_time) ? json.customdata_time : [];

                const chunkSize = noOfDataPoint;
                const chunks = Math.floor(flux.length / chunkSize);

                for (let i = 0; i < chunks; i++) {
                  const remStart = i * chunkSize;
                  const remEnd = (i + 1) * chunkSize;
                  const fc = flux.slice(remStart, remEnd);
                  const ec = fluxErr.slice(remStart, remEnd);
                  const tc = timeArr.slice(remStart, remEnd);
                  const cc = original_customdata.slice(remStart, remEnd);
                  const [avg, avgErr] = weightedAvg(fc, ec);

                  const mjdRem = mjd.slice(remStart, remEnd);
                  const timeRem = time.slice(remStart, remEnd);
                  const secondRem = second.slice(remStart, remEnd);
                  const minuteRem = minute.slice(remStart, remEnd);
                  const hourRem = hour.slice(remStart, remEnd);
                  const dayRem = day.slice(remStart, remEnd);
                  const phaseRem = phase.slice(remStart, remEnd);

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
                    avgErr
                  });
                  // let rawPoints = fc.map((yVal, j) => ({
                  const rawPoints = fc.map((yVal, j) => ({
                    x: tc[j],
                    y: yVal,
                    err: ec[j],
                    customdata: cc[j],
                    phase: phaseRem[j],
                    mjd: mjdRem[j],
                    second: secondRem[j],
                    minute: minuteRem[j],
                    hour: hourRem[j],
                    day: dayRem[j],
                    time: timeRem[j],
                  }));

                  const key = `${type}_${epoch}_${r_in}_${r_out}_${center.toFixed(5)}`;
                  // rawPoints = rawPoints.map(p => ({
                  //   ...p,
                  //   time: mjdToDate(Number(p.time))
                  // }));
                  avgPointRawMap[key] = rawPoints;
                }

                const remStart = chunks * chunkSize;
                if (remStart < flux.length) {
                  const fc = flux.slice(remStart), ec = fluxErr.slice(remStart), tc = timeArr.slice(remStart), cc = original_customdata.slice(remStart);
                  const [avg, avgErr] = weightedAvg(fc, ec);

                  const mjdRem = mjd.slice(remStart);
                  const timeRem = time.slice(remStart);
                  const secondRem = second.slice(remStart);
                  const minuteRem = minute.slice(remStart);
                  const hourRem = hour.slice(remStart);
                  const dayRem = day.slice(remStart);
                  const phaseRem = phase.slice(remStart);

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
                    avgErr
                  });
                  // let rawPoints = fc.map((yVal, j) => ({
                  const rawPoints = fc.map((yVal, j) => ({
                    x: tc[j],
                    y: yVal,
                    err: ec[j],
                    customdata: cc[j],
                    phase: phaseRem[j],
                    mjd: mjdRem[j],
                    second: secondRem[j],
                    minute: minuteRem[j],
                    hour: hourRem[j],
                    day: dayRem[j],
                    time: timeRem[j],
                  }));

                  const key = `${type}_${epoch}_${r_in}_${r_out}_${center.toFixed(5)}`;

                  // rawPoints = rawPoints.map(p => ({
                  //   ...p,
                  //   time: mjdToDate(Number(p.time))
                  // }));
                  avgPointRawMap[key] = rawPoints;
                }
              }
            } else {
              const rawX = json[xAxis === 'phase' ? 'phase_values_phase' : timeKey];
              x = Array.isArray(rawX) ? rawX as number[] : [];
              y = xAxis === 'phase' ? (Array.isArray(json.psf_flux_phase) ? json.psf_flux_phase : []) : (Array.isArray(json.psf_flux_time) ? json.psf_flux_time : []);
              err = xAxis === 'phase' ? (Array.isArray(json.psf_flux_unc_phase) ? json.psf_flux_unc_phase : []) : (Array.isArray(json.psf_flux_unc_time) ? json.psf_flux_unc_time : []);
              customdata = xAxis === 'phase' ? (Array.isArray(json.customdata_phase) ? json.customdata_phase : []) : (Array.isArray(json.customdata_time) ? json.customdata_time : []);
              if (xAxis === 'phase') {
                x = x.concat(x.map(v => typeof v === 'number' ? v + 1 : v));
                y = y.concat(y);
                err = err.concat(err);
                customdata = customdata.concat(customdata);
              }
            }
            if (xAxis === 'time') {
              x = x.map(v => mjdToDate(Number(v)));
            }
            // Ensure x is a homogeneous array (all numbers, all strings, or all Dates)
            let homogeneousX: number[] | string[] | Date[];
            if (x.every(v => typeof v === 'number')) {
              homogeneousX = x as number[];
            } else if (x.every(v => typeof v === 'string')) {
              homogeneousX = x as string[];
            } else if (x.every(v => v instanceof Date)) {
              homogeneousX = x as Date[];
            } else {
              // fallback: convert all to string
              homogeneousX = x.map(v => v instanceof Date ? v.toISOString() : String(v));
            }

            const traces = buildTraces({
              x: homogeneousX, y, err, customdata,
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
        height: 500,
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
        font: { size: labelFontSize },
        modebar: {
          orientation: 'v', // Vertical modebar
        },
      };

      const fullData = [
        ...rawTracesSW.map(tr => ({ ...tr, xaxis: 'x2', yaxis: 'y' })),
        ...rawTracesLW.map(tr => ({ ...tr, xaxis: 'x2', yaxis: 'y2' })),
      ];

      setSettings({ rawFigure: { tracesSW: rawTracesSW, tracesLW: rawTracesLW } });
      setSettings({ figure: { data: fullData, layout: layout } });
      setFig({ data: fullData });
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

  interface Match {
    x: number | string | Date;
    y: number;
    data: PlotTrace;
    cd: AveragePointCustomData;
  }

  function handleAveragePointClick(
    figure: { data: PlotTrace[] },
    pt: PlotDatumWithBBox
  ): void {
    const cd: AveragePointCustomData = (pt.customdata as unknown as AveragePointCustomData) ?? {};
    if (pt.bbox) {
      const container = document.querySelector('.js-plotly-plot') as HTMLElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      // const pointX = rect.left + (pt.bbox.x0 + pt.bbox.x1) / 2;
      // const pointY = rect.top + (pt.bbox.y0 + pt.bbox.y1) / 2;
      const pointX = (pt.bbox.x0 + pt.bbox.x1) / 2;
      const pointY = (pt.bbox.y0 + pt.bbox.y1) / 2;

      // const modalWidth = 500;
      const margin = 10;

      const newX = pointX + rect.left + margin < window.innerWidth
        ? pointX + margin
        : Math.max(margin, pointX - rect.left - margin); // clamp left

      // const modalHeight = 300;
      const newY = Math.min(pointY + rect.top + margin, window.innerHeight - rect.top - margin);


      setPosX(newX);
      setPosY(newY);
    }


    console.log('Average point click:', pt, cd);
    setRawColor(String(pt.fullData?.marker?.color ?? '#1f77b4'));
    const { type, epoch, r_in, r_out, phase, avgErr } = cd;
    if (!type || !epoch || !r_in || !r_out || !phase || !avgPointRawMap) return;
    const matches: Match[] = [];
    const averageY = typeof pt.y === 'number' ? pt.y : undefined;
    const averageErr = avgErr ?? undefined;
    console.log('Average point click:', pt, cd, averageY, averageErr);
    figure.data.forEach((trace: PlotTrace) => {
      if ((trace as PlotTrace)?.legendgroup != type) return;
      if (!Array.isArray(trace.customdata)) return;

      trace.customdata.forEach((trCd, idx: number) => {
        const cd = trCd as AveragePointCustomData;
        if (cd?.phase === phase) {
          matches.push({
            x: (trace.x as number[])[idx],
            y: (trace.y as number[])[idx],
            data: trace,
            cd: cd,
          });
        }
      });
    });

    if (matches.length > 0) {
      const key = `${type}_${phase}`; // stable key
      const exist = selectedImages.some((p) => p.key === key);
      const label = exist
        ? selectedImages.find((p) => p.key === key)!.label
        : `Phase ${phase}`;
      const rawColor = pt.fullData?.marker?.color;
      const bgColor = typeof rawColor === 'string' ? rawColor : '#1f77b4';
      const fontColor = getContrastingFontColor(bgColor);
      setAvgAnnotations(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        matches.map((m) =>
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
    const key = `${type}_${epoch}_${r_in}_${r_out}_${Number(phase).toFixed(5)}`;
    const rawPoints = avgPointRawMap[key];

    if (rawPoints) {
      clearAll()
      setRawPlot(rawPoints);
      setFig({
        data: [
          {
            x: rawPoints.map(p => p.x),
            y: rawPoints.map(p => p.y),
            err: rawPoints.map(p => p.err),
            customdata: rawPoints.map(p => p.customdata),
            type: 'scatter',
            mode: 'markers',
            marker: { color: String(pt.fullData?.marker?.color ?? '#1f77b4'), size: pointSize },
            name: `Raw Points for ${type} at Phase ${phase}`,
          }
        ]
      });
      setRawAverageValue(averageY);
      setRawAverageError(averageErr);
      setUseRawMode(true);
    } else {
      console.warn(`[Average click] No raw points found for key: ${key}`);
    }
  }

  interface OriginalPointMatch {
    x: number | string | Date;
    y: number;
    data: PlotTrace;
    cd: AveragePointCustomData;
  }

  function handleOriginalPointClick(
    figure: { data: PlotTrace[] },
    pt: Plotly.PlotDatum
  ): void {
    if (!figure) return;
    const cd: AveragePointCustomData = (pt.customdata as unknown as AveragePointCustomData) ?? {};
    const { phase, type } = cd;
    if (!phase || !type) return;

    const matches: OriginalPointMatch[] = [];

    figure.data.forEach((trace: PlotTrace) => {
      // if ((trace as PlotTrace)?.legendgroup != type) return;
      if (!Array.isArray(trace.customdata)) return;

      trace.customdata.forEach((trCd, idx: number) => {
        const cd = trCd as AveragePointCustomData;
        if (cd?.phase === phase) {
          matches.push({
            x: (trace.x as number[])[idx],
            y: (trace.y as number[])[idx],
            data: trace,
            cd: cd,
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

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      setAnnotations(prev => [
        ...prev
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter(a => (a as any).custom_id !== key)
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

  const handlePointClick = useCallback((e: Plotly.PlotMouseEvent) => {
    const pt = e.points[0];
    if (!figure) return;

    if (dataType === 'average') {
      handleAveragePointClick(figure, pt);
    } else {
      handleOriginalPointClick(figure, pt);
    }
  }, [dataType, avgPointRawMap, figure, selectedImages]);


  function clearAll() {
    setRawPlot(null);
    setFig({ data: [] });
    setUseRawMode(false);
    setAnnotations([]);
    imageCounter.current = 1; // reset counter
    // Reset selected images
    setSelectedImages([]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      <h1 className="text-xl text-black font-bold mb-4">ZTF J1539 PSF Light Curves</h1>
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
            {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
            {selectedImages.map((img, index) => (
              <div
                key={img.key}
                className="relative group border rounded shadow cursor-pointer"
                onClick={() => {
                  // 1. Update annotations
                  setAnnotations(prev =>
                    prev.map(a => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

                  const matches = fig.data.flatMap(trace => {
                    if (!Array.isArray(trace.customdata)) return [];

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                          color: trace.marker?.color,
                        };
                      }
                      return null;
                    }).filter(Boolean);
                  });

                  setModalInfo({
                    imgSrc: img.imgSrc,
                    details: {
                      label: img.label,
                      phase: typeof img.cd?.phase === 'number' ? img.cd?.phase : (img.cd?.phase !== undefined ? Number(img.cd?.phase) : undefined),
                      mjd: typeof img.cd?.mjd === 'number' ? img.cd?.mjd : (img.cd?.mjd !== undefined ? Number(img.cd?.mjd) : undefined),
                      filename: img.cd?.filename as string | undefined,
                      rows: matches as { epoch: string; r_in: string; r_out: string; y: number; color: string | undefined }[]
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
                  className="absolute top-0 left-0 text-xs font-semibold px-2 py-1 rounded-br"
                  style={{ backgroundColor: img.bgColor, color: img.fontColor }}
                >
                  {img.label}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImages(prev => prev.filter(p => p.key !== img.key));
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setAnnotations(prev => prev.filter(a => (a as any).custom_id !== img.key));
                  }}
                  className="absolute top-0 right-0 bg-orange-500 hover:bg-orange-600 text-white p-1 rounded-bl"
                >
                  <Trash2 size={16} />
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
          rawData={rawPlot.map(p => ({
            ...p,
            customdata: p.customdata as import('@/types/PlotTypes').AveragePointCustomData | undefined,
            time:
              typeof p.time === 'number'
                ? mjdToDate(p.time)
                : p.time,
          }))}
          averageValue={rawAverageValue}
          averageError={rawAverageError}
          annotations={useRawMode ? annotations : []}
          posX={posX}
          posY={posY}
          onClose={() => {
            clearAll();
          }}
          color={rawColor}
          onPointClick={(figure, pt) => handleOriginalPointClick(figure as { data: PlotTrace[] }, pt)}
          onHover={(content, position) => {
            setTooltipContent(content);
            setTooltipPosition(position);
          }}
          onUnhover={() => {
            setTooltipContent(null);
            setTooltipPosition(null);
          }}
        />
      )}
      {tooltipContent && tooltipPosition && (
        <div className="absolute z-9999 pointer-events-none" style={{ left: tooltipPosition.left + 10, top: tooltipPosition.top + 10 }}>
          {tooltipContent}
        </div>
      )}
    </div>
  );
}

