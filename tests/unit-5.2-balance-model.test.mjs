import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balanceState, moveBlock, EQUILIBRIUM_SECONDS, MIN_OFFSET, MAX_OFFSET } from '../units/5/parts/5.2/assets/balance-model.mjs';

test('zero contact time keeps the initial temperatures', () => {
  const s=balanceState('different',0);assert.equal(s.a,60);assert.equal(s.b,20);assert.equal(s.complete,false);
});
test('same masses converge monotonically without overshoot, conserving the temperature sum', () => {
  let previous=balanceState('different',0);
  for(let t=0;t<EQUILIBRIUM_SECONDS+1;t+=.1){const s=balanceState('different',t);assert.equal(s.a+s.b,80);assert.ok(s.a<=previous.a&&s.b>=previous.b);assert.ok(s.a>=40&&s.b<=40);previous=s;}
});
test('equilibrium and initially same temperatures have identical readings', () => {
  const s=balanceState('different',EQUILIBRIUM_SECONDS);assert.equal(s.a,40);assert.equal(s.b,40);assert.equal(s.complete,true);
  for(const t of [0,.3,10,100]){const same=balanceState('same',t);assert.equal(same.a,40);assert.equal(same.b,40);assert.equal(same.complete,true);}
});
test('either block snaps into contact and cannot pass through the other', () => {
  for(const target of [25,80])assert.deepEqual(moveBlock({a:-28,b:28},'a',target),{a:28,b:28});
  for(const target of [-25,-80])assert.deepEqual(moveBlock({a:-28,b:28},'b',target),{a:-28,b:-28});
});
test('pulling apart and chamber bounds work for both blocks', () => {
  assert.deepEqual(moveBlock({a:28,b:28},'a',15),{a:15,b:28});assert.deepEqual(moveBlock({a:28,b:28},'b',40),{a:28,b:40});
  assert.equal(moveBlock({a:-28,b:28},'a',-999).a,MIN_OFFSET);assert.equal(moveBlock({a:-28,b:28},'b',999).b,MAX_OFFSET);
});
test('position changes do not mutate inputs or reset accumulated temperature state', () => {
  const positions={a:-28,b:28},held=balanceState('different',3.2);moveBlock(positions,'a',28);moveBlock({a:28,b:28},'b',85);
  assert.deepEqual(positions,{a:-28,b:28});assert.deepEqual(balanceState('different',3.2),held);assert.ok(balanceState('different',4).a<held.a);
});
