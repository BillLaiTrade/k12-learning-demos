import {test} from 'node:test';
import assert from 'node:assert/strict';
import {laneFrame,wallX,distanceDuration,distanceTaps,SOURCE_X,PIXELS_PER_METRE,TIME_SCALE} from '../units/3/parts/3.4/assets/distance-lab.mjs';
test('at 0.20 model seconds the near receiver has received while the 68m wave reaches its wall',()=>{
  assert.equal(laneFrame(34,.2).stage,'received');assert.equal(laneFrame(68,.2).stage,'surface');
  assert.equal(laneFrame(34,.2).x,SOURCE_X);assert.equal(laneFrame(68,.2).x,wallX(68));
  assert.equal(laneFrame(68,.4).received,true);assert.equal(laneFrame(102,.6).received,true);
});
test('the shared spatial scale and clock preserve propagation speed and two equal legs',()=>{
  for(const t of[0,.02,.05,.09])assert.equal(laneFrame(34,t).x,laneFrame(102,t).x);
  assert.ok(Math.abs((laneFrame(102,.09).x-laneFrame(102,.05).x)/.04-340*PIXELS_PER_METRE)<1e-8);
  assert.ok(Math.abs(wallX(68)-SOURCE_X-2*(wallX(34)-SOURCE_X))<1e-8);
  for(const d of[34,51,68,102]){const total=2*d/340;assert.ok(Math.abs(laneFrame(d,total/4).x-laneFrame(d,total*3/4).x)<1e-8);assert.ok(distanceDuration(d)>total*TIME_SCALE+.13);}
});
test('audio arrival times use the same slowed clock and equal-distance echoes coincide once',()=>{
  assert.deepEqual(distanceTaps(68),[{delay:0,gain:1},{delay:1.6,gain:.45},{delay:3.2,gain:.45}]);
  assert.deepEqual(distanceTaps(34),[{delay:0,gain:1},{delay:1.6,gain:.45}]);
  assert.ok(Math.abs(distanceTaps(102)[2].delay-4.8)<1e-9);
});
test('single-lane playback schedules only its own return and stops at its own arrival',()=>{
  for(const distance of[34,68,102]){
    assert.deepEqual(distanceTaps(distance,'near'),[{delay:0,gain:1},{delay:1.6,gain:.45}]);
    assert.deepEqual(distanceTaps(distance,'far'),[{delay:0,gain:1},{delay:2*distance/340*TIME_SCALE,gain:.45}]);
    assert.equal(distanceDuration(distance,'near'),distanceDuration(34));
    assert.equal(distanceDuration(distance,'far'),distanceDuration(distance));
  }
});
