export type PlotTrace = {
  x: number[];
  y: number[];
  err?: number[];
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
