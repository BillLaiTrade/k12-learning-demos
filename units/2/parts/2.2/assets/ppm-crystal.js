// A convex, corner-trimmed sugar crystal. Plane faces stay planar and closed;
// the renderer integrates its volume before applying mass / density scaling.
export function sugarCrystalTriangles() {
  const corners=[],vertices=[];
  for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
    const cut=.35+.07*Math.sin(sx*2+sy*3+sz*5);
    const face=[[sx*cut,sy,sz],[sx,sy*cut,sz],[sx,sy,sz*cut]];
    corners.push({normal:[sx,sy,sz],points:face});vertices.push(...face);
  }
  const faces=[...corners];
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
    const normal=[0,0,0];normal[axis]=sign;faces.push({normal,points:vertices.filter(p=>Math.abs(p[axis]-sign)<1e-8)});
  }
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),unit=a=>{const d=Math.hypot(...a);return a.map(v=>v/d);};
  const positions=[];
  for(const face of faces){
    const n=unit(face.normal),center=[0,1,2].map(i=>face.points.reduce((s,p)=>s+p[i],0)/face.points.length),u=unit(cross(n,Math.abs(n[1])<.8?[0,1,0]:[1,0,0])),v=cross(n,u);
    const points=face.points.slice().sort((a,b)=>{const pa=a.map((x,i)=>x-center[i]),pb=b.map((x,i)=>x-center[i]);return Math.atan2(dot(pa,v),dot(pa,u))-Math.atan2(dot(pb,v),dot(pb,u));});
    for(let i=0;i<points.length;i++)positions.push(...center,...points[i],...points[(i+1)%points.length]);
  }
  return positions;
}
