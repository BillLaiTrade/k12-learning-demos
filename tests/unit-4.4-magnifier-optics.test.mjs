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
test('物距維持焦距內，屏幕在鏡片與眼睛之間，移動單一器材不改另一器材',()=>{
 const s={object:60,screen:95,screenIn:true};assert.equal(moveMagnifier(s,'object',1000).object,90);assert.equal(moveMagnifier(s,'object',0).object,30);assert.equal(moveMagnifier(s,'screen',1000).screen,140);assert.ok(G.screenMax<G.eye);assert.deepEqual(moveMagnifier(s,'object',45),{...s,object:45});assert.deepEqual(moveMagnifier(s,'object',NaN),s);assert.equal(magnifierState({...s,object:90}).virtualOutside,true);
});
