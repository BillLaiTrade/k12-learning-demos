import { materials } from './optics.mjs';

// Image coordinates share one distance scale and one illustrative time scale.
// This is a slowed diagram, not the travel time through a real tabletop tank.
export const layout = Object.freeze({ width:1536, height:1024, source:240, boundary:484, end:728, axes:[350,768,1184] });
export const media = Object.freeze(['air','water','glass']);
export const airRate = .14;
export const boundaryMs = (layout.boundary-layout.source)/airRate;
export const arrivalMs = medium => medium==='air' ? (layout.end-layout.source)/airRate : boundaryMs+(layout.end-layout.boundary)*materials[medium].n/airRate;
export const comparisonMs = arrivalMs('air');
export const durationMs = arrivalMs('glass');
export function snapshot(elapsed) {
  const time = Math.max(0,Number.isFinite(elapsed)?elapsed:0);
  return media.map((medium,i)=>{
    const y = Math.min(layout.end,medium==='air'||time<=boundaryMs ? layout.source+time*airRate : layout.boundary+(time-boundaryMs)*airRate/materials[medium].n);
    return {medium,x:layout.axes[i],y,entered:medium!=='air'&&time>=boundaryMs,arrived:time>=arrivalMs(medium)};
  });
}
