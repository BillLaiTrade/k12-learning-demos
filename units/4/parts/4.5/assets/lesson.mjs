import {initialiseFrontMix} from './mix-lab.mjs?v=mix-dialogue-20261106';
import {initialisePrecisionPrism} from './precision-prism.mjs?v=compare-scale-final-20261107';
import {LIGHTS,MATERIALS,FILTERS,materialLight,filterLight,eyeLight,colorName,channelsText,rgbCss,prismRays} from './color-model.mjs?v=science-reviewed-20261106';
import {prismDiagram,materialDiagram,drawScreen,drawObservation} from './rendering.mjs?v=science-reviewed-20261106';
import {surfaceObservation} from './surface-model.mjs?v=surface-dialogue-20261107';
import {filterPaperObservation} from './filter-paper-model.mjs?v=science-reviewed-20261106';
let studioModule=null;
const text=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value;};
const pressed=(root,selector,key)=>root.querySelectorAll(selector).forEach(b=>b.setAttribute('aria-pressed',String(b.getAttribute(selector.slice(1,-1))===key)));
function ready(root){root.querySelectorAll('[data-pending]').forEach(e=>e.disabled=false);root.querySelectorAll('[data-rays],[data-view]').forEach(e=>e.disabled=false);root.querySelector('[data-load-note]').hidden=true;root.dataset.ready='true';}
function condition(root,pairs){const node=root.querySelector('[data-conditions]');node.replaceChildren();for(const[label,value]of pairs){const s=document.createElement('span');s.append(label+'：');const b=document.createElement('strong');b.textContent=value;s.append(b);node.append(s);}}
function channels(root,groups){
 const row=root.querySelector('[data-channels]');if(!row)return;const slots=[...row.querySelectorAll('[data-channel-slot]')];if(!slots.length)row.replaceChildren();let index=0;
 const surface=root.dataset.lab==='surface'||!!root.querySelector('.path-workspace');
 for(const[label,rgb,description]of groups){
  const cell=document.createElement('div');cell.className='channel-cell';
  const name=document.createElement('span');name.className='label';name.textContent=label;
  const value=document.createElement('strong');value.textContent=description||channelsText(rgb);
  const dots=document.createElement('div');dots.className=surface?'surface-channel-bars':'channel-dots';dots.setAttribute('aria-hidden','true');
  ['#dd6b5b','#58a574','#5888c6'].forEach((color,i)=>{
   if(surface){
    const bar=document.createElement('span');bar.className='surface-channel-bar';
    const label=document.createElement('span');label.textContent=['紅','綠','藍'][i];
    const track=document.createElement('i'),fill=document.createElement('b');
    fill.style.backgroundColor=color;fill.style.width=`${rgb[i]*100}%`;
    track.append(fill);bar.append(label,track);dots.append(bar);
   }else{
    const dot=document.createElement('i');dot.style.setProperty('--channel',color);dot.style.setProperty('--strength',Math.max(.06,rgb[i]));dots.append(dot);
   }
  });cell.append(name,value,dots);if(slots.length)slots[index++].replaceChildren(cell);else row.append(cell);
 }
}
function surfaceChannels(root,observation){
 const {signal,incoming,reflected,absorbed}=observation;
 channels(root,[['照過來的光',signal.incoming,incoming],['反射出去的光',signal.outgoing,reflected],['被吸收的光',signal.absorbed,absorbed]]);
}

function initialiseLab(root,index){
 const kind=root.dataset.lab;if(kind==='prism'&&root.dataset.precision==='true'){initialisePrecisionPrism(root);return;}if(kind==='mix'){initialiseFrontMix(root);return;}
 const state={kind,inserted:root.dataset.inserted==='true',light:root.dataset.initialLight||'white',material:root.dataset.initialMaterial||(kind==='eye'?'green':'red'),filter:root.dataset.initialFilter||(kind==='eye'?'green':'clear'),mode:'reflection',blocked:false,rays:true,view:false};
 const $=s=>root.querySelector(s),diagram=$('[data-diagram]'),canvas=$('[data-studio]');let studio=null,loading=false,signal=null;
 function update(){
  root.dataset.state=JSON.stringify(state);
  if(kind==='prism'){
   const rays=prismRays(state.light,state.inserted);diagram.innerHTML=prismDiagram(state,`prism-${index}`);drawScreen($('[data-receiver]'),state);
   root.dataset.spectrum=String(rays.length);root.dataset.landing=JSON.stringify(rays.map(r=>r.landing));
   condition(root,[['光源',LIGHTS[state.light].name],['三稜鏡',state.inserted?'在光路中':'已移開'],['白幕','位置固定']]);
   text($('[data-receiver-label]'),state.inserted?(state.light==='white'?'同一白幕的色帶局部放大。':'白幕局部放大，主要收到'+LIGHTS[state.light].name+'。'):'同一白幕局部放大，收到'+LIGHTS[state.light].name+'。');
   text($('[data-result]'),!state.inserted?`三稜鏡已移開，${LIGHTS[state.light].name}直接到達白幕。把三稜鏡放回光路，比較白幕上的變化。`:state.light==='white'?'白光通過三稜鏡後，不同色光偏折的程度不同，在白幕上形成連續的色帶。':'這次照入的是'+LIGHTS[state.light].name+'。通過三稜鏡後方向改變，但沒有變成一整條彩色帶。');
  }else{
   const observation=kind==='surface'?surfaceObservation(state.light,state.material):kind==='filter'?filterPaperObservation(state.light,state.filter,state.material):null;
   signal=observation?.signal||(kind==='eye'?eyeLight(state.mode,state.blocked):kind==='filter'?filterLight(state.light,state.filter):materialLight(state.light,state.material));
   diagram.innerHTML=materialDiagram(state,`material-${index}`,signal);drawObservation($('[data-receiver]'),state,signal);
   root.dataset.outgoing=JSON.stringify(signal.outgoing);root.dataset.received=JSON.stringify(signal.received||signal.outgoing);
   const output=kind==='eye'?signal.received:signal.outgoing;$('[data-receiver]').closest('.receiver').dataset.dark=String(Math.max(...output)<.045);
   if(kind==='surface'){
    root.dataset.incoming=JSON.stringify(signal.incoming);root.dataset.absorbed=JSON.stringify(signal.absorbed);
    condition(root,[['照明',LIGHTS[state.light].name],['物體',MATERIALS[state.material].name],['觀察位置','固定']]);
    text($('[data-surface-observation]'),observation.observation);text($('[data-result]'),observation.result);text($('[data-surface-name]'),observation.name);text($('[data-receiver-label]'),observation.preview);
   }else if(kind==='filter'){
    condition(root,[['光源',LIGHTS[state.light].name],['色片',FILTERS[state.filter].name],['紙張',MATERIALS[state.material].name.replace('色色卡','紙')]]);
    root.dataset.incoming=JSON.stringify(signal.incoming);root.dataset.transmitted=JSON.stringify(signal.transmitted);
    root.dataset.filterAbsorbed=JSON.stringify(signal.filterAbsorbed);root.dataset.paperAbsorbed=JSON.stringify(signal.paperAbsorbed);
    text($('[data-result]'),observation.result);text($('[data-receiver-label]'),observation.preview);
   }else{
    condition(root,[['光源','白光固定'],['情境',state.mode==='reflection'?'綠色色卡反射':'綠色色片透射'],['物體到眼睛',state.blocked?'被遮住':'光路暢通']]);
    text($('[data-result]'),state.blocked?'光源與物體沒有改變，但遮光板擋住物體到眼睛的這條光路，因此看不到原本的顏色。':state.mode==='reflection'?'白光照到綠色色卡，反射的光進入眼睛，形成看見綠色的視覺感受。':'白光通過綠色色片，透射的光進入眼睛，形成看見綠色的視覺感受。');
    text($('[data-receiver-label]'),state.blocked?'這條光路被遮住，眼睛看不到原物體的顏色。':`從這條光路接收到的色光呈${colorName(output)}。`);
    text($('[data-comparison-note]'),`白光與${state.mode==='reflection'?'綠色色卡':'綠色色片'}固定 · ${state.blocked?'物體到眼睛的光路被遮住':'光可以到達眼睛'}`);
    text($('[data-blocker]'),state.blocked?'移開遮光板':'放入遮光板');$('[data-blocker]').setAttribute('aria-pressed',String(state.blocked));
   }
   if(kind==='surface')surfaceChannels(root,observation);
   else if(kind==='filter')channels(root,[['光源提供的光',signal.incoming],['通過色片的光',signal.transmitted],['紙張反射到眼睛的光',signal.outgoing]]);
   else channels(root,kind==='eye'?[['光源提供',signal.incoming],['離開物體',signal.outgoing],['到達眼睛',signal.received,state.blocked?'這條光路被擋住':channelsText(signal.received)]]:[['照過來的光',signal.incoming],[kind==='filter'?'通過色片':'反射出去',signal.outgoing],['被吸收的部分',signal.absorbed,Math.max(...signal.absorbed)===0?'沒有色光被吸收':channelsText(signal.absorbed)]]);
  }
  for(const[attr,key]of[['data-prism',state.inserted?'in':'out'],['data-light',state.light],['data-material',state.material],['data-filter',state.filter],['data-eye-mode',state.mode]])pressed(root,`[${attr}]`,key);
  root.querySelectorAll('select[data-filter-setting]').forEach(select=>{const value=state[select.dataset.filterSetting];if(select.value!==value)select.value=value;});
  text($('[data-rays]'),state.rays?'隱藏輔助光路':'顯示輔助光路');$('[data-rays]').setAttribute('aria-pressed',String(state.rays));text($('[data-view]'),state.view?'返回斜向觀察':'俯看實驗台');$('[data-view]').setAttribute('aria-pressed',String(state.view));
  studio?.update(state,signal);
 }
 root.addEventListener('click',event=>{
  const b=event.target.closest('button,[data-prism-hit]');if(!b||b.disabled)return;
  if(b.hasAttribute('data-prism'))state.inserted=b.dataset.prism==='in';
  else if(b.hasAttribute('data-prism-hit'))state.inserted=!state.inserted;
  else if(b.hasAttribute('data-light'))state.light=b.dataset.light;
  else if(b.hasAttribute('data-material'))state.material=b.dataset.material;
  else if(b.hasAttribute('data-filter'))state.filter=b.dataset.filter;
  else if(b.hasAttribute('data-eye-mode'))state.mode=b.dataset.eyeMode;
  else if(b.hasAttribute('data-blocker'))state.blocked=!state.blocked;
  else if(b.hasAttribute('data-rays'))state.rays=!state.rays;
  else if(b.hasAttribute('data-view')){state.view=!state.view;studio?.setView(state.view);}
  else return;update();
 });
 root.addEventListener('change',event=>{
  const select=event.target;if(kind!=='filter'||!select.matches('select[data-filter-setting]')||select.matches(':disabled'))return;
  const key=select.dataset.filterSetting,options={light:LIGHTS,filter:FILTERS,material:MATERIALS};
  if(!Object.hasOwn(options,key)||!Object.hasOwn(options[key],select.value))return;
  state[key]=select.value;update();
 });
 root.addEventListener('keydown',event=>{if(event.target.matches('[data-prism-hit]')&&['Enter',' '].includes(event.key)){event.preventDefault();state.inserted=!state.inserted;update();}});
 function fallback(){canvas.hidden=true;diagram.hidden=false;root.dataset.renderer='diagram';$('[data-view]').hidden=true;const note=$('[data-load-note]');note.classList.add('is-fallback');note.hidden=false;text(note,'立體觀察暫時無法使用，這裡改用同一組條件的平面光路示意；操作與近看仍可使用。');}
 async function loadStudio(){
  if(loading||studio)return;loading=true;
  try{studioModule ||= import('./studio.mjs?v=view-angle-match-20261107');const module=await studioModule;studio=module.createStudio(root,{prism(value){state.inserted=value;update();},unavailable:fallback});canvas.hidden=false;diagram.hidden=true;studio.update(state,signal);studio.setView(state.view);root.dataset.renderer='three';}
  catch{fallback();}
 }
 ready(root);update();root.dataset.renderer='diagram';
 const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();loadStudio();}},{rootMargin:'180px'});observer.observe(root);
}

function initialiseQuiz(){
 const root=document.querySelector('.duo-quiz');
 import('./duo-quiz.mjs?v=quiz-no-route-hint-20261107').then(module=>module.initialiseDuoQuiz(root)).catch(error=>{root.querySelector('[data-duo-load-note]').hidden=false;console.error('4.5 quiz failed',error);});
}

document.querySelectorAll('[data-lab]').forEach((root,i)=>{try{initialiseLab(root,i);}catch(error){root.dataset.ready='false';const hint=root.querySelector('[data-load-note]');if(hint){hint.hidden=false;text(hint,'這個互動暫時無法載入，請重新整理後再試；仍可閱讀對話與說明。');}console.error('4.5 lab failed',error);}});
initialiseQuiz();
const nav=[...document.querySelectorAll('.route a')],sections=nav.map(a=>document.querySelector(a.hash));
// 以區塊主標為來源；HTML 仍保留無 JavaScript 時可閱讀的導覽文字。
nav.forEach((link,i)=>{
 const title=sections[i]?.querySelector(':scope > header h2')?.textContent.trim();
 if(!title)return;
 if(link.classList.contains('quiz-nav')){
  const kicker=sections[i].querySelector('.quiz-kicker')?.textContent.trim();
  link.title=title;if(kicker)link.setAttribute('aria-label',link.dataset.navLabel||`${kicker}：${title}`);
 }else{const label=link.querySelector('span');if(label)label.textContent=title;}
});
function active(id){for(const link of nav){if(link.hash==='#'+id)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');}}
let queued=false;addEventListener('scroll',()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;let selected=sections[0];for(const section of sections)if(section.getBoundingClientRect().top<innerHeight*.4)selected=section;active(selected.id);});},{passive:true});
nav.forEach(a=>a.addEventListener('click',()=>active(a.hash.slice(1))));

if(sections.some(s=>s.id===location.hash.slice(1)))active(location.hash.slice(1));
