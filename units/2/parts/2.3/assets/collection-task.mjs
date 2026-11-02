import {DESK_MATERIALS,createDesk,actDesk,advanceDesk,reacting,deskFrame,liquidSeal} from './collection-task-model.mjs?v=desk-2';
import {createCollectionScene,materialArt} from './collection-task-scene.mjs?v=desk-2';
const form=document.querySelector('#gas-report-form'),svg=form.querySelector('.task-scene'),scene=createCollectionScene(svg),selection=form.querySelector('[data-desk-select]'),operation=form.querySelector('[data-desk-operate]'),feedback=form.querySelector('#gas-report-feedback'),context=form.querySelector('[data-desk-context]');
let state=createDesk(),raf=0,last=0,suspended=false,contextKey='',drag=null,suppressClick=false;
const labels={flask:'錐形瓶',jar:'集氣瓶',tank:'水槽',marble:'大理石',outlet:'導管出口',funnel:'漏斗口'};
const tools=['water','forceps','rig','funnel','acid','plate'];
const targets=[...form.querySelectorAll('[data-desk-target]')];
function materialButton(m,kind){const b=document.createElement('button');b.type='button';b.className=kind==='select'?'desk-material':'desk-tool';b.dataset[kind==='select'?'deskMaterial':'deskTool']=m.id;b.setAttribute('aria-pressed','false');b.setAttribute('aria-label',(kind==='select'?'選取':'拿起')+m.name);b.append(materialArt(m.id));const span=document.createElement('span');span.textContent=m.name;b.append(span);return b;}
DESK_MATERIALS.forEach(m=>form.querySelector('.desk-materials').append(materialButton(m,'select')));
tools.forEach(id=>form.querySelector('.desk-tools').append(materialButton(DESK_MATERIALS.find(m=>m.id===id),'tool')));
for(const id of ['flask','jar','tank','marble','outlet']){const b=document.createElement('button');b.type='button';b.dataset.deskObject=id;b.textContent=labels[id];b.setAttribute('aria-pressed','false');form.querySelector('.desk-object-buttons').append(b);}
const button=(text,action,value)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.dataset.deskAction=action;if(value)b.dataset.value=value;return b;};
function paintContext(){const key=[state.phase,state.focus,state.tool,state.heldMarble,state.jarCovered,state.jarAngle>90,state.jarPlace>.5,state.rig,state.funnel,state.outlet,!!state.motion].join('|');if(key===contextKey)return;contextKey=key;context.replaceChildren();
 if(state.phase==='complete'){const p=document.createElement('p');p.textContent='已完成封存，可重做實驗嘗試其他操作。';context.append(p);return;}
 if(state.motion){const p=document.createElement('p');p.textContent='正在操作…';context.append(p);return;}
 if(state.tool){const b=button('放下工具','tool',state.tool);context.append(b);if(state.heldMarble)context.append(button('從瓶口放入','target','flask'),button('放回盤中','target','marble'));return;}
 const f=state.focus;
 if(f==='jar'){context.append(button(state.jarAngle>90?'扶正集氣瓶':'倒置集氣瓶','rotate'),button(state.jarPlace>.5?'移到桌面':'移入水槽','relocate'));if(state.jarCovered)context.append(button('移開玻璃片','uncover'));else context.append(button('拿取薄玻璃片','tool','plate'));}
 else if(f==='outlet'){context.append(button('放到瓶外水中','outlet','tank'),button('從下方移入集氣瓶','outlet','jar'),button('移到水面上方','outlet','air'));}
 else if(f==='marble')context.append(button('拿起鑷子','tool','forceps'));
 else if(f==='tank')context.append(button('拿起清水','tool','water'));
 else if(f==='flask'){if(state.rig)context.append(button('移開塞子與導管','remove-rig'));else context.append(button('拿取雙孔塞與導管','tool','rig'));}
}
function render(){
 form.dataset.state=state.phase;form.dataset.ready='true';form.dataset.paused=String(suspended);form.dataset.marbleCount=String(state.flaskMarbles);form.dataset.held=String(state.heldMarble);form.dataset.acid=state.acid.toFixed(4);form.dataset.tankWater=state.tankWater.toFixed(4);form.dataset.purged=String(state.airRemaining===0);form.dataset.rig=String(state.rig);form.dataset.funnel=String(state.funnel);form.dataset.elapsed=String(state.time);
 selection.hidden=state.phase!=='choose';operation.hidden=state.phase==='choose';form.querySelector('[data-desk-phase]').textContent=state.phase==='choose'?'① 挑選材料與器具':state.phase==='complete'?'完成：已封存二氧化碳':'② 動手完成排水集氣';form.querySelector('[data-desk-count]').textContent=state.phase==='choose'?`已選 ${state.selected.length} 件`:state.heldMarble?'鑷子夾著 1 塊大理石':state.tool?`手上：${DESK_MATERIALS.find(m=>m.id===state.tool).name}`:'';
 for(const b of form.querySelectorAll('[data-desk-material]'))b.setAttribute('aria-pressed',String(state.selected.includes(b.dataset.deskMaterial)));
 for(const b of form.querySelectorAll('[data-desk-tool]')){b.setAttribute('aria-pressed',String(state.tool===b.dataset.deskTool));b.disabled=!!state.motion||state.phase==='complete';b.dataset.installed=String(b.dataset.deskTool==='rig'&&state.rig||b.dataset.deskTool==='funnel'&&state.funnel||b.dataset.deskTool==='plate'&&state.jarCovered);}
 for(const b of form.querySelectorAll('[data-desk-object]')){b.setAttribute('aria-pressed',String(state.focus===b.dataset.deskObject));b.disabled=!!state.motion||state.phase==='complete';}
 form.querySelector('[data-desk-action=stop]').hidden=!['water','acid'].includes(state.motion?.kind);
 form.querySelector('[data-desk-action=inspect]').disabled=!!state.motion||state.phase==='complete';
 form.querySelector('.desk-instruction').textContent=state.phase==='complete'?'氣體已封存在瓶中。可重做實驗，嘗試不同操作。':'拿起工具 → 點選器材，也可拖到器材上。點集氣瓶或導管出口，可調整位置。';
 if(feedback.textContent!==state.feedback)feedback.textContent=state.feedback;feedback.dataset.kind=state.feedbackKind;feedback.dataset.result=state.result||'';
 if(state.phase!=='choose'){
  const frame=deskFrame(state),observation=state.phase==='complete'?'已在水下蓋片，氣體封存在集氣瓶中。':!frame.reaction?'尚未反應；移動或加水都不會產生氣體。':!liquidSeal(state)?state.rig&&state.funnel?'反應瓶有氣泡；液面尚未蓋過漏斗末端，氣體會從漏斗逸出。':'反應瓶有氣泡；瓶口未密合，氣體直接逸出。':frame.collecting?state.jarWater>.015?'反應瓶與瓶內冒泡，集氣瓶的水位逐漸下降。':'瓶內的水已排出，多餘氣體由瓶口逸入水中。':frame.outlet.y+10>524-119*state.tankWater?'出口在瓶外水中冒泡，集氣瓶水位不變。':'導管出口在水面上方，氣體直接逸入空氣。';
  const readout=form.querySelector('[data-desk-observation]');if(readout.textContent!==observation)readout.textContent=observation;
  const coords=scene.render(state);for(const b of targets){const id=b.dataset.deskTarget,c=coords[id];b.style.left=c.x/1100*100+'%';b.style.top=(c.y+100)/750*100+'%';b.hidden=id==='outlet'&&!state.rig||id==='funnel'&&!state.funnel;b.disabled=!!state.motion||state.phase==='complete';b.dataset.active=String(state.focus===id);b.dataset.available=String(!!state.tool);}
 }
 paintContext();
}
function pause(){cancelAnimationFrame(raf);raf=0;last=0;suspended=true;form.dataset.paused='true';}
function tick(now){if(suspended||state.phase!=='operate'){raf=0;return;}const dt=last?Math.min(120,now-last):0;last=now;advanceDesk(state,dt);render();raf=requestAnimationFrame(tick);}
function resume(){if(state.phase!=='operate')return;suspended=false;last=0;document.dispatchEvent(new CustomEvent('air-experiment-play',{detail:'collection-task'}));if(!raf)raf=requestAnimationFrame(tick);}
function perform(action,value){
 if(action==='restart'){cancelAnimationFrame(raf);raf=0;const selected=[...state.selected];state=createDesk();state.selected=selected;state=actDesk(state,'begin');}
 else state=actDesk(state,action,value);
 render();resume();
 const targetId=action==='target'?value:['rotate','relocate','uncover'].includes(action)?'jar':action==='outlet'?'outlet':null;
 if(targetId&&innerWidth<=700){const target=form.querySelector(`[data-desk-target=${targetId}]`),scroller=form.querySelector('.desk-scroll');if(target)scroller.scrollLeft=Math.max(0,target.offsetLeft-scroller.clientWidth/2);if(state.motion)scroller.scrollIntoView({block:'center',behavior:'instant'});}
 if(['begin','restart'].includes(action)&&state.phase==='operate'){form.querySelector('.desk-scroll').scrollLeft=0;form.querySelector('.desk-instruction').scrollIntoView({block:'start',behavior:'instant'});}
 if(state.phase!=='operate'){cancelAnimationFrame(raf);raf=0;last=0;}
}
form.addEventListener('submit',e=>e.preventDefault());
form.addEventListener('click',e=>{if(suppressClick){suppressClick=false;return;}const b=e.target.closest('button');if(!b)return;if(b.dataset.deskMaterial)perform('select',b.dataset.deskMaterial);else if(b.dataset.deskTool)perform('tool',b.dataset.deskTool);else if(b.dataset.deskTarget)perform('target',b.dataset.deskTarget);else if(b.dataset.deskObject)perform('target',b.dataset.deskObject);else if(b.dataset.deskAction)perform(b.dataset.deskAction,b.dataset.value);});
form.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-desk-tool],[data-desk-target=outlet],[data-desk-target=jar]');if(!b||b.disabled||e.button!==0||!e.isPrimary)return;drag={id:e.pointerId,b,x:e.clientX,y:e.clientY,moved:false,tool:b.dataset.deskTool,object:b.dataset.deskTarget};if(drag.tool||drag.object==='outlet')b.setPointerCapture(e.pointerId);});
form.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.id)return;if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<12)return;
 // 集氣瓶在觸控下保留桌面捲動；可用點選與位置按鈕完成相同操作。
 if(drag.object==='jar'&&e.pointerType==='touch'){drag=null;return;}
 e.preventDefault();if(!drag.moved){drag.moved=true;drag.ghost=document.createElement('div');drag.ghost.className='desk-drag-ghost';drag.ghost.append(materialArt(drag.tool||'jar'));document.body.append(drag.ghost);}
 drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';targets.forEach(b=>b.dataset.drop=String(b===document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-desk-target]')));
},{passive:false});
function endDrag(e){
 if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;d.ghost?.remove();targets.forEach(b=>delete b.dataset.drop);if(!d.moved)return;suppressClick=true;setTimeout(()=>suppressClick=false,300);
 const rect=svg.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*1100,y=(e.clientY-rect.top)/rect.height*750-100,target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-desk-target]')?.dataset.deskTarget;
 if(d.tool){if(state.tool!==d.tool)perform('tool',d.tool);if(target)perform('target',target);}
 else if(d.object==='outlet')perform('outlet',x>790&&y>350?'jar':y>350?'tank':'air');
 else if(d.object==='jar')perform('relocate');
}
form.addEventListener('pointerup',endDrag);form.addEventListener('pointercancel',()=>{drag?.ghost?.remove();drag=null;targets.forEach(b=>delete b.dataset.drop);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',pause);document.addEventListener('air-experiment-play',e=>{if(e.detail!=='collection-task')pause();});new IntersectionObserver(entries=>{if(!entries[0].isIntersecting&&state.phase==='operate')pause();},{rootMargin:'100px'}).observe(form);
form.addEventListener('keydown',e=>{if(e.key==='Escape'){if(['water','acid'].includes(state.motion?.kind))perform('stop');else if(state.tool)perform('tool',state.tool);}});
render();

form.querySelector('[data-desk-action=begin]').disabled=false;
