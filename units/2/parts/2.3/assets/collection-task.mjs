import {TOOL_HOME,directPosition,limitPosition,approach,parkPosition} from './collection-task-direct.mjs?v=supplies-1';
import {DESK_MATERIALS,createDesk,actDesk,advanceDesk,reacting,deskFrame,liquidSeal} from './collection-task-model.mjs?v=supplies-1';
import {createCollectionScene,materialArt} from './collection-task-scene.mjs?v=supplies-1';
const form=document.querySelector('#gas-report-form'),svg=form.querySelector('.task-scene'),scene=createCollectionScene(svg),operation=form.querySelector('[data-desk-operate]'),feedback=form.querySelector('#gas-report-feedback'),context=form.querySelector('[data-desk-context]');
let state=createDesk(),raf=0,last=0,suspended=false,contextKey='',drag=null,suppressClick=false;
const scroller=form.querySelector('.desk-scroll'),hint=form.querySelector('[data-desk-hint]');
const labels={flask:'錐形瓶',jar:'集氣瓶',tank:'水槽',marble:'大理石',outlet:'導管出口',funnel:'漏斗口'};
const tools=['water','forceps','rig','funnel','acid','plate','peroxide','catalyst'];
const targets=[...form.querySelectorAll('[data-desk-target]')];
function materialButton(m){const b=document.createElement('button');b.type='button';b.className='desk-material';b.dataset.deskMaterial=m.id;if(tools.includes(m.id))b.dataset.deskTool=m.id;b.setAttribute('aria-label','取用'+m.name);b.append(materialArt(m.id));const span=document.createElement('span');span.textContent=m.name;b.append(span);return b;}
DESK_MATERIALS.forEach(m=>form.querySelector('.desk-materials').append(materialButton(m)));
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
 form.dataset.state=state.phase;form.dataset.ready='true';form.dataset.paused=String(suspended);form.dataset.marbleCount=String(state.flaskMarbles);form.dataset.held=String(state.heldMarble);form.dataset.acid=state.acid.toFixed(4);form.dataset.tankWater=state.tankWater.toFixed(4);form.dataset.purged=String(state.airRemaining===0);form.dataset.rig=String(state.rig);form.dataset.funnel=String(state.funnel);form.dataset.elapsed=String(state.time);form.dataset.dragging=drag?.entity||'';
 operation.hidden=false;form.querySelector('[data-desk-phase]').textContent=state.phase==='complete'?'完成：已封存二氧化碳':'動手完成排水集氣';form.querySelector('[data-desk-count]').textContent=state.heldMarble?'鑷子夾著 1 塊大理石':`桌上 ${state.selected.length} 件物品`;
 for(const b of form.querySelectorAll('[data-desk-material]')){const id=b.dataset.deskMaterial,present=state.selected.includes(id);b.dataset.present=String(present);b.dataset.active=String(state.tool===id);b.disabled=!!state.motion||state.phase==='complete';b.setAttribute('aria-label',(present?'找到桌上的':'取用')+DESK_MATERIALS.find(m=>m.id===id).name);}
 for(const b of form.querySelectorAll('[data-desk-tool]')){if(!b.dataset.deskMaterial)b.setAttribute('aria-pressed',String(state.tool===b.dataset.deskTool));b.disabled=!!state.motion||state.phase==='complete';b.dataset.installed=String(b.dataset.deskTool==='rig'&&state.rig||b.dataset.deskTool==='funnel'&&state.funnel||b.dataset.deskTool==='plate'&&state.jarCovered);}
 for(const b of form.querySelectorAll('[data-desk-object]')){b.setAttribute('aria-pressed',String(state.focus===b.dataset.deskObject));b.disabled=!!state.motion||state.phase==='complete'||!state.selected.includes(b.dataset.deskObject==='outlet'?'rig':b.dataset.deskObject);}
 form.querySelector('[data-desk-action=stop]').hidden=!['water','acid'].includes(state.motion?.kind);
 form.querySelector('[data-desk-action=inspect]').disabled=!!state.motion||state.phase==='complete';
 form.querySelector('.desk-instruction').textContent=state.phase==='complete'?'氣體已封存在瓶中。可重做實驗，嘗試不同操作。':'點工具放到桌上 → 拖近器材 → 看提示，停靠或放開操作。空白處可放下工具。';
 if(feedback.textContent!==state.feedback)feedback.textContent=state.feedback;feedback.dataset.kind=state.feedbackKind;feedback.dataset.result=state.result||'';
 {
  const frame=deskFrame(state),observation=state.phase==='complete'?'已在水下蓋片，氣體封存在集氣瓶中。':!frame.reaction?'尚未反應；移動或加水都不會產生氣體。':!liquidSeal(state)?state.rig&&state.funnel?'反應瓶有氣泡；液面尚未蓋過漏斗末端，氣體會從漏斗逸出。':'反應瓶有氣泡；瓶口未密合，氣體直接逸出。':frame.collecting?state.jarWater>.015?'反應瓶與瓶內冒泡，集氣瓶的水位逐漸下降。':'瓶內的水已排出，多餘氣體由瓶口逸入水中。':frame.outlet.y+10>524-119*state.tankWater?'出口在瓶外水中冒泡，集氣瓶水位不變。':'導管出口在水面上方，氣體直接逸入空氣。';
  const readout=form.querySelector('[data-desk-observation]');if(readout.textContent!==observation)readout.textContent=observation;
  const coords=scene.render(state);for(const b of targets){const id=b.dataset.deskTarget,c=coords[id];b.style.left=c.x/1100*100+'%';b.style.top=(c.y+100)/750*100+'%';b.hidden=id==='outlet'?!state.rig:id==='funnel'?!state.funnel:!state.selected.includes(id);b.disabled=!!state.motion||state.phase==='complete';b.dataset.active=String(state.focus===id);b.dataset.available=String(!!state.tool);}
 }
 paintContext();
}
function pause(){cancelDrag();cancelAnimationFrame(raf);raf=0;last=0;suspended=true;form.dataset.paused='true';}
function tick(now){if(suspended||state.phase!=='operate'){raf=0;return;}const dt=last?Math.min(120,now-last):0;last=now;const before=state.motion;advanceDesk(state,dt);if(before&&!state.motion&&innerWidth<=700){const id=before.tool,p=['rig','funnel'].includes(id)&&state[id]?{x:300,y:300}:id&&state.positions[id]?state.positions[id]:before.kind==='outlet'?directPosition(state,'outlet'):directPosition(state,'jar');camera(p);}
 if(drag?.moved)updateDrag(now,true);render();raf=requestAnimationFrame(tick);}
function resume(){if(state.phase!=='operate')return;suspended=false;last=0;document.dispatchEvent(new CustomEvent('air-experiment-play',{detail:'collection-task'}));if(!raf)raf=requestAnimationFrame(tick);}
function camera(p){if(innerWidth>700||!p)return;const scale=svg.getBoundingClientRect().width/1100;scroller.scrollLeft=Math.max(0,(p.x*scale)-scroller.clientWidth/2);}
function perform(action,value){
 const oldMotion=state.motion;
 if(action==='restart'){cancelDrag();cancelAnimationFrame(raf);raf=0;const selected=[...state.selected];state=createDesk();state.selected=selected;for(const id of selected)if(TOOL_HOME[id])state.positions[id]={...TOOL_HOME[id]};}
 else {if(action==='reset')cancelDrag();state=actDesk(state,action,value);}
 if((action==='tool'||action==='take')&&state.selected.includes(value)){if(TOOL_HOME[value]&&!state.positions[value])state.positions[value]={...TOOL_HOME[value]};const p=['rig','funnel'].includes(value)&&state[value]?{x:300,y:300}:TOOL_HOME[value]?directPosition(state,value):value==='flask'?{x:300,y:350}:value==='tank'?{x:1000,y:440}:value==='marble'?{x:520,y:550}:directPosition(state,'jar');camera(p);if(innerWidth<=700)scroller.scrollIntoView({block:'center',behavior:'instant'});}
 if(state.motion&&state.motion!==oldMotion){
  const m=state.motion;if(m.kind==='uncover'){m.tool='plate';m.toolStart=state.dragging?.position||directPosition(state,'plate');}
  if(m.tool)m.endTool=parkPosition(state,m.tool,m.target||value);
  if(action==='stop'&&oldMotion){m.tool=oldMotion.tool;m.toolStart=oldMotion.toolStart;m.endTool=oldMotion.endTool;}
  const id=action==='target'?value:['rotate','relocate','uncover','immerse','extract'].includes(action)?'jar':action==='outlet'?'outlet':null;
  if(id){const p=id==='flask'?{x:300,y:300}:id==='tank'?{x:1000,y:400}:directPosition(state,id);camera(p);}
  if(innerWidth<=700)scroller.scrollIntoView({block:'center',behavior:'instant'});
 }
 render();resume();
 if(['reset','restart'].includes(action)&&state.phase==='operate'){scroller.scrollLeft=0;form.querySelector('.desk-instruction').scrollIntoView({block:'start',behavior:'instant'});}
 if(state.phase!=='operate'){cancelAnimationFrame(raf);raf=0;last=0;}
}
form.addEventListener('submit',e=>e.preventDefault());
form.addEventListener('click',e=>{if(suppressClick){suppressClick=false;return;}const b=e.target.closest('button');if(!b)return;if(b.dataset.deskMaterial)perform('take',b.dataset.deskMaterial);else if(b.dataset.deskTool)perform('tool',b.dataset.deskTool);else if(b.dataset.deskTarget)perform('target',b.dataset.deskTarget);else if(b.dataset.deskObject)perform('target',b.dataset.deskObject);else if(b.dataset.deskAction)perform(b.dataset.deskAction,b.dataset.value);});
const world=(x,y)=>{const m=svg.getScreenCTM();return new DOMPoint(x,y).matrixTransform(m.inverse());};
function clearHint(){hint.textContent='';hint.hidden=true;targets.forEach(b=>delete b.dataset.drop);}
function cancelDrag(){if(!drag)return;const d=drag;drag=null;state.dragging=null;clearHint();if(d.b.hasPointerCapture?.(d.id))d.b.releasePointerCapture(d.id);form.dataset.dragging='';render();}
function finishDrag(runAction){
 if(!drag)return;const d=drag;drag=null;clearHint();
 if(d.moved){suppressClick=true;setTimeout(()=>suppressClick=false,350);}
 if(d.moved&&runAction&&d.intent){
  if(tools.includes(d.entity))state.tool=d.entity;
  // 保留當下的真正器材位置作為動畫起點，之後才清除拖曳狀態。
  if(tools.includes(d.entity)&&!(d.entity==='plate'&&state.jarCovered))state.positions[d.entity]={...state.dragging.position};
  perform(d.intent.action,d.intent.value);
  if(!state.motion&&tools.includes(d.entity)&&!(d.entity==='plate'&&state.jarCovered)){state.positions[d.entity]=parkPosition(state,d.entity,d.intent.value);state.tool=null;camera(state.positions[d.entity]);}
 }else if(d.moved&&runAction&&tools.includes(d.entity)&&!(d.entity==='plate'&&state.jarCovered))state.positions[d.entity]={...state.dragging.position};
 state.dragging=null;
 if(d.b.hasPointerCapture?.(d.id))d.b.releasePointerCapture(d.id);
 render();
}
function updateDrag(now,auto=false){
 if(!drag?.moved)return;const d=drag;
 if(auto&&!d.intent){const r=scroller.getBoundingClientRect();if(d.clientX<r.left+42)scroller.scrollLeft-=7;else if(d.clientX>r.right-42)scroller.scrollLeft+=7;}
 const p=world(d.clientX,d.clientY),position=limitPosition(state,d.entity,{x:d.origin.x+p.x-d.start.x,y:d.origin.y+p.y-d.start.y});
 state.dragging={id:d.entity,position};const next=approach(state,d.entity,position,d.origin),key=next?next.action+'|'+next.value:'';
 if(key!==d.key){d.key=key;d.since=now;d.still={...position};}else if(Math.hypot(position.x-d.still.x,position.y-d.still.y)>12){d.since=now;d.still={...position};}
 d.intent=next;hint.hidden=!next;hint.textContent=next?next.label+' · 停靠或放開':'';targets.forEach(b=>b.dataset.drop=String(next?.target===b.dataset.deskTarget));
 if(next){const r=svg.getBoundingClientRect(),v=scroller.getBoundingClientRect();hint.style.left=(scroller.scrollLeft+Math.max(8,Math.min(scroller.clientWidth-hint.offsetWidth-8,d.clientX-v.left+12)))+'px';hint.style.top=Math.max(8,(position.y+100)/750*r.height-60)+'px';}
 if(auto&&next&&now-d.since>=220)finishDrag(true);
}
svg.addEventListener('pointerdown',e=>{
 const b=e.target.closest('[data-desk-drag]');if(!b||state.phase!=='operate'||state.motion||e.button!==0||!e.isPrimary)return;
 const entity=b.dataset.deskDrag;if((entity==='rig'&&state.rig)||(entity==='funnel'&&state.funnel))return;
 if(state.heldMarble&&tools.includes(entity)&&entity!=='forceps'){state.feedback='鑷子還夾著大理石，先放進瓶口或放回盤中。';render();return;}
 e.preventDefault();const origin=directPosition(state,entity);drag={id:e.pointerId,b,entity,origin:{...origin},start:world(e.clientX,e.clientY),clientX:e.clientX,clientY:e.clientY,moved:false,key:'',since:performance.now(),still:{...origin}};b.setPointerCapture(e.pointerId);resume();
});
svg.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();const d=drag;d.clientX=e.clientX;d.clientY=e.clientY;const p=world(e.clientX,e.clientY);if(!d.moved&&Math.hypot(p.x-d.start.x,p.y-d.start.y)<8)return;d.moved=true;updateDrag(performance.now());render();},{passive:false});
svg.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId){if(drag.moved)updateDrag(performance.now());finishDrag(true);}});
svg.addEventListener('pointercancel',cancelDrag);svg.addEventListener('lostpointercapture',()=>{if(drag)cancelDrag();});
svg.addEventListener('keydown',e=>{const el=e.target.closest('[data-desk-drag]');if(!el||state.motion)return;const id=el.dataset.deskDrag;
 if(e.key==='Enter'||e.key===' '){e.preventDefault();const details=form.querySelector('.desk-assistance');details.open=true;if(tools.includes(id)){state.tool=null;perform('tool',id);}else perform('target',id);form.querySelector('[data-desk-context]').scrollIntoView({block:'nearest'});}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',pause);document.addEventListener('air-experiment-play',e=>{if(e.detail!=='collection-task')pause();});new IntersectionObserver(entries=>{if(!entries[0].isIntersecting&&state.phase==='operate')pause();},{rootMargin:'100px'}).observe(form);
form.addEventListener('keydown',e=>{if(e.key==='Escape'){if(drag){cancelDrag();return;}if(['water','acid'].includes(state.motion?.kind))perform('stop');else if(state.tool)perform('tool',state.tool);}});
render();
