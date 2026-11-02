import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layout, airRate, boundaryMs, comparisonMs, arrivalMs, durationMs, snapshot } from '../units/4/parts/4.3/assets/normal-incidence-model.mjs';

test('three normal rays share a distance scale and common air speed before the real interfaces',()=>{
 assert.deepEqual(snapshot(-10).map(s=>s.y),[240,240,240]);
 assert.deepEqual(snapshot(boundaryMs/2).map(s=>s.y),[362,362,362]);
 assert.deepEqual(snapshot(boundaryMs).map(s=>s.y),[484,484,484]);
 assert.deepEqual(snapshot(boundaryMs).map(s=>s.entered),[false,true,true]);
 for(const time of [0,300,boundaryMs,2000,comparisonMs,durationMs,10000]){
  snapshot(time).forEach((s,i)=>{assert.equal(s.x,layout.axes[i]);assert.ok(s.y>=240&&s.y<=728);});
 }
});
test('the air reference continues unchanged while water and glass slow without bending',()=>{
 const a=snapshot(boundaryMs+100),b=snapshot(boundaryMs+1100);
 for(const [i,ratio] of [1,.75,2/3].entries())assert.ok(Math.abs((b[i].y-a[i].y)/(airRate*1000)-ratio)<1e-10);
 assert.ok(b[0].y>b[1].y&&b[1].y>b[2].y);
 assert.deepEqual(snapshot(arrivalMs('water')).map(s=>s.arrived),[true,true,false]);
 assert.deepEqual(snapshot(durationMs).map(s=>s.y),[728,728,728]);
});
test('the shared air-arrival instant gives a visible, physically proportionate comparison',()=>{
 assert.equal(comparisonMs,arrivalMs('air'));
 const s=snapshot(comparisonMs);
 assert.equal(s[0].y,728);assert.ok(Math.abs(s[1].y-667)<1e-10);assert.ok(Math.abs(s[2].y-(646+2/3))<1e-10);
 assert.deepEqual(s.map(v=>v.arrived),[true,false,false]);
 assert.ok(Math.abs((s[1].y-484)/(s[0].y-484)-.75)<1e-10);
 assert.ok(Math.abs((s[2].y-484)/(s[0].y-484)-2/3)<1e-10);
 assert.equal((layout.boundary-layout.source)/(layout.end-layout.source),.5);
 assert.equal(layout.boundary-layout.source,layout.end-layout.boundary);
});
