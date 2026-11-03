import {geometry,angleFromSource,layout} from './return-refraction-model.mjs?v=20261103-refine1';

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
