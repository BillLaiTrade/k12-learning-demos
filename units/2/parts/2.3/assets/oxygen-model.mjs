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

// Each selected step owns a bounded clock; only the learner selects a new step.
export const ASSEMBLY_DURATION = 11800;
export const STEP_DURATIONS = [1800, ASSEMBLY_DURATION, 2800, 5200, 2600];
export function assemblyFrame(elapsed) {
  const time = Math.max(0, Math.min(ASSEMBLY_DURATION, elapsed));
  const phase = time < 2800 ? 0 : time < 5800 ? 1 : time < 8800 ? 2 : 3;
  const peroxide = smooth((time-3300)/1900);
  const catalyst = smooth((time-6300)/1400);
  const sealed = smooth((time-9000)/1600);
  const reaction = clamp((time-6800)/500);
  return { time, phase, peroxide, catalyst, sealed, reaction,
    bottleTilt: smooth((time-2800)/500),
    bottle: smooth((time-2800)/200)*(1-smooth((time-5200)/500)),
    liquidFlow: smooth((time-3300)/180)*(1-smooth((time-5020)/180)),
    spoon: smooth((time-5800)/200)*(1-smooth((time-7800)/500)),
    powderFlow: smooth((time-6300)/180)*(1-smooth((time-7520)/180)),
    mixed: smooth((time-10700)/500),
    gasThroughTube: sealed === 1 && reaction > 0 };
}
export function preparationStepFrame(stage, elapsed) {
  const index = Math.max(0, Math.min(STEP_DURATIONS.length-1, Math.trunc(stage)));
  const duration = STEP_DURATIONS[index];
  const localTime = Math.max(0, Math.min(duration, elapsed));
  const legacyIndex = index > 1 ? index-1 : 0;
  const time = PREPARATION_STAGES[legacyIndex] + localTime;
  const frame = preparationFrame(index === 1 ? 0 : time);
  return { ...frame, stage:index, time, localTime, duration,
    purging:index===2, collecting:index===3 && frame.collected<1,
    covered:index===4 && frame.covered,
    material:index===0 ? Math.min(2,Math.floor(localTime/600)) : -1 };
}
