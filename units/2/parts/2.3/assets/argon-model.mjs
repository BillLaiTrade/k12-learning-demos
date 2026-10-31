export const ARGON_DURATION = 5400;
const clamp = x => Math.min(1,Math.max(0,x));
const smooth = (start,end,x) => {const t=clamp((x-start)/(end-start));return t*t*(3-2*t);};
// An explanatory flow sequence, not a gas concentration or measured shielding efficiency.
export function argonFrame(elapsed) {
 const progress=clamp(elapsed/ARGON_DURATION);
 return {progress,air:smooth(.02,.30,progress),shield:smooth(.16,.68,progress),oxidation:smooth(.25,.90,progress),phase:progress<.16?'air':progress<.68?'shielding':progress<1?'protected':'result'};
}
