'use client';
import { useState } from 'react';
import Select from 'react-select';
// import { ChevronDown, ChevronUp } from 'lucide-react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid'

export default function Controller() {
    const [showControls, setShowControls] = useState(true);
    const [dataType, setDataType] = useState('average');
    const [dataSelection, setDataSelection] = useState<string[]>([]);
    const [noOfBins, setNoOfBins] = useState(100);
    const [noOfDataPoint, setNoOfDataPoint] = useState(100);
    const [xAxis, setXAxis] = useState('phase');
    const [errorBars, setErrorBars] = useState('hide');

    const dataTypeOptions = [
        { value: 'average', label: 'Average' },
        { value: 'average-img', label: 'Average Image' },
        { value: 'raw', label: 'Raw' },
    ];

    const xAxisOptions = [
        { value: 'phase', label: 'Phase' },
        { value: 'mjd', label: 'MJD' },
        { value: 'time', label: 'Time' },
    ];

    const errorBarsOptions = [
        { value: 'hide', label: 'Hide' },
        { value: 'show', label: 'Show' },
    ];

    const dataList = [
        { value: 'trace1', label: 'Trace 1' },
        { value: 'trace2', label: 'Trace 2' },
    ];

    return (
        <div className="w-full px-4 pt-4">
            <div className="bg-white border rounded-2xl shadow-md overflow-hidden">
                {/* Toggle Header */}
                <div
                    className="flex items-center justify-between p-4 cursor-pointer bg-gray-100"
                    onClick={() => setShowControls(!showControls)}
                >
                    <h2 className="font-semibold text-lg text-gray-800">Controls</h2>
                    {showControls ? (
                        <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                    ) : (
                        <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                    )}
                </div>

                {/* Control Panel */}
                {showControls && (
                    <div className="p-4 space-y-6 text-sm text-gray-800">
                        {/* Row 1: Data Type + Data to Plot */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="font-semibold block mb-1">Data Type</label>
                                <Select
                                    options={dataTypeOptions}
                                    value={dataTypeOptions.find((o) => o.value === dataType)}
                                    onChange={(val) => setDataType(val?.value || '')}
                                />
                            </div>
                            <div>
                                <label className="font-semibold block mb-1">Data to Plot</label>
                                <Select
                                    options={dataList}
                                    value={dataList.filter((o) => dataSelection.includes(o.value))}
                                    isMulti
                                    onChange={(vals) => setDataSelection(vals.map((v) => v.value))}
                                />
                                <div className="text-red-500 mt-1 text-xs">{/* dropdown-message */}</div>
                            </div>
                        </div>

                        {/* Row 2: All other controls horizontally */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

                            {/* Number of Bins / Rebinning Factor */}
                            {xAxis === 'phase' ? (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Number of Bins: {noOfBins}</label>
                                    <input
                                        type="range"
                                        min={5}
                                        max={1000}
                                        value={noOfBins}
                                        onChange={(e) => setNoOfBins(Number(e.target.value))}
                                        className="w-full"
                                    />
                                    <input
                                        type="number"
                                        min={5}
                                        max={1000}
                                        value={noOfBins}
                                        onChange={(e) => setNoOfBins(Number(e.target.value))}
                                        className="w-full mt-1 px-2 py-1 border border-gray-300 rounded"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Rebinning Factor: {noOfDataPoint}</label>
                                    <input
                                        type="range"
                                        min={1}
                                        max={1000}
                                        value={noOfDataPoint}
                                        onChange={(e) => setNoOfDataPoint(Number(e.target.value))}
                                        className="w-full"
                                    />
                                    <input
                                        type="number"
                                        min={1}
                                        max={1000}
                                        value={noOfDataPoint}
                                        onChange={(e) => setNoOfDataPoint(Number(e.target.value))}
                                        className="w-full mt-1 px-2 py-1 border border-gray-300 rounded"
                                    />
                                </div>
                            )}

                            {/* X-axis */}
                            <div>
                                <label className="font-semibold block mb-1">X-axis</label>
                                <Select
                                    options={xAxisOptions}
                                    value={xAxisOptions.find((o) => o.value === xAxis)}
                                    onChange={(val) => setXAxis(val?.value || '')}
                                />
                            </div>

                            {/* Error Bars */}
                            <div>
                                <label className="font-semibold block mb-1">Error Bars</label>
                                <Select
                                    options={errorBarsOptions}
                                    value={errorBarsOptions.find((o) => o.value === errorBars)}
                                    onChange={(val) => setErrorBars(val?.value || '')}
                                />
                            </div>

                            {/* Download */}
                            <div className="flex items-end">
                                <button
                                    className="w-full mt-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition"
                                    onClick={() => alert('Download logic goes here')}
                                >
                                    Download Data
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>

    );
}
