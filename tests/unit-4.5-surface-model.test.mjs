import {test} from 'node:test';
import assert from 'node:assert/strict';
import {surfaceObservation} from '../units/4/parts/4.5/assets/surface-model.mjs';

test('照明缺少的色光不出現在入射、反射、吸收或文字描述中',()=>{
 for(const [light,index,name] of [['red',0,'紅光'],['green',1,'綠光'],['blue',2,'藍光']]){
  for(const material of ['red','green','blue','white','black']){
   const o=surfaceObservation(light,material);assert.equal(o.incoming,name);assert.match(o.result,/進入眼睛/);assert.ok(o.reflected.includes(name));assert.ok(o.absorbed.includes(name));
   for(let i=0;i<3;i++){if(i!==index){assert.equal(o.signal.incoming[i],0);assert.equal(o.signal.outgoing[i],0);assert.equal(o.signal.absorbed[i],0);}assert.ok(Math.abs(o.signal.outgoing[i]+o.signal.absorbed[i]-o.signal.incoming[i])<1e-12);}
  }
 }
});
test('同一白紙換燈呈現不同顏色，紅紙與綠光不匹配時很暗',()=>{
 for(const [light,color]of [['white','白色'],['red','紅色'],['green','綠色'],['blue','藍色']]){const o=surfaceObservation(light,'white');assert.equal(o.appearance,color);assert.match(o.preview,new RegExp(color));assert.ok(o.result.includes('白色色卡'));}
 const dark=surfaceObservation('green','red');assert.equal(dark.preview,'看起來很暗');assert.match(dark.result,/紅色色卡在綠光下看起來很暗/);assert.match(dark.reflected,/極少量綠光/);assert.match(dark.absorbed,/大部分綠光/);
});
test('黑卡仍反射少量，白卡仍吸收少量，白光比較保留三色資訊',()=>{
 const black=surfaceObservation('white','black'),white=surfaceObservation('white','white');
 assert.ok(black.signal.outgoing.every(v=>v>0));assert.ok(white.signal.absorbed.every(v=>v>0));assert.equal(black.incoming,'紅、綠、藍');assert.equal(white.incoming,'紅、綠、藍');assert.match(black.reflected,/較少/);assert.match(white.absorbed,/較少/);
});
