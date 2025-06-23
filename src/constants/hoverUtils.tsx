import React from 'react';

interface TooltipData {
  phase: string;
  type: string;
  r_in: number;
  r_out: number;
  filename: string;
}

export function renderTooltip(cd: TooltipData) {
  return (
    <div className="text-xs p-2 bg-white rounded shadow border border-gray-300">
      <div><strong>Phase:</strong> {cd.phase}</div>
      <div><strong>Type:</strong> {cd.type}</div>
      <div><strong>r_in:</strong> {cd.r_in}, <strong>r_out:</strong> {cd.r_out}</div>
      <div><strong>File:</strong> {cd.filename}</div>
    </div>
  );
}
