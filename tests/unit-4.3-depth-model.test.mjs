import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TANK, depthGeometry, solveCoinRay, observerCamera, cameraDirection, traceViewRay } from '../units/4/parts/4.3/assets/depth-model.mjs';

const close = (a,b,eps=1e-8) => assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
test('depth construction conserves Snell direction and uses the backward intersection, with a fixed floor coin',()=>{
  for(let depth=1;depth<=100;depth+=3)for(let eyeX=210;eyeX<=340;eyeX+=5){
    const g=depthGeometry(depth,eyeX);
    assert.deepEqual(g.coin,[55,0]);assert.deepEqual(g.eye,[eyeX,190]);
    assert.ok(g.apparent[1]>0&&g.apparent[1]<depth);
    for(const r of g.rays){
      assert.equal(r.coin[0],g.representative.coin[0]);
      const wi=(r.hit[0]-r.coin[0])/Math.hypot(r.hit[0]-r.coin[0],depth);
      const ai=(r.eye[0]-r.hit[0])/Math.hypot(r.eye[0]-r.hit[0],190-depth);
      close(TANK.n*wi,ai);
      close((g.apparent[0]-r.hit[0])*(r.eye[1]-depth)-(g.apparent[1]-depth)*(r.eye[0]-r.hit[0]),0);
    }
  }
});
test('side visibility and independently traced reverse camera rays agree at the rim',()=>{
  let blocked=0,visible=0;
  for(const depth of [40,55,70,85,100])for(let eyeX=210;eyeX<=340;eyeX+=5){
    const g=depthGeometry(depth,eyeX),r=g.center;
    const raw=[r.hit[0]-eyeX,depth-190,0],n=Math.hypot(...raw),direction=raw.map(x=>x/n);
    const hit=traceViewRay(g,[eyeX,190,0],direction);
    if(r.visible){visible++;assert.equal(hit.kind,'coin');close(hit.point[0],55);close(hit.point[1],0);}
    else{blocked++;assert.ok(['outside','rim'].includes(hit.kind));}
  }
  assert.ok(blocked>0&&visible>0);
  assert.equal(depthGeometry(40,340).status,'hidden');assert.equal(depthGeometry(100,250).status,'visible');
  const partial=depthGeometry(70,300);assert.equal(partial.status,'partial');
  assert.equal(partial.center.visible,false);assert.equal(partial.representative.visible,true);
  assert.ok(partial.rays.every(r=>r.coin[0]===partial.representative.coin[0]));
});
test('first person view has a fixed target and finds the same coin through air-to-water refraction',()=>{
  for(const depth of [40,70,100])for(const eyeX of [210,250,280]){
    const g=depthGeometry(depth,eyeX),camera=observerCamera(g),r=g.center;
    const raw=[r.hit[0]-eyeX,depth-190,0],n=Math.hypot(...raw),dir=raw.map(x=>x/n);
    const forward=dir[0]*camera.forward[0]+dir[1]*camera.forward[1];
    const vertical=(dir[0]*camera.up[0]+dir[1]*camera.up[1])/forward/camera.lens;
    const direction=cameraDirection(camera,0,vertical);
    direction.forEach((v,i)=>close(v,dir[i]));
    const hit=traceViewRay(g,camera.origin,direction);
    if(r.visible){assert.equal(hit.kind,'coin');close(hit.point[0],55);}
    assert.deepEqual(camera.forward,observerCamera(depthGeometry(40,eyeX)).forward);
  }
});
test('every submerged camera ray conserves tangential direction in both horizontal axes',()=>{
  const g=depthGeometry(70,250),camera=observerCamera(g);let count=0;
  for(let u=-.8;u<=.8;u+=.1)for(let v=-.8;v<=.8;v+=.1){
    const direction=cameraDirection(camera,u,v),hit=traceViewRay(g,camera.origin,direction);
    if(!hit?.wet)continue;count++;
    close(hit.direction[0]*TANK.n,direction[0]);close(hit.direction[2]*TANK.n,direction[2]);
    close(Math.hypot(...hit.direction),1);assert.ok(hit.direction[1]<0);assert.ok(hit.point[1]>=-1e-8);
  }
  assert.ok(count>20);
});
test('controls stay finite across boundaries and the apparent point depends on observation position',()=>{
  assert.equal(depthGeometry(-10,1000).depth,0);assert.equal(depthGeometry(-10,1000).eyeX,340);
  assert.equal(depthGeometry(NaN,NaN).depth,0);
  assert.notDeepEqual(depthGeometry(70,210).apparent,depthGeometry(70,340).apparent);
  const ray=solveCoinRay(70,250);assert.ok(ray.hit[0]>55&&ray.hit[0]<250);
});

test('the default is a dry hidden coin; direct dry rays and filling use the same fixed world',()=>{
 const initial=depthGeometry();assert.equal(initial.depth,0);assert.equal(initial.eyeX,300);assert.equal(initial.status,'hidden');assert.deepEqual(initial.apparent,initial.coin);
 for(const eyeX of [210,250,300,340]){const g=depthGeometry(0,eyeX),r=g.center;const raw=[55-eyeX,-190,0],d=Math.hypot(...raw),hit=traceViewRay(g,[eyeX,190,0],raw.map(v=>v/d));if(r.visible){assert.equal(hit.kind,'coin');assert.equal(hit.wet,false);}else assert.ok(['outside','rim'].includes(hit.kind));}
 const filled=depthGeometry(100,initial.eyeX);assert.equal(filled.status,'visible');assert.deepEqual(filled.coin,initial.coin);assert.deepEqual(filled.eye,initial.eye);
});

test('opening framing includes visible coin rays without moving the pupil or following water level',()=>{
 for(let eyeX=210;eyeX<=340;eyeX+=5){
  const initial=observerCamera(depthGeometry(0,eyeX));
  for(const depth of [0,1,25,50,75,100]){
   const g=depthGeometry(depth,eyeX),camera=observerCamera(g);
   assert.deepEqual(camera.origin,[eyeX,190,0]);assert.deepEqual(camera.forward,initial.forward);
   for(const r of [g.center,g.representative]){
    if(!r.visible)continue;
    const d=[r.hit[0]-eyeX,depth-190],forward=d[0]*camera.forward[0]+d[1]*camera.forward[1];
    const v=(d[0]*camera.up[0]+d[1]*camera.up[1])/forward/camera.lens;
    assert.ok(Math.abs(v)<.97,`visible coin clipped at ${depth}/${eyeX}`);
   }
   // Independently solve rays from points around the finite coin, including
   // the transverse axis; any physically visible edge must remain in frame.
   for(let a=0;a<2*Math.PI;a+=Math.PI/4){
    const p=[TANK.coinX+12*Math.cos(a),0,12*Math.sin(a)];
    const h=Math.hypot(eyeX-p[0],p[2]);let low=0,high=h;
    if(depth>0)for(let i=0;i<56;i++){
     const q=(low+high)/2;
     if(TANK.n*q/Math.hypot(q,depth)>(h-q)/Math.hypot(h-q,TANK.eyeHeight-depth))high=q;else low=q;
    }
    const f=depth>0?(low+high)/2/h:0;
    const hit=[p[0]+f*(eyeX-p[0]),depth,p[2]*(1-f)];
    const raw=hit.map((n,i)=>n-camera.origin[i]),length=Math.hypot(...raw),direction=raw.map(n=>n/length);
    if(traceViewRay(g,camera.origin,direction)?.kind!=='coin')continue;
    const forward=direction[0]*camera.forward[0]+direction[1]*camera.forward[1];
    const u=direction[2]/forward/camera.lens/camera.aspect;
    const v=(direction[0]*camera.up[0]+direction[1]*camera.up[1])/forward/camera.lens;
    assert.ok(Math.abs(u)<.97&&Math.abs(v)<.97,`visible edge clipped at ${depth}/${eyeX}/${a}`);
   }
  }
 }
});
