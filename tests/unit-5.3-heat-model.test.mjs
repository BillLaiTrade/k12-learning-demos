import test from 'node:test';
import assert from 'node:assert/strict';
import { MATERIALS, temperature, samplesFor, reading } from '../units/5/parts/5.3/assets/heat-model.mjs';

test('100 g 水吸收 1,000 cal 升高 10°C，零熱量保留初溫', () => {
  assert.equal(temperature({heat: 1000, mass: 100, c: 1}), 30);
  assert.equal(temperature({heat: 0, mass: 100, c: 1, initial: 37}), 37);
});
test('固定質量，熱量加倍使升溫加倍；固定熱量，質量加倍使升溫減半', () => {
  const rise = (heat,mass) => temperature({heat,mass,c:1})-20;
  assert.equal(rise(2000,100),2*rise(1000,100));
  assert.equal(rise(1000,200),rise(1000,100)/2);
});
test('各實驗熱量、質量與材料的邊界均符合能量關係且無相變', () => {
  for (const [mode, settings, heats] of [
    ['heat',[500,2000],[0,500,2000]],
    ['mass',[100,200,300],[0,1000]],
    ['material',['aluminum','iron','copper'],[0,500]],
  ]) for (const setting of settings) for (const sample of samplesFor(mode,setting)) for (const heat of heats) {
    const result=reading(sample,heat);
    assert.ok(Math.abs(result.mass*result.c*result.rise-heat)<1e-8);
    assert.ok(result.temperature>=20 && result.temperature<80);
  }
});
test('同質量同熱量，較大比熱對應較小升溫', () => {
  const values=['water','aluminum','iron','copper'].map(material=>temperature({heat:500,mass:100,c:MATERIALS[material].c}));
  assert.deepEqual(values,[...values].sort((a,b)=>a-b));
  assert.equal(values[0],25);
  assert.ok(Math.abs(values[3]-73.76344086)<1e-7);
});
test('降溫的熱量有正確的符號與大小', () => {
  assert.equal(temperature({heat:-1000,mass:100,c:1,initial:40}),30);
});
test('不接受零或負質量、零比熱與非有限值', () => {
  for (const mass of [0,-1,NaN,Infinity]) assert.throws(()=>temperature({heat:100,mass,c:1}),RangeError);
  assert.throws(()=>temperature({heat:100,mass:100,c:0}),RangeError);
  assert.throws(()=>temperature({heat:Infinity,mass:100,c:1}),RangeError);
});
