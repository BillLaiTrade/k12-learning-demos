import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDesk,REQUIRED_MATERIALS,actDesk,advanceDesk,outletPose} from '../units/2/parts/2.3/assets/collection-task-model.mjs';
import {approach} from '../units/2/parts/2.3/assets/collection-task-direct.mjs';
import {contactRegions,contains,looseFunnelPose} from '../units/2/parts/2.3/assets/collection-task-contact.mjs';
const ready=()=>Object.assign(createDesk(),{selected:[...REQUIRED_MATERIALS,'peroxide','catalyst']});
for(const [name,id,good,bad,setup,value] of [
 ['water bottle lip to flask mouth','water',{x:320,y:190},{x:300,y:300},{},'flask'],
 ['acid bottle lip to flask mouth','acid',{x:280,y:190},{x:274,y:-20},{},'flask'],
 ['water to collector upper opening','water',{x:910,y:55},{x:870,y:160},{},'jar'],
 ['stopper bottom to flask opening','rig',{x:300,y:140},{x:300,y:205},{},'flask'],
 ['funnel tip to empty stopper hole','funnel',{x:274,y:190},{x:300,y:100},{rig:true},'flask'],
 ['funnel tip rejects occupied stopper hole','funnel',{x:274,y:190},{x:326,y:190},{rig:true},'flask'],
 ['acid to installed funnel cup','acid',{x:284,y:50},{x:300,y:205},{rig:true,funnel:true},'funnel'],
 ['water to installed funnel cup','water',{x:260,y:50},{x:274,y:400},{rig:true,funnel:true},'funnel'],
 ['forceps tips on a particular stone','forceps',{x:472,y:548},{x:450,y:610},{},'marble'],
 ['forceps tips to mouth, not body','forceps',{x:300,y:190},{x:300,y:280},{heldMarble:true},'flask'],
 ['glass plate to upright mouth','plate',{x:885,y:72},{x:870,y:150},{},'jar'],
 ['glass plate to inverted mouth','plate',{x:885,y:437},{x:870,y:340},{jarPlace:1,jarAngle:180},'jar'],
 ['peroxide bottle uses its open lip','peroxide',{x:300,y:190},{x:300,y:300},{},'flask'],
 ['distractor dish uses its edge','catalyst',{x:245,y:200},{x:300,y:300},{},'flask']
])test(name,()=>{const s=Object.assign(ready(),setup);assert.equal(approach(s,id,good)?.value,value);assert.equal(approach(s,id,bad),null);});
test('tank accepts the entire sloping upper rim; front wall, outside and old lower box reject',()=>{const s=ready();for(const p of [{x:620,y:350},{x:730,y:330},{x:870,y:350},{x:1020,y:345}]){const a=approach(s,'water',p);assert.equal(a?.value,'tank');assert.deepEqual(a.pourAt,p);assert.ok(contains(a.region,p));}for(const p of [{x:1000,y:480},{x:600,y:500},{x:1080,y:350},{x:590,y:330}])assert.equal(approach(s,'water',p),null);});
test('jar uses its base at the upper rim; center at old fixed target no longer inserts through the wall',()=>{const s=ready();assert.equal(approach(s,'jar',{x:870,y:231})?.action,'immerse');assert.equal(approach(s,'jar',{x:870,y:350}),null);s.jarPlace=1;s.jarAngle=180;assert.equal(approach(s,'jar',{x:870,y:210},{x:870,y:330})?.action,'extract');assert.equal(approach(s,'jar',{x:960,y:330},{x:870,y:330}),null);});
test('outlet accepts water only inside tank and enters inverted jar from below',()=>{const s=Object.assign(ready(),{rig:true,tankWater:1,jarPlace:1,jarAngle:180});assert.equal(approach(s,'outlet',{x:690,y:415})?.value,'tank');assert.equal(approach(s,'outlet',{x:870,y:455})?.value,'jar');for(const p of [{x:870,y:400},{x:580,y:490},{x:870,y:300}])assert.equal(approach(s,'outlet',p),null);s.outlet='tank';assert.equal(approach(s,'outlet',{x:690,y:300})?.value,'air');});
test('absent target and a missing stopper never cause funnel insertion',()=>{const s=ready();s.selected=s.selected.filter(id=>id!=='rig');assert.equal(approach(s,'funnel',{x:274,y:190}),null);s.selected=[];for(const id of ['water','acid','forceps','rig','funnel','plate','peroxide','catalyst'])assert.equal(approach(s,id,{x:300,y:190}),null);});
test('contact geometry tracks the moved and turned collector, not original position',()=>{const s=ready();s.dragging={id:'jar',position:{x:800,y:250}};const r=contactRegions(s);assert.ok(contains(r.jar,{x:800,y:148}));assert.ok(!contains(r.jar,{x:870,y:68}));s.jarAngle=180;assert.ok(contains(contactRegions(s).jar,{x:800,y:370}));});
test('tilted funnel keeps actual visible tip at its interaction anchor without changing tube length',()=>{for(const angle of [0,20,65]){const p={x:274,y:190},q=looseFunnelPose(p,angle),a=angle*Math.PI/180;assert.ok(Math.abs(q.x-26*Math.cos(a)-350*Math.sin(a)-p.x)<1e-8);assert.ok(Math.abs(q.y-26*Math.sin(a)+350*Math.cos(a)-p.y)<1e-8);}});
test('picked stone identity survives placement and the remaining stones stay individually pickable',()=>{const s=ready();s.tool='forceps';actDesk(s,'target','marble');s.motion.index=3;advanceDesk(s,700);assert.equal(s.heldStoneId,3);s.tool='forceps';actDesk(s,'target','flask');advanceDesk(s,1400);assert.deepEqual(s.flaskStoneIds,[3]);assert.equal(approach(s,'forceps',{x:493,y:577}),null);assert.equal(approach(s,'forceps',{x:472,y:548})?.stoneIndex,0);});

test('moving an outlet from the far side of an inverted jar goes below its rim before crossing',()=>{const s=Object.assign(ready(),{rig:true,jarPlace:1,jarAngle:180,tankWater:1,dragging:{id:'outlet',position:{x:990,y:465}}});actDesk(s,'outlet','tank');s.dragging=null;for(let i=0;i<85;i++){advanceDesk(s,10);const q=outletPose(s);if(q.x+260>790&&q.x+260<950)assert.ok(q.y+10>=460);}});
