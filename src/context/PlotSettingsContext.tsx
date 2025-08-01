'use client';

import React, { createContext, useContext, useState } from 'react';
import { PlotTrace, PlotLayout } from '@/types/PlotTypes';

type PlotSettings = {
  dataType: string;
  dataSelection: string[];
  xAxis: string;
  errorBars: string;
  noOfBins: number;
  noOfDataPoint: number;

  plotType: string;
  pointSize: number;
  lineWidth: number;
  legendFontSize: number;
  labelFontSize: number;
  tooltipFontSize: number;
  thumbnailsSize: number;

  figure: { data: PlotTrace[]; layout: PlotLayout };
  rawFigure: { tracesSW: PlotTrace[]; tracesLW: PlotTrace[] };

  annotations: Partial<Plotly.Annotations>[];
  focusedAnnotationIndex: number;
  annotationIndex: number;

  avgPointRawMap: Record<string, { x: number; y: number; err: number; customdata: unknown; }[]>;



  colorBy: string;
  focusRangeMax: number;
  focusRangeMaxManuallySet: boolean;
  setSettings: (updates: Partial<PlotSettings>) => void;
};


const defaultValue: PlotSettings = {
  dataType: 'average',
  dataSelection: [],
  xAxis: 'phase',
  errorBars: 'hide',
  noOfBins: 100,
  noOfDataPoint: 100,

  plotType: 'markers',
  pointSize: 8,
  lineWidth: 2,
  legendFontSize: 12,
  labelFontSize: 14,
  tooltipFontSize: 16,
  thumbnailsSize: 200,

  figure: { data: [], layout: {} as PlotLayout },
  rawFigure: { tracesSW: [], tracesLW: [] },

  annotations: [],
  focusedAnnotationIndex: -1,
  annotationIndex: 0,

  avgPointRawMap: {},

  colorBy: 'diff',
  focusRangeMax: 100,
  focusRangeMaxManuallySet: false,

  setSettings: () => { },
};


const PlotSettingsContext = createContext<PlotSettings>(defaultValue);

export function usePlotSettings() {
  return useContext(PlotSettingsContext);
}

export function PlotSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<Omit<PlotSettings, 'setSettings'>>(defaultValue);

  const setSettings = (updates: Partial<PlotSettings>) => {
    setSettingsState(prev => ({ ...prev, ...updates }));
  };

  return (
    <PlotSettingsContext.Provider value={{ ...settings, setSettings }}>
      {children}
    </PlotSettingsContext.Provider>
  );
}
