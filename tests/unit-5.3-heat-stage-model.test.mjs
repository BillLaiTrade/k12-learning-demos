import test from 'node:test';
import assert from 'node:assert/strict';
import {HEAT_TARGET,validHeatTarget,secondsForWaterHeat,heatStageObservationAt as observe,heatSampleValues} from '../units/5/parts/5.3/assets/heat-stage-model.mjs';

test('自由目標含小數，100g水的熱量、末溫與溫升一致，到點精確停止',()=>{
  assert.equal(HEAT_TARGET.initial,1000);
  for(const heat of [100,333,750,750.5,1234.56,1500,3000]){
    const seconds=secondsForWaterHeat(heat),state=observe(seconds,heat);
    assert.equal(state.complete,true);assert.equal(state.waterCalories,heat);
    assert.ok(Math.abs(state.rise-heat/100)<1e-10);assert.ok(Math.abs(state.temperature-20-heat/100)<1e-10);
    assert.deepEqual(observe(seconds+1000,heat),state);assert.ok(state.temperature<=50);
  }
});
test('連續加熱全程守恆，容器與散熱另計，熱量和溫度單調一致',()=>{
  for(const target of [100,750.5,1000,3000]){
    let previous=0;
    for(let i=0;i<=100;i++){
      const state=observe(secondsForWaterHeat(target)*i/100,target);
      assert.ok(state.waterCalories>=previous);previous=state.waterCalories;
      assert.ok(Math.abs(state.waterCalories-100*state.rise)<1e-8);
      assert.ok(Math.abs(state.waterEnergy+state.containerEnergy+state.lostEnergy-state.suppliedEnergy)<1e-8);
      if(i){assert.ok(state.suppliedEnergy>state.waterEnergy);assert.ok(state.containerEnergy>0);assert.ok(state.lostEnergy>0);}
    }
  }
  assert.ok(secondsForWaterHeat(1000)>2*secondsForWaterHeat(500),'散熱影響時間，不把時間當吸熱量');
});
test('一次過程自動取樣約十至二十點，預設每100cal且保留小數終點',()=>{
  assert.deepEqual(heatSampleValues(1000),Array.from({length:10},(_,i)=>(i+1)*100));
  for(const target of [100,101.23,333,750,750.5,1234.56,3000]){
    const points=heatSampleValues(target);assert.equal(points.at(-1),target);
    assert.ok(points.length>=10&&points.length<=21);assert.equal(new Set(points).size,points.length);
    assert.ok(points.every((q,i)=>q>0&&q<=target&&(!i||q>points[i-1])));
  }
});
test('空白以外的無效模型數值與不可達目標被拒絕',()=>{
  for(const value of [0,99,3001,NaN,Infinity,-1]){assert.equal(validHeatTarget(value),false);assert.throws(()=>observe(0,value),RangeError);assert.throws(()=>heatSampleValues(value),RangeError);}
  for(const value of [-1,3001,NaN,Infinity])assert.throws(()=>secondsForWaterHeat(value),RangeError);
  for(const value of [-1,NaN,Infinity])assert.throws(()=>observe(value),RangeError);
});
