import { test } from 'node:test';
import assert from 'node:assert/strict';
import { materials } from '../units/4/parts/4.3/assets/optics.mjs';
import { layout, media, clampAngle, geometry, boundaryMs, durationMs, snapshot } from '../units/4/parts/4.3/assets/oblique-incidence-model.mjs';

test('both optical planes measure angles from the same straight normal through the actual hit',()=>{
 for(let angle=0;angle<=60;angle++)for(const medium of media){
  const g=geometry(medium,angle),incoming=Math.atan2(g.hit[0]-g.source[0],g.hit[1]-g.source[1])*180/Math.PI,outgoing=Math.atan2(g.end[0]-g.hit[0],g.end[1]-g.hit[1])*180/Math.PI;
  assert.ok(Math.abs(incoming-angle)<1e-10);assert.ok(Math.abs(outgoing-g.outgoing)<1e-10);
  assert.ok(Math.abs(Math.sin(incoming*Math.PI/180)-materials[medium].n*Math.sin(outgoing*Math.PI/180))<1e-12);
  assert.equal(g.hit[1],470);assert.equal(g.end[1],650);assert.ok(g.outgoing<=angle);assert.ok(g.end[0]<g.hit[0]+270);
  const paired=geometry(medium==='water'?'glass':'water',angle);assert.equal(g.source[1],paired.source[1]);assert.ok(Math.abs((g.hit[0]-g.source[0])-(paired.hit[0]-paired.source[0]))<1e-10);
 }
});
test('45 degrees gives the approved representative readings and zero is truly collinear',()=>{
 assert.equal(geometry('water',45).outgoing.toFixed(1),'32.0');assert.equal(geometry('glass',45).outgoing.toFixed(1),'28.1');
 for(const medium of media){const g=geometry(medium,0);assert.equal(g.outgoing,0);assert.equal(g.source[0],g.hit[0]);assert.equal(g.hit[0],g.end[0]);}
 assert.equal(clampAngle(-5),0);assert.equal(clampAngle(80),60);assert.equal(clampAngle(NaN),45);
});
test('continuous fronts reach the interface together, then follow distinct straight refracted segments',()=>{
 for(const angle of [0,30,45,60]){
  const at=snapshot(angle,boundaryMs);assert.deepEqual(at.map(g=>g.front),at.map(g=>g.hit));assert.ok(at.every(g=>g.entered));
  let previous=[0,0];for(const time of [0,200,boundaryMs,boundaryMs+100,2000,durationMs(angle),1e5])snapshot(angle,time).forEach((g,i)=>{
   const a=g.entered?g.hit:g.source,b=g.entered?g.end:g.hit,dx=g.front[0]-a[0],dy=g.front[1]-a[1];
   assert.ok(Math.abs(dx*(b[1]-a[1])-dy*(b[0]-a[0]))<1e-8);assert.ok(g.front[1]>=previous[i]-1e-8);previous[i]=g.front[1];assert.ok(g.front[1]<=layout.end);
  });
  const finished=snapshot(angle,durationMs(angle));assert.ok(finished.every(g=>g.arrived));assert.deepEqual(finished.map(g=>g.front),finished.map(g=>g.end));
 }
});
test('the schematic animation retains representative speed ratios without dots or false timing units',()=>{
 const a=snapshot(45,boundaryMs+100),b=snapshot(45,boundaryMs+300),distance=(p,q)=>Math.hypot(q[0]-p[0],q[1]-p[1]);
 const speeds=a.map((g,i)=>distance(g.front,b[i].front)/200);
 assert.ok(Math.abs(speeds[0]/speeds[1]-1.125)<1e-10);
});
