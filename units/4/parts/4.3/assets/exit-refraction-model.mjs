import {geometry,angleFromSource,layout} from './return-refraction-model.mjs?v=20261103-refine1';
import {airRate} from './oblique-incidence-model.mjs?v=20261103-refine1';
import {materials} from './optics.mjs';

// The slow medium is above the interface; light still travels from upper left to lower right.
const turn=([x,y])=>[2*layout.axis-x,2*layout.boundary-y];
export function exitGeometry(medium,angle){
 const g=geometry(medium,angle),radians=g.waterAngle*Math.PI/180,radius=Math.min(layout.radius,230/Math.cos(radians));
 const sourceA=turn(g.sourceA),sourceB=[layout.axis-radius*Math.sin(radians),layout.boundary-radius*Math.cos(radians)];
 return {...g,sourceA,sourceB,forward:[sourceA,g.hit,sourceB],backward:[sourceB,g.hit,sourceA]};
}
export function angleFromExitSource(medium,x,y){
 return angleFromSource(medium,'b',...turn([x,y]));
}

export function exitSnapshot(medium,angle,elapsed){
 const g=exitGeometry(medium,angle),source=g.sourceB,end=g.sourceA;
 const incomingLength=Math.hypot(source[0]-g.hit[0],source[1]-g.hit[1]),outgoingLength=Math.hypot(end[0]-g.hit[0],end[1]-g.hit[1]);
 const entryMs=incomingLength/(airRate/materials[medium].n),arrivalMs=entryMs+outgoingLength/airRate,time=Math.max(0,Number.isFinite(elapsed)?elapsed:0);
 const entered=time>=entryMs,arrived=time>=arrivalMs,fraction=entered?Math.min(1,(time-entryMs)/(arrivalMs-entryMs)):Math.min(1,time/entryMs),from=entered?g.hit:source,to=entered?end:g.hit;
 return {...g,source,end,incomingLength,outgoingLength,entryMs,arrivalMs,entered,arrived,front:arrived?end:from.map((v,i)=>v+(to[i]-v)*fraction)};
}
export const exitDurationMs=(medium,angle)=>exitSnapshot(medium,angle,0).arrivalMs;
