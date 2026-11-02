import { SETUP_DURATION } from './oxygen-setup.mjs?v=thistle-1';
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
  const catalyst=smooth((time-3300)/1400),sealed=smooth((time-6300)/1800),peroxide=smooth((time-9300)/1900);
  const level=790-165*peroxide,liquidSeal=sealed===1&&level<735;
  const reaction=peroxide>0&&catalyst===1?1:0,placement=smooth((time-100)/1500),outletPlacement=smooth((time-1700)/900);
  return {time,phase,peroxide,catalyst,sealed,reaction,placement,outletPlacement,liquidSeal,
    bottleTilt:smooth((time-8800)/500),bottle:smooth((time-8800)/200)*(1-smooth((time-11300)/500)),
    liquidFlow:smooth((time-9300)/180)*(1-smooth((time-11020)/180)),
    spoon:smooth((time-2800)/200)*(1-smooth((time-5200)/500)),powderFlow:smooth((time-3300)/180)*(1-smooth((time-4520)/180)),
    mixed:peroxide*catalyst,gasThroughTube:liquidSeal&&reaction>0};
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

// Purposeful operations, each isolated to its own instructional time window.
// Legacy clocks remain shared with the splint comparison and old evidence.
export const OXYGEN_OPERATIONS = [
  {label:'認識材料',scene:0,offset:0,duration:0},
  {label:'擺好集氣位置',scene:1,offset:0,duration:SETUP_DURATION},
  {label:'加入二氧化錳',scene:1,offset:2800,duration:3000},
  {label:'裝好漏斗與導管',scene:1,offset:5800,duration:3000},
  {label:'由漏斗加入雙氧水',scene:1,offset:8800,duration:3000},
  {label:'先排出空氣',scene:2,offset:0,duration:2800},
  {label:'排水收集氧氣',scene:3,offset:0,duration:5200},
  {label:'封存氧氣',scene:4,offset:0,duration:7800},
];
export function oxygenOperationFrame(stage,elapsed) {
  const index=Math.max(0,Math.min(OXYGEN_OPERATIONS.length-1,Math.trunc(stage)));
  const operation=OXYGEN_OPERATIONS[index];
  const localTime=Math.max(0,Math.min(operation.duration,elapsed));
  // Extend only the physical preparation. Later reagent/collection windows keep
  // their established clock and prerequisites.
  const sceneTime=operation.offset+(index===1?2800*localTime/SETUP_DURATION:localTime);
  const frame=preparationStepFrame(operation.scene,sceneTime);
  return {...frame,collecting:operation.scene===3&&localTime>=700&&frame.collected<1,
    lift:index===7?smooth((localTime-2600)/1400):0,
    upright:index===7?smooth((localTime-4200)/1400):0,
    setDown:index===7?smooth((localTime-5800)/1800):0,
    operation:index,localTime,duration:operation.duration,scene:operation.scene,sceneTime};
}
