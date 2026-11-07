import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parallelModel} from '../units/4/parts/4.4/assets/parallel-optics.mjs';
import {CONCAVE as G,concaveState,concaveRays,moveConcave} from '../units/4/parts/4.4/assets/concave-optics.mjs';
test('凹透鏡兩次折射符合 Snell 定律，平行光實際發散、延長線交於入射側',()=>{
 const g=parallelModel('concave');assert.ok(g.right(g.halfHeight)-g.left(g.halfHeight)>g.thickness);assert.ok(g.focus<0);
 const cross=(a,b)=>Math.abs(a[0]*b[1]-a[1]*b[0]);
 for(const r of g.rays){assert.ok(Math.abs(cross(r.incoming,r.N1)-g.index*cross(r.inside,r.N1))<1e-10);assert.ok(Math.abs(g.index*cross(r.inside,r.N2)-cross(r.outgoing,r.N2))<1e-10);assert.ok(r.end[0]>r.exit[0]);if(r.focus!==null){assert.ok(Math.abs(r.end[1])>Math.abs(r.exit[1]));assert.ok(Math.abs(r.exit[1]+(g.focus-r.exit[0])*r.outgoing[1]/r.outgoing[0])<1e-10);}}
});
test('所有允許物距形成正立縮小虛像，虛像在透鏡與同側F之間',()=>{
 for(let object=G.objectMin;object<=G.objectMax;object+=.5){const g=concaveState({object});assert.equal(g.type,'virtual');assert.ok(g.m>0&&g.m<1);assert.ok(g.v<0&&g.v>-G.f&&g.v>-object);assert.equal(g.screenClear,false);assert.ok(g.angularGain>0&&g.angularGain<1);assert.ok(Math.abs(-1/G.f-(1/object+1/g.v))<1e-10);}
});
test('同一物點所有出射光與反向延長線指向同一虛像，並保持向右前進',()=>{
 assert.ok(Math.abs(G.pointTop-G.cardHeight*(.5-80/600))<1e-9);assert.ok(Math.abs(G.pointBottom-G.cardHeight*(.5-500/600))<1e-9);
 for(const object of [30,50,99.9,100,100.1,150,200,300,350])for(const point of ['top','bottom','both']){const rays=concaveRays({object},point),g=concaveState({object});assert.equal(rays.length,point==='both'?6:3);for(const r of rays){assert.ok(r.from[0]<0&&r.end[0]>0);assert.ok(Math.abs(r.virtual[0]-g.v*G.scale)<1e-9);const t=r.virtual[0]/r.end[0],y=r.lens[1]+t*(r.end[1]-r.lens[1]);assert.ok(Math.abs(y-r.virtual[1])<1e-9);}}
});
test('圖卡移近時，虛像靠近透鏡並變大；F前後沒有像性質跳變',()=>{
 let prev=concaveState({object:350});for(let object=349;object>=30;object--){const g=concaveState({object});assert.ok(Math.abs(g.v)<Math.abs(prev.v));assert.ok(g.m>prev.m);prev=g;}
 const before=concaveState({object:99.9}),after=concaveState({object:100.1});assert.ok(Math.abs(before.m-after.m)<.001);
});
test('固定眼位比較使用角大小，不能把虛像尺寸倍率直接當觀看倍率',()=>{
 for(const object of [30,50,100,150,300,350]){const g=concaveState({object});assert.ok(Math.abs(g.imageScale-g.m/((G.eye-g.v)*G.opticalScale))<1e-12);assert.ok(Math.abs(g.referenceScale-1/((G.eye+object)*G.opticalScale))<1e-12);}
 const s={object:150,eye:G.eye};assert.equal(moveConcave(s,'eye',400),s);assert.equal(moveConcave(s,'object',NaN),s);assert.equal(moveConcave(s,'object',0).object,30);assert.equal(moveConcave(s,'object',1000).object,350);
});
