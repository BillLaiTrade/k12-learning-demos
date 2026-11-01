import {test} from 'node:test';
import assert from 'node:assert/strict';
import {distanceKm,speedKmPerSecond,arrivalMs,durationMs,snapshot} from '../units/4/parts/4.3/assets/light-speed-model.mjs';
test('million-kilometre model uses the agreed representative speeds and travel times',()=>{
 assert.equal(distanceKm,1_000_000);
 assert.deepEqual(['air','water','glass'].map(speedKmPerSecond),[300_000,225_000,200_000]);
 const seconds=['air','water','glass'].map(k=>arrivalMs(k)/1000);
 assert.ok(Math.abs(seconds[0]-10/3)<1e-12);
 assert.ok(Math.abs(seconds[1]-40/9)<1e-12);
 assert.equal(seconds[2],5);assert.equal(durationMs,5000);
});
test('a shared physical time gives independent distances and the same endpoint',()=>{
 assert.deepEqual(snapshot(3000).map(r=>r.traveledKm),[900_000,675_000,600_000]);
 assert.deepEqual(snapshot(3000).map(r=>r.arrived),[false,false,false]);
 for(const key of ['air','water','glass']){
  assert.equal(snapshot(arrivalMs(key)-.01).find(r=>r.key===key).arrived,false);
  const at=snapshot(arrivalMs(key)).find(r=>r.key===key);
  assert.equal(at.arrived,true);assert.ok(Math.abs(at.traveledKm-distanceKm)<1e-8);
 }
 assert.deepEqual(snapshot(-100).map(r=>r.progress),[0,0,0]);
 assert.deepEqual(snapshot(10000).map(r=>[r.progress,r.arrived]),[[1,true],[1,true],[1,true]]);
});
