import {imageFor,rayAt} from './optics.mjs';
const CARD_SCALE=2;
export const IMAGING=Object.freeze({f:100,scale:.014,axis:2,aperture:.55,cardWidth:.7*CARD_SCALE,cardHeight:1.2*CARD_SCALE,pointTop:.44*CARD_SCALE,pointBottom:-.40*CARD_SCALE,artExtentY:.47*CARD_SCALE,screenWidth:1.9,screenHeight:3,objectMin:100,objectMax:350,screenMin:50,screenMax:500});
export function moveImaging(state,key,value){
 if(!['object','screen'].includes(key)||!Number.isFinite(value))return state;
 const min=IMAGING[key+'Min'],max=IMAGING[key+'Max'];return {...state,[key]:Math.round(Math.max(min,Math.min(max,value))*10)/10};
}
export function imagingState(state){
 const g=imageFor(IMAGING.f,state.object),s=state.screen,spread=IMAGING.aperture*Math.abs(1+s/state.object-s/IMAGING.f),clear=g.finite&&g.type==='real'&&Math.abs(s-g.v)<=1.5;
 return {...g,clear,spread,projectionScale:-s/state.object,unreachable:g.finite&&g.v>IMAGING.screenMax,clipped:(IMAGING.artExtentY*Math.abs(s/state.object)+spread)>IMAGING.screenHeight/2,sizeLabel:!g.finite?'':g.size==='equal'?'等大':g.size==='larger'?'放大':'縮小'};
}
export function imagingRays(state,point='both'){
 const {scale,axis,aperture,f}=IMAGING,points=[];
 for(const [name,y]of [['top',IMAGING.pointTop],['bottom',IMAGING.pointBottom]]){
  if(point!=='both'&&point!==name)continue;
  for(const h of [-aperture,0,aperture]){
   const end=rayAt(f,state.object,y,h,state.screen);
   points.push({name,from:[-state.object*scale,axis+y,0],lens:[0,axis+h,0],end:[state.screen*scale,axis+end,0]});
  }
 }
 return points;
}

export function imagingKeypointState(id){
 const object={beyond:320,double:200,between:175,focus:100}[id];if(!Number.isFinite(object))return null;
 const state={object,screen:IMAGING.screenMax},g=imagingState(state);
 return moveImaging(state,'screen',g.finite&&!g.unreachable?g.v:IMAGING.screenMax);
}
