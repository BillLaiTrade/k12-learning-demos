import { materials, refractedAngle } from './optics.mjs';

// The optical plane is orthographic. Artwork is cropped through the same viewBox.
export const layout = Object.freeze({ width:1536, top:100, height:760, boundary:470, end:650, radius:150, axes:[430,1108] });
export const media = Object.freeze(['water','glass']);
export const airRate = .13; // shared illustrative units/ms, not a physical clock
export const boundaryMs = layout.radius/airRate;
export const clampAngle = value => Math.max(0,Math.min(60,Math.round(Number.isFinite(Number(value))?Number(value):45)));
export function geometry(medium, angle) {
  const degrees=clampAngle(angle), outgoing=refractedAngle('air',medium,degrees);
  const a=degrees*Math.PI/180, b=outgoing*Math.PI/180;
  const x=layout.axes[media.indexOf(medium)], hit=[x,layout.boundary];
  const source=[x-layout.radius*Math.sin(a),layout.boundary-layout.radius*Math.cos(a)];
  const end=[x+(layout.end-layout.boundary)*Math.tan(b),layout.end];
  const outgoingLength=Math.hypot(end[0]-x,end[1]-layout.boundary);
  const arrivalMs=boundaryMs+outgoingLength/(airRate/materials[medium].n);
  return { medium,degrees,outgoing,source,hit,end,outgoingLength,arrivalMs };
}
export const durationMs = angle => Math.max(...media.map(medium=>geometry(medium,angle).arrivalMs));
export function snapshot(angle, elapsed) {
  const time=Math.max(0,Number.isFinite(elapsed)?elapsed:0);
  return media.map(medium=>{
    const g=geometry(medium,angle), entered=time>=boundaryMs, arrived=time>=g.arrivalMs;
    const fraction=entered ? Math.min(1,(time-boundaryMs)/(g.arrivalMs-boundaryMs)) : Math.min(1,time/boundaryMs);
    const a=entered?g.hit:g.source,b=entered?g.end:g.hit;
    return {...g,entered,arrived,front:arrived?g.end:a.map((v,i)=>v+(b[i]-v)*fraction)};
  });
}
