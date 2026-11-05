import {test} from 'node:test';
import assert from 'node:assert/strict';
import {layerGeometry,layerSnapshot,createLayerDeck,placeLayer,compareLayers,MS_PER_OPTICAL_UNIT,LAYER_MATERIALS} from '../units/4/parts/4.3/assets/layer-speed-model.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('a newly loaded deck can start with every one of the 24 answers and either incident angle',()=>{
 for(const incidentRandom of [0,.999999]){
  const firstAnswers=new Set(),firstKeys=new Set();
  for(let target=0;target<24;target++){
   let calls=0;
   const deck=createLayerDeck(()=>{
    const i=23-calls++;
    return i<1?incidentRandom:i===target?0:.999999;
   });
   const q=deck.next();firstAnswers.add(q.geometry.order.join(','));firstKeys.add(q.key);
   assert.equal(q.id,1);assert.equal(q.geometry.incident,incidentRandom<.5?36:40);
   assert.equal(compareLayers(q.geometry,q.geometry.order).correct,true);
   for(const [id,material]of q.materials.entries())assert.equal(q.geometry.layers[id].n,material.n);
  }
  assert.equal(firstAnswers.size,24);assert.equal(firstKeys.size,24);
 }
});
test('all 24 speed orders obey Snell invariance, continuous parallel-layer geometry and visible angle differences',()=>{
 const deck=createLayerDeck(()=>.37),orders=new Set();
 for(let i=0;i<24;i++){
  const {geometry:g}=deck.next();orders.add(g.order.join(''));close(g.segments[0].n,1);
  for(const [j,l] of g.layers.entries()){
   close(l.n*Math.sin(l.angle*Math.PI/180),g.invariant);
   close(l.to[1]-l.from[1],1);close(Math.atan2(l.to[0]-l.from[0],l.to[1]-l.from[1])*180/Math.PI,l.angle);
   assert.deepEqual(l.from,g.points[j+1]);assert.deepEqual(l.to,g.points[j+2]);
   if(j>0)assert.deepEqual(l.from,g.layers[j-1].to);
  }
  const angles=g.layers.map(x=>x.angle).sort((a,b)=>a-b);for(let j=1;j<4;j++)assert.ok(angles[j]-angles[j-1]>2);assert.equal(new Set(angles.map(a=>a.toFixed(1))).size,4);
  assert.deepEqual(g.order,g.layers.toSorted((a,b)=>b.angle-a.angle).map(x=>x.id));
  assert.deepEqual(g.order,g.layers.toSorted((a,b)=>a.n-b.n).map(x=>x.id));
 }
 assert.equal(orders.size,24);
});
test('deck renews indefinitely without adjacent identical rankings or a fixed fastest layer',()=>{
 const deck=createLayerDeck(()=>.2);let last;const winners=new Set();
 for(let round=0;round<10;round++){
  const rankings=new Set();
  for(let i=0;i<24;i++){const q=deck.next();assert.equal(q.id,round*24+i+1);const rank=q.geometry.order.join('');assert.notEqual(rank,last);last=rank;rankings.add(rank);winners.add(q.geometry.order[0]);}
  assert.equal(rankings.size,24);
 }
 assert.equal(winners.size,4);
});
test('animation advances by geometric distance and actual relative speed, including intermediate frames and exact endpoints',()=>{
 const g=layerGeometry([1.00045,1.78,1.4,1.55]);let before=0;
 for(const s of g.segments){close(s.startMs,before);close(s.durationMs,s.length*s.n*MS_PER_OPTICAL_UNIT);const middle=layerSnapshot(g,s.startMs+s.durationMs/2).segments[s.layer+1];close(middle.fraction,.5);close(Math.hypot(middle.end[0]-s.from[0],middle.end[1]-s.from[1]),s.length/2);before+=s.durationMs;}
 close(before,g.durationMs);assert.ok(layerSnapshot(g,0).segments.every(s=>s.fraction===0));assert.ok(layerSnapshot(g,g.durationMs).segments.every(s=>s.fraction===1));assert.equal(layerSnapshot(g,g.durationMs).complete,true);
});
test('placement supports pool replacement, swapping existing cards and keeps a unique set',()=>{
 let order=[null,null,null,null];order=placeLayer(order,0,0);order=placeLayer(order,1,1);order=placeLayer(order,2,2);order=placeLayer(order,3,3);assert.deepEqual(order,[0,1,2,3]);assert.deepEqual(placeLayer(order,0,3),[3,1,2,0]);assert.deepEqual(order,[0,1,2,3]);assert.deepEqual(placeLayer([0,null,null,null],1,0),[1,null,null,null]);assert.deepEqual(placeLayer([0,1,null,null],0,1),[1,0,null,null]);
});
test('grading rejects partial, duplicate and invalid submissions, and accepts exactly the speed order',()=>{
 const g=layerGeometry([1.00045,1.78,1.4,1.55]);assert.equal(compareLayers(g,[0,2,3,1]).correct,true);assert.deepEqual(compareLayers(g,[0,1,2,3]).positions,[true,false,false,false]);for(const order of [[0,null,1,2],[0,0,1,2],[-1,1,2,3],[0,1,2,4],[0,1,2],[]])assert.equal(compareLayers(g,order).complete,false);
 for(const indices of [[1,1,1,1],[1,2,3],[-1,1,2,3],[1,2,3,Infinity]])assert.throws(()=>layerGeometry(indices),RangeError);assert.throws(()=>layerGeometry([1.2,1.4,1.6,1.8],0),RangeError);
});

test('gas, liquid and solid appearances move with the same refractive indices through every layer permutation',()=>{
 const deck=createLayerDeck(()=>.37),gasPositions=new Set();
 for(let i=0;i<48;i++){const q=deck.next();assert.equal(new Set(q.materials.map(m=>m.kind)).size,3);for(const [id,material]of q.materials.entries()){assert.equal(q.geometry.layers[id].n,material.n);assert.equal(q.geometry.layers[id].speed,1/material.n);if(material.kind==='gas'){assert.ok(material.n>1&&material.n<1.001);gasPositions.add(id);}}}
 assert.equal(gasPositions.size,4);assert.equal(LAYER_MATERIALS.length,4);
});
