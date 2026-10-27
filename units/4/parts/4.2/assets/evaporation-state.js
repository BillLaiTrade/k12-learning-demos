export const DURATION = 18;
export const CHECKPOINTS = [0, 0.34, 0.78, 1];

export function evaporationState(value) {
  const progress = Math.max(0, Math.min(1, Number(value) || 0));
  const water = Math.max(0, 1 - progress / 0.98);
  const crystals = Math.max(0, Math.min(1, (progress - 0.60) / 0.38));
  const step = progress >= 0.98 ? 4 : progress >= 0.60 ? 3 : progress > 0.015 ? 2 : 1;
  return { progress, water, crystals, step };
}
