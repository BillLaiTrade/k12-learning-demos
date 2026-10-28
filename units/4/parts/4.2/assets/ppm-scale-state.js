// World coordinates are millimeters. Sucrose density: 1.59 g/cm³ = 1.59 mg/mm³.
// Source: PubChem CID 5988 / CAMEO, Density (read 2026-10-28).
export const DENSITY_MG_MM3 = 1.59;
export const GRAIN_MASS_MG = 0.1;
export const GRAIN_VOLUME_MM3 = GRAIN_MASS_MG / DENSITY_MG_MM3;
export const GRAIN_CELL_MM = 0.6;
export const WORLD_WIDTH_MM = 360;
export const WATER = { radiusMm:55, volumeMm3:1000000, heightMm:1000000/(Math.PI*55**2) };
export const SAMPLES = {
  gram:{massMg:1000,x:43,label:'1 克',fieldMm:36},
  milligram:{massMg:1,x:126,label:'1 毫克',fieldMm:3.6}
};
export function sampleState(key) {
  const sample=SAMPLES[key];if(!sample)return null;
  return {...sample,grainCount:Math.round(sample.massMg/GRAIN_MASS_MG),solidVolumeMm3:sample.massMg/DENSITY_MG_MM3,
    totalMg:1000000,solventMg:1000000-sample.massMg,ppm:sample.massMg,percent:sample.massMg/10000};
}
export function grainPositions(massMg) {
  const count=Math.round(massMg/GRAIN_MASS_MG),extent=Math.ceil(Math.cbrt(count)*.85+2),points=[];
  // A non-overlapping lattice cut into a mound; each solid's volume is calibrated.
  // Empty space is allowed between grains and is never counted as sugar volume.
  for(let y=0;y<=extent;y++)for(let x=-extent;x<=extent;x++)for(let z=-extent;z<=extent;z++)
    points.push({x:x*GRAIN_CELL_MM,y:(y+.5)*GRAIN_CELL_MM,z:z*GRAIN_CELL_MM,rank:x*x+(y+.5)**2+z*z});
  points.sort((a,b)=>a.rank-b.rank||a.y-b.y||a.x-b.x||a.z-b.z);
  return points.slice(0,count);
}
export function scaleBarPixels(mm,fieldMm,pixels) {return mm/fieldMm*pixels;}
export function magnification(lensPixels,fieldMm,scenePixels) {return lensPixels/fieldMm/(scenePixels/WORLD_WIDTH_MM);}
