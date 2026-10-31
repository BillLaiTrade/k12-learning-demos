import {test} from 'node:test';
import assert from 'node:assert/strict';
import {laneFrame,wallX,distanceDuration,distanceTaps,normaliseDistance,SOURCE_X,PIXELS_PER_METRE,TIME_SCALE,RECORD_DURATION} from '../units/3/parts/3.4/assets/distance-lab.mjs';
test('at two real seconds the 340m receiver has received while the 680m wave reaches its board',()=>{
  assert.equal(TIME_SCALE,1);assert.equal(RECORD_DURATION,6);
  assert.equal(laneFrame(340,2).stage,'received');assert.equal(laneFrame(680,2).stage,'surface');
  assert.equal(laneFrame(340,2).x,SOURCE_X);assert.equal(laneFrame(680,2).x,wallX(680));
  assert.equal(laneFrame(680,4).received,true);assert.equal(laneFrame(1020,6).received,true);
});
test('both virtual scenes retain one linear distance scale and physical propagation speed',()=>{
  for(const t of[0,.2,.5,.9])assert.equal(laneFrame(340,t).x,laneFrame(1020,t).x);
  assert.ok(Math.abs((laneFrame(1020,.9).x-laneFrame(1020,.5).x)/.4-340*PIXELS_PER_METRE)<1e-8);
  assert.ok(Math.abs(wallX(680)-SOURCE_X-2*(wallX(340)-SOURCE_X))<1e-8);
  for(const d of[340,510,680,1020]){const total=2*d/340;assert.ok(Math.abs(laneFrame(d,total/4).x-laneFrame(d,total*3/4).x)<1e-8);assert.ok(distanceDuration(d)>total+.13);assert.ok(distanceDuration(d)<total+.2);}
});
test('audio echoes use real two/four/six-second intervals and equal-distance echoes coincide once',()=>{
  assert.deepEqual(distanceTaps(680),[{delay:0,gain:1},{delay:2,gain:.45},{delay:4,gain:.45}]);
  assert.deepEqual(distanceTaps(340),[{delay:0,gain:1},{delay:2,gain:.45}]);
  assert.equal(distanceTaps(1020)[2].delay,6);
});
test('single-lane playback schedules only its own return and stops at its own arrival',()=>{
  for(const distance of[340,680,1020]){
    assert.deepEqual(distanceTaps(distance,'near'),[{delay:0,gain:1},{delay:2,gain:.45}]);
    assert.deepEqual(distanceTaps(distance,'far'),[{delay:0,gain:1},{delay:2*distance/340,gain:.45}]);
    assert.equal(distanceDuration(distance,'near'),distanceDuration(340));
    assert.equal(distanceDuration(distance,'far'),distanceDuration(distance));
  }
});
test('typed distances are finite whole metres with bounds and a stable fallback',()=>{
  for(const [value,fallback,want] of[[850,680,850],[680.5,340,681],[12,680,340],[5000,680,1020],[NaN,680,680],[Infinity,850,850]])assert.equal(normaliseDistance(value,fallback),want);
});
