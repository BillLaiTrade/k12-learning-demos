import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {TRIANGLE,trace} from '../units/4/parts/4.5/assets/prism-optics.mjs';
import {explanationSvg,diagramLayout,refractionBends} from '../scripts/build-prism-explanations.mjs';
const asset=(kind,mobile)=>new URL(`../units/4/parts/4.5/assets/prism-${kind}-explanation${mobile?'-mobile':''}.svg`,import.meta.url);
const points=v=>v.split(' ').map(p=>p.split(',').map(Number)),sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),length=v=>Math.hypot(...v),angle=(a,b)=>Math.acos(Math.min(1,Math.max(-1,dot(a,b)/(length(a)*length(b)))));
test('桌機與手機四張圖可重建，玻璃均勻投影且可見光路不裁切',async()=>{
 for(const kind of['refraction','dispersion'])for(const mobile of[false,true]){
  const svg=await readFile(asset(kind,mobile),'utf8'),L=diagramLayout(kind,mobile);assert.equal(svg,explanationSvg(kind,mobile));
  const poly=points(svg.match(/data-glass="" points="([^"]+)"/)[1]);for(let i=0;i<3;i++)assert.ok(Math.abs(length(sub(poly[i],poly[(i+1)%3]))/length(sub(TRIANGLE[i],TRIANGLE[(i+1)%3]))-L.scale)<1e-5);
  for(const m of svg.matchAll(/<polyline[^>]+points="([^"]+)"/g))for(const[x,y]of points(m[1]))assert.ok(x>=0&&x<=L.width&&y>=0&&y<=L.height,`${kind}/${mobile}: ${x},${y}`);
 }
});
test('兩版兩條法線各自垂直真正折射面、穿過交點',async()=>{
 for(const mobile of[false,true]){const svg=await readFile(asset('refraction',mobile),'utf8'),poly=points(svg.match(/data-glass="" points="([^"]+)"/)[1]),ray=points(svg.match(/data-light="reference"[^>]+points="([^"]+)"/)[1]);
  for(const[i,name]of['entry','exit'].entries()){const ps=points(svg.match(new RegExp(`data-normal="${name}" points="([^"]+)"`))[1]),v=sub(ps[1],ps[0]);assert.ok(length(sub(ps[0].map((x,j)=>(x+ps[1][j])/2),ray[i]))<1e-3);assert.ok(poly.some((p,j)=>Math.abs(dot(sub(poly[(j+1)%3],p),v))/(length(sub(poly[(j+1)%3],p))*length(v))<1e-5));}
 }
});
test('各界面的原方向延長線與弧箭頭取自實際光路：入射靠近、出射遠離法線',async()=>{
 for(const mobile of[false,true]){const svg=await readFile(asset('refraction',mobile),'utf8');assert.match(svg,/入射：偏向法線/);assert.match(svg,/出射：偏離法線/);
  for(const b of refractionBends(mobile)){const ps=points(svg.match(new RegExp(`data-forward-reference="${b.name}" points="([^"]+)"`))[1]),v=sub(ps[1],ps[0]);assert.ok(length(sub(ps[0],b.center))<1e-3);assert.ok(Math.abs(Math.atan2(v[1],v[0])-b.start)<1e-6);assert.ok(b.end>b.start);const arc=svg.match(new RegExp(`data-bend="${b.name}" d="M([^ ]+) A([0-9.]+) ([0-9.]+) 0 0 1 ([^"]+)"`));assert.ok(arc);assert.ok(length(sub(points(arc[1])[0],b.startPoint))<1e-3);assert.equal(Number(arc[2]),b.radius);assert.equal(Number(arc[3]),b.radius);assert.ok(length(sub(points(arc[4])[0],b.endPoint))<1e-3);const before=angle(b.forward,b.normal),after=angle(b.outgoing,b.normal);assert.ok(b.name==='entry'?after<before:after>before);assert.ok(Math.abs(Math.atan2(b.endPoint[1]-b.center[1],b.endPoint[0]-b.center[0])-b.end)<1e-6);}
 }
});
test('色散原理圖明列分離放大，三色不重疊且都穿越兩面，原始數值保留',async()=>{
 for(const mobile of[false,true]){const svg=await readFile(asset('dispersion',mobile),'utf8'),L=diagramLayout('dispersion',mobile),reference=trace(),angles=[],ends=[];assert.match(svg,/色光分離放大示意，非實際角度/);
  for(const m of svg.matchAll(/data-light="(red|green|blue)" data-wavelength="([^"]+)" points="([^"]+)" data-source-path="([^"]+)"/g)){
   const actual=trace(Number(m[2]),{screenX:L.end}),raw=points(m[4]),ps=points(m[3]).map(([x,y])=>[(x-L.ox)/L.scale,(L.oy-y)/L.scale]);
   for(let i=0;i<4;i++)assert.ok(length(sub(raw[i],L.project(actual.points[i])))<1e-3);
   assert.ok(length(sub(ps[0],actual.points[1]))<1e-4);assert.ok(Math.abs(dot(sub(ps[1],reference.points[2]),reference.exitNormal))<1e-4);
   const inside=sub(ps[1],ps[0]),outside=sub(ps[2],ps[1]),entryNormal=reference.entryNormal.map(v=>-v);assert.ok(angle(inside,entryNormal)<angle([1,0],entryNormal));assert.ok(angle(outside,reference.exitNormal)>angle(inside,reference.exitNormal));angles.push(Math.atan2(-outside[1],outside[0]));ends.push(L.project(ps[2])[1]);
  }
  assert.equal(angles.length,3);assert.ok(angles[0]<angles[1]&&angles[1]<angles[2]);assert.ok(ends[1]-ends[0]>30&&ends[2]-ends[1]>30);
 }
});
