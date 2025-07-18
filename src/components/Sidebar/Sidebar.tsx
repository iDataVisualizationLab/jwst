'use client';

import { useState, useEffect } from 'react';
import Select from 'react-select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePlotSettings } from '@/context/PlotSettingsContext';

export default function Sidebar() {
  const {
    dataType, dataSelection, xAxis, errorBars, noOfBins, noOfDataPoint, setSettings,
  } = usePlotSettings();

  const [collapsed, setCollapsed] = useState(false);
  const [dataList, setDataList] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDataList() {
      try {
        const res = await fetch(`${process.env.BASE_PATH}/data/json/ZTF_J1539/dataList.json`);
        const docs = await res.json();
        setDataList(docs.map((d: string) => ({ label: d, value: d })));
      } catch (err) {
        console.error('Failed to load dataList.json', err);
      } finally {
        setLoading(false);
      }
    }
    loadDataList();
  }, []);

  const dataTypeOptions = [
    { value: 'average', label: 'Average' },
    { value: 'raw', label: 'Raw' },
  ];

  const xAxisOptions = [
    { value: 'phase', label: 'Phase' },
    { value: 'mjd', label: 'MJD' },
    { value: 'time', label: 'Datetime' },
    { value: 'day', label: 'Days' },
    { value: 'hour', label: 'Hours' },
    { value: 'minute', label: 'Minutes' },
    { value: 'second', label: 'Seconds' },
  ];

  const errorBarsOptions = [
    { value: 'bar', label: 'Show as Error Bar' },
    { value: 'separate', label: 'Show as Separate Data' },
    { value: 'hide', label: 'Hide' },
  ];

  return (
    <div
      className={`relative transition-all duration-300 bg-gray-100 border-r overflow-y-auto overflow-x-hidden 
        ${collapsed ? 'w-16' : 'w-64'} h-[calc(100vh-52px)]`}
    >

      <div className="p-4 space-y-6 text-m text-gray-800">
        {/* Collapse Button */}
        {/* {!collapsed && <span className="text-xs mr-1 text-gray-500">Collapse</span>} */}
        <button
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-4 right-4 bg-white border rounded-full p-1 shadow z-10"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      {!collapsed && (
        <div className="p-4 space-y-6 text-sm text-gray-800">
          {/* Data Type */}
          <div>
            <label className="font-semibold block mb-1">Data Type</label>
            <Select
              options={dataTypeOptions}
              value={dataTypeOptions.find((o) => o.value === dataType)}
              onChange={(val) => setSettings({ dataType: val?.value || '' })}
            />
          </div>

          {/* Data Selection */}
          <div>
            <label className="font-semibold block mb-1">Data to Plot</label>
            <Select
              isLoading={loading}
              options={dataList}
              value={dataList.filter((o) => dataSelection.includes(o.value))}
              isMulti
              onChange={(vals) => setSettings({ dataSelection: vals.map((v) => v.value) })}
            />
          </div>

          {/* Average Configuration */}
          {dataType !== 'raw' && (
            <div>
              <p className="font-semibold mb-2">Average Configuration</p>
              {xAxis === 'phase' ? (
                <div className="mb-3">
                  <label className="block mb-1">Number of Bins: {noOfBins}</label>
                  <input
                    type="range"
                    min={5}
                    max={1000}
                    value={noOfBins}
                    onChange={(e) => setSettings({ noOfBins: Number(e.target.value) })}
                    className="w-full"
                  />
                  <input
                    type="number"
                    min={5}
                    max={1000}
                    value={noOfBins}
                    onChange={(e) => setSettings({ noOfBins: Number(e.target.value) })}
                    className="w-full mt-1 px-2 py-1 border border-gray-300 rounded"
                  />
                </div>
              ) : (
                <div className="mb-3">
                  <label className="block mb-1">Rebinning Factor: {noOfDataPoint}</label>
                  <input
                    type="range"
                    min={1}
                    max={1000}
                    value={noOfDataPoint}
                    onChange={(e) => setSettings({ noOfDataPoint: Number(e.target.value) })}
                    className="w-full"
                  />
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={noOfDataPoint}
                    onChange={(e) => setSettings({ noOfDataPoint: Number(e.target.value) })}
                    className="w-full mt-1 px-2 py-1 border border-gray-300 rounded"
                  />
                </div>
              )}
            </div>
          )}

          {/* X-axis */}
          <div>
            <label className="font-semibold block mb-1">X-axis</label>
            <Select
              options={xAxisOptions}
              value={xAxisOptions.find((o) => o.value === xAxis)}
              onChange={(val) => setSettings({ xAxis: val?.value || '' })}
            />
          </div>

          {/* Error Bars */}
          <div>
            <label className="font-semibold block mb-1">Error Bars</label>
            <Select
              options={errorBarsOptions}
              value={errorBarsOptions.find((o) => o.value === errorBars)}
              onChange={(val) => setSettings({ errorBars: val?.value || '' })}
            />
          </div>

          {/* Download Button */}
          <div>
            <button
              className="w-full mt-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition"
              onClick={() => alert('Download logic goes here')}
            >
              Download Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
