// Coordinates match the cutaway (y points down). Lengths are illustrative units.
// Every visible sample is traced through finite, one-sided plane mirrors and
// the same closed, opaque housing; images never switch at a target angle.
export const OPTICS = Object.freeze({
  upper: [565, 190, 0], lower: [565, 590, 0], eye: [755, 590, 0],
  halfMirror: 60, halfDepth: 50, mirrorDepth: 47, minAngle: 30, maxAngle: 65,
  field: 4.2, exteriorPlane: -1100,
});
const radians = degrees => degrees * Math.PI / 180;
export const unit = v => { const n = Math.hypot(...v); return v.map(x => x / n); };
const dot = (a, b) => a.reduce((n, x, i) => n + x * b[i], 0);
export const reflect = (direction, normal) => {
  const d = dot(direction, normal);
  return direction.map((v, i) => v - 2 * d * normal[i]);
};
export function mirror(index, angle) {
  const a = radians(angle), tangent = [Math.cos(a), Math.sin(a), 0];
  const normal = index === 0 ? [-tangent[1], tangent[0], 0] : [tangent[1], -tangent[0], 0];
  const center = index === 0 ? OPTICS.upper : OPTICS.lower;
  return { center, normal, tangent, ends: [-1, 1].map(s => center.map((n, i) => n + s * OPTICS.halfMirror * tangent[i])) };
}
// Full perimeter of the union of the vertical tube and horizontal eyepiece.
// Only the upper left aperture and right eyepiece are optically open.
const boundaries = [
  [[508,128],[622,128],'wall'], [[622,128],[622,555],'wall'],
  [[622,555],[765,555],'wall'], [[765,555],[765,625],'eye'],
  [[765,625],[622,625],'wall'], [[622,625],[622,652],'wall'],
  [[622,652],[508,652],'wall'], [[508,652],[508,225],'wall'],
  [[508,225],[508,155],'outside'], [[508,155],[508,128],'wall'],
];
export const HOUSING = boundaries;
const cross = (a,b) => a[0]*b[1]-a[1]*b[0];
function inHousing(x,y) {
  return (x>=508 && x<=622 && y>=128 && y<=652) || (x>=622 && x<=765 && y>=555 && y<=625);
}
export function traceRay(origin, direction, angles=[45,45]) {
  let p = [...origin], d = unit(direction);
  const points = [[...p]], hits = [];
  for (let bounce=0; bounce<8; bounce++) {
    let nearest = null;
    const offer = (t, type, extra={}) => {
      if (t > 1e-6 && (!nearest || t < nearest.t)) nearest={t,type,...extra};
    };
    for (const [a,b,type] of boundaries) {
      const edge=[b[0]-a[0],b[1]-a[1]], den=cross(d,edge);
      if (Math.abs(den)<1e-10) continue;
      const q=[a[0]-p[0],a[1]-p[1]], t=cross(q,edge)/den, u=cross(q,d)/den;
      if (u>=-1e-8 && u<=1+1e-8 && Math.abs(p[2]+t*d[2])<=OPTICS.halfDepth+1e-8) offer(t,type);
    }
    for (const z of [-OPTICS.halfDepth,OPTICS.halfDepth]) {
      const t=(z-p[2])/d[2];
      if (Number.isFinite(t) && inHousing(p[0]+t*d[0],p[1]+t*d[1])) offer(t,'wall');
    }
    for (let i=0;i<2;i++) {
      const m=mirror(i,angles[i]), den=dot(d,m.normal);
      if(Math.abs(den)<1e-10) continue;
      const t=dot(m.center.map((n,j)=>n-p[j]),m.normal)/den;
      const hit=p.map((n,j)=>n+t*d[j]), offset=hit.map((n,j)=>n-m.center[j]);
      if(Math.abs(dot(offset,m.tangent))<=OPTICS.halfMirror+1e-8 && Math.abs(hit[2])<=OPTICS.mirrorDepth+1e-8) offer(t,den<0?'mirror':'mirror-back',{index:i,normal:m.normal});
    }
    if(!nearest) return {kind:'blocked',reason:'no-exit',points,hits,direction:d};
    p=p.map((n,i)=>n+nearest.t*d[i]); points.push([...p]);
    if(nearest.type==='mirror') {
      const outgoing=reflect(d,nearest.normal);
      hits.push({index:nearest.index,point:[...p],incident:[...d],normal:nearest.normal,reflected:outgoing});
      d=outgoing;
    } else {
      return {kind:nearest.type==='outside'?'outside':nearest.type==='eye'?'eye':'blocked',reason:nearest.type,points,hits,direction:d};
    }
  }
  return {kind:'blocked',reason:'bounce-limit',points,hits,direction:d};
}
export function viewRay(horizontal, vertical, angles) {
  // Pinhole eye looking left: retinal field, no extra lens or magnification.
  return traceRay(OPTICS.eye,[-1,Math.tan(radians(vertical)),Math.tan(radians(horizontal))],angles);
}
export function exteriorSample(ray) {
  if(ray.kind!=='outside' || ray.direction[0]>=0) return null;
  const p=ray.points.at(-1), t=(OPTICS.exteriorPlane-p[0])/ray.direction[0];
  const y=p[1]+t*ray.direction[1], z=p[2]+t*ray.direction[2];
  // The illustrated distant scene is a radiance billboard. Coordinates map
  // to the same boat/sky/sea art used in the cutaway, not a canned success view.
  return {x:170+z*.62,y:190+(y-190)*.62};
}
export function observe(angles, count=17) {
  let clear=0,boat=0,sky=0,sea=0,blocked=0;
  for(let y=0;y<count;y++) for(let x=0;x<count;x++) {
    const nx=2*x/(count-1)-1, ny=2*y/(count-1)-1;
    if(nx*nx+ny*ny>1) continue;
    const ray=viewRay(nx*OPTICS.field,ny*OPTICS.field,angles), s=exteriorSample(ray);
    if(!s) {blocked++;continue;}
    clear++;
    if(s.x>=70 && s.x<=265 && s.y>=125 && s.y<=245) boat++;
    else if(s.y<250) sky++; else sea++;
  }
  const center=viewRay(0,0,angles), sample=exteriorSample(center);
  // Assessment uses a central vessel feature, plus an unobstructed field.
  const target=Boolean(sample && sample.x>=145 && sample.x<=205 && sample.y>=170 && sample.y<=215 && clear/(clear+blocked)>.7);
  const kind=clear===0?'blocked':boat/clear>.2?'boat':sea>sky?'sea':'sky';
  return {kind,target,clear,boat,sky,sea,blocked,center,sample};
}
export function returnSignal(angles) {
  // A real ray launched leftwards from the former eye, computed independently
  // from the receiver test. It never jumps to the known correct path.
  const ray=traceRay(OPTICS.eye,[-1,0,0],angles);
  let receiver=false, endpoint=null;
  if(ray.kind==='outside' && ray.direction[0]<0) {
    const p=ray.points.at(-1), t=(170-p[0])/ray.direction[0];
    endpoint=p.map((n,i)=>n+t*ray.direction[i]);
    receiver=Math.abs(endpoint[1]-190)<14 && Math.abs(endpoint[2])<14;
  }
  return {ray,receiver,endpoint};
}
