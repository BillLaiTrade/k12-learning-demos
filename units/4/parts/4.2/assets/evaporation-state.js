export const DURATION = 12;
export const CHECKPOINTS = [0, 0.25, 0.50, 0.75];

const clamp = value => Math.max(0, Math.min(1, value));
function smooth(start, end, value) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

export function evaporationState(value) {
  const progress = Math.max(0, Math.min(1, Number(value) || 0));
  // Qualitative heating sequence, not measured kinetics or a solubility curve.
  const water = progress < 0.25 ? 1 - progress * 0.12 : 0.97 * Math.pow(clamp(1 - (progress - 0.25) / 0.50), 1.4);
  const crystals = clamp((progress - 0.50) / 0.25);
  const boiling = smooth(0.16, 0.27, progress) * (1 - smooth(0.62, 0.75, progress));
  const phase = progress >= 0.75 ? 'dry' : progress >= 0.67 ? 'shallow' : progress >= 0.50 ? 'crystallizing' : progress >= 0.25 ? 'boiling' : progress >= 0.16 ? 'bubbles' : 'warming';
  const step = progress >= 0.75 ? 4 : progress >= 0.50 ? 3 : progress >= 0.25 ? 2 : 1;
  return { progress, water, crystals, boiling, phase, step };
}
