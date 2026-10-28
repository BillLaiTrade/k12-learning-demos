import {MIRROR_SCENE as base, mirrorPoint, spriteAt} from './mirror-image-geometry.mjs?v=1';

export const COMPARISON = Object.freeze({
  mirrorX: base.mirrorX, top: base.mirrorTop, floor: base.mirrorBottom,
  source: Object.freeze([...base.source, 0]),
  image: Object.freeze([...mirrorPoint(base.source), 0]),
  eye: Object.freeze([base.eyeX, 180, 160]), pupilRadius: 2,
  sideBear: Object.freeze(spriteAt(base.source, base.bearNose, base.bearSize)),
  observer: Object.freeze(spriteAt([base.eyeX, 180], base.observerEye, base.observerSize)),
});
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const dot=(a,b)=>a.reduce((v,n,i)=>v+n*b[i],0);
export const unit=a=>{const length=Math.hypot(...a);return a.map(v=>v/length);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

export function comparisonRay(eye=COMPARISON.eye) {
  const {source,image,mirrorX}=COMPARISON;
  const t=(mirrorX-eye[0])/(image[0]-eye[0]);
  const hit=eye.map((v,i)=>v+t*(image[i]-v));
  const incoming=unit(sub(hit,source)),outgoing=unit(sub(eye,hit));
  return {eye:[...eye],source:[...source],image:[...image],hit,incoming,outgoing,
    reflected:[source,hit,eye],direct:[image,eye],extension:[hit,image]};
}
export function pupilBundle() {
  return [-2,0,2].map(y=>comparisonRay(add(COMPARISON.eye,[0,y,0])));
}
export function sidePath(points,arrows=false) {
  const p=arrows&&points.length===2?[points[0],points[0].map((v,i)=>(v+points[1][i])/2),points[1]]:points;
  return 'M'+p.map(point=>point.slice(0,2).join(',')).join('L');
}
// Both eye views use this same camera. z provides the foreground parallax that
// is absent from the side projection; the pupil rays above use the same 3D eye.
export function comparisonCamera() {
  const eye=[...COMPARISON.eye],forward=unit(sub(COMPARISON.image,eye));
  const right=unit(cross([0,1,0],forward).map(v=>-v)),down=cross(right,forward);
  return {eye,forward,right,down,focal:420,center:[450,145],width:900,height:400};
}
export function project(camera,point) {
  const v=sub(point,camera.eye),depth=dot(v,camera.forward);
  return [camera.center[0]+camera.focal*dot(v,camera.right)/depth,
    camera.center[1]+camera.focal*dot(v,camera.down)/depth,depth];
}
export const VIEW_PLANES=Object.freeze({
  front:Object.freeze({x:COMPARISON.image[0],top:440-203*132/385,height:203,left:-205*209/400,width:205}),
  rear:Object.freeze({x:COMPARISON.source[0],top:367,height:203,left:-102.5,width:205}),
  frame:Object.freeze({x:COMPARISON.mirrorX,top:COMPARISON.top,height:COMPARISON.floor-COMPARISON.top,left:-180,width:360}),
  glass:Object.freeze({x:COMPARISON.mirrorX,top:COMPARISON.top+10,height:COMPARISON.floor-COMPARISON.top-20,left:-170,width:340}),
});
export function planePoint(plane,u,v) {return [plane.x,plane.top+plane.height*v,plane.left+plane.width*u];}
export function quad(camera,plane) {return [[0,0],[1,0],[1,1],[0,1]].map(([u,v])=>project(camera,planePoint(plane,u,v)));}

// Clip world geometry before perspective division. A tabletop may cross behind
// the camera; projecting those vertices directly would invert its visible part.
export function clipNear(camera,points,closed=true,near=5) {
  const depth=p=>dot(sub(p,camera.eye),camera.forward);
  const result=[];
  const count=closed?points.length:points.length-1;
  if(!closed&&depth(points[0])>=near)result.push(points[0]);
  for(let i=0;i<count;i++) {
    const a=points[i],b=points[(i+1)%points.length],da=depth(a),db=depth(b);
    if((da>=near)!==(db>=near)) {
      const t=(near-da)/(db-da);result.push(a.map((v,j)=>v+t*(b[j]-v)));
    }
    if(db>=near)result.push(b);
  }
  return result;
}
