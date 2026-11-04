import {LIGHTS,FILTERS,rgbCss} from './color-model.mjs';
import {MIX_SETUP,SOURCE_LINEAR} from './mix-optics.mjs';
import {PROBE_SETUP,PRIMARY_KEYS,PAPER_TYPES,COLOUR_OPTIONS,TRANSMISSION_OPTIONS,REFLECTION_OPTIONS,INITIAL_QUESTION,challengeSignal,expectedAnswer,checkPrediction,shuffledQuestions} from './duo-quiz-model.mjs';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const srgb=n=>{n=clamp(n,0,1);return n<=.0031308?n*12.92:1.055*n**(1/2.4)-.055;};
const colourName=key=>COLOUR_OPTIONS.find(o=>o[0]===key)?.[1]||key;
export function challengeDiagram(q,signal,lit){
 const paper=PAPER_TYPES[q.paper],shade=lit?rgbCss(signal.outgoing.map(v=>v*.4)):paper.css;
 return `<svg viewBox="0 0 760 420" role="img" aria-label="兩盞燈${q.filter==='clear'?'直接':`經${FILTERS[q.filter].name}`}照向金框標示的${paper.name}；${lit?'已開燈':'尚未開燈'}">
 <defs><linearGradient id="duo-wood" x2="0" y2="1"><stop stop-color="#8b653f"/><stop offset="1" stop-color="#3c2b1d"/></linearGradient><linearGradient id="duo-metal"><stop stop-color="#1a2420"/><stop offset=".45" stop-color="#65716a"/><stop offset="1" stop-color="#17221d"/></linearGradient></defs>
 <path d="M0 0H760V420H0Z" fill="#283126"/><path d="M20 230L630 160L760 345L140 420Z" fill="url(#duo-wood)"/>
 <path d="M105 348L652 294M111 359L657 305" stroke="#89958b" stroke-width="3"/>
 ${[0,1].map((i)=>`<g transform="translate(${85+i*120} ${255+i*45})"><path d="M0 30h65v12H0Z" fill="#20342b"/><path d="M32 30V-38" stroke="#87938c" stroke-width="7"/><rect x="-7" y="-75" width="88" height="42" rx="12" fill="url(#duo-metal)"/><ellipse cx="82" cy="-54" rx="7" ry="19" fill="${lit?rgbCss(LIGHTS[q.lights[i]].rgb):'#37423b'}"/><text x="27" y="67" fill="#e1eadd" text-anchor="middle" font-size="18">${LIGHTS[q.lights[i]].name}燈</text></g>`).join('')}
 ${lit?[0,1].map(i=>`<path d="M${167+i*120} ${201+i*45}L${q.filter==='clear'?600:405} 215" stroke="${rgbCss(LIGHTS[q.lights[i]].rgb)}" stroke-width="2"/>`).join('')+(q.filter==='clear'?'':`<path d="M414 215L600 181" stroke="${rgbCss(signal.transmitted)}" stroke-width="2"/>`):''}
 ${q.filter==='clear'?'':`<path d="M390 115L450 134V300L390 282Z" fill="${FILTERS[q.filter].css}" fill-opacity=".33" stroke="#a0b8a5" stroke-width="4"/><path d="M420 292V330" stroke="#85948a" stroke-width="7"/><path d="M390 330h61v11h-61Z" fill="#35473b"/><text x="378" y="94" fill="#e0eadf" font-size="19">${FILTERS[q.filter].name}</text>`}
 <path d="M575 77L685 105V286L575 258Z" fill="${shade}" stroke="#f1d28b" stroke-width="5"/><path d="M630 274V313" stroke="#8c9c90" stroke-width="7"/><path d="M598 313h63v12h-63Z" fill="#35473b"/>
 <text x="485" y="45" fill="#fff1ba" font-size="20">本題觀察這張紙</text><path d="M580 51L615 122" stroke="#efd592" stroke-width="2"/><text x="586" y="362" fill="#e0eadf" font-size="20">${paper.name}</text></svg>`;
}

export function initialiseDuoQuiz(root){
 const $=s=>root.querySelector(s),form=$('[data-quiz]'),feedback=$('[data-duo-feedback]'),canvas=$('[data-duo-probe]'),ctx=canvas.getContext('2d');
 const lamps=[{colour:'red',x:.42,y:.5},{colour:'blue',x:.58,y:.5}],handles=[...root.querySelectorAll('[data-probe-spot]')];
 let question=INITIAL_QUESTION,deck=shuffledQuestions().filter(q=>q.id!==question.id),lit=false,studio=null,studioLoading=false,threeFailed=false,drag=null,activeLamp=1,paintFrame=0;
 const pixels=ctx.createImageData(canvas.width,canvas.height);
 function paint(){
  paintFrame=0;const data=pixels.data,P=PROBE_SETUP,centres=lamps.map(s=>[s.x*P.width,s.y*P.height]),sources=lamps.map(s=>SOURCE_LINEAR[PRIMARY_KEYS.indexOf(s.colour)]);
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   const px=(x+.5)/canvas.width*P.width,py=(y+.5)/canvas.height*P.height;
   const a=clamp((1-Math.hypot(px-centres[0][0],py-centres[0][1])/P.radius)/P.edge,0,1),b=clamp((1-Math.hypot(px-centres[1][0],py-centres[1][1])/P.radius)/P.edge,0,1),at=(y*canvas.width+x)*4;
   for(let c=0;c<3;c++)data[at+c]=Math.round(255*srgb(MIX_SETUP.ambient+MIX_SETUP.exposure*(a*sources[0][c]+b*sources[1][c])));data[at+3]=255;
  }ctx.putImageData(pixels,0,0);
 }
 function updateProbe(){
  root.dataset.probe=JSON.stringify(lamps);canvas.setAttribute('aria-label',`白幕上手電筒A的${LIGHTS[lamps[0].colour].name}與手電筒B的${LIGHTS[lamps[1].colour].name}光斑，可移動光斑觀察重疊`);
  lamps.forEach((lamp,i)=>{const handle=handles[i];handle.style.left=lamp.x*100+'%';handle.style.top=lamp.y*100+'%';handle.style.zIndex=i===activeLamp?3:2;handle.setAttribute('aria-label',`移動手電筒${i?'B':'A'}的${LIGHTS[lamp.colour].name}光斑，方向鍵調整位置`);
   const image=$(`[data-probe-torch="${i}"]`);const src=new URL(`./torch-${lamp.colour}.png`,import.meta.url).href;if(image.src!==src)image.src=src;image.style.transform=`rotate(${(lamp.x-(i?.75:.25))*22}deg)`;
   root.querySelectorAll(`[data-probe-lamp="${i}"]`).forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.probeColour===lamp.colour)));
  });if(!paintFrame)paintFrame=requestAnimationFrame(paint);
 }
 function updateScene(){const signal=challengeSignal(question);root.dataset.lit=String(lit);$('[data-challenge-state]').textContent=lit?'題目照明已開啟':'尚未開燈';$('[data-paper-reference]').textContent=`${PAPER_TYPES[question.paper].name}（${lit?'題目照明下':'白光下的外觀'}）`;
  $('[data-duo-fallback]').innerHTML=challengeDiagram(question,signal,lit);studio?.update(question,signal,lit);
  if(lit)root.dataset.signal=JSON.stringify(signal);else delete root.dataset.signal;
 }
 function fallback(){threeFailed=true;studio?.dispose();studio=null;$('[data-challenge-canvas]').hidden=true;$('[data-duo-fallback]').hidden=false;$('[data-scene-help]').textContent='目前以平面光路示意顯示；可繼續作答、開燈與換題。';root.dataset.renderer='diagram';}
 async function loadStudio(){if(studioLoading||threeFailed||studio)return;studioLoading=true;try{const module=await import('./duo-quiz-studio.mjs?v=duo-quiz-20261104');studio=module.createChallengeStudio($('[data-challenge-canvas]'),{unavailable:fallback});$('[data-challenge-canvas]').hidden=false;$('[data-duo-fallback]').hidden=true;root.dataset.renderer='three';studio.update(question,challengeSignal(question),lit);dispatchEvent(new Event('resize'));}catch{fallback();}}
 function invalidate(){feedback.hidden=true;feedback.replaceChildren();delete form.dataset.correct;form.querySelectorAll('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));lit=false;updateScene();}
 function renderQuestion(){
  root.dataset.question=JSON.stringify(question);$('[data-question-lights]').textContent=question.lights.map(key=>LIGHTS[key].name).join(' ＋ ');$('[data-question-filter]').textContent=FILTERS[question.filter].name;$('[data-question-paper]').textContent=PAPER_TYPES[question.paper].name;
  $('[data-prediction-title]').textContent=`開燈後，金框標示的${PAPER_TYPES[question.paper].name}會看起來如何？`;
  form.reset();invalidate();
 }
 const colours=$('[data-colour-options]');COLOUR_OPTIONS.forEach(([key,name,swatch])=>{const label=document.createElement('label');label.className='duo-answer';const input=document.createElement('input');input.type='radio';input.name='appearance';input.value=key;input.required=true;const dot=document.createElement('i');dot.style.backgroundColor=swatch;dot.setAttribute('aria-hidden','true');label.append(input,dot,document.createTextNode(name));colours.append(label);});
 for(const [selector,options]of[['[name=transmission]',TRANSMISSION_OPTIONS],['[name=reflection]',REFLECTION_OPTIONS]])for(const [value,label]of options){const option=document.createElement('option');option.value=value;option.textContent=label;$(selector).append(option);}
 root.querySelectorAll('[data-probe-colour]').forEach(button=>button.addEventListener('click',()=>{const i=Number(button.dataset.probeLamp);activeLamp=i;lamps[i].colour=button.dataset.probeColour;updateProbe();}));
 handles.forEach((handle,i)=>{
  handle.addEventListener('pointerdown',e=>{if(!e.isPrimary){drag=null;return;}e.preventDefault();activeLamp=i;drag={id:e.pointerId,index:i,x:e.clientX,y:e.clientY,start:{...lamps[i]}};handle.setPointerCapture(e.pointerId);updateProbe();});
  handle.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||drag.index!==i)return;e.preventDefault();const bounds=canvas.getBoundingClientRect();lamps[i].x=clamp(drag.start.x+(e.clientX-drag.x)/bounds.width,.1,.9);lamps[i].y=clamp(drag.start.y+(e.clientY-drag.y)/bounds.height,.25,.75);updateProbe();});
  for(const type of['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(type,()=>{drag=null;});
  handle.addEventListener('keydown',e=>{const move={ArrowLeft:[-.025,0],ArrowRight:[.025,0],ArrowUp:[0,-.025],ArrowDown:[0,.025]}[e.key];if(e.key==='Home'){e.preventDefault();lamps[i].x=lamps[i].y=.5;}else if(move){e.preventDefault();lamps[i].x=clamp(lamps[i].x+move[0],.1,.9);lamps[i].y=clamp(lamps[i].y+move[1],.25,.75);}else return;activeLamp=i;updateProbe();});
 });
 $('[data-reproduce]').addEventListener('click',()=>{question.lights.forEach((colour,i)=>Object.assign(lamps[i],{colour,x:i?.58:.42,y:.5}));updateProbe();$('.duo-probe').scrollIntoView({block:'start',behavior:'auto'});$('[data-probe-lamp="0"][aria-pressed=true]').focus({preventScroll:true});$('[data-probe-help]').textContent='已重現本題的兩盞燈色；仍可自由換色、拖動光斑查證。';});
 $('[data-next-question]').addEventListener('click',()=>{if(!deck.length){deck=shuffledQuestions();if(deck[0].id===question.id)[deck[0],deck[1]]=[deck[1],deck[0]];}question=deck.shift();renderQuestion();$('[data-prediction-title]').focus({preventScroll:true});});
 form.addEventListener('change',invalidate);
 form.addEventListener('submit',e=>{
  e.preventDefault();const answer={colour:form.querySelector('[name=appearance]:checked')?.value||'',transmission:form.elements.transmission.value,reflection:form.elements.reflection.value},result=checkPrediction(question,answer);
  feedback.hidden=false;
  if(result.missing.length){feedback.dataset.kind='missing';feedback.textContent='請先預測外觀，並完成透射與反射的兩項依據，再開燈驗證。';const targets={colour:form.querySelector('[name=appearance]'),transmission:form.elements.transmission,reflection:form.elements.reflection};for(const key of result.missing)targets[key].setAttribute('aria-invalid','true');targets[result.missing[0]].focus();return;}
  lit=true;updateScene();form.dataset.correct=String(result.correct);feedback.dataset.kind=result.correct?'correct':'retry';const expected=expectedAnswer(question);
  const lead=document.createElement('strong');lead.textContent=result.correct?'外觀與兩項依據都符合這次觀察。':'開燈觀察後，再對照你的推論。';const detail=document.createElement('p');detail.textContent=`外觀：${result.fields.colour?'符合':'再檢查'}；到達紙張的色光：${result.fields.transmission?'符合':'再檢查'}；反射情況：${result.fields.reflection?'符合':'再檢查'}。`;
  const reason=document.createElement('p');reason.textContent=`${question.lights.map(key=>LIGHTS[key].name).join('與')}照過來，${question.filter==='clear'?'直接到達紙張':`經${FILTERS[question.filter].name}後主要透過${TRANSMISSION_OPTIONS.find(o=>o[0]===expected.transmission)[1]}`}；到達${PAPER_TYPES[question.paper].name}的光${expected.reflection==='little'?'只有極少部分被反射':REFLECTION_OPTIONS.find(o=>o[0]===expected.reflection)[1]}，所以看起來${expected.colour==='dark'?'很暗':'呈'+colourName(expected.colour)}。可回上方試光，再修改答案。`;
  feedback.replaceChildren(lead,detail,reason);
  requestAnimationFrame(()=>{const r=feedback.getBoundingClientRect();if(r.bottom>innerHeight-12||r.top<100)feedback.scrollIntoView({block:'center',behavior:'auto'});});
 });
 root.querySelectorAll('[data-quiz-pending]').forEach(e=>e.disabled=false);$('[data-duo-load-note]').hidden=true;$('[data-probe-static]').setAttribute('hidden','');root.dataset.ready=form.dataset.ready='true';root.dataset.renderer='diagram';updateProbe();renderQuestion();
 const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();loadStudio();}},{rootMargin:'120px'});observer.observe($('[data-challenge-stage]'));
 addEventListener('pagehide',event=>{if(!event.persisted){cancelAnimationFrame(paintFrame);studio?.dispose();}},{once:true});
}
