import {DECIBEL_SCENES,DECIBEL_MIN,DECIBEL_MAX,clampDecibel,decibelAt,nearestScene} from './decibel-model.mjs?v=1';
export function createDecibelExplorer(root,{onInteract=()=>{},onSceneChange=()=>{},onPlay=()=>{}}={}){
 const band=root.querySelector('[data-decibel-band]'),feature=root.querySelector('.decibel-feature'),art=root.querySelector('.decibel-photo'),svg=art.querySelector('svg'),image=svg.querySelector('image'),clip=svg.querySelector('rect'),status=art.querySelector('span');
 const cache=new Map();let current=60,ticket=0,pointer=null,shown=null;
 function prepare(file){
  if(cache.has(file))return cache.get(file);
  const im=new Image();im.src=new URL(file+'?v=1',import.meta.url).href;
  const promise=im.decode().then(()=>im).catch(error=>{cache.delete(file);throw error;});cache.set(file,promise);return promise;
 }
 async function show(scene){
  const request=++ticket;feature.dataset.scene=scene.key;art.dataset.loading='true';status.textContent='場景圖片載入中…';
  root.querySelector('[data-decibel-title]').textContent=scene.title;
  root.querySelector('[data-decibel-picture]').setAttribute('aria-label','播放場景聲音：'+scene.title);
  root.querySelector('[data-decibel-reference]').textContent=scene.db;
  root.querySelector('[data-decibel-intro]').textContent=scene.intro;
  root.querySelector('[data-decibel-condition]').textContent='參考情境：'+scene.condition;
  root.querySelector('[data-decibel-count]').textContent=`第 ${DECIBEL_SCENES.indexOf(scene)+1} / 12 個參考情境`;
  svg.setAttribute('aria-label',scene.title+'的生活場景示意圖');
  try{
   const im=await prepare(scene.image);if(request!==ticket)return;
   svg.setAttribute('viewBox',scene.viewBox);clip.setAttribute('y',scene.y);image.setAttribute('href',im.src);
   image.setAttribute('width',im.naturalWidth);image.setAttribute('height',im.naturalHeight);
   art.dataset.loading='false';status.textContent='';
  }catch{if(request===ticket){art.dataset.loading='error';status.textContent='圖片暫時無法載入，請再點選此情境重試。';}}
 }
 function render(value){
  current=clampDecibel(value);const scene=nearestScene(current);
  band.style.setProperty('--decibel-position',`${(current-DECIBEL_MIN)/(DECIBEL_MAX-DECIBEL_MIN)*100}%`);
  band.setAttribute('aria-valuenow',current);band.setAttribute('aria-valuetext',`所選 ${current} dBA，鄰近參考：${scene.title}約 ${scene.db} dBA`);
  root.querySelector('[data-decibel-selected]').textContent=current+' dBA';
  if(shown!==scene.key||art.dataset.loading==='error'){const changed=shown!==scene.key;shown=scene.key;show(scene);if(changed)onSceneChange(scene);}
 }
 function atPointer(event){const box=band.getBoundingClientRect();render(decibelAt((event.clientX-box.left)/box.width));}
 band.addEventListener('pointerdown',event=>{if(event.button!==0||pointer!==null)return;event.preventDefault();onInteract();band.focus({preventScroll:true});pointer=event.pointerId;band.setPointerCapture(pointer);atPointer(event);});
 band.addEventListener('pointermove',event=>{if(event.pointerId===pointer)atPointer(event);});
 band.addEventListener('pointerup',event=>{if(event.pointerId===pointer){atPointer(event);pointer=null;}});
 band.addEventListener('pointercancel',()=>{pointer=null;});band.addEventListener('lostpointercapture',()=>{pointer=null;});
 band.addEventListener('keydown',event=>{
  const steps={ArrowRight:10,ArrowUp:10,ArrowLeft:-10,ArrowDown:-10,PageUp:20,PageDown:-20};
  if(event.key in steps||event.key==='Home'||event.key==='End'){
   event.preventDefault();onInteract();render(event.key==='Home'?DECIBEL_MIN:event.key==='End'?DECIBEL_MAX:current+(event.shiftKey?Math.sign(steps[event.key]):steps[event.key]));
  }
 });
 const play=root.querySelector('[data-decibel-play]'),picture=root.querySelector('[data-decibel-picture]');
 play.addEventListener('click',onPlay);picture.addEventListener('click',onPlay);
 function mode(value,message){root.dataset.audioState=value;const active=value==='playing'||value==='preparing';root.dataset.playing=String(value==='playing');root.querySelector('.stop').disabled=!active;picture.setAttribute('aria-pressed',String(active));play.setAttribute('aria-pressed',String(active));root.querySelector('.play-state').textContent=message||({stopped:'已停止，可再次播放場景聲音',preparing:'場景聲音載入中…',playing:'正在播放：'+nearestScene(current).title}[value]);picture.setAttribute('aria-label','播放場景聲音：'+nearestScene(current).title);}
 render(60);mode('stopped');for(const file of new Set(DECIBEL_SCENES.map(scene=>scene.image)))prepare(file).catch(()=>{});
 return {get scene(){return nearestScene(current);},mode,stop:()=>mode('stopped')};
}
