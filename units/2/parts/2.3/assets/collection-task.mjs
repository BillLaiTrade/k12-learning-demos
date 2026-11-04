import {TOOL_HOME,directPosition,limitPosition,approach,parkPosition,safeParkPosition} from './collection-task-direct.mjs?v=b-decisions-20261104';
import {DESK_MATERIALS,createDesk,actDesk,advanceDesk,reacting,deskFrame,liquidSeal,heldMaterial,vesselReaction,setupGuidance,currentGuidance,deskObservation,waterSurface,jarMouth} from './collection-task-model.mjs?v=b-decisions-20261104';
import {createCollectionScene,materialArt} from './collection-task-scene.mjs?v=b-decisions-20261104';
const form=document.querySelector('#gas-report-form'),svg=form.querySelector('.task-scene'),scene=createCollectionScene(svg),operation=form.querySelector('[data-desk-operate]'),feedback=form.querySelector('#gas-report-feedback');
let state=createDesk(),raf=0,last=0,suspended=false,drag=null,feedbackKey=null;
const scroller=form.querySelector('.desk-scroll'),hint=form.querySelector('[data-desk-hint]');
const tools=['water','forceps','rig','funnel','acid','plate','peroxide','catalyst'];
// 移除已停用的透明控制，不留下鍵盤可到達的幽靈按鈕。
form.querySelectorAll('[data-desk-target]').forEach(node=>node.remove());
function materialButton(m){const b=document.createElement('button');b.type='button';b.className='desk-material';b.dataset.deskMaterial=m.id;if(tools.includes(m.id))b.dataset.deskTool=m.id;b.setAttribute('aria-label','取用'+m.name);b.append(materialArt(m.id));const span=document.createElement('span');span.textContent=m.name;b.append(span);return b;}
DESK_MATERIALS.forEach(m=>form.querySelector('.desk-materials').append(materialButton(m)));
function render(){
 form.dataset.state=state.phase;form.dataset.ready='true';form.dataset.paused=String(suspended);form.dataset.marbleCount=String(state.flaskMarbles);form.dataset.held=String(!!heldMaterial(state));form.dataset.heldMaterial=heldMaterial(state)||'';form.dataset.autoFill=String(!!state.motion?.autoFill);form.dataset.reactionUsed=String(state.reactionUsed);form.dataset.reactionEnded=String(state.acid>0&&state.reactionUsed>=state.acid-.00001);form.dataset.acid=state.acid.toFixed(4);form.dataset.flaskWater=state.flaskWater.toFixed(4);form.dataset.tankWater=state.tankWater.toFixed(4);form.dataset.purged=String(state.airRemaining===0);form.dataset.rig=String(state.rig);form.dataset.funnel=String(state.funnel);form.dataset.elapsed=String(state.time);form.dataset.dragging=drag?.entity||'';
 for(const target of ['flask','jar','tank']){const c=state.contents[target];for(const key of ['peroxide','catalyst',...(target==='flask'?[]:['acid'])])form.dataset[target+key[0].toUpperCase()+key.slice(1)]=String(c[key]);if(c.stones)form.dataset[target+'Marbles']=String(c.stones.length);}
 operation.hidden=false;form.querySelector('[data-desk-phase]').textContent=state.phase==='complete'?'完成：已封存二氧化碳':'動手完成排水集氣';form.querySelector('[data-desk-count]').textContent=heldMaterial(state)?'鑷子夾著'+(heldMaterial(state)==='marble'?' 1 塊大理石':'少量二氧化錳'):`桌上 ${state.selected.length} 件物品`;
 for(const b of form.querySelectorAll('[data-desk-material]')){const id=b.dataset.deskMaterial,present=state.selected.includes(id);b.dataset.present=String(present);b.dataset.active=String(state.tool===id);b.disabled=!!state.motion;b.setAttribute('aria-pressed',String(present));b.setAttribute('aria-label',(present?'收回':'取用')+DESK_MATERIALS.find(m=>m.id===id).name);}
 for(const b of form.querySelectorAll('[data-desk-tool]')){if(!b.dataset.deskMaterial)b.setAttribute('aria-pressed',String(state.tool===b.dataset.deskTool));b.disabled=!!state.motion;b.dataset.installed=String(b.dataset.deskTool==='rig'&&state.rig||b.dataset.deskTool==='funnel'&&state.funnel||b.dataset.deskTool==='plate'&&state.jarCovered);}
 form.querySelector('[data-desk-action=stop]').hidden=!['water','acid','peroxide'].includes(state.motion?.kind);
 form.querySelector('[data-desk-action=inspect]').disabled=!!state.motion;
 form.querySelector('.desk-instruction').textContent=state.phase==='complete'?'本次檢查通過，仍可繼續操作。移開封口後會重新判斷保存狀態。':'點材料上桌 → 拖曳器材到操作位置 → 看提示後放開。';
 const live=currentGuidance(state);if(live&&(!state.motion||live.source==='capacity')){state.feedback=live.text;state.feedbackKind=live.kind;}
 const nextFeedbackKey=state.feedbackKind+'|'+state.feedback;
 if(nextFeedbackKey!==feedbackKey){feedbackKey=nextFeedbackKey;const error=state.feedbackKind==='error';feedback.setAttribute('role',error?'alert':'status');feedback.setAttribute('aria-live',error?'assertive':'polite');feedback.replaceChildren();if(error){const label=document.createElement('strong');label.className='desk-feedback-label';label.textContent='操作錯誤';feedback.append(label,document.createTextNode(' '+state.feedback));}else feedback.textContent=state.feedback;}
 feedback.hidden=!state.feedback;feedback.dataset.kind=state.feedbackKind;feedback.dataset.result=state.result||'';
 {
  const observation=deskObservation(state);
  const readout=form.querySelector('[data-desk-observation]');if(readout.textContent!==observation)readout.textContent=observation;
  scene.render(state);

 }
}
function pause(){cancelShelf();cancelDrag();cancelAnimationFrame(raf);raf=0;last=0;suspended=true;form.dataset.paused='true';}
function reconcileParking(){for(const id of tools){if(!state.autoParked[id]||!state.selected.includes(id)||id==='rig'&&state.rig||id==='funnel'&&state.funnel||id==='plate'&&state.jarCovered)continue;state.positions[id]=safeParkPosition(state,id,directPosition(state,id));}}
function tick(now){if(suspended){raf=0;return;}const dt=last?Math.min(120,now-last):0;last=now;const before=state.motion;advanceDesk(state,dt);if(state.motion&&state.motion!==before&&state.motion.tool)state.motion.endTool=parkPosition(state,state.motion.tool,state.motion.target);if(before&&!state.motion&&!drag)reconcileParking();if(before&&!state.motion&&innerWidth<=700&&!before.returnAfter){const id=before.tool,p=id?directPosition(state,id):before.kind==='outlet'?directPosition(state,'outlet'):directPosition(state,'jar');camera(p);}
 if(shelf?.moved){const r=scroller.getBoundingClientRect();if(shelf.clientY>innerHeight-60&&r.top>shelf.clientY-60)window.scrollBy(0,9);else if(shelf.clientY<60&&r.bottom<shelf.clientY+60)window.scrollBy(0,-9);}
 if(drag?.moved)updateDrag(now,true);render();raf=requestAnimationFrame(tick);}
function resume(){suspended=false;last=0;document.dispatchEvent(new CustomEvent('air-experiment-play',{detail:'collection-task'}));if(!raf)raf=requestAnimationFrame(tick);}
function camera(p){if(innerWidth>700||!p)return;const scale=svg.getBoundingClientRect().width/1100;scroller.scrollLeft=Math.max(0,(p.x*scale)-scroller.clientWidth/2);}
function perform(action,value){
 const oldMotion=state.motion;if(action==='outlet')state.followFlow=true;else if(['take','tool','target'].includes(action))state.followFlow=false;
 if(action==='restart'){cancelDrag();cancelAnimationFrame(raf);raf=0;cancelShelf();state=createDesk();}
 else {if(action==='reset'||action==='take')cancelDrag();state=actDesk(state,action,value);}
 if((action==='tool'||action==='take')&&state.selected.includes(value)){if(TOOL_HOME[value]&&!state.positions[value])state.positions[value]=safeParkPosition(state,value,TOOL_HOME[value]);state.autoParked[value]=true;const p=directPosition(state,value);camera(p);if(innerWidth<=700)scroller.scrollIntoView({block:'center',behavior:'instant'});}
 if(state.motion&&state.motion!==oldMotion){
  const m=state.motion;if(m.kind==='place-stone'||m.kind==='drop-solid'&&m.solid==='marble')m.autoFill=true;if(m.kind==='uncover'){m.tool='plate';m.toolStart=state.dragging?.position||directPosition(state,'plate');}
  if(m.tool){m.endTool=parkPosition(state,m.tool,m.target||value);state.autoParked[m.tool]=true;}
  if(action==='stop'&&oldMotion){m.tool=oldMotion.tool;m.toolStart=oldMotion.toolStart;m.endTool=oldMotion.endTool;}
  const id=action==='target'?value:['rotate','relocate','uncover','immerse','extract'].includes(action)?'jar':action==='outlet'?'outlet':null;
  if(id){const p=directPosition(state,id);camera(p);}
  if(innerWidth<=700)scroller.scrollIntoView({block:'center',behavior:'instant'});
 }
 render();resume();
 if(['reset','restart'].includes(action)&&state.phase==='operate'){scroller.scrollLeft=0;form.querySelector('.desk-instruction').scrollIntoView({block:'start',behavior:'instant'});}
}
form.addEventListener('submit',e=>e.preventDefault());
// 材料區支援點選與拖曳取用，放到桌面才取用；取消或放在桌外不改變狀態。
let shelf=null,lastMaterialTouch=null;
function cancelShelf(){if(!shelf)return;const d=shelf;shelf=null;d.ghost?.remove();if(d.id!=null&&d.b.hasPointerCapture?.(d.id))d.b.releasePointerCapture(d.id);}
form.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-desk-material]');if(!b||b.disabled||!e.isPrimary||e.button!==0)return;shelf={id:e.pointerId,b,x:e.clientX,y:e.clientY,moved:false,clientY:e.clientY};b.setPointerCapture(e.pointerId);resume();});
form.addEventListener('pointermove',e=>{if(shelf?.id!==e.pointerId)return;const d=shelf;d.clientY=e.clientY;if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<10)return;e.preventDefault();if(!d.moved){d.moved=true;d.ghost=document.createElement('div');d.ghost.className='desk-shelf-ghost';d.ghost.setAttribute('aria-hidden','true');d.ghost.append(materialArt(d.b.dataset.deskMaterial));document.body.append(d.ghost);}d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';},{passive:false});
form.addEventListener('pointerup',e=>{if(shelf?.id!==e.pointerId)return;const d=shelf,id=d.b.dataset.deskMaterial;lastMaterialTouch={b:d.b,time:e.timeStamp};cancelShelf();e.preventDefault();if(!d.moved){perform('take',id);return;}const r=scroller.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;if(!state.selected.includes(id))perform('take',id);if(!state.selected.includes(id))return;state.autoParked[id]=false;if(TOOL_HOME[id]&&!(id==='rig'&&state.rig||id==='funnel'&&state.funnel||id==='plate'&&state.jarCovered)){const q=world(e.clientX,e.clientY);state.positions[id]=limitPosition(state,id,q);}else if(['flask','tank','marble'].includes(id)){const q=world(e.clientX,e.clientY);state.positions[id]=limitPosition(state,id,q);}else if(id==='jar'&&state.jarPlace===0&&!state.jarCovered){const q=world(e.clientX,e.clientY);state.positions.jar=limitPosition(state,id,q);}state.tool=null;render();resume();});
form.addEventListener('pointercancel',cancelShelf);form.addEventListener('lostpointercapture',e=>{if(shelf?.id===e.pointerId)cancelShelf();});
let actionTouch=null,lastActionTouch=null;
form.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-desk-action]');if(e.pointerType==='touch'&&e.isPrimary&&b&&!b.disabled)actionTouch={id:e.pointerId,b,x:e.clientX,y:e.clientY};});
form.addEventListener('pointermove',e=>{if(actionTouch?.id===e.pointerId&&Math.hypot(e.clientX-actionTouch.x,e.clientY-actionTouch.y)>12)actionTouch=null;});
form.addEventListener('pointercancel',()=>{actionTouch=null;});
form.addEventListener('pointerup',e=>{if(actionTouch?.id!==e.pointerId)return;const t=actionTouch;actionTouch=null;if(e.target.closest('[data-desk-action]')!==t.b||t.b.disabled)return;e.preventDefault();lastActionTouch={b:t.b,time:e.timeStamp};perform(t.b.dataset.deskAction,t.b.dataset.value);});
form.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.deskAction&&e.detail>0&&lastActionTouch?.b===b&&e.timeStamp-lastActionTouch.time<750)return;if(b.dataset.deskMaterial&&(e.detail>0&&lastMaterialTouch?.b===b&&e.timeStamp-lastMaterialTouch.time<750))return;if(b.dataset.deskMaterial)perform('take',b.dataset.deskMaterial);else if(b.dataset.deskTool)perform('tool',b.dataset.deskTool);else if(b.dataset.deskTarget)perform('target',b.dataset.deskTarget);else if(b.dataset.deskAction)perform(b.dataset.deskAction,b.dataset.value);});
const world=(x,y)=>{const m=svg.getScreenCTM();return new DOMPoint(x,y).matrixTransform(m.inverse());};
function clearHint(){hint.textContent='';hint.hidden=true;state.contact=null;}
function cancelDrag(){if(!drag)return;const d=drag;drag=null;d.b.setAttribute('aria-pressed','false');state.dragging=null;clearHint();if(d.id!=null&&d.b.hasPointerCapture?.(d.id))d.b.releasePointerCapture(d.id);scene.endDrag();if(d.keyboard)d.b.focus({preventScroll:true});form.dataset.dragging='';render();}
function finishDrag(runAction){
 if(!drag)return;const d=drag;drag=null;d.b.setAttribute('aria-pressed','false');clearHint();state.autoParked[d.entity]=false;
 if(d.detachFunnel&&d.moved&&runAction&&state.dragging.position.y<=d.origin.y-350)state.funnel=false;
 if(d.moved&&runAction&&d.intent){
  if(tools.includes(d.entity))state.tool=d.entity;
  // 保留當下的真正器材位置作為動畫起點，之後才清除拖曳狀態。
  if(tools.includes(d.entity)&&!(d.entity==='plate'&&state.jarCovered))state.positions[d.entity]={...state.dragging.position};
  perform(d.intent.action,d.intent.value);
  if(state.motion){state.motion.contact=true;state.motion.pourAt=d.intent.pourAt;state.motion.dropAt=d.intent.dropAt;if(d.intent.stoneIndex!==undefined)state.motion.index=d.intent.stoneIndex;}
  if(!state.motion&&tools.includes(d.entity)&&!(d.entity==='plate'&&state.jarCovered)){state.positions[d.entity]=parkPosition(state,d.entity,d.intent.value);state.tool=null;camera(state.positions[d.entity]);}
 }else if(d.moved&&runAction&&d.entity==='jar'&&state.jarPlace<.5)state.positions.jar={...state.dragging.position};
 else if(d.moved&&runAction&&['flask','tank','marble'].includes(d.entity))state.positions[d.entity]={...state.dragging.position};
 else if(d.moved&&runAction&&d.entity==='outlet'){const p=state.dragging.position;if(state.outlet!=='jar'||p.y>=jarMouth(state).y+28){state.outletPosition={x:p.x-260,y:p.y-10};state.outlet='air';}}
 else if(d.moved&&runAction&&tools.includes(d.entity)&&!(d.entity==='plate'&&state.jarCovered))state.positions[d.entity]={...state.dragging.position};
 state.dragging=null;
 if(d.id!=null&&d.b.hasPointerCapture?.(d.id))d.b.releasePointerCapture(d.id);
 scene.endDrag();if(!state.motion)reconcileParking();if(d.keyboard)d.b.focus({preventScroll:true});render();
}
function updateDrag(now,auto=false){
 if(!drag?.moved)return;const d=drag;
 if(auto&&!d.intent&&!d.keyboard){const r=scroller.getBoundingClientRect();if(d.clientX<r.left+42)scroller.scrollLeft-=7;else if(d.clientX>r.right-42)scroller.scrollLeft+=7;}
 const p=d.keyboard?d.keyboardPosition:world(d.clientX,d.clientY),position=limitPosition(state,d.entity,{x:d.origin.x+p.x-d.start.x,y:d.origin.y+p.y-d.start.y});
 if(d.detachFunnel&&position.y>d.origin.y-350)position.x=d.origin.x;
 state.dragging={id:d.entity,position,detachFunnel:d.detachFunnel};const next=d.detachFunnel?null:approach(state,d.entity,position,d.origin),key=next?next.action+'|'+next.value:'';
 if(key!==d.key){d.key=key;d.since=now;d.still={...position};}else if(Math.hypot(position.x-d.still.x,position.y-d.still.y)>12){d.since=now;d.still={...position};}
 d.intent=next;hint.hidden=!next;hint.textContent=next?next.label+(d.keyboard?' · Enter 確認':' · 放開確認'):'';state.contact=next?.region||null;
 if(next){const v=scroller.getBoundingClientRect(),top=Math.max(8,8-v.top),bottom=Math.min(scroller.clientHeight-8,innerHeight-v.top-8);hint.style.left=(scroller.scrollLeft+Math.max(8,Math.min(scroller.clientWidth-hint.offsetWidth-8,d.clientX-v.left+12)))+'px';hint.style.top=Math.max(top,Math.min(bottom-hint.offsetHeight,d.clientY-v.top-hint.offsetHeight-16))+'px';}
 // 停靠僅預覽；所有輸入都在放開／Enter 確認才執行。
}
svg.addEventListener('pointerdown',e=>{
 const b=e.target.closest('[data-desk-drag],[data-desk-drag-proxy]');if(!b||state.motion||e.button!==0||!e.isPrimary)return;
 const entity=b.dataset.deskDrag||b.dataset.deskDragProxy;
 if(heldMaterial(state)&&tools.includes(entity)&&entity!=='forceps'){state.feedback='鑷子還夾著材料，先放入容器或放回原碟。';render();return;}
 e.preventDefault();scene.startDrag(entity,state);svg.querySelector(`[data-desk-drag=${entity}]`)?.focus({preventScroll:true});const origin=directPosition(state,entity);drag={id:e.pointerId,b,entity,detachFunnel:entity==='funnel'&&state.funnel,savedFunnel:state.positions.funnel,origin:{...origin},start:world(e.clientX,e.clientY),clientX:e.clientX,clientY:e.clientY,moved:false,key:'',since:performance.now(),still:{...origin}};b.setPointerCapture(e.pointerId);resume();
});
svg.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();const d=drag;d.clientX=e.clientX;d.clientY=e.clientY;const p=world(e.clientX,e.clientY);if(!d.moved&&Math.hypot(p.x-d.start.x,p.y-d.start.y)<8)return;d.moved=true;updateDrag(performance.now());render();},{passive:false});
svg.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId){if(drag.moved)updateDrag(performance.now());finishDrag(true);}});
svg.addEventListener('pointercancel',cancelDrag);svg.addEventListener('lostpointercapture',()=>{if(drag)cancelDrag();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',pause);document.addEventListener('air-experiment-play',e=>{if(e.detail!=='collection-task')pause();});new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pause();},{rootMargin:'100px'}).observe(form);
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(shelf){e.preventDefault();cancelShelf();}else if(drag){e.preventDefault();cancelDrag();}else if(form.contains(document.activeElement)&&['water','acid','peroxide'].includes(state.motion?.kind)){e.preventDefault();perform('stop');}});
form.addEventListener('keydown',e=>{

 const b=e.target.closest('[data-desk-drag]');if(!b||state.motion||!['Enter',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
 e.preventDefault();const entity=b.dataset.deskDrag;
 if(drag&&!drag.keyboard)return;
 if(drag&&drag.entity!==entity)cancelDrag();
 if(!drag){
  if(heldMaterial(state)&&tools.includes(entity)&&entity!=='forceps'){state.feedback='鑷子還夾著材料，先放入容器或放回原碟。';render();return;}
  const origin=directPosition(state,entity),screen=new DOMPoint(origin.x,origin.y).matrixTransform(svg.getScreenCTM());
  scene.startDrag(entity,state);b.focus({preventScroll:true});drag={id:null,b,entity,keyboard:true,keyboardPosition:{...origin},detachFunnel:entity==='funnel'&&state.funnel,savedFunnel:state.positions.funnel,origin:{...origin},start:{...origin},clientX:screen.x,clientY:screen.y,moved:false,key:'',since:performance.now(),still:{...origin}};
  b.setAttribute('aria-pressed','true');resume();
  if(e.key==='Enter'||e.key===' '){hint.hidden=false;hint.textContent='方向鍵移動，Enter 確認，Esc 取消。';render();return;}
 }else if(e.key==='Enter'||e.key===' '){finishDrag(true);b.setAttribute('aria-pressed','false');return;}
 const d=drag,step=e.shiftKey?25:5;d.moved=true;d.keyboardPosition.x+=e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0;d.keyboardPosition.y+=e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0;
 updateDrag(performance.now());camera(state.dragging.position);const screen=new DOMPoint(state.dragging.position.x,state.dragging.position.y).matrixTransform(svg.getScreenCTM());d.clientX=screen.x;d.clientY=screen.y;updateDrag(performance.now());render();
});
svg.addEventListener('focusout',e=>{if(drag?.keyboard&&e.target===drag.b)cancelDrag();});
render();
