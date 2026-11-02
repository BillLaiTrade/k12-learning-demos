import {imageFor,rayAt} from './optics.mjs';
export const MAGNIFIER=Object.freeze({f:100,scale:.02,axis:2,eye:170,objectMin:30,objectMax:90,screenMin:45,screenMax:140,aperture:.82,screenAperture:.55,cardWidth:.7,cardHeight:1.2,screenWidth:1.9,screenHeight:3,fov:32});
export function moveMagnifier(state,key,value){
 if(!['object','screen'].includes(key)||!Number.isFinite(value))return state;
 return {...state,[key]:Math.round(Math.max(MAGNIFIER[key+'Min'],Math.min(MAGNIFIER[key+'Max'],value))*10)/10};
}
export function magnifierState(state){
 const g=imageFor(MAGNIFIER.f,state.object),distance=(MAGNIFIER.eye-g.v)*MAGNIFIER.scale;
 const imageScale=g.m/distance,referenceScale=1/((MAGNIFIER.eye+state.object)*MAGNIFIER.scale);
 return {...g,distance,imageScale,referenceScale,angularGain:imageScale/referenceScale,projectionScale:-state.screen/state.object,spread:MAGNIFIER.screenAperture*(1+state.screen/state.object-state.screen/MAGNIFIER.f),blocked:!!state.screenIn,virtualOutside:g.v*MAGNIFIER.scale< -2.6};
}
export function magnifierRays(state,point='both'){
 const G=MAGNIFIER,paths=[],d=state.screenIn?state.screen:G.eye,den=1+G.eye*(1/state.object-1/G.f);
 for(const [name,oy]of [['top',.44],['bottom',-.4]]){
  if(point!=='both'&&point!==name)continue;
  const heights=state.screenIn?[-G.screenAperture,0,G.screenAperture]:[-.025,0,.025].map(p=>(p+G.eye*oy/state.object)/den);
  for(const h of heights){if(Math.abs(h)>G.aperture)continue;const g=imageFor(G.f,state.object);paths.push({name,from:[-state.object*G.scale,G.axis+oy,0],lens:[0,G.axis+h,0],end:[d*G.scale,G.axis+rayAt(G.f,state.object,oy,h,d),0],virtual:[g.v*G.scale,G.axis+g.m*oy,0]});}
 }
 return paths;
}
