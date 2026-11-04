import {test} from 'node:test';
import assert from 'node:assert/strict';
import {QUESTION_BANK,PAPER_TYPES,INITIAL_QUESTION,INITIAL_SERIES,newQuestionSeries,challengeSignal,expectedAnswer,checkPrediction,shuffledQuestions,CHALLENGE_LAYOUT as L,filterIntersection,probeLinear} from '../units/4/parts/4.5/assets/duo-quiz-model.mjs';
import {SOURCE_LINEAR} from '../units/4/parts/4.5/assets/mix-optics.mjs';
test('72題涵蓋三種雙色、無色片／有效色片及八種紙張，輪內不重複',()=>{
 assert.equal(QUESTION_BANK.length,72);assert.equal(new Set(QUESTION_BANK.map(q=>q.id)).size,72);assert.equal(Object.keys(PAPER_TYPES).length,8);
 for(const q of QUESTION_BANK){assert.equal(new Set(q.lights).size,2);assert.ok(q.filter==='clear'||q.lights.includes(q.filter));}
 assert.deepEqual(new Set(shuffledQuestions(()=>.31).map(q=>q.id)),new Set(QUESTION_BANK.map(q=>q.id)));
 assert.deepEqual(expectedAnswer(INITIAL_QUESTION),{colour:'dark',transmission:'green',reflection:'little'});
});
test('所有題目逐色守恆，色片與紙張都不製造原先沒有的色光',()=>{
 for(const q of QUESTION_BANK){const s=challengeSignal(q);for(let i=0;i<3;i++){
  assert.ok(s.incoming[i]>=s.transmitted[i]&&s.transmitted[i]>=s.outgoing[i]&&s.outgoing[i]>=0);
  assert.ok(Math.abs(s.filterAbsorbed[i]+s.paperAbsorbed[i]+s.outgoing[i]-s.incoming[i])<1e-12);
  if(!s.incoming[i])assert.equal(s.outgoing[i]+s.transmitted[i],0);
 }}
 const plain={...INITIAL_QUESTION,filter:'clear'};assert.equal(expectedAnswer(plain).colour,'red');assert.equal(expectedAnswer(INITIAL_QUESTION).colour,'dark');
 const secondary=QUESTION_BANK.filter(q=>q.filter==='clear'&&q.paper==='white').map(q=>expectedAnswer(q).colour);assert.deepEqual(secondary,['yellow','magenta','cyan']);
});
test('每題分別判斷外觀、透射與反射，漏答與只猜對外觀都不過關',()=>{
 for(const q of QUESTION_BANK){const answer=expectedAnswer(q);assert.equal(checkPrediction(q,answer).correct,true);assert.equal(checkPrediction(q,{...answer,transmission:''}).missing[0],'transmission');
  for(const key of Object.keys(answer)){const result=checkPrediction(q,{...answer,[key]:'wrong'});assert.equal(result.correct,false);assert.equal(result.fields[key],false);assert.equal(Object.values(result.fields).filter(Boolean).length,2);}
 }
});
test('兩燈到紙張四角的所有直線都經過色片，沒有繞過色片的幾何捷徑',()=>{
 for(const from of L.sources)for(const y of[L.axis-L.halfHeight,L.axis+L.halfHeight])for(const z of[-L.halfWidth,L.halfWidth]){
  const hit=filterIntersection(from,[L.paperX,y,z]);assert.equal(hit[0],L.filterX);assert.ok(Math.abs(hit[1]-L.axis)<=L.halfHeight);assert.ok(Math.abs(hit[2])<=L.halfWidth);
 }
});
test('自由試光沿用第三區線性顯色，兩燈可同色且分開後不再疊加',()=>{
 for(const [a,b]of[[0,1],[0,2],[1,2],[0,0]]){const keys=['red','green','blue'],lamps=[{colour:keys[a],x:.5,y:.5},{colour:keys[b],x:.5,y:.5}];for(let c=0;c<3;c++)assert.ok(Math.abs(probeLinear(.5,.5,lamps)[c]-SOURCE_LINEAR[a][c]-SOURCE_LINEAR[b][c])<1e-12);}
 const separated=[{colour:'red',x:.2,y:.5},{colour:'blue',x:.8,y:.5}];assert.deepEqual(probeLinear(.2,.5,separated),SOURCE_LINEAR[0]);
});

test('兩燈開關不改顏色或足跡，關閉後不提供色光',()=>{
 const lamps=[{colour:'red',x:.5,y:.5,on:true},{colour:'green',x:.5,y:.5,on:false}];
 assert.deepEqual(probeLinear(.5,.5,lamps),[...SOURCE_LINEAR[0]]);
 lamps[0].on=false;assert.deepEqual(probeLinear(.5,.5,lamps),[0,0,0]);
});

test('六題初始情境涵蓋混光、紙張選色與色片，六種結果都可推論',()=>{
 assert.equal(INITIAL_SERIES.length,6);assert.ok(INITIAL_SERIES.every(Boolean));assert.equal(new Set(INITIAL_SERIES.map(q=>q.id)).size,6);
 assert.ok(INITIAL_SERIES.slice(0,3).every(q=>q.filter==='clear'));assert.ok(INITIAL_SERIES.slice(3).every(q=>q.filter!=='clear'));
 assert.deepEqual(INITIAL_SERIES.map(q=>expectedAnswer(q).colour),['yellow','magenta','green','dark','red','blue']);assert.equal(expectedAnswer(INITIAL_SERIES[2]).reflection,'some');
});
test('換組維持三題無色片及三題有色片，各雙色組合都有且不重複前組',()=>{
 let previous=INITIAL_SERIES;
 for(let n=0;n<8;n++){const next=newQuestionSeries(()=>n/8,previous);assert.equal(next.length,6);assert.equal(new Set(next.map(q=>q.id)).size,6);assert.ok(next.every(q=>QUESTION_BANK.includes(q)&&!previous.some(old=>old.id===q.id)));assert.ok(next.slice(0,3).every(q=>q.filter==='clear'));assert.ok(next.slice(3).every(q=>q.filter!=='clear'));for(const half of[next.slice(0,3),next.slice(3)])assert.equal(new Set(half.map(q=>q.lights.join('-'))).size,3);previous=next;}
});
