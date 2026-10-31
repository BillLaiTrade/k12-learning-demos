import {test} from 'node:test';
import assert from 'node:assert/strict';
import {preparationFrame, comparisonFrame, PREPARATION_DURATION, COMPARISON_DURATION} from '../units/2/parts/2.3/assets/oxygen-model.mjs';
test('purge precedes water collection; completion covers a full gas jar',()=>{
  assert.equal(preparationFrame(1399).stage,0);
  assert.equal(preparationFrame(1400).purging,true);
  for(const time of [1400,2000,3399])assert.equal(preparationFrame(time).collected,0);
  assert.equal(preparationFrame(3400).collecting,true);
  assert.equal(preparationFrame(5450).collected,.5);
  assert.equal(preparationFrame(7000).covered,true);
  assert.equal(preparationFrame(PREPARATION_DURATION).collected,1);
  let previous=0;for(let time=0;time<=PREPARATION_DURATION;time+=20){const frame=preparationFrame(time);assert.ok(frame.collected>=previous);previous=frame.collected;}
});
test('wood enters before ignition; both samples use identical insertion and elapsed time',()=>{
  assert.deepEqual(comparisonFrame(0),{inserted:0,ignition:0,fading:0});
  assert.equal(comparisonFrame(600).inserted,.5);
  assert.equal(comparisonFrame(1200).inserted,1);
  assert.equal(comparisonFrame(1499).ignition,0);
  assert.equal(comparisonFrame(1950).ignition,.5);
  assert.deepEqual(comparisonFrame(COMPARISON_DURATION),{inserted:1,ignition:1,fading:1});
});
