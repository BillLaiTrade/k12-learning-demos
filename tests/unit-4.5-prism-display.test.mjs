import {test} from 'node:test';
import assert from 'node:assert/strict';
import {toneMapPrism,linearToSrgb} from '../units/4/parts/4.5/assets/prism-display.mjs';
import {measurements,spectrum,pixelLinear,SETUP,MONOCHROMATIC,trace} from '../units/4/parts/4.5/assets/prism-optics.mjs';
test('共同顯色曲線壓縮峰值、保留正色通道比例，不逐色獨立裁切',()=>{
 const raw=[.05,-.29,5.15],a=.045,mapped=toneMapPrism(raw,7,a);assert.ok(mapped.every(v=>v>=a&&v<1));assert.ok(Math.abs((mapped[0]-a)/(mapped[2]-a)-raw[0]/raw[2])<1e-12);assert.equal(mapped[1],a);
});
test('相同曝光下更強的光仍較亮，無光與中性白保持中性',()=>{
 const dark=toneMapPrism([0,0,0]),white=toneMapPrism([1,1,1]),dim=toneMapPrism([.1,.3,.5]),bright=toneMapPrism([.2,.6,1]);assert.deepEqual(dark,[.045,.045,.045]);assert.equal(new Set(white).size,1);assert.ok(bright.every((v,i)=>v>dim[i]));
});
test('460nm顯示為藍色、650nm為紅色、530nm為綠色，物理落點不改',()=>{
 const d=measurements(true).crop,expected={red:-86.91522087745462,green:-87.83178053323918,blue:-88.71172161538848};
 for(const[name,w]of Object.entries(MONOCHROMATIC)){const center=trace(w).landing,x=Math.floor((center-d[0])/15*420),raw=pixelLinear(d[0]+x/420*15,d[0]+(x+1)/420*15,spectrum(true,name)),rgb=toneMapPrism(raw,SETUP.exposure,SETUP.ambient).map(v=>Math.round(255*linearToSrgb(v)));assert.ok(Math.abs(center-expected[name])<1e-10);const i={red:0,green:1,blue:2}[name];assert.ok(rgb[i]>230);assert.ok(rgb.filter((_,j)=>j!==i).every(v=>v<90),`${name}: ${rgb}`);}
});
