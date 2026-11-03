import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exitGeometry,angleFromExitSource} from '../units/4/parts/4.3/assets/exit-refraction-model.mjs';

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
