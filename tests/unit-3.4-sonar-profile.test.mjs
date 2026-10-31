import {test} from 'node:test';
import assert from 'node:assert/strict';
import {surveyProfile} from '../units/3/parts/3.4/assets/sonar-profile.mjs';
import {depthAt} from '../units/3/parts/3.4/assets/sonar-terrain.mjs';
test('profile uses only finished measurements, spatial order and latest duplicate, without changing the log',()=>{
 const records=[{name:'A',x:700,depth:1275,done:true},{name:'B',x:300,depth:502.5,done:true},{name:'C',x:500,depth:892.5,done:false},{name:'D',x:300,depth:750,done:true}];
 const before=structuredClone(records), points=surveyProfile(records);
 assert.deepEqual(points.map(p=>[p.x,p.name]),[[300,'D'],[700,'A']]);assert.deepEqual(records,before);
 // A recorded depth intentionally differs from the true terrain: the line must use the record.
 assert.equal(points[0].y,145+750/2250*335);
 assert.deepEqual(surveyProfile([]),[]);assert.equal(surveyProfile(records.slice(0,1)).length,1);
});
test('an added measurement resolves a missed seamount rather than pre-filling the real terrain',()=>{
 const record=x=>({name:String(x),x,depth:depthAt(x),done:true});
 const coarse=surveyProfile([record(450),record(550)]), dense=surveyProfile([record(450),record(550),record(500)]);
 const interpolate=(points,x)=>{const right=points.findIndex(p=>p.x>=x);if(right===0)return points[0].y;const a=points[right-1],b=points[right];return a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x);};
 const truth=145+depthAt(500)/2250*335;
 assert.ok(Math.abs(interpolate(coarse,500)-truth)>50);assert.equal(interpolate(dense,500),truth);
 assert.deepEqual(dense.map(p=>p.x),[450,500,550]);assert.equal(dense.length,3);
});
