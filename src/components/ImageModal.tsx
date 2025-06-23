'use client';

import { useEffect, useState, Fragment } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, Transition } from '@headlessui/react';
import { usePlotSettings } from '@/context/PlotSettingsContext';
import { digitize, weightedAvg } from '@/libs/mathUtils';

/*
 ---------------------------------------------------------------------------
  Re‑usable modal component
 ---------------------------------------------------------------------------*/

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imgSrc?: string;
  details?: React.ReactNode[];
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
      <Dialog onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel
            className={`${maxWidthClass} w-full rounded-xl bg-white p-6 shadow-xl`}
          >
            {imgSrc && (
              <img src={imgSrc} alt="preview" className="w-full mb-4 rounded" />
            )}
            {title && (
              <Dialog.Title className="text-lg font-semibold mb-2">
                {title}
              </Dialog.Title>
            )}
            {details && <div className="space-y-1 text-sm">{details}</div>}
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
