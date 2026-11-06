// Camera-only interaction. No optical or assessment state is changed here.
export const PROJECTOR_HOME_VIEW=Object.freeze({azimuth:Math.atan2(-21.1,20),polar:Math.atan2(Math.hypot(-21.1,20),5.6),zoom:1,panX:0,panY:0});
export function boundedProjectorView(value){
 const finite=(key)=>Number.isFinite(value[key])?value[key]:PROJECTOR_HOME_VIEW[key],clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 return {azimuth:Math.atan2(Math.sin(finite('azimuth')),Math.cos(finite('azimuth'))),polar:clamp(finite('polar'),.18,1.49),zoom:clamp(finite('zoom'),.65,2.6),panX:finite('panX'),panY:finite('panY')};
}
export function bindProjectorOrbit(canvas,{getSpan,onChange}){
 let view={...PROJECTOR_HOME_VIEW},gesture=null;const pointers=new Map(),listeners=new AbortController();
 const listen=(type,fn,options={})=>canvas.addEventListener(type,fn,{...options,signal:listeners.signal});
 function change(next){view=boundedProjectorView(next);onChange?.();}
 function box(){return canvas.getBoundingClientRect();}
 function snapshot(){const b=box(),s=getSpan();return{view:{...view},box:b,span:s};}
 function begin(){
  const entries=[...pointers.values()];if(!entries.length){gesture=null;canvas.classList.remove('projector-orbiting');return;}
  const start=snapshot();if(entries.length>1){const [a,b]=entries;gesture={...start,kind:'pinch',distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
  else {const p=entries[0];gesture={...start,kind:p.pan?'pan':'orbit',x:p.x,y:p.y};}
  canvas.classList.add('projector-orbiting');
 }
 function cancel(){const ids=[...pointers.keys()];pointers.clear();gesture=null;canvas.classList.remove('projector-orbiting');for(const id of ids)if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}
 function zoomAt(value,x,y){
  const b=box(),s=getSpan();if(!b.width||!b.height)return;const zoom=boundedProjectorView({...view,zoom:value}).zoom,dx=(x-b.left)/b.width*2-1,dy=1-(y-b.top)/b.height*2;
  change({...view,zoom,panX:view.panX+dx*s.width/2*(1/view.zoom-1/zoom),panY:view.panY+dy*s.height/2*(1/view.zoom-1/zoom)});
 }
 listen('pointerdown',e=>{if(e.button!==0&&e.button!==2)return;e.preventDefault();canvas.focus({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,pan:e.button===2||e.shiftKey});canvas.setPointerCapture(e.pointerId);begin();});
 listen('pointermove',e=>{
  if(!pointers.has(e.pointerId)||!gesture)return;e.preventDefault();const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{...old,x:e.clientX,y:e.clientY});const g=gesture;
  if(pointers.size>1){
   const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y),x=(a.x+b.x)/2,y=(a.y+b.y)/2,zoom=boundedProjectorView({...g.view,zoom:g.view.zoom*distance/g.distance}).zoom,ndcX=(g.x-g.box.left)/g.box.width*2-1,ndcY=1-(g.y-g.box.top)/g.box.height*2;
   change({...g.view,zoom,panX:g.view.panX+ndcX*g.span.width/2*(1/g.view.zoom-1/zoom)-(x-g.x)*g.span.width/(g.box.width*zoom),panY:g.view.panY+ndcY*g.span.height/2*(1/g.view.zoom-1/zoom)+(y-g.y)*g.span.height/(g.box.height*zoom)});return;
  }
  const dx=e.clientX-g.x,dy=e.clientY-g.y;
  if(g.kind==='pan')change({...g.view,panX:g.view.panX-dx*g.span.width/(g.box.width*g.view.zoom),panY:g.view.panY+dy*g.span.height/(g.box.height*g.view.zoom)});
  else change({...g.view,azimuth:g.view.azimuth-dx*2*Math.PI/Math.max(600,g.box.width),polar:g.view.polar+dy*.006});
 });
 const stop=e=>{if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);begin();};
 for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(type,stop);
 listen('wheel',e=>{e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?box().height:1);zoomAt(view.zoom*Math.exp(-delta*.0014),e.clientX,e.clientY);},{passive:false});
 listen('contextmenu',e=>e.preventDefault());
 listen('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;const step=.09;
  if(e.key==='Home'){e.preventDefault();reset();return;}
  const turn={ArrowLeft:{azimuth:view.azimuth+step},ArrowRight:{azimuth:view.azimuth-step},ArrowUp:{polar:view.polar-step},ArrowDown:{polar:view.polar+step}}[e.key];
  if(turn){e.preventDefault();change({...view,...turn});return;}
  if(['+','=','-','_'].includes(e.key)){e.preventDefault();const b=box();zoomAt(view.zoom*(['+','='].includes(e.key)?1.15:1/1.15),b.left+b.width/2,b.top+b.height/2);}
 });
 function reset(){cancel();change({...PROJECTOR_HOME_VIEW});}
 return {getState:()=>({...view}),reset,dispose(){cancel();listeners.abort();}};
}
