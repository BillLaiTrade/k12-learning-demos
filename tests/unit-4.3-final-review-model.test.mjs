import {test} from 'node:test';
import assert from 'node:assert/strict';
import {geometry,reciprocalSnapshot} from '../units/4/parts/4.3/assets/return-refraction-model.mjs';
import {createLayerDeck,invertedLayerPair} from '../units/4/parts/4.3/assets/layer-speed-model.mjs';
import {depthGeometry} from '../units/4/parts/4.3/assets/depth-model.mjs';
import {renderObserverPixels} from '../units/4/parts/4.3/assets/depth-observer.mjs';

test('reciprocal fronts start at the enabled source, conserve speed ratios and finish on the same reversed path',()=>{
 for(const medium of ['water','glass'])for(const angle of [0,15,30,35]){
  const g=geometry(medium,angle),a=reciprocalSnapshot(g,'a'),b=reciprocalSnapshot(g,'b');
  assert.ok(Math.abs(a.durationMs-b.durationMs)<1e-9);
  for(const key of ['a','b']){
   const first=reciprocalSnapshot(g,key),mid=reciprocalSnapshot(g,key,first.segments[0].durationMs/2),done=reciprocalSnapshot(g,key,first.durationMs);
   assert.equal(first.segments[0].fraction,0);assert.equal(mid.segments[0].fraction,.5);assert.equal(mid.segments[1].fraction,0);assert.ok(done.complete);assert.deepEqual(done.segments.at(-1).end,key==='a'?g.sourceB:g.sourceA);
   for(const segment of done.segments){const n=segment.from[1]<g.hit[1]||segment.to[1]<g.hit[1]?1:medium==='water'?4/3:1.5;assert.ok(Math.abs(segment.durationMs/Math.hypot(segment.to[0]-segment.from[0],segment.to[1]-segment.from[1])-2.3*n)<1e-9);}
  }
 }
});
test('one actual inverted adjacent pair is returned across the whole deck without disclosing an entire answer',()=>{
 const deck=createLayerDeck(()=>.3);
 for(let i=0;i<24;i++){
  const {geometry:g,materials}=deck.next();
  assert.equal(invertedLayerPair(g,g.order),null);assert.equal(invertedLayerPair(g,[0,null,1,2]),null);
  const wrong=[...g.order].reverse(),pair=invertedLayerPair(g,wrong);
  assert.equal(pair.length,2);assert.ok(g.layers[pair[0]].angle<g.layers[pair[1]].angle);
  assert.deepEqual(new Set(materials.filter(m=>m.kind==='solid').map(m=>m.finish)),new Set(['cool','clear']));
 }
});
test('cached observer directions preserve identical frame pixels when camera and resolution alternate',()=>{
 const texture={width:1,height:1,data:new Uint8ClampedArray([180,140,80,255])},textures={wood:texture,water:texture,metal:texture,coin:texture},g=depthGeometry(75,300),one=renderObserverPixels(g,textures,48,35);
 renderObserverPixels(depthGeometry(50,210),textures,64,47);
 const again=renderObserverPixels(g,textures,48,35);
 assert.deepEqual(again,one);assert.equal(one.pixels.length,48*35*4);
});
