import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IMAGING as G,moveImaging,imagingState,imagingRays,imagingKeypointState} from '../units/4/parts/4.4/assets/imaging-optics.mjs';
test('三種物距的清楚像位置、倒立倍率與每個物點會聚一致',()=>{
 for(const [object,screen,m]of [[320,100*320/220,-100/220],[200,200,-1],[150,300,-2],[125,500,-4]]){
  const s={object,screen},g=imagingState(s);assert.equal(g.clear,true);assert.ok(Math.abs(g.m-m)<1e-10);assert.ok(g.spread<1e-10);assert.ok(Math.abs(g.projectionScale-m)<1e-10);
  const rays=imagingRays(s);for(const name of ['top','bottom']){const ends=rays.filter(r=>r.name===name).map(r=>r.end[1]);assert.ok(ends.every(y=>Math.abs(y-ends[0])<1e-9));assert.ok(name==='top'?ends[0]<G.axis:ends[0]>G.axis);}
 }
});
test('失焦投影大小依屏幕平面改變，散開與代表光線包絡相同',()=>{
 const s={object:150,screen:200},g=imagingState(s),rays=imagingRays(s,'top'),ys=rays.map(r=>r.end[1]);assert.equal(g.clear,false);assert.equal(g.projectionScale,-4/3);assert.ok(Math.abs((Math.max(...ys)-Math.min(...ys))/2-g.spread)<1e-9);
 const spreads=[295,299,300,301,305].map(screen=>imagingState({...s,screen}).spread);assert.ok(spreads[0]>spreads[1]&&spreads[1]>spreads[2]&&spreads[3]<spreads[4]);
});
test('焦點邊界、軌道外與超出屏幕皆有有限且可判定的狀態',()=>{
 const g=imagingState({object:100,screen:500});assert.equal(g.finite,false);assert.ok(Number.isFinite(g.spread));assert.equal(g.clear,false);
 assert.equal(imagingState({object:110,screen:500}).unreachable,true);const large=imagingState({object:125,screen:500});assert.equal(large.clear,true);assert.equal(large.clipped,true);assert.equal(large.m,-4);
});
test('圖卡與屏幕皆可移動，單一器材保留另一器材及範圍',()=>{
 const s={object:320,screen:240};assert.deepEqual(moveImaging(s,'object',150),{...s,object:150});assert.equal(moveImaging(s,'screen',1000).screen,500);assert.equal(moveImaging(s,'object',-20).object,50);assert.deepEqual(moveImaging(s,'screen',NaN),s);
});

test('屏幕可在焦距內移動，幾何投影及光路仍使用同一接收面',()=>{
 const initial={object:200,screen:240},s=moveImaging(initial,'screen',70),g=imagingState(s);assert.equal(s.screen,70);assert.equal(s.object,200);assert.ok(s.screen<G.f);assert.equal(g.clear,false);assert.equal(g.projectionScale,-.35);assert.ok(g.spread>0);for(const ray of imagingRays(s))assert.equal(ray.end[0],70*G.scale);assert.equal(moveImaging(s,'screen',0).screen,G.screenMin);assert.ok(G.screenMin<G.f);
});

test('圖卡與代表物點放大兩倍，像距與倍率保持，放大像按真實屏幕裁切',()=>{
 assert.equal(G.cardWidth,1.4);assert.equal(G.cardHeight,2.4);const s={object:320,screen:100*320/220},g=imagingState(s),rays=imagingRays(s);
 assert.equal(g.clear,true);assert.ok(Math.abs(g.m+1/2.2)<1e-10);
 for(const [name,y]of [['top',.88],['bottom',-.8]])for(const ray of rays.filter(r=>r.name===name)){assert.ok(Math.abs(ray.from[1]-G.axis-y)<1e-10);assert.ok(Math.abs(ray.end[1]-G.axis-g.m*y)<1e-10);}
 assert.equal(imagingState({object:200,screen:200}).clipped,false);assert.equal(imagingState({object:175,screen:700/3}).clipped,false);assert.equal(imagingState({object:150,screen:300}).clipped,true);
});

test('四個觀察重點同步定位，F沒有有限清楚像，不改原物理規則',()=>{
 for(const [key,object,screen]of [['beyond',320,145.5],['double',200,200],['between',175,233.3],['focus',100,500]]){const s=imagingKeypointState(key);assert.deepEqual(s,{object,screen});const g=imagingState(s);assert.equal(g.clear,key!=='focus');assert.equal(g.finite,key!=='focus');if(key==='beyond')assert.ok(g.v>G.f&&g.v<G.f*2);if(key==='double')assert.equal(g.v,G.f*2);if(key==='between')assert.ok(g.v>G.f*2);}
 assert.equal(imagingKeypointState('missing'),null);
});

test('無窮遠軸上物點以平行光在另一側F形成點像，移動屏幕及回有限物距一致',()=>{
 const s=imagingKeypointState('infinity'),g=imagingState(s);assert.equal(s.atInfinity,true);assert.equal(s.screen,G.f);assert.equal(g.clear,true);assert.equal(g.v,G.f);assert.equal(g.m,0);assert.equal(g.projectionScale,0);assert.equal(g.spread,0);
 for(const r of imagingRays(s)){assert.equal(r.from[1],r.lens[1]);assert.equal(r.end[1],G.axis);assert.equal(r.end[0],G.f*G.scale);}
 const shifted=moveImaging(s,'screen',200);assert.equal(shifted.atInfinity,true);assert.equal(imagingState(shifted).clear,false);assert.ok(imagingState(shifted).spread>0);assert.equal(moveImaging(s,'object',320).atInfinity,undefined);assert.ok(imagingRays(shifted).every(r=>r.end.flat().every(Number.isFinite)));
});
test('F內形成透鏡前同側的正立放大虛像，反向延長線會交但屏幕不會對焦',()=>{
 const s=imagingKeypointState('inside'),g=imagingState(s);assert.deepEqual(s,{object:50,screen:200});assert.equal(g.type,'virtual');assert.equal(g.v,-100);assert.equal(g.m,2);assert.equal(g.upright,true);assert.equal(g.clear,false);assert.equal(g.unreachable,false);
 for(const screen of [50,100,200,500])assert.equal(imagingState({...s,screen}).clear,false);
 for(const r of imagingRays(s)){assert.ok(r.virtual[0]<r.from[0]);const slope=(r.end[1]-r.lens[1])/(r.end[0]-r.lens[0]);assert.ok(Math.abs(r.lens[1]+r.virtual[0]*slope-r.virtual[1])<1e-10);assert.ok(r.name==='top'?r.virtual[1]>G.axis:r.virtual[1]<G.axis);}
});


test('F內連續移動時虛像位置、倍率及兩個物點的延長線保持一致',()=>{
 for(const object of [50,60,75,90,99]){
  const state={object,screen:200},g=imagingState(state),rays=imagingRays(state);
  assert.equal(g.type,'virtual');assert.ok(g.v< -object);assert.ok(g.m>1);assert.equal(rays.length,4);
  for(const r of rays){const y=r.name==='top'?G.pointTop:G.pointBottom;assert.ok(Math.abs(r.virtual[0]-g.v*G.scale)<1e-8);assert.ok(Math.abs(r.virtual[1]-G.axis-g.m*y)<1e-8);const t=r.virtual[0]/r.end[0];assert.ok(Math.abs(r.lens[1]+t*(r.end[1]-r.lens[1])-r.virtual[1])<1e-8);}
 }
});
