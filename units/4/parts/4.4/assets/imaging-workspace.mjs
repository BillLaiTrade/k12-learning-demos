// Screen-space controls stay independent of the optical scene and camera.
export function createImagingWorkspace(root){
 const stage=root.querySelector('.imaging-stage'),dock=root.querySelector('.imaging-hud-dock'),panel=root.querySelector('[data-imaging-panel=preview]'),grip=panel.querySelector('[data-imaging-panel-grip]');
 let moved=false,nx=0,ny=0,drag=null;
 const size=()=>({width:stage.clientWidth,height:stage.clientHeight});
 const bounds=()=>{const {width,height}=size();return {maxX:Math.max(8,width-panel.offsetWidth-8),maxY:Math.max(8,height-panel.offsetHeight-8)};};
 const clamp=(value,max)=>Math.max(8,Math.min(max,value));
 function place(x,y,remember=false){const b=bounds();x=clamp(x,b.maxX);y=clamp(y,b.maxY);panel.style.left=x+'px';panel.style.top=y+'px';if(remember){moved=true;nx=b.maxX>8?(x-8)/(b.maxX-8):0;ny=b.maxY>8?(y-8)/(b.maxY-8):0;}}
 function arrange(){const b=bounds();place(moved?8+nx*(b.maxX-8):b.maxX,moved?8+ny*(b.maxY-8):stage.clientWidth<600?48:12);}
 function layout(){const width=stage.clientWidth;root.dataset.compact=String(width<1000);root.dataset.narrow=String(width<600);root.style.setProperty('--hud-dock-height',dock.offsetHeight+'px');const nav=document.querySelector('.route'),navHeight=innerWidth<=760&&nav?nav.offsetHeight:0;root.style.setProperty('--imaging-window-height',Math.max(280,innerHeight-navHeight-24)+'px');arrange();}
 grip.addEventListener('pointerdown',e=>{if(e.button!==0||drag)return;e.preventDefault();grip.focus({preventScroll:true});grip.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:parseFloat(panel.style.left)||0,top:parseFloat(panel.style.top)||0};panel.dataset.dragging='true';});
 grip.addEventListener('pointermove',e=>{if(e.pointerId!==drag?.id)return;e.preventDefault();place(drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y,true);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])grip.addEventListener(type,e=>{if(e.pointerId!==drag?.id)return;drag=null;delete panel.dataset.dragging;});
 grip.addEventListener('keydown',e=>{const step=e.shiftKey?1:10,delta={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[e.key];if(e.key==='Home'){e.preventDefault();moved=false;arrange();}else if(delta){e.preventDefault();place(parseFloat(panel.style.left)+delta[0],parseFloat(panel.style.top)+delta[1],true);}});
 panel.querySelector('[data-imaging-panel-reset]').addEventListener('click',()=>{moved=false;arrange();});
 new ResizeObserver(layout).observe(stage);new ResizeObserver(layout).observe(dock);new ResizeObserver(arrange).observe(panel);window.addEventListener('resize',layout);
 layout();root.dataset.hudReady='true';
 return {start:layout,safeRect(){const {width,height}=size(),top=width<600?184:180;return {left:12,top:Math.min(top,height*.55),width:Math.max(100,width-24),height:Math.max(80,height-Math.min(top,height*.55)-16)};}};
}
