'use client';

import { useEffect, useState } from "react";
import MatrixPlot from "@/components/MatrixPlot";
import { usePlotSettings } from '@/context/PlotSettingsContext';
import { update_df, getEpoch } from '@/utils/matrixUtils';

const MatrixPage = () => {
    const {
        dataType,
        dataSelection,
        labelFontSize,
        plotType,
        noOfDataPoint,
        setSettings
    } = usePlotSettings();
    const epochs = [...new Set(dataSelection.map(sel => getEpoch(sel)))];
    const isValid = dataSelection.length >= 2 && epochs.length === 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [swMatrix, setSwMatrix] = useState<any[] | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [lwMatrix, setLwMatrix] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
const baseHeight = 600;
const extraPerDimension = 120; // adjust as needed

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const calcPlotHeight = (matrixData: any[]) => {
  const dimCount = matrixData.length > 0 ? Object.keys(matrixData[0]).length : 2;
  return dataSelection.length > 5
    ? baseHeight + (dimCount - 2) * extraPerDimension
    : baseHeight;
};
    useEffect(() => {
        if (!isValid) return;
        setLoading(true);
        Promise.all([
            update_df('SW', dataType as 'average' | 'raw', dataSelection, noOfDataPoint),
            update_df('LW', dataType as 'average' | 'raw', dataSelection, noOfDataPoint)
        ])
            .then(([swData, lwData]) => {
                setSwMatrix(swData);
                setLwMatrix(lwData);
                setSettings({ focusRangeMax: 100, focusRangeMaxManuallySet: false });
                setError(false);
            })
            .catch((err) => {
                console.error("Matrix loading error", err);
                setError(true);
            })
            .finally(() => setLoading(false));
    }, [dataSelection, dataType, plotType, noOfDataPoint, noOfDataPoint]);

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-4 text-black">Scatter Matrix of Different Frames</h1>

            {!isValid ? (
                <p className="text-red-500">Please select at least two items from the same epoch to generate a matrix plot.</p>
            ) : loading ? (
                <p>Loading matrix...</p>
            ) : error || !swMatrix || !lwMatrix ? (
                <p className="text-red-500">Failed to load matrix data.</p>
            ) : (
                <div className={`grid gap-6 ${dataSelection.length > 5 ? 'grid-rows-2 grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                    <MatrixPlot
                    // <D3MatrixPlot
                        matrixData={swMatrix}
                        labelFontSize={labelFontSize}
                        title="SW Scatter Matrix"
                        subtitle={`Source Brightness measured with BG annulus at each frame (e.g., SW.<i>r<sub>in</sub></i>.<i>r<sub>out</sub></i> → SW.10.30)`}
                        // subtitle="sw"
                        height={calcPlotHeight(swMatrix)}
                    />

                    <MatrixPlot
                    // <D3MatrixPlot
                        matrixData={lwMatrix}
                        labelFontSize={labelFontSize}
                        title="LW Scatter Matrix"
                        subtitle={`Source Brightness measured with BG annulus at each frame (e.g., LW.<i>r<sub>in</sub></i>.<i>r<sub>out</sub></i> → LW.10.30)`}
                        // subtitle="lw"
                        height={calcPlotHeight(lwMatrix)}
                    />
                </div>
            )}
        </div>
    );
};

export default MatrixPage;
