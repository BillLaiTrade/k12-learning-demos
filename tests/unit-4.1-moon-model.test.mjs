import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RADII,INITIAL,reflectionState,sphereBlocks,constrainPosition,sub,length,dot,unit} from '../units/4/parts/4.1/assets/moon-reflection-model.mjs';
test('月面亮面、地球方向與遮擋按天體位置計算',()=>{
  const moon=[0,0,0],sun=[-30,0,0];
  const crescent=reflectionState({sun,moon,earth:[5,0,0]});assert.equal(crescent.fraction,0);assert.equal(crescent.reachesEarth,false);assert.ok(crescent.patch,'仍有朝向太陽的受光面');
  const half=reflectionState({sun,moon,earth:[0,0,5]});assert.ok(Math.abs(half.fraction-.5)<.035);assert.ok(half.reachesEarth);
  const gibbous=reflectionState({sun,moon,earth:[-5,0,3]});assert.ok(gibbous.fraction>.85);assert.ok(gibbous.reachesEarth);
  const eclipsed=reflectionState({sun,moon,earth:[-5,0,0]});assert.ok(eclipsed.shadowed);assert.equal(eclipsed.fraction,0);assert.equal(eclipsed.reachesEarth,false);
});
test('朝地球的反射線只從受光且朝地球的月面出發',()=>{
  for(const earth of [[0,0,5],[-5,0,3],[5,0,2]]){
    const positions={sun:[-30,0,0],moon:[0,0,0],earth},state=reflectionState(positions);
    if(state.reachesEarth){assert.ok(dot(state.patch.normal,unit(sub(positions.sun,state.patch.point)))>0);assert.ok(state.patch.viewCos>0);assert.equal(sphereBlocks(state.patch.point,positions.sun,earth,RADII.earth),false);}
  }
  assert.equal(sphereBlocks([-5,0,0],[5,0,0],[0,0,0],1),true);
  assert.equal(sphereBlocks([-5,2,0],[5,2,0],[0,0,0],1),false);
  assert.equal(sphereBlocks([-5,0,0],[-3,0,0],[0,0,0],1),false);
});
test('拖曳範圍保持三個球體分開，且不改動其他天體',()=>{
  for(const name of Object.keys(INITIAL)){
    const positions=structuredClone(INITIAL),before=JSON.stringify(positions);
    const p=constrainPosition(name,[...positions[name==='sun'?'earth':'sun']],positions);
    for(const other of Object.keys(INITIAL))if(other!==name)assert.ok(length(sub(p,positions[other]))>=RADII[name]+RADII[other]+.45-1e-8);
    assert.equal(JSON.stringify(positions),before);
  }
});
