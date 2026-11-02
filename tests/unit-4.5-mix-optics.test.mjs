import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CIE_D65} from '../units/4/parts/4.5/assets/spectral-data.mjs';
import {MIX_SETUP,MIX_SOURCES,WHITE_XYZ,arrangeMix,footprint,mixSample,mixtureRegions,torchAim} from '../units/4/parts/4.5/assets/mix-optics.mjs';
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
test('三個已知波長以正輻射功率配成D65白點，先加總光譜色度再轉顯示值',()=>{
 assert.deepEqual(MIX_SOURCES.map(s=>s.wavelength),[650,530,460]);
 for(const s of MIX_SOURCES){assert.ok(s.power>0);const matching=CIE_D65.find(row=>row[0]===s.wavelength).slice(1,4);for(let c=0;c<3;c++)near(s.xyz[c],matching[c]*s.power);}
 const together=mixSample(.5,.5,arrangeMix('together'));for(let c=0;c<3;c++){near(together.xyz[c],WHITE_XYZ[c]);near(together.linear[c],1,.0002);}
 assert.ok(MIX_SOURCES[0].power/MIX_SOURCES[2].power>3);assert.ok(MIX_SOURCES[1].power>MIX_SOURCES[2].power);
});
test('移開／關閉只改各光源貢獻，光譜先線性相加，色域裁切不提前進入模型',()=>{
 const together=arrangeMix('together'),single=MIX_SOURCES.map((_,i)=>mixSample(.5,.5,together.map((s,j)=>({...s,on:i===j}))));
 const mixed=mixSample(.5,.5,together);for(let c=0;c<3;c++)near(single.reduce((sum,s)=>sum+s.xyz[c],0),mixed.xyz[c]);
 assert.ok(single[0].linear.some(v=>v<0));assert.ok(single[0].linear.some(v=>v>1));
 const off=mixSample(.5,.5,together.map(s=>({...s,on:false})));assert.deepEqual(off.xyz,[0,0,0]);assert.deepEqual(off.linear,[0,0,0]);
 for(let i=0;i<3;i++){const pair=together.map((s,j)=>({...s,on:i!==j})),sample=mixSample(.5,.5,pair);for(let c=0;c<3;c++)near(sample.xyz[c]+single[i].xyz[c],mixed.xyz[c]);}
});
test('光斑兩軸同尺寸、固定半徑與柔邊，移動不改照度分布',()=>{
 const spot={x:.5,y:.5,on:true},{width,height,radius}=MIX_SETUP;
 for(const distance of[0,100,170,179,180,200])near(footprint(.5+distance/width,.5,spot),footprint(.5,.5+distance/height,spot));
 near(footprint(.5,.5,spot),1);near(footprint(.5+radius/width,.5,spot),0);assert.ok(footprint(.5+175/width,.5,spot)>0&&footprint(.5+175/width,.5,spot)<1);
 const moved={x:.6,y:.65,on:true};near(footprint(.6+175/width,.65,moved),footprint(.5+175/width,.5,spot));
});
test('初始部分重疊涵蓋七區，分開真的無混色，快速排列保留燈具開關',()=>{
 assert.deepEqual(mixtureRegions(arrangeMix()),[1,2,3,4,5,6,7]);assert.deepEqual(mixtureRegions(arrangeMix('apart')),[1,2,4]);assert.deepEqual(mixtureRegions(arrangeMix('together')),[7]);
 const previous=arrangeMix();previous[1].on=false;for(const preset of['apart','pairs','together']){const next=arrangeMix(preset,previous);assert.deepEqual(next.map(s=>s.on),[true,false,true]);assert.notEqual(next[0],previous[0]);}
});
test('每支手電筒方向都指向自己的落點，單位向量及投影與開關獨立',()=>{
 for(let i=0;i<3;i++)for(const [x,y]of[[.05,.08],[.5,.5],[.95,.92]]){
  const aim=torchAim(i,{x,y,on:true});near(Math.hypot(...aim.direction),1);assert.ok(aim.direction[2]<0);const t=-600/aim.direction[2];near((i+.5)*MIX_SETUP.width/3+t*aim.direction[0],x*MIX_SETUP.width);near(760+t*aim.direction[1],y*MIX_SETUP.height);assert.deepEqual(aim,torchAim(i,{x,y,on:false}));assert.ok(aim.length>0&&aim.length<105);
 }
});
