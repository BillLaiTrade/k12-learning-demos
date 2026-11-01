import { materials } from './optics.mjs';

// Image coordinates share one distance scale and one illustrative time scale.
// This is a slowed diagram, not the travel time through a real tabletop tank.
export const layout = Object.freeze({ width:1717, height:916, source:165, boundary:463, end:714, axes:[562,1157] });
export const media = Object.freeze(['water','glass']);
export const airRate = .16;
export const boundaryMs = (layout.boundary-layout.source)/airRate;
export const arrivalMs = medium => boundaryMs+(layout.end-layout.boundary)*materials[medium].n/airRate;
export const durationMs = arrivalMs('glass');
export function snapshot(elapsed) {
  const time = Math.max(0,Number.isFinite(elapsed)?elapsed:0);
  return media.map((medium,i)=>{
    const y = Math.min(layout.end,time<=boundaryMs ? layout.source+time*airRate : layout.boundary+(time-boundaryMs)*airRate/materials[medium].n);
    return {medium,x:layout.axes[i],y,entered:time>=boundaryMs,arrived:time>=arrivalMs(medium)};
  });
}
