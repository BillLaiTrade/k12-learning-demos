import test from 'node:test';
import assert from 'node:assert/strict';
import {CALORIE_SETUP as s,HEATING_SECONDS,calorieObservationAt as observe} from '../units/5/parts/5.3/assets/calorie-model.mjs';

test('100 g 水由 20°C 升到 21°C，水吸熱約 100 cal，供熱包含容器與散熱',()=>{
  assert.equal(observe(0).temperature,20);
  const end=observe(HEATING_SECONDS);
  assert.equal(s.mass,100);assert.equal(end.temperature,21);assert.equal(end.rise,1);
  assert.equal(end.waterCalories,100);assert.ok(end.containerEnergy>0);assert.ok(end.lostEnergy>0);
  assert.ok(end.suppliedEnergy>end.waterEnergy);
  assert.ok(HEATING_SECONDS>20&&HEATING_SECONDS<30);
});
test('升溫單調且守恆，動畫加速不改變熱量或端點',()=>{
  let previous=20;
  for(let i=0;i<=100;i++){
    const state=observe(HEATING_SECONDS*i/100);
    assert.ok(state.temperature>=previous);previous=state.temperature;
    assert.ok(Math.abs(state.waterEnergy+state.containerEnergy+state.lostEnergy-state.suppliedEnergy)<1e-8);
    assert.ok(Math.abs(state.waterCalories-s.mass*state.rise)<1e-8);
  }
  assert.deepEqual(observe(1000),observe(HEATING_SECONDS));
});
test('沒有供熱時保留初溫，拒絕非法時間',()=>{
  const state=observe(0);assert.equal(state.waterEnergy,0);assert.equal(state.lostEnergy,0);assert.equal(state.complete,false);
  for(const value of [-1,NaN,Infinity])assert.throws(()=>observe(value),RangeError);
});
