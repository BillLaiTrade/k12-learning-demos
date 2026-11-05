export const RADII = Object.freeze({sun:1.4,earth:1.05,moon:.66});
export const INITIAL = Object.freeze({sun:[-6,0,-1.8],earth:[2.7,0,2.7],moon:[1,0,-1.6]});
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const scale=(a,s)=>a.map(v=>v*s);
export const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
export const length=a=>Math.hypot(...a);
export const unit=a=>scale(a,1/Math.max(length(a),1e-10));
// Interior intersection along a finite light segment, excluding its endpoints.
export function sphereBlocks(a,b,center,radius){
  const v=sub(b,a),d=length(v),dir=unit(v),oc=sub(a,center);
  const projection=dot(oc,dir),disc=projection*projection-dot(oc,oc)+radius*radius;
  if(disc<=0)return false;
  const near=-projection-Math.sqrt(disc),far=-projection+Math.sqrt(disc);
  return far>1e-5&&near<d-1e-5;
}
export function constrainPosition(name,candidate,positions){
  let p=[Math.max(-9,Math.min(9,candidate[0])),0,Math.max(-6,Math.min(6,candidate[2]))];
  for(let pass=0;pass<5;pass++)for(const other of Object.keys(RADII)){
    if(other===name)continue;
    const delta=sub(p,positions[other]),distance=length(delta),minimum=RADII[name]+RADII[other]+.45;
    if(distance<minimum)p=add(positions[other],scale(distance>1e-8?unit(delta):[1,0,0],minimum));
  }
  if(Math.abs(p[0])>9||Math.abs(p[2])>6||Object.keys(RADII).some(other=>other!==name&&length(sub(p,positions[other]))<RADII[name]+RADII[other]+.45-1e-8))return [...positions[name]];
  return p;
}
// Uniform-area surface samples; projected visible area is weighted by n·view.
// The orthographic Earth inset uses that same viewing direction.
export function reflectionState(positions,count=1200){
  const {sun,earth,moon}=positions,view=unit(sub(earth,moon)),samples=[];
  let visibleArea=0,brightArea=0,litCount=0,best=null,bestScore=-1,litBest=null,litScore=-1;
  const golden=Math.PI*(3-Math.sqrt(5));
  for(let i=0;i<count;i++){
    const y=1-2*(i+.5)/count,r=Math.sqrt(1-y*y),n=[r*Math.cos(i*golden),y,r*Math.sin(i*golden)];
    const point=add(moon,scale(n,RADII.moon)),sunCos=dot(n,unit(sub(sun,point))),viewCos=dot(n,view);
    const lit=sunCos>0&&!sphereBlocks(point,sun,earth,RADII.earth);
    if(viewCos>0){visibleArea+=viewCos;if(lit)brightArea+=viewCos;}
    if(lit){
      litCount++;const sample={point,normal:n,sunCos,viewCos};samples.push(sample);
      if(sunCos>litScore){litScore=sunCos;litBest=sample;}
      const score=sunCos*viewCos;
      if(viewCos>0&&score>bestScore){bestScore=score;best=sample;}
    }
  }
  return {fraction:visibleArea?brightArea/visibleArea:0,earthDirection:view,patch:best||litBest,reachesEarth:!!best,shadowed:litCount===0,samples};
}
