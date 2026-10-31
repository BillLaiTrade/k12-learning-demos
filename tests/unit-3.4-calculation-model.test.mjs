import {test} from 'node:test';
import assert from 'node:assert/strict';
import {distanceFromEcho} from '../units/3/parts/3.4/assets/echo-model.mjs';
import {normaliseTime, calculationDuration, calculationTaps, calculationFrame} from '../units/3/parts/3.4/assets/calculation-lab.mjs';

test('round-trip time yields a total path and two equal one-way legs', () => {
  for (const [time, total, leg] of [[4,1360,680],[.125,42.5,21.25],[1.75,595,297.5],[12,4080,2040],[60,20400,10200]]) {
    const result = distanceFromEcho(time, 340);
    assert.equal(result.total, total); assert.equal(result.distance, leg);
  }
});
test('free numeric time accepts decimals and values outside the old 2–6 second range', () => {
  for (const time of [.1,.125,1.75,4,12,60]) assert.equal(normaliseTime(time), time);
  assert.equal(normaliseTime(0),.1); assert.equal(normaliseTime(-5),.1);
  assert.equal(normaliseTime(1e100),60); assert.equal(normaliseTime(NaN,7.5),7.5);
});
test('one original and one weaker return use the entered real seconds, with time for the last pulse to finish', () => {
  for (const time of [.1,4,12,60]) {
    assert.deepEqual(calculationTaps(time),[{delay:0,gain:1},{delay:time,gain:.45}]);
    assert.ok(calculationDuration(time) >= time + .13);
  }
});
test('outbound and return share endpoints and the receiver arrives at exactly the entered time', () => {
  assert.deepEqual(calculationFrame(4,0),{stage:'outbound',x:260,elapsed:0});
  assert.equal(calculationFrame(4,1).x,calculationFrame(4,3).x);
  assert.equal(calculationFrame(4,2).x,895); assert.equal(calculationFrame(4,2).stage,'returning');
  assert.deepEqual(calculationFrame(4,4),{stage:'received',x:260,elapsed:4});
  assert.deepEqual(calculationFrame(4,8),{stage:'received',x:260,elapsed:4});
});
