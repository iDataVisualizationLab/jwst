'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

/*
 ---------------------------------------------------------------------------
  Re‑usable modal component
 ---------------------------------------------------------------------------*/

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imgSrc?: string;
  details?: {
    label: string;
    phase?: number;
    mjd?: number;
    filename?: string;
    rows?: Array<{
      color?: string;
      epoch: string;
      r_in: string;
      r_out: string;
      y: number;
    }>;
  };
  title?: string;
  /** Tailwind class controlling Dialog width (e.g. max-w-2xl) */
  maxWidthClass?: string;
}

export function ImageModal({
  isOpen,
  onClose,
  imgSrc,
  details,
  title = 'Details',
  maxWidthClass = 'max-w-2xl',
}: ImageModalProps) {
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-99999">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel
            className={`${maxWidthClass} w-full rounded-xl bg-white p-6 shadow-xl`}
          >
            {imgSrc && (
              <img src={imgSrc} alt="preview" className="w-full mb-4 rounded" />
            )}
            {title && (
              <Dialog.Title className="text-lg font-semibold mb-2 text-black">
                {title}
              </Dialog.Title>
            )}
            {details && (
              <div className="mt-4 text-m space-y-4 text-black">
                {/* Metadata Summary */}
                <div className="space-y-1">
                  <p><span className="font-semibold">Label:</span> {details.label}</p>
                  {details.phase && <p><span className="font-semibold">Phase:</span> {details.phase}</p>}
                  {details.mjd && <p><span className="font-semibold">MJD:</span> {details.mjd}</p>}
                  {details.filename && (
                    <p>
                      <span className="font-semibold">Filename:</span>{' '}
                      <span className="break-all">{details.filename}</span>
                    </p>
                  )}
                </div>

                {/* Table of Values */}
                {Array.isArray(details.rows) && details.rows.length > 0 && (
                  <div className="border-t pt-3 overflow-x-auto">
                    <table className="min-w-full text-sm border border-gray-300 rounded overflow-hidden">
                      <thead className="bg-gray-100 text-black font-semibold">
                        <tr>
                          <th className="px-3 py-2 text-left"> </th>
                          <th className="px-3 py-2 text-left">Epoch</th>
                          <th className="px-3 py-2 text-left">r_in</th>
                          <th className="px-3 py-2 text-left">r_out</th>
                          <th className="px-3 py-2 text-left">y</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.rows.map((row, idx) => (
                          <tr key={idx} className="border-t hover:bg-gray-50">
                            <td className="px-3 py-1">
                              {row.color ? (
                                <div
                                  className="w-4 h-4 rounded-full border border-gray-300"
                                  style={{ backgroundColor: row.color }}
                                  title={row.color}
                                />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-gray-200 bg-white" title="No color" />
                              )}
                            </td>
                            <td className="px-3 py-1 font-mono text-black">{row.epoch}</td>
                            <td className="px-3 py-1 font-mono text-black">{row.r_in}</td>
                            <td className="px-3 py-1 font-mono text-black">{row.r_out}</td>
                            <td className="px-3 py-1 text-black font-semibold">{row.y.toFixed(2)}</td>
                            {/* <td className="px-3 py-1 text-blue-600 font-semibold">{row.y.toFixed(2)}</td> */}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}


            <button
              onClick={onClose}
              className="mt-6 px-4 py-2 rounded bg-gray-800 text-white"
            >
              Close
            </button>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
}
