export const DURATION = 10.5;
export const CHECKPOINTS = [0, 1.5, 4.5, 7.5].map(seconds => seconds / DURATION);

const clamp = value => Math.max(0, Math.min(1, value));
function smooth(start, end, value) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

export function evaporationState(value) {
  const progress = Math.max(0, Math.min(1, Number(value) || 0));
  const seconds = progress * DURATION;
  // Compress observation only; the three later chapters retain their timing.
  const modelProgress = seconds < 1.5 ? seconds / 6 : 0.25 + (seconds - 1.5) / 12;
  // Qualitative heating sequence, not measured kinetics or a solubility curve.
  const water = modelProgress < 0.25 ? 1 - modelProgress * 0.12 : 0.97 * Math.pow(clamp(1 - (modelProgress - 0.25) / 0.50), 1.4);
  const crystals = clamp((modelProgress - 0.50) / 0.25);
  const boiling = smooth(0.16, 0.27, modelProgress) * (1 - smooth(0.62, 0.75, modelProgress));
  const phase = modelProgress >= 0.75 ? 'dry' : modelProgress >= 0.67 ? 'shallow' : modelProgress >= 0.50 ? 'crystallizing' : modelProgress >= 0.25 ? 'boiling' : modelProgress >= 0.16 ? 'bubbles' : 'warming';
  const step = modelProgress >= 0.75 ? 4 : modelProgress >= 0.50 ? 3 : modelProgress >= 0.25 ? 2 : 1;
  return { progress, water, crystals, boiling, phase, step };
}
