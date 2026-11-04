import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MAGNIFIER as G,magnifierState,moveMagnifier,magnifierRays,magnifierDisplayRays,eyeRays} from '../units/4/parts/4.4/assets/magnifier-optics.mjs';
import {IMAGING,imagingRays} from '../units/4/parts/4.4/assets/imaging-optics.mjs';
import {observations} from '../units/4/parts/4.4/assets/magnifier-workspace.mjs';
test('保留兩區共同器材與同條件的代表光路',()=>{
 for(const key of ['f','scale','axis','aperture','cardWidth','cardHeight','pointTop','pointBottom','objectMin','objectMax','screenMin','screenMax'])assert.equal(G[key],IMAGING[key]);
 for(const object of [30,90,100,100.1,150,200,320,350])for(const point of ['top','bottom','both'])assert.deepEqual(magnifierRays({object,screen:500},point),imagingRays({object,screen:500},point));
});
test('眼睛在模型層固定，移動操作僅接受圖卡與比較屏幕',()=>{
 assert.ok(G.eye>0&&G.eye<G.f);
 const state={object:30,eye:G.eye,screen:95,screenIn:false};assert.equal(moveMagnifier(state,'eye',500),state);assert.equal(moveMagnifier(state,'eye',NaN),state);
 assert.equal(moveMagnifier(state,'object',0).object,30);assert.equal(moveMagnifier(state,'object',1000).object,350);assert.equal(moveMagnifier(state,'screen',0).screen,50);assert.equal(moveMagnifier(state,'screen',1000).screen,500);
 for(const eye of [0,50,200,500]){const g=magnifierState({...state,eye});assert.equal(g.eye,G.eye);assert.deepEqual(g,magnifierState(state));}
});
test('四個主觀察條件依序向外，只改圖卡，沒有移眼或屏幕變因',()=>{
 assert.deepEqual(Object.keys(observations),['near','focus','at_f','outside']);assert.deepEqual(Object.values(observations).map(p=>p.object),[50,90,100,150]);
 for(const p of Object.values(observations)){assert.equal(p.eye,undefined);assert.equal(p.screenIn,false);assert.equal(p.point,undefined);}
});
test('F內正立虛像，固定眼位的透鏡影像與原物採相同角度尺度',()=>{
 let previous=0;for(const object of [30,50,60,90,99.9]){const g=magnifierState({object,screen:95});assert.equal(g.eyeMode,'virtual');assert.ok(g.v<0&&g.m>1&&g.imageScale>0);assert.ok(Math.abs(g.imageScale-g.m/((G.eye-g.v)*G.scale))<1e-10);assert.ok(Math.abs(g.referenceScale-1/((G.eye+object)*G.scale))<1e-10);assert.ok(g.angularGain>previous&&g.angularGain>1);previous=g.angularGain;}
});
test('逐漸靠近F，出射束發散程度減少，F時同色束平行',()=>{
 let previous=Infinity;for(const object of [30,60,90,100]){const paths=magnifierRays({object,screen:500},'top'),slopes=paths.map(r=>(r.end[1]-r.lens[1])/r.end[0]),spread=Math.max(...slopes)-Math.min(...slopes);assert.ok(spread<previous);previous=spread;if(object===100){assert.ok(spread<1e-10);assert.equal(paths.length,3);assert.ok(paths.every(r=>r.end[0]>G.eye*G.scale&&!r.virtual));}}
});
test('恰好F仍在原地放鬆觀看，角度有限，沒有有限虛像位置',()=>{
 const g=magnifierState({object:100,screen:95});assert.equal(g.eyeMode,'parallel');assert.equal(g.v,null);assert.equal(g.resolved,true);assert.ok(Math.abs(g.imageScale-1/(G.f*G.scale))<1e-10);assert.ok(!g.clipped);assert.ok(eyeRays({object:100,screen:95},'top').length>0);
});
test('F外仍有倒立實像，固定眼位不冒充清晰正立放大像',()=>{
 for(const object of [100.1,110,150,200,300,320,350]){const g=magnifierState({object,screen:95});assert.equal(g.type,'real');assert.ok(g.v>0&&g.m<0);assert.equal(g.resolved,false);assert.equal(g.imageScale,null);assert.equal(g.angularGain,null);assert.ok(['converging','at-image','too-close'].includes(g.eyeMode));}
});
test('額外入眼光始終到達同一位置，虛像位置在另一側而非觀察位置',()=>{
 for(const object of [30,60,90,100,150,320])for(const r of eyeRays({object,screen:95})){assert.equal(r.to[0],G.eye*G.scale);assert.ok(Math.abs(r.to[1]-G.axis)<=G.pupilRadius+1e-9);assert.ok(Math.abs(r.from[1]-G.axis)<=G.aperture);}
 const g=magnifierState({object:60,screen:50});assert.ok(g.v<0&&g.eye>0);for(const point of ['top','bottom']){const bundle=eyeRays({object:60,screen:50},point);assert.equal(bundle.length,3);const heights=bundle.map(r=>r.to[1]);assert.ok(Math.max(...heights)-Math.min(...heights)>G.pupilRadius*1.9);}
});
test('屏幕在固定眼睛前方才遮擋，取下或移到後方即恢復',()=>{
 const s={object:60,screen:50,screenIn:true};assert.equal(magnifierState(s).blocked,true);assert.equal(magnifierState({...s,screen:200}).blocked,false);assert.equal(magnifierState({...s,screenIn:false}).blocked,false);assert.deepEqual(eyeRays(s),[]);assert.ok(magnifierState(s).spread>0);
 for(const object of [30,99.9,100,100.1,150,300,350])for(const r of magnifierRays({object,screen:500}))assert.ok([...r.from,...r.lens,...r.end,...(r.virtual||[])].every(Number.isFinite));
});
test('屏幕接像與固定眼位看清是兩個判準，實像可接到而眼睛此處仍看不清',()=>{
 const a={object:150,screen:300},g=magnifierState(a);assert.equal(g.screenClear,true);assert.equal(g.resolved,false);
 assert.equal(magnifierState({...a,screen:200}).screenClear,false);
 for(const object of [30,60,90])for(const screen of [50,100,200,300,500]){const state=magnifierState({object,screen});assert.equal(state.screenClear,false);assert.equal(state.resolved,true);}
});

test('可見光路只調整取樣與延伸範圍，仍符合相同薄透鏡方程與成像位置',()=>{
 for(const object of [30,50,90,100,100.1,150,200,350])for(const point of ['top','bottom','both'])for(const r of magnifierDisplayRays({object,screen:200},point)){
  const y=r.name==='top'?G.pointTop:G.pointBottom,h=r.lens[1]-G.axis,d=r.end[0]/G.scale,slope=(h-y)/object-h/G.f;
  assert.ok(Math.abs(r.end[1]-(G.axis+h+slope*d))<1e-9);assert.ok(Math.abs(h)<=G.aperture+1e-9);assert.equal(r.from[0],-object*G.scale);
  if(r.virtual){const g=magnifierState({object,screen:200});assert.ok(Math.abs(G.axis+h+slope*g.v-r.virtual[1])<1e-9);}
 }
});

test('入眼光束的曲率與同一物點實際光線一致，跨F連續由發散經平行轉為會聚',()=>{
 let previous=-Infinity;
 for(const object of [30,50,90,99.9,100,100.1,110.4,150,350]){
  const state={object,screen:300},g=magnifierState(state);
  assert.ok(g.eyeVergence>previous);previous=g.eyeVergence;
  for(const point of ['top','bottom']){
   const rays=eyeRays(state,point),a=rays[0],b=rays[2];
   const slope=r=>(r.to[1]-r.from[1])/(r.to[0]-r.from[0]);
   const measured=-(slope(b)-slope(a))/(b.to[1]-a.to[1])*G.scale;
   assert.ok(Math.abs(measured-g.eyeVergence)<1e-10);
  }
  assert.equal(Math.sign(g.eyeVergence),Math.sign(object-G.f));
 }
});
test('跨F失焦示意連續增強，不把預覽輪廓當成清楚的虛像',()=>{
 const before=magnifierState({object:99.9}),at=magnifierState({object:100}),after=magnifierState({object:100.1});
 assert.equal(at.blurRadius,0);assert.equal(after.resolved,false);assert.equal(after.imageScale,null);
 assert.ok(after.blurRadius>0&&after.blurRadius<.12);assert.ok(Math.abs(before.previewScale-after.previewScale)<.001);
 let previous=0;
 for(const object of [100.1,101,110.4,150,200,350]){const g=magnifierState({object});assert.ok(g.blurRadius>previous&&g.blurRadius<36);previous=g.blurRadius;assert.ok(Number.isFinite(g.previewScale)&&g.previewScale>0);}
});
