import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {TRIANGLE,trace} from '../units/4/parts/4.5/assets/prism-optics.mjs';
import {explanationSvg,diagramLayout} from '../scripts/build-prism-explanations.mjs';
const asset=(kind,mobile)=>new URL(`../units/4/parts/4.5/assets/prism-${kind}-explanation${mobile?'-mobile':''}.svg`,import.meta.url);
const points=v=>v.split(' ').map(p=>p.split(',').map(Number)),sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),length=v=>Math.hypot(...v);
test('桌機與手機四張圖可重建，玻璃與光路均勻投影且不裁切',async()=>{
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
test('三色保留正式兩介面折點及紅綠藍角度順序，使用混合顯示避免藍線覆蓋',async()=>{
 for(const mobile of[false,true]){const svg=await readFile(asset('dispersion',mobile),'utf8'),L=diagramLayout('dispersion',mobile),angles=[];assert.match(svg,/mix-blend-mode:screen/);
  for(const m of svg.matchAll(/data-light="(red|green|blue)" data-wavelength="([^"]+)" points="([^"]+)"/g)){const ray=trace(Number(m[2]),{screenX:L.end}),ps=points(m[3]);assert.equal(ps.length,3);for(let i=0;i<3;i++)assert.ok(length(sub(ps[i],L.project(ray.points[i+1])))<1e-3);const v=sub(ps[2],ps[1]);angles.push(Math.atan2(v[1],v[0]));}
  assert.equal(angles.length,3);assert.ok(angles[0]<angles[1]&&angles[1]<angles[2]);
 }
});
test('A區取樣框包含三色光，近看同一範圍且角度不變、各色可分辨',async()=>{
 for(const mobile of[false,true]){const svg=await readFile(asset('dispersion',mobile),'utf8'),L=diagramLayout('dispersion',mobile),ends=[];assert.match(svg,/data-roi=/);assert.match(svg,/出射光近看/);
  for(const[name,w]of[['red',650],['green',530],['blue',460]]){const ps=points(svg.match(new RegExp(`data-zoom-light="${name}" points="([^"]+)"`))[1]),r=trace(w),v=sub(ps[1],ps[0]);assert.ok(Math.abs(v[0]-L.zoom.scale)<1e-5);assert.ok(Math.abs(Math.atan2(v[1],v[0])-Math.atan2(-r.out[1],r.out[0]))<1e-6);for(const x of[L.roi.left,L.roi.right])assert.ok(Math.abs(trace(w,{screenX:x}).landing-L.roi.center)<.5);ends.push(ps[1][1]);}
  assert.ok(ends[1]-ends[0]>30&&ends[2]-ends[1]>30);
 }
});
