import {WIDTH,HEIGHT,QUICK_POINTS,DEFAULT_INDEX,sourcePixels,currentPixel,renderPixels,rgbaPixels,pixelAt,colourCss,colourName,sameColour,matchingIndices,groupOutline,neighbourhood,pointerIndex,moveSelection,observationText,loupeLayout} from './pixel-tv-observer-model.mjs?v=tv-loupe-20261105';
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
 let groupIndex=-1,matches=[],outline='';
 function positionLenses(){
  pictures.forEach((picture,i)=>{const size=picture.getBoundingClientRect().width;if(size<60)return;const p=loupeLayout(state.selected,size),figure=picture.closest('figure'),lens=figure.querySelector('[data-tv-loupe]');lens.style.left=`${p.left}px`;lens.style.top=`${p.top}px`;lens.style.width=`${p.diameter}px`;lens.style.height=`${p.diameter}px`;const x=state.selected%WIDTH+.5,y=Math.floor(state.selected/WIDTH)+.5;figure.querySelector('[data-tv-loupe-link]').setAttribute('d',`M${x} ${y}L${p.cx/size*WIDTH} ${p.cy/size*HEIGHT}`);});
 }
 function render(){
  const config=settings(),before=pixelAt(source,state.selected),after=currentPixel(source,state.selected,config),x=state.selected%WIDTH,y=Math.floor(state.selected/WIDTH),point=QUICK_POINTS.find(p=>p.index===state.selected);
  if(groupIndex!==state.selected){matches=matchingIndices(source,state.selected);outline=groupOutline(matches);groupIndex=state.selected;}
  root.dataset.mode=state.mode;root.dataset.selected=String(state.selected);root.dataset.targetCount=String(matches.length);
  root.querySelectorAll('[data-tv-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tvMode===state.mode)));
  $('[data-tv-current-figure]').hidden=state.mode==='inspect';$('[data-tv-controls]').hidden=state.mode==='inspect';$('[data-tv-adjust-selected]').hidden=state.mode!=='inspect';
  $('[data-tv-inspector-title]').textContent=state.mode==='inspect'?'選中的像素':state.mode==='colour'?'已選定的顏色':'整幅圖的 RGB 調整';
  $('[data-tv-position]').textContent=`${point?point.name+'｜':''}第 ${y+1} 列・第 ${x+1} 格`;
  $('[data-tv-target]').textContent=state.mode==='inspect'?'觀察這一格':state.mode==='colour'?`調整對象：原圖的${colourName(before)}`:'調整對象：整幅圖';
  $('[data-tv-scope]').textContent=state.mode==='inspect'?'放大鏡中央金框，對應下方這個顏色。':state.mode==='colour'?`已選定同色 ${matches.length} 格，修改後一起變色。`:`全部 ${WIDTH*HEIGHT} 格一起調整通道強度。`;
  $('[data-tv-selected-colour]').style.backgroundColor=colourCss(after);$('[data-tv-selected-colour]').setAttribute('aria-label',`${colourName(after)}，RGB ${after.join('、')}`);
  $('[data-tv-colour-name]').textContent=`目前：${colourName(after)}`;
  $('[data-tv-current-title]').textContent=state.mode==='colour'?'同色像素調整後':'整幅圖調整後';
  $('[data-tv-instruction]').textContent=state.mode==='inspect'?'點圖選一格，放大鏡會放大該處；右側顯示選中格的顏色。':state.mode==='colour'?`金色輪廓＝原圖中同色的 ${matches.length} 格。從右側「調整 RGB」立即改色。`:'右側調整整台電視的 RGB 強度；兩張圖都能選格觀察。';
  $('[data-tv-outline]').hidden=state.mode!=='colour';$('[data-tv-outline]').setAttribute('aria-pressed',String(state.showOutline));$('[data-tv-outline]').textContent=`範圍標示：${state.showOutline?'開啟':'關閉'}`;
  for(const figure of root.querySelectorAll('.tv-picture-figure')){
   figure.querySelector('[data-tv-group-outline]').setAttribute('d',state.mode==='colour'&&state.showOutline?outline:'');
   const region=figure.querySelector('[data-tv-region]'),cell=figure.querySelector('[data-tv-selected-cell]');
   region.setAttribute('x',Math.max(0,x-1));region.setAttribute('y',Math.max(0,y-1));region.setAttribute('width',Math.min(WIDTH-1,x+1)-Math.max(0,x-1)+1);region.setAttribute('height',Math.min(HEIGHT-1,y+1)-Math.max(0,y-1)+1);cell.setAttribute('x',x);cell.setAttribute('y',y);
  }
  const row=$('[data-tv-rgb="before"]');before.forEach((n,c)=>{row.querySelector(`[data-component="${c}"]`).style.backgroundColor=colourCss(before.map((v,i)=>i===c?v:0));row.querySelector(`[data-value="${c}"]`).textContent=`${['R','G','B'][c]} ${n}`;});row.querySelector('[data-combined]').style.backgroundColor=colourCss(before);row.querySelector('[data-combined]').setAttribute('aria-label',`原本${colourName(before)}，RGB ${before.join('、')}`);
  $('[data-tv-control-label]').textContent=state.mode==='screen'?'在這裡調整 RGB 強度':'在這裡調整 RGB';
  $('[data-tv-control-help]').textContent=state.mode==='screen'?'0 關閉、255 保留原強度；各像素依原值同比例改變。':'點選 0／128／255，或直接輸入數值。修改會立即套用整組。';
  root.querySelectorAll('[data-tv-value]').forEach((input,c)=>{if(input.value!==String(config.values[c]))input.value=String(config.values[c]);input.setAttribute('aria-invalid','false');});
  root.querySelectorAll('[data-tv-preset]').forEach(b=>b.setAttribute('aria-pressed',String(config.values[Number(b.dataset.channel)]===Number(b.dataset.tvPreset))));
  $('[data-tv-pixel-values]').textContent=`目前像素：R ${after[0]}・G ${after[1]}・B ${after[2]}`;
  $('[data-tv-reset]').textContent=state.mode==='colour'?'還原這組顏色':'還原全部強度';$('[data-tv-input-error]').hidden=true;
  const visible=renderPixels(source,config);contexts[1].putImageData(new ImageData(rgbaPixels(visible),WIDTH,HEIGHT),0,0);
  const neighbours=neighbourhood(state.selected);
  lenses.forEach((lens,i)=>{const ctx=lensContexts[i],frame=i===0?source:visible;ctx.clearRect(0,0,90,90);ctx.fillStyle='#d9ded1';ctx.fillRect(0,0,90,90);neighbours.forEach((index,j)=>{const a=j%3*30,b=Math.floor(j/3)*30;if(index!==null){ctx.fillStyle=colourCss(pixelAt(frame,index));ctx.fillRect(a,b,30,30);}ctx.strokeStyle='#64765d80';ctx.lineWidth=1;ctx.strokeRect(a+.5,b+.5,29,29);});ctx.strokeStyle='#3c3219';ctx.lineWidth=5;ctx.strokeRect(30,30,30,30);ctx.strokeStyle='#ffd45c';ctx.lineWidth=2;ctx.strokeRect(30,30,30,30);lens.hidden=false;lens.setAttribute('aria-label',`${i===0?'原圖':'目前圖'}的實際局部放大，中央第 ${y+1} 列第 ${x+1} 格。點主圖或用方向鍵換選。`);});
  pictures.forEach((canvas,i)=>{canvas.hidden=false;canvas.setAttribute('aria-label',`${i===0?'原圖':'目前畫面'}，已選第 ${y+1} 列第 ${x+1} 格。可點選或用方向鍵選像素。`);});
  positionLenses();$('[data-tv-observation]').textContent=observationText(before,after,config);
  $('[data-tv-takeaway]').textContent=state.mode==='inspect'?'點圖選位置 → 放大鏡看清像素 → 右側讀取顏色與 RGB。':state.mode==='colour'?`現在只調整原圖中相同 RGB 的 ${matches.length} 格，其他像素保持原樣。`:'整圖調整時，每個像素仍保有各自的 RGB 原值與比例。';
  root.querySelectorAll('[data-tv-point]').forEach(b=>b.setAttribute('aria-pressed',String(QUICK_POINTS.find(p=>p.id===b.dataset.tvPoint).index===state.selected)));
 }
 function select(index){if(!sameColour(source,state.selected,index))state.colourValues=pixelAt(source,index);state.selected=index;render();}
 function setMode(mode){state.mode=mode;render();}
 function setChannel(channel,value){if(!Number.isInteger(value)||value<0||value>255)return false;values()[channel]=value;render();return true;}
 root.querySelectorAll('[data-tv-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.tvMode)));
 $('[data-tv-adjust-selected]').addEventListener('click',()=>setMode('colour'));
 root.querySelectorAll('[data-tv-preset]').forEach(b=>b.addEventListener('click',()=>setChannel(Number(b.dataset.channel),Number(b.dataset.tvPreset))));
 root.querySelectorAll('[data-tv-value]').forEach((input,c)=>{input.addEventListener('input',()=>{if(input.value.trim()===''||!setChannel(c,Number(input.value))){input.setAttribute('aria-invalid','true');$('[data-tv-input-error]').hidden=false;}});input.addEventListener('blur',()=>{if(input.getAttribute('aria-invalid')==='true'){input.value=String(values()[c]);input.setAttribute('aria-invalid','false');$('[data-tv-input-error]').hidden=true;}});});
 $('[data-tv-reset]').addEventListener('click',()=>{if(state.mode==='screen')state.screenValues=[255,255,255];else state.colourValues=pixelAt(source,state.selected);render();});
 $('[data-tv-outline]').addEventListener('click',()=>{state.showOutline=!state.showOutline;render();});
 function keyboard(e){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();select(moveSelection(state.selected,e.key));}
 pictures.forEach(canvas=>{canvas.addEventListener('click',e=>select(pointerIndex(e.clientX,e.clientY,canvas.getBoundingClientRect())));canvas.addEventListener('keydown',keyboard);});
 root.querySelectorAll('[data-tv-point]').forEach(b=>b.addEventListener('click',()=>select(QUICK_POINTS.find(p=>p.id===b.dataset.tvPoint).index)));
 render();new ResizeObserver(positionLenses).observe($('.tv-gallery'));root.querySelectorAll('[data-tv-pending]').forEach(b=>b.disabled=false);$('[data-tv-load-note]').hidden=true;root.dataset.ready='true';
}
