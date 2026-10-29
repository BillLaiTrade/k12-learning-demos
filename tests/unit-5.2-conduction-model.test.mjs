import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROOM_C, HEATER_C, initialConduction, advanceConduction, conductionRates, conductionSample } from '../units/5/parts/5.2/assets/conduction-model.mjs';

test('three probes and all segments start at the same room temperature', () => {
  const a = initialConduction(), b = initialConduction();
  assert.equal(a.length, 9); assert.ok(a.every(v => v === ROOM_C)); a[0] = 80; assert.equal(b[0], ROOM_C);
});
test('heat enters only the pan; other nodes receive heat through their neighbours', () => {
  const rates = conductionRates(initialConduction(), 'metal'); assert.ok(rates[0] > 0); assert.ok(rates.slice(1).every(v => v === 0));
});
test('both materials warm in order from pan to joint to distal grip without overshoot', () => {
  for (const material of ['metal','wood']) {
    let values = initialConduction();
    for (let i=0;i<500;i++) {
      values = advanceConduction(values, material, .4);
      assert.ok(values.every(v => v >= ROOM_C && v <= HEATER_C));
      assert.ok(values.every((v,j) => j === 0 || values[j-1] >= v));
    }
    const sample = conductionSample(values, material); assert.ok(sample.body > sample.joint && sample.joint > sample.tip && sample.tip > ROOM_C);
  }
});
test('metal transfers heat to the grip faster; wood is a conductor with a small nonzero distal rise', () => {
  const metal = conductionSample(advanceConduction(initialConduction(),'metal',30),'metal');
  const wood = conductionSample(advanceConduction(initialConduction(),'wood',30),'wood');
  assert.ok(metal.tip > wood.tip + 3); assert.ok(wood.tip > ROOM_C); assert.ok(wood.joint > 50);
});
test('energy balance includes the heater and loss to the room, with internal transfers cancelling', () => {
  const values=[70,50,45,40,35,32,30,28,27];
  for(const material of ['metal','wood']) {
    const caps=[12,2,...Array(7).fill(material==='wood'?.2:.5)];
    const power=conductionRates(values,material).reduce((sum,r,i)=>sum+r*caps[i],0);
    const external=HEATER_C-values[0]-values.reduce((sum,v,i)=>sum+(i===0?.02:i===1?.06:.08)*(v-ROOM_C),0);
    assert.ok(Math.abs(power-external)<1e-10);
  }
});
test('continuing heating approaches a gradient, while heat still flows and escapes to the room', () => {
  for(const material of ['metal','wood']) {
    const values=advanceConduction(initialConduction(),material,300),sample=conductionSample(values,material);
    assert.equal(sample.steady,true); assert.ok(sample.jointFlux>1); assert.ok(sample.body>sample.joint && sample.joint>sample.tip);
  }
});
test('small frame steps agree with larger stable integrations and do not mutate input', () => {
  const start=initialConduction(),large=advanceConduction(start,'metal',30);let small=start;
  for(let i=0;i<900;i++)small=advanceConduction(small,'metal',1/30);
  assert.ok(large.every((v,i)=>Math.abs(v-small[i])<.03)); assert.deepEqual(start,initialConduction());
  assert.deepEqual(advanceConduction(start,'wood',0),start);assert.deepEqual(advanceConduction(start,'wood',NaN),start);
});
