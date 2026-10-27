export const DURATION = 24;
export const CHECKPOINTS = [0, 0.28, 0.65, 1];

const clamp = value => Math.max(0, Math.min(1, value));
function smooth(start, end, value) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

export function evaporationState(value) {
  const progress = Math.max(0, Math.min(1, Number(value) || 0));
  // Qualitative heating sequence, not measured kinetics or a solubility curve.
  const water = progress < 0.08 ? 1 - progress * 0.1875 : 0.985 * Math.pow(clamp(1 - (progress - 0.08) / 0.88), 1.4);
  const crystals = clamp((progress - 0.40) / 0.54);
  const boiling = smooth(0.08, 0.22, progress) * (1 - smooth(0.75, 0.96, progress));
  const phase = progress >= 0.96 ? 'dry' : progress >= 0.72 ? 'shallow' : progress >= 0.40 ? 'crystallizing' : progress >= 0.22 ? 'boiling' : progress >= 0.08 ? 'bubbles' : 'warming';
  const step = progress >= 0.96 ? 4 : progress >= 0.40 ? 3 : progress >= 0.08 ? 2 : 1;
  return { progress, water, crystals, boiling, phase, step };
}
