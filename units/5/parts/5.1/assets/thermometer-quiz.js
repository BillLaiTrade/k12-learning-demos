import {makeRound,valueFor,celsiusFor,scaleY,scaleRange,assessInstrument} from './thermometer-quiz-model.mjs';
import {projectPoint} from './parallax-model.js';
const $=id=>document.getElementById(id), ns='http://www.w3.org/2000/svg';
const root=$('unit-quiz'), scene=$('tq-scene');
const create=(tag,attrs={},text)=>{const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;return n;};
const REST={A:{x:684,y:531,sx:1.05,sy:.42,angle:-2},B:{x:840,y:526,sx:1.05,sy:.42,angle:-3}};
const MOUNT={x:430,y:160,sx:1,sy:1,angle:0};
let round=makeRound(0,Math.random()<.5), active=null,picked=null,eye=0,drag=null,eyeDrag=null,frame=0,stable=false;
const builtUnits={};
// Chromium's SVG text can start native touch scrolling despite the group's
// touch-action rule. Cancel it only on physical handles, leaving the bench
// background scrollable on phones. Pointer events still perform the drag.
scene.addEventListener('touchstart',event=>{if(event.target.closest('.tq-instrument,#tq-eye'))event.preventDefault();},{passive:false});
const transform=p=>`translate(${p.x},${p.y}) rotate(${p.angle}) scale(${p.sx} ${p.sy})`;
const announce=message=>{$('tq-message').textContent=message;};
const invalidate=()=>{$('tq-result').hidden=true;$('tq-result').replaceChildren();};
const point=event=>{const p=scene.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const matrix=scene.getScreenCTM();return matrix?p.matrixTransform(matrix.inverse()):null;};
function instrumentShape(id){
  const g=$(`tq-instrument-${id}`), unit=round.instruments[id].unit;
  if(builtUnits[id]===unit)return;
  builtUnits[id]=unit;
  g.replaceChildren(
    create('rect',{class:'tq-hit',x:-66,y:-24,width:132,height:648,rx:25,fill:'transparent'}),
    create('rect',{x:-26,y:0,width:52,height:573,rx:26,fill:'url(#tq-glass)',stroke:'#819fa6','stroke-width':1.1}),
    create('g',{id:`tq-bulb-shell-${id}`}),
    create('path',{d:'M-17 24V552',stroke:'#fff','stroke-width':3,opacity:.9}),
    create('rect',{x:7,y:22,width:10,height:559,rx:4,fill:'url(#tq-bore)'}),
    create('path',{id:`tq-fluid-${id}`,fill:'url(#tq-red)'}),
    create('g',{id:`tq-bulb-liquid-${id}`}),
    create('path',{d:'M10 350V564',stroke:'#ffccc2','stroke-width':1,opacity:.65}),
    create('g',{id:`tq-marks-${id}`,stroke:'#2e4b4b',fill:'#243f3f'})
  );
  $(`tq-bulb-shell-${id}`).append(create('circle',{r:29,fill:'url(#tq-glass)',stroke:'#819fa6','stroke-width':1.1}));
  $(`tq-bulb-liquid-${id}`).append(create('circle',{r:21,fill:'url(#tq-bulb)'}),create('ellipse',{cx:-6,cy:-8,rx:6,ry:7,fill:'#fff8e8',opacity:.85}));
  const [min,max]=scaleRange(unit), marks=$(`tq-marks-${id}`);
  for(let value=min;value<=max;value++){
    const y=scaleY(unit,value), major=value%10===0||value===min;
    marks.append(create('path',{'data-mark':value,d:`M${major?-8:-4} ${y}H3`,'stroke-width':major?1.1:.7}));
    if(major)marks.append(create('text',{x:-10,y,'font-size':9.5,'text-anchor':'end','dominant-baseline':'middle',stroke:'none'},value));
  }
  const tag=create('g',{id:`tq-mounted-tag-${id}`});tag.append(create('circle',{cy:-30,r:20,fill:'#276e50',stroke:'#fff','stroke-width':2}),create('text',{y:-23,'text-anchor':'middle','font-size':22,fill:'#fff','font-weight':700},id));g.append(tag);
}
function renderInstrument(id){
  instrumentShape(id);const i=round.instruments[id],g=$(`tq-instrument-${id}`);
  const y=scaleY(i.unit,valueFor(i.unit,i.c));
  $('tq-fluid-'+id).setAttribute('d',`M9 ${y-.7}Q12 ${y+.7} 15 ${y-.7}V580H9Z`);
  if(drag?.id!==id)g.setAttribute('transform',transform(active===id?MOUNT:REST[id]));
  const bulbScale=active===id?1:REST[id].sx/REST[id].sy;
  for(const kind of ['shell','liquid'])$(`tq-bulb-${kind}-${id}`).setAttribute('transform',`translate(0,580) scale(1 ${bulbScale})`);
  $(`tq-mounted-tag-${id}`).toggleAttribute('hidden',active!==id);
  g.classList.toggle('is-picked',picked===id);g.classList.toggle('is-dragging',drag?.id===id&&drag.moved);
  g.setAttribute('aria-pressed',String(picked===id));
  g.setAttribute('aria-label',`溫度計 ${id}，${active===id?'在水中，拖回托盤可取出':'在托盤，拖到杯口夾具可量測'}；也可按 Enter 選取。`);
}
// The observer projection shares the teaching scene's camera geometry. Only the
// current instrument's engraved scale is shown, without an identifying unit.
function renderLens(){
  if(!active)return;
  const i=round.instruments[active], p=xyz=>{const [x,y]=projectPoint(xyz,eye);return[x,y-60];};
  const path=(points,close=true)=>points.map((q,index)=>`${index?'L':'M'}${p(q).map(v=>v.toFixed(3)).join(' ')}`).join('')+(close?'Z':'');
  const poly=(points,attrs)=>create('path',{d:path(points),...attrs});
  const rect=(l,r,b,t,z,attrs)=>poly([[l,b,z],[r,b,z],[r,t,z],[l,t,z]],attrs);
  const yFor=value=>(celsiusFor(i.unit,value)-round.waterC)*1.2;
  const liquidY=(i.c-round.waterC)*1.2;
  const shapes=[rect(-2.5,2.5,-18,18,-.35,{fill:'url(#tq-lens-glass)',stroke:'#9bb3b4','stroke-width':.7}),
    poly([[-2.5,-18,.55],[-2.18,-18,.94],[-2.18,18,.94],[-2.5,18,.55]],{fill:'#e6f5f1','fill-opacity':.6,stroke:'#b3cecf','stroke-width':.65}),
    poly([[2.18,-18,.94],[2.5,-18,.55],[2.5,18,.55],[2.18,18,.94]],{fill:'#d2e5e2','fill-opacity':.65,stroke:'#8ca9b0','stroke-width':.65}),
    rect(.1,.82,-18,18,0,{fill:'url(#tq-bore)',stroke:'#8faeb0','stroke-width':.7})];
  const liquid=poly([[.25,-18,0],[.67,-18,0],[.67,liquidY+.045,0],[.6,liquidY+.018,0],[.46,liquidY,0],[.32,liquidY+.018,0],[.25,liquidY+.045,0]],{fill:'url(#tq-red)',id:'tq-lens-fluid'});
  shapes.push(liquid);
  const [min,max]=scaleRange(i.unit), group=create('g',{id:'tq-lens-marks',fill:'#264846',stroke:'#2b4b48','stroke-width':1.3});
  for(let value=min;value<=max;value++){
    const y=yFor(value), start=p([-.9,y,.94]),end=p([-.19,y,.94]);
    if(start[1]<13||start[1]>267)continue;
    group.append(create('path',{d:`M${start.join(' ')}L${end.join(' ')}`,'data-mark':value}));
    const label=p([-1.22,y,.94]);
    group.append(create('text',{x:label[0],y:label[1],'font-size':18,'font-family':'Arial, sans-serif','text-anchor':'end','dominant-baseline':'middle',stroke:'none'},value));
  }
  shapes.push(group,rect(-2.26,-2.21,-18,18,.95,{fill:'#fff',opacity:.9}),rect(2.05,2.12,-18,18,.95,{fill:'#fff',opacity:.9}));
  const tip=p([.46,liquidY,0]);if(tip[1]>0&&tip[1]<280)shapes.push(create('path',{d:`M${tip[0]-30} ${tip[1]}H${tip[0]+18}`,fill:'none',stroke:'#4c8465','stroke-width':1,'stroke-dasharray':'3 4'}));
  $('tq-lens-content').replaceChildren(...shapes);
  const apparentC=i.c+.94*(eye*.06)/12/1.2;
  const nearby=valueFor(i.unit,apparentC);
  $('tq-lens').setAttribute('aria-label',`溫度計 ${active} 的整度刻線放大，${eye===0?'平視':eye>0?'俯視':'仰視'}。液面在數字 ${Math.floor(nearby)} 與 ${Math.ceil(nearby)} 附近，請依刻度估讀並判斷單位。`);
}
function renderUI(){
  root.dataset.active=active||'';root.dataset.stable=String(stable);root.dataset.round=round.index;
  for(const id of ['A','B'])renderInstrument(id);
  const present=!!active;
  $('tq-drop-target').toggleAttribute('hidden',present);
  $('tq-drag-guide').toggleAttribute('hidden',present);
  $('tq-clamp-front').toggleAttribute('hidden',!present);
  $('tq-lens-empty').hidden=present;$('tq-lens').toggleAttribute('hidden',!present);
  $('tq-reading').disabled=!present;$('tq-unit').disabled=!present;
  $('tq-lens-title').textContent=present?`${active} 的刻度放大`:'刻度放大';
  $('tq-answer-label').textContent=present?`填寫 ${active} 的觀察結果`:'填寫這支的觀察結果';
  $('tq-scene-title').textContent=present?`正在量測：溫度計 ${active}`:'從旁邊拿取一支溫度計';
  $('tq-observation-note').textContent=!present?'目前尚未放入溫度計':!stable?'液柱仍在變化，先觀察。':`${eye===0?'平視':eye>0?'俯視':'仰視'}・液柱已穩定，每小格為 1 個刻度單位。`;
  $('tq-scene-tip').textContent=present?`量完將 ${active} 拖回托盤原位，再拿另一支。`:'量完拖回原位，再拿另一支。';
  for(const id of ['A','B']){
    const i=round.instruments[id], filled=i.value.trim()!==''&&i.answerUnit;
    $(`tq-record-${id}`).textContent=filled?`${i.value}°${i.answerUnit==='C'?'C':'F'}・已填寫`:'尚未完成';
    $(`tq-record-${id}`).parentElement.classList.toggle('is-active',active===id);
  }
  $('tq-level').hidden=!present||eye===0;
  $('tq-sight').toggleAttribute('hidden',!present);
  if(present){
    const y=MOUNT.y+510-round.instruments[active].c*10, eyeY=y-eye*1.1;
    $('tq-sight-ray').setAttribute('d',`M442 ${y}L551 ${eyeY}`);
    $('tq-eye').setAttribute('transform',`translate(588,${eyeY})`);
    $('tq-eye').setAttribute('aria-valuenow',eye);
    $('tq-eye').setAttribute('aria-valuetext',eye===0?'與液面同高':eye>0?'視線較高':'視線較低');
    renderLens();
  }
}
function loadDraft(){
  $('tq-reading').value=active?round.instruments[active].value:'';
  $('tq-unit').value=active?round.instruments[active].answerUnit:'';
  $('tq-reading').removeAttribute('aria-invalid');
}
function stopAnimation(){cancelAnimationFrame(frame);frame=0;}
function mount(id){
  if(active){announce(`先將杯中的 ${active} 放回托盤，再放入另一支。`);picked=null;renderUI();return;}
  stopAnimation();active=id;picked=null;eye=0;const i=round.instruments[id],startC=i.c;
  stable=Math.abs(startC-round.waterC)<.001;
  if(stable)i.measured=true;
  loadDraft();renderUI();invalidate();
  announce(`已放入 ${id}。液泡浸在水中，沒有碰杯壁或杯底；觀察液柱，穩定後再讀值。`);
  if(stable)return;
  const start=performance.now(), duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:1800;
  function tick(now){
    const progress=duration===0?1:Math.min(1,(now-start)/duration);
    i.c=startC+(round.waterC-startC)*(1-(1-progress)**3);
    if(progress===1){i.c=round.waterC;i.measured=true;stable=true;frame=0;}
    renderUI();if(progress<1)frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);
}
function returnToTray(id){
  if(active!==id){picked=null;renderUI();return;}
  stopAnimation();active=null;picked=null;stable=false;eye=0;loadDraft();renderUI();invalidate();
  announce(`${id} 已放回，作答會保留。可拿起另一支量測。`);
}
function choose(id,keyboard=false){
  if(active&&active!==id){announce(`杯中已有 ${active}，先將它拖回托盤。`);return;}
  picked=picked===id?null:id;renderUI();
  if(picked){announce(active===id?`已選取 ${id}，拖回或點選托盤放回。`:`已選取 ${id}，拖到或點選杯口虛線夾具放入。`);if(keyboard)$(active===id?'tq-tray-target':'tq-drop-target').focus({preventScroll:true});}
}
function endDrag(event,cancel=false){
  if(!drag||event&&event.pointerId!==undefined&&event.pointerId!==drag.pointer)return;
  const current=drag;drag=null;const g=$(`tq-instrument-${current.id}`);
  if(g.hasPointerCapture(current.pointer))g.releasePointerCapture(current.pointer);
  if(cancel){picked=null;renderUI();return;}
  if(!current.moved){choose(current.id);return;}
  const p=point(event);
  if(p&&p.x>=275&&p.x<=525&&p.y>=110&&p.y<=805)mount(current.id);
  else if(p&&p.x>=605&&p.x<=1000&&p.y>=455&&p.y<=940)returnToTray(current.id);
  else{picked=null;renderUI();announce('沒有放到指定位置，器材已回到原位。可拖到虛線夾具或托盤。');}
}
for(const id of ['A','B']){
  const g=$(`tq-instrument-${id}`);
  g.addEventListener('pointerdown',event=>{
    if(event.button!==0||!event.isPrimary)return;
    const p=point(event);if(!p)return;
    drag={id,pointer:event.pointerId,start:p,pose:{...(active===id?MOUNT:REST[id])},moved:false};
    g.setPointerCapture(event.pointerId);g.focus({preventScroll:true});event.preventDefault();
  });
  g.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==id||event.pointerId!==drag.pointer)return;
    const p=point(event);if(!p)return;
    const dx=p.x-drag.start.x,dy=p.y-drag.start.y;
    if(Math.hypot(dx,dy)>9)drag.moved=true;
    if(drag.moved){g.setAttribute('transform',transform({...drag.pose,x:drag.pose.x+dx,y:drag.pose.y+dy}));g.classList.add('is-dragging');}
  });
  g.addEventListener('pointerup',event=>endDrag(event));
  for(const name of ['pointercancel','lostpointercapture'])g.addEventListener(name,event=>endDrag(event,true));
  g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(id,true);}if(event.key==='Escape'){event.preventDefault();picked=null;renderUI();}});
}
function useTarget(kind){
  if(!picked){announce(kind==='mount'?'先拿起托盤上的 A 或 B，再放到夾具。':'先選取杯中的溫度計，再放回托盤。');return;}
  const id=picked;kind==='mount'?mount(id):returnToTray(id);
}
for(const [id,kind]of[['tq-drop-target','mount'],['tq-tray-target','tray']]){
  $(id).addEventListener('click',()=>useTarget(kind));
  $(id).addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();useTarget(kind);}});
}
function updateDraft(){
  if(!active)return;
  const i=round.instruments[active];i.value=$('tq-reading').value;i.answerUnit=$('tq-unit').value;
  i.snapshot={stable,eye};$('tq-reading').removeAttribute('aria-invalid');invalidate();renderUI();
}
$('tq-reading').addEventListener('input',updateDraft);$('tq-unit').addEventListener('change',updateDraft);
$('tq-answer-form').addEventListener('submit',event=>{event.preventDefault();updateDraft();});
function setEye(value){eye=Math.max(-100,Math.min(100,Math.round(value)));if(Math.abs(eye)<10)eye=0;renderUI();}
$('tq-level').addEventListener('click',()=>{setEye(0);if(active&&round.instruments[active].value.trim()!==''&&round.instruments[active].answerUnit)updateDraft();announce('視線已回到與液面同高，請再確認刻度讀值。');});
const eyeHandle=$('tq-eye');
eyeHandle.addEventListener('pointerdown',event=>{
  if(!active||event.button!==0)return;const p=point(event);if(!p)return;
  const matrix=eyeHandle.transform.baseVal.consolidate().matrix;
  eyeDrag={pointer:event.pointerId,offset:p.y-matrix.f};eyeHandle.setPointerCapture(event.pointerId);eyeHandle.focus({preventScroll:true});event.preventDefault();
});
eyeHandle.addEventListener('pointermove',event=>{if(!active||!eyeDrag||event.pointerId!==eyeDrag.pointer)return;const p=point(event);if(p){const y=MOUNT.y+510-round.instruments[active].c*10;setEye((y-(p.y-eyeDrag.offset))/1.1);}});
function stopEye(event){if(!eyeDrag||event&&event.pointerId!==undefined&&event.pointerId!==eyeDrag.pointer)return;const id=eyeDrag.pointer;eyeDrag=null;if(eyeHandle.hasPointerCapture(id))eyeHandle.releasePointerCapture(id);}
for(const name of ['pointerup','pointercancel','lostpointercapture'])eyeHandle.addEventListener(name,stopEye);
eyeHandle.addEventListener('keydown',event=>{const amount={ArrowUp:10,ArrowDown:-10,ArrowRight:10,ArrowLeft:-10};if(event.key in amount||event.key==='Home'){event.preventDefault();setEye(event.key==='Home'?0:eye+amount[event.key]);}});
window.addEventListener('blur',()=>{endDrag(null,true);stopEye();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){endDrag(null,true);stopEye();}});
root.addEventListener('keydown',event=>{if(event.key==='Escape'){endDrag(null,true);stopEye();picked=null;renderUI();}});
$('tq-hint-toggle').addEventListener('click',()=>{const show=$('tq-hint').hidden;$('tq-hint').hidden=!show;$('tq-hint-toggle').setAttribute('aria-expanded',String(show));$('tq-hint-toggle').firstChild.textContent=show?'收起換算提示 ':'查看換算提示 ';});
$('tq-check').addEventListener('click',()=>{
  const results=['A','B'].map(id=>({id,...assessInstrument(round.instruments[id],round.waterC)}));
  const ok=results.every(r=>r.ok), result=$('tq-result');result.hidden=false;result.dataset.success=String(ok);result.replaceChildren();
  const add=text=>{const p=document.createElement('p');p.textContent=text;result.append(p);};
  if(ok){add('兩支都完成了！你能讀出刻度，並判斷同一杯水的兩種溫標。');add(`平視參考：${round.waterC}°C ＝ ${Number((round.waterC*9/5+32).toFixed(1))}°F。`);}
  else{add('再確認一下，完成的作答會保留。');for(const r of results)add(`${r.id}：${r.message}`);}
});
$('tq-reset').addEventListener('click',()=>{
  endDrag(null,true);stopEye();stopAnimation();round=makeRound(round.index+1,!round.aIsF);active=null;picked=null;eye=0;stable=false;invalidate();loadDraft();
  $('tq-hint').hidden=true;$('tq-hint-toggle').setAttribute('aria-expanded','false');$('tq-hint-toggle').firstChild.textContent='查看換算提示 ';
  renderUI();announce('新一回合已準備好。A、B 的位置與刻度需重新觀察，作答已清空。');
});
loadDraft();renderUI();
