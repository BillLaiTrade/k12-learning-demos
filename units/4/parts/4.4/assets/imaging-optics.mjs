import {imageFor,rayAt} from './optics.mjs';
const CARD_SCALE=2;
export const IMAGING=Object.freeze({f:100,scale:.014,axis:2,aperture:.55,cardWidth:.7*CARD_SCALE,cardHeight:1.2*CARD_SCALE,pointTop:.44*CARD_SCALE,pointBottom:-.40*CARD_SCALE,artExtentY:.47*CARD_SCALE,screenWidth:1.9,screenHeight:3,objectMin:50,objectMax:350,screenMin:50,screenMax:500});
export function moveImaging(state,key,value){
 if(!['object','screen'].includes(key)||!Number.isFinite(value))return state;
 const min=IMAGING[key+'Min'],max=IMAGING[key+'Max'],next={...state,[key]:Math.round(Math.max(min,Math.min(max,value))*10)/10};if(key==='object')delete next.atInfinity;return next;
}
export function imagingState(state){
 const g=state.atInfinity?{finite:true,v:IMAGING.f,m:0,type:'real',upright:false,size:'smaller'}:imageFor(IMAGING.f,state.object),s=state.screen,spread=IMAGING.aperture*Math.abs(1+(state.atInfinity?0:s/state.object)-s/IMAGING.f),clear=g.finite&&g.type==='real'&&Math.abs(s-g.v)<=1.5;
 return {...g,clear,spread,projectionScale:state.atInfinity?0:-s/state.object,unreachable:g.type==='real'&&g.v>IMAGING.screenMax,clipped:((state.atInfinity?0:IMAGING.artExtentY*Math.abs(s/state.object))+spread)>IMAGING.screenHeight/2,sizeLabel:!g.finite?'':g.size==='equal'?'等大':g.size==='larger'?'放大':'縮小'};
}
export function imagingRays(state,point='both'){
 const {scale,axis,aperture,f}=IMAGING,points=[];
 if(state.atInfinity)return [-aperture,0,aperture].map(h=>({name:'top',from:[-4.9,axis+h,0],lens:[0,axis+h,0],end:[state.screen*scale,axis+h*(1-state.screen/f),0]}));
 const g=imagingState(state);
 for(const [name,y]of [['top',IMAGING.pointTop],['bottom',IMAGING.pointBottom]]){
  if(point!=='both'&&point!==name)continue;
  for(const h of [-aperture,0,aperture]){
   const end=rayAt(f,state.object,y,h,state.screen);
   points.push({name,from:[-state.object*scale,axis+y,0],lens:[0,axis+h,0],end:[state.screen*scale,axis+end,0],...(g.type==='virtual'?{virtual:[g.v*scale,axis+g.m*y,0]}:{})});
  }
 }
 return points;
}

export function imagingKeypointState(id){
 if(id==='infinity')return {object:IMAGING.objectMax,screen:IMAGING.f,atInfinity:true};
 const object={beyond:320,double:200,between:175,focus:100,inside:50}[id];if(!Number.isFinite(object))return null;
 const state={object,screen:IMAGING.screenMax},g=imagingState(state);
 return moveImaging(state,'screen',g.type==='virtual'?IMAGING.f*2:g.finite&&!g.unreachable?g.v:IMAGING.screenMax);
}
