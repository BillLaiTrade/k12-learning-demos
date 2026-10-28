import {newSample,finishTest,canTest,DURATION,phaseName,actionName,assessReport,concentrationEvidence} from './investigation-state.js?v=lab-1';
import {loadPicture,createRenderer} from './investigation-renderer.js?v=pour-3';

const root=document.getElementById('invest-lab');
const $=id=>document.getElementById(`invest-${id}`);
const controls=[...root.querySelectorAll('[data-invest-tool]')];
const evidenceIds=['sand','salt','water'];
const motion=matchMedia('(prefers-reduced-motion: reduce)');
let samples=[],records=[],active=null,stock=6,nextId=1,animation=null,renderer=null,frame=0,pausedAt=null,drag=null,suppressClickUntil=0;
const selected=()=>samples.find(s=>s.id===active);
const label=id=>id<=26?String.fromCharCode(64+id):String(id);
function announce(text,observation=false){$('status').textContent=text;$('status').dataset.observation=String(observation);}
function invalidateReport(){const feedback=$('feedback');feedback.hidden=true;feedback.replaceChildren();delete feedback.dataset.result;}
function redraw(now=performance.now()){renderer?.render({sample:selected(),stock,animation},now);}
function fillOptions(select,items,placeholder=''){
  const previous=select.value;select.replaceChildren();
  if(placeholder)select.add(new Option(placeholder,''));
  for(const [value,text] of items)select.add(new Option(text,value));
  if([...select.options].some(o=>o.value===previous))select.value=previous;
}
function updateConcentration(){
  const sample=samples.find(s=>String(s.id)===$('concentration-sample').value),basis=concentrationEvidence(sample);
  const liquid=sample?.measurements.find(m=>m.phase==='filtered'),solid=sample?.measurements.find(m=>m.phase==='dry-filtered');
  $('solution-mass').textContent=liquid?`${liquid.mass} 克`:'尚未稱量';
  $('solute-mass').textContent=solid?`${solid.mass} 克`:'尚未稱量';
  return basis;
}
function update(){
  const sample=selected(),ready=root.dataset.ready==='true',busy=!!animation;
  root.dataset.busy=String(busy);root.dataset.hasSample=String(!!sample);root.dataset.sampleCount=String(samples.length);root.dataset.stock=String(stock);root.dataset.active=active??'';root.dataset.phase=sample?.phase||'';
  for(const button of controls)button.disabled=!ready||busy;
  for(const button of root.querySelectorAll('.invest-tool'))button.setAttribute('aria-pressed',String(button.dataset.investTool===(animation?.kind||sample?.display)));
  $('reset').disabled=!ready;$('take').textContent=stock===0?'補充同批樣本':sample?'＋ 再取一份':'取一份試試 ›';
  $('take').setAttribute('aria-label',stock===0?'補充同一批教學樣本，保留既有取樣與筆記':'從搖勻後的未知樣本取一份到空燒杯');
  $('current').hidden=!sample;$('samples').hidden=samples.length<2;
  $('current-label').textContent=sample?`取樣 ${label(sample.id)} · ${phaseName(sample)}`:'';
  $('settle').hidden=!sample||sample.water===0||sample.sand===0;$('settle').disabled=!ready||busy;
  $('cup').setAttribute('aria-hidden',String(!!sample));
  const focusId=document.activeElement?.dataset?.sample;
  $('samples').replaceChildren();
  for(const s of samples){const button=document.createElement('button');button.type='button';button.dataset.sample=s.id;button.setAttribute('aria-pressed',String(s.id===active));button.disabled=busy;const name=document.createElement('strong');name.textContent=`取樣 ${label(s.id)}`;const phase=document.createElement('span');phase.textContent=phaseName(s);button.append(name,phase);button.addEventListener('click',()=>selectSample(s.id));$('samples').append(button);}
  if(focusId)$('samples').querySelector(`[data-sample="${focusId}"]`)?.focus({preventScroll:true});
  const events=sample?.events||[],old=$('event').value;
  $('record-action').hidden=events.length===0;
  fillOptions($('event'),events.map(e=>[e.id,`${actionName(e.action)}：${e.observation}`]));
  if(!events.some(e=>e.id===old)&&events.length)$('event').value=events.at(-1).id;
  updateRecordButton();
  fillOptions($('concentration-sample'),samples.map(s=>[String(s.id),`取樣 ${label(s.id)}`]));updateConcentration();
  $('canvas').setAttribute('aria-label',sample?`未知樣本 X 與取樣 ${label(sample.id)}，目前為${phaseName(sample)}。${busy?`${actionName(animation.kind)}進行中。`:sample.events.at(-1)?.observation||''}`:'未知混合物樣本瓶、空燒杯與收好的器材盤。點空燒杯取樣。');
}
function updateRecordButton(){const exists=records.some(r=>r.event.id===$('event').value);$('record').disabled=!!animation||exists||!$('event').value;$('event').disabled=!!animation;$('record').textContent=exists?'已記錄':'記一筆';}
function selectSample(id){
  if(animation)return;active=id;const sample=selected();update();redraw();announce(sample.events.at(-1)?.observation||`已選取取樣 ${label(id)}，可以選用器材測試。`,!!sample.events.length);
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
      $('event').value='';
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
function addRecord(){
  const event=selected()?.events.find(e=>e.id===$('event').value);
  if(!event||animation||records.some(r=>r.event.id===event.id))return;
  const record={id:`note-${event.id}`,event:structuredClone(event),note:''};records.push(record);renderNotes();updateRecordButton();
  $('notebook').open=true;announce(`已把取樣 ${label(event.sampleId)} 的${actionName(event.action)}觀察放進實驗筆記。`);
}
function renderNotes(){
  $('records').replaceChildren();$('note-count').textContent=records.length?`${records.length} 筆紀錄`:'尚無紀錄';$('empty').hidden=records.length>0;$('report').hidden=!records.length;
  for(const [index,record] of records.entries()){
    const article=document.createElement('article');article.className='invest-note';article.dataset.record=record.id;
    const header=document.createElement('header'),title=document.createElement('strong'),remove=document.createElement('button');title.textContent=`紀錄 ${index+1} · 取樣 ${label(record.event.sampleId)} · ${actionName(record.event.action)}`;remove.type='button';remove.textContent='移除';remove.setAttribute('aria-label',`移除紀錄 ${index+1}`);remove.addEventListener('click',()=>{records=records.filter(r=>r.id!==record.id);renderNotes();updateRecordButton();invalidateReport();});header.append(title,remove);
    const fact=document.createElement('p');fact.textContent=record.event.observation;
    const noteLabel=document.createElement('label'),input=document.createElement('textarea');input.id=`invest-${record.id}`;input.value=record.note;input.maxLength=600;input.placeholder='補上你的觀察或想法……';noteLabel.htmlFor=input.id;noteLabel.textContent='我的補充';input.addEventListener('input',()=>{record.note=input.value;invalidateReport();});article.append(header,fact,noteLabel,input);$('records').append(article);
  }
  for(const key of evidenceIds)fillOptions($(`evidence-${key}`),records.map((r,i)=>[r.id,`紀錄 ${i+1} · ${label(r.event.sampleId)} · ${actionName(r.event.action)}`]),'選擇支持的紀錄');
  invalidateReport();
}
function submitReport(event){
  event.preventDefault();const components=[...$('report').querySelectorAll('[name="component"]:checked')].map(i=>i.value),evidence=Object.fromEntries(evidenceIds.map(key=>[key,$(`evidence-${key}`).value]));
  const concentration=$('include-concentration').checked?{basis:updateConcentration(),value:$('concentration-value').value,unit:$('concentration-unit').value}:null;
  const result=assessReport(records,components,evidence,concentration),feedback=$('feedback');feedback.hidden=false;feedback.dataset.result=result.ok?'correct':'revise';feedback.replaceChildren();
  const title=document.createElement('strong');title.textContent=result.ok?'你的成分推論有觀察支持。':'還有推論需要補上證據。';feedback.append(title);
  if(result.ok){
    const p=document.createElement('p');p.textContent='在題目提供的候選成分範圍內，泥沙留在濾紙，食鹽通過濾紙後由蒸發取回，水則在蒸發時離開容器。透明的濾液仍可能含溶質；僅看白色固體，不能在其他未知樣本中直接鑑定食鹽。';feedback.append(p);
    if(concentration){const calculation=document.createElement('p');calculation.textContent=`${concentration.basis.solute} ÷ ${concentration.basis.solution} × 100% ＝ ${concentration.basis.percent}%；也等於 ${concentration.basis.ppm.toLocaleString('en-US')} ppm。這份樣本用百分濃度較易讀；溶質特別少時，ppm 較方便。`;feedback.append(calculation);}
  }else {const list=document.createElement('ul');for(const text of result.issues){const li=document.createElement('li');li.textContent=text;list.append(li);}feedback.append(list);}
  feedback.scrollIntoView({block:'nearest',behavior:motion.matches?'instant':'smooth'});
}
function clear(){
  cancelAnimationFrame(frame);frame=0;animation=null;pausedAt=null;cancelDrag();samples=[];records=[];active=null;stock=6;nextId=1;
  $('report').reset();$('notebook').open=false;root.querySelectorAll('[data-sample]').forEach(b=>b.remove());delete root.dataset.lastEvent;
  $('concentration-value').value='';$('report').querySelectorAll('details').forEach(d=>d.open=false);renderNotes();update();redraw();announce('可重複取樣，自由選用器材測試。');$('take').focus({preventScroll:true});
}
function cancelDrag(){if(!drag)return;drag.ghost?.remove();$('picture').classList.remove('is-drop-ready');drag=null;}
function isTarget(x,y,kind){
  const r=$('picture').getBoundingClientRect(),px=(x-r.left)/r.width,py=(y-r.top)/r.height;
  return kind==='sample'?px>.12&&px<.58&&py>.2&&py<.8:px>.32&&px<.65&&py>.15&&py<.85;
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
    drag.moved=true;if(!drag.ghost){drag.ghost=document.createElement('div');drag.ghost.className='invest-drag-ghost';drag.ghost.setAttribute('aria-hidden','true');drag.ghost.textContent=actionName(drag.kind);document.body.append(drag.ghost);}
    drag.ghost.style.left=`${event.clientX}px`;drag.ghost.style.top=`${event.clientY}px`;
    $('picture').classList.toggle('is-drop-ready',isTarget(event.clientX,event.clientY,drag.kind));
  });
  button.addEventListener('pointerup',event=>{
    if(!drag||drag.button!==button||drag.pointerId!==event.pointerId)return;
    const {kind,moved}=drag,target=isTarget(event.clientX,event.clientY,kind);cancelDrag();
    if(moved){suppressClickUntil=performance.now()+500;if(target)perform(kind);else announce('器材已放回，可以重新選用。');}
  });
  button.addEventListener('pointercancel',()=>{if(drag){suppressClickUntil=performance.now()+500;cancelDrag();announce('已取消拿取，樣本與筆記保留。');}});
  button.addEventListener('lostpointercapture',()=>{if(drag?.button===button)cancelDrag();});
}
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&drag){suppressClickUntil=performance.now()+500;cancelDrag();announce('已放回器材。');}});
$('settle').addEventListener('click',()=>perform('settle'));
$('record').addEventListener('click',addRecord);$('event').addEventListener('change',updateRecordButton);
$('report').addEventListener('submit',submitReport);$('report').addEventListener('input',invalidateReport);$('report').addEventListener('change',()=>{invalidateReport();updateConcentration();});
$('continue').addEventListener('click',()=>{$('notebook').open=false;$('take').focus({preventScroll:true});root.scrollIntoView({block:'start',behavior:motion.matches?'instant':'smooth'});});
$('reset').addEventListener('click',()=>{if(samples.length||records.length)$('reset-dialog').showModal();else clear();});
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
