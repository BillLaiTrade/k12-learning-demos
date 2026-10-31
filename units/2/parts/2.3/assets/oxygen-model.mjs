export const PREPARATION_DURATION = 12600;
export const COMPARISON_DURATION = 6200;
export const PREPARATION_STAGES = [0, 2000, 4800, 10000];
const clamp = n => Math.min(1, Math.max(0, n));
const smooth = n => { const x = clamp(n); return x*x*(3-2*x); };
// Instructional clock, not measured reaction rates. Tube entry precedes water
// displacement; withdrawal finishes before the cover begins sliding.
export function preparationFrame(elapsed) {
  const time = Math.max(0, Math.min(PREPARATION_DURATION, elapsed));
  const stage = time < 2000 ? 0 : time < 4800 ? 1 : time < 10000 ? 2 : 3;
  const collected = clamp((time-5500)/4500);
  const tube = time < 10000 ? smooth((time-4800)/700) : 1-smooth((time-10000)/800);
  const cover = smooth((time-10800)/1400);
  return { stage, collected, tube, cover, purging: stage === 1,
    collecting: time >= 5500 && collected < 1, covered: cover === 1 };
}
export function comparisonFrame(elapsed) {
  const time = Math.max(0, Math.min(COMPARISON_DURATION, elapsed));
  return { inserted: smooth(time/1500), ignition: clamp((time-2000)/1200), fading: clamp((time-1800)/3000) };
}

// Each selected step owns its bounded clock. Finishing it never chooses another
// step; the learner navigates explicitly with the tabs or previous/next buttons.
export const STEP_DURATIONS = [1800, 2800, 5200, 2600];
export function preparationStepFrame(stage, elapsed) {
  const index = Math.max(0, Math.min(3, Math.trunc(stage)));
  const duration = STEP_DURATIONS[index];
  const localTime = Math.max(0, Math.min(duration, elapsed));
  const time = PREPARATION_STAGES[index] + localTime;
  const frame = preparationFrame(time);
  return { ...frame, stage: index, time, localTime, duration,
    purging: index === 1, collecting: index === 2 && frame.collected < 1,
    covered: index === 3 && frame.covered,
    material: index === 0 ? Math.min(2, Math.floor(localTime/600)) : -1 };
}
