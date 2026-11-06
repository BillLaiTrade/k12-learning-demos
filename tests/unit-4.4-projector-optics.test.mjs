import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PROJECTOR as G,initialProjector,moveProjector,projectorState,projectorRays,projectorHint} from '../units/4/parts/4.4/assets/projector-optics.mjs';
const focus={...initialProjector(),card:1.2,lens:4.8,flipped:true};
test('兩倍放大實像在牆上對焦，倒放圖卡才能正立',()=>{
 const g=projectorState(focus);assert.ok(Math.abs(g.u-3.6)<1e-9);assert.ok(Math.abs(g.s-7.2)<1e-9);assert.ok(Math.abs(g.image.v-g.s)<1e-9);assert.ok(Math.abs(g.scale-2)<1e-9);assert.equal(g.success,true);assert.equal(projectorState({...focus,flipped:false}).success,false);
 const rays=projectorRays(focus);for(const point of [-.45,.45]){const bundle=rays.filter(r=>r.point===point);assert.equal(bundle.length,3);for(const r of bundle)assert.ok(Math.abs(r.end[1]-(G.axis-2*point))<1e-9);}
});
test('未對焦與過大的投影不通關，合格範圍不限制單一解',()=>{
 assert.equal(projectorState(initialProjector()).success,false);assert.equal(projectorState({...focus,card:2.3}).checks.clear,false);
 const large={...focus,lens:3.7,card:3.7-(G.f*8.3/(8.3-G.f))};assert.equal(projectorState(large).checks.clear,true);assert.equal(projectorState(large).checks.inTarget,false);
 const other={...focus,lens:6,card:2};assert.equal(projectorState(other).success,true);assert.equal(projectorState({...focus,lens:6.96,card:2.38}).success,true);assert.equal(projectorState({...focus,lens:7.2,card:2.4}).checks.large,false);
});
test('凹透鏡及焦點內不會把虛像畫成屏幕上的清楚像',()=>{
 for(const lens of [4.5,5.5,8])for(const card of [.8,2.3,3.8]){const g=projectorState({...focus,lens,card,kind:'concave'});assert.equal(g.image.type,'virtual');assert.equal(g.checks.clear,false);assert.equal(g.success,false);assert.ok(g.spread>G.aperture);}
 const g=projectorState({...focus,lens:4.5,card:3.8});assert.equal(g.image.type,'virtual');assert.equal(g.checks.clear,false);
 const atF=projectorState({...focus,lens:4.8,card:2.4});assert.equal(atF.image.type,'infinity');assert.equal(atF.success,false);
});
test('位置邊界、提示不替學生移動器材',()=>{
 const initial=initialProjector();assert.equal(moveProjector(initial,'card',-10).card,G.cardMin);assert.equal(moveProjector(initial,'lens',100).lens,G.lensMax);assert.equal(moveProjector(initial,'unknown',2),initial);assert.equal(moveProjector(initial,'card',NaN),initial);
 const before=structuredClone(initial),hint=projectorHint(initial);assert.deepEqual(initial,before);assert.equal(hint.href,'#s3');assert.equal(projectorHint({...initial,kind:'concave'}).href,'#s5');assert.match(projectorHint(focus).text,/檢查成果/);
});
