import { materials, refractedAngle } from './optics.mjs';

// One optical plane; the detail view is a crop of these same coordinates.
export const layout = Object.freeze({width:1254,height:1254,axis:650,boundary:570,end:850,radius:220,zoomX:120,zoomY:120});
export const media = Object.freeze(['water','glass']);
export const airRate = .13; // illustrative units/ms, not a physical clock
export const boundaryMs = layout.radius/airRate;
export const clampAngle = value => Math.max(0,Math.min(60,Math.round(Number.isFinite(Number(value))?Number(value):45)));
export const zoomViewBox = [layout.axis-layout.zoomX,layout.boundary-layout.zoomY,layout.zoomX*2,layout.zoomY*2].join(' ');
export function geometry(medium, angle) {
 const degrees=clampAngle(angle),outgoing=refractedAngle('air',medium,degrees),a=degrees*Math.PI/180,b=outgoing*Math.PI/180;
 const hit=[layout.axis,layout.boundary],source=[hit[0]-layout.radius*Math.sin(a),hit[1]-layout.radius*Math.cos(a)],end=[hit[0]+(layout.end-hit[1])*Math.tan(b),layout.end];
 const outgoingLength=Math.hypot(end[0]-hit[0],end[1]-hit[1]),arrivalMs=boundaryMs+outgoingLength/(airRate/materials[medium].n);
 return {medium,degrees,outgoing,source,hit,end,outgoingLength,arrivalMs};
}
export const durationMs = (medium,angle) => geometry(medium,angle).arrivalMs;
export function snapshot(medium,angle,elapsed) {
 const time=Math.max(0,Number.isFinite(elapsed)?elapsed:0),g=geometry(medium,angle),entered=time>=boundaryMs,arrived=time>=g.arrivalMs;
 const fraction=entered?Math.min(1,(time-boundaryMs)/(g.arrivalMs-boundaryMs)):Math.min(1,time/boundaryMs),a=entered?g.hit:g.source,b=entered?g.end:g.hit;
 return {...g,entered,arrived,front:arrived?g.end:a.map((v,i)=>v+(b[i]-v)*fraction)};
}
