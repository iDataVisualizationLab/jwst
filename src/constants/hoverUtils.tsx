import React from 'react';
import { usePlotSettings } from '@/context/PlotSettingsContext';
interface TooltipData {
  phase: string;
  type: string;
  r_in: number;
  r_out: number;
  filename: string;
}


export const RenderTooltip: React.FC<{ cd: Record<string, any> }> = ({ cd }) => {
  const { tooltipFontSize, thumbnailsSize } = usePlotSettings();

  if (!cd) return null;

  const imgSrc = cd.filename
    ? `https://raw.githubusercontent.com/iDataVisualizationLab/jwst-data/main/img/thumbnails/${cd.filename}`
    : null;

  return (
    <div
      className="p-2 bg-white rounded shadow border border-gray-300"
      style={{
        fontSize: `${tooltipFontSize}px`,
        lineHeight: '1.4',
        color: '#000',
        maxWidth: '320px',
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
      }}
    >
      {imgSrc && (
        <div className="w-full flex justify-center mb-2">
          <img
            src={imgSrc}
            alt="Thumbnail"
            style={{
              height: `${thumbnailsSize}px`,
              // maxHeight: `${thumbnailsSize}px`,
              maxWidth: '100%',
              objectFit: 'contain',
              borderRadius: '4px',
              border: '1px solid #ddd',
            }}
          />
        </div>
      )}

      <div className="space-y-1">
        {cd.y !== undefined && (
          <div>
            <span
              className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
              style={{ backgroundColor: cd.traceColor ?? '#000' }}
            /><span className="font-semibold">Y-Axis:</span> {Number(cd.y).toFixed(5)}</div>
        )}
        {cd.mjd && (
          <div><span className="font-semibold">MJD:</span> {Number(cd.mjd).toFixed(5)}</div>
        )}
        {cd.time && (
          <div>
            <span className="font-semibold">Time:</span> {cd.time}
          </div>
        )}
        {cd.phase && (
          <div><span className="font-semibold">Phase:</span> {Number(cd.phase).toFixed(3)}</div>
        )}
      </div>
    </div>
  );
};
