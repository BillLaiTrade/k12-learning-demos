import {test} from 'node:test';
import assert from 'node:assert/strict';
import {depthAt, returnTime, pointName} from '../units/3/parts/3.4/assets/sonar-lab.mjs';
test('water speed and round trips agree at shallow, middle and deep locations',()=>{
 for(const [x,depth,time] of [[300,502.5,.67],[500,892.5,1.19],[700,1275,1.7],[760,2250,3]]){assert.equal(depthAt(x),depth);assert.equal(returnTime(x),time);assert.ok(Math.abs(1500*time/2-depth)<1e-8);}
 for(let x=100;x<=900;x+=.7){assert.ok(depthAt(x)>=150&&depthAt(x)<=2250);assert.ok(Math.abs(returnTime(x)*1500/2-depthAt(x))<1e-8);assert.ok(Math.abs(depthAt(x+.7)-depthAt(x))<100);}
});
test('student-created labels continue beyond Z without preassigned positions',()=>{assert.deepEqual([0,1,25,26,27,51,52].map(pointName),['A','B','Z','AA','AB','AZ','BA']);});

test('composite terrain contains a shallow shelf, slope, broad plain, isolated seamount and deep narrow trench',()=>{
 assert.equal(depthAt(100),150);assert.ok(depthAt(220)<=200);assert.ok(depthAt(410)-depthAt(240)>1000);
 const plain=Array.from({length:121},(_,i)=>depthAt(570+i));assert.ok(Math.max(...plain)-Math.min(...plain)<50);
 assert.ok(Math.min(depthAt(450),depthAt(550))-depthAt(500)>=375);
 assert.equal(depthAt(760),2250);assert.ok(depthAt(760)-Math.max(depthAt(700),depthAt(820))>=900);
 assert.equal(returnTime(100),.2);assert.equal(returnTime(760),3);
});
