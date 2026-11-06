import test from 'node:test';
import assert from 'node:assert/strict';
import {bottleReading,BOTTLE_COMPARISON} from '../units/5/parts/5.3/assets/application-model.mjs';

test('水袋降溫與正值放熱量同源，從50到40°C放出5000cal',()=>{
  assert.deepEqual(bottleReading(0),{temperature:50,drop:0,heat:0});
  assert.deepEqual(bottleReading(1),{temperature:40,drop:10,heat:5000});
  for(let i=0;i<=100;i++){
    const state=bottleReading(i/100);
    assert.ok(Math.abs(state.heat-500*(50-state.temperature))<1e-9);
    assert.ok(Math.abs(state.drop-i/10)<1e-12);
    assert.ok(state.heat>=0&&state.heat<=5000);
  }
});
test('同500g、同降10°C，鋁放熱1100cal，長條應為水的22%',()=>{
  assert.deepEqual(BOTTLE_COMPARISON,{water:5000,aluminum:1100});
  assert.equal(BOTTLE_COMPARISON.aluminum/BOTTLE_COMPARISON.water,.22);
});
test('放熱示意進度拒絕越界及非有限值',()=>{
  for(const value of [-.01,1.01,NaN,Infinity])assert.throws(()=>bottleReading(value),RangeError);
});
