// A deliberately enlarged teaching model. Optics and both cameras share this geometry.
export const RADII=Object.freeze({sun:6.5,earth:1.45,moon:1.15});
export const ORBIT=Object.freeze({radius:4.8,inclination:35,initial:270,speed:4});
export const EARTH=Object.freeze([2.6,0,0]),SUN=Object.freeze([-13,0,0]);
export const LIGHT=Object.freeze([-1,0,0]),MAIN_VIEW=Object.freeze([0,18,14]);
export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const scale=(a,s)=>a.map(v=>v*s);
export const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
export const length=a=>Math.hypot(...a);
export const unit=a=>scale(a,1/Math.max(length(a),1e-12));
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const wrapAngle=d=>((d%360)+360)%360;
export function orbitBasis(){const i=ORBIT.inclination*Math.PI/180,u=[-Math.cos(i),-Math.sin(i),0],v=[0,0,1];return{u,v,normal:unit(cross(u,v))};}
export function lunarVector(angle){const a=angle*Math.PI/180,{u,v}=orbitBasis();return scale(add(scale(u,Math.cos(a)),scale(v,Math.sin(a))),ORBIT.radius);}
export function orbitAngle(point){const {u,v}=orbitBasis();return wrapAngle(Math.atan2(dot(point,v),dot(point,u))*180/Math.PI);}
export function positionsAt(angle){return{sun:[...SUN],earth:[...EARTH],moon:add(EARTH,lunarVector(angle))};}
// A representative observer on the visible upper surface, always with Moon above horizon.
// The observer relocates with lunar direction; this does not model a fixed city or its day/night.
export function observerAt(angle){
  const d=unit(lunarVector(angle)),up=unit(add(scale(d,.8),[0,.85,0])),forward=unit(sub(d,scale(up,dot(d,up)))),right=unit(cross(up,forward));
  const base=add(EARTH,scale(up,RADII.earth)),eye=add(add(base,scale(up,.49)),scale(forward,.105));
  return{base,eye,up,forward,right};
}
export function sphereBlocks(a,b,center,radius){const d=unit(sub(b,a)),len=length(sub(b,a)),q=sub(a,center),p=dot(q,d),h=p*p-dot(q,q)+radius*radius;if(h<=0)return false;const near=-p-Math.sqrt(h);return near>1e-5&&near<len-1e-5;}
const normals=Array.from({length:900},(_,i)=>{const y=1-2*(i+.5)/900,r=Math.sqrt(1-y*y),a=i*Math.PI*(3-Math.sqrt(5));return[r*Math.cos(a),y,r*Math.sin(a)];});
export function reflectionState(angle){
  const positions=positionsAt(angle),observer=observerAt(angle),view=unit(sub(observer.eye,positions.moon)),candidates=[];
  for(const normal of normals){
    const point=add(positions.moon,scale(normal,RADII.moon)),sunCos=dot(normal,LIGHT),viewCos=dot(normal,unit(sub(observer.eye,point))),mainCos=dot(normal,unit(MAIN_VIEW));
    if(sunCos>.025&&viewCos>.025&&mainCos>.025)candidates.push({point,normal,sunCos,viewCos,score:sunCos*viewCos*Math.sqrt(mainCos)});
  }
  candidates.sort((a,b)=>b.score-a.score);const patches=[];
  for(const p of candidates){if(patches.every(other=>dot(p.normal,other.normal)<.92))patches.push(p);if(patches.length===3)break;}
  return{positions,observer,view,patches};
}
export function rayPaths(state){
  const incident=[],scattered=[];let reflected=null;
  state.patches.forEach((patch,i)=>{
    const end=patch.point,start=[SUN[0]+Math.sqrt(RADII.sun**2-end[1]**2-end[2]**2)+.015,end[1],end[2]];
    incident.push({start,end});
    const tangent=unit(cross(patch.normal,[0,1,0])),dir=unit(add(scale(patch.normal,.95),scale(tangent,i%2?.3:-.3)));
    if(i)scattered.push({start:end,end:add(end,scale(dir,1.05))});
    else reflected={start:end,end:state.observer.eye};
  });
  return{incident,reflected,scattered};
}
