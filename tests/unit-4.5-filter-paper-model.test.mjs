import {test} from 'node:test';
import assert from 'node:assert/strict';
import {filterPaperLight,filterPaperObservation} from '../units/4/parts/4.5/assets/filter-paper-model.mjs';
const lights=['white','red','green','blue'],filters=['clear','red','green','blue'],papers=['white','red','green','blue','black'];
test('80種組合逐色守恆，透射與反射都不會新增光源沒有的色光',()=>{
 let count=0;for(const light of lights)for(const filter of filters)for(const paper of papers){
  const s=filterPaperLight(light,filter,paper);count++;
  for(let i=0;i<3;i++){
   assert.ok(s.incoming[i]>=s.transmitted[i]&&s.transmitted[i]>=s.outgoing[i]&&s.outgoing[i]>=0);
   assert.ok(Math.abs(s.transmitted[i]+s.filterAbsorbed[i]-s.incoming[i])<1e-12);
   assert.ok(Math.abs(s.outgoing[i]+s.paperAbsorbed[i]-s.transmitted[i])<1e-12);
   assert.ok(Math.abs(s.outgoing[i]+s.paperAbsorbed[i]+s.filterAbsorbed[i]-s.incoming[i])<1e-12);
   if(s.incoming[i]===0)assert.deepEqual([s.transmitted[i],s.outgoing[i],s.filterAbsorbed[i],s.paperAbsorbed[i]],[0,0,0,0]);
  }
 }assert.equal(count,80);
});
test('白光經綠片再照白紙保留綠光；只換紅紙使反射更少',()=>{
 const white=filterPaperLight('white','green','white'),red=filterPaperLight('white','green','red');
 assert.deepEqual(white.transmitted,[.008,.82,.012]);assert.ok(Math.abs(white.outgoing[1]-.738)<1e-12);
 assert.deepEqual(white.incoming,red.incoming);assert.deepEqual(white.transmitted,red.transmitted);
 assert.ok(Math.abs(red.outgoing[1]-.00984)<1e-12);assert.ok(Math.max(...red.outgoing)<.045);
 assert.match(filterPaperObservation('white','green','red').result,/反射很少/);
});
test('紅光經綠片會先在色片減弱，不把它誤當紙張變黑',()=>{
 const s=filterPaperLight('red','green','white');assert.deepEqual(s.transmitted,[.008,0,0]);assert.ok(Math.abs(s.outgoing[0]-.0072)<1e-12);
 assert.match(filterPaperObservation('red','green','white').result,/色片透過的光已很少/);
});
test('無色片不吸收、黑紙仍保留少量反射，輸入陣列互不共用',()=>{
 const s=filterPaperLight('white','clear','black');assert.deepEqual(s.incoming,[1,1,1]);assert.deepEqual(s.transmitted,[1,1,1]);assert.deepEqual(s.filterAbsorbed,[0,0,0]);assert.deepEqual(s.outgoing,[.012,.012,.012]);
 s.incoming[0]=0;assert.equal(s.transmitted[0],1);assert.equal(filterPaperLight('white','clear','white').incoming[0],1);
});
