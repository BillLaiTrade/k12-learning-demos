import {geometry,snapshot,durationMs,clampAngle} from './single-refraction-model.mjs?v=20261103-fit2';
import {mediumSelector} from './medium-selector.mjs?v=20261103-concept1';
import {mountScene} from './integrated-refraction-scene.mjs?v=20261103-fit2';
function mountSingleLab(prefix,reverse){
 const root=document.querySelector(`#${prefix}-lab`),$=s=>root.querySelector(s),scene=$(`#${prefix}-scene`),stage=$('.integrated-stage'),input=$(`#${prefix}-angle`),start=$(`#${prefix}-start`),reset=$(`#${prefix}-reset`),retry=$(`#${prefix}-retry`),status=$(`#${prefix}-status`);
 const view=mountScene(scene,prefix),source=view.source,photos=new Map(),model=()=>geometry(medium,angle,reverse),duration=()=>durationMs(medium,angle,reverse);
 let medium='water',requested='water',angle=30,elapsed=0,state='loading',frame=0,startTime=0,loadId=0,restoreLight=false,drag=null,intersecting=true,lastSize='';
 const selector=mediumSelector($(`#${prefix}-medium-toggle`),key=>{if(key!==requested||state==='error')prepare(key);});
 root.dataset.mediumOrder=reverse?'slow-fast':'fast-slow';root.style.setProperty('--beam-glow',`url(#${prefix}-glow)`);root.style.setProperty('--single-lit-lens',`url(#${prefix}-lit-lens)`);
 const name=()=>medium==='water'?'水':'玻璃';
 const picture=key=>{if(!photos.has(key)){const img=new Image();img.src=new URL(`oblique-entry-${key}.png`,import.meta.url).href;photos.set(key,img);}return photos.get(key);};
 function configure(){
  const g=model();input.value=angle;$(`#${prefix}-angle-value`).value=`${angle}°`;$(`#${prefix}-in-value`).value=`${angle}°`;$(`#${prefix}-out-value`).value=`${g.outgoing.toFixed(1)}°`;
  root.dataset.angle=angle;root.dataset.medium=medium;root.dataset.kind=g.kind;root.dataset.outgoing=g.outgoing;root.dataset.entryMs=g.entryMs;root.dataset.durationMs=g.arrivalMs;
  $('[data-finding-title]').textContent=angle===0?'方向不偏折':reverse?'偏離法線':'偏向法線';$('[data-speed-result]').textContent=reverse?'光速由慢變快':'光速由快變慢';$('[data-comparison]').textContent=angle===0?'=':reverse?'>':'<';$('[data-finding-reason]').textContent=angle===0?'速度改變，方向不變。':reverse?'折射角變大，更遠離法線。':'折射角變小，更靠近法線。';$('[data-reference-note]').hidden=angle===0;
  view.configure(g,picture(medium).src);scene.setAttribute('aria-label',`${reverse?name():'空氣'}在上方，${reverse?'空氣':name()}在下方。入射角${angle}度，折射角${g.outgoing.toFixed(1)}度。${angle===0?'方向不偏折':reverse?'光速由慢變快，偏離法線':'光速由快變慢，偏向法線'}。點擊光源發射，拖曳或方向鍵調角。`);
 }
 function render(){
  const current=snapshot(medium,angle,elapsed,reverse),explained=elapsed>0&&current.arrived;root.dataset.elapsedMs=elapsed;root.dataset.entered=current.entered;root.dataset.arrived=current.arrived;root.dataset.explained=explained;
  $(`#${prefix}-finding`).hidden=!explained;$('.integrated-legend').hidden=!explained;view.draw({...current,elapsed},explained);
 }
 function controls(){
  root.dataset.state=state;root.dataset.playback=state;status.classList.toggle('visually-hidden',state!=='error');root.setAttribute('aria-busy',String(state==='loading'));const disabled=state==='loading'||state==='error';start.disabled=input.disabled=reset.disabled=disabled;source.setAttribute('aria-disabled',disabled);source.setAttribute('tabindex',disabled?'-1':'0');selector.render(requested);
  start.querySelector('span:last-child').textContent=state==='complete'||state==='preview'?'再次發射':state==='running'?'重新發射':'發射光束';status.textContent={loading:'正在準備實驗場景……',error:`${requested==='water'?'水':'玻璃'}場景未能載入，請重試或切換介質。`,idle:'調整入射角，再點燈發射；角度與說明會直接出現在光路上。',running:'光束正在前進。',suspended:'回到實驗畫面後會繼續發射。',preview:'光路與角度已更新，可直接比較或再次發射。',complete:'光路已展開，角度與說明顯示在同一場景內。'}[state];
 }
 function stop(){cancelAnimationFrame(frame);frame=0;}
 function tick(now){if(state!=='running')return;elapsed=Math.min(duration(),Math.max(0,now-startTime));render();if(elapsed>=duration()){state='complete';frame=0;controls();}else frame=requestAnimationFrame(tick);}
 function play(restart=true){if(state==='loading'||state==='error')return;stop();if(restart)elapsed=0;state='running';startTime=performance.now()-elapsed;render();controls();frame=requestAnimationFrame(tick);}
 function suspend(){if(state!=='running')return;stop();elapsed=Math.min(duration(),Math.max(0,performance.now()-startTime));state=elapsed>=duration()?'complete':'suspended';render();controls();}
 function resume(){if(state==='suspended'&&intersecting&&!document.hidden)play(false);}
 function setAngle(value){if(input.disabled)return;const next=Math.round(Math.min(40,clampAngle(value)));input.value=next;if(next===angle)return;stop();angle=next;if(state==='idle')elapsed=0;else{state='preview';elapsed=duration();}configure();render();controls();}
 input.oninput=()=>setAngle(Number(input.value));start.onclick=()=>play(true);reset.onclick=()=>{if(input.disabled)return;stop();angle=30;elapsed=0;state='idle';configure();render();controls();};
 function point(event){const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(scene.getScreenCTM().inverse()),origin=view.project([650,570]),scale=view.project([651,570])[0]-origin[0];return[650+(p.x-origin[0])/scale,570+(p.y-origin[1])/scale];}
 scene.onpointerdown=e=>{if(!e.target.closest('.oblique-source')||input.disabled||e.button!==0)return;e.preventDefault();const p=point(e),g=model();drag={id:e.pointerId,offsetX:p[0]-g.source[0],offsetY:p[1]-g.source[1],x:e.clientX,y:e.clientY,moved:false};scene.setPointerCapture(e.pointerId);source.focus({preventScroll:true});};
 scene.addEventListener('touchstart',e=>{if(!input.disabled&&e.target.closest('.oblique-source'))e.preventDefault();},{passive:false});
 scene.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<=5)return;drag.moved=true;const p=point(e);setAngle(Math.atan2(Math.max(0,650-p[0]+drag.offsetX),Math.max(0,570-p[1]+drag.offsetY))*180/Math.PI);};
 scene.onpointerup=e=>{const released=drag;drag=null;if(released&&released.id===e.pointerId&&!released.moved)play(true);};scene.onpointercancel=scene.onlostpointercapture=()=>{drag=null;};scene.onclick=e=>{if(e.target.closest('.oblique-source')&&e.detail===0&&!input.disabled)play(true);};
 scene.onkeydown=e=>{if(!e.target.closest('.oblique-source')||input.disabled)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!e.repeat)play(true);return;}const step={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1}[e.key];if(step!==undefined||e.key==='Home'||e.key==='End'){e.preventDefault();setAngle(e.key==='Home'?0:e.key==='End'?40:angle+step);}};
 document.addEventListener('visibilitychange',()=>{if(document.hidden){suspend();drag=null;}else resume();});if('IntersectionObserver'in window)new IntersectionObserver(entries=>{intersecting=entries[0].isIntersecting;if(!intersecting){suspend();drag=null;}else resume();},{threshold:0}).observe(stage);
 async function prepare(target,reload=false){
  const id=++loadId;restoreLight=state==='loading'?restoreLight:elapsed>0||state==='running';requested=target;stop();drag=null;elapsed=0;state='loading';render();controls();retry.hidden=true;
  try{if(reload){const img=new Image();img.src=new URL(`oblique-entry-${target}.png?retry=${Date.now()}`,import.meta.url).href;photos.set(target,img);}const img=picture(target);await img.decode();if(id!==loadId)return;medium=target;elapsed=restoreLight?duration():0;state=restoreLight?'preview':'idle';configure();render();controls();}catch{if(id!==loadId)return;state='error';controls();retry.hidden=false;}
 }
 function fitViewport(){
  const width=stage.getBoundingClientRect().width,mode=getComputedStyle(root).getPropertyValue('--scene-mode').trim();root.dataset.layout=mode;
  const route=document.querySelector('.route'),routeHeight=innerWidth<=760?route.getBoundingClientRect().height:0,controlHeight=$('.integrated-controls').getBoundingClientRect().height,viewportHeight=Math.min(innerHeight,window.visualViewport?.height||innerHeight);
  document.documentElement.style.setProperty('--optics-scroll-inset',`${routeHeight+8}px`);
  const height=Math.min(width*(mode==='tall'?1400/900:820/1200),Math.max(160,viewportHeight-routeHeight-controlHeight-16)),key=`${width}/${height}/${mode}`;
  if(key===lastSize)return;lastSize=key;stage.style.height=`${height}px`;configure();render();
 }
 retry.onclick=()=>prepare(requested,true);const resize=new ResizeObserver(fitViewport);resize.observe(stage);resize.observe($('.integrated-controls'));resize.observe(document.querySelector('.route'));window.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('resize',fitViewport);controls();fitViewport();prepare('water');
}
mountSingleLab('oblique',false);mountSingleLab('exit',true);
