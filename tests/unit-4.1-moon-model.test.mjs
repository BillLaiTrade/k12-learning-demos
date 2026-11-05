import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PHYSICAL,RADII,ORBIT,orbitBasis,orbitAngle,lunarVector,positionsAt,reflectionState,sunlightAt,dot,sub,length,unit} from '../units/4/parts/4.1/assets/moon-reflection-model.mjs';
test('月球整圈保持固定半徑與5.145度傾角，座標能反解軌道位置',()=>{
 const b=orbitBasis();assert.ok(Math.abs(Math.acos(b.normal[1])*180/Math.PI-5.145)<1e-9);
 for(let angle=0;angle<360;angle+=3){const v=lunarVector(angle),p=positionsAt(angle);assert.ok(Math.abs(length(v)-ORBIT.radius)<1e-10);assert.ok(Math.abs(dot(v,b.normal))<1e-10);assert.ok(Math.abs(orbitAngle(v)-angle)<1e-8);assert.ok(length(sub(sub(p.moon,p.earth),v))<1e-10);}
 assert.ok(Math.abs(RADII.moon/RADII.earth-.2727)<1e-10);
});
test('整圈月相符合平行陽光幾何，不因放大球體每月產生月食或日食',()=>{
 let min=1,max=0;
 for(let angle=0;angle<360;angle+=5){
  const state=reflectionState(angle),physical=lunarVector(angle,PHYSICAL.lunarDistance),expected=(1+unit(physical)[0])/2;
  assert.ok(Math.abs(state.fraction-expected)<.007,JSON.stringify({angle,actual:state.fraction,expected}));
  assert.equal(state.shadowed,false);assert.equal(sunlightAt([0,0,0],physical,PHYSICAL.moon),1);
  min=Math.min(min,state.fraction);max=Math.max(max,state.fraction);
 }
 assert.ok(min<.003);assert.ok(max>.997);
});
test('多個反射位置均受光、朝向地球，實際對齊才有遮擋',()=>{
 for(const angle of [0,55,95,235,325]){
  const state=reflectionState(angle);assert.equal(state.patches.length,3);
  for(const patch of state.patches){assert.ok(patch.normal[0]<0);assert.ok(patch.viewCos>0);assert.equal(sunlightAt(patch.point,[0,0,0],1),1);}
  for(let i=0;i<3;i++)for(let j=0;j<i;j++)assert.ok(dot(state.patches[i].normal,state.patches[j].normal)<.78);
 }
 const eclipse=reflectionState(0,1600,0);assert.equal(eclipse.shadowed,true);assert.equal(eclipse.fraction,0);
 const annular=sunlightAt([0,0,0],lunarVector(180,PHYSICAL.lunarDistance,0),PHYSICAL.moon);assert.ok(annular>0&&annular<.2);
 assert.equal(sunlightAt([0,0,0],lunarVector(180,PHYSICAL.lunarDistance),PHYSICAL.moon),1);
});
