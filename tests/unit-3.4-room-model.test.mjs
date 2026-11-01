import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ROOM,imagePosition,imageSources,returnTimes,wavefronts} from '../units/3/parts/3.4/assets/room-wave-model.mjs';
test('mirror sources produce outward circles and physically ordered wall returns',()=>{
 assert.ok(Math.abs(imagePosition(-1,6,1.65)+1.65)<1e-12);assert.ok(Math.abs(imagePosition(1,6,1.65)-10.35)<1e-12);
 const times=returnTimes();assert.ok(times.left<times.right);assert.ok(Math.abs(times.left-3.3/343)<1e-12);
 assert.equal(wavefronts(.2).filter(f=>f.order).length,0);assert.ok(wavefronts(.6).some(f=>f.nx===-1&&f.ny===0));assert.equal(wavefronts(.6).filter(f=>f.nx===1&&f.ny===0).length,0);
 const outward=wavefronts(.6).find(f=>!f.order);assert.ok(Math.abs(outward.radius-343*.6/80)<1e-12);assert.equal(outward.x,ROOM.sourceX);
});
test('absorption changes only reflection amplitude on the treated left/top surfaces',()=>{
 const bare=imageSources(false),soft=imageSources(true);
 for(let i=0;i<bare.length;i++){
  const a=bare[i],b=soft[i];assert.equal(a.x,b.x);assert.equal(a.y,b.y);
  if(a.softHits)assert.ok(b.gain<a.gain);else assert.equal(a.gain,b.gain);
 }
 const a=wavefronts(1,false),b=wavefronts(1,true);for(const x of b){const y=a.find(y=>x.nx===y.nx&&x.ny===y.ny);assert.equal(x.radius,y.radius);}
 assert.equal(soft.find(x=>x.order===0).gain,1);assert.ok(soft.find(x=>x.nx===1&&x.ny===0).gain>0);
});
test('source ceases, reflected fronts remain finite and speech uses representative repeated pulses',()=>{
 assert.deepEqual(wavefronts(0),[]);assert.ok(wavefronts(1,false,'speech').length>wavefronts(1,false,'clap').length);
 for(let t=.1;t<6;t+=.13)for(const f of wavefronts(t,true))assert.ok(Number.isFinite(f.radius)&&f.opacity>0&&f.opacity<=1&&f.order<=3);
});
