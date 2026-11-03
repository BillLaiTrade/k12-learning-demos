import {exitGeometry,exitSnapshot,exitDurationMs} from './exit-refraction-model.mjs?v=20261103-shared2';
import {drawDirections} from './light-beam.mjs?v=20261103-shared2';
import {mediumSelector} from './medium-selector.mjs?v=20261103-concept1';
import { layout, media, clampAngle as entryClamp, geometry as entryGeometry, durationMs as entryDuration, snapshot as entrySnapshot, zoomViewBox } from './oblique-incidence-model.mjs?v=20261103-refine1';

function mountSingleLab(rootSelector,prefix,reverse){
const root=document.querySelector(rootSelector),$=selector=>root.querySelector(selector.replaceAll('#oblique-',`#${prefix}-`));
const geometry=reverse?exitGeometry:entryGeometry,snapshot=reverse?exitSnapshot:entrySnapshot,durationMs=reverse?exitDurationMs:entryDuration;
const clampAngle=value=>Math.min(reverse?35:60,entryClamp(value));
const scene=$('#oblique-scene'),zoom=$('#oblique-zoom'),picture=$('#oblique-background');
const detail=$('#oblique-detail'),magnify=$('#oblique-magnify'),closeDetail=$('#oblique-close'),viewport=$('#oblique-viewport');
const input=$('#oblique-angle'),output=$('#oblique-angle-value'),start=$('#oblique-start'),pause=$('#oblique-pause'),retry=$('#oblique-retry');
const status=$('#oblique-status'),mediumButton=$('#oblique-medium-toggle');
const selector=mediumSelector(mediumButton,key=>{if(key!==requestedMedium||state==='error')prepare(key);});
let medium='water',requestedMedium='water',angle=30,elapsed=0,state='loading',frame=0,startTime=0,drag=null,loadId=0,restoreLight=false;
const name=()=>medium==='water'?'水':'玻璃',clickSlop=5;
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
   <g class="oblique-source" tabindex="0" role="slider" aria-label="${medium==='water'?'水':'玻璃'}組光源，點擊或按Enter發射，拖曳或方向鍵調角度" aria-keyshortcuts="Enter Space" aria-valuemin="0" aria-valuemax="60" aria-valuenow="45" aria-valuetext="45度" data-lit="false">
    <title>點燈發射；拖曳調角度</title>
    <rect class="oblique-source-hit" x="-48" y="-82" width="96" height="96" fill="transparent"/>
    <rect class="oblique-focus" x="-42" y="-86" width="84" height="105" rx="15"/>
    <g class="oblique-source-lamp" filter="url(#oblique-shadow)"><rect x="-35" y="-78" width="70" height="69" rx="13" fill="url(#oblique-metal)" stroke="#131e20" stroke-width="2"/><path d="M-23-69V-25M-18-69V-25" stroke="#9aa5a1" stroke-width="2" opacity=".45"/><rect x="-38" y="-23" width="76" height="16" rx="5" fill="url(#oblique-rim)"/><ellipse cx="0" cy="-5" rx="35" ry="15" fill="url(#oblique-rim)" stroke="#162423" stroke-width="2"/><ellipse class="oblique-lens" cx="0" cy="-3" rx="26" ry="10" fill="url(#oblique-dark-lens)" stroke="#111d1c" stroke-width="2"/></g>
   </g>
 </g>`;
zoom.setAttribute('viewBox',zoomViewBox);zoom.classList.add('lesson-beam-detail');
zoom.innerHTML=`<defs>
 <linearGradient id="oblique-glass-edge"><stop stop-color="#effcf9" stop-opacity=".65"/><stop offset=".04" stop-color="#ffffff" stop-opacity="0"/><stop offset=".96" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#dff5ef" stop-opacity=".65"/></linearGradient>
 <linearGradient id="oblique-surface-air" x1="0" y1="0" x2="0" y2="1"><stop stop-color="white" stop-opacity="0"/><stop offset=".2" stop-color="white"/><stop offset="1" stop-color="white"/></linearGradient>
 <linearGradient id="oblique-surface-medium" x1="0" y1="0" x2="0" y2="1"><stop stop-color="white"/><stop offset=".5" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient>
 <mask id="oblique-air-reflection-mask" maskUnits="userSpaceOnUse" x="530" y="546" width="240" height="24"><rect x="530" y="546" width="240" height="24" fill="url(#oblique-surface-air)"/></mask>
 <mask id="oblique-medium-reflection-mask" maskUnits="userSpaceOnUse" x="530" y="570" width="240" height="38"><rect x="530" y="570" width="240" height="38" fill="url(#oblique-surface-medium)"/></mask>
 </defs>
 <g id="oblique-detail-texture"><image id="oblique-detail-background" x="0" y="0" width="1254" height="1254" href="${picture.src}"/></g>
 <rect class="oblique-detail-wash" x="530" y="450" width="240" height="240" fill="#fffdf6" fill-opacity=".16"/>
 <rect x="530.5" y="450.5" width="239" height="239" rx="2" fill="url(#oblique-glass-edge)" stroke="#e8f7ef" stroke-opacity=".6" stroke-width="1"/>
 <g class="oblique-surface-softening" aria-hidden="true">
  <g mask="url(#oblique-air-reflection-mask)"><svg x="530" y="546" width="240" height="24" viewBox="530 520 240 24"><use href="#oblique-detail-texture"/></svg></g>
  <g mask="url(#oblique-medium-reflection-mask)"><svg x="530" y="570" width="240" height="38" viewBox="530 610 240 38"><use href="#oblique-detail-texture"/></svg></g>
 </g>
 <path class="oblique-interface-underlay" d="M530 570H770"/>
 <path class="oblique-zoom-interface" d="M530 570H770"/>
 <g class="oblique-angle-marks" visibility="hidden">
  <path class="oblique-sector-base oblique-in-base"/><path class="oblique-sector-base oblique-out-base"/>
  <path class="oblique-angle-sector oblique-in-sector"/><path class="oblique-angle-sector oblique-out-sector"/>
 </g>
 <path class="oblique-normal-underlay" d="M650 450V690"/>
 <path class="oblique-normal" d="M650 450V690"/>
 <g class="oblique-angle-marks" visibility="hidden">
  <path class="oblique-angle-arc oblique-in-arc"/><path class="oblique-angle-arc oblique-out-arc"/>
  <g class="oblique-angle-label oblique-in-label"><path class="oblique-angle-leader"/><text x="667" y="528"><tspan x="667">入射角</tspan><tspan id="oblique-zoom-in-value" x="667" dy="21">45°</tspan></text></g>
  <g class="oblique-angle-label oblique-out-label"><path class="oblique-angle-leader"/><text x="633" y="601" text-anchor="end"><tspan x="633">折射角</tspan><tspan id="oblique-zoom-out-value" x="633" dy="21">32.0°</tspan></text></g>
 </g>
 ${beam()}
 <g class="oblique-zoom-labels">
  <g><rect x="657" y="458" width="43" height="24" rx="4"/><text class="oblique-normal-name" x="662" y="501">法線</text></g>
  <g class="oblique-medium-badge"><rect x="539" y="508" width="43" height="24" rx="4"/><text id="oblique-zoom-upper" x="558" y="542" text-anchor="middle">空氣</text></g>
  <g class="oblique-medium-badge"><rect x="539" y="645" width="48" height="25" rx="4"/><text id="oblique-zoom-medium" x="546" y="648">水</text></g>
  <g><rect x="534" y="552" width="48" height="25" rx="4"/><text x="558" y="570" text-anchor="middle">介面</text></g>
 </g>`;
// Reuse the same view markup with instance-local IDs.
for(const svg of [scene,zoom])svg.innerHTML=svg.innerHTML.replaceAll('id="oblique-',`id="${prefix}-`).replaceAll('url(#oblique-',`url(#${prefix}-`).replaceAll('href="#oblique-',`href="#${prefix}-`);
if(reverse){
 const surface=()=>`<svg class="single-material-surface" x="230" y="278" width="795" height="276" viewBox="230 590 795 252" preserveAspectRatio="none"><image class="single-material-photo" width="1254" height="1254" href="${picture.src}"/></svg><svg class="single-material-surface" x="230" y="586" width="795" height="264" viewBox="230 280 795 272" preserveAspectRatio="none"><image class="single-material-photo" width="1254" height="1254" href="${picture.src}"/></svg>`;
 scene.insertAdjacentHTML('afterbegin',surface());$('#oblique-detail-texture').insertAdjacentHTML('beforeend',surface());
}
root.dataset.mediumOrder=reverse?'slow-fast':'fast-slow';root.style.setProperty('--beam-glow',`url(#${prefix}-glow)`);root.style.setProperty('--single-lit-lens',`url(#${prefix}-lit-lens)`);
const source=scene.querySelector('.oblique-source'),views=[scene,zoom].map(svg=>({svg,beam:svg.querySelector('.oblique-beam'),paths:[...svg.querySelectorAll('.oblique-halo,.oblique-ray,.oblique-core')]}));
const photos=new Map();
function photo(key,reload=false){
 if(!photos.has(key)||reload){const img=new Image();img.src=new URL(`oblique-entry-${key}.png${reload?`?retry=${Date.now()}`:''}`,import.meta.url).href;photos.set(key,img);}
 return photos.get(key);
}
function arc(degrees,up){
 if(!degrees)return '';
 const r=76,a=degrees*Math.PI/180,sign=up?-1:1;
 return `M${layout.axis} ${layout.boundary+sign*r} A${r} ${r} 0 0 0 ${layout.axis+sign*r*Math.sin(a)} ${layout.boundary+sign*r*Math.cos(a)}`;
}
function sector(degrees,up){
 const edge=arc(degrees,up);return edge?`M${layout.axis} ${layout.boundary}L${edge.slice(1)}Z`:'';
}
// Point at the middle of the measured arc, even when the wedge is too narrow
// for a number. Labels stay clear of both rays and the vertical normal.
function labelAngle(kind,degrees,up){
 const a=degrees*Math.PI/360,sign=up?-1:1,x=layout.axis+sign*76*Math.sin(a),y=layout.boundary+sign*76*Math.cos(a);
 zoom.querySelector(`.oblique-${kind}-label .oblique-angle-leader`).setAttribute('d',`M${x} ${y}L${up?'655 522L661 522':'643 598L639 598'}`);
 $(`#oblique-zoom-${kind}-value`).textContent=`${up?degrees:degrees.toFixed(1)}°`;
}
function drawGeometry(){
 const g=geometry(medium,angle),ratio=Math.max(.1,scene.getBoundingClientRect().width/layout.width),sourceScale=Math.max(.9,22/(70*ratio)),fontScale=Math.max(.8,15/(30*ratio));
 input.value=angle;output.value=`${angle}°`;root.dataset.angle=String(angle);root.dataset.medium=medium;root.dataset.outgoing=String(g.outgoing);
 source.setAttribute('transform',`translate(${g.source.join(' ')}) rotate(${-angle}) scale(${sourceScale})`);
 source.setAttribute('aria-valuemax',String(reverse?35:60));source.setAttribute('aria-label',`${name()}組光源，點擊或按Enter發射，拖曳或方向鍵調角度`);source.setAttribute('aria-valuenow',String(angle));source.setAttribute('aria-valuetext',`${angle}度，折射角${g.outgoing.toFixed(1)}度`);
 const hit=source.querySelector('.oblique-source-hit'),hitSize=Math.max(96,44/(ratio*sourceScale));for(const [key,value] of Object.entries({x:-hitSize/2,y:-34-hitSize/2,width:hitSize,height:hitSize}))hit.setAttribute(key,String(value));
 $('#oblique-case-label').setAttribute('transform',`translate(650 155) scale(${fontScale})`);$('#oblique-case-name').textContent=reverse?`${name()} → 空氣`:`空氣 → ${name()}`;
 $('#oblique-air-label').setAttribute('transform',`translate(${1030-110*fontScale} 440) scale(${fontScale})`);$('#oblique-material-label').setAttribute('transform',`translate(230 740) scale(${fontScale})`);$('#oblique-air-label text').textContent=reverse?name():'空氣';$('#oblique-material-label text').textContent=reverse?'空氣':name();
 for(const group of scene.querySelectorAll('.oblique-medium-badge')){const b=group.querySelector('text').getBBox(),r=group.querySelector('rect');for(const [k,v]of Object.entries({x:b.x-10,y:b.y-5,width:b.width+20,height:b.height+10}))r.setAttribute(k,String(v));}
 for(const kind of ['sector','base']){zoom.querySelector(`.oblique-in-${kind}`).setAttribute('d',sector(angle,true));zoom.querySelector(`.oblique-out-${kind}`).setAttribute('d',sector(g.outgoing,false));}zoom.querySelector('.oblique-in-arc').setAttribute('d',arc(angle,true));zoom.querySelector('.oblique-out-arc').setAttribute('d',arc(g.outgoing,false));$('#oblique-in-value').value=`${angle}°`;$('#oblique-out-value').value=`${g.outgoing.toFixed(1)}°`;$('#oblique-zoom-upper').textContent=reverse?name():'空氣';$('#oblique-zoom-medium').textContent=reverse?'空氣':name();
 labelAngle('in',angle,true);labelAngle('out',g.outgoing,false);
 zoom.style.setProperty('--zoom-font-scale',String(Math.max(1,14*240/(11*Math.max(80,zoom.getBoundingClientRect().width||200)))));
 for(const group of detail.hidden?[]:zoom.querySelectorAll('.oblique-zoom-labels > g')){const box=group.querySelector('text').getBBox(),plate=group.querySelector('rect');for(const [key,value] of Object.entries({x:box.x-4,y:box.y-3,width:box.width+8,height:box.height+6}))plate.setAttribute(key,String(value));}
 const description=`${reverse?`${name()}射入空氣`:`空氣射入${name()}`}，入射角${angle}度，折射角${g.outgoing.toFixed(1)}度。法線通過入射點；角度皆從法線量起。`;
 scene.setAttribute('aria-label',`${description}點燈發射，拖曳可調角度。`);zoom.setAttribute('aria-label',`同一入射點的放大畫面。${description}`);
 $('[data-concept-upper]').textContent=reverse?name():'空氣';$('[data-concept-lower]').textContent=reverse?'空氣':name();$('[data-concept-in]').textContent=`${angle}°`;$('[data-concept-out]').textContent=`${g.outgoing.toFixed(1)}°`;
 $('#oblique-finding-text').textContent=angle===0?'沿法線入射，不偏折':reverse?'斜射時偏離法線':'斜射時偏向法線';
 $('#oblique-angle-comparison').textContent=angle===0?' = ':reverse?' > ':' < ';
 $('#oblique-zoom-note').textContent='兩個角都從法線量起。';
 positionDetail();
}
// Align the optical entry point itself, including the panel header/readouts.
function positionDetail(){
 const table=viewport.getBoundingClientRect(),hit=new DOMPoint(layout.axis,layout.boundary).matrixTransform(scene.getScreenCTM()),x=hit.x-table.x,y=hit.y-table.y;
 magnify.style.left=`${x}px`;magnify.style.top=`${y}px`;viewport.style.setProperty('--oblique-entry-x',`${x}px`);viewport.style.setProperty('--oblique-entry-y',`${y}px`);
 if(detail.hidden)return;
 detail.style.left=`${x-detail.offsetWidth/2}px`;
 const panel=detail.getBoundingClientRect(),crop=zoom.getBoundingClientRect();
 detail.style.top=`${y-(crop.top-panel.top)-crop.height/2}px`;
}
function setDetailOpen(open){
 if(open&&magnify.disabled)return;
 detail.hidden=!open;root.dataset.detailOpen=String(open);magnify.setAttribute('aria-expanded',String(open));magnify.tabIndex=open?-1:0;magnify.setAttribute('aria-hidden',String(open));
 drawGeometry();render();
 if(!open&&magnify.disabled)selector.focus();else (open?closeDetail:magnify).focus({preventScroll:true});
}
magnify.onclick=()=>setDetailOpen(true);closeDetail.onclick=()=>setDetailOpen(false);
root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!detail.hidden){event.preventDefault();setDetailOpen(false);}});
function render(){
 const g=snapshot(medium,angle,elapsed),lit=elapsed>0,path=`M${g.source.join(' ')} ${g.entered?`L${g.hit.join(' ')} `:''}L${g.front.join(' ')}`;
 zoom.querySelectorAll('.oblique-angle-marks').forEach(group=>group.setAttribute('visibility',g.entered?'visible':'hidden'));
 root.dataset.elapsedMs=String(elapsed);root.dataset.entered=String(g.entered);root.dataset.arrived=String(g.arrived);source.dataset.lit=String(lit);
 views.forEach(view=>{view.paths.forEach(p=>p.setAttribute('d',path));view.beam.setAttribute('visibility',lit?'visible':'hidden');view.svg.dataset.frontX=String(g.front[0]);view.svg.dataset.frontY=String(g.front[1]);view.svg.dataset.hitX=String(g.hit[0]);view.svg.dataset.hitY=String(g.hit[1]);const ratio=Math.hypot(view.svg.getScreenCTM().a,view.svg.getScreenCTM().b),drawn=g.entered?g.sourceRadius+Math.hypot(g.front[0]-g.hit[0],g.front[1]-g.hit[1]):Math.hypot(g.front[0]-g.source[0],g.front[1]-g.source[1]);drawDirections(view.beam,[g.source,g.hit,g.end],drawn,ratio,lit,view.svg===zoom?zoomViewBox.split(' ').map(Number):null);});
}
function controls(){
 root.dataset.state=state;root.dataset.playback=state;root.dataset.lightB=String(elapsed>0||state==='running');root.dataset.entryMs=String(snapshot(medium,angle,0).entryMs);root.dataset.durationMs=String(durationMs(medium,angle));root.setAttribute('aria-busy',String(state==='loading'));start.disabled=['loading','error'].includes(state);pause.disabled=!['running','paused'].includes(state);input.disabled=start.disabled;magnify.disabled=start.disabled;$('#oblique-reset').disabled=start.disabled;
 selector.render(requestedMedium);
 source.setAttribute('aria-disabled',String(start.disabled));source.setAttribute('tabindex',start.disabled?'-1':'0');start.classList.toggle('primary',!start.disabled&&state!=='running');pause.classList.toggle('primary',['running','paused'].includes(state));pause.dataset.action=state==='paused'?'resume':'pause';pause.querySelector('span').textContent=state==='paused'?'繼續觀察':'暫停觀察';
 status.textContent={loading:'正在準備實驗場景……',error:`${requestedMedium==='water'?'水':'玻璃'}場景未能載入，請重試或切換介質。`,idle:'點燈發射，拖曳光源可調角度。',running:'全景與放大畫面同步前進。',paused:'已暫停，可仔細觀察入射點。',preview:'光路已更新，可重新發射觀察。',complete:'光路已展開，可調角度或切換介質。'}[state];
}
function stop(){cancelAnimationFrame(frame);frame=0;}
function tick(now){
 if(state!=='running')return;
 elapsed=Math.min(durationMs(medium,angle),Math.max(0,now-startTime));render();
 if(elapsed>=durationMs(medium,angle)){state='complete';frame=0;controls();}else frame=requestAnimationFrame(tick);
}
function play(restart=false){
 if(['loading','error'].includes(state))return;
 stop();if(restart)elapsed=0;state='running';startTime=performance.now()-elapsed;render();controls();frame=requestAnimationFrame(tick);
}
function freeze(){
 if(state!=='running')return;
 stop();elapsed=Math.min(durationMs(medium,angle),Math.max(0,performance.now()-startTime));state=elapsed>=durationMs(medium,angle)?'complete':'paused';render();controls();
}
function setAngle(value){
 if(input.disabled)return;
 const next=clampAngle(value);if(next===angle)return;
 stop();angle=next;if(state==='idle')elapsed=0;else{state='preview';elapsed=durationMs(medium,angle);}drawGeometry();render();controls();
}
$('#oblique-reset').onclick=()=>{if(input.disabled)return;stop();angle=30;elapsed=0;state='idle';drawGeometry();render();controls();};
input.oninput=()=>setAngle(Number(input.value));start.onclick=()=>play(true);pause.onclick=()=>state==='paused'?play():freeze();
const point=e=>new DOMPoint(e.clientX,e.clientY).matrixTransform(scene.getScreenCTM().inverse());
scene.onpointerdown=e=>{
 if(!e.target.closest('.oblique-source')||input.disabled||e.button!==0)return;
 e.preventDefault();const g=geometry(medium,angle),p=point(e);drag={offsetX:p.x-g.source[0],offsetY:p.y-g.source[1],pointerId:e.pointerId,downX:e.clientX,downY:e.clientY,moved:false};scene.setPointerCapture(e.pointerId);source.focus({preventScroll:true});
};
scene.addEventListener('touchstart',e=>{if(!input.disabled&&e.target.closest('.oblique-source'))e.preventDefault();},{passive:false});
scene.onpointermove=e=>{
 if(!drag||e.pointerId!==drag.pointerId)return;
 if(!drag.moved&&Math.hypot(e.clientX-drag.downX,e.clientY-drag.downY)<=clickSlop)return;
 drag.moved=true;const p=point(e);setAngle(Math.atan2(Math.max(0,layout.axis-p.x+drag.offsetX),Math.max(1,layout.boundary-p.y+drag.offsetY))*180/Math.PI);
};
scene.onpointerup=e=>{const released=drag;drag=null;if(released&&e.pointerId===released.pointerId&&!released.moved&&Math.hypot(e.clientX-released.downX,e.clientY-released.downY)<=clickSlop)play(true);};
scene.onpointercancel=scene.onlostpointercapture=()=>{drag=null;};
scene.onclick=e=>{if(e.target.closest('.oblique-source')&&e.detail===0&&!input.disabled)play(true);};
scene.onkeydown=e=>{
 if(!e.target.closest('.oblique-source')||input.disabled)return;
 if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!e.repeat)play(true);return;}
 const step={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1}[e.key];if(step!==undefined||e.key==='Home'||e.key==='End'){e.preventDefault();setAngle(e.key==='Home'?0:e.key==='End'?(reverse?35:60):angle+step);}
};
document.addEventListener('visibilitychange',()=>{if(document.hidden){freeze();drag=null;}});
if('IntersectionObserver' in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting){freeze();drag=null;}},{threshold:0}).observe($('.oblique-experiment'));
async function prepare(target,reload=false){
 const id=++loadId;restoreLight=state==='loading'?restoreLight:elapsed>0||state==='running';requestedMedium=target;stop();drag=null;elapsed=0;state='loading';render();controls();retry.hidden=true;
 try{const img=photo(target,reload);await img.decode();if(id!==loadId)return;medium=target;picture.src=img.src;$('#oblique-detail-background').setAttribute('href',img.src);picture.alt=reverse?`寫實木桌上的單槽光路剖面：上方${name()}，下方空氣。`:`寫實木桌上的單槽光路剖面：上方空氣，下方為${name()}。`;root.querySelectorAll('.single-material-photo').forEach(e=>e.setAttribute('href',img.src));$('#oblique-dock-background').setAttribute('href',img.src);elapsed=restoreLight?durationMs(medium,angle):0;state=restoreLight?'preview':'idle';drawGeometry();render();controls();}
 catch{if(id!==loadId)return;state='error';controls();retry.hidden=false;}
}
retry.onclick=()=>prepare(requestedMedium,true);
const resize=new ResizeObserver(()=>{drawGeometry();render();});resize.observe(viewport);resize.observe(zoom);
drawGeometry();render();controls();prepare('water');

}
mountSingleLab('#oblique-lab','oblique',false);
mountSingleLab('#exit-lab','exit',true);
