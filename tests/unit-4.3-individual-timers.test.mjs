import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLaneTimers} from '../units/4/parts/4.3/assets/independent-lane-timers.mjs';
import {media,arrivalMs} from '../units/4/parts/4.3/assets/light-speed-model.mjs';

test('staggered launches measure travel from their own starts and stop exactly on arrival',()=>{
 const clock=createLaneTimers(media,arrivalMs);
 clock.start('water',100);clock.advance(1100);
 assert.deepEqual(clock.lanes.map(l=>l.elapsed),[0,1000,0]);
 clock.start('air',1100);clock.advance(2100);
 assert.deepEqual(clock.lanes.map(l=>l.elapsed),[1000,2000,0]);
 clock.advance(10000);
 assert.deepEqual(clock.lanes.map(l=>l.elapsed),[arrivalMs('air'),arrivalMs('water'),0]);
 assert.deepEqual(clock.lanes.map(l=>l.state),['complete','complete','idle']);
});
test('restarting one lane preserves the other active and completed lanes',()=>{
 const clock=createLaneTimers(media,arrivalMs);
 clock.seed(3500,'running','',3500);clock.start('water',4000);
 assert.deepEqual(clock.lanes.map(l=>l.elapsed),[arrivalMs('air'),0,4000]);
 clock.advance(4500);assert.deepEqual(clock.lanes.map(l=>l.elapsed),[arrivalMs('air'),500,4500]);
});
test('automatic return resumes only automatic pauses and excludes time away',()=>{
 const clock=createLaneTimers(media,arrivalMs);
 clock.start('air',0);clock.pause('manual',500);clock.start('water',1000);
 clock.pause('automatic',1300);clock.resume('automatic',10000);clock.advance(10200);
 assert.deepEqual(clock.lanes.map(l=>l.elapsed),[500,500,0]);
 assert.deepEqual(clock.lanes.map(l=>l.state),['paused','running','idle']);
 clock.pause('manual',10200);clock.resume('manual',12000);clock.advance(12200);
 assert.deepEqual(clock.lanes.map(l=>l.elapsed),[700,700,0]);
});
