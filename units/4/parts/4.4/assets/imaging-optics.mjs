import {imageFor,rayAt} from './optics.mjs';
import {CONVEX_BENCH,convexRays} from './convex-bench-model.mjs?v=20261104-convex-unified1';
export const IMAGING=CONVEX_BENCH;
export function moveImaging(state,key,value){
 if(!['object','screen'].includes(key)||!Number.isFinite(value))return state;
 const min=IMAGING[key+'Min'],max=IMAGING[key+'Max'],next={...state,[key]:Math.round(Math.max(min,Math.min(max,value))*10)/10};if(key==='object')delete next.atInfinity;return next;
}
export function imagingState(state){
 const g=state.atInfinity?{finite:true,v:IMAGING.f,m:0,type:'real',upright:false,size:'smaller'}:imageFor(IMAGING.f,state.object),s=state.screen,spread=IMAGING.aperture*Math.abs(1+(state.atInfinity?0:s/state.object)-s/IMAGING.f),clear=g.finite&&g.type==='real'&&Math.abs(s-g.v)<=1.5;
 return {...g,clear,spread,projectionScale:state.atInfinity?0:-s/state.object,unreachable:g.type==='real'&&g.v>IMAGING.screenMax,clipped:((state.atInfinity?0:IMAGING.artExtentY*Math.abs(s/state.object))+spread)>IMAGING.screenHeight/2,sizeLabel:!g.finite?'':g.size==='equal'?'等大':g.size==='larger'?'放大':'縮小'};
}
export function imagingRays(state,point='both'){return convexRays(state,point,state.screen);}

export function imagingKeypointState(id){
 if(id==='infinity')return {object:IMAGING.objectMax,screen:IMAGING.f,atInfinity:true};
 const object={beyond:320,double:200,between:175,focus:100,inside:50}[id];if(!Number.isFinite(object))return null;
 const state={object,screen:IMAGING.f*2},g=imagingState(state);
 return moveImaging(state,'screen',g.type==='virtual'?IMAGING.f*2:g.finite&&!g.unreachable?g.v:IMAGING.screenMax);
}
