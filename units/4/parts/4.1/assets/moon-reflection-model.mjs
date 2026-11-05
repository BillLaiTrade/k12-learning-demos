// Physics uses Earth radii; the renderer compresses distances independently.
export const PHYSICAL=Object.freeze({earth:1,moon:.2727,lunarDistance:60.3,solarAngularRadius:.00465});
export const RADII=Object.freeze({sun:1.65,earth:1.05,moon:1.05*PHYSICAL.moon});
export const ORBIT=Object.freeze({radius:4.25,inclination:5.145,node:35,initial:95});
export const EARTH=Object.freeze([1.8,0,0]);
export const SUN=Object.freeze([-10,0,0]);
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const scale=(a,s)=>a.map(v=>v*s);
export const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
export const length=a=>Math.hypot(...a);
export const unit=a=>scale(a,1/Math.max(length(a),1e-10));
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const radians=d=>d*Math.PI/180;
export const wrapAngle=d=>((d%360)+360)%360;
export function orbitBasis(node=ORBIT.node){
  const n=radians(node),i=radians(ORBIT.inclination);
  const u=[Math.cos(n),0,Math.sin(n)],v=[-Math.sin(n)*Math.cos(i),Math.sin(i),Math.cos(n)*Math.cos(i)];
  return{u,v,normal:unit(cross(v,u))};
}
export function lunarVector(angle,radius=ORBIT.radius,node=ORBIT.node){
  const {u,v}=orbitBasis(node),a=radians(angle);
  return scale(add(scale(u,Math.cos(a)),scale(v,Math.sin(a))),radius);
}
export function orbitAngle(point){const {u,v}=orbitBasis();return wrapAngle(Math.atan2(dot(point,v),dot(point,u))*180/Math.PI);}
export function positionsAt(angle){return{sun:[...SUN],earth:[...EARTH],moon:add(EARTH,lunarVector(angle))};}
// Representative directions across the distant solar disc, parallel across Earth–Moon.
export const SUN_DIRECTIONS=Object.freeze(Array.from({length:13},(_,i)=>{
  if(!i)return[-1,0,0];const r=Math.sqrt((i-.5)/12)*PHYSICAL.solarAngularRadius,a=i*Math.PI*(3-Math.sqrt(5));
  return unit([-1,r*Math.cos(a),r*Math.sin(a)]);
}));
export function rayBlocked(point,direction,center,radius){
  const q=sub(point,center),b=dot(q,direction),h=b*b-dot(q,q)+radius*radius;
  return h>0&&-b-Math.sqrt(h)>1e-6;
}
export function sunlightAt(point,center,radius){return SUN_DIRECTIONS.filter(d=>!rayBlocked(point,d,center,radius)).length/SUN_DIRECTIONS.length;}
export function reflectionState(angle,count=1600,node=ORBIT.node){
  const moon=lunarVector(angle,PHYSICAL.lunarDistance,node),view=unit(scale(moon,-1));
  let visibleArea=0,brightArea=0,litCount=0;const samples=[],shared=[];
  for(let i=0;i<count;i++){
    const y=1-2*(i+.5)/count,r=Math.sqrt(1-y*y),a=i*Math.PI*(3-Math.sqrt(5)),normal=[r*Math.cos(a),y,r*Math.sin(a)];
    const point=add(moon,scale(normal,PHYSICAL.moon)),sunCos=-normal[0],viewCos=dot(normal,view),sunlight=sunCos>0?sunlightAt(point,[0,0,0],PHYSICAL.earth):0;
    if(viewCos>0){visibleArea+=viewCos;if(sunlight>0)brightArea+=viewCos;}
    if(sunlight>0){const sample={point,normal,sunCos,viewCos};samples.push(sample);litCount++;if(viewCos>0)shared.push(sample);}
  }
  const patches=[];for(const sample of shared.sort((a,b)=>b.sunCos*b.viewCos-a.sunCos*a.viewCos)){
    if(patches.every(p=>dot(p.normal,sample.normal)<.78))patches.push(sample);if(patches.length===3)break;
  }
  return{fraction:visibleArea?brightArea/visibleArea:0,earthDirection:view,patches,reachesEarth:patches.length>0,shadowed:!litCount,samples,physicalMoon:moon};
}
