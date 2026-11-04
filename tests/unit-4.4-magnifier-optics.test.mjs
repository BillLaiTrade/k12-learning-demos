import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MAGNIFIER as G,magnifierState,moveMagnifier,magnifierRays,eyeRays} from '../units/4/parts/4.4/assets/magnifier-optics.mjs';
import {IMAGING,imagingRays} from '../units/4/parts/4.4/assets/imaging-optics.mjs';
test('屏幕與眼睛共用器材比例、物距範圍及代表光路',()=>{
 for(const key of ['f','scale','axis','aperture','cardWidth','cardHeight','pointTop','pointBottom','objectMin','objectMax','screenMin','screenMax'])assert.equal(G[key],IMAGING[key],key);
 assert.equal(G.eyeMin,IMAGING.screenMin);assert.equal(G.eyeMax,IMAGING.screenMax);
 for(const object of [30,50,90,100,100.1,175,200,320,350])for(const point of ['both','top','bottom'])assert.deepEqual(magnifierRays({object,eye:200,screen:500,screenIn:false},point),imagingRays({object,screen:500},point));
});
test('F上的同一物點為三條明顯分隔的平行出射光，眼睛不改變基本光路',()=>{
 for(const name of ['top','bottom']){const paths=magnifierRays({object:100,eye:200,screen:500},name);assert.equal(paths.length,3);const slopes=paths.map(r=>(r.end[1]-r.lens[1])/r.end[0]);assert.ok(Math.max(...slopes)-Math.min(...slopes)<1e-10);assert.ok(Math.max(...paths.map(r=>r.lens[1]))-Math.min(...paths.map(r=>r.lens[1]))>.7);assert.ok(paths.every(r=>r.end[0]>G.eye*G.scale&&!r.virtual));}
 const a=magnifierRays({object:100,eye:100,screen:500}),b=magnifierRays({object:100,eye:400,screen:500});assert.deepEqual(a,b);
});
test('眼睛、圖卡及比較屏幕獨立移動，可將眼睛移到2F及5F',()=>{
 const state={object:60,eye:200,screen:95,screenIn:false};assert.deepEqual(moveMagnifier(state,'eye',300),{...state,eye:300});assert.equal(moveMagnifier(state,'eye',0).eye,50);assert.equal(moveMagnifier(state,'eye',1000).eye,500);assert.equal(moveMagnifier(state,'object',1000).object,350);assert.equal(moveMagnifier(state,'object',0).object,30);assert.equal(moveMagnifier(state,'screen',1000).screen,500);assert.deepEqual(moveMagnifier(state,'eye',NaN),state);
});
test('F內虛像正立，眼睛投影依像距與像高，原物參照採相同觀看位置',()=>{
 for(const object of [30,60,90])for(const eye of [100,200,300,500]){const g=magnifierState({object,eye,screen:95});assert.equal(g.type,'virtual');assert.equal(g.eyeMode,'virtual');assert.ok(g.m>1&&g.v<0&&g.imageScale>0);assert.ok(Math.abs(g.imageScale-g.m/((eye-g.v)*G.scale))<1e-9);assert.ok(Math.abs(g.referenceScale-1/((eye+object)*G.scale))<1e-10);assert.ok(g.angularGain>1);}
});
test('實像本身不隨眼睛移動，越過會聚點後可清楚看到倒立像及視角差異',()=>{
 const base={object:320,eye:200,screen:95};const near=magnifierState(base),far=magnifierState({...base,eye:300});assert.equal(near.type,'real');assert.equal(near.eyeMode,'real');assert.ok(near.imageScale<0&&far.imageScale<0);assert.equal(near.v,far.v);assert.equal(near.m,far.m);assert.ok(near.angularGain>far.angularGain);assert.ok(Math.abs(near.imageScale)>Math.abs(far.imageScale));assert.notEqual(near.angularGain,Math.abs(near.m));
 assert.equal(magnifierState({...base,eye:100}).eyeMode,'converging');assert.equal(magnifierState({...base,eye:near.v}).eyeMode,'at-image');assert.equal(magnifierState({...base,eye:160}).eyeMode,'too-close');
});
test('F的角度投影有限，沒有有限像距，也不把會聚入眼光冒充清晰圖案',()=>{
 for(const eye of [50,100,200,500]){const g=magnifierState({object:100,eye,screen:95});assert.equal(g.eyeMode,'parallel');assert.equal(g.v,null);assert.ok(Math.abs(g.imageScale-1/(G.f*G.scale))<1e-10);}
 for(const eye of [100,145.5,160]){const g=magnifierState({object:320,eye,screen:95});assert.equal(g.imageScale,null);assert.equal(g.angularGain,null);assert.equal(g.resolved,false);}
});
test('只有位於眼睛之前的不透明屏幕遮擋視線，虛像不能直接投影',()=>{
 const a={object:60,eye:200,screen:95,screenIn:true};assert.equal(magnifierState(a).blocked,true);assert.equal(magnifierState({...a,screen:300}).blocked,false);assert.equal(magnifierState({...a,screenIn:false}).blocked,false);assert.ok(magnifierState(a).spread>0);assert.ok(magnifierState({object:200,eye:300,screen:200,screenIn:true}).spread<1e-10);
});
test('額外入眼光確實穿過同一透鏡孔徑並到達目前眼睛',()=>{
 for(const object of [30,60,100,175,320])for(const eye of [100,200,300])for(const r of eyeRays({object,eye,screen:95,screenIn:false})){assert.ok(Math.abs(r.from[1]-G.axis)<=G.aperture);assert.equal(r.to[0],eye*G.scale);assert.ok(Math.abs(r.to[1]-G.axis)<1e-9);}
 assert.deepEqual(eyeRays({object:60,eye:200,screen:95,screenIn:true}),[]);
});
test('跨F及眼睛跨過實像位置，所有實際送往繪圖的座標保持有限',()=>{
 for(const object of [30,99.9,100,100.1,150,200,320,350])for(const eye of [50,100,145.5,160,200,300,500]){const s={object,eye,screen:95},g=magnifierState(s);assert.ok(Number.isFinite(g.referenceScale));assert.ok(g.imageScale===null||Number.isFinite(g.imageScale));for(const r of magnifierRays(s))assert.ok([...r.from,...r.lens,...r.end,...(r.virtual||[])].every(Number.isFinite));}
});
