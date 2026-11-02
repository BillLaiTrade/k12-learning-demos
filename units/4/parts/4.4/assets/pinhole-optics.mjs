export const PINHOLE = Object.freeze({sourceX:-3, holeX:0, axisY:1.6, holeRadius:.035, plateThickness:.08, screenMin:1.4, screenMax:3.8, screenInitial:2.6, cardWidth:1.12, cardHeight:1.6, screenWidth:1.86, screenHeight:2.5});
export const MARKERS=Object.freeze({top:Object.freeze([-3,2,0]),bottom:Object.freeze([-3,1.2,0])});
export function clampScreen(x){if(!Number.isFinite(x))throw new RangeError('Screen position must be finite');return Math.max(PINHOLE.screenMin,Math.min(PINHOLE.screenMax,x));}
export function projectPoint(point,screenX){
 if(!point.every(Number.isFinite)||point[0]>=PINHOLE.holeX||!Number.isFinite(screenX)||screenX<=PINHOLE.holeX)throw new RangeError('Invalid pinhole geometry');
 const hole=[PINHOLE.holeX,PINHOLE.axisY,0],t=(screenX-hole[0])/(hole[0]-point[0]);
 return [screenX,hole[1]-t*(point[1]-hole[1]),-t*point[2]];
}
export function projectionState(screenX){
 const x=clampScreen(screenX),magnification=(x-PINHOLE.holeX)/(PINHOLE.holeX-PINHOLE.sourceX);
 return {screenX:x,magnification,imageWidth:PINHOLE.cardWidth*magnification,imageHeight:PINHOLE.cardHeight*magnification,top:projectPoint(MARKERS.top,x),bottom:projectPoint(MARKERS.bottom,x),brightness:Math.min(.68,.35*(PINHOLE.screenInitial/x)**2)};
}
export function screenUV(point){return [.5+point[2]/PINHOLE.screenWidth,.5-(point[1]-PINHOLE.axisY)/PINHOLE.screenHeight];}
// Source faces +X and screen receives on its -X face. Their local horizontal
// axes therefore point in opposite world directions; the canvas transform is
// a vertical flip while the WORLD projection reverses both Y and Z.
export function cardPoint(u,v){return [PINHOLE.sourceX,PINHOLE.axisY+(.5-v)*PINHOLE.cardHeight,(.5-u)*PINHOLE.cardWidth];}
export function blockedSegments(point){
 const x=PINHOLE.holeX-PINHOLE.plateThickness/2-.002;
 return [.28,.58].map(offset=>({from:[...point],to:[x,PINHOLE.axisY+(point[1]>PINHOLE.axisY?offset:-offset),.12]}));
}
