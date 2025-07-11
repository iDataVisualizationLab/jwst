import { PlotTrace } from '@/types/PlotTypes';

export function buildTraces({
  x, y, err, customdata, hoverinfo, hovertemplate,
  plotType, errorBars, name, wave, color, pointSize, lineWidth
}: {
  x: number[];
  y: number[];
  err: number[];
  customdata: unknown[];
  hoverinfo?: PlotTrace['hoverinfo'];
  hovertemplate?: string;
  plotType: 'lines' | 'markers' | 'lines+markers';
  errorBars: 'bar' | 'hide' | 'separate';
  name: string;
  wave?: 'SW' | 'LW';
  color: string;
  pointSize: number;
  lineWidth: number;
}): PlotTrace[] {
  const common: Partial<PlotTrace> = {
    x, y,
    type: 'scattergl',
    mode: plotType,
    opacity: 0.8,
    name: `${name} (${y.length})`,
    legendgroup: wave ? wave.toLowerCase() : undefined,
    legendgrouptitle: wave ? { text: `${wave} Group` } : undefined,
    marker: { color, size: pointSize },
    line: { color, width: lineWidth },
    customdata,
    hoverinfo: hoverinfo ?? 'skip',
  hovertemplate: hovertemplate ?? undefined,
  };

  if (errorBars === 'bar') {
    return [{ ...common, error_y: { type: 'data', array: err } } as PlotTrace];
  } else if (errorBars === 'separate') {
    return [
      { ...common } as PlotTrace,
      { ...common, x, y: y.map((v, i) => v + err[i]), name: `${name} Error (+)` } as PlotTrace,
      { ...common, x, y: y.map((v, i) => v - err[i]), name: `${name} Error (-)` } as PlotTrace,
    ];
  }

  return [{ ...common } as PlotTrace];
}