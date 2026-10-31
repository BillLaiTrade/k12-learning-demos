import {HEARING_MIN,HEARING_MAX,HEARING_START,frequencyAt,frequencyPosition} from './hearing-audio.mjs?v=1';
const number=value=>value.toLocaleString('en-US');
// 觸控直接於pointerup啟動，並略過隨後的相容click；拖曳後立即點按也只執行一次。
function activate(button,handler){
 let touch=null,lastTouch=-Infinity;
 button.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'&&event.isPrimary)touch={id:event.pointerId,x:event.clientX,y:event.clientY};});
 button.addEventListener('pointercancel',()=>{touch=null;});
 button.addEventListener('pointerup',event=>{
  if(!touch||event.pointerId!==touch.id)return;
  const tap=Math.hypot(event.clientX-touch.x,event.clientY-touch.y)<12;touch=null;
  if(tap){event.preventDefault();lastTouch=performance.now();handler();}
 });
 button.addEventListener('click',event=>{if(event.detail>0&&performance.now()-lastTouch<700){event.preventDefault();return;}handler();});
}
export function createHearingExperiment(root,{onToggle,onFrequency,onReset}){
 let frequency=HEARING_START,low=null,high=null,pointer=null;
 const band=root.querySelector('[data-hearing-band]'),feedback=root.querySelector('.hearing-feedback'),toggle=root.querySelector('[data-hearing-toggle]');
 function render(){
  root.dataset.frequency=String(frequency);
  root.querySelector('#hearing-frequency').textContent=number(frequency)+' Hz';
  root.querySelector('.hearing-cursor-label').textContent=number(frequency)+' Hz';
  band.style.setProperty('--frequency-position',frequencyPosition(frequency)*100+'%');
  band.setAttribute('aria-valuenow',String(frequency));band.setAttribute('aria-valuetext',number(frequency)+' 赫茲');
  root.querySelector('#hearing-low').textContent=low===null?'尚未記錄':number(low)+' Hz';
  root.querySelector('#hearing-high').textContent=high===null?'尚未記錄':number(high)+' Hz';
  root.dataset.low=low===null?'':String(low);root.dataset.high=high===null?'':String(high);
  root.querySelector('[data-hearing-clear=low]').disabled=low===null;root.querySelector('[data-hearing-clear=high]').disabled=high===null;
 }
 function select(value){frequency=Math.max(HEARING_MIN,Math.min(HEARING_MAX,Math.round(value)));feedback.hidden=true;render();onFrequency(frequency);}
 function fromPointer(event){const r=band.getBoundingClientRect();select(frequencyAt((event.clientX-r.left)/r.width));}
 band.addEventListener('pointerdown',event=>{
  if(pointer!==null||event.button!==0)return;
  // touch-action:none已阻止拖曳捲頁；不取消touch的pointerdown，避免吞掉接下來按鈕的相容click。
  if(event.pointerType!=='touch')event.preventDefault();band.focus({preventScroll:true});pointer=event.pointerId;band.setPointerCapture(pointer);fromPointer(event);
 });
 band.addEventListener('pointermove',event=>{if(event.pointerId===pointer)fromPointer(event);});
 band.addEventListener('pointerup',event=>{if(event.pointerId!==pointer)return;fromPointer(event);pointer=null;if(band.hasPointerCapture(event.pointerId))band.releasePointerCapture(event.pointerId);});
 band.addEventListener('pointercancel',()=>{pointer=null;});band.addEventListener('lostpointercapture',()=>{pointer=null;});
 band.addEventListener('keydown',event=>{
  const steps={ArrowLeft:-.01,ArrowDown:-.01,ArrowRight:.01,ArrowUp:.01,PageDown:-.1,PageUp:.1};
  if(event.key==='Home'){event.preventDefault();select(HEARING_MIN);}
  else if(event.key==='End'){event.preventDefault();select(HEARING_MAX);}
  else if(event.key in steps){event.preventDefault();select(frequencyAt(frequencyPosition(frequency)+steps[event.key]));}
 });
 activate(toggle,onToggle);activate(root.querySelector('.hearing-speaker-button'),onToggle);
 for(const button of root.querySelectorAll('[data-hearing-record]'))activate(button,()=>{
  const side=button.dataset.hearingRecord;
  if(side==='low'&&high!==null&&frequency>high||side==='high'&&low!==null&&frequency<low){
   feedback.textContent=side==='low'?'低音端不能高於已記錄的高音端，請調整頻率或先改寫高音端。':'高音端不能低於已記錄的低音端，請調整頻率或先改寫低音端。';feedback.hidden=false;return;
  }
  if(side==='low')low=frequency;else high=frequency;render();
  feedback.textContent=`已將${number(frequency)} Hz記為${side==='low'?'低音端':'高音端'}。`;feedback.hidden=false;
 });
 for(const button of root.querySelectorAll('[data-hearing-clear]'))activate(button,()=>{
  if(button.disabled)return;
  const side=button.dataset.hearingClear;if(side==='low')low=null;else high=null;render();
  feedback.textContent=`已取消${side==='low'?'低音端':'高音端'}紀錄。`;feedback.hidden=false;
 });
 activate(root.querySelector('[data-hearing-reset]'),()=>{onReset();frequency=HEARING_START;low=null;high=null;feedback.hidden=true;render();});
 function mode(value){
  const playing=value==='playing',preparing=value==='preparing';root.dataset.playing=String(playing);root.dataset.preparing=String(preparing);
  toggle.innerHTML=playing?'<span aria-hidden="true">Ⅱ</span> 暫停':preparing?'<span aria-hidden="true">■</span> 取消':'<span aria-hidden="true">▶</span> 播放';
  toggle.setAttribute('aria-pressed',String(playing));root.querySelector('.hearing-speaker-button').setAttribute('aria-label',playing?'暫停試聽':'播放目前頻率');
  root.querySelector('.play-state').textContent=playing?'正在持續播放':preparing?'正在準備聲音…':'已暫停';
 }
 render();mode('paused');
 return {get frequency(){return frequency;},mode,stop(){mode('paused');},error(message){mode('paused');feedback.textContent=message;feedback.hidden=false;},clearMessage(){feedback.hidden=true;}};
}
