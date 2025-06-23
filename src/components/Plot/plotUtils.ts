// components/plotUtils.ts
export const colorList = [
  "rgb(0, 0, 216)",
  "rgb(253, 192, 69)",
  "rgb(92, 53, 248)",
  "rgb(220, 145, 18)",
  "rgb(153, 97, 255)",
  "rgb(178, 102, 1)",
  "rgb(206, 139, 255)",
  "rgb(134, 64, 0)",
  "rgb(231, 191, 251)",
  "rgb(92, 27, 0)"
];

export const xKeyMap: Record<string, string> = {
  phase: 'phase_values_phase',
  mjd: 'time_mjd',
  time: 'time_mjd',
  second: 'time_second',
  minute: 'time_minute',
  hour: 'time_hour',
  day: 'time_day'
};

export interface PlotTrace {
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
  customdata?: unknown[];
  hoverinfo?: string;
  hovertemplate?: string;
  error_y?: { type: 'data'; array: number[] };
}

export interface PlotLayout {
  height: number;
  grid: { rows: number; columns: number; pattern: 'independent' };
  margin: { l: number; r: number; t: number; b: number };
  [key: string]: unknown;
}

export function buildTraces({
  x, y, err, customdata, hoverinfo, hovertemplate, plotType, errorBars, name, wave, color, pointSize, lineWidth
}: {
  x: number[];
  y: number[];
  err: number[];
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
      { ...common, y: y.map((v, i) => v + err[i]), name: `${name} Error (+) (${y.length})` } as PlotTrace,
      { ...common, y: y.map((v, i) => v - err[i]), name: `${name} Error (-) (${y.length})` } as PlotTrace
    ];
  }

  return [{ ...common } as PlotTrace];
}
