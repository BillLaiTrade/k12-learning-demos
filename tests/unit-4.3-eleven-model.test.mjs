import {test} from 'node:test';
import assert from 'node:assert/strict';
import {depthGeometry,TANK,observerCamera,traceViewRay,solveCoinRay} from '../units/4/parts/4.3/assets/depth-model.mjs';
import {renderObserverPixels} from '../units/4/parts/4.3/assets/depth-observer.mjs';
const t={width:1,height:1,data:new Uint8ClampedArray([180,140,80,255])},textures={wood:t,water:t,metal:t,coin:t};
const directionTo=g=>{const r=g.representative,d=[r.hit[0]-g.eyeX,r.hit[1]-TANK.eyeHeight,0],n=Math.hypot(...d);return d.map(x=>x/n);};

test('a true coin-rim crescent has one continuous visibility result and an admitted representative bundle',()=>{
 const g=depthGeometry(83,320);assert.equal(g.status,'partial');assert.equal(g.center.visible,false);
 assert.equal(g.visibleInterval[0],42);assert.ok(g.visibleInterval[1]>42&&g.visibleInterval[1]<43);
 assert.ok(g.representative.coin[0]>42&&g.representative.coin[0]<g.visibleInterval[1]);
 assert.ok(g.rays.every(r=>r.visible));
 const camera=observerCamera(g),hit=traceViewRay(g,camera.origin,directionTo(g));
 assert.equal(hit.kind,'coin');assert.ok(Math.abs(hit.point[0]-g.representative.coin[0])<1e-9);
});
test('all control settings keep status monotone and every visible construction actually reaches the same coin',()=>{
 let cases=0;
 for(let x=210;x<=340;x+=2){let previous=0;for(let d=0;d<=100;d++){
  const g=depthGeometry(d,x),state=['hidden','partial','visible'].indexOf(g.status);assert.ok(state>=previous,`${d}/${x} visibility reverses`);previous=state;cases++;
  if(state===0){assert.equal(g.visibleInterval,null);continue;}
  assert.ok(g.visibleInterval[1]>g.visibleInterval[0]);assert.ok(g.representative.visible);assert.ok(g.rays.every(r=>r.visible));
  const camera=observerCamera(g),hit=traceViewRay(g,camera.origin,directionTo(g));assert.equal(hit.kind,'coin',`${d}/${x}`);
  assert.ok(Math.abs(hit.point[0]-g.representative.coin[0])<1e-8);
  if(state===2)assert.equal(solveCoinRay(d,x,TANK.coinX+TANK.coinRadius).visible,true);
 }}assert.equal(cases,6666);
});
test('preview and detail always contain the real visible edge, without changing visibility, camera or fixed coin',()=>{
 for(const [d,x]of[[70,300],[71,300],[83,320],[92,340],[93,340],[100,300],[0,210],[0,250],[0,300],[40,340]]){
  const g=depthGeometry(d,x),camera=observerCamera(g);
  for(const width of[80,160,400,800]){
   const frame=renderObserverPixels(g,textures,width,Math.round(width*530/720));
   assert.equal(frame.visibility,g.status);assert.equal(frame.coinPixels>0,g.status!=='hidden',`${d}/${x}/${width}`);
   if(frame.featureSampled){assert.equal(traceViewRay(g,camera.origin,directionTo(g)).kind,'coin');}
   assert.deepEqual(g.coin,[55,0]);assert.deepEqual(observerCamera(g),camera);
  }
 }
});
