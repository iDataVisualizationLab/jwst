// utils/matrixUtils.ts

import {weightedAvg } from '@/libs/mathUtils';

export function getEpoch(value: string): string {
  const match = value.match(/epoch(\d+)/);
  return match ? match[1] : "none";
}

export function parseSelectionString(sel: string): { epoch: string; r1: string; r2: string } {
  const [epoch, r1, r2] = sel.split('_');
  return { epoch, r1, r2 };
}


type Trace = {
  x: number[];
  y: number[];
  err: number[];
  name: string;
};

export async function update_df(
  type: 'SW' | 'LW',
  dataType: 'average' | 'raw',
  selection: string[],
  count: number
): Promise<unknown[]> {
  const wave = type.toLowerCase() as 'sw' | 'lw';
  const traces: Trace[] = [];

  for (const sel of selection) {
    const [epoch, r1, r2] = sel.split('_');
    const url = `${process.env.BASE_PATH}/data/json/ZTF_J1539/rawdata/${epoch}/${wave}/${r1}/${r2}.json`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${url}`);
      const json = await res.json();

      const flux: number[] = Array.isArray(json.psf_flux_time) ? json.psf_flux_time : [];
      const fluxErr: number[] = Array.isArray(json.psf_flux_unc_time) ? json.psf_flux_unc_time : [];
      const mjd: number[] = Array.isArray(json.time_mjd) ? json.time_mjd : [];

      traces.push({ x: mjd, y: flux, err: fluxErr, name: `${type}.${r1}.${r2}` });
    } catch (err) {
      console.error(err);
    }
  }

  // 1. Build master X (union of all time points)
  const masterXSet = new Set<number>();
  traces.forEach(trace => trace.x.forEach(x => masterXSet.add(x)));
  const masterX = Array.from(masterXSet).sort((a, b) => a - b);

  // 2. Align traces: pad with nulls if no y value for a given x
  const alignedY: Record<string, (number | null)[]> = {};
  const alignedE: Record<string, (number | null)[]> = {};
  for (const trace of traces) {
    const yAligned: (number | null)[] = [];
    const eAligned: (number | null)[] = [];
    for (const x of masterX) {
      const idx = trace.x.findIndex(v => Math.abs(v - x) < 1e-6);
      yAligned.push(idx !== -1 ? trace.y[idx] : null);
      eAligned.push(idx !== -1 ? trace.err[idx] : null);
    }
    alignedY[trace.name] = yAligned;
    alignedE[trace.name] = eAligned;
  }

  // 3. Chunking and averaging if needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultMatrix: any[] = [];

  if (dataType === 'average') {
    const chunkSize = count;
    const nChunks = Math.floor(masterX.length / chunkSize);
    for (let i = 0; i < nChunks; i++) {
      const row: Record<string, number | null> = {};
      for (const key of Object.keys(alignedY)) {
        const chunk = alignedY[key].slice(i * chunkSize, (i + 1) * chunkSize).filter((v): v is number => v !== null);
        const errChunk = alignedE[key].slice(i * chunkSize, (i + 1) * chunkSize).filter((v): v is number => v !== null);
        if (chunk.length > 0) {
          const [avg] = weightedAvg(chunk, errChunk);
          row[key] = avg;
        } else {
          row[key] = null;
          
        }
      }
      resultMatrix.push(row);
    }

    // Handle leftover
    const remStart = nChunks * chunkSize;
    if (remStart < masterX.length) {
      const row: Record<string, number | null> = {};
      for (const key of Object.keys(alignedY)) {
        const chunk = alignedY[key].slice(remStart).filter((v): v is number => v !== null);
        const errChunk = alignedE[key].slice(remStart).filter((v): v is number => v !== null);
        if (chunk.length > 0) {
          const [avg] = weightedAvg(chunk, errChunk);
          row[key] = avg;
        } else {
          row[key] = null;
        }
      }
      resultMatrix.push(row);
    }
  } else {
    // raw mode: 1 row per timestamp
    for (let i = 0; i < masterX.length; i++) {
      const row: Record<string, number | null> = {};
      for (const key of Object.keys(alignedY)) {
        row[key] = alignedY[key][i];
      }
      resultMatrix.push(row);
    }
  }

  return resultMatrix;
}
