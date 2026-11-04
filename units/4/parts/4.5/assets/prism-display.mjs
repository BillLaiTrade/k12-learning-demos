// One shared exposure curve for all prism pixels and colours. Compress the peak
// with a single scalar rather than clipping the three channels independently.
export function toneMapPrism(linear,exposure=7,ambient=.045){
 const energy=linear.map(v=>Math.max(0,v*exposure)),peak=Math.max(...energy),gain=(1-ambient)/(1+peak);
 return energy.map(v=>ambient+v*gain);
}
export const linearToSrgb=v=>v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;
