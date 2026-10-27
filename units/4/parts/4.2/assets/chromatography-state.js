// Qualitative teaching model, not measured dye identity or retention data.
export const DURATION = 12;
export const LIQUID = 0.674;
export const PAPER_HEIGHT = 0.435;
export const BASELINE = 0.88;
export const HOME = { x: 0.367, top: 0.33 };
export const MOUNT = { x: 0.682, top: 0.258 };
export const SAMPLES = {
  green: { ink: '#217c43', bands: [ { color: '#2486be', travel: 0.45 }, { color: '#ddbd24', travel: 0.80 } ] },
  dark: { ink: '#34303f', bands: [ { color: '#4979b7', travel: 0.34 }, { color: '#8e619f', travel: 0.58 }, { color: '#c95f82', travel: 0.82 } ] }
};
const clamp = n => Math.max(0, Math.min(1, n));
export function placement(top) {
  const bottom = top + PAPER_HEIGHT;
  const baseline = top + PAPER_HEIGHT * BASELINE;
  return { bottom, baseline, kind: bottom < LIQUID ? 'dry' : baseline >= LIQUID ? 'spilled' : 'valid' };
}
export function chromatographyState(seconds, top = MOUNT.top, sample = 'green') {
  const { bottom, baseline, kind } = placement(top);
  const progress = clamp(seconds / DURATION);
  const start = Math.min(bottom, LIQUID);
  const front = kind === 'dry' ? bottom : start - Math.sqrt(progress) * Math.max(0, start - (top + 0.055));
  const travel = Math.max(0, baseline - front);
  const bands = kind === 'valid' && travel > 0 ? SAMPLES[sample].bands.map(b => ({ ...b, y: baseline - travel * b.travel })) : [];
  return { progress, bottom, baseline, front, kind, bands, separation: clamp(travel / 0.055) };
}
