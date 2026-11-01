// Horizontal slice of a 6 × 3.6 m room. Sound still propagates in 3D.
export const ROOM = Object.freeze({width:6,height:3.6,c:343,sourceX:1.65,sourceY:1.9,slowdown:80,duration:6});
export const HARD_REFLECTION = .88, SOFT_REFLECTION = .35;
export function wallHits(n) {
 const count=Math.abs(n), first=Math.ceil(count/2), second=Math.floor(count/2);
 return n<0 ? [first,second] : [second,first];
}
export function imagePosition(n,length,source) {return n*length+(Math.abs(n)%2 ? length-source : source);}
export function imageSources(treated=false,maxOrder=6) {
 const result=[];
 for(let nx=-maxOrder;nx<=maxOrder;nx++)for(let ny=-maxOrder;ny<=maxOrder;ny++){
  const order=Math.abs(nx)+Math.abs(ny);if(order>maxOrder)continue;
  const [left,right]=wallHits(nx),[top,bottom]=wallHits(ny),softHits=left+top;
  result.push({nx,ny,order,left,right,top,bottom,softHits,x:imagePosition(nx,ROOM.width,ROOM.sourceX),y:imagePosition(ny,ROOM.height,ROOM.sourceY),gain:Math.pow(HARD_REFLECTION,order-softHits)*Math.pow(treated?SOFT_REFLECTION:HARD_REFLECTION,softHits)});
 }
 return result;
}
export const returnTimes = () => ({left:2*ROOM.sourceX/ROOM.c,right:2*(ROOM.width-ROOM.sourceX)/ROOM.c,top:2*ROOM.sourceY/ROOM.c,bottom:2*(ROOM.height-ROOM.sourceY)/ROOM.c});
export function wavefronts(elapsed,treated=false,kind='clap') {
 const times=kind==='speech'?[0,.7,1.4]:[0],result=[];
 for(const emitted of times){
  const age=(elapsed-emitted)/ROOM.slowdown;if(age<=0)continue;
  const radius=ROOM.c*age;
  for(const s of imageSources(treated,3)){
   const dx=Math.max(0,-s.x,s.x-ROOM.width),dy=Math.max(0,-s.y,s.y-ROOM.height),near=Math.hypot(dx,dy);
   const far=Math.max(...[[0,0],[ROOM.width,0],[0,ROOM.height],[ROOM.width,ROOM.height]].map(([x,y])=>Math.hypot(s.x-x,s.y-y)));
   if(radius<near||radius>far+.22)continue;
   const opacity=Math.min(.92,.94*s.gain**2/Math.sqrt(1+radius*.10)*Math.exp(-age*5));
   if(opacity>.012)result.push({...s,radius,opacity,emitted});
  }
 }
 return result;
}
