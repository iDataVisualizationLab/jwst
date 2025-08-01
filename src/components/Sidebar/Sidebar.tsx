'use client';

import { useState, useEffect } from 'react';
import Select from 'react-select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePlotSettings } from '@/context/PlotSettingsContext';
import { usePathname } from 'next/navigation';
const visibilityByPath: Record<string, Partial<Record<string, boolean>>> = {
  '/': {
    dataType: true,
    dataSelection: true,
    averageConfig: true,
    xAxis: true,
    errorBars: true,
  },
  '/matrix/': {
    dataType: true,
    dataSelection: true,
    averageConfig: true,
    matrixSection: true,
  },
  '/matrix_plotly/': {
    dataType: true,
    dataSelection: true,
    averageConfig: true,
    matrixSection: true,
  },
  '/lite': {
    dataType: true,
    xAxis: true,
  },
};

export default function Sidebar() {
  const {
    dataType, dataSelection, xAxis, errorBars, noOfBins, noOfDataPoint, colorBy, focusRangeMax, setSettings,
  } = usePlotSettings();

  const [collapsed, setCollapsed] = useState(false);
  const [dataList, setDataList] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const pathname = usePathname();
  const visibility = visibilityByPath[pathname] || {};

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

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3 border-t border-gray-300 pt-4 first:border-0 first:pt-0">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-300 pb-2">
        {title}
      </h3>
      {children}
    </div>
  );

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
          <Section title="General Settings">
            {/* Data Type */}
            {/* <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-300 pb-2 mb-2">
            General Settings
          </h3> */}
            {/* Data Type */}
            {visibility.dataType && (
              <div className="space-y-1 mb-4">
                <label className="font-semibold block mb-1">Data Type</label>
                <Select
                  options={dataTypeOptions}
                  value={dataTypeOptions.find((o) => o.value === dataType)}
                  onChange={(val) => setSettings({ dataType: val?.value || '' })}
                />
              </div>)
            }
            {/* Data Selection */}
            {visibility.dataSelection && (
              <div className="space-y-1 mb-4">
                <label className="font-semibold block mb-1">Data to Plot</label>
                <Select
                  isLoading={loading}
                  options={dataList}
                  value={dataList.filter((o) => dataSelection.includes(o.value))}
                  isMulti
                  onChange={(vals) => setSettings({ dataSelection: vals.map((v) => v.value) })}
                />
              </div>
            )}

            {/* X-axis */}
            {visibility.xAxis && (
              <div className="space-y-1 mb-4">
                <label className="font-semibold block mb-1">X-axis</label>
                <Select
                  options={xAxisOptions}
                  value={xAxisOptions.find((o) => o.value === xAxis)}
                  onChange={(val) => setSettings({ xAxis: val?.value || '' })}
                />
              </div>
            )}

            {/* Error Bars */}
            {visibility.errorBars && (
              <div className="space-y-1 mb-4">
                <label className="font-semibold block mb-1">Error Bars</label>
                <Select
                  options={errorBarsOptions}
                  value={errorBarsOptions.find((o) => o.value === errorBars)}
                  onChange={(val) => setSettings({ errorBars: val?.value || '' })}
                />
              </div>
            )}
          </Section>

          {/* Average Configuration */}

          {visibility.averageConfig && dataType !== 'raw' && (
            <Section title="Average Configuration">
              {xAxis === 'phase' && pathname !== '/matrix/' ? (
                <div className="space-y-2 mb-4">
                  <label className="font-medium text-sm text-gray-700">
                    Number of Bins: {noOfBins}
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={1000}
                    defaultValue={noOfBins}
                    className="w-full"
                    onMouseUp={(e) => setSettings({ noOfBins: Number(e.currentTarget.value) })}
                    onTouchEnd={(e) => setSettings({ noOfBins: Number(e.currentTarget.value) })}
                  />
                  <input
                    type="number"
                    min={5}
                    max={1000}
                    defaultValue={noOfBins}
                    onBlur={(e) => setSettings({ noOfBins: Number(e.target.value) })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  <label className="font-medium text-sm text-gray-700">
                    Rebinning Factor: {noOfDataPoint}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={1000}
                    defaultValue={noOfDataPoint}
                    className="w-full"
                    onMouseUp={(e) => setSettings({ noOfDataPoint: Number(e.currentTarget.value) })}
                    onTouchEnd={(e) => setSettings({ noOfDataPoint: Number(e.currentTarget.value) })}
                  />
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    defaultValue={noOfDataPoint}
                    onBlur={(e) => setSettings({ noOfDataPoint: Number(e.target.value) })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              )}
            </Section>
          )}

          {visibility.matrixSection && (

            <Section title="Matrix Settings">
              {/* <div className="mt-6 pt-4 border-t border-gray-300 space-y-4"> */}
              {/* <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Matrix Settings</h3> */}

              {/* Color By */}
              <div className="space-y-1">
                <label className="font-medium text-sm text-gray-700">Color By</label>
                <Select
                  options={[
                    { value: 'distance', label: 'Distance to Line x = y' },
                    { value: 'diff', label: 'Diff Percentage' },
                  ]}
                  value={
                    ['distance', 'diff'].includes(colorBy)
                      ? {
                        value: colorBy,
                        label: colorBy === 'distance' ? 'Distance to Line x = y' : 'Diff Percentage',
                      }
                      : null
                  }
                  onChange={(val) => setSettings({ colorBy: val?.value || '' })}
                />
              </div>

              {/* Focus Range */}
              {colorBy === 'diff' && (
                <div className="space-y-1 mb-4">
                  <label className="font-medium text-sm text-gray-700">Focus Range Max (0–100%)</label>

                  <input
                    type="range"
                    min={0.1}
                    max={100}
                    step={0.1}
                    defaultValue={focusRangeMax}
                    onMouseUp={(e) => setSettings({ focusRangeMax: Number(e.currentTarget.value), focusRangeMaxManuallySet: true })}
                    onTouchEnd={(e) => setSettings({ focusRangeMax: Number(e.currentTarget.value), focusRangeMaxManuallySet: true })}
                    className="w-full"
                  />

                  <input
                    type="number"
                    min={0.1}
                    max={100}
                    step={0.1}
                    defaultValue={focusRangeMax}
                    onBlur={(e) => setSettings({ focusRangeMax: Number(e.target.value), focusRangeMaxManuallySet: true })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />

                  <p className="text-xs text-gray-500">
                    Highlighting points from 0% to {focusRangeMax}%
                  </p>
                </div>
              )}

              {/* </div> */}

            </Section>
          )}

          {/* Download Button */}
          {visibility.download && (
            <div>
              <button
                disabled={true}
                className="w-full mt-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition disabled:opacity-50"
                onClick={() => alert('Download logic goes here')}
              >
                Download Data
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
