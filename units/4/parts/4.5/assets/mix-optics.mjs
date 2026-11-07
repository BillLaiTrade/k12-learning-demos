import {CIE_D65} from './spectral-data.mjs';

// An ideal beam shaper keeps a circular, uniform footprint on the screen.
// Positions and radius use the same screen coordinates in both axes.
export const MIX_SETUP=Object.freeze({width:1000,height:560,radius:180,edge:.07,ambient:.035,exposure:.94});
export const MIX_KEYS=Object.freeze(['red','green','blue']);
const WAVELENGTHS=[650,530,460];
export const WHITE_XYZ=Object.freeze([.95047,1,1.08883]);
const matching=WAVELENGTHS.map(w=>CIE_D65.find(row=>row[0]===w).slice(1,4));
// Solve the three source powers for the D65 white point, before any sRGB clipping.
const matrix=WHITE_XYZ.map((v,i)=>[...matching.map(c=>c[i]),v]);
for(let i=0;i<3;i++){
 const divisor=matrix[i][i];for(let k=i;k<4;k++)matrix[i][k]/=divisor;
 for(let j=0;j<3;j++){if(j===i)continue;const factor=matrix[j][i];for(let k=i;k<4;k++)matrix[j][k]-=factor*matrix[i][k];}
}
export const MIX_SOURCES=Object.freeze(MIX_KEYS.map((key,i)=>Object.freeze({key,wavelength:WAVELENGTHS[i],power:matrix[i][3],xyz:Object.freeze(matching[i].map(v=>v*matrix[i][3]))})));
export const xyzToLinear=([x,y,z])=>[3.2406*x-1.5372*y-.4986*z,-.9689*x+1.8758*y+.0415*z,.0557*x-.204*y+1.057*z];
export const SOURCE_LINEAR=Object.freeze(MIX_SOURCES.map(source=>Object.freeze(xyzToLinear(source.xyz))));
export function footprint(x,y,spot){
 if(!spot.on)return 0;
 const d=Math.hypot((x-spot.x)*MIX_SETUP.width,(y-spot.y)*MIX_SETUP.height)/MIX_SETUP.radius;
 return Math.max(0,Math.min(1,(1-d)/MIX_SETUP.edge));
}
export function mixSample(x,y,spots){
 const weights=spots.map(spot=>footprint(x,y,spot));
 const xyz=[0,1,2].map(c=>weights.reduce((sum,w,i)=>sum+w*MIX_SOURCES[i].xyz[c],0));
 return{weights,xyz,linear:xyzToLinear(xyz)};
}
const POSITIONS=Object.freeze({apart:[[.185,.325],[.815,.325],[.50,.675]],pairs:[[.40,.36],[.60,.36],[.50,.64]],together:[[.5,.5],[.5,.5],[.5,.5]]});
// Arranging footprints never changes a student's lamp switches.
export function arrangeMix(kind='pairs',previous){
 return POSITIONS[kind].map(([x,y],i)=>({x,y,on:previous?previous[i].on:true}));
}
function mixtureSamples(spots){
 const samples=new Map();
 for(let y=0;y<35;y++)for(let x=0;x<63;x++){
  const weights=spots.map(spot=>footprint((x+.5)/63,(y+.5)/35,spot));
  const mask=weights.reduce((n,w,i)=>n|(w>.6?1<<i:0),0);if(!mask)continue;
  const included=weights.filter((_,i)=>mask&(1<<i)),strength=Math.min(...included),old=samples.get(mask);
  const imbalance=Math.max(...included)-strength;
  const leakage=weights.reduce((n,w,i)=>n+(mask&(1<<i)?0:w),0);
  if(!old||strength>old.strength+1e-6||(Math.abs(strength-old.strength)<1e-6&&imbalance+leakage<old.imbalance+old.leakage))samples.set(mask,{weights,strength,imbalance,leakage});
 }
 return samples;
}
export function mixtureRegions(spots){return [...mixtureSamples(spots).keys()].sort((a,b)=>a-b);}
export function mixObservation(spots){
 const names=['紅','綠','藍'],active=spots.flatMap((s,i)=>s.on?[i]:[]),samples=mixtureSamples(spots);
 if(!active.length)return'三支手電筒都關閉了，白幕上沒有這三支燈照出的光斑。';
 if(active.length===1)return`只開${names[active[0]]}光時，白幕上只看到${names[active[0]]}色光斑。`;
 const triple=samples.get(7);
 if(triple)return triple.imbalance<=.03*Math.max(...triple.weights)?'紅光、綠光和藍光照在一起的地方，看起來接近白色耶！':'三色重疊處的強度比例不均，顏色出現偏移；移動光斑，比較何時接近白色。';
 const pairs=[[3,'紅光和綠光重疊處看起來是黃色'],[5,'紅光和藍光重疊處看起來是洋紅色'],[6,'綠光和藍光重疊處看起來是青色']].filter(([mask])=>samples.has(mask));
 if(pairs.length)return pairs.map(([mask,text])=>{const s=samples.get(mask);return s.imbalance<=.03&&s.leakage<.01?text:'光斑重疊處的色光強度比例不均，顏色出現偏移';}).join('；')+'。';
 const touching=active.some((i,j)=>active.slice(j+1).some(k=>Math.hypot((spots[i].x-spots[k].x)*MIX_SETUP.width,(spots[i].y-spots[k].y)*MIX_SETUP.height)<2*MIX_SETUP.radius));
 return touching?'光斑邊緣開始重疊，繼續靠近，比較中央與邊緣的顏色。':'光斑分開時，可以分別看到每支手電筒原本的色光。';
}
// Direction from fixed torch position to its own spot, with a foreshortened
// orthographic silhouette. The source itself stays below the screen.
export function torchAim(index,spot){
 const dx=spot.x*MIX_SETUP.width-(index+.5)*MIX_SETUP.width/3,dy=spot.y*MIX_SETUP.height-760,dz=-600;
 const length=Math.hypot(dx,dy,dz);
 return{angle:Math.atan2(dx,-dy)*180/Math.PI,length:105*Math.hypot(dx,dy)/length,direction:[dx/length,dy/length,dz/length]};
}
