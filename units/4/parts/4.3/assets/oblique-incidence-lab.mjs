import {geometry as modelGeometry,snapshot as modelSnapshot,durationMs as modelDuration,layout,clampAngle as modelClamp} from './single-refraction-model.mjs?v=20261103-inline1';
import {drawDirections} from './light-beam.mjs?v=20261103-inline1';
import {mediumSelector} from './medium-selector.mjs?v=20261103-concept1';
import {mountAnalysis} from './linked-refraction-analysis.mjs?v=20261103-inline1';
function mountSingleLab(rootSelector,prefix,reverse){
 const root=document.querySelector(rootSelector),$=s=>root.querySelector(s.replaceAll('#oblique-',`#${prefix}-`));
 const scene=$('#oblique-scene'),picture=$('#oblique-background'),viewport=$('#oblique-viewport'),input=$('#oblique-angle'),output=$('#oblique-angle-value'),start=$('#oblique-start'),pause=$('#oblique-pause'),retry=$('#oblique-retry'),status=$('#oblique-status');
 const geometry=(m,a)=>modelGeometry(m,a,reverse),snapshot=(m,a,t)=>modelSnapshot(m,a,t,reverse),durationMs=(m,a)=>modelDuration(m,a,reverse),clampAngle=v=>Math.round(modelClamp(v));
 let medium='water',requestedMedium='water',angle=30,elapsed=0,state='loading',frame=0,startTime=0,drag=null,loadId=0,restoreLight=false;
 const name=()=>medium==='water'?'水':'玻璃',clickSlop=5,selector=mediumSelector($('#oblique-medium-toggle'),key=>{if(key!==requestedMedium||state==='error')prepare(key);});
const label=(id,x,y,text,width=110)=>`<g id="${id}" class="oblique-medium-badge" transform="translate(${x} ${y})"><rect x="0" y="-35" width="${width}" height="52" rx="9" fill="#fffef4" fill-opacity=".96"/><text x="${width/2}" y="0" text-anchor="middle" font-size="30">${text}</text></g>`;
const beam=()=>'<g class="oblique-beam" visibility="hidden"><path class="oblique-halo lesson-beam-halo"/><path class="oblique-ray lesson-beam-ray"/><path class="oblique-core lesson-beam-core"/><path class="oblique-direction lesson-beam-direction"/><path class="oblique-direction lesson-beam-direction"/></g>';
scene.setAttribute('viewBox',`0 0 ${layout.width} ${layout.height}`);
scene.innerHTML=`<defs>
 <filter id="oblique-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>
 <filter id="oblique-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="2" dy="6" stdDeviation="4" flood-color="#332b20" flood-opacity=".4"/></filter>
 <linearGradient id="oblique-metal" x1="0" x2="1"><stop stop-color="#10191b"/><stop offset=".18" stop-color="#6d7777"/><stop offset=".4" stop-color="#263033"/><stop offset=".78" stop-color="#101719"/><stop offset="1" stop-color="#414b4c"/></linearGradient>
 <linearGradient id="oblique-rim" x1="0" x2="1"><stop stop-color="#555d5b"/><stop offset=".3" stop-color="#d5d9d1"/><stop offset=".55" stop-color="#545e5b"/><stop offset="1" stop-color="#111c1b"/></linearGradient>
 <radialGradient id="oblique-dark-lens"><stop stop-color="#668480"/><stop offset=".5" stop-color="#243c3c"/><stop offset="1" stop-color="#0c181a"/></radialGradient>
 <radialGradient id="oblique-lit-lens"><stop stop-color="#fffbe1"/><stop offset=".45" stop-color="#ffde78"/><stop offset="1" stop-color="#926b26"/></radialGradient>
 </defs>

 <g class="oblique-overview-geometry">
  <g id="oblique-case-label"><rect x="-180" y="-44" width="360" height="64" rx="10" fill="#fffdf2" stroke="#c9c9af" stroke-width="2"/><text id="oblique-case-name" x="0" y="0" text-anchor="middle" font-size="42">空氣 → 水</text></g>
  <path class="oblique-normal" d="M${layout.axis} 270V885"/>
  ${label('oblique-air-label',920,450,'空氣')}${label('oblique-material-label',230,740,'水')}
  ${beam()}
   <g class="oblique-source" tabindex="0" role="slider" aria-label="${medium==='water'?'水':'玻璃'}組光源，點擊或按Enter發射，拖曳或方向鍵調角度" aria-keyshortcuts="Enter Space" aria-valuemin="0" aria-valuemax="90" aria-valuenow="30" aria-valuetext="30度" data-lit="false">
    <title>點燈發射；拖曳調角度</title>
    <rect class="oblique-source-hit" x="-48" y="-82" width="96" height="96" fill="transparent"/>
    <rect class="oblique-focus" x="-42" y="-86" width="84" height="105" rx="15"/>
    <g class="oblique-source-lamp" filter="url(#oblique-shadow)"><rect x="-35" y="-78" width="70" height="69" rx="13" fill="url(#oblique-metal)" stroke="#131e20" stroke-width="2"/><path d="M-23-69V-25M-18-69V-25" stroke="#9aa5a1" stroke-width="2" opacity=".45"/><rect x="-38" y="-23" width="76" height="16" rx="5" fill="url(#oblique-rim)"/><ellipse cx="0" cy="-5" rx="35" ry="15" fill="url(#oblique-rim)" stroke="#162423" stroke-width="2"/><ellipse class="oblique-lens" cx="0" cy="-3" rx="26" ry="10" fill="url(#oblique-dark-lens)" stroke="#111d1c" stroke-width="2"/></g>
   </g>
 </g>`;

scene.innerHTML=scene.innerHTML.replaceAll('id="oblique-',`id="${prefix}-`).replaceAll('url(#oblique-',`url(#${prefix}-`);
if(reverse){
 scene.querySelector('defs').insertAdjacentHTML('beforeend',`<filter id="${prefix}-clear-air"><feColorMatrix type="saturate" values="0"/></filter><linearGradient id="${prefix}-clear-floor" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff9e8" stop-opacity=".2"/><stop offset="1" stop-color="#d2c6b0" stop-opacity=".55"/></linearGradient>`);
 const surface=`<svg class="single-material-surface air-clean-region" x="175" y="586" width="910" height="308" viewBox="175 330 910 220" preserveAspectRatio="none"><image class="single-material-photo" width="1254" height="1254" href="${picture.src}" filter="url(#${prefix}-clear-air)"/></svg><svg class="single-material-surface" x="230" y="278" width="795" height="276" viewBox="230 590 795 252" preserveAspectRatio="none"><image class="single-material-photo" width="1254" height="1254" href="${picture.src}"/></svg><svg class="single-material-surface" x="230" y="586" width="795" height="264" viewBox="230 280 795 268" preserveAspectRatio="none"><image class="single-material-photo" width="1254" height="1254" href="${picture.src}"/></svg><path class="air-clean-floor" d="M175 850H1085L1058 894H196Z" fill="url(#${prefix}-clear-floor)" stroke="#f6eddd" stroke-width="2"/>`;
 scene.insertAdjacentHTML('afterbegin',surface);
}
root.dataset.mediumOrder=reverse?'slow-fast':'fast-slow';root.style.setProperty('--beam-glow',`url(#${prefix}-glow)`);root.style.setProperty('--single-lit-lens',`url(#${prefix}-lit-lens)`);
const source=scene.querySelector('.oblique-source'),beamGroup=scene.querySelector('.oblique-beam'),beamPaths=[...scene.querySelectorAll('.oblique-halo,.oblique-ray,.oblique-core')],photos=new Map(),analysis=mountAnalysis(root,prefix);
function photo(key,reload=false){if(!photos.has(key)||reload){const img=new Image();img.src=new URL(`oblique-entry-${key}.png${reload?`?retry=${Date.now()}`:''}`,import.meta.url).href;photos.set(key,img);}return photos.get(key);}
function drawGeometry(){
 const g=geometry(medium,angle),ratio=Math.max(.1,scene.getBoundingClientRect().width/layout.width),sourceScale=Math.max(.9,22/(70*ratio)),fontScale=Math.max(.8,15/(30*ratio));
 input.value=angle;output.value=`${angle}°`;root.dataset.angle=String(angle);root.dataset.medium=medium;root.dataset.kind=g.kind;root.dataset.outgoing=g.outgoing===null?'':String(g.outgoing);
 source.setAttribute('transform',`translate(${g.source.join(' ')}) rotate(${-angle}) scale(${sourceScale})`);source.setAttribute('aria-valuemax','90');source.setAttribute('aria-valuenow',String(angle));source.setAttribute('aria-label','光源，點擊或按Enter發射，拖曳或方向鍵調角');source.setAttribute('aria-valuetext',`${angle}度，${g.outgoing===null?g.kind==='tir'?'全反射，沒有折射光':'沿介面掠射':`折射角${g.outgoing.toFixed(1)}度`}`);
 const hit=source.querySelector('.oblique-source-hit'),hitSize=Math.max(96,44/(ratio*sourceScale));for(const[k,v]of Object.entries({x:-hitSize/2,y:-34-hitSize/2,width:hitSize,height:hitSize}))hit.setAttribute(k,String(v));
 $('#oblique-case-label').setAttribute('transform',`translate(650 155) scale(${fontScale})`);$('#oblique-case-name').textContent=reverse?`${name()} → 空氣`:`空氣 → ${name()}`;
 $('#oblique-air-label').setAttribute('transform',`translate(${1030-110*fontScale} 440) scale(${fontScale})`);$('#oblique-material-label').setAttribute('transform',`translate(230 740) scale(${fontScale})`);$('#oblique-air-label text').textContent=reverse?name():'空氣';$('#oblique-material-label text').textContent=reverse?'空氣':name();
 for(const group of scene.querySelectorAll('.oblique-medium-badge')){const b=group.querySelector('text').getBBox(),r=group.querySelector('rect');for(const[k,v]of Object.entries({x:b.x-10,y:b.y-5,width:b.width+20,height:b.height+10}))r.setAttribute(k,String(v));}
 $('#oblique-in-value').value=`${angle}°`;$('#oblique-out-value').value=g.outgoing===null?'—':`${g.outgoing.toFixed(1)}°`;
 $('[data-concept-upper]').textContent=reverse?name():'空氣';$('[data-concept-lower]').textContent=reverse?'空氣':name();
 analysis.render(g,picture.src);scene.setAttribute('aria-label',`${reverse?name():'空氣'}在上方，${reverse?'空氣':name()}在下方；入射角${angle}度，${g.kind==='tir'?'全反射，沒有折射光':g.kind==='grazing'?'沿介面掠射':`折射角${g.outgoing.toFixed(1)}度`}。`);
}
function render(){
 const g=snapshot(medium,angle,elapsed),lit=elapsed>0,d=`M${g.source.join(' ')}${g.entered?`L${g.hit.join(' ')}`:''}L${g.front.join(' ')}`;
 root.dataset.elapsedMs=String(elapsed);root.dataset.entered=String(g.entered);root.dataset.arrived=String(g.arrived);source.dataset.lit=String(lit);beamPaths.forEach(p=>p.setAttribute('d',d));beamGroup.setAttribute('visibility',lit?'visible':'hidden');scene.dataset.frontX=String(g.front[0]);scene.dataset.frontY=String(g.front[1]);
 const m=scene.getScreenCTM(),ratio=Math.hypot(m.a,m.b),drawn=g.entered?g.sourceRadius+Math.hypot(g.front[0]-g.hit[0],g.front[1]-g.hit[1]):Math.hypot(g.front[0]-g.source[0],g.front[1]-g.source[1]);drawDirections(beamGroup,[g.source,g.hit,g.end],drawn,ratio,lit);
}
function controls(){
 root.dataset.state=state;root.dataset.playback=state;root.dataset.lightB=String(elapsed>0||state==='running');root.dataset.entryMs=String(geometry(medium,angle).entryMs);root.dataset.durationMs=String(durationMs(medium,angle));root.setAttribute('aria-busy',String(state==='loading'));
 start.disabled=['loading','error'].includes(state);pause.disabled=!['running','paused'].includes(state);input.disabled=start.disabled;$('#oblique-reset').disabled=start.disabled;selector.render(requestedMedium);
 source.setAttribute('aria-disabled',String(start.disabled));source.setAttribute('tabindex',start.disabled?'-1':'0');start.classList.toggle('primary',!start.disabled&&state!=='running');pause.classList.toggle('primary',['running','paused'].includes(state));pause.dataset.action=state==='paused'?'resume':'pause';pause.querySelector('span').textContent=state==='paused'?'繼續觀察':'暫停觀察';
 status.textContent={loading:'正在準備實驗場景……',error:`${requestedMedium==='water'?'水':'玻璃'}場景未能載入，請重試或切換介質。`,idle:'拖曳光源或調整滑桿，對照下方解析；點燈發射。',running:'上方光束正在前進，下方顯示目前角度的完整解析。',paused:'已暫停，調角可同步更新上下光路。',preview:'光路已更新，可重新發射觀察。',complete:'光路已展開，可調角度或切換介質。'}[state];
}
function stop(){cancelAnimationFrame(frame);frame=0;}
function tick(now){if(state!=='running')return;elapsed=Math.min(durationMs(medium,angle),Math.max(0,now-startTime));render();if(elapsed>=durationMs(medium,angle)){state='complete';frame=0;controls();}else frame=requestAnimationFrame(tick);}
function play(restart=false){if(['loading','error'].includes(state))return;stop();if(restart)elapsed=0;state='running';startTime=performance.now()-elapsed;render();controls();frame=requestAnimationFrame(tick);}
function freeze(){if(state!=='running')return;stop();elapsed=Math.min(durationMs(medium,angle),Math.max(0,performance.now()-startTime));state=elapsed>=durationMs(medium,angle)?'complete':'paused';render();controls();}
function setAngle(value){if(input.disabled)return;const next=clampAngle(value);if(next===angle)return;stop();angle=next;if(state==='idle')elapsed=0;else{state='preview';elapsed=durationMs(medium,angle);}drawGeometry();render();controls();}
$('#oblique-reset').onclick=()=>{if(input.disabled)return;stop();angle=30;elapsed=0;state='idle';drawGeometry();render();controls();};input.oninput=()=>setAngle(Number(input.value));start.onclick=()=>play(true);pause.onclick=()=>state==='paused'?play():freeze();
const point=e=>new DOMPoint(e.clientX,e.clientY).matrixTransform(scene.getScreenCTM().inverse());
scene.onpointerdown=e=>{if(!e.target.closest('.oblique-source')||input.disabled||e.button!==0)return;e.preventDefault();const g=geometry(medium,angle),p=point(e);drag={offsetX:p.x-g.source[0],offsetY:p.y-g.source[1],pointerId:e.pointerId,downX:e.clientX,downY:e.clientY,moved:false};scene.setPointerCapture(e.pointerId);source.focus({preventScroll:true});};
scene.addEventListener('touchstart',e=>{if(!input.disabled&&e.target.closest('.oblique-source'))e.preventDefault();},{passive:false});
scene.onpointermove=e=>{if(!drag||e.pointerId!==drag.pointerId)return;if(!drag.moved&&Math.hypot(e.clientX-drag.downX,e.clientY-drag.downY)<=clickSlop)return;drag.moved=true;const p=point(e);setAngle(Math.atan2(Math.max(0,layout.axis-p.x+drag.offsetX),Math.max(0,layout.boundary-p.y+drag.offsetY))*180/Math.PI);};
scene.onpointerup=e=>{const released=drag;drag=null;if(released&&e.pointerId===released.pointerId&&!released.moved&&Math.hypot(e.clientX-released.downX,e.clientY-released.downY)<=clickSlop)play(true);};scene.onpointercancel=scene.onlostpointercapture=()=>{drag=null;};scene.onclick=e=>{if(e.target.closest('.oblique-source')&&e.detail===0&&!input.disabled)play(true);};
scene.onkeydown=e=>{if(!e.target.closest('.oblique-source')||input.disabled)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!e.repeat)play(true);return;}const step={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1}[e.key];if(step!==undefined||e.key==='Home'||e.key==='End'){e.preventDefault();setAngle(e.key==='Home'?0:e.key==='End'?90:angle+step);}};
document.addEventListener('visibilitychange',()=>{if(document.hidden){freeze();drag=null;}});if('IntersectionObserver'in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting){freeze();drag=null;}},{threshold:0}).observe($('.oblique-experiment'));
async function prepare(target,reload=false){
 const id=++loadId;restoreLight=state==='loading'?restoreLight:elapsed>0||state==='running';requestedMedium=target;stop();drag=null;elapsed=0;state='loading';render();controls();retry.hidden=true;
 try{const img=photo(target,reload);await img.decode();if(id!==loadId)return;medium=target;picture.src=img.src;picture.alt=reverse?`寫實箱體，上方${name()}、下方空氣。`:`寫實箱體，上方空氣、下方${name()}。`;root.querySelectorAll('.single-material-photo').forEach(e=>e.setAttribute('href',img.src));$('#oblique-dock-background').setAttribute('href',img.src);elapsed=restoreLight?durationMs(medium,angle):0;state=restoreLight?'preview':'idle';drawGeometry();render();controls();}catch{if(id!==loadId)return;state='error';controls();retry.hidden=false;}
}
retry.onclick=()=>prepare(requestedMedium,true);const resize=new ResizeObserver(()=>{drawGeometry();render();});resize.observe(viewport);resize.observe($('#oblique-analysis-scene'));drawGeometry();render();controls();prepare('water');
}
mountSingleLab('#oblique-lab','oblique',false);mountSingleLab('#exit-lab','exit',true);
