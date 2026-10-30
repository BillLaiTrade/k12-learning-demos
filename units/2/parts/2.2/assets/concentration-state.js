// Fresh, fully dissolved sugar-water recipes. Bounds avoid saturation teaching.
export const LIMITS = { sugar: [0, 20], water: [50, 150], ppm: [0, 10] };
export const ACTION_MS = { sugar: 3200, water: 2600 };
export const POUR_DELAY = 650;
export const POUR_RATE = 4;
export const INITIAL = { sugar: 5, water: 95, ppm: 3 };
export function massValue(kind, value) {
  if (value === null || String(value).trim() === "") return null;
  const n = Number(value);
  const [min, max] = LIMITS[kind];
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return kind === 'ppm' ? Math.round(n) : Math.round(n * 10) / 10;
}
export function concentrationState(sugar, water, ppm) {
  const total = (Math.round(sugar * 10) + Math.round(water * 10)) / 10;
  return { sugar, water, total, percent: sugar / total * 100,
    ppm, totalMg: 1000000, solventMg: 1000000 - ppm,
    microPercent: ppm / 10000 };
}
export const format = (n, digits = 3) => Number(n.toFixed(digits)).toLocaleString('en-US', { maximumFractionDigits: digits });

// Sugar leaves the scale while being scooped out, and reaches it only after
// falling from the spoon. Keep mass changes aligned with those visible phases.
export function sugarActionState(progress, delta) {
  const clamp = value => Math.max(0, Math.min(1, value));
  const t = clamp(progress), start = delta < 0 ? .22 : .66, end = delta < 0 ? .40 : .82;
  return { transfer: clamp((t - start) / (end - start)), pouring: t >= .60 && t < .82, pourProgress: clamp((t - .60) / .22) };
}
