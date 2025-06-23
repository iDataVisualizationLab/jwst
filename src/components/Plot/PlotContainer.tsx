'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePlotSettings } from '@/context/PlotSettingsContext';
import { buildTraces, colorList, xKeyMap, PlotTrace } from './plotUtils';
import { makeLayout } from './layoutUtils';
import { applyStyle } from './styleUtils';
import { digitize, weightedAvg } from '@/libs/mathUtils';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function PlotContainer() {
  const {
    dataType, dataSelection, xAxis, errorBars, noOfBins, noOfDataPoint,
    plotType, pointSize, lineWidth,
    legendFontSize, labelFontSize, tooltipFontSize
  } = usePlotSettings();

  const [figure, setFigure] = useState<{ data: PlotTrace[]; layout: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [rawFigure, setRawFigure] = useState<{ tracesSW: PlotTrace[]; tracesLW: PlotTrace[] } | null>(null);

  useEffect(() => {
    async function loadData() {
      if (dataSelection.length === 0) return;
      setLoading(true);

      const rawTracesSW: PlotTrace[] = [];
      const rawTracesLW: PlotTrace[] = [];

      const colorMap = new Map<string, string>();
      dataSelection.forEach((sel, idx) => {
        colorMap.set(sel, colorList[idx % colorList.length]);
      });

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
            let x: number[] = [];
            let y: number[] = [];
            let err: number[] = [];
            let customdata: unknown[] = [];

            if (dataType === 'average') {
              if (xAxis === 'phase') {
                const flux = json.psf_flux_phase as number[];
                const fluxErr = json.psf_flux_unc_phase as number[];
                const binEdges = Array.from({ length: noOfBins + 1 }, (_, i) => i / noOfBins);
                const binCenters = Array.from({ length: noOfBins }, (_, i) => (binEdges[i] + binEdges[i + 1]) / 2);
                const bins = Array.from({ length: noOfBins }, () => [] as number[]);
                const binErrs = Array.from({ length: noOfBins }, () => [] as number[]);

                const phaseValues = json.phase_values_phase as number[];
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
                    y.push(avg);
                    x.push(binCenters[i]);
                    err.push(avgErr);
                  }
                }

                x = x.concat(x.map(v => v + 1));
                y = y.concat(y);
                err = err.concat(err);
              } else {
                const flux = json.psf_flux_time;
                const fluxErr = json.psf_flux_unc_time;
                const timeArr = json[timeKey];
                const chunks = Math.floor(flux.length / noOfDataPoint);

                for (let i = 0; i < chunks; i++) {
                  const fluxChunk = flux.slice(i * noOfDataPoint, (i + 1) * noOfDataPoint);
                  const errChunk = fluxErr.slice(i * noOfDataPoint, (i + 1) * noOfDataPoint);
                  const timeChunk = timeArr.slice(i * noOfDataPoint, (i + 1) * noOfDataPoint);
                  const [avg, avgErr] = weightedAvg(fluxChunk, errChunk);
                  y.push(avg);
                  x.push(timeChunk.reduce((a, b) => a + b) / timeChunk.length);
                  err.push(avgErr);
                }

                const remainingStart = chunks * noOfDataPoint;
                if (remainingStart < flux.length) {
                  const fluxChunk = flux.slice(remainingStart);
                  const errChunk = fluxErr.slice(remainingStart);
                  const timeChunk = timeArr.slice(remainingStart);
                  const [avg, avgErr] = weightedAvg(fluxChunk, errChunk);
                  y.push(avg);
                  x.push(timeChunk.reduce((a, b) => a + b) / timeChunk.length);
                  err.push(avgErr);
                }
              }

              customdata = (xAxis === 'phase') ? json.customdata_phase ?? [] : json.customdata_time ?? [];
            } else {
              x = json[timeKey] ?? [];
              y = json.psf_flux_time ?? [];
              err = json.psf_flux_unc_time ?? [];
              customdata = json.customdata_time ?? [];
            }

            const traces = buildTraces({ x, y, err, customdata, hoverinfo: 'x+y+name',
              hovertemplate: '<b>%{fullData.name}</b><br>t = %{x:.3f}<br>flux = %{y:.2e}<extra></extra>',
              plotType, errorBars, name: `${epoch}.${r1}.${r2}`, wave, color, pointSize, lineWidth });

            target.push(...traces);
          };

          addTrace('SW', swJson, rawTracesSW, colorMap.get(sel)!);
          addTrace('LW', lwJson, rawTracesLW, colorMap.get(sel)!);
        } catch (err) {
          console.error('Fetch failed for', sel, err);
        }
      }

      const layout = makeLayout(xAxis, labelFontSize, legendFontSize, tooltipFontSize);
      const fullData = [
        ...rawTracesSW.map(tr => ({ ...tr, xaxis: 'x', yaxis: 'y' })),
        ...rawTracesLW.map(tr => ({ ...tr, xaxis: 'x2', yaxis: 'y2' }))
      ];

      setRawFigure({ tracesSW: rawTracesSW, tracesLW: rawTracesLW });
      setFigure({ data: fullData, layout });
      setLoading(false);
    }

    loadData();
  }, [dataSelection, dataType, xAxis, errorBars, noOfBins, noOfDataPoint]);

  useEffect(() => {
    if (!rawFigure) return;

    const tracesSW = applyStyle(rawFigure.tracesSW, 'x', 'y', plotType, pointSize, lineWidth);
    const tracesLW = applyStyle(rawFigure.tracesLW, 'x2', 'y2', plotType, pointSize, lineWidth);
    const layout = makeLayout(xAxis, labelFontSize, legendFontSize, tooltipFontSize);
    setFigure({ data: [...tracesSW, ...tracesLW], layout });
  }, [plotType, pointSize, lineWidth, labelFontSize, legendFontSize, tooltipFontSize, xAxis, rawFigure]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">ZTF J1539 PSF Light Curves</h1>
      {loading && <p>Loading plot…</p>}
      {figure && (
        <Plot
          data={figure.data}
          layout={figure.layout}
          config={{ responsive: true, displaylogo: false }}
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </div>
  );
}
