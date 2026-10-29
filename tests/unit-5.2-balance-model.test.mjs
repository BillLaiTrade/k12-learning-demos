import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balanceState, CONTACT_SECONDS, EQUILIBRIUM_SECONDS } from '../units/5/parts/5.2/assets/balance-model.mjs';

test('temperatures remain at their initial values before direct contact', () => {
  for (const elapsed of [0, 0.1, 0.4, CONTACT_SECONDS - 0.001]) {
    const s = balanceState('different', elapsed);
    assert.equal(s.a, 60); assert.equal(s.b, 20);
    assert.equal(s.touching, false); assert.equal(s.flow, false);
    assert.ok(s.gap > 0);
  }
});

test('equal aluminum masses approach 40°C monotonically without overshoot', () => {
  let previous = balanceState('different', CONTACT_SECONDS);
  for (let elapsed = CONTACT_SECONDS; elapsed <= EQUILIBRIUM_SECONDS + 1; elapsed += 0.1) {
    const s = balanceState('different', elapsed);
    assert.equal(s.a + s.b, 80);
    assert.ok(s.a <= previous.a && s.b >= previous.b);
    assert.ok(s.a >= 40 && s.b <= 40);
    assert.equal(s.gap, 0); assert.equal(s.touching, true);
    if (!s.complete) assert.equal(s.flow, true);
    previous = s;
  }
});

test('the two displayed readings agree exactly when net flow ends', () => {
  const s = balanceState('different', EQUILIBRIUM_SECONDS);
  assert.equal(s.a, 40); assert.equal(s.b, 40);
  assert.equal(s.complete, true); assert.equal(s.flow, false);
});

test('initially identical temperatures never exchange net heat', () => {
  for (const elapsed of [0, 0.3, CONTACT_SECONDS, 10, 100]) {
    const s = balanceState('same', elapsed);
    assert.equal(s.a, 40); assert.equal(s.b, 40);
    assert.equal(s.flow, false);
    assert.equal(s.complete, elapsed >= CONTACT_SECONDS);
  }
});
