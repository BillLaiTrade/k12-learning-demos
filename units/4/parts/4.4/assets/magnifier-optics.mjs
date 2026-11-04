import {imagingState} from './imaging-optics.mjs?v=20261104-convex-unified1';
import {imageFor,rayAt} from './optics.mjs';
import {CONVEX_BENCH,convexRays} from './convex-bench-model.mjs?v=20261104-convex-unified1';
export const MAGNIFIER=Object.freeze({...CONVEX_BENCH,eye:80,pupilRadius:.045,nearPoint:25,fov:40,screenAperture:CONVEX_BENCH.aperture});
export function moveMagnifier(state,key,value){
 if(!['object','screen'].includes(key)||!Number.isFinite(value))return state;
 return {...state,[key]:Math.round(Math.max(MAGNIFIER[key+'Min'],Math.min(MAGNIFIER[key+'Max'],value))*10)/10};
}
export function magnifierState(state){
 const G=MAGNIFIER,eye=G.eye,g=imageFor(G.f,state.object),separation=g.finite?eye-g.v:null;
 const eyeMode=g.type==='virtual'?'virtual':g.type==='infinity'?'parallel':Math.abs(separation)<.05?'at-image':separation<0?'converging':separation<G.nearPoint?'too-close':'real';
 const resolved=['virtual','parallel','real'].includes(eyeMode),previewScale=1/(G.scale*(eye+state.object-eye*state.object/G.f)),imageScale=resolved?previewScale:null,referenceScale=1/((eye+state.object)*G.scale);
 // Signed vergence of one object point's bundle at the fixed eye: positive converges.
 const eyeVergence=g.finite?1/(g.v-eye):0;
 // Illustrative defocus, not a physiological acuity model. It approaches zero at F.
 const blurRadius=eyeMode==='converging'?36*(-Math.expm1(-3*G.f*eyeVergence)):resolved?0:36;
 const field=Math.min(Math.tan(G.fov*Math.PI/360),G.aperture/(eye*G.scale));
 return {...g,screenClear:imagingState(state).clear,eye,eyeMode,resolved,eyeVergence,blurRadius,previewScale,distance:separation===null?null:separation*G.scale,imageScale,referenceScale,angularGain:imageScale===null?null:Math.abs(imageScale)/referenceScale,clipped:imageScale!==null&&G.artExtentY*Math.abs(imageScale)>field,projectionScale:-state.screen/state.object,spread:Math.abs(G.aperture*(1+state.screen/state.object-state.screen/G.f)),blocked:!!state.screenIn&&state.screen<=eye,virtualOutside:g.type==='virtual'&&g.v*G.scale< -2.6};
}
export function magnifierRays(state,point='both'){
 return convexRays(state,point,state.screenIn?state.screen:MAGNIFIER.screenMax);
}
export function eyeRays(state,point='both'){
 const G=MAGNIFIER,eye=G.eye,den=1+eye*(1/state.object-1/G.f),paths=[];
 if(Math.abs(den)<1e-8||magnifierState(state).blocked)return paths;
 for(const [name,y]of [['top',G.pointTop],['bottom',G.pointBottom]]){
  if(point!=='both'&&point!==name)continue;
  for(const pupil of [-G.pupilRadius,0,G.pupilRadius]){
   const h=(pupil+eye*y/state.object)/den;if(Math.abs(h)>G.aperture)continue;
   paths.push({name,from:[0,G.axis+h,0],to:[eye*G.scale,G.axis+rayAt(G.f,state.object,y,h,eye),0]});
  }
 }
 return paths;
}

// Select visible pupil samples without changing the thin-lens path or image position.
export function magnifierDisplayRays(state,point='both'){
 const G=MAGNIFIER,end=state.screenIn?state.screen:330,geometry=convexRays(state,point,end),groups=[];
 for(const name of ['top','bottom']){
  const rays=geometry.filter(r=>r.name===name);if(!rays.length)continue;
  const y=name==='top'?G.pointTop:G.pointBottom,g=magnifierState(state),den=1+end*(1/state.object-1/G.f);
  let low=-G.aperture,high=G.aperture;
  if(g.type!=='infinity'&&Math.abs(den)>1e-6){const bounds=[(.68-G.axis+end*y/state.object)/den,(4.4-G.axis+end*y/state.object)/den].sort((a,b)=>a-b);low=Math.max(low,bounds[0]);high=Math.min(high,bounds[1]);if(high-low<.12){low=-G.aperture;high=G.aperture;}}
  const heights=g.type==='infinity'?rays.map(r=>r.lens[1]-G.axis):[low,(low+high)/2,high];
  for(const h of heights)groups.push({name,from:[-state.object*G.scale,G.axis+y,0],lens:[0,G.axis+h,0],end:[end*G.scale,G.axis+rayAt(G.f,state.object,y,h,end),0],...(g.type==='virtual'?{virtual:[g.v*G.scale,G.axis+g.m*y,0]}:{})});
 }
 return groups;
}
