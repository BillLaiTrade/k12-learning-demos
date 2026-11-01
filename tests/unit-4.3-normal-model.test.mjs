import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layout, airRate, boundaryMs, arrivalMs, durationMs, snapshot } from '../units/4/parts/4.3/assets/normal-incidence-model.mjs';

test('normal rays share a straight axis, an interface and a common illustrative time',()=>{
 assert.deepEqual(snapshot(-10).map(s=>s.y),[layout.source,layout.source]);
 assert.deepEqual(snapshot(boundaryMs/2).map(s=>s.y),[314,314]);
 assert.deepEqual(snapshot(boundaryMs).map(s=>s.y),[layout.boundary,layout.boundary]);
 for(const time of [0,1000,boundaryMs,2500,3400,durationMs,10000]){
  snapshot(time).forEach((s,i)=>{assert.equal(s.x,layout.axes[i]);assert.ok(s.y>=layout.source&&s.y<=layout.end);});
 }
});
test('both media slow the beam front in the expected proportion without bending',()=>{
 const a=snapshot(boundaryMs+100),b=snapshot(boundaryMs+1100);
 assert.ok(Math.abs((b[0].y-a[0].y)/(airRate*1000)-.75)<1e-10);
 assert.ok(Math.abs((b[1].y-a[1].y)/(airRate*1000)-2/3)<1e-10);
 assert.ok(b[0].y>b[1].y);
 assert.deepEqual(snapshot(arrivalMs('water')).map(s=>s.arrived),[true,false]);
 assert.deepEqual(snapshot(durationMs).map(s=>s.y),[layout.end,layout.end]);
 assert.deepEqual(snapshot(durationMs).map(s=>s.arrived),[true,true]);
});
