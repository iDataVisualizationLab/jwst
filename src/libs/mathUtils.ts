export function weightedAvg(values: number[], errors: number[]): [number, number] {
  const elements = values.map(Number);
  const errs = errors.map(Number);

  if (elements.some(isNaN) || errs.some(isNaN)) return [NaN, NaN];

  const weights = errs.map(e => 1 / (e * e));
  const sumW = weights.reduce((a, b) => a + b, 0);
  const weightedSum = elements.reduce((acc, val, i) => acc + val * weights[i], 0);

  const avg = weightedSum / sumW;
  const avgErr = 1 / Math.sqrt(sumW);
  return [avg, avgErr];
}

export function normalAvg(values: number[], errors: number[]): [number, number] {
  const elements = values.map(Number);
  const errs = errors.map(Number);

  if (elements.some(isNaN) || errs.some(isNaN)) return [NaN, NaN];

  const avg =
    elements.reduce((sum, val) => sum + val, 0) / elements.length;

  const sumSquaredErrors = errs.reduce((sum, e) => sum + e * e, 0);
  const avgErr = Math.sqrt(sumSquaredErrors) / errs.length;

  return [avg, avgErr];
}


export function digitize(arr: number[], bins: number[], right = false): number[] {
  const results: number[] = [];

  for (const value of arr) {
    let binIndex = bins.length; // default: value >= all bins

    for (let i = 0; i < bins.length; i++) {
      if (right) {
        // Right-closed interval: (bin[i-1], bin[i]]
        if (value <= bins[i]) {
          binIndex = i;
          break;
        }
      } else {
        // Left-closed interval: [bin[i-1], bin[i])
        if (value < bins[i]) {
          binIndex = i;
          break;
        }
      }
    }

    results.push(binIndex);
  }

  return results;
}