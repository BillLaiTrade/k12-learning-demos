// Composite teaching transect, not bathymetry of a particular ocean or coast.
export const WATER_SPEED = 1500;
export const MAX_DEPTH = 8250;
export const PROBE_Y = 145;
export const DEPTH_HEIGHT = 335;
export const terrainNodes = [
 [0,120],[100,150],[180,172.5],[220,195], // shallow continental shelf
 [240,300],[300,1500],[360,3900],[410,4500], // continental slope and foot
 [450,4500],[500,3000],[550,4500], // isolated seamount, 1500m relief
 [620,4500],[700,4500], // broad abyssal plain
 [730,6300],[760,8250],[800,5400],[820,4500], // narrow, asymmetric trench
 [900,1500],[980,195],[1000,150] // opposite continental margin
];
export function depthAt(x) {
 const bounded = Math.max(0, Math.min(1000, x));
 const index = terrainNodes.findIndex((node,i)=>i>0&&bounded<=node[0]);
 const [x0,z0]=terrainNodes[index-1], [x1,z1]=terrainNodes[index];
 const t=(bounded-x0)/(x1-x0), smooth=t*t*(3-2*t);
 const base=z0+(z1-z0)*smooth;
 // Subtle fixed surface detail fades to zero at each control location.
 const detail=Math.sin(Math.PI*t)**2*(base<300?1.5:15)*(Math.sin(bounded*.12)+.4*Math.sin(bounded*.31));
 return Math.round(Math.max(120,Math.min(MAX_DEPTH,base+detail))/7.5)*7.5;
}
export const bottomY = x => PROBE_Y + depthAt(x)/MAX_DEPTH*DEPTH_HEIGHT;
export const returnTime = x => 2*depthAt(x)/WATER_SPEED;
