// 第六區的實物接觸幾何；場景提示與判定共用輪廓，座標來自器材繪圖。
import {jarMouth,waterSurface,rigPosition} from './collection-task-model.mjs?v=assembly-1';
export const STONE_OFFSETS=[[-48,-12],[0,-22],[48,-10],[-27,17],[27,19]];
const polygon=points=>({kind:'polygon',points});
const ellipse=(x,y,rx,ry)=>({kind:'ellipse',x,y,rx,ry});
export function contains(region,p){
 if(region.kind==='ellipse')return ((p.x-region.x)/region.rx)**2+((p.y-region.y)/region.ry)**2<=1;
 let inside=false;const a=region.points;
 for(let i=0,j=a.length-1;i<a.length;j=i++){
  const [x,y]=a[i],[u,v]=a[j];
  if(Math.abs((p.x-x)*(v-y)-(p.y-y)*(u-x))<1e-7&&p.x>=Math.min(x,u)&&p.x<=Math.max(x,u)&&p.y>=Math.min(y,v)&&p.y<=Math.max(y,v))return true;
  if((y>p.y)!==(v>p.y)&&p.x<(u-x)*(p.y-y)/(v-y)+x)inside=!inside;
 }
 return inside;
}
export function regionPath(r){if(r.outline)return regionPath(r.outline);return r.kind==='ellipse'?`M${r.x-r.rx} ${r.y}a${r.rx} ${r.ry} 0 1 0 ${2*r.rx} 0a${r.rx} ${r.ry} 0 1 0 ${-2*r.rx} 0`:r.points.map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join('')+'Z';}
// 開口輪廓向外延伸一小段操作空間，避免要求手指壓在一條細線上。
const opening=(x,y,rx,depth=32,down=false)=>({...polygon([[x-rx,y],[x-rx*.9,y+(down?depth:-depth)],[x+rx*.9,y+(down?depth:-depth)],[x+rx,y],[x+rx*.8,y+8],[x-rx*.8,y+8]]),outline:ellipse(x,y,rx,rx<20?5:10)});
export function contactRegions(s){
 const m=jarMouth(s),sy=waterSurface(s),rig=rigPosition(s);
 return {
  flask:opening(300,205,47),
  funnel:opening(274,65,30),
  stopper:opening(rig.x-26,rig.y-7,15,34),
  jar:opening(m.x,m.y,69,34,s.jarAngle>90),
  jarSeal:ellipse(m.x,m.y,70,23),
  // 上緣平行四邊形：整個槽口皆可倒水，而不是右下角的單點。
  tank:{...polygon([[597,377],[597,332],[655,291],[1050,311],[1050,356],[1010,397]]),outline:polygon([[597,377],[655,336],[1050,356],[1010,397]])},
  tankWater:polygon([[605,sy+8],[655,sy-30],[1045,sy-10],[1038,517],[1006,540],[610,519]]),
  tankAir:polygon([[605,280],[1045,280],[1045,sy-24],[655,sy-44],[605,sy-6]]),
  // 瓶身下緣先到槽口，才能進行倒置入水；不以瓶身中心撞槽壁判定。
  immerse:polygon([[675,310],[1030,330],[1000,401],[640,380]]),
  extract:opening(870,336,100,150),
  bowl:ellipse(520,560,100,48),
  stones:STONE_OFFSETS.map(([x,y])=>ellipse(520+x,560+y,25,21))
 };
}
export function looseFunnelPose(tip,angle=0){
 const a=angle*Math.PI/180;
 return{x:tip.x+26*Math.cos(a)+350*Math.sin(a),y:tip.y+26*Math.sin(a)-350*Math.cos(a),angle};
}
