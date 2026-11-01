import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WELL_TIMES,wellQuestion,nextWell,gradeWell} from '../units/3/parts/3.4/assets/well-model.mjs';
test('every well uses the complete air round trip and next well cannot repeat',()=>{
 assert.deepEqual(wellQuestion(),{speed:340,time:.4,depth:68});
 for(const time of WELL_TIMES){const q=wellQuestion(time);assert.equal(q.depth*2/q.speed,time);for(const r of[0,.2,.5,.99,1])assert.notEqual(nextWell(q,r).time,time);assert.equal(gradeWell(String(q.depth),q,true).result,'correct');assert.equal(gradeWell(String(q.depth*2),q,true).result,'wrong');}
 assert.throws(()=>wellQuestion(.45),RangeError);
});
test('observation, valid numbers, total-distance misconception and rounding are distinguished',()=>{
 const q=wellQuestion();assert.equal(gradeWell('68',q,false).result,'unobserved');
 for(const v of['',' '])assert.equal(gradeWell(v,q,true).result,'incomplete');
 for(const v of['NaN','Infinity','-3','0','hi'])assert.equal(gradeWell(v,q,true).result,'invalid');
 assert.match(gradeWell('136',q,true).message,/往返的總路程/);
 assert.equal(gradeWell('68.04',q,true).result,'correct');assert.equal(gradeWell('68.1',q,true).result,'wrong');
});
test('short voice has a silent gap before even the closest echo and stays below clipping',()=>{
 const b=readFileSync(new URL('../units/3/parts/3.4/assets/well-call.wav',import.meta.url));let p=12,rate,pcm;
 while(p+8<=b.length){const id=b.toString('ascii',p,p+4),n=b.readUInt32LE(p+4);if(id==='fmt '){assert.equal(b.readUInt16LE(p+8),1);assert.equal(b.readUInt16LE(p+10),1);rate=b.readUInt32LE(p+12);assert.equal(b.readUInt16LE(p+22),16);}if(id==='data')pcm=b.subarray(p+8,p+8+n);p+=8+n+n%2;}
 const samples=Array.from({length:pcm.length/2},(_,i)=>pcm.readInt16LE(i*2)/32768);assert.equal(rate,24000);assert.ok(samples.length/rate<Math.min(...WELL_TIMES)-.1);const peak=Math.max(...samples.map(Math.abs));assert.ok(peak>.5&&peak<.8);
});
