import {test} from 'node:test';
import assert from 'node:assert/strict';
import {QUESTION_BANK,PAPER_TYPES,INITIAL_QUESTION,INITIAL_SERIES,newQuestionSeries,challengeSignal,expectedAnswer,checkPrediction,shuffledQuestions,CHALLENGE_LAYOUT as L,filterIntersection,probeLinear,DUO_LIGHTS,DUO_FILTERS,SECONDARY_KEYS,PROBE_LINEAR,TRANSMISSION_OPTIONS,lightComponents,probeColourName} from '../units/4/parts/4.5/assets/duo-quiz-model.mjs';
import {SOURCE_LINEAR} from '../units/4/parts/4.5/assets/mix-optics.mjs';
import {LIGHTS,FILTERS} from '../units/4/parts/4.5/assets/color-model.mjs';
test('512題涵蓋原色／複合光、七種色片條件及八種紙張，不影響共用模型',()=>{
 assert.equal(QUESTION_BANK.length,512);assert.equal(new Set(QUESTION_BANK.map(q=>q.id)).size,512);assert.equal(Object.keys(PAPER_TYPES).length,8);assert.equal(Object.keys(DUO_LIGHTS).length,7);assert.equal(Object.keys(DUO_FILTERS).length,7);assert.equal(Object.keys(LIGHTS).length,4);assert.equal(Object.keys(FILTERS).length,4);
 for(const q of QUESTION_BANK){assert.equal(q.lights.length,2);assert.ok(q.lights.every(k=>DUO_LIGHTS[k]));assert.ok(DUO_FILTERS[q.filter]);assert.ok(PAPER_TYPES[q.paper]);assert.notEqual(expectedAnswer(q).transmission,'dark');}
 assert.deepEqual(new Set(shuffledQuestions(()=>.31).map(q=>q.id)),new Set(QUESTION_BANK.map(q=>q.id)));
 assert.deepEqual(expectedAnswer(INITIAL_QUESTION),{colour:'dark',transmission:'green',reflection:'little'});
});
test('所有題目逐色守恆，複合色片與紙張都不製造不存在的色光',()=>{
 for(const q of QUESTION_BANK){const s=challengeSignal(q);for(let i=0;i<3;i++){assert.ok(s.incoming[i]>=s.transmitted[i]&&s.transmitted[i]>=s.outgoing[i]&&s.outgoing[i]>=0);assert.ok(Math.abs(s.filterAbsorbed[i]+s.paperAbsorbed[i]+s.outgoing[i]-s.incoming[i])<1e-12);if(!s.incoming[i])assert.equal(s.outgoing[i]+s.transmitted[i],0);}}
 const q=QUESTION_BANK.find(q=>q.id==='yellow-yellow/cyan/yellow');assert.deepEqual(challengeSignal(q).incoming,[2,2,0]);assert.equal(challengeSignal(q).transmitted[2],0);assert.equal(expectedAnswer(q).transmission,'green');
});
test('初始六題以色片／紙張對照，白光經青片照紅紙仍很暗',()=>{
 assert.equal(INITIAL_SERIES.length,6);assert.ok(INITIAL_SERIES.every(Boolean));assert.equal(new Set(INITIAL_SERIES.map(q=>q.id)).size,6);
 assert.deepEqual(INITIAL_SERIES.map(expectedAnswer),[{colour:'yellow',transmission:'yellow',reflection:'much'},{colour:'green',transmission:'green',reflection:'much'},{colour:'magenta',transmission:'magenta',reflection:'much'},{colour:'red',transmission:'magenta',reflection:'some'},{colour:'green',transmission:'yellow',reflection:'some'},{colour:'dark',transmission:'cyan',reflection:'little'}]);
 assert.deepEqual(INITIAL_SERIES[0].lights,INITIAL_SERIES[1].lights);assert.equal(INITIAL_SERIES[0].paper,INITIAL_SERIES[1].paper);assert.notEqual(INITIAL_SERIES[0].filter,INITIAL_SERIES[1].filter);
 assert.deepEqual(INITIAL_SERIES[2].lights,INITIAL_SERIES[3].lights);assert.equal(INITIAL_SERIES[2].filter,INITIAL_SERIES[3].filter);assert.notEqual(INITIAL_SERIES[2].paper,INITIAL_SERIES[3].paper);assert.deepEqual(challengeSignal(INITIAL_SERIES[5]).incoming,[2,2,2]);assert.equal(INITIAL_SERIES.filter(q=>q.paper!=='white').length,5);
});
test('100次換組保留對照關係、四種複合光與三種複合色片，且不重複前組',()=>{
 let previous=INITIAL_SERIES;for(let n=0;n<100;n++){const next=newQuestionSeries(()=>n/100,previous);assert.equal(next.length,6);assert.equal(new Set(next.map(q=>q.id)).size,6);assert.ok(next.every(q=>QUESTION_BANK.includes(q)&&!previous.some(old=>old.id===q.id)));assert.deepEqual(next[0].lights,next[1].lights);assert.equal(next[0].paper,next[1].paper);assert.notEqual(next[0].filter,next[1].filter);assert.deepEqual(next[2].lights,next[3].lights);assert.equal(next[2].filter,next[3].filter);assert.notEqual(next[2].paper,next[3].paper);for(const key of[...SECONDARY_KEYS,'white'])assert.ok(next.some(q=>q.lights.includes(key)));for(const key of SECONDARY_KEYS)assert.ok(next.some(q=>q.filter===key));assert.equal(next.filter(q=>q.paper!=='white').length,5);previous=next;}
});
test('每題分別判斷外觀、到達色光與反射，支援白光且漏答不過關',()=>{
 for(const q of QUESTION_BANK){const answer=expectedAnswer(q);assert.ok(TRANSMISSION_OPTIONS.some(([key])=>key===answer.transmission));assert.equal(checkPrediction(q,answer).correct,true);assert.equal(checkPrediction(q,{...answer,transmission:''}).missing[0],'transmission');for(const key of Object.keys(answer)){const result=checkPrediction(q,{...answer,[key]:'wrong'});assert.equal(result.correct,false);assert.equal(result.fields[key],false);assert.equal(Object.values(result.fields).filter(Boolean).length,2);}}
 const white=QUESTION_BANK.find(q=>q.id==='white-white/clear/white');assert.equal(expectedAnswer(white).transmission,'white');assert.equal(expectedAnswer(white).colour,'white');
});
test('兩燈到紙張四角的直線都經過色片，沒有繞過色片的捷徑',()=>{
 for(const from of L.sources)for(const y of[L.axis-L.halfHeight,L.axis+L.halfHeight])for(const z of[-L.halfWidth,L.halfWidth]){const hit=filterIntersection(from,[L.paperX,y,z]);assert.equal(hit[0],L.filterX);assert.ok(Math.abs(hit[1]-L.axis)<=L.halfHeight);assert.ok(Math.abs(hit[2])<=L.halfWidth);}
});
test('七種試光光源沿同一組線性原色相加，同色或分開不會錯誤疊加',()=>{
 for(const [key,light]of Object.entries(DUO_LIGHTS))for(let c=0;c<3;c++)assert.ok(Math.abs(PROBE_LINEAR[key][c]-light.rgb.reduce((sum,n,i)=>sum+n*SOURCE_LINEAR[i][c],0))<1e-12);
 for(const a of Object.keys(DUO_LIGHTS))for(const b of Object.keys(DUO_LIGHTS)){const lamps=[{colour:a,x:.5,y:.5},{colour:b,x:.5,y:.5}];for(let c=0;c<3;c++)assert.ok(Math.abs(probeLinear(.5,.5,lamps)[c]-PROBE_LINEAR[a][c]-PROBE_LINEAR[b][c])<1e-12);}
 const separated=[{colour:'yellow',x:.2,y:.5},{colour:'blue',x:.8,y:.5}];assert.deepEqual(probeLinear(.2,.5,separated),PROBE_LINEAR.yellow);assert.equal(lightComponents('magenta'),'紅光＋藍光');assert.equal(lightComponents('white'),'紅光＋綠光＋藍光');
});
test('複合光開關不改顏色或位置，關閉不提供色光；顯色名稱依實際色塊',()=>{
 const lamps=[{colour:'cyan',x:.5,y:.5,on:true},{colour:'white',x:.5,y:.5,on:false}];assert.deepEqual(probeLinear(.5,.5,lamps),PROBE_LINEAR.cyan);lamps[0].on=false;assert.deepEqual(probeLinear(.5,.5,lamps),[0,0,0]);assert.equal(probeColourName([255,0,255]),'洋紅色');assert.equal(probeColourName([255,128,0]),'橙色');assert.equal(probeColourName([252,252,252]),'白色');
});
