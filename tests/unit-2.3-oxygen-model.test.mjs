import {test} from 'node:test';
import assert from 'node:assert/strict';
import {preparationFrame,comparisonFrame,PREPARATION_DURATION,COMPARISON_DURATION} from '../units/2/parts/2.3/assets/oxygen-model.mjs';
test('tube entry precedes displacement; withdrawal precedes glass cover',()=>{
 assert.equal(preparationFrame(1999).stage,0);
 for(const t of[2000,3000,4799]){const f=preparationFrame(t);assert.equal(f.purging,true);assert.equal(f.tube,0);assert.equal(f.collected,0);}
 assert.ok(preparationFrame(5150).tube>0&&preparationFrame(5150).tube<1);assert.equal(preparationFrame(5499).collected,0);
 assert.equal(preparationFrame(7750).collected,.5);assert.equal(preparationFrame(10000).collected,1);
 for(let t=0;t<=PREPARATION_DURATION;t+=20){const f=preparationFrame(t);if(f.collected>0&&f.collected<1)assert.equal(f.tube,1);if(f.cover>0)assert.equal(f.tube,0);if(f.covered)assert.equal(f.cover,1);}
 assert.ok(preparationFrame(10400).tube>0);assert.equal(preparationFrame(10400).cover,0);assert.equal(preparationFrame(10800).tube,0);assert.equal(preparationFrame(12200).covered,true);
});
test('shared insertion completes before oxygen ignition; results remain at duration',()=>{
 assert.deepEqual(comparisonFrame(0),{inserted:0,ignition:0,fading:0});assert.equal(comparisonFrame(750).inserted,.5);
 assert.equal(comparisonFrame(1500).inserted,1);assert.equal(comparisonFrame(2000).ignition,0);assert.equal(comparisonFrame(2600).ignition,.5);
 assert.deepEqual(comparisonFrame(COMPARISON_DURATION),{inserted:1,ignition:1,fading:1});
});

test('selected step stays bounded at both ends without leaking into the next step',async()=>{
 const {preparationStepFrame,STEP_DURATIONS}=await import('../units/2/parts/2.3/assets/oxygen-model.mjs');
 for(let stage=0;stage<4;stage++){
  const first=preparationStepFrame(stage,-500),last=preparationStepFrame(stage,STEP_DURATIONS[stage]+99999);
  assert.equal(first.stage,stage);assert.equal(first.localTime,0);assert.equal(last.stage,stage);assert.equal(last.localTime,STEP_DURATIONS[stage]);
 }
 assert.equal(preparationStepFrame(1,99999).purging,true);assert.equal(preparationStepFrame(1,99999).collected,0);
 assert.equal(preparationStepFrame(2,99999).collected,1);assert.equal(preparationStepFrame(2,99999).tube,1);assert.equal(preparationStepFrame(2,99999).cover,0);
 assert.equal(preparationStepFrame(3,0).collected,1);assert.equal(preparationStepFrame(3,99999).covered,true);
});
