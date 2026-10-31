import {guitarScene} from './guitar-view.mjs?v=1';
import {BRIDGE_X,NUT_X,STRING_Y,MAX_FRET,fretLength,fretX,nearestFret,guitarFrequency,guitarDisplacement,stringPath,clamp} from './guitar-model.mjs?v=1';

const format=value=>Number(value.toFixed(1)).toLocaleString('zh-TW');
export function createGuitarExperiment(root,{onChange,onPluck}){
 let mode='length',fret=12,tension=1,active=null,drag=null;
 const columns=[...root.querySelectorAll('.guitar-column')],right=columns[1];
 for(const col of columns)col.querySelector('.guitar-picture').innerHTML=guitarScene(col.dataset.guitarSide);
 const handle=root.querySelector('.guitar-fret-control');
 function position(col,displacement){
  const scene=col.querySelector('.guitar-scene'),end=fretX(Number(scene.dataset.fret)),path=stringPath(end,displacement);
  for(const wire of col.querySelectorAll('.guitar-active-wire,.guitar-wire-glow,.guitar-wire-light'))wire.setAttribute('d',path);
  scene.dataset.displacement=String(displacement);
 }
 function stop(){active=null;for(const col of columns){col.dataset.sounding='false';position(col,0);col.querySelector('.guitar-play').setAttribute('aria-pressed','false');}}
 function render(){
  root.dataset.guitarMode=mode;
  for(const button of root.querySelectorAll('[data-guitar-mode]'))button.setAttribute('aria-pressed',String(button.dataset.guitarMode===mode));
  root.querySelector('.guitar-condition').textContent=mode==='length'?'同一條第5弦・材質、粗細與鬆緊固定':'同一條第5弦・材質、粗細與弦長固定';
  root.querySelector('.guitar-question').textContent=mode==='length'?'按在不同位置，聲音會怎麼變？':'轉動調音旋鈕，聲音會怎麼變？';
  root.querySelector('.guitar-conclusion').textContent=mode==='length'?'其他條件相同時，振動的弦段越短，振動頻率越高，音調也越高。':'其他條件相同時，弦拉得越緊，振動頻率越高，音調也越高。';
  root.querySelector('.guitar-tension-tools').hidden=mode!=='tension';
  root.querySelector('.guitar-tuner-control').hidden=mode!=='tension';
  handle.hidden=mode!=='length';
  root.querySelector('.guitar-drag-hint').hidden=mode!=='length';
  handle.setAttribute('aria-valuenow',String(fret));handle.setAttribute('aria-valuetext',fret?`第${fret}格，有效弦長${format(fretLength(fret))}公分`:'空弦，有效弦長65公分');
  handle.style.left=`${100*(fretX(fret)+90)/2167}%`;
  root.querySelector('.guitar-fret-reading').textContent=fret?`第 ${fret} 格`:'空弦';
  root.querySelector('#guitar-tension-reading').textContent=`${tension.toFixed(2)} 倍`;
  root.querySelector('[data-guitar-tension="-.25"]').disabled=tension<=.5;
  root.querySelector('[data-guitar-tension=".25"]').disabled=tension>=2;
  root.querySelector('.guitar-tuner-control').disabled=tension>=2;
  for(const [index,col]of columns.entries()){
   const n=index?fret:0,t=index?tension:1,end=fretX(n),frequency=guitarFrequency(n,t),scene=col.querySelector('.guitar-scene');
   Object.assign(scene.dataset,{fret:String(n),tension:String(t),frequency:String(frequency),length:String(fretLength(n))});
   col.querySelector('.guitar-frequency').textContent=`${format(frequency)} Hz`;
   col.querySelector('.guitar-muted-wire').setAttribute('d',`M${end} ${STRING_Y}H${NUT_X}`);
   col.querySelector('.guitar-length-line').setAttribute('d',`M${BRIDGE_X} 850H${end}`);
   col.querySelector('.guitar-length-ends').setAttribute('d',`M${BRIDGE_X} ${STRING_Y}V875M${end} ${STRING_Y}V875`);
   col.querySelector('.guitar-length-label').setAttribute('transform',`translate(${(BRIDGE_X+end)/2} 960)`);
   col.querySelector('.guitar-length-text').textContent=`有效弦長 ${format(fretLength(n))} cm`;
   const finger=col.querySelector('.guitar-finger');finger.setAttribute('transform',`translate(${end+22} ${STRING_Y})`);finger.style.display=n?'':'none';
   col.querySelector('.guitar-tuner').setAttribute('transform',`translate(1960 520) rotate(${(t-1)*110})`);
   col.querySelector('.guitar-fret-zone')?.setAttribute('pointer-events',mode==='length'?'auto':'none');
   position(col,0);
  }
 }
 function change(action){onChange();stop();action();render();}
 function setFret(value){const next=clamp(Math.round(value),0,MAX_FRET);if(next!==fret)change(()=>{fret=next;});}
 function adjustTension(step){change(()=>{tension=clamp(Math.round((tension+step)*4)/4,.5,2);});}
 for(const button of root.querySelectorAll('[data-guitar-mode]'))button.addEventListener('click',()=>{
  if(mode===button.dataset.guitarMode)return;
  change(()=>{mode=button.dataset.guitarMode;fret=mode==='length'?12:0;tension=1;});
 });
 root.querySelector('[data-guitar-reset]').addEventListener('click',()=>change(()=>{fret=mode==='length'?12:0;tension=1;}));
 for(const button of root.querySelectorAll('[data-guitar-tension]'))button.addEventListener('click',()=>adjustTension(Number(button.dataset.guitarTension)));
 root.querySelector('.guitar-tuner-control').addEventListener('click',()=>adjustTension(.25));
 handle.addEventListener('keydown',event=>{
  const values={ArrowLeft:fret+1,ArrowRight:fret-1,ArrowUp:fret+1,ArrowDown:fret-1,Home:0,End:MAX_FRET};
  if(event.key in values){event.preventDefault();setFret(values[event.key]);}
 });
 function sceneX(event){const svg=right.querySelector('svg');return new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse()).x;}
 handle.addEventListener('pointerdown',event=>{
  if(event.button!==0||!event.isPrimary)return;
  event.preventDefault();onChange();stop();drag={id:event.pointerId,x:sceneX(event),end:fretX(fret)};handle.setPointerCapture(event.pointerId);
 });
 handle.addEventListener('pointermove',event=>{if(drag?.id===event.pointerId)setFret(nearestFret(drag.end+sceneX(event)-drag.x));});
 function endDrag(event){if(drag?.id!==event.pointerId)return;drag=null;if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);}
 handle.addEventListener('pointerup',endDrag);handle.addEventListener('pointercancel',endDrag);handle.addEventListener('lostpointercapture',()=>{drag=null;});
 right.querySelector('.guitar-fret-zone').addEventListener('click',event=>{if(mode==='length')setFret(nearestFret(sceneX(event)));});
 for(const col of columns){
  const target=col.querySelector('.guitar-pluck-target'),key=col.dataset.guitarSide==='left'?'string-reference':'string-live';
  // 部分觸控瀏覽器第一次點SVG只給pointer事件；在放開時撥弦，並合併隨後的相容click。
  let touch=null,lastTouch=-Infinity;
  target.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'&&event.isPrimary)touch={id:event.pointerId,x:event.clientX,y:event.clientY};});
  target.addEventListener('pointercancel',()=>{touch=null;});
  target.addEventListener('pointerup',event=>{
   const tap=touch;touch=null;
   if(tap?.id===event.pointerId&&Math.hypot(event.clientX-tap.x,event.clientY-tap.y)<12){lastTouch=performance.now();onPluck(key);}
  });
  target.addEventListener('click',()=>{if(performance.now()-lastTouch>750)onPluck(key);});
  target.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onPluck(key);}});
 }
 render();stop();
 return {
  settings(key){return {frequency:key==='string-reference'?guitarFrequency(0):guitarFrequency(fret,tension),amplitude:.55,tone:'string'};},
  start(key){stop();active=columns[key==='string-reference'?0:1];active.dataset.sounding='true';active.querySelector('.guitar-play').setAttribute('aria-pressed','true');},
  update(seconds){if(active)position(active,guitarDisplacement(seconds,Number(active.querySelector('.guitar-scene').dataset.frequency)));},
  stop
 };
}
