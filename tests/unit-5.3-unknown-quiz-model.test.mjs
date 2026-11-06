import test from 'node:test';
import assert from 'node:assert/strict';
import {QUESTION_SET,makeQuestion,observeQuestion,gradeQuestion} from '../units/5/parts/5.3/assets/unknown-quiz-model.mjs';

test('首題符合核可圖：水25°C、未知固體45°C，各100g吸收500cal',()=>{
  const q=makeQuestion();assert.equal(q.unknownLetter,'b');
  assert.deepEqual(observeQuestion(q,0),{heat:0,samples:{a:{rise:0,temperature:20},b:{rise:0,temperature:20}}});
  assert.deepEqual(observeQuestion(q,1),{heat:500,samples:{a:{rise:5,temperature:25},b:{rise:25,temperature:45}}});
  assert.equal(gradeQuestion(q,{riseA:'5.0',riseB:25,specificHeat:.2,comparison:'a'}).correct,true);
});
test('16組條件均同質量、同初溫、同吸熱，能量守恆、讀值可精確推算且最高70°C',()=>{
  assert.equal(QUESTION_SET.length,16);
  assert.equal(new Set(QUESTION_SET.map(q=>`${q.heat}/${q.waterLetter}/${q.samples[q.unknownLetter].c}`)).size,16);
  for(const q of QUESTION_SET){
    for(let i=0;i<=20;i++){
      const state=observeQuestion(q,i/20);
      for(const letter of ['a','b'])assert.ok(Math.abs(q.mass*q.samples[letter].c*state.samples[letter].rise-state.heat)<1e-8);
    }
    const end=observeQuestion(q,1);
    assert.ok(Math.max(end.samples.a.temperature,end.samples.b.temperature)<=70);
    for(const letter of ['a','b'])assert.ok(Math.abs(Number(end.samples[letter].temperature.toFixed(1))-end.samples[letter].temperature)<1e-8);
    assert.equal(gradeQuestion(q,{riseA:end.samples.a.rise,riseB:end.samples.b.rise,specificHeat:q.samples[q.unknownLetter].c,comparison:q.waterLetter}).correct,true);
  }
});
test('判定分辨未填／無效／錯誤，拒絕把末溫當溫升；保留合理小數容差',()=>{
  const q=makeQuestion();
  assert.ok(Object.values(gradeQuestion(q,{}).fields).every(s=>s==='missing'));
  assert.ok(Object.values(gradeQuestion(q,{riseA:0,riseB:Infinity,specificHeat:-1,comparison:'x'}).fields).every(s=>s==='invalid'));
  const wrong=gradeQuestion(q,{riseA:25,riseB:45,specificHeat:.3,comparison:'b'});assert.ok(Object.values(wrong.fields).every(s=>s==='incorrect'));
  assert.equal(gradeQuestion(q,{riseA:5.04,riseB:24.96,specificHeat:.204,comparison:'a'}).correct,true);
  assert.equal(gradeQuestion(q,{riseA:5.06,riseB:25,specificHeat:.206,comparison:'a'}).correct,false);
  const equal=makeQuestion({specificHeat:1});assert.equal(gradeQuestion(equal,{riseA:5,riseB:5,specificHeat:1,comparison:'same'}).correct,true);
});
test('拒絕無效模型條件與越界進度',()=>{
  for(const value of [0,-1,NaN,Infinity])assert.throws(()=>makeQuestion({specificHeat:value}),RangeError);
  for(const value of [0,-1,NaN,Infinity])assert.throws(()=>makeQuestion({heat:value}),RangeError);
  assert.throws(()=>makeQuestion({waterLetter:'x'}),RangeError);
  for(const value of [-.1,1.1,NaN,Infinity])assert.throws(()=>observeQuestion(makeQuestion(),value),RangeError);
});
