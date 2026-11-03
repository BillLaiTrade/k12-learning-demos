import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IMAGING as G,moveImaging,imagingState,imagingRays} from '../units/4/parts/4.4/assets/imaging-optics.mjs';
test('三種物距的清楚像位置、倒立倍率與每個物點會聚一致',()=>{
 for(const [object,screen,m]of [[320,100*320/220,-100/220],[200,200,-1],[150,300,-2],[125,500,-4]]){
  const s={stage:'compare',object,screen},g=imagingState(s);assert.equal(g.clear,true);assert.ok(Math.abs(g.m-m)<1e-10);assert.ok(g.spread<1e-10);assert.ok(Math.abs(g.projectionScale-m)<1e-10);
  const rays=imagingRays(s);for(const name of ['top','bottom']){const ends=rays.filter(r=>r.name===name).map(r=>r.end[1]);assert.ok(ends.every(y=>Math.abs(y-ends[0])<1e-9));assert.ok(name==='top'?ends[0]<G.axis:ends[0]>G.axis);}
 }
});
test('失焦投影大小依屏幕平面改變，散開與代表光線包絡相同',()=>{
 const s={object:150,screen:200,stage:'compare'},g=imagingState(s),rays=imagingRays(s,'top'),ys=rays.map(r=>r.end[1]);assert.equal(g.clear,false);assert.equal(g.projectionScale,-4/3);assert.ok(Math.abs((Math.max(...ys)-Math.min(...ys))/2-g.spread)<1e-9);
 const spreads=[295,299,300,301,305].map(screen=>imagingState({...s,screen}).spread);assert.ok(spreads[0]>spreads[1]&&spreads[1]>spreads[2]&&spreads[3]<spreads[4]);
});
test('焦點邊界、軌道外與超出屏幕皆有有限且可判定的狀態',()=>{
 const g=imagingState({object:100,screen:500});assert.equal(g.finite,false);assert.ok(Number.isFinite(g.spread));assert.equal(g.clear,false);
 assert.equal(imagingState({object:110,screen:500}).unreachable,true);const large=imagingState({object:125,screen:500});assert.equal(large.clear,true);assert.equal(large.clipped,true);assert.equal(large.m,-4);
});
test('固定階段不能移動圖卡，移動單一器材保留另一器材及範圍',()=>{
 const initial={object:320,screen:240,stage:'focus'};assert.deepEqual(moveImaging(initial,'object',150),initial);const s={...initial,stage:'compare'};assert.deepEqual(moveImaging(s,'object',150),{...s,object:150});assert.equal(moveImaging(s,'screen',1000).screen,500);assert.equal(moveImaging(s,'object',-20).object,100);assert.deepEqual(moveImaging(s,'screen',NaN),s);
});

test('屏幕可在焦距內移動，幾何投影及光路仍使用同一接收面',()=>{
 const initial={object:200,screen:240,stage:'compare'},s=moveImaging(initial,'screen',70),g=imagingState(s);assert.equal(s.screen,70);assert.equal(s.object,200);assert.ok(s.screen<G.f);assert.equal(g.clear,false);assert.equal(g.projectionScale,-.35);assert.ok(g.spread>0);for(const ray of imagingRays(s))assert.equal(ray.end[0],70*G.scale);assert.equal(moveImaging(s,'screen',0).screen,G.screenMin);assert.ok(G.screenMin<G.f);
});

test('圖卡與代表物點放大兩倍，像距與倍率保持，放大像按真實屏幕裁切',()=>{
 assert.equal(G.cardWidth,1.4);assert.equal(G.cardHeight,2.4);const s={object:320,screen:100*320/220,stage:'compare'},g=imagingState(s),rays=imagingRays(s);
 assert.equal(g.clear,true);assert.ok(Math.abs(g.m+1/2.2)<1e-10);
 for(const [name,y]of [['top',.88],['bottom',-.8]])for(const ray of rays.filter(r=>r.name===name)){assert.ok(Math.abs(ray.from[1]-G.axis-y)<1e-10);assert.ok(Math.abs(ray.end[1]-G.axis-g.m*y)<1e-10);}
 assert.equal(imagingState({object:200,screen:200}).clipped,false);assert.equal(imagingState({object:175,screen:700/3}).clipped,false);assert.equal(imagingState({object:150,screen:300}).clipped,true);
});
