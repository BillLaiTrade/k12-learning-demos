import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exitGeometry,angleFromExitSource,exitSnapshot,exitDurationMs} from '../units/4/parts/4.3/assets/exit-refraction-model.mjs';
import {geometry as entryGeometry} from '../units/4/parts/4.3/assets/oblique-incidence-model.mjs';
import {visibleInterval} from '../units/4/parts/4.3/assets/light-beam.mjs';

test('upper water or glass emits downward into air with the independently measured larger refracted angle',()=>{
 for(const [medium,n]of [['water',4/3],['glass',1.5]])for(let angle=0;angle<=35;angle++){
  const g=exitGeometry(medium,angle),[source,hit,end]=g.backward;
  const incident=Math.atan2(hit[0]-source[0],hit[1]-source[1]),refracted=Math.atan2(end[0]-hit[0],end[1]-hit[1]);
  assert.ok(source[0]<=650&&source[1]<570&&end[0]>=650&&end[1]>570);
  assert.deepEqual(hit,[650,570]);assert.ok(Math.abs(incident*180/Math.PI-angle)<1e-10);
  assert.ok(Math.abs(n*Math.sin(incident)-Math.sin(refracted))<1e-10);
  assert.ok(angle===0?refracted===0:refracted>incident);
 }
});

test('dragging an upper source recovers its incident angle in either medium without a lower source convention',()=>{
 for(const medium of ['water','glass'])for(let angle=0;angle<=35;angle++){
  const {sourceB}=exitGeometry(medium,angle);assert.equal(angleFromExitSource(medium,...sourceB),angle);
 }
 assert.equal(angleFromExitSource('water',650,100),0);assert.equal(angleFromExitSource('water',0,560),35);
});

test('the upper source and outgoing endpoint stay inside the apparatus at zero and extreme selectable angles',()=>{
 for(const medium of ['water','glass'])for(const a of [0,1,30,35]){
  const g=exitGeometry(medium,a);
  for(const [x,y]of [g.sourceB,g.sourceA])assert.ok(x>220&&x<1030&&y>=300&&y<=850);
  assert.deepEqual(g.backward,[g.sourceB,g.hit,g.sourceA]);
 }
});

test('exit light advances continuously using the same air speed and material-relative speeds as the third experiment',()=>{
 const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 for(const [medium,n]of [['water',4/3],['glass',1.5]])for(const angle of [0,1,30,35]){
  const g=exitSnapshot(medium,angle,0),before=exitSnapshot(medium,angle,200),at=exitSnapshot(medium,angle,g.entryMs),after=exitSnapshot(medium,angle,g.entryMs+200),end=exitSnapshot(medium,angle,g.arrivalMs+100);
  assert.equal(g.entered,false);assert.equal(g.arrived,false);assert.deepEqual(g.front,g.source);
  assert.ok(Math.abs(distance(g.front,before.front)/200-.24/n)<1e-10);
  assert.equal(at.entered,true);assert.deepEqual(at.front,g.hit);assert.ok(Math.abs(distance(at.front,after.front)/200-.24)<1e-10);
  assert.ok(distance(exitSnapshot(medium,angle,g.entryMs-.001).front,at.front)<.001);
  assert.deepEqual(end.front,g.end);assert.equal(end.arrived,true);assert.equal(exitDurationMs(medium,angle),g.arrivalMs);
 }
});

test('entry and exit use exactly the same source location at equal angles and terminate at the apparatus boundary',()=>{
 for(const medium of ['water','glass'])for(let angle=0;angle<=35;angle++){
  const entry=entryGeometry(medium,angle),exit=exitGeometry(medium,angle);assert.deepEqual(entry.source,exit.source);
  assert.ok(Math.abs(exit.end[1]-850)<1e-9||Math.abs(exit.end[0]-1010)<1e-9);assert.ok(exit.end[0]<=1010&&exit.end[1]<=850);
 }
});

test('detail arrows are positioned on the visible part of each ray rather than outside the common crop',()=>{
 const box=[530,480,240,180];
 for(const medium of ['water','glass'])for(const angle of [0,1,30,35])for(const g of [entryGeometry(medium,angle),exitGeometry(medium,angle)]){
  for(const [index,from,to]of [[0,g.source,g.hit],[1,g.hit,g.end]]){
   const [start,end]=visibleInterval(from,to,box),fraction=start+(end-start)*(index===0?.18:.82),p=from.map((n,i)=>n+(to[i]-n)*fraction);
   assert.ok(p[0]>=530&&p[0]<=770&&p[1]>=480&&p[1]<=660);assert.ok(Math.hypot(p[0]-650,p[1]-570)>70);
  }
 }
 assert.equal(visibleInterval([0,0],[20,0],box),null);
});
