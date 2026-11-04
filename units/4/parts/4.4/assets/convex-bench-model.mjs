import {imageFor,rayAt} from './optics.mjs';

// Shared optical model; axial drawing scale can be stretched without changing observer optics.
export const CONVEX_BENCH=Object.freeze({f:100,scale:.026,opticalScale:.021,axis:2,aperture:.82,cardWidth:.7,cardHeight:1.2,pointTop:.44,pointBottom:-.4,artExtentY:.47,screenWidth:1.9,screenHeight:3,objectMin:30,objectMax:350,screenMin:50,screenMax:500});
export const BENCH_HOME=Object.freeze({azimuth:-.09,polar:1.43,zoom:1});
export const distanceLabel=value=>{const n=Number((value/CONVEX_BENCH.f).toFixed(3));return n===1?'F':`${n}F`;};

export function convexRays(state,point='both',end=CONVEX_BENCH.screenMax,G=CONVEX_BENCH){
 if(state.atInfinity)return [-G.aperture,0,G.aperture].map(h=>({name:'top',from:[-G.objectMax*G.scale,G.axis+h,0],lens:[0,G.axis+h,0],end:[end*G.scale,G.axis+h*(1-end/G.f),0]}));
 const g=imageFor(G.f,state.object),paths=[];
 for(const [name,y]of [['top',G.pointTop],['bottom',G.pointBottom]]){
  if(point!=='both'&&point!==name)continue;
  // Separate each point's parallel bundle visibly at F, rather than choosing a tiny pupil bundle.
  const heights=g.type==='infinity'?(name==='top'?[0,G.aperture/2,G.aperture]:[-G.aperture,-G.aperture/2,0]):[-G.aperture,0,G.aperture];
  for(const h of heights)paths.push({name,from:[-state.object*G.scale,G.axis+y,0],lens:[0,G.axis+h,0],end:[end*G.scale,G.axis+rayAt(G.f,state.object,y,h,end),0],...(g.type==='virtual'?{virtual:[g.v*G.scale,G.axis+g.m*y,0]}:{})});
 }
 return paths;
}

export function createBenchArt(){
 const art=document.createElement('canvas');art.width=350;art.height=600;const a=art.getContext('2d');
 a.fillStyle='#dd684f';a.beginPath();a.moveTo(175,80);a.lineTo(133,170);a.lineTo(217,170);a.closePath();a.fill();a.strokeStyle='#688d65';a.lineWidth=13;a.lineCap='round';a.beginPath();a.moveTo(175,190);a.lineTo(175,442);a.stroke();a.fillStyle='#438dbb';a.beginPath();a.arc(175,500,35,0,Math.PI*2);a.fill();return art;
}
