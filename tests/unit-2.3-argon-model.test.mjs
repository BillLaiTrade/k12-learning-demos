import {test} from 'node:test';import assert from 'node:assert/strict';
import {argonFrame,ARGON_DURATION} from '../units/2/parts/2.3/assets/argon-model.mjs';
test('argon flow follows ambient air observation and completes without extrapolated measurements',()=>{
 assert.deepEqual(argonFrame(0),{progress:0,air:0,shield:0,oxidation:0,phase:'air'});
 assert.equal(argonFrame(500).shield,0);assert.ok(argonFrame(500).air>0);
 assert.equal(argonFrame(ARGON_DURATION).phase,'result');assert.equal(argonFrame(ARGON_DURATION).shield,1);assert.equal(argonFrame(ARGON_DURATION).oxidation,1);assert.equal(argonFrame(1000).oxidation,0);assert.ok(argonFrame(3000).oxidation>0&&argonFrame(3000).oxidation<1);
 assert.equal(argonFrame(-100).progress,0);assert.equal(argonFrame(10000).progress,1);
 let last=0;for(let t=0;t<=ARGON_DURATION;t+=100){const f=argonFrame(t);assert.ok(f.shield>=last);last=f.shield;}
});
