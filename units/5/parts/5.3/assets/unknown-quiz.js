import {QUESTION_SET,makeQuestion,observeQuestion,gradeQuestion} from './unknown-quiz-model.mjs?v=unknown-quiz-1';

const get=id=>document.getElementById(id),root=get('unknown-quiz-lab');
const form=get('heat-quiz'),fields=get('unknown-answer-fields'),play=get('unknown-observe'),newButton=get('unknown-new');
const imageNode=get('unknown-apparatus-image'),motion=get('unknown-motion'),preload=new Image();
const inputs={riseA:get('unknown-rise-a'),riseB:get('unknown-rise-b'),specificHeat:get('unknown-specific-heat')};
const feedback={riseA:get('unknown-rise-a-feedback'),riseB:get('unknown-rise-b-feedback'),specificHeat:get('unknown-specific-heat-feedback'),comparison:get('unknown-comparison-feedback')};
const name=letter=>letter==='a'?'甲':'乙';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let question=makeQuestion(),progress=0,active=false,ready=false,frame=0,last=0,attempt=0,deck=[];

motion.innerHTML=`<defs><linearGradient id="unknown-metal"><stop stop-color="#7e8789"/><stop offset=".3" stop-color="#dce1df"/><stop offset=".7" stop-color="#9ba4a6"/><stop offset="1" stop-color="#d4d8d4"/></linearGradient><pattern id="unknown-brush" width="8" height="3" patternUnits="userSpaceOnUse"><path d="M0 1H8" stroke="#fff" opacity=".2"/></pattern></defs><g><path d="M1149 543l18-18h86l-18 18Z" fill="#e2e5df" stroke="#89918c"/><path d="M1149 543h86v72h-86Z" fill="url(#unknown-metal)"/><path d="M1235 543l18-18v72l-18 18Z" fill="#a4adae" stroke="#7a837c"/><path d="M1149 543h86v72h-86Z" fill="url(#unknown-brush)"/><path d="M1180 552L1192 534" stroke="#666d65" stroke-width="3"/><ellipse cx="1192" cy="534" rx="10" ry="4" fill="#e3e6db" stroke="#87948b"/></g><g id="unknown-stir"><rect x="407" y="601" width="50" height="11" rx="5" fill="#f9fbef" stroke="#bbc6b7"/></g>${[0,1].map(i=>`<circle data-unknown-led cx="${i?1132:375}" cy="713" r="7" fill="#183a25"/><g data-unknown-pointer="${i}"><path d="M${i?1221:463} 688v14" stroke="#fff9e8" stroke-width="3" stroke-linecap="round"/></g>`).join('')}`;

function clearFeedback(){
  Object.values(feedback).forEach(node=>{node.hidden=true;node.textContent='';delete node.dataset.correct;});
  Object.values(inputs).forEach(input=>input.removeAttribute('aria-invalid'));
  form.querySelectorAll('[name=comparison]').forEach(input=>input.removeAttribute('aria-invalid'));
  get('quiz-result').hidden=true;get('quiz-result').textContent='';delete get('quiz-result').dataset.correct;
}

function render(){
  const state=observeQuestion(question,progress),complete=progress>=1;
  if(ready)root.dataset.phase=complete?'complete':active?'running':progress?'interrupted':'ready';
  root.dataset.observed=String(complete);root.dataset.playing=String(active);
  play.disabled=!ready||active;newButton.disabled=!ready;
  play.textContent=active?'觀察中…':progress?'重新觀察':'開始觀察';
  play.classList.toggle('action',!complete);play.classList.toggle('secondary',complete);
  fields.disabled=!ready||!complete||active;
  const water=question.waterLetter,unknown=question.unknownLetter;
  for(const [side,letter,kind]of [['left',water,'水'],['right',unknown,'未知固體']]){
    const badge=get('unknown-label-'+side+'-letter');badge.textContent=name(letter);badge.dataset.letter=letter;
    get('unknown-label-'+side+'-kind').textContent=kind;
    get('unknown-choice-'+letter+'-kind').textContent=kind;
    get('unknown-meter-'+side).textContent=state.samples[letter].temperature.toFixed(1);
    get('unknown-meter-'+side+'-name').textContent=`樣品${name(letter)}目前溫度`;
    get('unknown-meter-'+side+'-screen').hidden=!ready;
    get('unknown-energy-'+side+'-name').textContent=name(letter);
    get('unknown-energy-'+side+'-name').dataset.letter=letter;
    get('unknown-energy-'+side).textContent=Math.floor(state.heat+1e-8).toLocaleString('zh-TW');
  }
  get('unknown-specific-badge').textContent=name(unknown);get('unknown-specific-badge').dataset.letter=unknown;
  get('unknown-target-heat').textContent=question.heat.toLocaleString('zh-TW');
  get('unknown-readings').textContent=complete?`觀察完成：甲${state.samples.a.temperature.toFixed(1)}°C、乙${state.samples.b.temperature.toFixed(1)}°C；各100g，初溫20°C，各吸收${question.heat}cal。`:'';
  motion.style.visibility=ready?'visible':'hidden';
  motion.querySelectorAll('[data-unknown-led]').forEach(node=>node.setAttribute('fill',active?'#aeff72':'#183a25'));
  motion.querySelectorAll('[data-unknown-pointer]').forEach((node,i)=>node.setAttribute('transform',`rotate(${active?35:-35} ${i?1221:463} 715)`));
  const phase=reduced.matches?0:progress*36;
  get('unknown-stir').setAttribute('transform',`translate(432 606) scale(${.5+.5*Math.abs(Math.cos(phase))} 1) translate(-432 -606)`);
}

function cancel(){active=false;cancelAnimationFrame(frame);frame=0;}
function interrupt(){
  if(!active)return;
  cancel();render();get('unknown-status').textContent='觀察已停止，讀值與作答保留；點「重新觀察」會從20°C開始。';
}
function tick(now){
  frame=0;if(!active)return;
  progress=Math.min(1,progress+Math.max(0,Math.min(100,now-last))/6000);last=now;
  if(progress>=1)active=false;
  render();
  if(active)frame=requestAnimationFrame(tick);
  else get('unknown-status').textContent='觀察已完成，可根據讀值作答。';
}
function start(){
  if(!ready||active)return;
  cancel();progress=0;active=true;last=performance.now();clearFeedback();render();
  get('unknown-status').textContent='兩份樣品各吸收相同熱量；到點保留讀值。';
  frame=requestAnimationFrame(tick);
}

function nextQuestion(){
  if(!ready)return;
  cancel();
  if(!deck.length){
    deck=QUESTION_SET.filter(q=>q.heat!==question.heat||q.waterLetter!==question.waterLetter||q.samples[q.unknownLetter].c!==question.samples[question.unknownLetter].c);
    for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  }
  question=deck.pop();progress=0;form.reset();clearFeedback();render();
  get('unknown-status').textContent='新的一組已準備好；點「開始觀察」，再完成本題。';
}

async function load(retry=false){
  const version=++attempt;cancel();ready=false;root.dataset.phase='loading';
  get('unknown-loading').hidden=false;get('unknown-loading').textContent='正在準備樣品觀察台…';get('unknown-retry').hidden=true;render();
  const source=new URL(`material-comparison-bench.webp${retry?'?unknown-retry='+version:''}`,import.meta.url).href;
  preload.src=source;imageNode.setAttribute('href',source);
  try{
    await preload.decode();if(version!==attempt)return;
    ready=true;get('unknown-loading').hidden=true;render();
    get('unknown-status').textContent=progress>=1?'觀察已完成，可根據讀值作答。':'器材已就緒，點「開始觀察」一起觀察兩份樣品。';
  }catch{
    if(version!==attempt)return;
    root.dataset.phase='error';get('unknown-loading').textContent='器材未能載入，請點「重新載入器材」。';get('unknown-retry').hidden=false;render();
    get('unknown-status').textContent='器材尚未就緒，重新載入後可開始觀察。';
  }
}

form.addEventListener('submit',event=>{
  event.preventDefault();
  if(!ready||progress<1||active)return;
  const data=new FormData(form),result=gradeQuestion(question,Object.fromEntries(data));
  for(const [key,state]of Object.entries(result.fields)){
    const label=key==='riseA'?'甲':key==='riseB'?'乙':name(question.unknownLetter);
    const message=state==='missing'?'請先完成這一欄。':state==='invalid'?'請輸入大於0的有限數字。':state==='correct'?'這個推論合理。':key==='specificHeat'?'用Q＝m×c×ΔT檢查，請使用未知樣品的溫升。':key==='comparison'?'同樣質量與升溫，想想比熱較大代表需要多少熱量。':`${label}的溫升請用末溫減初溫，別把末溫直接當成溫升。`;
    feedback[key].hidden=false;feedback[key].textContent=message;feedback[key].dataset.correct=String(state==='correct');
    if(key==='comparison')form.querySelectorAll('[name=comparison]').forEach(input=>input.setAttribute('aria-invalid',String(state!=='correct')));
    else inputs[key].setAttribute('aria-invalid',String(state!=='correct'));
  }
  const node=get('quiz-result');node.hidden=false;node.dataset.correct=String(result.correct);
  node.textContent=result.correct?'推論正確！你已能從讀值求出溫升，並用比熱比較升溫所需熱量。':'再檢查標示的欄位。先算溫升，再核對質量、吸熱量與單位。';
});
form.addEventListener('input',clearFeedback);
form.addEventListener('reset',clearFeedback);
play.addEventListener('click',start);newButton.addEventListener('click',nextQuestion);get('unknown-retry').addEventListener('click',()=>load(true));
window.addEventListener('blur',interrupt);
document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});
document.querySelector('.route').addEventListener('click',event=>{const link=event.target.closest('a');if(link&&link.hash!=='#unit-quiz'&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey)interrupt();});
load();
