import {test} from 'node:test';
import assert from 'node:assert/strict';
import {geometry,snapshot,criticalAngle,clampAngle} from '../units/4/parts/4.3/assets/single-refraction-model.mjs';
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const n={air:1,water:4/3,glass:1.5};
test('full 0–90° domain has finite bounded paths, Snell transmission or equal-angle reflection',()=>{
 for(const medium of ['water','glass'])for(const reverse of [false,true])for(let a=0;a<=90;a++){
  const g=geometry(medium,a,reverse);for(const p of [g.source,g.hit,g.end,g.referenceEnd]){assert.ok(p.every(Number.isFinite));assert.ok(p[0]>=230&&p[0]<=1010.00001);assert.ok(p[1]>=289.9999&&p[1]<=850.00001);}
  assert.ok(Number.isFinite(g.arrivalMs)&&g.arrivalMs>0);near(g.incomingRate,.48/n[g.from]);
  if(a===90){assert.equal(g.kind,'grazing');assert.equal(g.outgoing,null);assert.equal(g.reflected,null);assert.deepEqual(g.end,g.hit);}
  else if(reverse&&a>criticalAngle(medium)){assert.equal(g.kind,'tir');assert.equal(g.outgoing,null);assert.equal(g.reflected,a);assert.ok(g.end[1]<570);near(g.outgoingRate,g.incomingRate);}
  else{assert.equal(g.kind,'refract');near(n[g.from]*Math.sin(a*Math.PI/180),n[g.to]*Math.sin(g.outgoing*Math.PI/180));assert.ok(g.end[1]>570);near(g.outgoingRate,.48/n[g.to]);if(a)assert.ok(reverse?g.outgoing>a:g.outgoing<a);}
 }
});
test('exact critical angle and either side remain distinct from TIR and grazing',()=>{
 for(const m of ['water','glass']){const c=criticalAngle(m);assert.equal(geometry(m,c-1e-5,true).kind,'refract');const g=geometry(m,c,true);assert.equal(g.kind,'critical');near(g.outgoing,90,2e-6);near(g.end[1],570,1e-5);assert.equal(geometry(m,c+1e-5,true).kind,'tir');assert.equal(geometry(m,90,true).kind,'grazing');}
});
test('front is continuous through entry and reaches exact reflected, refracted or grazing endpoint',()=>{
 for(const m of ['water','glass'])for(const r of [false,true])for(const a of [0,30,42,49,60,89,90]){const g=geometry(m,a,r);assert.deepEqual(snapshot(m,a,0,r).front,g.source);const at=snapshot(m,a,g.entryMs,r);at.front.forEach((v,i)=>near(v,g.hit[i]));assert.ok(Math.hypot(...snapshot(m,a,g.entryMs-.0001,r).front.map((v,i)=>v-g.hit[i]))<.001);assert.deepEqual(snapshot(m,a,g.arrivalMs+1,r).front,g.end);assert.ok(snapshot(m,a,-1,r).front.every(Number.isFinite));}
});
test('equal inputs keep both source placements identical; invalid angles are clamped',()=>{for(const m of ['water','glass'])for(let a=0;a<=90;a++)assert.deepEqual(geometry(m,a).source,geometry(m,a,true).source);assert.equal(clampAngle(-10),0);assert.equal(clampAngle(100),90);assert.equal(clampAngle(NaN),30);});

test('both water and glass transmit throughout the 0–40° teaching domain in either direction',()=>{for(const m of ['water','glass'])for(const reverse of [false,true])for(let a=0;a<=40;a++){const g=geometry(m,a,reverse);assert.equal(g.kind,'refract');assert.notEqual(g.outgoing,null);assert.ok(g.end[1]>g.hit[1]);if(a)assert.ok(reverse?g.outgoing>a:g.outgoing<a);}});
test('single-source animation is exactly twice its former rate while medium speed ratios stay intact',()=>{for(const m of ['water','glass'])for(const reverse of [false,true])for(const a of [0,30,40]){const g=geometry(m,a,reverse),oldEntry=g.sourceRadius/(.24/n[g.from]),oldArrival=oldEntry+g.outgoingLength/(.24/n[g.to]);near(g.entryMs,oldEntry/2);near(g.arrivalMs,oldArrival/2);near(g.outgoingRate/g.incomingRate,n[g.from]/n[g.to]);}});
