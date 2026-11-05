import {WIDTH,HEIGHT,QUICK_POINTS,DEFAULT_INDEX,sourcePixels,currentPixel,renderPixels,rgbaPixels,pixelAt,colourCss,colourName,matchingIndices,groupOutline,neighbourhood,pointerIndex,moveSelection,observationText} from './pixel-tv-observer-model.mjs?v=tv-focus-20261105';
export function initialisePixelTv(root){
 if(root.dataset.ready==='true')return;
 const $=s=>root.querySelector(s),source=sourcePixels();
 const state={mode:'inspect',selected:DEFAULT_INDEX,colourMask:[true,true,true],screenMask:[true,true,true],visitedColour:false};
 const canvases=[...root.querySelectorAll('[data-tv-picture]')],contexts=canvases.map(c=>c.getContext('2d'));
 if(contexts.some(c=>!c))throw new Error('Canvas2D unavailable');
 contexts[0].putImageData(new ImageData(rgbaPixels(source),WIDTH,HEIGHT),0,0);
 const settings=()=>({mode:state.mode,selected:state.selected,mask:state.mode==='screen'?state.screenMask:state.colourMask});
 let groupIndex=-1,matches=[],outline='';
 function render(){
  const config=settings(),before=pixelAt(source,state.selected),after=currentPixel(source,state.selected,config),x=state.selected%WIDTH,y=Math.floor(state.selected/WIDTH),point=QUICK_POINTS.find(p=>p.index===state.selected),names=['紅光','綠光','藍光'];
  if(groupIndex!==state.selected){matches=matchingIndices(source,state.selected);outline=groupOutline(matches);groupIndex=state.selected;}
  root.dataset.mode=state.mode;root.dataset.selected=String(state.selected);root.dataset.targetCount=String(matches.length);
  root.querySelectorAll('[data-tv-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tvMode===state.mode)));
  $('[data-tv-control-label]').textContent=state.mode==='colour'?`調整同色像素（${matches.length} 格）`:'整台電視的色光';
  $('[data-tv-controls]').hidden=state.mode==='inspect';$('[data-tv-current-figure]').hidden=state.mode==='inspect';
  root.querySelectorAll('[data-tv-channel]').forEach(b=>{const c=Number(b.dataset.tvChannel);b.setAttribute('aria-pressed',String(config.mask[c]));b.querySelector('span').textContent=`${names[c]}：${config.mask[c]?'開啟':'關閉'}`;});
  $('[data-tv-reset]').textContent=state.mode==='colour'?'還原這組像素':'還原全部色光';
  const off=names.filter((_,c)=>!config.mask[c]);
  $('[data-tv-current-title]').textContent=state.mode==='colour'?'同色像素調整後':off.length===1?`${off[0]}關閉後`:off.length?'色光關閉後':'色光全開';
  $('[data-tv-instruction]').textContent=state.mode==='inspect'?'點圖選位置，再看右側局部放大中的金框。':state.mode==='colour'?`原圖金色輪廓內的 ${matches.length} 格，會一起套用色光開關。`:'兩張圖都能點選，同步查看同一個像素。';
  $('[data-tv-position]').textContent=`${point?point.name+'｜':''}第 ${y+1} 列・第 ${x+1} 格`;
  $('[data-tv-selected-colour]').style.backgroundColor=colourCss(after);
  $('[data-tv-colour-name]').textContent=`選中：${colourName(after)}`;
  $('[data-tv-group-note]').hidden=state.mode!=='colour';
  $('[data-tv-group-note]').textContent=`原圖中相同 RGB 的 ${matches.length} 格一起變色；其他像素保持原樣。`;
  $('[data-tv-current-row]').hidden=state.mode==='inspect';
  for(const[which,value]of[['before',before],['after',after]]){
   const row=$(`[data-tv-rgb="${which}"]`);
   value.forEach((n,c)=>{row.querySelector(`[data-component="${c}"]`).style.backgroundColor=colourCss(value.map((v,i)=>i===c?v:0));row.querySelector(`[data-value="${c}"]`).textContent=`${['R','G','B'][c]} ${n}`;});
   row.querySelector('[data-combined]').style.backgroundColor=colourCss(value);
   row.querySelector('[data-combined]').setAttribute('aria-label',`${which==='before'?'原本':'目前'}${colourName(value)}，RGB ${value.join('、')}`);
  }
  const visible=renderPixels(source,config);contexts[1].putImageData(new ImageData(rgbaPixels(visible),WIDTH,HEIGHT),0,0);
  for(const svg of root.querySelectorAll('[data-tv-selection]')){
   const region=svg.querySelector('[data-tv-region]'),selected=svg.querySelector('[data-tv-selected-cell]');
   region.setAttribute('x',Math.max(0,x-1));region.setAttribute('y',Math.max(0,y-1));
   region.setAttribute('width',Math.min(WIDTH-1,x+1)-Math.max(0,x-1)+1);region.setAttribute('height',Math.min(HEIGHT-1,y+1)-Math.max(0,y-1)+1);
   selected.setAttribute('x',x);selected.setAttribute('y',y);
  }
  for(const pin of root.querySelectorAll('[data-tv-loupe-pin]')){pin.style.left=`${(x+.5)/WIDTH*100}%`;pin.style.top=`${(y+.5)/HEIGHT*100}%`;pin.dataset.side=x<WIDTH/2?'right':'left';pin.dataset.vertical=y<HEIGHT/2?'below':'above';}
  $('[data-tv-group-outline]').setAttribute('d',state.mode==='colour'?outline:'');
  const neighbours=neighbourhood(state.selected);
  root.querySelectorAll('[data-tv-neighbour]').forEach((button,i)=>{
   const index=neighbours[i];button.disabled=index===null;button.dataset.index=index===null?'':String(index);button.setAttribute('aria-pressed',String(i===4));
   const rgb=index===null?[0,0,0]:currentPixel(source,index,config);
   button.style.backgroundColor=index===null?'transparent':colourCss(rgb);
   button.setAttribute('aria-label',index===null?'圖片範圍外':`第 ${Math.floor(index/WIDTH)+1} 列，第 ${index%WIDTH+1} 格，${colourName(rgb)}，RGB ${rgb.join('、')}`);
  });
  $('[data-tv-neighbour-caption]').textContent='金框＝選中的一格；點旁邊的格子可換選。';
  $('[data-tv-observation]').textContent=observationText(before,after,config);
  $('[data-tv-takeaway]').textContent=state.mode==='inspect'?'先看這一格呈現的顏色，再看下方紅、綠、藍如何組成它。':state.mode==='colour'?`只調整原圖中相同 RGB 的 ${matches.length} 格；不是只改金框的一格。`:off.length?`關掉的是每個像素的${off.join('、')}；其他通道保留原設定。`:'整幅圖的各個像素，都保留原本的 RGB 設定。';
  root.querySelectorAll('[data-tv-point]').forEach(b=>b.setAttribute('aria-pressed',String(QUICK_POINTS.find(p=>p.id===b.dataset.tvPoint).index===state.selected)));
  canvases.forEach((canvas,i)=>{canvas.hidden=false;canvas.setAttribute('aria-label',`${i===0?'原圖':'目前畫面'}，已選第 ${y+1} 列第 ${x+1} 格。可點選或用方向鍵選像素。`);});
 }
 function select(index){state.selected=index;render();}
 root.querySelectorAll('[data-tv-mode]').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.tvMode;if(state.mode==='colour'&&!state.visitedColour){state.selected=DEFAULT_INDEX;state.visitedColour=true;}render();}));
 root.querySelectorAll('[data-tv-channel]').forEach(b=>b.addEventListener('click',()=>{const mask=state.mode==='screen'?state.screenMask:state.colourMask;mask[Number(b.dataset.tvChannel)]=!mask[Number(b.dataset.tvChannel)];render();}));
 $('[data-tv-reset]').addEventListener('click',()=>{if(state.mode==='screen')state.screenMask=[true,true,true];else state.colourMask=[true,true,true];render();});
 canvases.forEach(canvas=>{canvas.addEventListener('click',e=>select(pointerIndex(e.clientX,e.clientY,canvas.getBoundingClientRect())));canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();select(moveSelection(state.selected,e.key));});});
 root.querySelectorAll('[data-tv-point]').forEach(b=>b.addEventListener('click',()=>select(QUICK_POINTS.find(p=>p.id===b.dataset.tvPoint).index)));
 root.querySelectorAll('[data-tv-neighbour]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.index!=='')select(Number(b.dataset.index));}));
 render();root.querySelectorAll('[data-tv-pending]').forEach(b=>b.disabled=false);$('[data-tv-load-note]').hidden=true;root.dataset.ready='true';
}
