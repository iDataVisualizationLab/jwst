// components/layoutUtils.ts
import type { PlotLayout } from './plotUtils';

export function makeLayout(
  xAxis: string,
  labelFontSize: number,
  legendFontSize: number,
  tooltipFontSize: number
): PlotLayout {
  return {
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
    hovermode: 'x',
    font: { size: labelFontSize }
  };
}
