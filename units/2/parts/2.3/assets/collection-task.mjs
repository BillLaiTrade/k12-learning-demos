import {TOOL_HOME,directPosition,limitPosition,approach,parkPosition} from './collection-task-direct.mjs?v=open-1';
import {DESK_MATERIALS,createDesk,actDesk,advanceDesk,reacting,deskFrame,liquidSeal,heldMaterial,vesselReaction} from './collection-task-model.mjs?v=open-1';
import {createCollectionScene,materialArt} from './collection-task-scene.mjs?v=open-1';
const form=document.querySelector('#gas-report-form'),svg=form.querySelector('.task-scene'),scene=createCollectionScene(svg),operation=form.querySelector('[data-desk-operate]'),feedback=form.querySelector('#gas-report-feedback');
let state=createDesk(),raf=0,last=0,suspended=false,drag=null;
const scroller=form.querySelector('.desk-scroll'),hint=form.querySelector('[data-desk-hint]');
const tools=['water','forceps','rig','funnel','acid','plate','peroxide','catalyst'];
const targets=[...form.querySelectorAll('[data-desk-target]')];
function materialButton(m){const b=document.createElement('button');b.type='button';b.className='desk-material';b.dataset.deskMaterial=m.id;if(tools.includes(m.id))b.dataset.deskTool=m.id;b.setAttribute('aria-label','取用'+m.name);b.append(materialArt(m.id));const span=document.createElement('span');span.textContent=m.name;b.append(span);return b;}
DESK_MATERIALS.forEach(m=>form.querySelector('.desk-materials').append(materialButton(m)));
function render(){
 form.dataset.state=state.phase;form.dataset.ready='true';form.dataset.paused=String(suspended);form.dataset.marbleCount=String(state.flaskMarbles);form.dataset.held=String(!!heldMaterial(state));form.dataset.heldMaterial=heldMaterial(state)||'';form.dataset.autoFill=String(!!state.motion?.autoFill);form.dataset.reactionUsed=String(state.reactionUsed);form.dataset.reactionEnded=String(state.acid>0&&state.reactionUsed>=state.acid-.00001);form.dataset.acid=state.acid.toFixed(4);form.dataset.flaskWater=state.flaskWater.toFixed(4);form.dataset.tankWater=state.tankWater.toFixed(4);form.dataset.purged=String(state.airRemaining===0);form.dataset.rig=String(state.rig);form.dataset.funnel=String(state.funnel);form.dataset.elapsed=String(state.time);form.dataset.dragging=drag?.entity||'';
 for(const target of ['flask','jar','tank']){const c=state.contents[target];for(const key of ['peroxide','catalyst',...(target==='flask'?[]:['acid'])])form.dataset[target+key[0].toUpperCase()+key.slice(1)]=String(c[key]);if(c.stones)form.dataset[target+'Marbles']=String(c.stones.length);}
 operation.hidden=false;form.querySelector('[data-desk-phase]').textContent=state.phase==='complete'?'完成：已封存二氧化碳':'動手完成排水集氣';form.querySelector('[data-desk-count]').textContent=heldMaterial(state)?'鑷子夾著'+(heldMaterial(state)==='marble'?' 1 塊大理石':'少量二氧化錳'):`桌上 ${state.selected.length} 件物品`;
 for(const b of form.querySelectorAll('[data-desk-material]')){const id=b.dataset.deskMaterial,present=state.selected.includes(id);b.dataset.present=String(present);b.dataset.active=String(state.tool===id);b.disabled=!!state.motion;b.setAttribute('aria-pressed',String(present));b.setAttribute('aria-label',(present?'收回':'取用')+DESK_MATERIALS.find(m=>m.id===id).name);}
 for(const b of form.querySelectorAll('[data-desk-tool]')){if(!b.dataset.deskMaterial)b.setAttribute('aria-pressed',String(state.tool===b.dataset.deskTool));b.disabled=!!state.motion||(!b.dataset.deskMaterial&&state.phase==='complete');b.dataset.installed=String(b.dataset.deskTool==='rig'&&state.rig||b.dataset.deskTool==='funnel'&&state.funnel||b.dataset.deskTool==='plate'&&state.jarCovered);}
 form.querySelector('[data-desk-action=stop]').hidden=!['water','acid','peroxide'].includes(state.motion?.kind);
 form.querySelector('[data-desk-action=inspect]').disabled=!!state.motion||state.phase==='complete';
 form.querySelector('.desk-instruction').textContent=state.phase==='complete'?'氣體已封存在瓶中。可重做實驗，嘗試不同操作。':'點材料上桌 → 拖曳器材對準開口 → 看提示後放開。';
 if(feedback.textContent!==state.feedback)feedback.textContent=state.feedback;feedback.hidden=!state.feedback;feedback.dataset.kind=state.feedbackKind;feedback.dataset.result=state.result||'';
 {
  const frame=deskFrame(state),observation=frame.oxygen?'反應瓶中產生氧氣或混合氣體，不能當作本次要收集的純二氧化碳。':vesselReaction(state,'jar')||vesselReaction(state,'tank')?'集氣瓶或水槽內的材料正在反應冒泡；這不是由導管送入的二氧化碳集氣。':state.phase==='complete'?'已在水下蓋片，氣體封存在集氣瓶中。':!frame.reaction&&state.contents.flask.peroxide>0&&state.contents.flask.peroxideUsed>=state.contents.flask.peroxide-.00001?'這一份雙氧水已反應完，氣泡停止；產生的氣體並非二氧化碳。':!frame.reaction&&state.acid>0&&state.reactionUsed>=state.acid-.00001?'這一份反應物已反應完，氣泡已停止；未導入瓶內的氣體已逸散。':!frame.reaction&&state.flaskWater>0?'反應瓶內已有清水；單加清水不會產生二氧化碳。':!frame.reaction?'目前沒有反應氣泡。可繼續操作，觀察材料接觸後的變化。':!liquidSeal(state)?state.rig&&state.funnel?'反應瓶有氣泡；液面尚未蓋過漏斗末端，氣體會從漏斗逸出。':'反應瓶有氣泡；瓶口未密合，氣體直接逸出。':frame.collecting&&state.airRemaining>0?'正在收進裝置原有的空氣；應先在集氣瓶外排氣。':frame.collecting?state.jarWater>.015?'反應瓶與瓶內冒泡，集氣瓶的水位逐漸下降。':'瓶內的水已排出，多餘氣體由瓶口逸入水中。':frame.outlet.y+10>524-119*state.tankWater?'出口在瓶外水中冒泡，集氣瓶水位不變。':'導管出口在水面上方，氣體直接逸入空氣。';
  const readout=form.querySelector('[data-desk-observation]');if(readout.textContent!==observation)readout.textContent=observation;
  const coords=scene.render(state);for(const b of targets){const id=b.dataset.deskTarget,c=coords[id];b.style.left=c.x/1100*100+'%';b.style.top=(c.y+100)/750*100+'%';b.hidden=id==='outlet'?!state.rig:id==='funnel'?!state.funnel:!state.selected.includes(id);b.disabled=!!state.motion||state.phase==='complete';b.dataset.active=String(state.focus===id);b.dataset.available=String(!!state.tool);}
 }
}
function pause(){cancelDrag();cancelAnimationFrame(raf);raf=0;last=0;suspended=true;form.dataset.paused='true';}
function tick(now){if(suspended||state.phase!=='operate'){raf=0;return;}const dt=last?Math.min(120,now-last):0;last=now;const before=state.motion;advanceDesk(state,dt);if(before&&!state.motion&&innerWidth<=700&&!before.returnAfter){const id=before.tool,p=['rig','funnel'].includes(id)&&state[id]?{x:300,y:300}:id&&state.positions[id]?state.positions[id]:before.kind==='outlet'?directPosition(state,'outlet'):directPosition(state,'jar');camera(p);}
 if(drag?.moved)updateDrag(now,true);render();raf=requestAnimationFrame(tick);}
function resume(){if(state.phase!=='operate')return;suspended=false;last=0;document.dispatchEvent(new CustomEvent('air-experiment-play',{detail:'collection-task'}));if(!raf)raf=requestAnimationFrame(tick);}
function camera(p){if(innerWidth>700||!p)return;const scale=svg.getBoundingClientRect().width/1100;scroller.scrollLeft=Math.max(0,(p.x*scale)-scroller.clientWidth/2);}
function perform(action,value){
 const oldMotion=state.motion;
 if(action==='restart'){cancelDrag();cancelAnimationFrame(raf);raf=0;const selected=[...state.selected];state=createDesk();state.selected=selected;for(const id of selected)if(TOOL_HOME[id])state.positions[id]={...TOOL_HOME[id]};}
 else {if(action==='reset'||action==='take')cancelDrag();state=actDesk(state,action,value);}
 if((action==='tool'||action==='take')&&state.selected.includes(value)){if(TOOL_HOME[value]&&!state.positions[value])state.positions[value]={...TOOL_HOME[value]};const p=['rig','funnel'].includes(value)&&state[value]?{x:300,y:300}:TOOL_HOME[value]?directPosition(state,value):value==='flask'?{x:300,y:350}:value==='tank'?{x:1000,y:440}:value==='marble'?{x:520,y:550}:directPosition(state,'jar');camera(p);if(innerWidth<=700)scroller.scrollIntoView({block:'center',behavior:'instant'});}
 if(state.motion&&state.motion!==oldMotion){
  const m=state.motion;if(m.kind==='place-stone')m.autoFill=true;if(m.kind==='uncover'){m.tool='plate';m.toolStart=state.dragging?.position||directPosition(state,'plate');}
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
// 觸控以同一按鈕上的按下／放開直接處理；捲動、取消及相容 click 不重複切換。
let materialTouch=null,lastMaterialTouch=null;
form.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-desk-material]');if(e.pointerType==='touch'&&e.isPrimary&&b&&!b.disabled)materialTouch={id:e.pointerId,b,x:e.clientX,y:e.clientY};});
form.addEventListener('pointermove',e=>{if(materialTouch?.id===e.pointerId&&Math.hypot(e.clientX-materialTouch.x,e.clientY-materialTouch.y)>12)materialTouch=null;});
form.addEventListener('pointercancel',e=>{if(materialTouch?.id===e.pointerId)materialTouch=null;});
form.addEventListener('pointerup',e=>{if(materialTouch?.id!==e.pointerId)return;const t=materialTouch;materialTouch=null;if(e.target.closest('[data-desk-material]')!==t.b||t.b.disabled)return;e.preventDefault();lastMaterialTouch={b:t.b,time:e.timeStamp};perform('take',t.b.dataset.deskMaterial);});
form.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.deskMaterial&&(e.pointerType==='touch'||e.sourceCapabilities?.firesTouchEvents||e.detail>0&&!e.pointerType&&lastMaterialTouch?.b===b&&e.timeStamp-lastMaterialTouch.time<750))return;if(b.dataset.deskMaterial)perform('take',b.dataset.deskMaterial);else if(b.dataset.deskTool)perform('tool',b.dataset.deskTool);else if(b.dataset.deskTarget)perform('target',b.dataset.deskTarget);else if(b.dataset.deskAction)perform(b.dataset.deskAction,b.dataset.value);});
const world=(x,y)=>{const m=svg.getScreenCTM();return new DOMPoint(x,y).matrixTransform(m.inverse());};
function clearHint(){hint.textContent='';hint.hidden=true;state.contact=null;}
function cancelDrag(){if(!drag)return;const d=drag;drag=null;state.dragging=null;clearHint();if(d.b.hasPointerCapture?.(d.id))d.b.releasePointerCapture(d.id);form.dataset.dragging='';render();}
function finishDrag(runAction){
 if(!drag)return;const d=drag;drag=null;clearHint();
 if(d.moved&&runAction&&d.intent){
  if(tools.includes(d.entity))state.tool=d.entity;
  // 保留當下的真正器材位置作為動畫起點，之後才清除拖曳狀態。
  if(tools.includes(d.entity)&&!(d.entity==='plate'&&state.jarCovered))state.positions[d.entity]={...state.dragging.position};
  perform(d.intent.action,d.intent.value);
  if(state.motion){state.motion.contact=true;state.motion.pourAt=d.intent.pourAt;state.motion.dropAt=d.intent.dropAt;if(d.intent.stoneIndex!==undefined)state.motion.index=d.intent.stoneIndex;}
  if(!state.motion&&tools.includes(d.entity)&&!(d.entity==='plate'&&state.jarCovered)){state.positions[d.entity]=parkPosition(state,d.entity,d.intent.value);state.tool=null;camera(state.positions[d.entity]);}
 }else if(d.moved&&runAction&&d.entity==='jar'&&state.jarPlace<.5)state.positions.jar={...state.dragging.position};
 else if(d.moved&&runAction&&tools.includes(d.entity)&&!(d.entity==='plate'&&state.jarCovered))state.positions[d.entity]={...state.dragging.position};
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
 d.intent=next;hint.hidden=!next;hint.textContent=next?next.label+' · 停靠或放開':'';state.contact=next?.region||null;
 if(next){const r=svg.getBoundingClientRect(),v=scroller.getBoundingClientRect();hint.style.left=(scroller.scrollLeft+Math.max(8,Math.min(scroller.clientWidth-hint.offsetWidth-8,d.clientX-v.left+12)))+'px';hint.style.top=Math.max(8,(position.y+100)/750*r.height-60)+'px';}
 if(auto&&next&&now-d.since>=220)finishDrag(true);
}
svg.addEventListener('pointerdown',e=>{
 const b=e.target.closest('[data-desk-drag],[data-desk-drag-proxy]');if(!b||state.phase!=='operate'||state.motion||e.button!==0||!e.isPrimary)return;
 const entity=b.dataset.deskDrag||b.dataset.deskDragProxy;if(entity==='funnel'&&state.funnel)return;
 if(heldMaterial(state)&&tools.includes(entity)&&entity!=='forceps'){state.feedback='鑷子還夾著材料，先放入容器或放回原碟。';render();return;}
 e.preventDefault();const origin=directPosition(state,entity);drag={id:e.pointerId,b,entity,origin:{...origin},start:world(e.clientX,e.clientY),clientX:e.clientX,clientY:e.clientY,moved:false,key:'',since:performance.now(),still:{...origin}};b.setPointerCapture(e.pointerId);resume();
});
svg.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();const d=drag;d.clientX=e.clientX;d.clientY=e.clientY;const p=world(e.clientX,e.clientY);if(!d.moved&&Math.hypot(p.x-d.start.x,p.y-d.start.y)<8)return;d.moved=true;updateDrag(performance.now());render();},{passive:false});
svg.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId){if(drag.moved)updateDrag(performance.now());finishDrag(true);}});
svg.addEventListener('pointercancel',cancelDrag);svg.addEventListener('lostpointercapture',()=>{if(drag)cancelDrag();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',pause);document.addEventListener('air-experiment-play',e=>{if(e.detail!=='collection-task')pause();});new IntersectionObserver(entries=>{if(!entries[0].isIntersecting&&state.phase==='operate')pause();},{rootMargin:'100px'}).observe(form);
form.addEventListener('keydown',e=>{if(e.key==='Escape'){if(drag){cancelDrag();return;}if(['water','acid','peroxide'].includes(state.motion?.kind))perform('stop');else if(state.tool)perform('tool',state.tool);}});
render();
