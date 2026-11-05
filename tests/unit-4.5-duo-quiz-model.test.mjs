import {test} from 'node:test';
import assert from 'node:assert/strict';
import {QUESTION_BANK,PAPER_TYPES,INITIAL_QUESTION,INITIAL_SERIES,newQuestionSeries,challengeSignal,expectedAnswer,checkPrediction,shuffledQuestions,CHALLENGE_LAYOUT as L,filterIntersection,probeLinear,DUO_LIGHTS,DUO_FILTERS,SECONDARY_KEYS,PROBE_LINEAR,TRANSMISSION_OPTIONS,lightComponents,probeColourName} from '../units/4/parts/4.5/assets/duo-quiz-model.mjs';
import {SOURCE_LINEAR} from '../units/4/parts/4.5/assets/mix-optics.mjs';
import {LIGHTS,FILTERS} from '../units/4/parts/4.5/assets/color-model.mjs';
function checkSequence(series){
 assert.equal(series.length,6);assert.ok(series.every(q=>QUESTION_BANK.includes(q)));assert.equal(new Set(series.map(q=>q.id)).size,6);
 assert.ok(series.every(q=>q.lights.every(k=>['red','green','blue'].includes(k))&&['clear',...q.lights].includes(q.filter)&&['white','red','green','blue'].includes(q.paper)));
 assert.ok(series.slice(0,2).every(q=>q.filter==='clear'&&q.paper==='white'));assert.ok(series.slice(0,4).every(q=>q.paper==='white'));
 assert.deepEqual(series.slice(1).map(q=>q.lights),Array(5).fill(series[1].lights));assert.notEqual(series[2].filter,series[3].filter);assert.equal(series[4].filter,series[3].filter);assert.equal(series[5].filter,series[3].filter);assert.equal(series[4].paper,series[3].filter);assert.equal(series[5].paper,series[2].filter);
 for(let i=1;i<6;i++){const a=series[i-1],b=series[i],changed=Number(a.lights[0]!==b.lights[0])+Number(a.lights[1]!==b.lights[1])+Number(a.filter!==b.filter)+Number(a.paper!==b.paper);assert.equal(changed,1);}
 assert.equal(expectedAnswer(series[4]).reflection,'much');assert.equal(expectedAnswer(series[5]).reflection,'little');assert.equal(expectedAnswer(series[5]).colour,'dark');
}
test('72種基礎配置只有兩束不同原色、原色色片與白／原色紙，保持共用資料',()=>{
 assert.equal(QUESTION_BANK.length,72);assert.equal(new Set(QUESTION_BANK.map(q=>q.id)).size,72);assert.equal(Object.keys(PAPER_TYPES).length,8);assert.equal(Object.keys(DUO_LIGHTS).length,7);assert.equal(Object.keys(DUO_FILTERS).length,7);assert.equal(Object.keys(LIGHTS).length,4);assert.equal(Object.keys(FILTERS).length,4);
 for(const q of QUESTION_BANK){assert.equal(q.lights.length,2);assert.notEqual(q.lights[0],q.lights[1]);assert.ok(q.lights.every(k=>['red','green','blue'].includes(k)));assert.ok(['clear',...q.lights].includes(q.filter));assert.ok(['white','red','green','blue'].includes(q.paper));assert.notEqual(expectedAnswer(q).transmission,'dark');}
 assert.deepEqual(new Set(shuffledQuestions(()=>.31).map(q=>q.id)),new Set(QUESTION_BANK.map(q=>q.id)));assert.deepEqual(expectedAnswer(INITIAL_QUESTION),{colour:'dark',transmission:'green',reflection:'little'});
});
test('所有基礎題逐色守恆，色片與紙張都不製造不存在的色光',()=>{
 for(const q of QUESTION_BANK){const s=challengeSignal(q);assert.equal(s.incoming.reduce((a,b)=>a+b),2);for(let i=0;i<3;i++){assert.ok(s.incoming[i]>=s.transmitted[i]&&s.transmitted[i]>=s.outgoing[i]&&s.outgoing[i]>=0);assert.ok(Math.abs(s.filterAbsorbed[i]+s.paperAbsorbed[i]+s.outgoing[i]-s.incoming[i])<1e-12);if(!s.incoming[i])assert.equal(s.outgoing[i]+s.transmitted[i],0);}}
});
test('初始六題從混光、只換色片到只換紙張，每次只改一個條件',()=>{
 checkSequence(INITIAL_SERIES);
 assert.deepEqual(INITIAL_SERIES.map(expectedAnswer),[{colour:'yellow',transmission:'yellow',reflection:'much'},{colour:'magenta',transmission:'magenta',reflection:'much'},{colour:'red',transmission:'red',reflection:'much'},{colour:'blue',transmission:'blue',reflection:'much'},{colour:'blue',transmission:'blue',reflection:'much'},{colour:'dark',transmission:'blue',reflection:'little'}]);
});
test('100次換組均維持逐步比較，六題不重複前組且可看到三種混光',()=>{
 let previous=INITIAL_SERIES;const mixtures=new Set();for(let n=0;n<100;n++){const next=newQuestionSeries(()=>n/100,previous);checkSequence(next);assert.ok(next.every(q=>!previous.some(old=>old.id===q.id)));next.slice(0,2).forEach(q=>mixtures.add(expectedAnswer(q).colour));previous=next;}assert.deepEqual([...mixtures].sort(),['cyan','magenta','yellow']);for(const random of[()=>0,()=>1])checkSequence(newQuestionSeries(random,previous));
});
test('每題分別判斷外觀、到達色光與反射，支援白光且漏答不過關',()=>{
 for(const q of QUESTION_BANK){const answer=expectedAnswer(q);assert.ok(TRANSMISSION_OPTIONS.some(([key])=>key===answer.transmission));assert.equal(checkPrediction(q,answer).correct,true);assert.equal(checkPrediction(q,{...answer,transmission:''}).missing[0],'transmission');for(const key of Object.keys(answer)){const result=checkPrediction(q,{...answer,[key]:'wrong'});assert.equal(result.correct,false);assert.equal(result.fields[key],false);assert.equal(Object.values(result.fields).filter(Boolean).length,2);}}
 const white={lights:['white','white'],filter:'clear',paper:'white'};assert.equal(expectedAnswer(white).transmission,'white');assert.equal(expectedAnswer(white).colour,'white');
});
test('兩燈到紙張四角的直線都經過色片，沒有繞過色片的捷徑',()=>{
 for(const from of L.sources)for(const y of[L.axis-L.halfHeight,L.axis+L.halfHeight])for(const z of[-L.halfWidth,L.halfWidth]){const hit=filterIntersection(from,[L.paperX,y,z]);assert.equal(hit[0],L.filterX);assert.ok(Math.abs(hit[1]-L.axis)<=L.halfHeight);assert.ok(Math.abs(hit[2])<=L.halfWidth);}
});
test('保留的七種光譜資料沿同一組線性原色相加，同色或分開不會錯誤疊加',()=>{
 for(const [key,light]of Object.entries(DUO_LIGHTS))for(let c=0;c<3;c++)assert.ok(Math.abs(PROBE_LINEAR[key][c]-light.rgb.reduce((sum,n,i)=>sum+n*SOURCE_LINEAR[i][c],0))<1e-12);
 for(const a of Object.keys(DUO_LIGHTS))for(const b of Object.keys(DUO_LIGHTS)){const lamps=[{colour:a,x:.5,y:.5},{colour:b,x:.5,y:.5}];for(let c=0;c<3;c++)assert.ok(Math.abs(probeLinear(.5,.5,lamps)[c]-PROBE_LINEAR[a][c]-PROBE_LINEAR[b][c])<1e-12);}
 const separated=[{colour:'yellow',x:.2,y:.5},{colour:'blue',x:.8,y:.5}];assert.deepEqual(probeLinear(.2,.5,separated),PROBE_LINEAR.yellow);assert.equal(lightComponents('magenta'),'紅光＋藍光');assert.equal(lightComponents('white'),'紅光＋綠光＋藍光');
});
test('複合光開關不改顏色或位置，關閉不提供色光；顯色名稱依實際色塊',()=>{
 const lamps=[{colour:'cyan',x:.5,y:.5,on:true},{colour:'white',x:.5,y:.5,on:false}];assert.deepEqual(probeLinear(.5,.5,lamps),PROBE_LINEAR.cyan);lamps[0].on=false;assert.deepEqual(probeLinear(.5,.5,lamps),[0,0,0]);assert.equal(probeColourName([255,0,255]),'洋紅色');assert.equal(probeColourName([255,128,0]),'橙色');assert.equal(probeColourName([252,252,252]),'白色');
});
