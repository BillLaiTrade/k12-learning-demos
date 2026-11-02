import { materials, refractedAngle } from './optics.mjs';

export const layout=Object.freeze({width:1254,height:1254,axis:650,boundary:570,radius:160});
export const zoomViewBox='350 340 600 460';
export const clampAngle=value=>Math.max(0,Math.min(35,Math.round(Number.isFinite(Number(value))?Number(value):30)));
export function geometry(medium,value){
 if(!['water','glass'].includes(medium))throw new RangeError('Unknown lower medium');
 const waterAngle=clampAngle(value),airAngle=refractedAngle(medium,'air',waterAngle),a=airAngle*Math.PI/180,b=waterAngle*Math.PI/180;
 const hit=[layout.axis,layout.boundary],sourceA=[hit[0]-layout.radius*Math.sin(a),hit[1]-layout.radius*Math.cos(a)],sourceB=[hit[0]+layout.radius*Math.sin(b),hit[1]+layout.radius*Math.cos(b)];
 return {medium,waterAngle,airAngle,sourceA,sourceB,hit,forward:[sourceA,hit,sourceB],backward:[sourceB,hit,sourceA],name:materials[medium].name};
}
export function angleMark(degrees,upper,radius=98){
 if(!degrees)return {arc:'',sector:''};
 const a=degrees*Math.PI/180,sign=upper?-1:1,start=[layout.axis,layout.boundary+sign*radius],end=[layout.axis+sign*radius*Math.sin(a),layout.boundary+sign*radius*Math.cos(a)];
 const arc=`M${start.join(' ')}A${radius} ${radius} 0 0 0 ${end.join(' ')}`;
 return {arc,sector:`M${layout.axis} ${layout.boundary}L${arc.slice(1)}Z`};
}
export function arrow(from,to,fraction,size){
 const length=Math.hypot(to[0]-from[0],to[1]-from[1]),dx=(to[0]-from[0])/length,dy=(to[1]-from[1])/length,center=from.map((v,i)=>v+(to[i]-v)*fraction);
 const point=(along,across)=>[center[0]+dx*along-dy*across,center[1]+dy*along+dx*across].join(' ');
 return `M${point(size,0)}L${point(-size*.7,size*.55)}L${point(-size*.35,0)}L${point(-size*.7,-size*.55)}Z`;
}
