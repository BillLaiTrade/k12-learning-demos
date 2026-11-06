import {mediumSelector} from './medium-selector.mjs?v=20261103-concept1';
import {geometry,clampAngle,angleFromSource,arrow,reciprocalSnapshot} from './return-refraction-model.mjs?v=20261105-review1';
import {createReciprocalView} from './return-refraction-view.mjs?v=20261103-roles1';
import {revealExperiment} from './experiment-viewport.mjs?v=20261105-eleven1';
const root=document.querySelector('#return-lab');
const $=s=>root.querySelector(s),scene=$('#return-scene'),devices=$('#return-devices'),picture=$('#return-background'),input=$('#return-angle');
const keys=['a','b'],lights={a:false,b:false},photos=new Map();
const playback={a:{elapsed:0},b:{elapsed:0}};
let frame=0,lastTime=0,inView=true;
let medium='water',requested='water',angle=30,state='loading',loadId=0,press=null;
const selectorControl=mediumSelector($('#return-medium-toggle'),key=>{if(key!==requested||state==='error')prepare(key);});
function source(key,id){return `<g class="return-source${key==='b'?' source':''}" data-source="${key}" tabindex="0" role="slider" aria-label="${key.toUpperCase()} ${key==='a'?'紅':'藍'}光，點擊開關，拖曳或方向鍵調角" aria-keyshortcuts="Enter Space" aria-valuemin="0" aria-valuemax="60" aria-valuenow="30">
 <rect class="return-source-hit" x="-48" y="-82" width="96" height="96" fill="transparent"/>
 <rect class="return-source-focus" x="-42" y="-86" width="84" height="105" rx="15"/>
 <rect x="-35" y="-78" width="70" height="69" rx="13" fill="url(#return-metal-${id})" stroke="#131e20" stroke-width="2"/>
 <path d="M-23-69V-25M-18-69V-25" stroke="#9aa5a1" stroke-width="2" opacity=".45"/>
 <rect x="-38" y="-23" width="76" height="16" rx="5" fill="url(#return-rim-${id})"/>
 <ellipse cx="0" cy="-5" rx="35" ry="15" fill="url(#return-rim-${id})" stroke="#162423" stroke-width="2"/>
 <ellipse class="return-lens" cx="0" cy="-3" rx="26" ry="10" fill="#243c3c" stroke="#111d1c" stroke-width="2"/>
 <text class="return-device-letter" x="0" y="-42" text-anchor="middle" ${key==='b'?'transform="rotate(180 0 -49)"':''}>${key.toUpperCase()}</text>
 </g>`;}
const id='return-main';
scene.innerHTML=`<defs>
 <filter id="beam-glow-${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>
 <linearGradient id="return-metal-${id}" x1="0" x2="1"><stop stop-color="#10191b"/><stop offset=".18" stop-color="#6d7777"/><stop offset=".4" stop-color="#263033"/><stop offset=".78" stop-color="#101719"/><stop offset="1" stop-color="#414b4c"/></linearGradient>
 <linearGradient id="return-rim-${id}"><stop stop-color="#555d5b"/><stop offset=".3" stop-color="#d5d9d1"/><stop offset=".55" stop-color="#545e5b"/><stop offset="1" stop-color="#111c1b"/></linearGradient>
</defs>
<path class="return-normal-underlay"/><path class="return-normal"/>
<g class="return-angle-marks" visibility="hidden" aria-hidden="true">
 <path class="return-angle-sector return-upper-sector"/><path class="return-angle-sector return-lower-sector"/>
 <path class="return-angle-arc return-upper-arc"/><path class="return-angle-arc return-lower-arc"/>
 <g class="return-angle-label return-upper-label"><path class="return-angle-leader"/><text><tspan class="return-angle-name">空氣側</tspan><tspan class="return-angle-number">41.8°</tspan></text></g>
 <g class="return-angle-label return-lower-label"><path class="return-angle-leader"/><text><tspan class="return-angle-name">水側</tspan><tspan class="return-angle-number">30°</tspan></text></g>
</g>
${keys.map(key=>`<g class="return-light return-light-${key}" visibility="hidden"><path class="return-beam-halo" filter="url(#beam-glow-${id})"/><path class="return-beam return-beam-${key}"/><path class="return-beam-core"/><path class="return-direction return-direction-${key}" data-segment="0"/><path class="return-direction return-direction-${key}" data-segment="1"/></g>`).join('')}
<g class="return-medium-badge"><rect/><text data-sized>空氣</text></g><g class="return-medium-badge"><rect/><text data-sized class="return-medium-name">水</text></g>`;
devices.innerHTML=keys.map(key=>source(key,id)).join('');
const presentation=createReciprocalView(root,scene,devices);
function render(){
 presentation.layout();
 const g=geometry(medium,angle),active=state==='ready'&&(lights.a||lights.b),both=lights.a&&lights.b;
 root.dataset.state=state;root.dataset.medium=medium;root.dataset.angle=String(angle);root.dataset.airAngle=String(g.airAngle);root.dataset.lightA=String(lights.a);root.dataset.lightB=String(lights.b);root.setAttribute('aria-busy',String(state==='loading'));
 input.value=String(angle);$('#return-angle-value').value=`${angle}°`;$('#return-air-value').textContent=`${g.airAngle.toFixed(1)}°`;$('#return-water-value').textContent=`${angle}°`;const caption=lights.a&&!lights.b?'折射角':lights.b&&!lights.a?'入射角':`${g.name}側角度`;$('#return-angle-caption').textContent=caption;input.setAttribute('aria-label',`${caption}，從法線量起`);
 const matrix=scene.getScreenCTM(),ratio=Math.max(.05,Math.hypot(matrix.a,matrix.b)),scale=Math.max(.8,30/(70*ratio));
 scene.querySelectorAll('[data-sized]').forEach(e=>e.style.fontSize=`${Math.max(22,15/ratio)}px`);scene.querySelector('.return-medium-name').textContent=g.name;
 presentation.labels(ratio);presentation.angles(g,active,ratio,lights);
 for(const key of keys){
  const group=scene.querySelector(`.return-light-${key}`);
  group.setAttribute('visibility',lights[key]&&state==='ready'?'visible':'hidden');
  group.querySelector('.return-beam').setAttribute('stroke-width',String(Math.max(key==='a'&&both?8:4,(key==='a'&&both?5:2.6)/ratio)));group.querySelector('.return-beam-halo').setAttribute('stroke-width',String((key==='a'&&both?14:11)/ratio));group.querySelector('.return-beam-core').setAttribute('stroke-width',String((key==='a'&&both?0:1)/ratio));
  const lamp=devices.querySelector(`[data-source=${key}]`),p=key==='a'?g.sourceA:g.sourceB,value=key==='a'?g.airAngle:angle,maximum=key==='a'?geometry(medium,35).airAngle:35;
  lamp.setAttribute('transform',`translate(${p.join(' ')}) rotate(${key==='a'?-g.airAngle:180-angle}) scale(${scale})`);lamp.setAttribute('aria-disabled',String(state!=='ready'));lamp.setAttribute('tabindex',state==='ready'?'0':'-1');lamp.setAttribute('aria-valuemax',String(maximum));lamp.setAttribute('aria-valuenow',String(value));lamp.setAttribute('aria-valuetext',`${key.toUpperCase()} ${value.toFixed(1)}度，${lights[key]?'開啟':'關閉'}；拖曳或方向鍵調角，另一端同步對準`);lamp.querySelector('.return-device-letter').style.fontSize=`${Math.max(22,14/(ratio*scale))}px`;lamp.querySelector('.return-lens').setAttribute('fill',lights[key]&&state==='ready'?(key==='a'?'#ff767b':'#74c9ff'):'#243c3c');
  const size=Math.max(96,45/(ratio*scale));for(const[k,v]of Object.entries({x:-size/2,y:-34-size/2,width:size,height:size}))lamp.querySelector('.return-source-hit').setAttribute(k,String(v));
  const button=$(`#return-toggle-${key}`);button.disabled=state!=='ready';button.setAttribute('aria-pressed',String(lights[key]));button.querySelector('small').textContent=lights[key]?'開啟':'關閉';
 }
 for(const badge of scene.querySelectorAll('.return-medium-badge')){const boxes=[...badge.querySelectorAll('text')].map(e=>e.getBBox()),x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y)),pad=5/ratio;for(const[k,v]of Object.entries({x:x-pad,y:y-pad*.6,width:Math.max(...boxes.map(b=>b.x+b.width))-x+2*pad,height:Math.max(...boxes.map(b=>b.y+b.height))-y+1.2*pad,rx:7/ratio}))badge.querySelector('rect').setAttribute(k,String(v));}
 const angleDescription=both?`空氣側${g.airAngle.toFixed(1)}度，${g.name}側${angle}度`:lights.a?`入射角${g.airAngle.toFixed(1)}度，折射角${angle}度`:lights.b?`入射角${angle}度，折射角${g.airAngle.toFixed(1)}度`:'兩支光源關閉';
 scene.setAttribute('aria-label',`空氣在上方，${g.name}在下方。${angleDescription}${active?'，角度皆從法線量起':''}。A紅光${lights.a?'開啟':'關閉'}，B藍光${lights.b?'開啟':'關閉'}。`);
 input.disabled=state!=='ready';$('.return-angle-control').hidden=!active;$('#return-angle-summary').hidden=!active;selectorControl.render(requested);drawBeams();
 $('#return-status').classList.toggle('visually-hidden',state!=='error');$('#return-status').textContent=state==='loading'?'正在準備實驗場景……':state==='error'?'場景未能載入，請重試或切換介質。':'點擊開關光源；拖動 A 或 B 調角，另一端自動對準。';
}
function drawBeams(){
 const g=geometry(medium,angle),matrix=scene.getScreenCTM(),ratio=Math.max(.05,Math.hypot(matrix.a,matrix.b));
 for(const key of keys){
  const group=scene.querySelector(`.return-light-${key}`),snap=reciprocalSnapshot(g,key,playback[key].elapsed);
  const d=snap.segments.filter(s=>s.fraction>0).map(s=>`M${s.from.join(' ')}L${s.end.join(' ')}`).join('');
  group.querySelectorAll('.return-beam,.return-beam-halo,.return-beam-core').forEach(p=>p.setAttribute('d',d));
  group.querySelectorAll('.return-direction').forEach((head,i)=>{const segment=snap.segments[i],at=key==='a'?.32:.36,size=Math.max(12,8/ratio),length=Math.hypot(segment.to[0]-segment.from[0],segment.to[1]-segment.from[1]);head.setAttribute('d',segment.fraction>=at+size/length?arrow(segment.from,segment.to,at,size):'');});
  root.dataset[`progress${key.toUpperCase()}`]=String(Math.min(1,playback[key].elapsed/snap.durationMs));
 }
 const active=state==='ready'&&(lights.a||lights.b),both=active&&lights.a&&lights.b;
 const completeActive=active&&keys.every(key=>!lights[key]||reciprocalSnapshot(g,key,playback[key].elapsed).complete);
 const marks=scene.querySelector('.return-angle-marks');marks.setAttribute('visibility',completeActive?'visible':'hidden');marks.setAttribute('aria-hidden',String(!completeActive));
 $('#return-route').hidden=!active;
 $('#return-route').textContent=!active?'':!completeActive?'光路展開後顯示角度':both?'A → M → B　／　B → M → A':lights.b?`光速慢 → 快；入射角 ${angle}° → 折射角 ${g.airAngle.toFixed(1)}°`:`光速快 → 慢；入射角 ${g.airAngle.toFixed(1)}° → 折射角 ${angle}°`;
 const complete=both&&keys.every(key=>reciprocalSnapshot(g,key,playback[key].elapsed).complete);
 const finding=both?(complete?'往返光路重合，方向相反':'觀察兩束光的路徑與方向'):!active?'分別開啟 A、B，再比較兩個方向':lights.b?'B → M → A：從下方射回空氣':'A → M → B：從空氣射入下方';
 if($('#return-finding').textContent!==finding)$('#return-finding').textContent=finding;
}
function stopAnimation(){cancelAnimationFrame(frame);frame=0;lastTime=0;}
function tick(now){
 const delta=lastTime?Math.max(0,now-lastTime):0;lastTime=now;let running=false;
 const g=geometry(medium,angle);
 for(const key of keys)if(lights[key]){const duration=reciprocalSnapshot(g,key).durationMs;playback[key].elapsed=Math.min(duration,playback[key].elapsed+delta);running ||= playback[key].elapsed<duration;}
 drawBeams();root.dataset.playback=running?'running':'complete';
 if(running)frame=requestAnimationFrame(tick);else {frame=0;lastTime=0;}
}
function resumeAnimation(){
 if(frame||state!=='ready')return;
 const g=geometry(medium,angle),running=keys.some(key=>lights[key]&&!reciprocalSnapshot(g,key,playback[key].elapsed).complete);
 root.dataset.playback=running?(inView&&!document.hidden?'running':'suspended'):'complete';
 if(running&&inView&&!document.hidden){lastTime=performance.now();frame=requestAnimationFrame(tick);}
}
function restartActive(){stopAnimation();for(const key of keys)playback[key].elapsed=0;render();resumeAnimation();}
function toggle(key){if(state!=='ready')return;if(!lights[key])revealExperiment($('#return-viewport'),$('.return-control-deck'));lights[key]=!lights[key];playback[key].elapsed=0;render();resumeAnimation();}
function setAngle(value){if(state!=='ready')return;const next=clampAngle(value);if(next===angle)return;angle=next;restartActive();}
for(const key of keys)$(`#return-toggle-${key}`).onclick=()=>toggle(key);
input.oninput=()=>setAngle(Number(input.value));
root.addEventListener('keydown',e=>{const lamp=e.target.closest('.return-source');if(!lamp||state!=='ready')return;if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!e.repeat)toggle(lamp.dataset.source);return;}const step={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1}[e.key];if(step!==undefined||e.key==='Home'||e.key==='End'){e.preventDefault();setAngle(e.key==='Home'?0:e.key==='End'?35:angle+step);}});
const point=e=>new DOMPoint(e.clientX,e.clientY).matrixTransform(devices.getScreenCTM().inverse());
devices.addEventListener('pointerdown',e=>{const lamp=e.target.closest('.return-source');if(!lamp||state!=='ready'||e.button!==0)return;e.preventDefault();const p=point(e),g=geometry(medium,angle),key=lamp.dataset.source,origin=key==='a'?g.sourceA:g.sourceB;press={key,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,dx:p.x-origin[0],dy:p.y-origin[1]};devices.setPointerCapture(e.pointerId);lamp.focus({preventScroll:true});});
devices.addEventListener('pointermove',e=>{if(!press||press.id!==e.pointerId)return;if(Math.hypot(e.clientX-press.x,e.clientY-press.y)>5)press.moved=true;if(press.moved){const p=point(e);setAngle(angleFromSource(medium,press.key,p.x-press.dx,p.y-press.dy));}});
devices.addEventListener('pointerup',e=>{if(press?.id===e.pointerId&&!press.moved)toggle(press.key);press=null;});devices.addEventListener('pointercancel',()=>press=null);devices.addEventListener('lostpointercapture',()=>press=null);
devices.addEventListener('click',e=>{const lamp=e.target.closest('.return-source');if(lamp&&e.detail===0)toggle(lamp.dataset.source);});devices.addEventListener('touchstart',e=>{if(e.target.closest('.return-source')&&state==='ready')e.preventDefault();},{passive:false});
async function prepare(target,retry=false){
 stopAnimation();const id=++loadId;requested=target;state='loading';press=null;$('#return-retry').hidden=true;render();
 try{if(!photos.has(target)||retry){const img=new Image();img.src=new URL(`oblique-entry-${target}.png${retry?`?retry=${Date.now()}`:''}`,import.meta.url).href;photos.set(target,img);}const img=photos.get(target);await img.decode();if(id!==loadId)return;medium=target;picture.src=img.src;picture.alt=`上方空氣，下方${geometry(medium,angle).name}；A、B兩端光源可獨立開關。`;root.querySelectorAll('.return-medium-photo').forEach(p=>p.setAttribute('href',img.src));state='ready';restartActive();}
 catch{if(id!==loadId)return;state='error';$('#return-retry').hidden=false;render();}
}
$('#return-retry').onclick=()=>prepare(requested,true);
const observer=new ResizeObserver(render);observer.observe($('#return-viewport'));observer.observe($('.return-control-deck'));const route=document.querySelector('.route');if(route)observer.observe(route);window.addEventListener('resize',render);window.visualViewport?.addEventListener('resize',render);document.addEventListener('visibilitychange',()=>{if(document.hidden){press=null;stopAnimation();root.dataset.playback='suspended';}else resumeAnimation();});new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)resumeAnimation();else {stopAnimation();root.dataset.playback='suspended';}},{threshold:0}).observe($('#return-viewport'));render();prepare('water');
