import {mediumSelector} from './medium-selector.mjs?v=20261103-concept1';
import {exitGeometry,angleFromExitSource} from './exit-refraction-model.mjs?v=20261103-concept1';
import { geometry as reciprocalGeometry,layout,zoomViewBox,clampAngle,angleFromSource,angleMark,arrow } from './return-refraction-model.mjs?v=20261103-refine1';

function mountReturnLab(selector,prefix,dual){
const root=document.querySelector(selector);if(!root)return;
const $=s=>root.querySelector(s.replaceAll('#return-',`#${prefix}-`)),scene=$('#return-scene'),devices=$('#return-devices'),zoom=$('#return-zoom'),picture=$('#return-background'),detail=$('#return-detail'),viewport=$('#return-viewport'),magnify=$('#return-magnify'),close=$('#return-close'),input=$('#return-angle');
const sourceKeys=dual?['a','b']:['b'],mediumButton=$('#return-medium-toggle'),lights={a:false,b:false},photos=new Map();
const geometry=dual?reciprocalGeometry:exitGeometry;
const selectorControl=mediumSelector(mediumButton,key=>{if(key!==requested||state==='error')prepare(key);});
let medium='water',requested='water',angle=30,state='loading',loadId=0,press=null;
const views=[scene,zoom];
function source(key,id){return `<g class="return-source${key==='b'?' source':''}" data-source="${key}" tabindex="0" role="slider" aria-label="${dual?`${key.toUpperCase()} ${key==='a'?'紅':'藍'}光`:'光源'}，點擊開關，拖曳或方向鍵調角" aria-keyshortcuts="Enter Space" aria-valuemin="0" aria-valuemax="60" aria-valuenow="30">
 <rect class="return-source-hit" x="-48" y="-82" width="96" height="96" fill="transparent"/>
 <rect class="return-source-focus" x="-42" y="-86" width="84" height="105" rx="15"/>
 <rect x="-35" y="-78" width="70" height="69" rx="13" fill="url(#return-metal-${id})" stroke="#131e20" stroke-width="2"/>
 <path d="M-23-69V-25M-18-69V-25" stroke="#9aa5a1" stroke-width="2" opacity=".45"/>
 <rect x="-38" y="-23" width="76" height="16" rx="5" fill="url(#return-rim-${id})"/>
 <ellipse cx="0" cy="-5" rx="35" ry="15" fill="url(#return-rim-${id})" stroke="#162423" stroke-width="2"/>
 <ellipse class="return-lens" cx="0" cy="-3" rx="26" ry="10" fill="#243c3c" stroke="#111d1c" stroke-width="2"/>
 <text class="return-device-letter" x="0" y="-42" text-anchor="middle" ${key==='b'?'transform="rotate(180 0 -49)"':''}>${dual?key.toUpperCase():''}</text>
 </g>`;}
views.forEach((svg,index)=>{
 const id=`${prefix}-${index?'zoom':'main'}`;svg.setAttribute('viewBox',index?zoomViewBox:'0 0 1254 1254');
 svg.innerHTML=`<defs>
 <linearGradient id="return-metal-${id}" x1="0" x2="1"><stop stop-color="#10191b"/><stop offset=".18" stop-color="#6d7777"/><stop offset=".4" stop-color="#263033"/><stop offset=".78" stop-color="#101719"/><stop offset="1" stop-color="#414b4c"/></linearGradient>
 <linearGradient id="return-rim-${id}"><stop stop-color="#555d5b"/><stop offset=".3" stop-color="#d5d9d1"/><stop offset=".55" stop-color="#545e5b"/><stop offset="1" stop-color="#111c1b"/></linearGradient>
 <clipPath id="exit-media-${id}"><rect x="196" y="274" width="862" height="613"/></clipPath>
 </defs>
 ${!dual?`${index?`<image class="return-detail-photo" width="1254" height="1254" href="${picture.src}"/>`:''}<g class="exit-media-layer" clip-path="url(#exit-media-${id})"><image class="exit-media-photo" width="1254" height="1254" transform="translate(0 1140) scale(1 -1)" href="${picture.src}"/></g>`:''}
 ${index&&dual?`<image class="return-detail-photo" width="1254" height="1254" href="${picture.src}"/><rect x="350" y="340" width="600" height="460" fill="#fffdf6" fill-opacity=".12"/>
 <svg x="350" y="550" width="600" height="20" viewBox="350 520 600 20" opacity=".85"><image class="return-detail-photo" width="1254" height="1254" href="${picture.src}"/></svg>
 <svg x="350" y="570" width="600" height="30" viewBox="350 620 600 30" opacity=".85"><image class="return-detail-photo" width="1254" height="1254" href="${picture.src}"/></svg>
 <path class="return-interface" d="M350 570H950"/>`:''}
 ${index&&!dual?'<rect x="350" y="340" width="600" height="460" fill="#fffdf6" fill-opacity=".12"/><path class="return-interface" d="M350 570H950"/>':''}
 <path class="return-normal-underlay" d="M650 270V885"/><path class="return-normal" d="M650 270V885"/>
 ${index?`<g class="return-angle-marks" visibility="hidden">
 <path class="return-angle-sector return-upper-sector"/><path class="return-angle-sector return-lower-sector"/>
 <path class="return-angle-arc return-upper-arc"/><path class="return-angle-arc return-lower-arc"/>
 <g class="return-angle-label return-upper-label"><path class="return-angle-leader"/><text data-sized x="710" y="470"><tspan class="return-angle-name" x="710">折射角</tspan><tspan class="return-angle-number" x="710" dy="50">41.8°</tspan></text></g>
 <g class="return-angle-label return-lower-label"><path class="return-angle-leader"/><text data-sized x="610" y="625" text-anchor="end"><tspan class="return-angle-name" x="610">入射角</tspan><tspan class="return-angle-number" x="610" dy="50">30°</tspan></text></g>
 </g>`:''}
 ${sourceKeys.map(key=>`<g class="return-light return-light-${key}" visibility="hidden"><path class="return-beam return-beam-${key}"/><path class="return-direction return-direction-${key}" data-segment="0"/><path class="return-direction return-direction-${key}" data-segment="1"/></g>`).join('')}

 ${index?'<text data-sized x="670" y="395">法線</text><text data-marker x="666" y="566">M</text><g class="return-medium-badge"><rect/><text data-sized x="385" y="530">空氣</text></g><g class="return-medium-badge"><rect/><text data-sized class="return-medium-name" x="395" y="770">水</text></g>':'<g class="return-medium-badge"><rect/><text data-sized x="950" y="440">空氣</text></g><g class="return-medium-badge"><rect/><text data-sized class="return-medium-name" x="230" y="740">水</text></g>'}`;
 if(!dual){const labels=svg.querySelectorAll('.return-medium-badge text');labels[0].classList.add('return-medium-name');labels[1].classList.remove('return-medium-name');labels[1].textContent='空氣';}
});
devices.innerHTML=sourceKeys.map(key=>source(key,`${prefix}-main`)).join('');
function positionDetail(){
 const box=viewport.getBoundingClientRect(),p=new DOMPoint(layout.axis,layout.boundary).matrixTransform(scene.getScreenCTM()),x=p.x-box.x,y=p.y-box.y;
 magnify.style.left=`${x}px`;magnify.style.top=`${y}px`;viewport.style.setProperty('--return-x',`${x}px`);viewport.style.setProperty('--return-y',`${y}px`);
 if(!detail.hidden){detail.style.left=`${x-detail.offsetWidth/2}px`;detail.style.top=`${y-detail.offsetHeight/2}px`;}
}
function render(){
 const g=geometry(medium,angle),active=state==='ready'&&(lights.a||lights.b),both=lights.a&&lights.b;
 root.dataset.state=state;root.dataset.medium=medium;root.dataset.angle=String(angle);root.dataset.airAngle=String(g.airAngle);root.dataset.lightA=String(lights.a);root.dataset.lightB=String(lights.b);
 root.setAttribute('aria-busy',String(state==='loading'));input.value=String(angle);$('#return-angle-value').value=`${angle}°`;
 $('#return-air-value').textContent=`${g.airAngle.toFixed(1)}°`;$('#return-water-value').textContent=`${angle}°`;
 const angleCaption=dual?`${g.name}側角度`:`${g.name}中入射角`;input.setAttribute('aria-label',`${angleCaption}，從法線量起`);$('#return-angle-caption').textContent=angleCaption;
 views.forEach((svg,index)=>{
  const matrix=svg.getScreenCTM(),ratio=Math.max(.05,matrix?Math.hypot(matrix.a,matrix.b):.8),scale=.8;
  svg.querySelectorAll('[data-sized]').forEach(e=>e.style.fontSize=`${Math.max(index?24:22,(index?13:15)/ratio)}px`);
  svg.querySelectorAll('[data-marker]').forEach(e=>e.style.fontSize=`${Math.max(18,10/ratio)}px`);
  svg.querySelector('.return-medium-name').textContent=g.name;
  for(const key of sourceKeys){
   const sceneMatrix=scene.getScreenCTM(),distanceScale=index?Math.hypot(sceneMatrix.a,sceneMatrix.b)/ratio:1,path=(key==='a'?g.forward:g.backward).map(p=>[layout.axis+(p[0]-layout.axis)*distanceScale,layout.boundary+(p[1]-layout.boundary)*distanceScale]),group=svg.querySelector(`.return-light-${key}`),on=lights[key];
   group.setAttribute('visibility',on&&state==='ready'?'visible':'hidden');group.querySelector('.return-beam').setAttribute('d',`M${path.map(p=>p.join(' ')).join('L')}`);group.querySelector('.return-beam').setAttribute('stroke-width',String(Math.max(key==='a'&&both?8:4,(key==='a'&&both?5:2.6)/ratio)));
   group.querySelectorAll('.return-direction').forEach((head,i)=>head.setAttribute('d',arrow(path[i],path[i+1],key==='a'?.32:.36,Math.max(12,8/ratio))));
  }
  for(const badge of svg.querySelectorAll('.return-medium-badge')){const b=badge.querySelector('text').getBBox(),r=badge.querySelector('rect'),p=(index?4:5)/ratio;for(const [k,v]of Object.entries({x:b.x-p,y:b.y-p*.6,width:b.width+2*p,height:b.height+1.2*p,rx:7/ratio}))r.setAttribute(k,String(v));}
  svg.setAttribute('aria-label',`${g.name}在${dual?'下':'上'}方，空氣在${dual?'上':'下'}方。${g.name}側${angle}度，空氣側${g.airAngle.toFixed(1)}度。${dual?`A紅光${lights.a?'開啟':'關閉'}，B藍光${lights.b?'開啟':'關閉'}`:`光源${lights.b?'開啟':'關閉'}`}。`);
 });
 const matrix=devices.getScreenCTM(),ratio=Math.max(.05,matrix?Math.hypot(matrix.a,matrix.b):.8),scale=Math.max(.8,20/(70*ratio));
 for(const key of sourceKeys){
  const lamp=devices.querySelector(`[data-source=${key}]`),p=key==='a'?g.sourceA:g.sourceB,rotation=dual?(key==='a'?-g.airAngle:180-angle):-angle,on=lights[key],value=key==='a'?g.airAngle:angle,maximum=key==='a'?geometry(medium,35).airAngle:35;
  lamp.setAttribute('transform',`translate(${p.join(' ')}) rotate(${rotation}) scale(${scale})`);lamp.setAttribute('aria-disabled',String(state!=='ready'));lamp.setAttribute('tabindex',state==='ready'?'0':'-1');lamp.setAttribute('aria-valuemax',String(maximum));lamp.setAttribute('aria-valuenow',String(value));lamp.setAttribute('aria-valuetext',`${dual?key.toUpperCase():'光源'} ${value.toFixed(1)}度，${on?'開啟':'關閉'}；拖曳或方向鍵調角${dual?'，另一端同步對準':''}`);
  lamp.querySelector('.return-lens').setAttribute('fill',on&&state==='ready'?(key==='a'?'#ff767b':dual?'#74c9ff':'#ffe28c'):'#243c3c');
  const hitSize=Math.max(96,45/(ratio*scale)),hit=lamp.querySelector('.return-source-hit');for(const [k,v]of Object.entries({x:-hitSize/2,y:-hitSize/2,width:hitSize,height:hitSize}))hit.setAttribute(k,String(v));
 }
 zoom.querySelector('.return-angle-marks').setAttribute('visibility',active?'visible':'hidden');
 for(const upper of [true,false]){
  const kind=upper?'upper':'lower',degrees=upper?(dual?g.airAngle:angle):(dual?angle:g.airAngle),mark=angleMark(degrees,upper),color=(!dual?upper:(upper?(lights.a&&!lights.b):(!lights.a||lights.b)))?'#165fc2':'#24783a',sign=upper?-1:1,half=degrees*Math.PI/360;
  zoom.querySelector(`.return-${kind}-sector`).setAttribute('d',mark.sector);zoom.querySelector(`.return-${kind}-sector`).setAttribute('fill',color);zoom.querySelector(`.return-${kind}-arc`).setAttribute('d',mark.arc);zoom.querySelector(`.return-${kind}-arc`).setAttribute('stroke',color);
  const label=zoom.querySelector(`.return-${kind}-label`);label.querySelector('text').style.fill=color;label.querySelector('.return-angle-name').textContent=!dual?(upper?'入射角':'折射角'):both?(upper?'空氣側':`${g.name}側`):upper?(lights.a?'入射角':'折射角'):(lights.a?'折射角':'入射角');label.querySelector('.return-angle-number').textContent=(upper===dual)?`${g.airAngle.toFixed(1)}°`:`${angle}°`;
  const leader=label.querySelector('path');leader.setAttribute('stroke',color);leader.setAttribute('d',`M${650+sign*98*Math.sin(half)} ${570+sign*98*Math.cos(half)}L${upper?'690 460L702 460':'628 615L618 615'}`);
 }
 for(const key of sourceKeys){const button=$(`#return-toggle-${key}`);button.setAttribute('aria-pressed',String(lights[key]));button.disabled=state!=='ready';button.querySelector('small').textContent=lights[key]?'開啟':'關閉';}
 input.disabled=state!=='ready';magnify.disabled=state!=='ready';$('#return-reset').disabled=state!=='ready';selectorControl.render(requested);
 if(!dual){
  root.querySelectorAll('[data-concept-medium]').forEach(e=>e.textContent=g.name);$('[data-concept-in]').textContent=`${angle}°`;$('[data-concept-out]').textContent=`${g.airAngle.toFixed(1)}°`;
  $('#return-finding').textContent=`${g.name} → 空氣，光速由慢變快`;
  $('#return-route').textContent=angle===0?'沿法線入射，速度改變但方向不偏折':`斜射時偏離法線；折射角 ${g.airAngle.toFixed(1)}° > 入射角 ${angle}°`;
 }else{
  $('#return-finding').textContent=both?'往返光路重合，方向相反':!active?'分別開啟 A、B，再比較兩個方向':lights.b?'B → M → A：從下方射回空氣':'A → M → B：從空氣射入下方';
  $('#return-route').textContent=both?'A → M → B　／　B → M → A':lights.b?`光速慢 → 快；入射 ${angle}° → 折射 ${g.airAngle.toFixed(1)}°`:lights.a?`光速快 → 慢；入射 ${g.airAngle.toFixed(1)}° → 折射 ${angle}°`:`空氣側 ${g.airAngle.toFixed(1)}°｜${g.name}側 ${angle}°`;
 }
 $('#return-status').textContent=state==='loading'?'正在準備實驗場景……':state==='error'?'場景未能載入，請重試或切換介質。':dual?'點擊開關光源；拖動 A 或 B 調角，另一端自動對準。':'點燈開關光源，拖曳調整入射角；觀察慢 → 快的折射方向。';
 positionDetail();
}
function toggle(key){if(state!=='ready')return;lights[key]=!lights[key];render();}
function setAngle(value){if(state!=='ready')return;angle=clampAngle(value);render();}
function setDetail(open){if(open&&magnify.disabled)return;detail.hidden=!open;root.dataset.detailOpen=String(open);magnify.setAttribute('aria-expanded',String(open));magnify.setAttribute('aria-hidden',String(open));magnify.tabIndex=open?-1:0;render();if(!open&&magnify.disabled)selectorControl.focus();else (open?close:magnify).focus({preventScroll:true});}
if(dual)$('#return-toggle-a').onclick=()=>toggle('a');$('#return-toggle-b').onclick=()=>toggle('b');
$('#return-reset').onclick=()=>{lights.a=lights.b=false;angle=30;render();};input.oninput=()=>setAngle(Number(input.value));magnify.onclick=()=>setDetail(true);close.onclick=()=>setDetail(false);
root.addEventListener('keydown',e=>{if(e.key==='Escape'&&!detail.hidden){e.preventDefault();setDetail(false);return;}const lamp=e.target.closest('.return-source');if(!lamp||state!=='ready')return;const key=lamp.dataset.source;if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!e.repeat)toggle(key);return;}const step={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1}[e.key];if(step!==undefined||e.key==='Home'||e.key==='End'){e.preventDefault();setAngle(e.key==='Home'?0:e.key==='End'?35:angle+step);}});
const point=(event,svg)=>new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());
[devices].forEach(svg=>{
 svg.addEventListener('pointerdown',e=>{const lamp=e.target.closest('.return-source');if(!lamp||state!=='ready'||e.button!==0)return;e.preventDefault();const p=point(e,svg),g=geometry(medium,angle),key=lamp.dataset.source,origin=key==='a'?g.sourceA:g.sourceB;press={key,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,dx:p.x-origin[0],dy:p.y-origin[1]};svg.setPointerCapture(e.pointerId);lamp.focus({preventScroll:true});});
 svg.addEventListener('pointermove',e=>{if(!press||press.id!==e.pointerId)return;if(Math.hypot(e.clientX-press.x,e.clientY-press.y)>5)press.moved=true;if(press.moved){const p=point(e,svg);setAngle(dual?angleFromSource(medium,press.key,p.x-press.dx,p.y-press.dy):angleFromExitSource(medium,p.x-press.dx,p.y-press.dy));}});
 svg.addEventListener('pointerup',e=>{if(press?.id===e.pointerId&&!press.moved)toggle(press.key);press=null;});svg.addEventListener('pointercancel',()=>press=null);svg.addEventListener('lostpointercapture',()=>press=null);
 svg.addEventListener('click',e=>{const lamp=e.target.closest('.return-source');if(lamp&&e.detail===0)toggle(lamp.dataset.source);});
 svg.addEventListener('touchstart',e=>{if(e.target.closest('.return-source')&&state==='ready')e.preventDefault();},{passive:false});
});
async function prepare(target,retry=false){
 const id=++loadId;requested=target;state='loading';press=null;$('#return-retry').hidden=true;render();
 try{if(!photos.has(target)||retry){const img=new Image();img.src=new URL(`oblique-entry-${target}.png${retry?`?retry=${Date.now()}`:''}`,import.meta.url).href;photos.set(target,img);}const img=photos.get(target);await img.decode();if(id!==loadId)return;medium=target;picture.src=img.src;picture.alt=dual?`寫實水槽，上方空氣，下方${geometry(medium,angle).name}；A、B 兩端光源可獨立開關。`:`介質剖面，上方${geometry(medium,angle).name}、下方空氣，光由上往下射。`;root.querySelectorAll('.return-detail-photo,.exit-media-photo').forEach(p=>p.setAttribute('href',img.src));state='ready';render();}
 catch{if(id!==loadId)return;state='error';$('#return-retry').hidden=false;render();}
}
$('#return-retry').onclick=()=>prepare(requested,true);
const observer=new ResizeObserver(render);observer.observe(viewport);observer.observe(zoom);
document.addEventListener('visibilitychange',()=>{if(document.hidden)press=null;});render();prepare('water');

}
mountReturnLab('#exit-lab','exit',false);
mountReturnLab('#return-lab','return',true);
