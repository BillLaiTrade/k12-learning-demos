import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CO2_DURATIONS,co2Frame} from '../units/2/parts/2.3/assets/co2-model.mjs';
test('assembly orders marble, acid, sealing and gas delivery',()=>{
 const initial=co2Frame(1,0);assert.equal(initial.marble,0);assert.equal(initial.acid,0);assert.equal(initial.seal,0);
 const marble=co2Frame(1,3200);assert.ok(marble.marble>0&&marble.marble<1);assert.equal(marble.acid,0);assert.equal(marble.flow,false);
 const acid=co2Frame(1,5800);assert.equal(acid.marble,1);assert.ok(acid.acid>0&&acid.acid<1);assert.equal(acid.reacting,true);assert.equal(acid.seal,0);assert.equal(acid.flow,false);
 const sealed=co2Frame(1,CO2_DURATIONS[1]);assert.equal(sealed.seal,1);assert.equal(sealed.flow,true);assert.equal(sealed.insert,0);
});
test('purging keeps the outlet outside the collection jar',()=>{
 for(let t=0;t<=4200;t+=50){const f=co2Frame(2,t);assert.equal(f.tipX,600);assert.equal(f.tipY,310);assert.equal(f.collecting,false);assert.equal(f.cover,0);assert.equal(f.flow,true);}
});
test('tube crosses above the mouth before entering; collecting begins only after reaching the base',()=>{
 let collected=false;
 for(let t=0;t<=6200;t+=20){const f=co2Frame(3,t);if(f.tipX>600&&f.tipX<870)assert.equal(f.tipY,155);if(f.collecting){assert.equal(f.tipX,870);assert.equal(f.tipY,540);collected=true;}assert.equal(f.cover,0);}
 assert.ok(collected);
});
test('withdrawal precedes the cover and sample label; the reaction outlet stays open',()=>{
 for(let t=0;t<=4600;t+=20){const f=co2Frame(4,t);if(f.cover>0)assert.equal(f.insert,0);if(f.labeled)assert.equal(f.cover,1);assert.equal(f.flow,true);if(f.tipX>600&&f.tipX<870)assert.equal(f.tipY,155);}
 const done=co2Frame(4,4600);assert.equal(done.tipX,600);assert.equal(done.labeled,true);
});
