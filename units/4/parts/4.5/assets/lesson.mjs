import {initialiseFrontMix} from './mix-lab.mjs?v=mix-soft-beam-20261103';
import {initialisePrecisionPrism} from './precision-prism.mjs?v=prism-source-comparison-20261102';
import {LIGHTS,MATERIALS,FILTERS,materialLight,filterLight,eyeLight,colorName,channelsText,rgbCss,prismRays,QUIZ} from './color-model.mjs';
import {prismDiagram,materialDiagram,drawScreen,drawObservation} from './rendering.mjs';
let studioModule=null;
const text=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value;};
const pressed=(root,selector,key)=>root.querySelectorAll(selector).forEach(b=>b.setAttribute('aria-pressed',String(b.getAttribute(selector.slice(1,-1))===key)));
function ready(root){root.querySelectorAll('[data-pending]').forEach(e=>e.disabled=false);root.querySelectorAll('[data-rays],[data-view]').forEach(e=>e.disabled=false);root.querySelector('[data-load-note]').hidden=true;root.dataset.ready='true';}
function condition(root,pairs){const node=root.querySelector('[data-conditions]');node.replaceChildren();for(const[label,value]of pairs){const s=document.createElement('span');s.append(label+'：');const b=document.createElement('strong');b.textContent=value;s.append(b);node.append(s);}}
function channels(root,groups){
 const row=root.querySelector('[data-channels]');if(!row)return;row.replaceChildren();
 for(const[label,rgb]of groups){const cell=document.createElement('div');cell.className='channel-cell';const name=document.createElement('span');name.className='label';name.textContent=label;const value=document.createElement('strong');value.textContent=channelsText(rgb);const dots=document.createElement('div');dots.className='channel-dots';dots.setAttribute('aria-hidden','true');['#dd6b5b','#58a574','#5888c6'].forEach((color,i)=>{const dot=document.createElement('i');dot.style.setProperty('--channel',color);dot.style.setProperty('--strength',Math.max(.06,rgb[i]));dots.append(dot);});cell.append(name,value,dots);row.append(cell);}
}

function initialiseLab(root,index){
 const kind=root.dataset.lab;if(kind==='prism'&&root.dataset.precision==='true'){initialisePrecisionPrism(root);return;}if(kind==='mix'){initialiseFrontMix(root);return;}
 const state={kind,inserted:root.dataset.inserted==='true',light:'white',material:kind==='eye'?'green':'red',filter:kind==='eye'?'green':'clear',step:'filter',mode:'reflection',blocked:false,rays:true,view:false};
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
   signal=kind==='eye'?eyeLight(state.mode,state.blocked):kind==='filter'?filterLight(state.light,state.filter):materialLight(state.light,state.material);
   diagram.innerHTML=materialDiagram(state,`material-${index}`,signal);drawObservation($('[data-receiver]'),state,signal);
   root.dataset.outgoing=JSON.stringify(signal.outgoing);root.dataset.received=JSON.stringify(signal.received||signal.outgoing);
   const output=kind==='eye'?signal.received:signal.outgoing;$('[data-receiver]').closest('.receiver').dataset.dark=String(Math.max(...output)<.045);
   if(kind==='surface'){
    condition(root,[['照明','白光固定'],['物體',MATERIALS[state.material].name],['觀察位置','固定']]);
    text($('[data-result]'),state.material==='black'?'黑色色卡吸收較多可見光，反射較少，所以在這個白光照明下看起來很暗。':state.material==='white'?'白色色卡反射較多種類的可見光，因此在白光下看起來接近白色。':`同樣的白光照到${MATERIALS[state.material].name}，主要反射${channelsText(signal.outgoing)}光；其他部分較多被吸收。`);
    text($('[data-receiver-label]'),`白光下的${MATERIALS[state.material].name}，主要反射的光呈${colorName(output)}。`);
   }else if(kind==='lighting'){
    condition(root,[['同一物體',MATERIALS[state.material].name],['目前照明',LIGHTS[state.light].name],['左側參照','白光下的同一色卡']]);
    text($('[data-result]'),`物體仍是${MATERIALS[state.material].name}。在${LIGHTS[state.light].name}下，這次反射的光讓它看起來${colorName(output)}。外觀由照明與材料的反射特性共同決定。`);
    text($('[data-receiver-label]'),'左邊保留白光下的參照；右邊只隨目前照明更新。');
   }else if(kind==='filter'){
    condition(root,[['照明',LIGHTS[state.light].name],['色片',FILTERS[state.filter].name],['本次只改',state.step==='filter'?'透明色片':'照明']]);
    text($('[data-result]'),state.filter==='clear'?`${LIGHTS[state.light].name}直接到達白幕。放入一片透明色片，再比較通過的光。`:`${LIGHTS[state.light].name}通過${FILTERS[state.filter].name}後，白幕收到的光看起來${colorName(output)}。色片選擇性地讓部分色光通過，並吸收其他部分。`);
    text($('[data-receiver-label]'),Math.max(...output)<.045?'這次透過的光很少，白幕顯得很暗。':`白幕主要收到${channelsText(output)}光。`);
    root.querySelectorAll('[data-filter]').forEach(b=>b.disabled=state.step!=='filter');root.querySelectorAll('[data-light]').forEach(b=>b.disabled=state.step!=='light');
   }else{
    condition(root,[['光源','白光固定'],['情境',state.mode==='reflection'?'綠色色卡反射':'綠色色片透射'],['物體到眼睛',state.blocked?'被遮住':'光路暢通']]);
    text($('[data-result]'),state.blocked?'光源與物體沒有改變，但遮光板擋住物體到眼睛的這條光路，因此看不到原本的顏色。':state.mode==='reflection'?'白光照到綠色色卡，反射的光進入眼睛，形成看見綠色的視覺感受。':'白光通過綠色色片，透射的光進入眼睛，形成看見綠色的視覺感受。');
    text($('[data-receiver-label]'),state.blocked?'這條光路被遮住，眼睛看不到原物體的顏色。':`從這條光路接收到的色光呈${colorName(output)}。`);
    text($('[data-blocker]'),state.blocked?'移開遮光板':'放入遮光板');$('[data-blocker]').setAttribute('aria-pressed',String(state.blocked));
   }
   channels(root,kind==='eye'?[['光源提供',signal.incoming],['離開物體',signal.outgoing],['到達眼睛',signal.received]]:[['照過來的光',signal.incoming],[kind==='filter'?'通過色片':'反射出去',signal.outgoing],['被吸收的部分',signal.absorbed]]);
  }
  for(const[attr,key]of[['data-prism',state.inserted?'in':'out'],['data-light',state.light],['data-material',state.material],['data-filter',state.filter],['data-filter-step',state.step],['data-eye-mode',state.mode]])pressed(root,`[${attr}]`,key);
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
  else if(b.hasAttribute('data-filter-step')){state.step=b.dataset.filterStep;if(state.step==='filter')state.light='white';}
  else if(b.hasAttribute('data-eye-mode'))state.mode=b.dataset.eyeMode;
  else if(b.hasAttribute('data-blocker'))state.blocked=!state.blocked;
  else if(b.hasAttribute('data-rays'))state.rays=!state.rays;
  else if(b.hasAttribute('data-view')){state.view=!state.view;studio?.setView(state.view);}
  else return;update();
 });
 root.addEventListener('keydown',event=>{if(event.target.matches('[data-prism-hit]')&&['Enter',' '].includes(event.key)){event.preventDefault();state.inserted=!state.inserted;update();}});
 function fallback(){canvas.hidden=true;diagram.hidden=false;root.dataset.renderer='diagram';$('[data-view]').hidden=true;const note=$('[data-load-note]');note.classList.add('is-fallback');note.hidden=false;text(note,'立體觀察暫時無法使用，這裡改用同一組條件的平面光路示意；操作與近看仍可使用。');}
 async function loadStudio(){
  if(loading||studio)return;loading=true;
  try{studioModule ||= import('./studio.mjs');const module=await studioModule;studio=module.createStudio(root,{prism(value){state.inserted=value;update();},unavailable:fallback});canvas.hidden=false;diagram.hidden=true;studio.update(state,signal);studio.setView(state.view);root.dataset.renderer='three';}
  catch{fallback();}
 }
 ready(root);update();root.dataset.renderer='diagram';
 const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();loadStudio();}},{rootMargin:'180px'});observer.observe(root);
}

function initialiseQuiz(){
 const form=document.querySelector('[data-quiz]'),questions=form.querySelector('[data-questions]'),summary=form.querySelector('[data-quiz-summary]');
 for(const [i,q]of QUIZ.entries()){
  const field=document.createElement('fieldset');field.className='quiz-item';field.dataset.question=q.id;const legend=document.createElement('legend');legend.textContent=`${i+1}. ${q.question}`;field.append(legend);
  q.options.forEach((option,j)=>{const label=document.createElement('label');label.className='quiz-option';const input=document.createElement('input');input.type='radio';input.name=q.id;input.value=j;input.id=`answer-${q.id}-${j}`;const copy=document.createElement('span');copy.textContent=option;label.append(input,copy);field.append(label);});
  const feedback=document.createElement('p');feedback.className='quiz-feedback';feedback.hidden=true;field.append(feedback);questions.append(field);
 }
 form.querySelector('[data-submit]').disabled=false;form.querySelector('[data-quiz-reset]').disabled=false;text(summary,'選好各情境的解釋後，再確認這次作答。');form.dataset.ready='true';
 form.addEventListener('submit',event=>{
  event.preventDefault();const missing=QUIZ.find(q=>!form.querySelector(`input[name="${q.id}"]:checked`));
  if(missing){text(summary,'還有情境尚未作答，先完成選擇再確認。');summary.dataset.error='true';form.querySelector(`input[name="${missing.id}"]`).focus();return;}
  let correct=0;for(const q of QUIZ){const selected=Number(form.querySelector(`input[name="${q.id}"]:checked`).value),ok=selected===q.answer;correct+=ok;const field=form.querySelector(`[data-question="${q.id}"]`),feedback=field.querySelector('.quiz-feedback');field.dataset.correct=String(ok);feedback.hidden=false;feedback.replaceChildren(document.createTextNode((ok?'這個解釋符合觀察。':'再對照一下光的去向。')+q.explanation));const link=document.createElement('a');link.href='#'+q.anchor;link.textContent='回看這個實驗';feedback.append(link);}
  summary.dataset.error='false';summary.dataset.score=String(correct);text(summary,correct===QUIZ.length?'四個情境都能用光路說明了！再回想：光源提供什麼、物體改變什麼、眼睛收到什麼？':`這次有${correct}個情境的解釋符合觀察。可以依提示回看實驗，再修改作答。`);
 });
 form.addEventListener('change',event=>{const field=event.target.closest('.quiz-item');if(!field)return;delete field.dataset.correct;field.querySelector('.quiz-feedback').hidden=true;delete summary.dataset.score;text(summary,'作答已更新，請重新確認這次作答。');summary.dataset.error='false';});
 form.querySelector('[data-quiz-reset]').addEventListener('click',()=>{form.reset();form.querySelectorAll('.quiz-item').forEach(f=>{delete f.dataset.correct;f.querySelector('.quiz-feedback').hidden=true;});delete summary.dataset.score;summary.dataset.error='false';text(summary,'已清除作答，可以重新觀察情境。');});
}

document.querySelectorAll('[data-lab]').forEach((root,i)=>{try{initialiseLab(root,i);}catch(error){root.dataset.ready='false';const hint=root.querySelector('[data-load-note]');if(hint){hint.hidden=false;text(hint,'這個互動暫時無法載入，請重新整理後再試；仍可閱讀對話與說明。');}console.error('4.5 lab failed',error);}});
initialiseQuiz();
const nav=[...document.querySelectorAll('.route a')],sections=nav.map(a=>document.querySelector(a.hash));
function active(id){for(const link of nav){if(link.hash==='#'+id)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');}}
let queued=false;addEventListener('scroll',()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;let selected=sections[0];for(const section of sections)if(section.getBoundingClientRect().top<innerHeight*.4)selected=section;active(selected.id);});},{passive:true});
nav.forEach(a=>a.addEventListener('click',()=>active(a.hash.slice(1))));

if(sections.some(s=>s.id===location.hash.slice(1)))active(location.hash.slice(1));
