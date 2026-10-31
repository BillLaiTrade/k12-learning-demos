import {test} from 'node:test';
import assert from 'node:assert/strict';
import {depthAt, returnTime, pointName} from '../units/3/parts/3.4/assets/sonar-lab.mjs';
test('water speed and round trips agree at shallow, middle and deep locations',()=>{
 for(const [x,depth,time] of [[300,1500,2],[500,3000,4],[700,4500,6]]){assert.equal(depthAt(x),depth);assert.equal(returnTime(x),time);assert.equal(1500*time/2,depth);}
 for(let x=100;x<=900;x+=.7){assert.ok(depthAt(x)>=1500&&depthAt(x)<=4500);assert.ok(Math.abs(returnTime(x)*1500/2-depthAt(x))<1e-8);assert.ok(Math.abs(depthAt(x+.7)-depthAt(x))<20);}
});
test('student-created labels continue beyond Z without preassigned positions',()=>{assert.deepEqual([0,1,25,26,27,51,52].map(pointName),['A','B','Z','AA','AB','AZ','BA']);});
