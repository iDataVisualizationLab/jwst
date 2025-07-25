'use client';

import { useEffect, useState } from "react";
import MatrixPlot from "@/components/MatrixPlot";
import { usePlotSettings } from '@/context/PlotSettingsContext';
import { update_df } from '@/utils/matrixUtils';

const MatrixPage = () => {
    const {
        dataType,
        dataSelection,
        labelFontSize,
        plotType,
        noOfDataPoint
    } = usePlotSettings();

    const isValid = dataSelection.length >= 2;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [swMatrix, setSwMatrix] = useState<any[] | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [lwMatrix, setLwMatrix] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

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
            <h1 className="text-xl font-bold mb-4 text-black">Matrix Scatter Plots</h1>

            {!isValid ? (
                <p className="text-red-500">Please select at least 2 items to generate matrix plot.</p>
            ) : loading ? (
                <p>Loading matrix...</p>
            ) : error || !swMatrix || !lwMatrix ? (
                <p className="text-red-500">Failed to load matrix data.</p>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <MatrixPlot
                        matrixData={swMatrix}
                        labelFontSize={labelFontSize}
                        title="SW Scatter Matrix"
                    />
                    <MatrixPlot
                        matrixData={lwMatrix}
                        labelFontSize={labelFontSize}
                        title="LW Scatter Matrix"
                    />
                </div>
            )}
        </div>
    );
};

export default MatrixPage;
