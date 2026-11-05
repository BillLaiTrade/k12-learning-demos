import {rgbCss} from './color-model.mjs';
import {initialiseDuoProbe} from './duo-probe.mjs?v=single-change-20261105';
import {DUO_LIGHTS as LIGHTS,DUO_FILTERS as FILTERS,QUESTION_FOCUS,PAPER_TYPES,COLOUR_OPTIONS,TRANSMISSION_OPTIONS,REFLECTION_OPTIONS,INITIAL_SERIES,newQuestionSeries,challengeSignal,expectedAnswer,checkPrediction} from './duo-quiz-model.mjs?v=single-change-20261105';

const colourName=key=>COLOUR_OPTIONS.find(o=>o[0]===key)?.[1]||key;
export function challengeDiagram(q,signal,lit){
 const paper=PAPER_TYPES[q.paper],shade=lit?rgbCss(signal.outgoing.map(v=>v*.4)):paper.css;
 return `<svg viewBox="0 0 760 420" role="img" aria-label="兩盞燈${q.filter==='clear'?'直接':`經${FILTERS[q.filter].name}`}照向金框標示的${paper.name}；${lit?'已開燈':'尚未開燈'}">
 <defs><linearGradient id="duo-wood" x2="0" y2="1"><stop stop-color="#8b653f"/><stop offset="1" stop-color="#3c2b1d"/></linearGradient><linearGradient id="duo-metal"><stop stop-color="#1a2420"/><stop offset=".45" stop-color="#65716a"/><stop offset="1" stop-color="#17221d"/></linearGradient></defs>
 <path d="M0 0H760V420H0Z" fill="#283126"/><path d="M20 230L630 160L760 345L140 420Z" fill="url(#duo-wood)"/>
 <path d="M105 348L652 294M111 359L657 305" stroke="#89958b" stroke-width="3"/>
 ${[0,1].map((i)=>`<g transform="translate(${85+i*120} ${255+i*45})"><path d="M0 30h65v12H0Z" fill="#20342b"/><path d="M32 30V-38" stroke="#87938c" stroke-width="7"/><rect x="-7" y="-75" width="88" height="42" rx="12" fill="url(#duo-metal)"/><ellipse cx="82" cy="-54" rx="7" ry="19" fill="${lit?rgbCss(LIGHTS[q.lights[i]].rgb):'#37423b'}"/><text x="27" y="67" fill="#e1eadd" text-anchor="middle" font-size="18">${i?'B':'A'} ${LIGHTS[q.lights[i]].name}燈</text></g>`).join('')}
 ${lit?[0,1].map(i=>`<path d="M${167+i*120} ${201+i*45}L${q.filter==='clear'?600:405} 215" stroke="${rgbCss(LIGHTS[q.lights[i]].rgb)}" stroke-width="2"/>`).join('')+(q.filter==='clear'?'':`<path d="M414 215L600 181" stroke="${rgbCss(signal.transmitted)}" stroke-width="2"/>`):''}
 ${q.filter==='clear'?'':`<path d="M390 115L450 134V300L390 282Z" fill="${FILTERS[q.filter].css}" fill-opacity=".33" stroke="#a0b8a5" stroke-width="4"/><path d="M420 292V330" stroke="#85948a" stroke-width="7"/><path d="M390 330h61v11h-61Z" fill="#35473b"/><text x="378" y="94" fill="#e0eadf" font-size="19">② ${FILTERS[q.filter].name}</text>`}
 <path d="M575 77L685 105V286L575 258Z" fill="${shade}" stroke="#f1d28b" stroke-width="5"/><path d="M630 274V313" stroke="#8c9c90" stroke-width="7"/><path d="M598 313h63v12h-63Z" fill="#35473b"/>
 <text x="586" y="362" fill="#e0eadf" font-size="20">③ ${paper.name}</text></svg>`;
}

export function initialiseDuoQuiz(root){
 if(root.dataset.ready==='true')return;
 const $=s=>root.querySelector(s),form=$('[data-quiz]'),feedback=$('[data-duo-feedback]');
 const probe=initialiseDuoProbe(root);
 const viewButtons=[...root.querySelectorAll('[data-duo-view]')];
 function showView(view,{focus=false,align=false}={}){
  if(!['probe','challenge'].includes(view))return;
  if(view==='challenge')probe.suspend();
  root.dataset.view=view;
  viewButtons.forEach(button=>{const active=button.dataset.duoView===view;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
  $('.duo-probe').hidden=view!=='probe';$('.duo-challenge').hidden=view!=='challenge';
  const tab=$(`[data-duo-view="${view}"]`);if(focus)tab.focus({preventScroll:true});
  if(align)$('.duo-workspace-tabs').scrollIntoView({block:'start',behavior:'auto'});
  requestAnimationFrame(()=>dispatchEvent(new Event('resize')));
 }
 viewButtons.forEach(button=>{button.addEventListener('click',()=>showView(button.dataset.duoView));button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=viewButtons.indexOf(button),next=event.key==='Home'?0:event.key==='End'?1:1-index;showView(viewButtons[next].dataset.duoView,{focus:true});});});
 root.querySelectorAll('[data-duo-open]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.duoOpen,{focus:true,align:true})));
 const attempt=question=>({question,answer:{colour:'',transmission:'',reflection:''},tried:false});
 let attempts=INITIAL_SERIES.map(attempt),current=0,question=attempts[0].question,lit=false,studio=null,studioLoading=false,threeFailed=false;
 const readAnswer=()=>({colour:form.querySelector('[name=appearance]:checked')?.value||'',transmission:form.elements.transmission.value,reflection:form.elements.reflection.value});
 function progress(){
  let count=0;root.querySelectorAll('[data-question-tab]').forEach((button,i)=>{const state=attempts[i],checked=state.tried&&!checkPrediction(state.question,state.answer).missing.length,status=checked?'已驗證':Object.values(state.answer).some(Boolean)?'作答中':'未作答';count+=checked?1:0;button.setAttribute('aria-pressed',String(i===current));button.setAttribute('aria-label',`第${i+1}題，${status}${i===current?'，目前題目':''}`);button.dataset.status=status;button.querySelector('small').textContent=status;});
  $('[data-series-progress]').textContent=`已驗證 ${count} / ${attempts.length} 題`;$('[data-question-counter]').textContent=`第 ${current+1} 題 / 共 ${attempts.length} 題`;$('[data-prev-question]').disabled=current===0;$('[data-next-question]').disabled=current===attempts.length-1;root.dataset.questionIndex=String(current+1);root.dataset.questionSeries=JSON.stringify(attempts.map(s=>s.question.id));
 }
 function placeLabels(points){
  const layer=$('[data-scene-labels]'),stage=$('[data-challenge-stage]'),width=stage.clientWidth,height=stage.clientHeight,boxes=[],leaders=[];
  layer.hidden=false;const top=$('.duo-stage-state').offsetHeight+8;
  for(const key of['a','b','filter','paper']){const label=$(`[data-scene-label="${key}"]`),point=points[key];label.hidden=!point;if(!point)continue;
   const w=label.offsetWidth,h=label.offsetHeight,ax=point.x*width,ay=point.y*height,x=Math.max(5,Math.min(width-w-5,ax-w/2));
   const candidates=[-h-12,12,-h-42,42,-h-72,72].map(d=>Math.max(top,Math.min(height-h-6,ay+d)));
   const overlap=(y,b)=>x<b.x+b.w+5&&x+w+5>b.x&&y<b.y+b.h+5&&y+h+5>b.y;
   const y=candidates.find(y=>!boxes.some(b=>overlap(y,b)))??candidates[0];boxes.push({x,y,w,h});label.style.left=x+'px';label.style.top=y+'px';
   leaders.push(`<line x1="${ax}" y1="${ay}" x2="${x+w/2}" y2="${y+h/2}"/>`);
  }
  const svg=$('[data-label-leaders]');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.innerHTML=leaders.join('');
 }
 function updateScene(){const signal=challengeSignal(question),paper=PAPER_TYPES[question.paper].name;root.dataset.lit=String(lit);$('[data-challenge-state]').textContent=lit?'已開燈｜本題照明結果':'作答前｜白光參照';$('[data-reference-note]').textContent=lit?'現在請觀察金框內紙面的顏色。':'紙面原色供辨認，尚未顯示本題照明結果。';$('[data-paper-reference]').textContent=`觀察目標：③ 金框內的${paper}`;
  $('[data-challenge-canvas]').setAttribute('aria-label',`題目立體實驗台：A ${LIGHTS[question.lights[0]].name}、B ${LIGHTS[question.lights[1]].name}同時${question.filter==='clear'?'直接照向':`經② ${FILTERS[question.filter].name}照向`}③ 金框${paper}。${lit?'已開燈，顯示本題結果':'作答前以白光下原色供辨認，尚未顯示本題結果'}。拖曳或方向鍵轉動，Home復原。`);
  $('[data-duo-fallback]').innerHTML=challengeDiagram(question,signal,lit);studio?.update(question,signal,lit);
  if(lit)root.dataset.signal=JSON.stringify(signal);else delete root.dataset.signal;
 }
 function fallback(){threeFailed=true;studio?.dispose();studio=null;$('[data-challenge-canvas]').hidden=true;$('[data-duo-fallback]').hidden=false;$('[data-scene-help]').textContent='目前以平面光路示意顯示；可繼續作答、開燈與換題。';root.dataset.renderer='diagram';$('[data-scene-labels]').hidden=true;}
 async function loadStudio(){if(studioLoading||threeFailed||studio)return;studioLoading=true;try{const module=await import('./duo-quiz-studio.mjs?v=single-change-20261105');studio=module.createChallengeStudio($('[data-challenge-canvas]'),{unavailable:fallback,onLabels:placeLabels});$('[data-challenge-canvas]').hidden=false;$('[data-duo-fallback]').hidden=true;root.dataset.renderer='three';studio.update(question,challengeSignal(question),lit);dispatchEvent(new Event('resize'));}catch{fallback();}}
 function clearExplanation(){const explanation=$('[data-duo-explanation]');explanation.hidden=true;explanation.open=false;$('[data-duo-reason]').textContent='';}
 function invalidate(){const state=attempts[current];state.answer=readAnswer();state.tried=false;feedback.hidden=true;feedback.replaceChildren();clearExplanation();$('[data-feedback-placeholder]').hidden=false;delete form.dataset.correct;form.querySelectorAll('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));lit=false;updateScene();progress();}
 function renderQuestion(){
  question=attempts[current].question;
  root.dataset.question=JSON.stringify(question);$('[data-question-lights]').textContent=question.lights.map(key=>LIGHTS[key].name).join(' ＋ ');$('[data-question-filter]').textContent=question.filter==='clear'?'不放色片':FILTERS[question.filter].name;$('[data-filter-route]').textContent=question.filter==='clear'?'兩束光直接照到紙張':'兩束光都先通過這片色片';question.lights.forEach((key,i)=>{$(`[data-question-lamp="${i}"]`).textContent=LIGHTS[key].name;$(`[data-scene-label="${i?'b':'a'}"]`).textContent=`${i?'B':'A'} ${LIGHTS[key].name}`;});$('[data-scene-label=filter]').textContent=`② ${FILTERS[question.filter].name}`;$('[data-scene-label=paper]').textContent=`③ ${PAPER_TYPES[question.paper].name}`;$('[data-question-paper]').textContent=PAPER_TYPES[question.paper].name;
  const hint=$('[data-question-components]');hint.open=false;$('[data-question-focus]').textContent=QUESTION_FOCUS[current];$('[data-light-components]').textContent='兩束光：'+question.lights.map(key=>LIGHTS[key].name).join('＋')+'。';$('[data-filter-components]').textContent=question.filter==='clear'?'不放色片：保留原有色光。':`${FILTERS[question.filter].name}主要讓${['red','green','blue'].filter((_,c)=>FILTERS[question.filter].rgb[c]>.5).map(key=>LIGHTS[key].name).join('、')}通過。`;$('[data-challenge-question]').textContent=`同時開啟兩盞燈後，金框中的${PAPER_TYPES[question.paper].name}會看起來是什麼顏色？`;
  $('[data-prediction-title]').textContent='你預測的紙面顏色';
  form.reset();const state=attempts[current];if(state.answer.colour)form.querySelector(`[name=appearance][value="${state.answer.colour}"]`).checked=true;form.elements.transmission.value=state.answer.transmission;form.elements.reflection.value=state.answer.reflection;
  renderFeedback();progress();
 }
 const colours=$('[data-colour-options]');COLOUR_OPTIONS.forEach(([key,name,swatch])=>{const label=document.createElement('label');label.className='duo-answer';const input=document.createElement('input');input.type='radio';input.name='appearance';input.value=key;input.required=true;const dot=document.createElement('i');dot.style.backgroundColor=swatch;dot.setAttribute('aria-hidden','true');label.append(input,dot,document.createTextNode(name));colours.append(label);});
 for(const [selector,options]of[['[name=transmission]',TRANSMISSION_OPTIONS],['[name=reflection]',REFLECTION_OPTIONS]])for(const [value,label]of options){const option=document.createElement('option');option.value=value;option.textContent=label;$(selector).append(option);}
 function selectQuestion(index){if(index<0||index>=attempts.length)return;current=index;renderQuestion();$('[data-challenge-question]').focus({preventScroll:true});const r=$('.duo-task').getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)$('.duo-workspace-tabs').scrollIntoView({block:'start',behavior:'auto'});}
 root.querySelectorAll('[data-question-tab]').forEach(button=>button.addEventListener('click',()=>selectQuestion(Number(button.dataset.questionTab))));
 $('[data-prev-question]').addEventListener('click',()=>selectQuestion(current-1));
 $('[data-next-question]').addEventListener('click',()=>selectQuestion(current+1));
 $('[data-new-set]').addEventListener('click',()=>{attempts=newQuestionSeries(Math.random,attempts.map(s=>s.question)).map(attempt);selectQuestion(0);});
 form.addEventListener('change',invalidate);
 function renderFeedback(){
  const state=attempts[current],result=checkPrediction(question,state.answer);form.querySelectorAll('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));delete form.dataset.correct;feedback.hidden=!state.tried;feedback.replaceChildren();clearExplanation();$('[data-feedback-placeholder]').hidden=state.tried;lit=state.tried&&!result.missing.length;updateScene();
  if(!state.tried)return result;
  if(result.missing.length){feedback.dataset.kind='missing';feedback.textContent='請先預測外觀，並完成透射與反射的兩項依據，再開燈驗證。';const targets={colour:form.querySelector('[name=appearance]'),transmission:form.elements.transmission,reflection:form.elements.reflection};for(const key of result.missing)targets[key].setAttribute('aria-invalid','true');return result;}
  form.dataset.correct=String(result.correct);feedback.dataset.kind=result.correct?'correct':'retry';const expected=expectedAnswer(question);
  const lead=document.createElement('strong');lead.textContent=result.correct?'外觀與兩項依據都符合這次觀察。':'開燈觀察後，再對照你的推論。';const detail=document.createElement('p');detail.textContent=`外觀：${result.fields.colour?'符合':'再檢查'}；到達紙張的色光：${result.fields.transmission?'符合':'再檢查'}；反射情況：${result.fields.reflection?'符合':'再檢查'}。`;
  $('[data-duo-reason]').textContent=`${question.lights.map(key=>LIGHTS[key].name).join('與')}照過來，${question.filter==='clear'?'直接到達紙張':`經${FILTERS[question.filter].name}後主要透過${TRANSMISSION_OPTIONS.find(o=>o[0]===expected.transmission)[1]}`}；到達${PAPER_TYPES[question.paper].name}的光${expected.reflection==='little'?'只有極少部分被反射':REFLECTION_OPTIONS.find(o=>o[0]===expected.reflection)[1]}，所以看起來${expected.colour==='dark'?'很暗':'呈'+colourName(expected.colour)}。可切到自由試光查證，再修改答案。`;
  $('[data-duo-explanation]').hidden=false;feedback.replaceChildren(lead,detail);return result;
 }
 form.addEventListener('submit',e=>{
  e.preventDefault();const state=attempts[current];state.answer=readAnswer();state.tried=true;const result=renderFeedback();progress();
  if(result.missing.length){const targets={colour:form.querySelector('[name=appearance]'),transmission:form.elements.transmission,reflection:form.elements.reflection};targets[result.missing[0]].focus();return;}
  requestAnimationFrame(()=>{const r=feedback.getBoundingClientRect();if(r.bottom>innerHeight-12||r.top<100)feedback.scrollIntoView({block:'center',behavior:'auto'});});
 });
 root.querySelectorAll('[data-quiz-pending]').forEach(e=>e.disabled=false);$('[data-duo-load-note]').hidden=true;root.dataset.ready=form.dataset.ready='true';root.dataset.renderer='diagram';renderQuestion();showView('probe');
 const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();loadStudio();}},{rootMargin:'120px'});observer.observe($('[data-challenge-stage]'));
 addEventListener('pagehide',event=>{if(!event.persisted){probe.dispose();studio?.dispose();}},{once:true});
}
