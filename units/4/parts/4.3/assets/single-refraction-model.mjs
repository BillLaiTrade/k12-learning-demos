import {materials} from './optics.mjs';

export const layout=Object.freeze({width:1254,height:1254,axis:650,boundary:570,radius:300});
export const airRate=.48;
export const clampAngle=value=>Math.max(0,Math.min(90,Number.isFinite(Number(value))?Number(value):30));
export const criticalAngle=medium=>Math.asin(1/materials[medium].n)*180/Math.PI;
export function geometry(medium,value,reverse=false){
 if(!['water','glass'].includes(medium))throw new RangeError('Unknown medium');
 const degrees=clampAngle(value),a=degrees*Math.PI/180,sin=Math.sin(a),cos=Math.cos(a),sourceRadius=Math.min(300,cos>1e-12?230/cos:300);
 const from=reverse?medium:'air',to=reverse?'air':medium,fromN=materials[from].n,toN=materials[to].n,s=fromN/toN*sin;
 const hit=[650,570],source=[650-sourceRadius*sin,570-sourceRadius*cos];
 const kind=degrees===90?'grazing':s>1+1e-10?'tir':Math.abs(s-1)<=1e-10?'critical':'refract';
 const outgoing=kind==='tir'||kind==='grazing'?null:Math.asin(Math.min(1,s))*180/Math.PI,reflected=kind==='tir'?degrees:null;
 const endpoint=(angle,up=false)=>{const r=angle*Math.PI/180,x=Math.sin(r),y=Math.cos(r),distance=Math.min(x>1e-12?360/x:Infinity,y>1e-12?280/y:Infinity);return[650+distance*x,570+(up?-1:1)*distance*y];};
 const end=kind==='grazing'?hit:endpoint(kind==='tir'?degrees:outgoing,kind==='tir'),referenceEnd=endpoint(degrees);
 const outgoingLength=Math.hypot(end[0]-650,end[1]-570),incomingRate=airRate/fromN,outgoingRate=airRate/(kind==='tir'?fromN:toN),entryMs=sourceRadius/incomingRate,arrivalMs=entryMs+outgoingLength/outgoingRate;
 return {medium,reverse,degrees,kind,from,to,source,sourceRadius,hit,end,referenceEnd,outgoing,reflected,outgoingLength,incomingRate,outgoingRate,entryMs,arrivalMs,critical:reverse?criticalAngle(medium):null};
}
export const durationMs=(medium,angle,reverse=false)=>geometry(medium,angle,reverse).arrivalMs;
export function snapshot(medium,angle,elapsed,reverse=false){
 const g=geometry(medium,angle,reverse),time=Math.max(0,Number.isFinite(elapsed)?elapsed:0),entered=time>=g.entryMs,arrived=time>=g.arrivalMs;
 const fraction=entered?(g.outgoingLength?Math.min(1,(time-g.entryMs)/(g.arrivalMs-g.entryMs)):1):Math.min(1,time/g.entryMs),from=entered?g.hit:g.source,to=entered?g.end:g.hit;
 return {...g,entered,arrived,front:arrived?g.end:from.map((v,i)=>v+(to[i]-v)*fraction)};
}
