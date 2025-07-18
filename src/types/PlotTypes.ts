export type PlotTrace = {
  x: number[] | string[] | Date[];
  y: number[];
  err?: number[];
  error_y?: { type: 'data'; array: number[] };
  type?: string;
  mode?: string;
  customdata?: unknown[];
  hoverinfo?: (
    | "y" | "x" | "text" | "z" | "name"
    | "none" | "all" | "skip"
    | "x+text" | "x+name" | "x+y"
    | "x+y+text" | "x+y+name" | "x+y+z"
    | "x+y+z+text" | "x+y+z+name"
    | "y+name" | "y+x" | "y+text"
    | "y+z" | "y+z+text" | "y+z+name"
    | "z+name" | "z+text"
  ) | undefined;
  hovertemplate?: string;
  visible?: boolean | 'legendonly';
  plotType?: 'lines' | 'markers' | 'lines+markers';
  errorBars?: 'bar' | 'hide' | 'separate';
  name?: string;
  wave?: string;
  color?: string;
  pointSize?: number;
  lineWidth?: number;
  marker?: Record<string, unknown>;
  line?: Record<string, unknown>;
  xaxis?: string;
  yaxis?: string;
  opacity?: number;
  legendgroup?: string;
  legendgrouptitle?: { text: string };
  text?: string;
  textposition?: string;
};

export interface PlotLayout {
  height: number;
  grid: { rows: number; columns: number; pattern: 'independent' };
  margin: { l: number; r: number; t: number; b: number };
  [key: string]: unknown;
}

export type PlotPoints = {
  x: number | string | Date;
  y: number;
  data: PlotTrace;
  cd: unknown;
}[];


export  interface AveragePointCustomData {
    type?: string;
    epoch?: string;
    r_in?: string;
    r_out?: string;
    phase?: string | number;
    avgErr?: number;
    [key: string]: unknown;
  }
