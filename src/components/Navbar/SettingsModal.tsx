'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'
import { usePlotSettings } from '@/context/PlotSettingsContext';

const plotTypeOptions = [
  { label: 'Marker', value: 'markers' },
  { label: 'Line', value: 'lines' },
  { label: 'Marker + Line', value: 'lines+markers' }
]

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    plotType,
    pointSize,
    lineWidth,
    legendFontSize,
    labelFontSize,
    tooltipFontSize,
    thumbnailsSize,
    setSettings
  } = usePlotSettings();

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-6">
          <Dialog.Panel className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-2xl">
            <Dialog.Title className="text-2xl font-bold text-gray-800 mb-6">Settings</Dialog.Title>

            {/* Plot Type */}
            <div className="mb-6">
              <label htmlFor="plotType" className="block text-sm font-medium text-gray-700 mb-1">
                Plot Type
              </label>
              <select
                id="plotType"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={plotType}
                onChange={(e) => setSettings({ plotType: e.target.value })}
              >
                {plotTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Slider
              id="pointSize"
              label="Point Size"
              min={1}
              max={20}
              step={1}
              defaultValue={pointSize}
              onChange={(val: number) => setSettings({ pointSize: val })}
              marksStep={5}
              compact
              />
              <Slider
              id="lineWidth"
              label="Line Size"
              min={1}
              max={20}
              step={1}
              defaultValue={lineWidth}
              onChange={(val: number) => setSettings({ lineWidth: val })}
              marksStep={5}
              compact
              />
              <Slider
              id="legendFontSize"
              label="Legend Font"
              min={5}
              max={30}
              step={1}
              defaultValue={legendFontSize}
              onChange={(val: number) => setSettings({ legendFontSize: val })}
              marksStep={5}
              compact
              />
              <Slider
              id="labelFontSize"
              label="Label Font"
              min={5}
              max={30}
              step={1}
              defaultValue={labelFontSize}
              onChange={(val: number) => setSettings({ labelFontSize: val })}
              marksStep={5}
              compact
              />
              <Slider
              id="tooltipFontSize"
              label="Tooltip Font"
              min={5}
              max={30}
              step={1}
              defaultValue={tooltipFontSize}
              onChange={(val: number) => setSettings({ tooltipFontSize: val })}
              marksStep={5}
              compact
              />
              <Slider
              id="thumbnailsSize"
              label="Thumb Size"
              min={150}
              max={350}
              step={1}
              defaultValue={thumbnailsSize}
              onChange={(val: number) => setSettings({ thumbnailsSize: val })}
              marksStep={50}
              compact
              />
            </div>

            {/* Footer */}
            <div className="mt-8 text-right">
              <button
                onClick={onClose}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
              >
                Close
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
}

function Slider({
  label,
  id,
  min,
  max,
  step,
  defaultValue,
  marksStep = 5,
  compact = false,
  onChange
}: {
  label: string
  id: string
  min: number
  max: number
  step: number
  defaultValue: number
  marksStep?: number
  compact?: boolean
  onChange: (val: number) => void
}) {
  const [value, setValue] = useState<number>(defaultValue)

  const marks = []
  for (let i = min; i <= max; i += marksStep) {
    marks.push(i)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setValue(val);
    onChange(val);
  };

  return (
    <div className={compact ? 'text-sm' : 'mb-4'}>
      <div className="flex justify-between items-center mb-1">
        <label htmlFor={id} className="font-medium text-gray-700">{label}</label>
        <span className="text-gray-500">({value})</span>
      </div>
      <input
        type="range"
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="w-full accent-blue-600"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        {marks.map(m => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  )
}
