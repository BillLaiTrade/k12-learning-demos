import {test}from'node:test';import assert from'node:assert/strict';
import{SETUP,TRIANGLE,INCIDENCE,indexBK7,trace,spectrum,pixelLinear,measurements,fresnel}from'../units/4/parts/4.5/assets/prism-optics.mjs';
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]),unit=a=>{const d=Math.hypot(...a);return a.map(v=>v/d)};
test('N-BK7與公開Fraunhofer折射率符合，30度等腰三角柱實體尺寸固定',()=>{
 for(const[w,n]of[[435.8343,1.52668],[486.1327,1.52238],[546.074,1.51872],[587.5618,1.51680],[656.2725,1.51432]])near(indexBK7(w),n,5e-6);
 near(Math.hypot(...sub(TRIANGLE[0],TRIANGLE[1])),100*Math.sin(Math.PI/12));for(const i of[0,1])near(Math.hypot(...sub(TRIANGLE[i],TRIANGLE[2])),50);near(dot(unit(sub(TRIANGLE[0],TRIANGLE[2])),unit(sub(TRIANGLE[1],TRIANGLE[2]))),Math.cos(Math.PI/6));
 const n=indexBK7(SETUP.referenceNm),expected=2*Math.asin(n*Math.sin(Math.PI/12))-Math.PI/6;near(trace().deviation,expected);near(INCIDENCE,Math.asin(n*Math.sin(Math.PI/12)));assert.ok(trace().deviation<20*Math.PI/180);assert.ok(Math.abs(trace().landing)<90);
});
test('401個波長與有限狹縫均穿過兩面，滿足司乃耳關係且落在固定白幕內',()=>{
 for(let w=380;w<=780;w++)for(const offset of[-.5,0,.5]){const r=trace(w,{offset});assert.equal(r.intersects,true);const[a,b,c,d]=r.points;
  for(const[p,q,N,n1,n2]of[[unit(sub(b,a)),unit(sub(c,b)),r.entryNormal,1,indexBK7(w)],[unit(sub(c,b)),unit(sub(d,c)),r.exitNormal,indexBK7(w),1]])near(n1*Math.sqrt(Math.max(0,1-dot(p,N)**2)),n2*Math.sqrt(Math.max(0,1-dot(q,N)**2)));
  assert.ok(r.landing>SETUP.screenZ[0]&&r.landing<SETUP.screenZ[1]);near(d[0],300);assert.ok(r.transmission>0&&r.transmission<1);
 }
});
test('色光實際角度、落點單調，400–700 nm約4.27mm、380–780 nm約5.14mm，高度由5mm狹縫決定',()=>{
 let last=-Infinity;for(let w=380;w<=780;w++){const r=trace(w);assert.ok(r.landing>last);last=r.landing;}
 const m=measurements();near(m.visibleWidth,4.2685474458,1e-7);near(m.width,5.1364056805,1e-7);assert.equal(m.height,5);assert.ok(m.low>m.crop[0]&&m.high<m.crop[1]);
 // Geometric magnification along the prism's extrusion axis is exactly 1:
 // incident dy=0 and all surface normals have ny=0, so y is unchanged.
 const y=SETUP.slitHeight/2;near((SETUP.axisHeight+y)-(SETUP.axisHeight-y),m.height);
});
test('移開位置90mm完全離開1mm光束；未放入白幕為1×5mm，單色與光譜寬度不混用',()=>{
 for(const w of[380,550,780])for(const offset of[-.5,0,.5]){const r=trace(w,{inserted:false,offset});assert.equal(r.intersects,false);near(r.landing,offset);near(r.transmission,1);}
 const m=measurements(false);near(m.width,1);near(m.height,5);assert.ok(measurements().width>m.width*4);
});
test('有限狹縫足跡與Fresnel／吸收守恆；D65白點和全局曝光不做逐像素亮度正規化',()=>{
 const m=spectrum(true),removed=spectrum(false);assert.equal(m.length,401);let transmitted=0;for(let i=0;i<m.length;i++){assert.ok(m[i].high>m[i].low);assert.ok(m[i].high-m[i].low>1.03&&m[i].high-m[i].low<1.06);transmitted+=m[i].xyz[1];}assert.ok(transmitted>.90&&transmitted<.93);
 near(removed.reduce((s,r)=>s+r.xyz[1],0),1,1e-12);const rgb=pixelLinear(-.5,.5,removed);for(const c of rgb)near(c,1,.002);
 const whiteInterface=fresnel([1,0],[-1,0],1,indexBK7(587.5618));near(whiteInterface,((1-indexBK7(587.5618))/(1+indexBK7(587.5618)))**2);
 near(pixelLinear(10,11,m).reduce((a,b)=>a+Math.abs(b),0),0);
});
test('白幕移遠造成可計算色散展開，參考波長解析偏折角不隨屏幕距離改變',()=>{
 const a=trace(400,{screenX:200}),b=trace(700,{screenX:200}),c=trace(400,{screenX:400}),d=trace(700,{screenX:400});assert.ok(Math.abs(c.landing-d.landing)>Math.abs(a.landing-b.landing));near(a.deviation,c.deviation);near(b.deviation,d.deviation);
});
