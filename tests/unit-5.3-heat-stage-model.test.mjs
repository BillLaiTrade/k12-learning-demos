import test from 'node:test';
import assert from 'node:assert/strict';
import {HEAT_STAGES,STAGE_SECONDS,secondsForWaterHeat,heatStageObservationAt as observe} from '../units/5/parts/5.3/assets/heat-stage-model.mjs';

test('100g水累計500／1000／2000cal對應25／30／40°C與5／10／20°C溫升',()=>{
  HEAT_STAGES.forEach((heat,i)=>{
    const state=observe(STAGE_SECONDS[i]);assert.equal(state.waterCalories,heat);
    assert.equal(state.temperature,[25,30,40][i]);assert.equal(state.rise,[5,10,20][i]);
    assert.ok(state.suppliedEnergy>state.waterEnergy);assert.ok(state.containerEnergy>0);assert.ok(state.lostEnergy>0);
  });
  assert.equal(observe(0).temperature,20);assert.equal(observe(0).waterCalories,0);
});
test('全程守恆，累計熱量單調，固定加熱設定下階段時長由模型決定',()=>{
  let previous=0;
  for(let i=0;i<=100;i++){
    const state=observe(STAGE_SECONDS.at(-1)*i/100);
    assert.ok(state.waterCalories>=previous);previous=state.waterCalories;
    assert.ok(Math.abs(state.waterCalories-100*state.rise)<1e-8);
    assert.ok(Math.abs(state.waterEnergy+state.containerEnergy+state.lostEnergy-state.suppliedEnergy)<1e-8);
    assert.ok(state.temperature<=40);
  }
  assert.ok(STAGE_SECONDS[0]<STAGE_SECONDS[1]-STAGE_SECONDS[0]);
  assert.ok(STAGE_SECONDS[2]-STAGE_SECONDS[1]>STAGE_SECONDS[1]-STAGE_SECONDS[0]);
  assert.deepEqual(observe(1e6),observe(STAGE_SECONDS.at(-1)));
});
test('累計熱量與時間換算互逆，非法值被拒絕',()=>{
  for(const heat of [0,100,333,500,1000,1500,2000])assert.ok(Math.abs(observe(secondsForWaterHeat(heat)).waterCalories-heat)<1e-8);
  for(const heat of [-1,2001,NaN,Infinity])assert.throws(()=>secondsForWaterHeat(heat),RangeError);
  for(const time of [-1,NaN,Infinity])assert.throws(()=>observe(time),RangeError);
});
