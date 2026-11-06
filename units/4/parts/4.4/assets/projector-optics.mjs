import {imageFor,rayAt} from './optics.mjs';

// Positions, aperture, artwork and screen all use the same model units.
export const PROJECTOR=Object.freeze({f:2.4,screen:12,aperture:.76,axis:2.65,cardMin:.3,cardMax:3.8,lensMin:3.7,lensMax:8,step:.02,minGap:.9,paperWidth:4.8,paperHeight:4.6,artBounds:Object.freeze({left:-.49,right:.49,top:-.67,bottom:.59}),targetBounds:Object.freeze({left:-1.12,right:1.12,top:-1.52,bottom:1.38}),focusTolerance:.055});
export const initialProjector=()=>({card:2.3,lens:5.5,kind:'convex',flipped:false,rays:false});
export function moveProjector(state,key,value){
 if(!['card','lens'].includes(key)||!Number.isFinite(value))return state;
 const min=key==='lens'?Math.max(PROJECTOR.lensMin,state.card+PROJECTOR.minGap):PROJECTOR.cardMin,max=key==='card'?Math.min(PROJECTOR.cardMax,state.lens-PROJECTOR.minGap):PROJECTOR.lensMax;
 return {...state,[key]:Math.min(max,Math.max(min,Math.round(value/PROJECTOR.step)*PROJECTOR.step))};
}
export function projectorState(state){
 const G=PROJECTOR,u=state.lens-state.card,s=G.screen-state.lens,f=state.kind==='convex'?G.f:-G.f,image=imageFor(f,u);
 // A screen intercepts refracted rays, including when they do not form an image.
 // Aperture spread is zero only at a real image plane; it is never a virtual image.
 const spread=G.aperture*Math.abs(1+s/u-s/f),scale=s/u;
 const clear=image.type==='real'&&spread<=G.focusTolerance;
 const upright=image.type==='real'&&!!state.flipped,large=image.type==='real'&&scale>1+1e-6;
 const sign=state.flipped?1:-1,xs=[G.artBounds.left,G.artBounds.right].map(x=>x*scale*sign),ys=[G.artBounds.top,G.artBounds.bottom].map(y=>y*scale*sign),target=G.targetBounds;
 const inTarget=image.type==='real'&&Math.min(...xs)>=target.left&&Math.max(...xs)<=target.right&&Math.min(...ys)>=target.top&&Math.max(...ys)<=target.bottom;
 const checks={clear,large,upright,inTarget};
 return {u,s,f,image,spread,scale,checks,success:Object.values(checks).every(Boolean)};
}
export function projectorRays(state){
 const g=projectorState(state),G=PROJECTOR;
 return [-.45,.45].flatMap(point=>[-G.aperture,0,G.aperture].map(h=>({point,from:[state.card,G.axis+point,0],lens:[state.lens,G.axis+h,0],end:[G.screen,G.axis+rayAt(g.f,g.u,point,h,g.s),0]})));
}
export function projectorHint(state){
 const g=projectorState(state);
 if(state.kind==='concave')return {text:'這片鏡片使光束更發散。試試另一種鏡片，觀察牆上的變化。',href:'#s5',label:'回看凹透鏡'};
 if(g.image.type!=='real')return {text:'圖卡太靠近鏡片，沒有在另一側形成實像。試著拉開兩者的距離。',href:'#s3',label:'回看凸透鏡成像'};
 if(!g.checks.clear)return {text:'清楚像的位置還沒有落在牆上。配合調整圖卡和鏡片，找出最清楚的位置。',href:'#s3',label:'回看凸透鏡成像'};
 if(!g.checks.upright)return {text:'投影已經清楚。再對照屋頂與門窗，想想圖卡應該朝哪個方向。',href:'#s1',label:'回看倒立成像'};
 if(!g.checks.large)return {text:'圖案已清楚，但還沒有放大。讓圖卡更靠近鏡片，再配合鏡片位置重新對焦。',href:'#s3',label:'回看像的大小'};
 if(!g.checks.inTarget)return {text:'方向和清晰度已符合目標。繼續調整圖卡與鏡片，讓圖案大小落入目標框。',href:'#s3',label:'回看像的大小'};
 return {text:'目前已符合目標，可以按「檢查成果」。',href:null,label:null};
}
