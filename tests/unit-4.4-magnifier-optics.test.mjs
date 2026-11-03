import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MAGNIFIER as G,magnifierState,moveMagnifier,magnifierRays} from '../units/4/parts/4.4/assets/magnifier-optics.mjs';
test('焦距內形成正立放大虛像，固定眼睛所見依像距與像高計算',()=>{
 let previous=0;for(const object of [30,45,60,75,90]){const s={object,screen:95,screenIn:false},g=magnifierState(s);assert.equal(g.type,'virtual');assert.ok(g.m>1&&g.v<0);assert.ok(g.imageScale>previous);assert.ok(Math.abs(g.imageScale-g.m/((G.eye-g.v)*G.scale))<1e-10);assert.ok(Math.abs(g.angularGain-g.m*(G.eye+object)/(G.eye-g.v))<1e-10);assert.ok(g.angularGain>1);previous=g.imageScale;}
 assert.notEqual(magnifierState({object:60,screen:95}).angularGain,2.5);
});
test('不同物點的實線入固定瞳孔，延長線交於同一虛像位置',()=>{
 for(const object of [30,60,90]){const s={object,screen:95},g=magnifierState(s),paths=magnifierRays(s);assert.equal(paths.length,6);for(const r of paths){assert.equal(r.end[0],G.eye*G.scale);assert.ok(Math.abs(r.end[1]-G.axis)<=.02500001);assert.ok(Math.abs(r.lens[1]-G.axis)<=G.aperture);const t=r.virtual[0]/r.end[0];assert.ok(Math.abs(r.lens[1]+t*(r.end[1]-r.lens[1])-r.virtual[1])<1e-9);assert.ok(Math.abs(r.virtual[1]-(G.axis+g.m*(r.name==='top'?.44:-.4)))<1e-9);}}
});
test('屏幕只有散開光斑，半徑與實線光路包絡一致且會擋住眼睛',()=>{
 for(const object of [30,60,90])for(const screen of [45,95,140]){const s={object,screen,screenIn:true},g=magnifierState(s);assert.ok(g.spread>0);assert.equal(g.blocked,true);const top=magnifierRays(s,'top').map(r=>r.end[1]);assert.ok(Math.abs((Math.max(...top)-Math.min(...top))/2-g.spread)<1e-9);assert.equal(magnifierRays(s)[0].end[0],screen*G.scale);}
});
test('圖卡可跨過F至2F，屏幕在鏡片與眼睛之間，移動單一器材不改另一器材',()=>{
 const s={object:60,screen:95,screenIn:true};assert.equal(moveMagnifier(s,'object',1000).object,200);assert.equal(moveMagnifier(s,'object',0).object,30);assert.equal(moveMagnifier(s,'screen',1000).screen,140);assert.ok(G.screenMax<G.eye);assert.deepEqual(moveMagnifier(s,'object',45),{...s,object:45});assert.deepEqual(moveMagnifier(s,'object',NaN),s);assert.equal(magnifierState({...s,object:90}).virtualOutside,true);
});

test('跨越F時連續保留真實成像，焦點平行光的眼睛投影沒有除零',()=>{
 for(const object of [30,90,99.9,100,100.1,110,150,200]){
  const g=magnifierState({object,screen:95,screenIn:false}),rays=magnifierRays({object,screen:95,screenIn:false});
  assert.equal(g.type,object<100?'virtual':object===100?'infinity':'real');assert.ok(Number.isFinite(g.referenceScale)&&g.spread>0);assert.equal(rays.length,6);
  for(const r of rays){assert.ok([...r.from,...r.lens,...r.end,...(r.virtual||[])].every(Number.isFinite));if(object>=100)assert.equal(r.virtual,null);}
  if(object>100){assert.ok(g.v>G.eye&&g.m<0);assert.equal(g.eyeMode,'converging');assert.equal(g.imageScale,null);assert.equal(g.angularGain,null);for(const r of rays){const t=g.v*G.scale/r.end[0];assert.ok(Math.abs(r.lens[1]+t*(r.end[1]-r.lens[1])-(G.axis+g.m*(r.name==='top'?.44:-.4)))<1e-8);}}
  else assert.ok(Number.isFinite(g.imageScale));
 }
 const atF=magnifierState({object:100,screen:95});assert.equal(atF.eyeMode,'parallel');assert.equal(atF.imageScale,.5);assert.equal(atF.v,null);
 for(const name of ['top','bottom']){const slopes=magnifierRays({object:100,screen:95}).filter(r=>r.name===name).map(r=>(r.end[1]-r.lens[1])/r.end[0]);assert.ok(Math.max(...slopes)-Math.min(...slopes)<1e-10);}
});
