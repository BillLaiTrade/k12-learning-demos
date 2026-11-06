import {imageFor} from './optics.mjs';
import {CONVEX_BENCH,convexRays} from './convex-bench-model.mjs?v=20261104-bench-proportion1';
const cardScale=1.3;
export const CONCAVE=Object.freeze({...CONVEX_BENCH,cardWidth:CONVEX_BENCH.cardWidth*cardScale,cardHeight:CONVEX_BENCH.cardHeight*cardScale,pointTop:CONVEX_BENCH.pointTop*cardScale,pointBottom:CONVEX_BENCH.pointBottom*cardScale,scale:.021,objectMin:30,objectMax:350,eye:80,fov:34,screenMax:120});
export function moveConcave(state,key,value){if(key!=='object'||!Number.isFinite(value))return state;return {...state,object:Math.round(Math.max(CONCAVE.objectMin,Math.min(CONCAVE.objectMax,value))*10)/10};}
export function concaveState(state){
 const G=CONCAVE,g=imageFor(-G.f,state.object),imageScale=g.m/((G.eye-g.v)*G.opticalScale),referenceScale=1/((G.eye+state.object)*G.opticalScale);
 return {...g,eye:G.eye,resolved:true,blocked:false,eyeMode:'virtual',imageScale,referenceScale,angularGain:imageScale/referenceScale,blurRadius:0,screenClear:false,previewScale:imageScale};
}
export function concaveRays(state,point='both'){return convexRays(state,point,250,{...CONCAVE,f:-CONCAVE.f});}
export const concaveObservations=Object.freeze({far:{object:300,eye:CONCAVE.eye,screen:50,screenIn:false},middle:{object:150,eye:CONCAVE.eye,screen:50,screenIn:false},near:{object:50,eye:CONCAVE.eye,screen:50,screenIn:false}});
