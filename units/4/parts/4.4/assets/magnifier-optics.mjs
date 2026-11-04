import {imageFor,rayAt} from './optics.mjs';
import {CONVEX_BENCH,convexRays} from './convex-bench-model.mjs?v=20261104-convex-unified1';
export const MAGNIFIER=Object.freeze({...CONVEX_BENCH,eye:200,eyeMin:CONVEX_BENCH.screenMin,eyeMax:CONVEX_BENCH.screenMax,nearPoint:25,fov:32,screenAperture:CONVEX_BENCH.aperture});
export function moveMagnifier(state,key,value){
 if(!['object','screen','eye'].includes(key)||!Number.isFinite(value))return state;
 return {...state,[key]:Math.round(Math.max(MAGNIFIER[key+'Min'],Math.min(MAGNIFIER[key+'Max'],value))*10)/10};
}
export function magnifierState(state){
 const G=MAGNIFIER,eye=state.eye??G.eye,g=imageFor(G.f,state.object),separation=g.finite?eye-g.v:null;
 const eyeMode=g.type==='virtual'?'virtual':g.type==='infinity'?'parallel':Math.abs(separation)<.05?'at-image':separation<0?'converging':separation<G.nearPoint?'too-close':'real';
 const resolved=['virtual','parallel','real'].includes(eyeMode),imageScale=resolved?1/(G.scale*(eye+state.object-eye*state.object/G.f)):null,referenceScale=1/((eye+state.object)*G.scale);
 const field=Math.min(Math.tan(G.fov*Math.PI/360),G.aperture/(eye*G.scale));
 return {...g,eye,eyeMode,resolved,distance:separation===null?null:separation*G.scale,imageScale,referenceScale,angularGain:imageScale===null?null:Math.abs(imageScale)/referenceScale,clipped:imageScale!==null&&G.artExtentY*Math.abs(imageScale)>field,projectionScale:-state.screen/state.object,spread:Math.abs(G.aperture*(1+state.screen/state.object-state.screen/G.f)),blocked:!!state.screenIn&&state.screen<=eye,virtualOutside:g.type==='virtual'&&g.v*G.scale< -2.6};
}
export function magnifierRays(state,point='both'){
 return convexRays(state,point,state.screenIn?state.screen:MAGNIFIER.screenMax);
}
export function eyeRays(state,point='both'){
 const G=MAGNIFIER,eye=state.eye??G.eye,den=1+eye*(1/state.object-1/G.f),paths=[];
 if(Math.abs(den)<1e-8||magnifierState(state).blocked)return paths;
 for(const [name,y]of [['top',G.pointTop],['bottom',G.pointBottom]]){
  if(point!=='both'&&point!==name)continue;
  const h=eye*y/state.object/den;if(Math.abs(h)>G.aperture)continue;
  paths.push({name,from:[0,G.axis+h,0],to:[eye*G.scale,G.axis+rayAt(G.f,state.object,y,h,eye),0]});
 }
 return paths;
}
