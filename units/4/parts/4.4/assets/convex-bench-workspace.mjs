import {CONVEX_BENCH as G,BENCH_HOME} from './convex-bench-model.mjs?v=20261104-convex-unified1';
export function bindBenchRuler({track,handle,key,min,max,reverse,get,move}){
 let drag=null;const marks=[...track.querySelectorAll('[data-distance]')].map(e=>Number(e.dataset.distance)).filter(v=>v>=min&&v<=max);
 track.addEventListener('click',e=>{if(e.target.closest('[role=slider]'))return;const mark=e.target.closest('[data-distance]'),r=track.getBoundingClientRect();if(mark)move(key,Number(mark.dataset.distance));else if(r.width)move(key,(reverse?1-(e.clientX-r.left)/r.width:(e.clientX-r.left)/r.width)*max);});
 handle.addEventListener('pointerdown',e=>{if(e.button!==0||drag||handle.disabled)return;e.preventDefault();handle.focus({preventScroll:true});handle.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,value:get(),width:track.getBoundingClientRect().width};});
 handle.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||!drag.width)return;const value=drag.value+(e.clientX-drag.x)/drag.width*max*(reverse?-1:1),nearest=marks.reduce((a,b)=>Math.abs(b-value)<Math.abs(a-value)?b:a);move(key,Math.abs(nearest-value)/max*drag.width<=3?nearest:value);});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(event,e=>{if(e.pointerId===drag?.id)drag=null;});
 return value=>{handle.style.left=`${(reverse?1-value/max:value/max)*100}%`;handle.setAttribute('aria-valuemin',String(min/G.f));handle.setAttribute('aria-valuemax',String(max/G.f));handle.setAttribute('aria-valuenow',String(Number((value/G.f).toFixed(3))));};
}
export function createBenchLayout(root){
 const stage=root.querySelector('.convex-stage'),panel=root.querySelector('.convex-panel');
 function layout(){const width=stage.clientWidth,nav=document.querySelector('.route'),navHeight=innerWidth<=760&&nav?nav.offsetHeight:0;root.dataset.narrow=String(width<600);root.dataset.compact=String(width<1000);root.style.setProperty('--bench-window-height',Math.max(280,innerHeight-navHeight-24)+'px');root.style.setProperty('--bench-dock-height',(width<600?290:158)+'px');root.style.setProperty('--eye-art-width',Math.max(40,Math.min(panel.clientWidth-16,(stage.clientHeight-148)/2))+'px');root.style.setProperty('--preview-paper-width',Math.min(panel.clientWidth-16,Math.max(38,(stage.clientHeight-115)*380/600))+'px');}
 new ResizeObserver(layout).observe(stage);window.addEventListener('resize',layout);layout();
 return {layout,safeRect(){
  // Reserve identical tool space in both experiments, including the optional screen comparison.
  const tools=document.createElement('div');tools.className='convex-tools';tools.style.visibility='hidden';tools.setAttribute('aria-hidden','true');
  for(const label of ['隱藏輔助光路','顯示反向延長線','放入屏幕','返回整體觀察']){const b=document.createElement('button');b.textContent=label;tools.append(b);}
  const trace=document.createElement('div');trace.className='convex-trace';for(const label of ['一起看','上端','下端']){const b=document.createElement('button');b.textContent=label;trace.append(b);}tools.append(trace);stage.append(tools);const top=tools.offsetTop+tools.offsetHeight+10;tools.remove();
  return {left:12,top,width:Math.max(60,stage.clientWidth-panel.offsetWidth-40),height:Math.max(60,stage.clientHeight-top-12)};
 }};
}
export function fitBench(THREE,camera,target){
 camera.fov=39;camera.updateProjectionMatrix();target.set(-.1*G.f*G.scale,1.7,0);
 const bounds=[];for(const x of [-3.6*G.f*G.scale,3.4*G.f*G.scale])for(const y of [-.25,3.6])for(const z of [-1,1])bounds.push(new THREE.Vector3(x,y,z));
 const h=BENCH_HOME,home=new THREE.Vector3(Math.sin(h.polar)*Math.sin(h.azimuth),Math.cos(h.polar),Math.sin(h.polar)*Math.cos(h.azimuth));let radius=6;
 for(let i=0;i<90;i++){camera.position.copy(target).addScaledVector(home,radius);camera.lookAt(target);camera.updateMatrixWorld();if(bounds.every(p=>{const q=p.clone().project(camera);return Math.abs(q.x)<.92&&q.y>-.94&&q.y<.88;}))break;radius*=1.06;}
 return radius;
}
