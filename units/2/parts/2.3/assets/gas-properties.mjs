import {PROPERTY_DURATIONS,splintPropertyFrame,limewaterPropertyFrame} from './gas-properties-model.mjs?v=stacked-1';
import {createSplintScene,createLimewaterScene} from './gas-properties-scene.mjs?v=natural-1';
const section=document.querySelector('.gas-properties-lesson'),players=[];
const definitions={splints:{name:'木條比較',frame:splintPropertyFrame,scene:createSplintScene},limewater:{name:'石灰水檢驗',frame:limewaterPropertyFrame,scene:createLimewaterScene}};
for(const root of section.querySelectorAll('[data-property-experiment]')){
 const key=root.dataset.propertyExperiment,definition=definitions[key],svg=root.querySelector('.property-scene'),scene=definition.scene(svg),button=root.querySelector('[data-property-play]'),note=root.querySelector('[data-property-status]');
 let state='ready',elapsed=0,started=0,raf=0,lastMessage='';
 function paint(){const f=definition.frame(elapsed);root.dataset.state=state;root.dataset.elapsed=elapsed.toFixed(3);root.dataset.phase=f.phase;scene.render(f);const action=state==='playing'?'暫停':state==='paused'?'繼續':state==='complete'?'重播':'播放';button.innerHTML=`<span aria-hidden="true">${state==='playing'?'Ⅱ':state==='complete'?'↻':'▶'}</span> ${action}`;button.classList.toggle('is-playing',state==='playing');button.setAttribute('aria-label',action+definition.name);if(lastMessage!==f.message){note.textContent=f.message;lastMessage=f.message;}if(key==='limewater')root.querySelector('[data-lime-label]').textContent=f.cloud>.95?'石灰水變混濁':f.cloud>.05?'石灰水逐漸變混濁':'澄清石灰水';}
 function cancel(){cancelAnimationFrame(raf);raf=0;}
 function pause(){if(state!=='playing')return;elapsed=Math.min(PROPERTY_DURATIONS[key],performance.now()-started);cancel();state='paused';paint();}
 function tick(now){if(state!=='playing')return;elapsed=Math.min(PROPERTY_DURATIONS[key],now-started);if(elapsed>=PROPERTY_DURATIONS[key])state='complete';paint();if(state==='playing')raf=requestAnimationFrame(tick);}
 function toggle(){if(state==='playing'){pause();return;}const next=state==='paused'?elapsed:0;players.forEach(p=>p.pause());document.dispatchEvent(new CustomEvent('air-experiment-play',{detail:'properties'}));elapsed=next;state='playing';started=performance.now()-elapsed;paint();raf=requestAnimationFrame(tick);}
 button.addEventListener('click',toggle);
 // Treat a tap separately from text selection, dragging and native touch scrolling.
 let pointer=null;const surface=root.querySelector('.property-figure');
 surface.addEventListener('pointerdown',e=>{if(e.button===0)pointer={id:e.pointerId,x:e.clientX,y:e.clientY,selected:!!getSelection()?.toString()};});
 surface.addEventListener('pointercancel',()=>pointer=null);
 surface.addEventListener('click',e=>{const start=pointer;pointer=null;if(e.target.closest('button,a,input,select,textarea')||!start||start.selected||getSelection()?.toString()||Math.hypot(e.clientX-start.x,e.clientY-start.y)>9)return;if(state==='playing'||state==='paused')toggle();});
 root.addEventListener('keydown',e=>{if(e.key==='Escape')pause();});
 if('IntersectionObserver'in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pause();}).observe(root);
 const narrow=matchMedia('(max-width:700px)'),resize=()=>scene.resize(narrow.matches);resize();narrow.addEventListener('change',resize);
 const api={pause};players.push(api);paint();button.disabled=false;root.dataset.ready='true';
}
for(const name of['visibilitychange','pagehide']){const target=name==='pagehide'?window:document;target.addEventListener(name,()=>{if(name==='pagehide'||document.hidden)players.forEach(p=>p.pause());});}
document.addEventListener('air-experiment-play',e=>{if(e.detail!=='properties')players.forEach(p=>p.pause());});
section.dataset.renderer='stacked-properties';
