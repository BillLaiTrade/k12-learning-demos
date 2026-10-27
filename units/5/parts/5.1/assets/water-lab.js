import {initialState,addIce,toggleHeat,advance,fraction,isMoving,MIN_TEMPERATURE,MAX_TEMPERATURE,ICE_DURATION,ICE_FLOAT_DURATION} from './water-lab-state.mjs?v=ice-float-20s';
const $=id=>document.getElementById(id), root=$('water-lab'), ns='http://www.w3.org/2000/svg';
let state=initialState(), request=0, previous=null;
function line(group,attrs){const n=document.createElementNS(ns,'line');Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));group.append(n);}
for(let degree=5;degree<=60;degree+=5){
  const y=545-fraction(degree)*300;
  line($('water-lab-scale'),{x1:degree%10===0?540:548,x2:560,y1:y,y2:y});
  const zoomY=270-fraction(degree)*230;
  line($('water-lab-zoom-scale'),{x1:216,x2:degree%10===0?257:241,y1:zoomY,y2:zoomY});
}
function render(){
  const f=fraction(state.probe), y=545-f*300, zy=270-f*230;
  root.dataset.mode=state.mode;root.dataset.heating=String(state.heating);
  root.dataset.water=state.water.toFixed(4);root.dataset.probe=state.probe.toFixed(4);
  root.dataset.ice=state.iceRemaining.toFixed(4);
  $('water-lab-liquid').setAttribute('y',y);$('water-lab-liquid').setAttribute('height',588-y);
  $('water-lab-meniscus').setAttribute('d',`M574 ${y}Q580 ${y+4} 586 ${y}`);
  $('water-lab-zoom-fluid').setAttribute('d',`M99 ${zy}Q139 ${zy+17} 179 ${zy}V360H99Z`);
  $('water-lab-zoom-meniscus').setAttribute('d',`M99 ${zy}Q139 ${zy+17} 179 ${zy}`);
  $('water-lab-source').setAttribute('cy',y);
  $('water-lab-connector').setAttribute('d',`M594 ${y}L1030 220`);
  const cooling=state.mode==='cooling';
  const direction=$('water-lab-direction');direction.toggleAttribute('hidden',!isMoving(state));
  direction.setAttribute('fill',cooling?'#2381c8':'#e95825');
  direction.setAttribute('transform',cooling?`translate(0,${y})`:`translate(1278,${y}) rotate(180)`);
  $('water-lab-heat-glow').setAttribute('opacity',state.heating?'.24':'0');
  $('water-lab-lamp').setAttribute('fill',state.heating?'#ff762e':'#454b49');
  $('water-lab-ice').toggleAttribute('hidden',state.iceRemaining===0);
  if(state.iceRemaining>0){
    const age=ICE_DURATION-state.iceRemaining, drop=Math.min(1,age/.35);
    // Let students observe full-size floating ice before it slowly melts.
    const size=Math.min(1,state.iceRemaining/(ICE_DURATION-ICE_FLOAT_DURATION));
    $('water-lab-cube-a').setAttribute('transform',`translate(448,${458-(1-drop)*130+Math.sin(age*5)*3}) rotate(-12) scale(${size})`);
    $('water-lab-cube-b').setAttribute('transform',`translate(716,${462-(1-drop)*110+Math.sin(age*5+1)*3}) rotate(14) scale(${size*.85})`);
  }
  $('water-lab-add-ice').disabled=state.iceRemaining>0||state.water<=MIN_TEMPERATURE+.01;
  $('water-lab-heat').disabled=state.iceRemaining>0||state.water>=MAX_TEMPERATURE;
  $('water-lab-heat').setAttribute('aria-pressed',String(state.heating));
  $('water-lab-heat').querySelector('span').textContent=state.heating?'停止加熱':'加熱水';
  const heaterText=state.heating?'電熱板加熱水中':'電熱板已關閉';
  if($('water-lab-heater-status').querySelector('span').textContent!==heaterText)$('water-lab-heater-status').querySelector('span').textContent=heaterText;
  const feedback=state.atUpperLimit?'已到觀察上限，電熱板關閉':cooling?'加冰塊後，液柱下降':state.mode==='heating'?'加熱水後，液柱上升':state.mode==='stopped'?'加熱已停止，觀察液柱穩定':'觀察同一支溫度計的液面';
  if($('water-lab-feedback').textContent!==feedback)$('water-lab-feedback').textContent=feedback;
  $('water-lab-zoom').setAttribute('aria-label',`液面局部放大：${cooling?'冷卻時下降':state.mode==='heating'?'升溫時上升':'與主圖同步'}，目前測溫液體約 ${state.probe.toFixed(1)} 攝氏度。`);
}
function frame(now){
  const dt=previous===null?0:Math.min(.1,(now-previous)/1000);previous=now;
  state=advance(state,dt);render();
  if(isMoving(state))request=requestAnimationFrame(frame);else{request=0;previous=null;}
}
function start(){if(!request){previous=null;request=requestAnimationFrame(frame);}}
$('water-lab-add-ice').addEventListener('click',()=>{state=addIce(state);render();start();});
$('water-lab-heat').addEventListener('click',()=>{state=toggleHeat(state);render();start();});
$('water-lab-reset').addEventListener('click',()=>{cancelAnimationFrame(request);request=0;previous=null;state=initialState();render();});
render();
