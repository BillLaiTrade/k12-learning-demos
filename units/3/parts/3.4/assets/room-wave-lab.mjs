import {ROOM,returnTimes} from './room-wave-model.mjs?v=20261101-room-contrast';
import {roomScene,drawWaves} from './room-wave-scene.mjs?v=20261101-room-contrast';
export function bindRoomWaveLab(claim,release){
 const root=document.getElementById('room'),$=id=>document.getElementById(id),pause=$('room-pause'),material=$('room-material'),buttons=[...root.querySelectorAll('[data-room-source]')];
 let phase='ready',kind='clap',treated=false,elapsed=0,start=0,raf=0,epoch=0,context=null,source=null,master=null,waiting=false;
 const buffers=new Map();$('room-view').innerHTML=roomScene();
 function silence(){epoch++;if(source){try{source.stop();}catch{}source=null;}master?.disconnect();master=null;document.body.dataset.audioPlaying='false';}
 function draw(){
  const frameTime=phase==='complete'?1.05:elapsed;
  const fronts=drawWaves(frameTime,treated,kind),returns=returnTimes(),modelTime=frameTime/ROOM.slowdown;
  root.dataset.frameTime=frameTime.toFixed(3);
  root.dataset.phase=phase;root.dataset.kind=kind;root.dataset.treated=String(treated);root.dataset.elapsed=elapsed.toFixed(3);root.dataset.progress=(elapsed/ROOM.duration).toFixed(4);root.dataset.modelTime=modelTime.toFixed(5);
  root.dataset.nearReturned=String(modelTime>=returns.left);root.dataset.farReturned=String(modelTime>=returns.right);root.dataset.fronts=String(fronts.length);
  $('room-panels').setAttribute('visibility',treated?'visible':'hidden');$('room-material-label').hidden=!treated;
  $('room-condition').textContent=treated?'已加入吸音材料':'尚未加入吸音材料';material.textContent=treated?'− 移除吸音材料':'＋ 加入吸音材料';material.setAttribute('aria-pressed',String(treated));
  pause.disabled=phase==='ready'||phase==='complete';pause.textContent=phase==='paused'?'繼續':'暫停';pause.setAttribute('aria-label',phase==='paused'?'繼續聲波觀察':'暫停聲波觀察');
  for(const b of buttons){b.classList.toggle('is-active',phase==='playing'&&b.dataset.roomSource===kind);b.setAttribute('aria-pressed',String(phase==='playing'&&b.dataset.roomSource===kind));}
  $('room-observation').textContent=treated?'加入材料後，哪些地方反射回來的波變淡了？':kind==='speech'?'小葵說完後，你還聽到了什麼？':'拍手聲停下後，你還聽到了什麼？';
  $('room-status').textContent=phase==='ready'?'先發聲觀察，再加入材料重新比較。':waiting?'正在準備聲音…':phase==='paused'?'畫面已定格；切換材料可比較同一時刻，或按繼續觀察。':phase==='complete'?'本次觀察結束，保留反射返回的代表畫面；切換材料可直接比較。':modelTime<returns.left?'聲波正在向四周擴散。':modelTime<returns.right?'近牆的反射已返回；遠牆的反射尚未回到小葵。':treated?'不同牆面的反射先後返回；碰到材料的反射較弱。':'不同牆面的反射先後返回，也會繼續反射。';
 }
 function tick(now){elapsed=Math.min(ROOM.duration,(now-start)/1000);draw();if(elapsed>=ROOM.duration){phase='complete';silence();release(api);draw();}else raf=requestAnimationFrame(tick);}
 async function play(restart=false,nextKind=kind){
  claim(api);cancelAnimationFrame(raf);silence();if(restart||phase==='complete'){elapsed=0;kind=nextKind;root.dataset.emissions=String(Number(root.dataset.emissions||0)+1);}
  phase='playing';waiting=true;$('room-error').hidden=true;draw();const token=epoch;
  try{
   try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch{}
   const Audio=window.AudioContext||window.webkitAudioContext;context ||= new Audio();
   let timer;try{await Promise.race([context.resume(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('audio timeout')),1800);})]);}finally{clearTimeout(timer);}
   if(context.state!=='running')throw Error('audio not running');
   if(token!==epoch||phase!=='playing')return;
   const file=`room-${kind}-${treated?'treated':'bare'}.wav${kind==='speech'?'?v=20261101-xiaokui-voice':''}`;
   if(!buffers.has(file)){
    const pending=(async()=>{const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),8000);try{const r=await fetch(new URL(file,import.meta.url),{signal:abort.signal});if(!r.ok)throw Error('audio unavailable');return await context.decodeAudioData(await r.arrayBuffer());}finally{clearTimeout(timer);}})();buffers.set(file,pending);pending.catch(()=>buffers.delete(file));
   }
   const buffer=await buffers.get(file);if(token!==epoch||phase!=='playing')return;
   if(elapsed<buffer.duration){
    const node=context.createBufferSource(),gain=context.createGain();node.buffer=buffer;gain.gain.value=.65;node.connect(gain);gain.connect(context.destination);source=node;master=gain;
    node.onended=()=>{if(source===node){source=null;document.body.dataset.audioPlaying='false';}};node.start(context.currentTime+.02,elapsed);document.body.dataset.audioPlaying='true';
   }
   waiting=false;start=performance.now()-elapsed*1000;draw();raf=requestAnimationFrame(tick);
  }catch{
   if(token!==epoch)return;waiting=false;phase='ready';elapsed=0;silence();release(api);$('room-error').textContent='聲音未能啟用。請再次點擊發聲，並確認裝置與分頁未靜音。';$('room-error').hidden=false;draw();
  }
 }
 function stop(){if(phase!=='playing')return;if(!waiting)elapsed=Math.min(ROOM.duration,(performance.now()-start)/1000);waiting=false;cancelAnimationFrame(raf);silence();phase='paused';draw();}
 const api={id:'room',pause:stop};
 buttons.forEach(b=>b.addEventListener('click',()=>play(true,b.dataset.roomSource)));
 pause.addEventListener('click',()=>phase==='playing'?stop():play());
 material.addEventListener('click',()=>{const complete=phase==='complete';stop();silence();cancelAnimationFrame(raf);release(api);treated=!treated;if(complete)elapsed=1.05;phase=elapsed>0?'paused':'ready';$('room-error').hidden=true;draw();});
 draw();return api;
}
