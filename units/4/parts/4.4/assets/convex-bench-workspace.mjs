import {CONVEX_BENCH as G,BENCH_HOME} from './convex-bench-model.mjs?v=20261104-bench-proportion1';
export function bindBenchRuler({track,handle,key,min,max,reverse,get,move}){
 let drag=null;const marks=[...track.querySelectorAll('[data-distance]')].map(e=>Number(e.dataset.distance)).filter(v=>v>=min&&v<=max);
 track.addEventListener('click',e=>{if(e.target.closest('[role=slider]'))return;const mark=e.target.closest('[data-distance]'),r=track.getBoundingClientRect();if(mark)move(key,Number(mark.dataset.distance));else if(r.width)move(key,(reverse?1-(e.clientX-r.left)/r.width:(e.clientX-r.left)/r.width)*max);});
 handle.addEventListener('pointerdown',e=>{if(e.button!==0||drag||handle.disabled)return;e.preventDefault();handle.focus({preventScroll:true});handle.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,value:get(),width:track.getBoundingClientRect().width};});
 handle.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||!drag.width)return;const value=drag.value+(e.clientX-drag.x)/drag.width*max*(reverse?-1:1),nearest=marks.reduce((a,b)=>Math.abs(b-value)<Math.abs(a-value)?b:a);move(key,Math.abs(nearest-value)/max*drag.width<=3?nearest:value);});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(event,e=>{if(e.pointerId===drag?.id)drag=null;});
 return value=>{handle.style.left=`${(reverse?1-value/max:value/max)*100}%`;handle.setAttribute('aria-valuemin',String(min/G.f));handle.setAttribute('aria-valuemax',String(max/G.f));handle.setAttribute('aria-valuenow',String(Number((value/G.f).toFixed(3))));};
}
export function createBenchLayout(root){
 const stage=root.querySelector('.convex-stage'),panel=root.querySelector('.convex-panel'),viewport=root.querySelector('[data-imaging-viewport]')||stage;
 function layout(){const width=stage.clientWidth,nav=document.querySelector('.route'),navHeight=innerWidth<=760&&nav?nav.offsetHeight:0;root.dataset.narrow=String(width<600);root.dataset.compact=String(width<1000);root.style.setProperty('--bench-window-height',Math.max(280,innerHeight-navHeight-24)+'px');root.style.setProperty('--bench-dock-height',(width<600?290:158)+'px');root.style.setProperty('--eye-art-width',Math.max(40,Math.min(panel.clientWidth-16,(stage.clientHeight-(root.hasAttribute('data-magnifier-lab')?180:148))/2))+'px');root.style.setProperty('--preview-paper-width',Math.min(panel.clientWidth-16,Math.max(38,(stage.clientHeight-115)*380/600))+'px');}
 new ResizeObserver(layout).observe(stage);window.addEventListener('resize',layout);layout();
 return {layout,safeRect(){
  const tools=root.querySelector('.convex-tools'),top=tools.offsetTop+tools.offsetHeight+10;
  return {left:12,top,width:Math.max(60,viewport.clientWidth-24),height:Math.max(60,viewport.clientHeight-top-12)};
 }};
}
export function fitBench(THREE,camera,target){
 camera.fov=39;camera.updateProjectionMatrix();target.set(-.625*G.f*G.scale,1.7,0);
 const bounds=[];
 // Frame the working apparatus; distant rail ends need not shrink the F/2F region.
 for(const x of [-3.6*G.f*G.scale,0])for(const y of [.25,2.7])for(const z of [-.45,.45])bounds.push(new THREE.Vector3(x,y,z));
 for(const y of [.25,3.15])for(const z of [-1,1])bounds.push(new THREE.Vector3(0,y,z));
 for(const y of [-.05,3.6])for(const z of [-1,1])bounds.push(new THREE.Vector3(2.35*G.f*G.scale,y,z));
 const h=BENCH_HOME,home=new THREE.Vector3(Math.sin(h.polar)*Math.sin(h.azimuth),Math.cos(h.polar),Math.sin(h.polar)*Math.cos(h.azimuth));let radius=6;
 for(let i=0;i<90;i++){camera.position.copy(target).addScaledVector(home,radius);camera.lookAt(target);camera.updateMatrixWorld();if(bounds.every(p=>{const q=p.clone().project(camera);return Math.abs(q.x)<1.0&&q.y>-.94&&q.y<.88;}))break;radius*=1.06;}
 return radius;
}
