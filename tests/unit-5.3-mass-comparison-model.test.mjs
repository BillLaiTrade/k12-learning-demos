import test from 'node:test';
import assert from 'node:assert/strict';
import {MASS_CHOICES,massHeatingSeconds,massObservationAt as observe} from '../units/5/parts/5.3/assets/mass-comparison-model.mjs';
test('相同水吸熱1000cal，自由水量100～350g含小數的溫升為1000÷水量，各自精確停熱',()=>{
 [...MASS_CHOICES,150,175.5,333.3,350].forEach(mass=>{const end=observe(mass,massHeatingSeconds(mass));assert.equal(end.complete,true);assert.equal(end.waterCalories,1000);assert.ok(Math.abs(end.rise-1000/mass)<1e-12);assert.ok(Math.abs(end.temperature-20-1000/mass)<1e-12);assert.deepEqual(observe(mass,1e5),end);assert.equal(observe(mass,0).temperature,20);});
});
test('全段能量守恆，容器與散熱另計，單調升溫且不強制同時完成',()=>{
 for(const mass of [...MASS_CHOICES,150,175.5,333.3,350]){let previous=0;for(let i=0;i<=100;i++){const s=observe(mass,massHeatingSeconds(mass)*i/100);assert.ok(Math.abs(s.waterEnergy+s.containerEnergy+s.lostEnergy-s.suppliedEnergy)<1e-8);assert.ok(s.waterCalories>=previous);assert.ok(s.waterCalories<=1000);assert.ok(Math.abs(s.rise*mass-s.waterCalories)<1e-8);previous=s.waterCalories;}const end=observe(mass,1e5);assert.ok(end.suppliedEnergy>end.waterEnergy);assert.ok(end.containerEnergy>0);assert.ok(end.lostEnergy>0);}
 const middle=(massHeatingSeconds(100)+massHeatingSeconds(200))/2;assert.equal(observe(100,middle).complete,false);assert.equal(observe(200,middle).complete,true);
});
test('非法質量與時間被拒絕',()=>{for(const mass of [0,99,351,NaN,Infinity])assert.throws(()=>observe(mass,0),RangeError);for(const seconds of [-1,NaN,Infinity])assert.throws(()=>observe(100,seconds),RangeError);});
