import {test} from 'node:test';
import assert from 'node:assert/strict';
import {preparationFrame,comparisonFrame,PREPARATION_DURATION,COMPARISON_DURATION} from '../units/2/parts/2.3/assets/oxygen-model.mjs';
test('tube entry precedes displacement; withdrawal precedes glass cover',()=>{
 assert.equal(preparationFrame(1999).stage,0);
 for(const t of[2000,3000,4799]){const f=preparationFrame(t);assert.equal(f.purging,true);assert.equal(f.tube,0);assert.equal(f.collected,0);}
 assert.ok(preparationFrame(5150).tube>0&&preparationFrame(5150).tube<1);assert.equal(preparationFrame(5499).collected,0);
 assert.equal(preparationFrame(7750).collected,.5);assert.equal(preparationFrame(10000).collected,1);
 for(let t=0;t<=PREPARATION_DURATION;t+=20){const f=preparationFrame(t);if(f.collected>0&&f.collected<1)assert.equal(f.tube,1);if(f.cover>0)assert.equal(f.tube,0);if(f.covered)assert.equal(f.cover,1);}
 assert.ok(preparationFrame(10400).tube>0);assert.equal(preparationFrame(10400).cover,0);assert.equal(preparationFrame(10800).tube,0);assert.equal(preparationFrame(12200).covered,true);
});
test('shared insertion completes before oxygen ignition; results remain at duration',()=>{
 assert.deepEqual(comparisonFrame(0),{inserted:0,ignition:0,fading:0});assert.equal(comparisonFrame(750).inserted,.5);
 assert.equal(comparisonFrame(1500).inserted,1);assert.equal(comparisonFrame(2000).ignition,0);assert.equal(comparisonFrame(2600).ignition,.5);
 assert.deepEqual(comparisonFrame(COMPARISON_DURATION),{inserted:1,ignition:1,fading:1});
});

test('selected step stays bounded at both ends without leaking into the next step',async()=>{
 const {preparationStepFrame,STEP_DURATIONS}=await import('../units/2/parts/2.3/assets/oxygen-model.mjs');
 for(let stage=0;stage<5;stage++){
  const first=preparationStepFrame(stage,-500),last=preparationStepFrame(stage,STEP_DURATIONS[stage]+99999);
  assert.equal(first.stage,stage);assert.equal(first.localTime,0);assert.equal(last.stage,stage);assert.equal(last.localTime,STEP_DURATIONS[stage]);
 }
 assert.equal(preparationStepFrame(2,99999).purging,true);assert.equal(preparationStepFrame(2,99999).collected,0);
 assert.equal(preparationStepFrame(3,99999).collected,1);assert.equal(preparationStepFrame(3,99999).tube,1);assert.equal(preparationStepFrame(3,99999).cover,0);
 assert.equal(preparationStepFrame(4,0).collected,1);assert.equal(preparationStepFrame(4,99999).covered,true);
});


test('assembly adds reagents in order, starts reaction after catalyst, and seals before gas enters the tube',async()=>{
 const {assemblyFrame,ASSEMBLY_DURATION}=await import('../units/2/parts/2.3/assets/oxygen-model.mjs');
 assert.equal(assemblyFrame(-100).peroxide,0);assert.equal(assemblyFrame(2000).phase,0);assert.equal(assemblyFrame(4100).phase,1);assert.equal(assemblyFrame(6900).phase,2);assert.equal(assemblyFrame(9600).phase,3);
 for(let time=0;time<=ASSEMBLY_DURATION;time+=20){const f=assemblyFrame(time);if(f.catalyst>0)assert.equal(f.peroxide,1);if(f.reaction>0)assert.ok(f.catalyst>0);if(f.sealed>0){assert.equal(f.peroxide,1);assert.equal(f.catalyst,1);}if(f.gasThroughTube){assert.equal(f.sealed,1);assert.ok(f.reaction>0);}if(f.liquidFlow>0)assert.equal(f.sealed,0);if(f.powderFlow>0)assert.equal(f.sealed,0);}
 const end=assemblyFrame(99999);assert.equal(end.time,ASSEMBLY_DURATION);assert.equal(end.sealed,1);assert.equal(end.catalyst,1);assert.equal(end.peroxide,1);assert.equal(end.gasThroughTube,true);
});

test('operation windows stop at purposeful boundaries, with prerequisites and withdrawal before covering',async()=>{
 const {OXYGEN_OPERATIONS,oxygenOperationFrame,assemblyFrame}=await import('../units/2/parts/2.3/assets/oxygen-model.mjs');
 assert.equal(OXYGEN_OPERATIONS.length,8);
 for(let i=0;i<8;i++){const a=oxygenOperationFrame(i,-10),b=oxygenOperationFrame(i,99999);assert.equal(a.localTime,0);assert.equal(b.localTime,OXYGEN_OPERATIONS[i].duration);assert.equal(b.operation,i);}
 const assembled=i=>assemblyFrame(oxygenOperationFrame(i,99999).sceneTime);
 assert.equal(assembled(1).peroxide,0);assert.equal(assembled(2).peroxide,1);assert.equal(assembled(2).catalyst,0);assert.equal(assembled(3).catalyst,1);assert.equal(assembled(3).sealed,0);assert.equal(assembled(4).gasThroughTube,true);
 assert.equal(oxygenOperationFrame(5,99999).collected,0);for(let time=0;time<700;time+=50){const f=oxygenOperationFrame(6,time);assert.equal(f.collected,0);assert.equal(f.collecting,false);}
 assert.equal(oxygenOperationFrame(6,99999).collected,1);for(let time=0;time<=2600;time+=20){const f=oxygenOperationFrame(7,time);if(f.cover>0)assert.equal(f.tube,0);assert.equal(f.collected,1);}assert.equal(oxygenOperationFrame(7,99999).covered,true);
});


test('placement settles the submerged full jar before lowering the outlet; later chemistry keeps its existing timing',async()=>{
 const {assemblyFrame,oxygenOperationFrame}=await import('../units/2/parts/2.3/assets/oxygen-model.mjs');
 assert.equal(assemblyFrame(0).placement,0);assert.equal(assemblyFrame(0).outletPlacement,0);
 let previous=0;
 for(let time=0;time<=2800;time+=20){const f=assemblyFrame(time);assert.ok(f.placement>=previous);previous=f.placement;if(f.outletPlacement>0)assert.equal(f.placement,1);assert.equal(f.peroxide,0);assert.equal(f.catalyst,0);assert.equal(f.sealed,0);assert.equal(f.reaction,0);assert.equal(oxygenOperationFrame(1,time).collected,0);}
 assert.equal(assemblyFrame(2800).placement,1);assert.equal(assemblyFrame(2800).outletPlacement,1);assert.equal(assemblyFrame(4000).placement,1);
});


test('clear water fills both empty vessels before a covered inversion and underwater uncovering',async()=>{
 const {setupFrame,SETUP_DURATION}=await import('../units/2/parts/2.3/assets/oxygen-setup.mjs');
 const {oxygenOperationFrame,OXYGEN_OPERATIONS}=await import('../units/2/parts/2.3/assets/oxygen-model.mjs');
 assert.equal(OXYGEN_OPERATIONS[1].duration,SETUP_DURATION);
 assert.equal(setupFrame(0).tankFill,0);assert.equal(setupFrame(0).jarFill,0);assert.equal(setupFrame(0).angle,0);
 assert.ok(setupFrame(4000).tankFill>0&&setupFrame(4000).tankFill<1);assert.equal(setupFrame(4000).jarFill,0);
 assert.ok(setupFrame(7000).jarFill>0&&setupFrame(7000).jarFill<1);assert.equal(setupFrame(11000).angle,90);
 for(let t=0;t<=SETUP_DURATION;t+=20){const f=setupFrame(t);if(f.jarFill>0)assert.equal(f.tankFill,1);if(f.inversion>0){assert.equal(f.jarFill,1);assert.equal(f.cover,1);}if(f.inversion>0&&f.immersion<1)assert.equal(f.covered,true);if(f.uncover>0){assert.equal(f.immersion,1);assert.ok(f.mouthY>565);}if(f.outlet>0)assert.equal(f.uncover,1);if(f.phase==='ready')assert.equal(f.outlet,1);assert.equal(oxygenOperationFrame(1,t).collected,0);}
 assert.equal(setupFrame(SETUP_DURATION).outlet,1);assert.equal(setupFrame(SETUP_DURATION).jarFill,1);
});
