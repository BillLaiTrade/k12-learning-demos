import {imageFor,rayAt} from './optics.mjs';
export const MAGNIFIER=Object.freeze({f:100,scale:.02,axis:2,eye:170,objectMin:30,objectMax:200,screenMin:45,screenMax:140,aperture:.82,screenAperture:.55,cardWidth:.7,cardHeight:1.2,screenWidth:1.9,screenHeight:3,fov:32});
export function moveMagnifier(state,key,value){
 if(!['object','screen'].includes(key)||!Number.isFinite(value))return state;
 return {...state,[key]:Math.round(Math.max(MAGNIFIER[key+'Min'],Math.min(MAGNIFIER[key+'Max'],value))*10)/10};
}
export function magnifierState(state){
 const G=MAGNIFIER,g=imageFor(G.f,state.object),distance=g.finite?(G.eye-g.v)*G.scale:null;
 // At F this angular projection has a finite limit: parallel bundles can be seen by a relaxed eye.
 // Beyond F, a real image behind the fixed eye sends converging light into that eye.
 const eyeMode=g.type==='virtual'?'virtual':g.type==='infinity'?'parallel':g.v>=G.eye?'converging':'real';
 const imageScale=eyeMode==='converging'?null:1/(G.scale*(G.eye+state.object-G.eye*state.object/G.f)),referenceScale=1/((G.eye+state.object)*G.scale);
 return {...g,eyeMode,distance,imageScale,referenceScale,angularGain:imageScale===null?null:imageScale/referenceScale,projectionScale:-state.screen/state.object,spread:Math.abs(G.screenAperture*(1+state.screen/state.object-state.screen/G.f)),blocked:!!state.screenIn,virtualOutside:g.type==='virtual'&&g.v*G.scale< -2.6};
}
export function magnifierRays(state,point='both'){
 const G=MAGNIFIER,paths=[],g=imageFor(G.f,state.object),d=state.screenIn?state.screen:g.type==='real'?Math.min(Math.max(g.v,G.eye),3*G.f):G.eye,den=1+G.eye*(1/state.object-1/G.f);
 for(const [name,oy]of [['top',.44],['bottom',-.4]]){
  if(point!=='both'&&point!==name)continue;
  const heights=state.screenIn||g.type==='real'?[-G.screenAperture,0,G.screenAperture]:[-.025,0,.025].map(p=>(p+G.eye*oy/state.object)/den);
  for(const h of heights){if(Math.abs(h)>G.aperture)continue;paths.push({name,from:[-state.object*G.scale,G.axis+oy,0],lens:[0,G.axis+h,0],end:[d*G.scale,G.axis+rayAt(G.f,state.object,oy,h,d),0],virtual:g.type==='virtual'?[g.v*G.scale,G.axis+g.m*oy,0]:null});}
 }
 return paths;
}
