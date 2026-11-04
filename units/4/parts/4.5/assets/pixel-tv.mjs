import {WIDTH,HEIGHT,QUICK_POINTS,DEFAULT_INDEX,sourcePixels,currentPixel,renderPixels,rgbaPixels,pixelAt,colourCss,neighbourhood,pointerIndex,moveSelection,observationText} from './pixel-tv-observer-model.mjs?v=tv-observer-20261104';
export function initialisePixelTv(root){
 if(root.dataset.ready==='true')return;
 const $=s=>root.querySelector(s),source=sourcePixels(),state={mode:'screen',selected:DEFAULT_INDEX,localMask:[true,true,true],screenMask:[false,true,true]},canvases=[...root.querySelectorAll('[data-tv-picture]')],contexts=canvases.map(c=>c.getContext('2d'));
 if(contexts.some(c=>!c))throw new Error('Canvas2D unavailable');
 const baseImage=new ImageData(rgbaPixels(source),WIDTH,HEIGHT);contexts[0].putImageData(baseImage,0,0);
 const settings=()=>({mode:state.mode,selected:state.selected,mask:state.mode==='screen'?state.screenMask:state.localMask});
 function render(){
  const config=settings(),before=pixelAt(source,state.selected),after=currentPixel(source,state.selected,config),x=state.selected%WIDTH,y=Math.floor(state.selected/WIDTH),point=QUICK_POINTS.find(p=>p.index===state.selected),names=['紅光','綠光','藍光'];
  root.dataset.mode=state.mode;root.dataset.selected=String(state.selected);root.querySelectorAll('[data-tv-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tvMode===state.mode)));
  $('[data-tv-control-label]').textContent=state.mode==='pixel'?'只調整選中這格的色光':'整台電視的色光';$('[data-tv-controls]').hidden=state.mode==='inspect';$('[data-tv-current-figure]').hidden=state.mode==='inspect';
  root.querySelectorAll('[data-tv-channel]').forEach(b=>{const c=Number(b.dataset.tvChannel);b.setAttribute('aria-pressed',String(config.mask[c]));b.querySelector('span').textContent=`${names[c]}：${config.mask[c]?'開啟':'關閉'}`;});
  $('[data-tv-reset]').textContent=state.mode==='pixel'?'還原這一格':'還原全部色光';
  const off=names.filter((_,c)=>!config.mask[c]);$('[data-tv-current-title]').textContent=state.mode==='pixel'?'只改金框這一格':off.length===1?`${off[0]}關閉後`:off.length?'色光關閉後':'色光全開';
  $('[data-tv-instruction]').textContent=state.mode==='inspect'?'點圖片中的一格，直接查看它的 RGB 設定。':state.mode==='pixel'?'只有金框這一格會套用開關，其他像素保持原圖。':'兩張圖都能點選，同步查看同一個像素。';
  $('[data-tv-position]').textContent=`${point?point.name+'｜':''}第 ${y+1} 列・第 ${x+1} 格`;
  $('[data-tv-current-row]').hidden=state.mode==='inspect';
  for(const[which,value]of[['before',before],['after',after]]){const row=$(`[data-tv-rgb="${which}"]`);value.forEach((n,c)=>{row.querySelector(`[data-component="${c}"]`).style.backgroundColor=colourCss(value.map((v,i)=>i===c?v:0));row.querySelector(`[data-value="${c}"]`).textContent=`${['R','G','B'][c]} ${n}`;});row.querySelector('[data-combined]').style.backgroundColor=colourCss(value);row.querySelector('[data-combined]').setAttribute('aria-label',`${which==='before'?'原本':'目前'}合成色 RGB ${value.join('、')}`);}
  const visible=renderPixels(source,config);contexts[1].putImageData(new ImageData(rgbaPixels(visible),WIDTH,HEIGHT),0,0);
  for(const svg of root.querySelectorAll('[data-tv-selection]')){svg.querySelector('rect').setAttribute('x',x);svg.querySelector('rect').setAttribute('y',y);svg.querySelector('path').setAttribute('d',`M${x-2} ${y+.5}H${x+3}M${x+.5} ${y-2}V${y+3}`);}
  const neighbours=neighbourhood(state.selected);root.querySelectorAll('[data-tv-neighbour]').forEach((button,i)=>{const index=neighbours[i];button.disabled=index===null;button.dataset.index=index===null?'':String(index);button.setAttribute('aria-pressed',String(i===4));const rgb=index===null?[0,0,0]:currentPixel(source,index,config);button.setAttribute('aria-label',index===null?'圖片範圍外':`第 ${Math.floor(index/WIDTH)+1} 列，第 ${index%WIDTH+1} 格，RGB ${rgb.join('、')}`);button.querySelectorAll('i').forEach((bar,c)=>bar.style.backgroundColor=colourCss(rgb.map((n,j)=>j===c?n:0)));});
  $('[data-tv-neighbour-caption]').textContent=state.mode==='screen'&&off.length?`每格的${off.join('、')}子像素都已關閉。`:state.mode==='pixel'?'金框這一格套用開關；周圍保留原值。':'點放大格也能選取旁邊的像素。';
  $('[data-tv-observation]').textContent=observationText(before,after,config);$('[data-tv-takeaway]').textContent=state.mode==='inspect'?'每個像素都有自己的 RGB 設定，許多像素組成完整畫面。':state.mode==='pixel'?'只改一格的色光，其他像素保持原樣。':off.length?`關掉的是每個像素的${off.join('、')}；其他通道保留原設定。`:'整幅圖的各個像素，都保留原本的 RGB 設定。';
  root.querySelectorAll('[data-tv-point]').forEach(b=>b.setAttribute('aria-pressed',String(QUICK_POINTS.find(p=>p.id===b.dataset.tvPoint).index===state.selected)));
  canvases.forEach((canvas,i)=>{canvas.hidden=false;canvas.setAttribute('aria-label',`${i===0?'原圖':'目前畫面'}，已選第 ${y+1} 列第 ${x+1} 格。可點選或用方向鍵選像素。`);});
 }
 function select(index){state.selected=index;render();}
 root.querySelectorAll('[data-tv-mode]').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.tvMode;render();}));
 root.querySelectorAll('[data-tv-channel]').forEach(b=>b.addEventListener('click',()=>{const mask=state.mode==='screen'?state.screenMask:state.localMask;mask[Number(b.dataset.tvChannel)]=!mask[Number(b.dataset.tvChannel)];render();}));
 $('[data-tv-reset]').addEventListener('click',()=>{if(state.mode==='screen')state.screenMask=[true,true,true];else state.localMask=[true,true,true];render();});
 canvases.forEach(canvas=>{canvas.addEventListener('click',e=>select(pointerIndex(e.clientX,e.clientY,canvas.getBoundingClientRect())));canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();select(moveSelection(state.selected,e.key));});});
 root.querySelectorAll('[data-tv-point]').forEach(b=>b.addEventListener('click',()=>select(QUICK_POINTS.find(p=>p.id===b.dataset.tvPoint).index)));
 root.querySelectorAll('[data-tv-neighbour]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.index!=='')select(Number(b.dataset.index));}));
 render();root.querySelectorAll('[data-tv-pending]').forEach(b=>b.disabled=false);$('[data-tv-load-note]').hidden=true;root.dataset.ready='true';
}
