// Screen-space controls stay independent of the optical scene and camera.
export function createImagingWorkspace(root){
 const stage=root.querySelector('.imaging-stage'),comparison=root.querySelector('[data-imaging-comparison]'),dock=root.querySelector('.imaging-hud-dock');
 let started=false,compact=false;
 const panels=[...root.querySelectorAll('[data-imaging-panel]')].map(element=>({element,key:element.dataset.imagingPanel,body:element.querySelector('.imaging-panel-body'),grip:element.querySelector('[data-imaging-panel-grip]'),toggle:element.querySelector('[data-imaging-panel-collapse]'),moved:false,toggled:false,nx:0,ny:0,collapsed:false,drag:null}));
 const size=()=>({width:stage.clientWidth,height:stage.clientHeight});
 function bounds(panel){const {width,height}=size(),r=panel.element.getBoundingClientRect();return {maxX:Math.max(8,width-r.width-8),maxY:Math.max(8,height-dock.getBoundingClientRect().height-r.height-20)};}
 function defaults(panel){const {width,height}=size(),b=bounds(panel);if(panel.key==='preview')return {x:compact?width-panel.element.offsetWidth-12:width*.39,y:compact&&width<600?54:16};return {x:compact?12:width-panel.element.offsetWidth-16,y:compact?width<600?144:78:Math.min(126,b.maxY)};}
 const clamp=(value,max)=>Math.max(8,Math.min(max,value));
 function place(panel,x,y,remember=false){const b=bounds(panel);x=clamp(x,b.maxX);y=clamp(y,b.maxY);panel.element.style.left=x+'px';panel.element.style.top=y+'px';if(remember){panel.moved=true;panel.nx=b.maxX>8?(x-8)/(b.maxX-8):0;panel.ny=b.maxY>8?(y-8)/(b.maxY-8):0;}}
 function arrange(){for(const p of panels){const b=bounds(p),d=defaults(p);place(p,p.moved?8+p.nx*(b.maxX-8):d.x,p.moved?8+p.ny*(b.maxY-8):d.y);}}
 function collapse(panel,value){panel.collapsed=value;panel.body.hidden=value;panel.element.dataset.collapsed=String(value);panel.toggle.textContent=value?'+':'−';panel.toggle.setAttribute('aria-expanded',String(!value));panel.toggle.setAttribute('aria-label',`${value?'展開':'收合'}${panel.key==='preview'?'屏幕正面':'觀察重點'}`);}
 function layout(){root.style.setProperty('--hud-dock-height',dock.getBoundingClientRect().height+'px');const next=stage.clientWidth<1000,changed=next!==compact;compact=next;root.dataset.compact=String(compact);root.dataset.narrow=String(stage.clientWidth<600);if(changed||!started){comparison.open=!compact;for(const p of panels)if(!p.toggled)collapse(p,p.key==='observations'?compact:stage.clientHeight<580);}arrange();}
 for(const p of panels){
  const activate=()=>{for(const item of panels)item.element.toggleAttribute('data-active-panel',item===p);};p.element.addEventListener('pointerdown',activate,{capture:true});p.element.addEventListener('focusin',activate);
  p.grip.addEventListener('pointerdown',e=>{if(e.button!==0||p.drag)return;e.preventDefault();e.stopPropagation();p.grip.focus({preventScroll:true});p.grip.setPointerCapture(e.pointerId);p.drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:parseFloat(p.element.style.left)||0,top:parseFloat(p.element.style.top)||0};p.element.dataset.dragging='true';});
  p.grip.addEventListener('pointermove',e=>{if(e.pointerId!==p.drag?.id)return;e.preventDefault();place(p,p.drag.left+e.clientX-p.drag.x,p.drag.top+e.clientY-p.drag.y,true);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])p.grip.addEventListener(type,e=>{if(e.pointerId!==p.drag?.id)return;p.drag=null;delete p.element.dataset.dragging;});
  p.grip.addEventListener('keydown',e=>{const step=e.shiftKey?1:10,delta={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[e.key];if(e.key==='Home'){e.preventDefault();p.moved=false;arrange();}else if(delta){e.preventDefault();place(p,parseFloat(p.element.style.left)+delta[0],parseFloat(p.element.style.top)+delta[1],true);}else if(e.key==='Enter'||e.key===' '){e.preventDefault();p.toggled=true;collapse(p,!p.collapsed);arrange();}});
  p.toggle.addEventListener('click',()=>{p.toggled=true;collapse(p,!p.collapsed);arrange();});
  p.element.querySelector('[data-imaging-panel-reset]').addEventListener('click',()=>{p.moved=false;arrange();});
 }
 new ResizeObserver(layout).observe(stage);new ResizeObserver(()=>{root.style.setProperty('--hud-dock-height',dock.getBoundingClientRect().height+'px');arrange();}).observe(dock);for(const p of panels)new ResizeObserver(arrange).observe(p.element);
 layout();root.dataset.hudReady='true';
 return {get compact(){return compact;},start(){started=true;layout();},safeRect(){const {width,height}=size(),bottom=dock.getBoundingClientRect().height+52,top=compact?(width<600?258:210):218;return {left:16,top:Math.min(top,Math.max(80,height-bottom-100)),width:Math.max(100,compact?width-32:width-Math.min(370,width*.27)-52),height:Math.max(80,height-bottom-Math.min(top,Math.max(80,height-bottom-100)))};}};
}
