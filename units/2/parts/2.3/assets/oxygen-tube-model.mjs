import {rubberGeometry,transformPoint} from './co2-model.mjs?v=b-decisions-20261104';
export const OXYGEN_HOSE_LENGTH=700;
export const OXYGEN_SOURCE_GLASS='M0 95V-80Q0 -100 20 -100H120';
export const OXYGEN_COLLECTOR_GLASS='M0 -210V65Q0 85 20 85H215Q235 85 235 65V30';
const mix=(a,b,t)=>a+(b-a)*t;
const blend=(a,b,t)=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t),angle:mix(a.angle,b.angle,t)});
const p=(x,y,angle=0)=>({x,y,angle});
const point=(pose,x,y)=>{const q=transformPoint({x,y},pose);return `${q.x} ${q.y}`;};
export function oxygenTubeFrame({capX,capY,tipX,progress=1,layout=1,seal=0,tipY=665}){
 const first=p(capX,capY,-90*(1-Math.min(1,seal/.4))),rest=p(930,700,-90),safe=p(565,400,0),end=p(tipX-235,tipY-30,0);
 let collector=progress<.65?blend(rest,safe,Math.min(1,progress/.65)):blend(safe,end,(progress-.65)/.35);
 if(progress===1)collector=end;
 const a=transformPoint({x:120,y:-100},first),b=transformPoint({x:0,y:-210},collector),hose=rubberGeometry(a,b,mix(mix(45,0,layout),90,progress),OXYGEN_HOSE_LENGTH);
 const firstPath=`M${point(first,0,95)}L${point(first,0,-80)}Q${point(first,0,-100)} ${point(first,20,-100)}L${point(first,120,-100)}`;
 const collectorPath=`M${point(collector,0,-210)}L${point(collector,0,65)}Q${point(collector,0,85)} ${point(collector,20,85)}L${point(collector,215,85)}Q${point(collector,235,85)} ${point(collector,235,65)}L${point(collector,235,30)}`;
 return{first,collector,hose,firstPath,collectorPath,path:firstPath+' '+hose.dPath+' '+collectorPath,tip:transformPoint({x:235,y:30},collector)};
}
