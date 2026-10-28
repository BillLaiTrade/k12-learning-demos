// Scene coordinates follow the photographic apparatus, not measured lengths.
export const SAMPLE_CUP = Object.freeze({x:620,y:491,w:228,h:281});
export const SAMPLE_BOTTLE = Object.freeze({
  home:{x:410,y:458,angle:0},width:320,height:500,
  lip:{x:73,y:-218},pourPoint:{x:714,y:450},capacity:6,fullAreaFraction:.67,
  // The inner glass outline, including shoulders and the open neck.
  interior:[[-70,-218],[70,-218],[70,-178],[87,-157],[125,-132],[137,-100],
    [137,202],[128,216],[90,226],[-90,226],[-128,216],[-137,202],
    [-137,-100],[-125,-132],[-87,-157],[-70,-178]]
});
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
export function transformPoint(point,pose){
  const c=Math.cos(pose.angle),s=Math.sin(pose.angle);
  return {x:pose.x+point.x*c-point.y*s,y:pose.y+point.x*s+point.y*c};
}
export function polygonArea(points){
  return Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;},0))/2;
}
export function clipBelow(points,line){
  const result=[];
  for(let i=0;i<points.length;i++){
    const p=points[(i+points.length-1)%points.length],q=points[i],a=p.y>=line,b=q.y>=line;
    if(a!==b){const f=(line-p.y)/(q.y-p.y);result.push({x:mix(p.x,q.x,f),y:line});}
    if(b)result.push(q);
  }
  return result;
}
export function bottleInterior(pose){return SAMPLE_BOTTLE.interior.map(([x,y])=>transformPoint({x,y},pose));}
const angleCache=new Map();
export function pouringAngle(portions){
  const target=clamp(portions/SAMPLE_BOTTLE.capacity)*SAMPLE_BOTTLE.fullAreaFraction;
  // A progressively emptier bottle must tilt further for liquid to reach its lip.
  const key=Math.round(target*1000000);if(angleCache.has(key))return angleCache.get(key);
  let lo=0,hi=Math.PI*.78;
  for(let i=0;i<28;i++){
    const angle=(lo+hi)/2,pose={x:0,y:0,angle},shape=bottleInterior(pose),lip=transformPoint(SAMPLE_BOTTLE.lip,pose);
    const fraction=polygonArea(clipBelow(shape,lip.y))/polygonArea(shape);
    if(fraction>target)lo=angle;else hi=angle;
  }
  const angle=(lo+hi)/2;if(angleCache.size>4096)angleCache.clear();angleCache.set(key,angle);return angle;
}
export function pouringPose(portions){
  const angle=pouringAngle(portions),offset=transformPoint(SAMPLE_BOTTLE.lip,{x:0,y:0,angle});
  // Lower the nearly empty bottle slightly, keeping its raised base inside the scene.
  const lower=34*Math.max(0,1-portions);
  return {x:SAMPLE_BOTTLE.pourPoint.x-offset.x,y:SAMPLE_BOTTLE.pourPoint.y+lower-offset.y,angle};
}
function interpolatePose(a,b,t){return {x:mix(a.x,b.x,t),y:mix(a.y,b.y,t),angle:mix(a.angle,b.angle,t)};}
export function cupSurface(fill){return SAMPLE_CUP.y+SAMPLE_CUP.h*.89-SAMPLE_CUP.h*.67*clamp(fill);}
export function samplingFrame(progress,stockAfter,reduced=false){
  const t=clamp(progress),emitted=smooth((t-.28)/.40),received=smooth((t-.33)/.40);
  const sourcePortions=stockAfter+1-emitted,home=SAMPLE_BOTTLE.home;
  let pose;
  if(reduced){
    // Remove the travelling arc, while retaining a real tilted source during pouring.
    pose=t<.26||t>=.78?{...home}:pouringPose(sourcePortions);
  }else if(t<.12){pose=interpolatePose(home,{x:410,y:360,angle:0},smooth(t/.12));}
  else if(t<.26){pose=interpolatePose({x:410,y:360,angle:0},pouringPose(stockAfter+1),smooth((t-.12)/.14));}
  else if(t<.78){pose=pouringPose(sourcePortions);}
  else {pose=interpolatePose(pouringPose(stockAfter),home,smooth((t-.78)/.22));}
  const mouth=transformPoint(SAMPLE_BOTTLE.lip,pose),head=clamp((t-.28)/.05),tail=clamp((t-.68)/.05);
  const stream=head>tail?{mouth,target:{x:SAMPLE_CUP.x+SAMPLE_CUP.w*.51,y:cupSurface(received)},head,tail}:null;
  return {pose,mouth,emitted,received,sourcePortions,inTransit:emitted-received,stream};
}
export function streamPoint(stream,u){
  // Horizontal momentum plus downward acceleration; both endpoints stay in scene space.
  return {x:mix(stream.mouth.x,stream.target.x,u),y:mix(stream.mouth.y,stream.target.y,u*u)};
}
export function bottleLiquid(pose,portions){
  const shape=bottleInterior(pose),fraction=clamp(portions/SAMPLE_BOTTLE.capacity)*SAMPLE_BOTTLE.fullAreaFraction;
  if(fraction===0)return {shape,filled:[],line:Math.max(...shape.map(p=>p.y)),left:0,right:0};
  const target=polygonArea(shape)*fraction;
  let lo=Math.min(...shape.map(p=>p.y)),hi=Math.max(...shape.map(p=>p.y));
  for(let i=0;i<28;i++){const mid=(lo+hi)/2;if(polygonArea(clipBelow(shape,mid))>target)lo=mid;else hi=mid;}
  const line=(lo+hi)/2,filled=clipBelow(shape,line),crossings=[];
  for(let i=0;i<shape.length;i++){
    const p=shape[i],q=shape[(i+1)%shape.length];
    if((p.y>=line)!==(q.y>=line)){const f=(line-p.y)/(q.y-p.y);crossings.push(mix(p.x,q.x,f));}
  }
  return {shape,filled,line,left:Math.min(...crossings),right:Math.max(...crossings)};
}
