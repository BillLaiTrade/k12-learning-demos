import {newSample,finishTest,canTest,DURATION,phaseName,actionName,assessReport,concentrationEvidence,measuredMasses,measurementHint} from './investigation-state.js?v=sand-comparison-1';
import {loadPicture,createRenderer} from './investigation-renderer.js?v=dish-to-scale-1';

const root=document.getElementById('invest-lab');
const $=id=>document.getElementById(`invest-${id}`);
const controls=[...root.querySelectorAll('[data-invest-tool]')];
const answers=new Map();
const answerFields=['raw-mass','solution-mass','solute-mass','calculation-numerator','calculation-denominator','concentration-value'];
const motion=matchMedia('(prefers-reduced-motion: reduce)');
let samples=[],active=null,stock=6,nextId=1,animation=null,renderer=null,frame=0,pausedAt=null,drag=null,suppressClickUntil=0;
const selected=()=>samples.find(s=>s.id===active);
const label=id=>id<=26?String.fromCharCode(64+id):String(id);
function announce(text,observation=false){$('status').textContent=text;$('status').dataset.observation=String(observation);}
function invalidateReport(){const feedback=$('feedback');feedback.hidden=true;feedback.replaceChildren();delete feedback.dataset.result;}
function redraw(now=performance.now()){renderer?.render({sample:selected(),stock,animation},now);}
function updateConcentration(){
  const sample=selected(),{filtered,solid}=measuredMasses(sample);
  $('notebook-sample').textContent=sample?`取樣 ${label(sample.id)}`:'尚未取樣';
  $('solution-note').textContent=filtered?'這是計算濃度時的溶液總質量。':'這筆重量需要包含泥沙嗎？';
  $('solute-note').textContent=solid?(solid.phase==='dry-filtered'?'這是原本溶在濾液中的溶質質量。':'固體還混有泥沙，能直接當作晶體質量嗎？'):'稱到的是乾燥晶體，還是混著泥沙的固體？';
  $('liquid-measurement').dataset.valid=filtered?'true':'';
  $('solid-measurement').dataset.valid=solid?String(solid.phase==='dry-filtered'):'';
  const draft=answers.get(active)||{};
  for(const field of answerFields)$(field).value=draft[field]??'';
  const hint=measurementHint(sample);$('hint').hidden=!hint||!!animation;$('hint').textContent=hint;
  const disabled=root.dataset.ready!=='true'||!!animation||!sample;
  for(const field of answerFields)$(field).disabled=disabled;
  $('check').disabled=disabled;
}

function update(){
  const sample=selected(),ready=root.dataset.ready==='true',busy=!!animation;
  root.dataset.busy=String(busy);root.dataset.hasSample=String(!!sample);root.dataset.sampleCount=String(samples.length);root.dataset.stock=String(stock);root.dataset.active=active??'';root.dataset.phase=sample?.phase||'';
  for(const button of controls)button.disabled=!ready||busy;
  for(const button of root.querySelectorAll('.invest-tool'))button.setAttribute('aria-pressed',String(button.dataset.investTool===(animation?.kind||sample?.display)));
  $('reset').disabled=!ready;$('take').textContent=stock===0?'補充同批樣本':sample?'＋ 再取一份':'取一份';
  const sampleLabel=stock===0?'未知樣本 X 已取完：補充同批樣本，保留既有取樣與紀錄':'未知樣本 X：點瓶身取一份到燒杯，也可拖到燒杯';
  for(const id of ['bottle','take'])$(id).setAttribute('aria-label',sampleLabel);
  $('current').hidden=!sample;$('samples').hidden=samples.length<2;
  $('current-label').textContent=sample?`取樣 ${label(sample.id)} · ${phaseName(sample)}`:'';
  $('settle').hidden=!sample||sample.water===0||sample.sand===0;$('settle').disabled=!ready||busy;
  const focusId=document.activeElement?.dataset?.sample;
  $('samples').replaceChildren();
  for(const s of samples){const button=document.createElement('button');button.type='button';button.dataset.sample=s.id;button.setAttribute('aria-pressed',String(s.id===active));button.disabled=busy;const name=document.createElement('strong');name.textContent=`取樣 ${label(s.id)}`;const phase=document.createElement('span');phase.textContent=phaseName(s);button.append(name,phase);button.addEventListener('click',()=>selectSample(s.id));$('samples').append(button);}
  if(focusId)$('samples').querySelector(`[data-sample="${focusId}"]`)?.focus({preventScroll:true});
  updateConcentration();
  $('canvas').setAttribute('aria-label',sample?`未知樣本 X 與取樣 ${label(sample.id)}，目前為${phaseName(sample)}。${busy?`${actionName(animation.kind)}進行中。`:sample.events.at(-1)?.observation||''}`:'未知樣本 X 樣本瓶、空燒杯與收好的器材盤。點瓶身取樣。');
}
function selectSample(id){
  if(animation)return;active=id;invalidateReport();const sample=selected();update();redraw();announce(sample.events.at(-1)?.observation||`已選取取樣 ${label(id)}，可以選用器材測試。`,!!sample.events.length);
}
function animate(kind,before){
  const start=performance.now();animation={kind,before,start,duration:DURATION[kind],reduced:motion.matches};
  invalidateReport();update();
  announce(kind==='sample'?'取樣前先搖勻，正在倒入一份樣本……':`${actionName(kind)}中，觀察這份取樣的變化……`);
  const tick=now=>{
    if(!animation)return;
    redraw(now);
    if(now-animation.start<animation.duration){frame=requestAnimationFrame(tick);return;}
    if(kind!=='sample'){
      const result=finishTest(selected(),kind);result.sample.display=kind==='settle'?'beaker':kind;
      samples=samples.map(s=>s.id===active?result.sample:s);
      root.dataset.lastEvent=result.event.id;
      announce(result.event.observation,true);
    }else announce(`取樣 ${label(active)} 已放上實驗桌。可以選用器材，也可以再取一份。`);
    animation=null;frame=0;update();redraw();
  };
  animation.tick=tick;frame=requestAnimationFrame(tick);
}
function perform(action){
  if(root.dataset.ready!=='true'||animation)return;
  if(action==='sample'){
    if(stock===0){stock=6;update();redraw();announce('已補充同批樣本；既有取樣與紀錄保留。可以再取一份。');return;}
    const sample=newSample(nextId++);sample.display='beaker';samples.push(sample);active=sample.id;stock--;animate('sample',null);return;
  }
  const reason=canTest(selected(),action);
  if(reason){announce(reason);return;}
  animate(action,{...selected()});
}
function submitReport(event){
  event.preventDefault();if(animation)return;
  let result=assessReport(selected(),$('concentration-value').value);
  const basis=concentrationEvidence(selected()),issues=[];
  if(basis){
    const measurements=measuredMasses(selected());
    for(const [field,title,key,optional] of [['raw-mass','過濾前取樣','raw',true],['solution-mass','蒸發前濾液','filtered',false],['solute-mass','乾燥晶體','solid',false]]){
      const value=$(field).value.trim(),measurement=measurements[key];
      if(!value&&optional)continue;
      if(!value||!Number.isFinite(Number(value))||Number(value)<0)issues.push(field==='solution-mass'?'這份濾液已蒸乾，無法再從秤面讀取原本的重量。請補上先前讀值；若忘記讀值，請另取一份重新實驗。':`請自行讀取電子秤，填寫${title}的淨質量紀錄（克）。`);
      else if(!measurement)issues.push(`${title}尚未稱量，請確認這筆紀錄來自電子秤讀值。`);
      else if(Math.abs(Number(value)-measurement.mass)>1e-6)issues.push(`紀錄的${title}淨質量與這份取樣的電子秤讀值不同，請重新核對。`);
    }
    for(const [field,title,expected] of [['calculation-numerator','晶體淨質量',basis.solute],['calculation-denominator','濾液淨質量',basis.solution]]){
      const value=$(field).value.trim();
      if(!value||!Number.isFinite(Number(value))||Number(value)<0)issues.push(`請在公式中填入${title}（克）。`);
      else if(Math.abs(Number(value)-expected)>1e-6)issues.push(`公式中的${title}與這份取樣的稱量紀錄不同，請核對上方紀錄。`);
    }
    if(issues.length)result={ok:false,issues,basis:null};
  }
  const feedback=$('feedback');
  feedback.hidden=false;feedback.dataset.result=result.ok?'correct':'revise';feedback.replaceChildren();
  const title=document.createElement('strong');title.textContent=result.ok?'任務完成：晶體已分離，濃度也算對了。':'再檢查一下這份紀錄。';feedback.append(title);
  const message=document.createElement('p');
  message.textContent=result.ok?`${result.basis.solute} 克 ÷ ${result.basis.solution} 克 × 100% ＝ ${result.basis.percent}%。分母使用蒸發前濾液的淨質量，泥沙已先分離。`:result.issues.join(' ');
  feedback.append(message);feedback.scrollIntoView({block:'nearest',behavior:motion.matches?'instant':'smooth'});
}

function clear(){
  cancelAnimationFrame(frame);frame=0;animation=null;pausedAt=null;cancelDrag();samples=[];answers.clear();active=null;stock=6;nextId=1;
  $('report').reset();invalidateReport();root.querySelectorAll('[data-sample]').forEach(b=>b.remove());delete root.dataset.lastEvent;
  $('concentration-value').value='';update();redraw();announce('點未知樣本 X 取樣，再自由選用器材測試。');$('bottle').focus({preventScroll:true});
}
function cancelDrag(){if(!drag)return;drag.ghost?.remove();$('picture').classList.remove('is-drop-ready');drag=null;}
function isTarget(x,y,kind){
  const r=$('picture').getBoundingClientRect(),px=(x-r.left)/r.width,py=(y-r.top)/r.height;
  return kind==='sample'?px>.39&&px<.56&&py>.46&&py<.77:px>.32&&px<.65&&py>.15&&py<.85;
}
for(const button of controls){
  button.addEventListener('click',()=>{if(performance.now()<suppressClickUntil)return;perform(button.dataset.investTool);});
  button.addEventListener('pointerdown',event=>{
    if(button.disabled||event.button!==0)return;
    drag={pointerId:event.pointerId,button,kind:button.dataset.investTool,x:event.clientX,y:event.clientY,moved:false};button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointermove',event=>{
    if(!drag||drag.button!==button||drag.pointerId!==event.pointerId)return;
    if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<9)return;
    drag.moved=true;if(!drag.ghost){drag.ghost=document.createElement('div');drag.ghost.className='invest-drag-ghost';drag.ghost.setAttribute('aria-hidden','true');drag.ghost.textContent=drag.kind==='sample'?'未知樣本 X':actionName(drag.kind);document.body.append(drag.ghost);}
    drag.ghost.style.left=`${event.clientX}px`;drag.ghost.style.top=`${event.clientY}px`;
    $('picture').classList.toggle('is-drop-ready',isTarget(event.clientX,event.clientY,drag.kind));
  });
  button.addEventListener('pointerup',event=>{
    if(!drag||drag.button!==button||drag.pointerId!==event.pointerId)return;
    const {kind,moved}=drag,target=isTarget(event.clientX,event.clientY,kind);cancelDrag();
    if(moved){suppressClickUntil=performance.now()+500;if(target)perform(kind);else announce('器材已放回，可以重新選用。');}
  });
  button.addEventListener('pointercancel',()=>{if(drag){suppressClickUntil=performance.now()+500;cancelDrag();announce('已取消拿取，樣本與稱量紀錄保留。');}});
  button.addEventListener('lostpointercapture',()=>{if(drag?.button===button)cancelDrag();});
}
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&drag){suppressClickUntil=performance.now()+500;cancelDrag();announce('已放回器材。');}});
$('settle').addEventListener('click',()=>perform('settle'));
$('report').addEventListener('submit',submitReport);
for(const field of answerFields){
  $(field).addEventListener('input',()=>{
    answers.set(active,{...answers.get(active),[field]:$(field).value});
    invalidateReport();
  });
}
$('reset').addEventListener('click',()=>{if(samples.length)$('reset-dialog').showModal();else clear();});
$('reset-dialog').addEventListener('close',()=>{if($('reset-dialog').returnValue==='reset')clear();});
document.addEventListener('visibilitychange',()=>{
  if(!animation)return;
  if(document.hidden){pausedAt=performance.now();cancelAnimationFrame(frame);}
  else if(pausedAt!==null){animation.start+=performance.now()-pausedAt;pausedAt=null;frame=requestAnimationFrame(animation.tick);}
});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);cancelDrag();});
async function initialize(){
  root.dataset.ready='loading';$('loading').hidden=false;$('loading').textContent='準備實驗桌……';$('retry').hidden=true;update();
  try{
    const [table,atlas,glass]=await Promise.all([loadPicture(new URL('./investigation-table.webp?v=clear-4',import.meta.url)),loadPicture(new URL('./investigation-apparatus.webp',import.meta.url)),loadPicture(new URL('./concentration-beaker.webp',import.meta.url))]);
    renderer=createRenderer($('canvas'),{table,atlas,glass});root.dataset.ready='true';$('loading').hidden=true;update();redraw();
  }catch(error){root.dataset.ready='error';$('loading').textContent='器材圖片暫時無法載入，請重新載入器材。';$('retry').hidden=false;announce('實驗桌尚未就緒，其他學習區塊仍可使用。');update();}
}
$('retry').addEventListener('click',initialize);
initialize();
