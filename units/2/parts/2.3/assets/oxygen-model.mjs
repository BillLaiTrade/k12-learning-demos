export const PREPARATION_DURATION = 8400;
export const COMPARISON_DURATION = 4600;
const clamp = n => Math.min(1, Math.max(0, n));
// Durations are instructional, not measured reaction rates.
export function preparationFrame(elapsed) {
  const time = Math.max(0, Math.min(PREPARATION_DURATION, elapsed));
  const stage = time < 1400 ? 0 : time < 3400 ? 1 : time < 7000 ? 2 : 3;
  return { stage, collected: clamp((time - 3900) / 3100), purging: stage === 1, collecting: stage === 2, covered: stage === 3 };
}
export function comparisonFrame(elapsed) {
  const time = Math.max(0, Math.min(COMPARISON_DURATION, elapsed));
  return { inserted: clamp(time / 1200), ignition: clamp((time - 1500) / 900), fading: clamp((time - 1500) / 2300) };
}
