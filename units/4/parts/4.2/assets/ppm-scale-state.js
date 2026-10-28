import {sugarCrystalTriangles} from './ppm-crystal.js?v=realism-3';
// World coordinates are millimeters. Sucrose density: 1.59 g/cm³ = 1.59 mg/mm³.
// Source: PubChem CID 5988 / CAMEO, Density (read 2026-10-28).
export const DENSITY_MG_MM3 = 1.59;
export const GRAIN_MASS_MG = 0.1;
export const GRAIN_VOLUME_MM3 = GRAIN_MASS_MG / DENSITY_MG_MM3;
export const GRAIN_CELL_MM = 0.6;
export const POSITION_JITTER_MM = 0.025;
const random=(a,b=0)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
const raw=sugarCrystalTriangles();let rawVolume=0;for(let i=0;i<raw.length;i+=9){const [ax,ay,az,bx,by,bz,cx,cy,cz]=raw.slice(i,i+9);rawVolume+=(ax*(by*cz-bz*cy)+ay*(bz*cx-bx*cz)+az*(bx*cy-by*cx))/6;}
const vertexScale=Math.cbrt(GRAIN_VOLUME_MM3/Math.abs(rawVolume)),cellVertices=[...new Map(Array.from({length:raw.length/3},(_,i)=>raw.slice(i*3,i*3+3)).map(v=>[v.join(','),v.map(x=>x*vertexScale)])).values()],poseCache=[];
export function grainPose(i){
  if(poseCache[i])return poseCache[i];
  const sx=1+.06*Math.sin(i*2.17),sy=1+.06*Math.cos(i*1.83),sz=1/(sx*sy),limit=GRAIN_CELL_MM/2-POSITION_JITTER_MM-.002;
  for(let trial=0;trial<24;trial++){
    const rx=random(i,trial*3+101)*Math.PI*2,ry=random(i,trial*3+102)*Math.PI*2,rz=random(i,trial*3+103)*Math.PI*2,a=Math.cos(rx),b=Math.sin(rx),c=Math.cos(ry),d=Math.sin(ry),e=Math.cos(rz),f=Math.sin(rz);
    const fits=cellVertices.every(v=>{const x=v[0]*sx,y=v[1]*sy,z=v[2]*sz;return Math.max(Math.abs(c*e*x-c*f*y+d*z),Math.abs((a*f+b*e*d)*x+(a*e-b*f*d)*y-b*c*z),Math.abs((b*f-a*e*d)*x+(b*e+a*f*d)*y+a*c*z))<limit;});
    if(fits)return poseCache[i]={sx,sy,rx,ry,rz};
  }
  return poseCache[i]={sx,sy,rx:0,ry:0,rz:0};
}
export const WORLD_WIDTH_MM = 360;
export const LENS_FIELD_MM = 3.6;
export const WATER = { radiusMm:55, volumeMm3:1000000, heightMm:1000000/(Math.PI*55**2) };
export const SAMPLES = {
  gram:{massMg:1000,x:43,label:'1 克'},
  milligram:{massMg:1,x:126,label:'1 毫克'}
};
export function sampleState(key) {
  const sample=SAMPLES[key];if(!sample)return null;
  return {...sample,grainCount:Math.round(sample.massMg/GRAIN_MASS_MG),solidVolumeMm3:sample.massMg/DENSITY_MG_MM3,
    totalMg:1000000,solventMg:1000000-sample.massMg,ppm:sample.massMg,percent:sample.massMg/10000};
}
export function grainPositions(massMg) {
  const count=Math.round(massMg/GRAIN_MASS_MG),extent=Math.ceil(Math.cbrt(count)*1.35+5),points=[];
  // Stagger each layer, jitter within its non-overlapping cell, and select a
  // rough cone by angle of repose instead of cutting a perfectly smooth dome.
  for(let y=0;y<=extent;y++){
    const layerX=(random(y,11)-.5)*GRAIN_CELL_MM,layerZ=(random(y,12)-.5)*GRAIN_CELL_MM;
    for(let x=-extent;x<=extent;x++)for(let z=-extent;z<=extent;z++){
      const px=x*GRAIN_CELL_MM+layerX+(random(x+z*83,y+21)-.5)*2*POSITION_JITTER_MM;
      const py=(y+.5)*GRAIN_CELL_MM+(random(x+z*53,y+22)-.5)*2*POSITION_JITTER_MM;
      const pz=z*GRAIN_CELL_MM+layerZ+(random(x+z*71,y+23)-.5)*2*POSITION_JITTER_MM;
      points.push({x:px,y:py,z:pz,rank:py+Math.hypot(px,pz)*.62+random(x+z*97,y+24)*.6});
    }
  }
  points.sort((a,b)=>a.rank-b.rank);return points.slice(0,count);
}
export function scaleBarPixels(mm,fieldMm,pixels) {return mm/fieldMm*pixels;}
export function magnification(lensPixels,fieldMm,scenePixels) {return lensPixels/fieldMm/(scenePixels/WORLD_WIDTH_MM);}
