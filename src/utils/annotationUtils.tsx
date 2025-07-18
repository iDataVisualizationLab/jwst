import React from 'react';

import { PlotTrace } from '@/types/PlotTypes';

interface AnnotationPoint {
  x: string | number | Date;
  y: number;
  data: PlotTrace;
}

export interface AnnotationDetails {
  type?: string;
  phase?: string | number;
  [key: string]: unknown;
  text?: string;
  font?: {
    color?: string;
    size?: number;
    family?: string;
  };
  bgcolor?: string;
}

export function createAnnotation(pt: AnnotationPoint, cd: AnnotationDetails) {
  const { x, y, data: trace } = pt;

  return {
    x,
    y,
    xref: trace.xaxis,
    yref: trace.yaxis,
    text: cd.text ?? `No. ${cd.phase}`,
    showarrow: true,
    arrowhead: 0,
    arrowsize: 1,
    arrowwidth: 1.5,
    arrowcolor: 'black',
    ax: 0,
    ay: -30,
    xanchor: 'center',
    yanchor: 'bottom',
    bordercolor: 'black',
    borderwidth: 1,
    borderpad: 3,
    align: 'center',
    bgcolor: cd.bgcolor ?? '#000000', 

    font: {
      color: cd.font?.color ?? '#FFFFFF',
    size: cd.font?.size ?? 13,
    family: cd.font?.family ?? 'Courier New, monospace',
    },
    custom_id: `${cd.type}_${cd.phase}`,
  };
}

export interface ModalDetails {
  traceName: string;
  r_in: number;
  r_out: number;
  yValue: number;
}

export function getModalDetails(items: ModalDetails[]): React.ReactNode[] {
  console.log(items)
  return items.map((item, idx) =>
    React.createElement(
      'div',
      { key: idx },
      React.createElement(
        React.Fragment,
        null,
        React.createElement('strong', null, item.traceName),
        ' — r',
        React.createElement('sub', null, 'in'),
        `: ${item.r_in}, r`,
        React.createElement('sub', null, 'out'),
        `: ${item.r_out}, y: ${item.yValue}`
      )
    )
  );
}

export interface ModalInfo {
  imgSrc?: string;
  summary?: string[];
  details?: {
    label: string;
    phase?: number;
    mjd?: number;
    filename?: string;
    rows?: Array<{
      epoch: string;
      r_in: string;
      r_out: string;
      y: number;
    }>;
  };
}