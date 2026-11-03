import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {TRIANGLE,trace} from '../units/4/parts/4.5/assets/prism-optics.mjs';
import {explanationSvg} from '../scripts/build-prism-explanations.mjs';
const asset=kind=>new URL(`../units/4/parts/4.5/assets/prism-${kind}-explanation.svg`,import.meta.url);
const points=value=>value.split(' ').map(p=>p.split(',').map(Number));
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),length=v=>Math.hypot(...v);
test('兩張靜態圖可由正式模型重建，使用相同均勻比例，所有折點都在圖面內',async()=>{
 for(const kind of ['refraction','dispersion']){
  const svg=await readFile(asset(kind),'utf8');assert.equal(svg,explanationSvg(kind));
  const poly=points(svg.match(/<polygon points="([^"]+)" fill="url/)[1]);
  for(let i=0;i<3;i++)assert.ok(Math.abs(length(sub(poly[i],poly[(i+1)%3]))/length(sub(TRIANGLE[i],TRIANGLE[(i+1)%3]))-5)<1e-5);
  for(const match of svg.matchAll(/<polyline[^>]+points="([^"]+)"/g))for(const [x,y]of points(match[1]))assert.ok(x>=0&&x<=850&&y>=0&&y<=390);
 }
});
test('兩條法線各自垂直真正的折射面，並穿過對應交點',async()=>{
 const svg=await readFile(asset('refraction'),'utf8'),poly=points(svg.match(/<polygon points="([^"]+)" fill="url/)[1]);
 const ray=points(svg.match(/data-light="reference"[^>]+points="([^"]+)"/)[1]);
 for(const [i,name]of ['entry','exit'].entries()){
  const ps=points(svg.match(new RegExp(`data-normal="${name}" points="([^"]+)"`))[1]),direction=sub(ps[1],ps[0]);
  assert.ok(length(sub(ps[0].map((v,j)=>(v+ps[1][j])/2),ray[i]))<1e-3);
  const perpendicular=poly.some((p,j)=>Math.abs(dot(sub(poly[(j+1)%3],p),direction))/(length(sub(poly[(j+1)%3],p))*length(direction))<1e-5);
  assert.equal(perpendicular,true);
 }
});
test('代表色光保留正式兩介面折點與角差：同向入射、紅光偏折較小、藍光較大',async()=>{
 const svg=await readFile(asset('dispersion'),'utf8'),angles=[];
 for(const m of svg.matchAll(/data-light="(red|green|blue)" data-wavelength="([^"]+)" points="([^"]+)"/g)){
  const ray=trace(Number(m[2]),{screenX:100}),ps=points(m[3]);assert.equal(ps.length,3);
  for(let i=0;i<3;i++){assert.ok(Math.abs(ps[i][0]-(350+5*ray.points[i+1][0]))<1e-4);assert.ok(Math.abs(ps[i][1]-(210-5*ray.points[i+1][1]))<1e-4);}
  const inside=sub(ps[1],ps[0]),outside=sub(ps[2],ps[1]);assert.ok(inside[1]>0);assert.ok(Math.abs(Math.atan2(inside[1],inside[0])-Math.atan2(outside[1],outside[0]))>.05);angles.push(Math.atan2(outside[1],outside[0]));
 }
 assert.equal(angles.length,3);assert.ok(angles[0]<angles[1]&&angles[1]<angles[2]);
});

test('局部近看採相同兩軸倍率，不改變各色光的角差',async()=>{
 const svg=await readFile(asset('dispersion'),'utf8');
 for(const [name,w]of [['red',650],['green',530],['blue',460]]){const ps=points(svg.match(new RegExp(`data-zoom-light="${name}" points="([^"]+)"`))[1]),v=sub(ps[1],ps[0]),r=trace(w);assert.ok(Math.abs(v[0]-195)<1e-8);assert.ok(Math.abs(Math.atan2(v[1],v[0])-Math.atan2(-r.out[1],r.out[0]))<1e-6);}
});
