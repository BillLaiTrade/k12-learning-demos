// Qualitative teaching model, not measured dye identity or retention data.
export const DURATION = 24;
export const CONTACT_TIME = 4;
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
const smooth = (start, end, t) => {
  const u = clamp((t - start) / (end - start));
  return u * u * (3 - 2 * u);
};
export function placement(top) {
  const bottom = top + PAPER_HEIGHT;
  const baseline = top + PAPER_HEIGHT * BASELINE;
  return { bottom, baseline, kind: bottom < LIQUID ? 'dry' : baseline >= LIQUID ? 'spilled' : 'valid' };
}
export function chromatographyState(seconds, top = MOUNT.top, sample = 'green') {
  const { bottom, baseline, kind } = placement(top);
  const progress = clamp(seconds / DURATION);
  const start = Math.min(bottom, LIQUID);
  const elapsed = progress * DURATION;
  const contact = kind === 'valid' && elapsed >= CONTACT_TIME;
  let front = kind === 'dry' ? bottom : start;
  if (kind === 'valid') {
    if (!contact) front = start + (baseline - start) * clamp(elapsed / CONTACT_TIME);
    else {
      const u = clamp((elapsed - CONTACT_TIME) / (DURATION - CONTACT_TIME));
      front = baseline - (baseline - (top + 0.055)) * (0.8 * u + 0.2 * smooth(0, 1, u));
    }
  } else if (kind === 'spilled') front = start - Math.sqrt(progress) * Math.max(0, start - (top + 0.055));
  const travel = Math.max(0, baseline - front);
  const spread = kind === 'valid' ? smooth(CONTACT_TIME, 9, elapsed) : 0;
  const separation = kind === 'valid' ? smooth(8, 20, elapsed) : 0;
  const originOpacity = kind === 'valid' ? 1 - 0.86 * smooth(CONTACT_TIME, 14, elapsed) : 1;
  const bands = kind === 'valid' && travel > 0 ? SAMPLES[sample].bands.map(b => ({ ...b, y: baseline - travel * b.travel })) : [];
  const phase = !contact ? 'approaching' : elapsed < 9 ? 'wicking' : elapsed < DURATION ? 'separating' : 'complete';
  return { progress, bottom, baseline, front, kind, bands, contact, spread, separation, originOpacity, phase };
}
