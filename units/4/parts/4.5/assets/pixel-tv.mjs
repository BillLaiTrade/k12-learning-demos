import {WIDTH,HEIGHT,QUICK_POINTS,DEFAULT_INDEX,sourcePixels,currentPixel,renderPixels,rgbaPixels,pixelAt,colourCss,colourName,sameColour,groupOutline,neighbourhood,moveSelection,observationText,loupeLayout,sampleDragIndex} from './pixel-tv-observer-model.mjs?v=tv-sample-point-20261105';
export function initialisePixelTv(root){
 if(root.dataset.ready==='true')return;
 const $=s=>root.querySelector(s),source=sourcePixels();
 const state={mode:'inspect',selected:DEFAULT_INDEX,colourValues:pixelAt(source,DEFAULT_INDEX),screenValues:[255,255,255],showOutline:true};
 const pictures=[...root.querySelectorAll('[data-tv-picture]')],contexts=pictures.map(c=>c.getContext('2d'));
 const lenses=[...root.querySelectorAll('[data-tv-loupe-canvas]')],lensContexts=lenses.map(c=>c.getContext('2d'));
 if([...contexts,...lensContexts].some(c=>!c))throw new Error('Canvas2D unavailable');
 contexts[0].putImageData(new ImageData(rgbaPixels(source),WIDTH,HEIGHT),0,0);
 const values=()=>state.mode==='screen'?state.screenValues:state.colourValues;
 const settings=()=>({mode:state.mode,selected:state.selected,values:values()});
 let groupIndex=-1,matches=[],outline='',drag=null,dragFrame=0,pendingDrag=null,frameKey='',visible=source;
 const placements=[null,null],groups=new Map(),outlines=new Map();
 for(let i=0;i<WIDTH*HEIGHT;i++){const key=pixelAt(source,i).join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);}
 function sampleStatus(){const status=$('[data-tv-sample-status]');status.textContent=drag?'取樣中':'已選定';status.dataset.active=String(!!drag);}
 function positionLenses(){
  pictures.forEach((picture,i)=>{
   const size=picture.getBoundingClientRect().width;if(size<60)return;
   const p=loupeLayout(state.selected,size,placements[0]);placements[i]=p.side;
   const figure=picture.closest('figure'),lens=figure.querySelector('[data-tv-loupe]'),target=figure.querySelector('[data-tv-sample-handle]');
   Object.assign(lens.style,{left:`${p.left}px`,top:`${p.top}px`,width:`${p.diameter}px`,height:`${p.diameter}px`});
   const x=(state.selected%WIDTH+.5)/WIDTH*size,y=(Math.floor(state.selected/WIDTH)+.5)/HEIGHT*size,left=Math.max(0,Math.min(size-44,x-22)),top=Math.max(0,Math.min(size-44,y-22));
   target.style.left=`${left}px`;target.style.top=`${top}px`;target.style.setProperty('--sample-x',`${x-left}px`);target.style.setProperty('--sample-y',`${y-top}px`);
   target.setAttribute('aria-label',`${i===0?'原圖':'目前圖'}取樣框，已選第 ${Math.floor(state.selected/WIDTH)+1} 列第 ${state.selected%WIDTH+1} 格；拖曳移動，方向鍵微調，Escape取消。`);
   const distance=Math.hypot(p.cx-x,p.cy-y),endX=p.cx+(x-p.cx)/distance*p.diameter/2,endY=p.cy+(y-p.cy)/distance*p.diameter/2;
   figure.querySelector('[data-tv-loupe-link]').setAttribute('d',`M${x/size*WIDTH} ${y/size*HEIGHT}L${endX/size*WIDTH} ${endY/size*HEIGHT}`);
  });
 }
 function render(){
  const config=settings(),before=pixelAt(source,state.selected),after=currentPixel(source,state.selected,config),x=state.selected%WIDTH,y=Math.floor(state.selected/WIDTH),point=QUICK_POINTS.find(p=>p.index===state.selected);
  if(groupIndex!==state.selected){matches=groups.get(before.join(','));groupIndex=state.selected;}
  if(state.mode==='colour'&&state.showOutline){const key=before.join(',');if(!outlines.has(key))outlines.set(key,groupOutline(matches));outline=outlines.get(key);}
  root.dataset.mode=state.mode;root.dataset.selected=String(state.selected);root.dataset.targetCount=String(matches.length);
  root.querySelectorAll('[data-tv-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tvMode===state.mode)));
  $('[data-tv-current-figure]').hidden=state.mode==='inspect';$('[data-tv-controls]').hidden=state.mode==='inspect';$('[data-tv-adjust-selected]').hidden=state.mode!=='inspect';
  $('[data-tv-inspector-title]').textContent=state.mode==='inspect'?'選中的像素':state.mode==='colour'?'已選定的顏色':'整幅圖的 RGB 調整';
  $('[data-tv-position]').textContent=`${point?point.name+'｜':''}第 ${y+1} 列・第 ${x+1} 格`;
  $('[data-tv-target]').textContent=state.mode==='inspect'?'觀察這一格':state.mode==='colour'?`調整對象：原圖的${colourName(before)}`:'調整對象：整幅圖';
  $('[data-tv-scope]').textContent=state.mode==='inspect'?'小取樣框與鏡面中央金框，對應同一個像素。':state.mode==='colour'?`已選定同色 ${matches.length} 格，修改後一起變色。`:`全部 ${WIDTH*HEIGHT} 格一起調整通道強度。`;
  $('[data-tv-selected-colour]').style.backgroundColor=colourCss(after);$('[data-tv-selected-colour]').setAttribute('aria-label',`${colourName(after)}，RGB ${after.join('、')}`);
  $('[data-tv-colour-name]').textContent=`目前：${colourName(after)}`;
  $('[data-tv-current-title]').textContent=state.mode==='colour'?'同色像素調整後':'整幅圖調整後';
  $('[data-tv-instruction]').textContent=state.mode==='inspect'?'拖曳圖上的小取樣框，查看像素與 RGB；放開後選定。':state.mode==='colour'?`金色輪廓＝原圖中同色的 ${matches.length} 格。從右側「調整 RGB」立即改色。`:'拖曳任一小取樣框看像素；右側調整整台電視的 RGB 強度。';
  $('[data-tv-outline]').hidden=state.mode!=='colour';$('[data-tv-outline]').setAttribute('aria-pressed',String(state.showOutline));$('[data-tv-outline]').textContent=`範圍標示：${state.showOutline?'開啟':'關閉'}`;
  for(const figure of root.querySelectorAll('.tv-picture-figure')){
   figure.querySelector('[data-tv-group-outline]').setAttribute('d',state.mode==='colour'&&state.showOutline?outline:'');
   const region=figure.querySelector('[data-tv-region]'),cell=figure.querySelector('[data-tv-selected-cell]');
   region.setAttribute('x',Math.max(0,x-2));region.setAttribute('y',Math.max(0,y-2));region.setAttribute('width',Math.min(WIDTH-1,x+2)-Math.max(0,x-2)+1);region.setAttribute('height',Math.min(HEIGHT-1,y+2)-Math.max(0,y-2)+1);cell.setAttribute('x',x);cell.setAttribute('y',y);
  }
  const row=$('[data-tv-rgb="before"]');before.forEach((n,c)=>{row.querySelector(`[data-component="${c}"]`).style.backgroundColor=colourCss(before.map((v,i)=>i===c?v:0));row.querySelector(`[data-value="${c}"]`).textContent=`${['R','G','B'][c]} ${n}`;});row.querySelector('[data-combined]').style.backgroundColor=colourCss(before);row.querySelector('[data-combined]').setAttribute('aria-label',`原本${colourName(before)}，RGB ${before.join('、')}`);
  $('[data-tv-control-label]').textContent=state.mode==='screen'?'在這裡調整 RGB 強度':'在這裡調整 RGB';
  $('[data-tv-control-help]').textContent=state.mode==='screen'?'0 關閉、255 保留原強度；各像素依原值同比例改變。':'點選 0／128／255，或直接輸入數值。修改會立即套用整組。';
  root.querySelectorAll('[data-tv-value]').forEach((input,c)=>{if(input.value!==String(config.values[c]))input.value=String(config.values[c]);input.setAttribute('aria-invalid','false');});
  root.querySelectorAll('[data-tv-preset]').forEach(b=>b.setAttribute('aria-pressed',String(config.values[Number(b.dataset.channel)]===Number(b.dataset.tvPreset))));
  $('[data-tv-pixel-values]').textContent=`目前像素：R ${after[0]}・G ${after[1]}・B ${after[2]}`;
  $('[data-tv-reset]').textContent=state.mode==='colour'?'還原這組顏色':'還原全部強度';$('[data-tv-input-error]').hidden=true;
  const nextFrameKey=state.mode==='inspect'?'inspect':state.mode+':'+config.values.join(',')+(state.mode==='colour'?':'+before.join(','):'');
  if(frameKey!==nextFrameKey){visible=renderPixels(source,config);contexts[1].putImageData(new ImageData(rgbaPixels(visible),WIDTH,HEIGHT),0,0);frameKey=nextFrameKey;}
  const neighbours=neighbourhood(state.selected,2);
  lenses.forEach((lens,i)=>{const ctx=lensContexts[i],frame=i===0?source:visible;ctx.clearRect(0,0,150,150);ctx.fillStyle='#d9ded1';ctx.fillRect(0,0,150,150);neighbours.forEach((index,j)=>{const a=j%5*30,b=Math.floor(j/5)*30;if(index!==null){ctx.fillStyle=colourCss(pixelAt(frame,index));ctx.fillRect(a,b,30,30);}ctx.strokeStyle='#64765d80';ctx.lineWidth=1;ctx.strokeRect(a+.5,b+.5,29,29);});ctx.strokeStyle='#3c3219';ctx.lineWidth=5;ctx.strokeRect(60,60,30,30);ctx.strokeStyle='#ffd45c';ctx.lineWidth=2;ctx.strokeRect(60,60,30,30);lens.hidden=false;lens.setAttribute('aria-label',`${i===0?'原圖':'目前圖'}的實際局部放大，中央第 ${y+1} 列第 ${x+1} 格。拖曳圖上的小取樣框換選。`);});
  pictures.forEach((canvas,i)=>{canvas.hidden=false;canvas.setAttribute('aria-label',`${i===0?'原圖':'目前畫面'}，已選第 ${y+1} 列第 ${x+1} 格。請拖曳小取樣框選像素，或用方向鍵微調。`);});
  positionLenses();$('[data-tv-observation]').textContent=observationText(before,after,config);
  $('[data-tv-takeaway]').textContent=state.mode==='inspect'?'拖曳小取樣框 → 放大鏡自動跟隨 → 顏色與 RGB 同步。':state.mode==='colour'?`現在只調整原圖中相同 RGB 的 ${matches.length} 格，其他像素保持原樣。`:'整圖調整時，每個像素仍保有各自的 RGB 原值與比例。';
  root.querySelectorAll('[data-tv-point]').forEach(b=>b.setAttribute('aria-pressed',String(QUICK_POINTS.find(p=>p.id===b.dataset.tvPoint).index===state.selected)));
 }
 function select(index){if(index===state.selected)return;if(drag&&sameColour(source,index,drag.initial.selected))state.colourValues=[...drag.initial.colourValues];else if(!sameColour(source,state.selected,index))state.colourValues=pixelAt(source,index);state.selected=index;render();}
 function setMode(mode){cancelDrag();state.mode=mode;render();}
 function setChannel(channel,value){cancelDrag();if(!Number.isInteger(value)||value<0||value>255)return false;values()[channel]=value;render();return true;}
 root.querySelectorAll('[data-tv-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.tvMode)));
 $('[data-tv-adjust-selected]').addEventListener('click',()=>setMode('colour'));
 root.querySelectorAll('[data-tv-preset]').forEach(b=>b.addEventListener('click',()=>setChannel(Number(b.dataset.channel),Number(b.dataset.tvPreset))));
 root.querySelectorAll('[data-tv-value]').forEach((input,c)=>{input.addEventListener('input',()=>{if(input.value.trim()===''||!setChannel(c,Number(input.value))){input.setAttribute('aria-invalid','true');$('[data-tv-input-error]').hidden=false;}});input.addEventListener('blur',()=>{if(input.getAttribute('aria-invalid')==='true'){input.value=String(values()[c]);input.setAttribute('aria-invalid','false');$('[data-tv-input-error]').hidden=true;}});});
 $('[data-tv-reset]').addEventListener('click',()=>{cancelDrag();if(state.mode==='screen')state.screenValues=[255,255,255];else state.colourValues=pixelAt(source,state.selected);render();});
 $('[data-tv-outline]').addEventListener('click',()=>{state.showOutline=!state.showOutline;render();});
 function keyboard(e){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();cancelDrag();select(moveSelection(state.selected,e.key));}
 function applyDrag(){if(!drag||!pendingDrag)return;const p=pendingDrag;pendingDrag=null;const rect=pictures[drag.index].getBoundingClientRect();if(rect.width<60)return cancelDrag();select(sampleDragIndex(p.x,p.y,rect,drag.grabX,drag.grabY));}
 function clearDrag(){const previous=drag;if(!previous)return;drag=null;pendingDrag=null;cancelAnimationFrame(dragFrame);dragFrame=0;delete root.dataset.dragging;delete previous.element.dataset.dragging;sampleStatus();if(previous.element.hasPointerCapture(previous.pointerId))previous.element.releasePointerCapture(previous.pointerId);}
 function cancelDrag(){if(!drag)return;const initial=drag.initial;clearDrag();state.selected=initial.selected;state.colourValues=[...initial.colourValues];placements.splice(0,2,...initial.placements);render();}
 function queueDrag(e){if(!drag||e.pointerId!==drag.pointerId)return;if(!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<2)return;drag.moved=true;pendingDrag={x:e.clientX,y:e.clientY};if(!dragFrame)dragFrame=requestAnimationFrame(()=>{dragFrame=0;applyDrag();});}
 root.querySelectorAll('[data-tv-sample-handle]').forEach((element,index)=>{
  element.addEventListener('keydown',keyboard);
  element.addEventListener('pointerdown',e=>{
   if(drag||!e.isPrimary||e.button!==0)return;e.preventDefault();
   const rect=pictures[index].getBoundingClientRect(),x=rect.left+(state.selected%WIDTH+.5)/WIDTH*rect.width,y=rect.top+(Math.floor(state.selected/WIDTH)+.5)/HEIGHT*rect.height;
   drag={element,index,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,grabX:e.clientX-x,grabY:e.clientY-y,moved:false,initial:{selected:state.selected,colourValues:[...state.colourValues],placements:[...placements]}};
   root.dataset.dragging='true';element.dataset.dragging='true';sampleStatus();element.focus({preventScroll:true});element.setPointerCapture(e.pointerId);
  });
  element.addEventListener('pointermove',queueDrag);
  element.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.pointerId)return;queueDrag(e);applyDrag();clearDrag();});
  element.addEventListener('pointercancel',e=>{if(drag&&e.pointerId===drag.pointerId)cancelDrag();});
  element.addEventListener('lostpointercapture',e=>{if(drag&&e.pointerId===drag.pointerId)cancelDrag();});
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag){e.preventDefault();cancelDrag();}});
 window.addEventListener('blur',cancelDrag);window.addEventListener('resize',cancelDrag);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelDrag();});
 root.querySelectorAll('[data-tv-point]').forEach(b=>b.addEventListener('click',()=>{cancelDrag();select(QUICK_POINTS.find(p=>p.id===b.dataset.tvPoint).index);}));
 sampleStatus();render();new ResizeObserver(()=>{cancelDrag();positionLenses();}).observe($('.tv-gallery'));root.querySelectorAll('[data-tv-pending]').forEach(b=>b.disabled=false);$('[data-tv-load-note]').hidden=true;root.dataset.ready='true';
}
