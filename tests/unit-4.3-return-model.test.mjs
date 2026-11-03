import {test} from 'node:test';
import assert from 'node:assert/strict';
import {geometry,clampAngle,angleMark,arrow,zoomViewBox,angleFromSource} from '../units/4/parts/4.3/assets/return-refraction-model.mjs';
import {materials,refractedAngle} from '../units/4/parts/4.3/assets/optics.mjs';

test('all selectable outgoing rays obey refraction and retrace the independently calculated reverse direction',()=>{
 for(const key of ['water','glass'])for(let angle=0;angle<=35;angle++){
  const g=geometry(key,angle),[ax,ay]=g.sourceA,[bx,by]=g.sourceB;
  assert.ok(Math.abs(Math.atan2(bx-650,by-570)*180/Math.PI-angle)<1e-9);
  assert.ok(Math.abs(Math.atan2(650-ax,570-ay)*180/Math.PI-g.airAngle)<1e-9);
  assert.ok(Math.abs(materials[key].n*Math.sin(angle*Math.PI/180)-Math.sin(g.airAngle*Math.PI/180))<1e-12);
  assert.ok(Math.abs(refractedAngle('air',key,g.airAngle)-angle)<1e-9);
  assert.deepEqual(g.forward,[...g.backward].reverse());assert.ok(angle===0?g.airAngle===0:g.airAngle>angle);
 }
 assert.equal(geometry('water',30).airAngle.toFixed(1),'41.8');assert.equal(geometry('glass',30).airAngle.toFixed(1),'48.6');
});
test('zero, bounds and angle sectors retain a single optical plane',()=>{
 assert.equal(clampAngle(-10),0);assert.equal(clampAngle(80),35);assert.equal(clampAngle(NaN),30);assert.throws(()=>geometry('air',30));
 assert.deepEqual(geometry('water',0).forward,[[650,340],[650,570],[650,820]]);
 assert.equal(angleMark(0,true).arc,'');assert.equal(angleMark(0,false).sector,'');assert.match(angleMark(30,false).sector,/^M650 570L650 668A/);
 assert.equal(zoomViewBox,'350 340 600 460');
});
test('arrow tips point along their own forward and backward segments',()=>{
 const g=geometry('water',30);
 for(const path of [g.forward,g.backward])for(let i=0;i<2;i++){
  const [from,to]=[path[i],path[i+1]],head=arrow(from,to,.5,10),numbers=head.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number),center=from.map((v,j)=>(v+to[j])/2);
  assert.ok((numbers[0]-center[0])*(to[0]-from[0])+(numbers[1]-center[1])*(to[1]-from[1])>0);
 }
});

test('dragging either source recovers the shared angle without changing the reciprocal geometry',()=>{for(const m of ['water','glass'])for(let a=0;a<=35;a++){const g=geometry(m,a);assert.equal(angleFromSource(m,'a',...g.sourceA),a);assert.equal(angleFromSource(m,'b',...g.sourceB),a);assert.ok(g.sourceA[1]>=340-1e-8&&g.sourceB[1]<=820+1e-8);assert.ok(Math.hypot(g.sourceA[0]-650,g.sourceA[1]-570)>=230-1e-8);assert.ok(Math.hypot(g.sourceB[0]-650,g.sourceB[1]-570)>=250-1e-8);}assert.equal(angleFromSource('water','a',-1000,560),35);assert.equal(angleFromSource('glass','b',650,820),0);});
