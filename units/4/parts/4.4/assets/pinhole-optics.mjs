export const PINHOLE = Object.freeze({sourceX:-3, holeX:0, axisY:1.6, holeRadius:.07, plateThickness:.08, railMin:-3.6, gap:1.4, screenMin:1.4, screenMax:3.8, screenInitial:2.6, cardWidth:1.12, cardHeight:1.6, screenWidth:1.86, screenHeight:2.5});
export const INITIAL_POSITIONS=Object.freeze({source:PINHOLE.sourceX,hole:PINHOLE.holeX,screen:PINHOLE.screenInitial});
export function deviceBounds(name,p){
 if(!Object.values(p).every(Number.isFinite)||p.hole-p.source<PINHOLE.gap-1e-9||p.screen-p.hole<PINHOLE.gap-1e-9||p.source<PINHOLE.railMin||p.screen>PINHOLE.screenMax)throw new RangeError('Invalid apparatus positions');
 if(name==='source')return [PINHOLE.railMin,p.hole-PINHOLE.gap];
 if(name==='hole')return [p.source+PINHOLE.gap,p.screen-PINHOLE.gap];
 if(name==='screen')return [p.hole+PINHOLE.gap,PINHOLE.screenMax];
 throw new RangeError('Unknown apparatus');
}
export function moveDevice(name,x,p){if(!Number.isFinite(x))throw new RangeError('Position must be finite');const [min,max]=deviceBounds(name,p);return {...p,[name]:Math.max(min,Math.min(max,x))};}
export const MARKERS=Object.freeze({top:Object.freeze([-3,2,0]),bottom:Object.freeze([-3,1.2,0])});
export function clampScreen(x,holeX=PINHOLE.holeX){if(!Number.isFinite(x)||!Number.isFinite(holeX)||holeX+PINHOLE.gap>PINHOLE.screenMax)throw new RangeError('Screen position must be finite and reachable');return Math.max(holeX+PINHOLE.gap,Math.min(PINHOLE.screenMax,x));}
export function projectPoint(point,screenX,holeX=PINHOLE.holeX){
 if(!point.every(Number.isFinite)||!Number.isFinite(holeX)||point[0]>=holeX||!Number.isFinite(screenX)||screenX<=holeX)throw new RangeError('Invalid pinhole geometry');
 const hole=[holeX,PINHOLE.axisY,0],t=(screenX-hole[0])/(hole[0]-point[0]);
 return [screenX,hole[1]-t*(point[1]-hole[1]),-t*point[2]];
}
export function projectionState(screenX,sourceX=PINHOLE.sourceX,holeX=PINHOLE.holeX){
 const x=clampScreen(screenX,holeX);deviceBounds('screen',{source:sourceX,hole:holeX,screen:x});
 const magnification=(x-holeX)/(holeX-sourceX),markers=Object.fromEntries(Object.entries(MARKERS).map(([name,p])=>[name,[sourceX,p[1],p[2]]]));
 return {screenX:x,magnification,imageWidth:PINHOLE.cardWidth*magnification,imageHeight:PINHOLE.cardHeight*magnification,markers,top:projectPoint(markers.top,x,holeX),bottom:projectPoint(markers.bottom,x,holeX),brightness:Math.min(.68,.35*(PINHOLE.screenInitial/(x-holeX))**2)};
}
export function screenUV(point){return [.5+point[2]/PINHOLE.screenWidth,.5-(point[1]-PINHOLE.axisY)/PINHOLE.screenHeight];}
// Source faces +X and screen receives on its -X face. Their local horizontal
// axes therefore point in opposite world directions; the canvas transform is
// a vertical flip while the WORLD projection reverses both Y and Z.
export function cardPoint(u,v,sourceX=PINHOLE.sourceX){return [sourceX,PINHOLE.axisY+(.5-v)*PINHOLE.cardHeight,(.5-u)*PINHOLE.cardWidth];}
export function blockedSegments(point,holeX=PINHOLE.holeX){
 const x=holeX-PINHOLE.plateThickness/2-.002;
 return [.28,.58].map(offset=>({from:[...point],to:[x,PINHOLE.axisY+(point[1]>PINHOLE.axisY?offset:-offset),.12]}));
}
