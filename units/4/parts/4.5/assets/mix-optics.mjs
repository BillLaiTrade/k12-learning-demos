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
export function mixtureRegions(spots){
 const masks=new Set();
 for(let y=0;y<35;y++)for(let x=0;x<63;x++){
  let mask=0;for(let i=0;i<3;i++)if(footprint((x+.5)/63,(y+.5)/35,spots[i])>.6)mask|=1<<i;
  if(mask)masks.add(mask);
 }
 return[...masks].sort((a,b)=>a-b);
}
// Direction from fixed torch position to its own spot, with a foreshortened
// orthographic silhouette. The source itself stays below the screen.
export function torchAim(index,spot){
 const dx=spot.x*MIX_SETUP.width-(index+.5)*MIX_SETUP.width/3,dy=spot.y*MIX_SETUP.height-760,dz=-600;
 const length=Math.hypot(dx,dy,dz);
 return{angle:Math.atan2(dx,-dy)*180/Math.PI,length:105*Math.hypot(dx,dy)/length,direction:[dx/length,dy/length,dz/length]};
}
