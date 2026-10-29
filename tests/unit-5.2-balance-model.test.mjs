import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialTemperatures, advanceBalance, balanceState, moveBlock, ROOM_C, ROOM_RATE, MIN_OFFSET, MAX_OFFSET } from '../units/5/parts/5.2/assets/balance-model.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('the single hot/cold scenario starts at 60°C and 20°C in a 25°C room',()=>{
 assert.equal(ROOM_C,25);assert.deepEqual(initialTemperatures(),{a:60,b:20});
});
test('separated blocks still slowly exchange heat with their surroundings',()=>{
 const s=advanceBalance(initialTemperatures(),56,4);assert.ok(s.a<60&&s.a>25);assert.ok(s.b>20&&s.b<25);
 assert.ok(s.a+s.b<80);assert.equal(balanceState(s,56).complete,false);
});
test('direct contact reduces the temperature difference much faster',()=>{
 const apart=advanceBalance(initialTemperatures(),56,4),together=advanceBalance(initialTemperatures(),0,4);
 assert.ok(together.a-together.b<(apart.a-apart.b)/4);near((apart.a+apart.b)/2,(together.a+together.b)/2);
});
test('the pair mean cools according to its room exchange rather than staying at 40°C',()=>{
 for(const gap of [0,10,56,200]){const s=advanceBalance(initialTemperatures(),gap,10);near((s.a+s.b)/2,25+15*Math.exp(-ROOM_RATE*10));}
});
test('matching block temperatures above room temperature keep cooling together',()=>{
 const s=advanceBalance({a:40,b:40},56,8);assert.ok(s.a<40&&s.a>25);near(s.a,s.b);assert.equal(balanceState(s,56).pairClose,true);assert.equal(balanceState(s,56).complete,false);
 const state=balanceState(s,0);assert.ok(state.rateA<0&&state.rateB<0);
});
test('all blocks eventually settle at room temperature in either geometry',()=>{
 for(const gap of [0,56,200]){const s=advanceBalance(initialTemperatures(),gap,300);assert.deepEqual(s,{a:25,b:25});assert.equal(balanceState(s,gap).complete,true);}
 assert.deepEqual(advanceBalance({a:25,b:25},0,100),{a:25,b:25});
});
test('separation and recontact are continuous and never reset readings',()=>{
 const s=advanceBalance(initialTemperatures(),0,3);assert.deepEqual(advanceBalance(s,80,0),s);
 const apart=advanceBalance(s,80,3);assert.ok(apart.a<s.a&&apart.b<s.b);assert.deepEqual(advanceBalance(apart,0,0),apart);
 const contact=advanceBalance(apart,0,1);assert.ok(contact.a-contact.b<apart.a-apart.b);assert.ok(contact.a<60&&contact.b>20);
});
test('analytic steps are partition-independent and do not overshoot',()=>{
 for(const gap of [0,56]){const one=advanceBalance(initialTemperatures(),gap,10);let many=initialTemperatures();for(let i=0;i<100;i++)many=advanceBalance(many,gap,.1);near(one.a,many.a);near(one.b,many.b);assert.ok(many.a>=many.b&&many.a<=60&&many.b>=20);}
 const cold=advanceBalance({a:10,b:10},56,10);assert.ok(cold.a>10&&cold.a<25);near(cold.a,cold.b);
});
test('either block snaps into contact without overlap and stays within the chamber',()=>{
 for(const target of [25,80])assert.deepEqual(moveBlock({a:-28,b:28},'a',target),{a:28,b:28});
 for(const target of [-25,-80])assert.deepEqual(moveBlock({a:-28,b:28},'b',target),{a:-28,b:-28});
 assert.equal(moveBlock({a:-28,b:28},'a',-999).a,MIN_OFFSET);assert.equal(moveBlock({a:-28,b:28},'b',999).b,MAX_OFFSET);
});
