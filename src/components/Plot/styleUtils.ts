// components/styleUtils.ts
import type { PlotTrace } from './plotUtils';

export function applyStyle(
  traces: PlotTrace[],
  xaxis: string,
  yaxis: string,
  plotType: string,
  pointSize: number,
  lineWidth: number
): PlotTrace[] {
  return traces.map(tr => ({
    ...tr,
    mode: plotType as 'lines' | 'markers' | 'lines+markers',
    marker: { color: tr.marker?.color ?? '#000', size: pointSize },
    line: { color: tr.line?.color ?? '#000', width: lineWidth },
    xaxis,
    yaxis
  }));
}
