import {COLOUR_TARGETS,REPAIR_SIZE,REPAIR_HOLE,REPAIR_TARGET,PICTURE_SIZE,PICTURE_TARGET,initialRepair,blankPicture,fillPixel,evaluatePixels,coordinate,nextEmpty,sameColour,colourCss,subpixelCss,paletteName,levelName,colourHint} from './pixel-tv-model.mjs?v=tv-three-20261104';

export function initialisePixelTv(root){
 if(root.dataset.ready==='true')return;
 const $=s=>root.querySelector(s);let task=0,levels=[4,4,0],colourIndex=0,helper=null;const saved=new Map();
 const boards=[null,{size:REPAIR_SIZE,target:REPAIR_TARGET,pixels:initialRepair(),selected:REPAIR_HOLE,reviewed:false},{size:PICTURE_SIZE,target:PICTURE_TARGET,pixels:blankPicture(),selected:9,reviewed:false}],feedback=[null,null,null];
 const description=['改變 RGB 亮度，讓左邊這個像素呈現右邊的目標色。','為左圖的問號格調色，補成右圖相同位置的顏色。','逐格設定像素的顏色，用空白畫布組出右邊的圖片。'];
 const goal=()=>helper?{name:paletteName(helper.target),levels:helper.target}:COLOUR_TARGETS[colourIndex];
 function say(kind,message,title){feedback[task]={kind,message,title};renderFeedback();}
 function renderFeedback(){const value=feedback[task];$('[data-tv-feedback]').hidden=!value;if(value){$('[data-tv-feedback]').dataset.kind=value.kind;$('[data-tv-feedback-title]').textContent=value.title||(value.kind==='correct'?'顏色調對了！':value.kind==='retry'?'再比較看看':'操作提示');$('[data-tv-feedback-message]').textContent=value.message;}}
 function setLevels(value){levels=[...value];feedback[0]=null;feedback[task]=null;}
 function rememberColour(value){
  const key=value.join('-');if(saved.has(key))return;
  saved.set(key,Object.freeze([...value]));renderPalette();
 }
 function renderPalette(){
  const list=$('[data-tv-palette]');$('[data-tv-palette-empty]').hidden=saved.size>0;
  for(const[key,value]of saved){
   let button=[...list.querySelectorAll('[data-tv-saved-colour]')].find(b=>b.dataset.tvSavedColour===key);
   if(!button){
    button=document.createElement('button');button.type='button';button.dataset.tvSavedColour=key;button.setAttribute('aria-label',`使用${paletteName(value)}，紅光${levelName(value[0])}、綠光${levelName(value[1])}、藍光${levelName(value[2])}`);
    const swatch=document.createElement('i'),name=document.createElement('span'),check=document.createElement('b');swatch.style.backgroundColor=colourCss(value);swatch.setAttribute('aria-hidden','true');name.textContent=paletteName(value);check.textContent='✓';check.setAttribute('aria-hidden','true');button.append(swatch,name,check);
    button.addEventListener('click',()=>{setLevels(value);renderTuner();renderFeedback();});list.append(button);
   }
   button.setAttribute('aria-pressed',String(sameColour(levels,value)));
  }
 }

 function renderTuner(){
  root.dataset.levels=JSON.stringify(levels);$('[data-tv-current-colour]').style.backgroundColor=colourCss(levels);$('[data-tv-combined]').style.backgroundColor=colourCss(levels);
  root.querySelectorAll('[data-tv-channel]').forEach(group=>{const i=Number(group.dataset.tvChannel),n=levels[i];group.querySelector('[data-tv-level-value]').textContent=`目前：${levelName(n)}`;group.querySelectorAll('[data-tv-level]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.tvLevel)===n)));$(`[data-tv-subpixel="${i}"]`).style.backgroundColor=subpixelCss(levels,i);$(`[data-tv-sublevel="${i}"]`).textContent=`${['紅','綠','藍'][i]}：${levelName(n)}`;});
  $('[data-tv-work-solid]').style.backgroundColor=colourCss(levels);
  if(task===0)$('[data-tv-work-caption]').textContent=paletteName(levels);renderPalette();
 }
 function renderBoard(){
  const board=boards[task],work=$('[data-tv-work-grid]'),target=$('[data-tv-target-grid]');work.replaceChildren();target.replaceChildren();if(!board)return;
  const {size,pixels,selected}=board,result=evaluatePixels(pixels,board.target);work.style.setProperty('--tv-size',size);target.style.setProperty('--tv-size',size);work.setAttribute('aria-rowcount',String(size));work.setAttribute('aria-colcount',String(size));work.setAttribute('aria-activedescendant',`tv-work-cell-${selected}`);
  for(let row=0;row<size;row++){const line=document.createElement('div');line.className='tv-grid-row';line.setAttribute('role','row');
   for(let column=0;column<size;column++){const index=row*size+column,value=pixels[index],cell=document.createElement('div'),ref=document.createElement('span');cell.id=`tv-work-cell-${index}`;cell.className='tv-cell';cell.dataset.tvCell=String(index);cell.setAttribute('role','gridcell');cell.setAttribute('aria-selected',String(index===selected));cell.setAttribute('aria-label',`第${row+1}列，第${column+1}格，${value?`已填${paletteName(value)}`:'未填色'}，目標為${paletteName(board.target[index])}`);
    cell.classList.toggle('tv-empty',value===null);cell.classList.toggle('tv-selected',index===selected);if(value)cell.style.backgroundColor=colourCss(value);else cell.textContent=task===1?'？':'·';
    if(task===1&&index!==REPAIR_HOLE)cell.dataset.fixed='true';if(board.reviewed&&(value===null||result.wrong.includes(index)))cell.classList.add('tv-needs-work');
    ref.className='tv-cell';ref.dataset.tvTargetCell=String(index);ref.style.backgroundColor=colourCss(board.target[index]);ref.classList.toggle('tv-selected',index===selected);line.append(cell);target.append(ref);
   }work.append(line);
  }
  const pos=coordinate(selected,size),position=`第 ${pos.row} 列，第 ${pos.column} 格`;$('[data-tv-work-caption]').textContent=task===1?`待補：${position}`:`目前選取：${position}`;$('[data-tv-target-caption]').textContent='金框標示同一位置的目標顏色';$('[data-tv-board-progress]').textContent=task===1?(pixels[REPAIR_HOLE]===null?'剩下 1 格待補':'缺格已填入，可繼續修正'):`已填入 ${result.filled} / ${result.total} 格`;
  $('[data-tv-cell-goal]').style.backgroundColor=colourCss(board.target[selected]);$('[data-tv-goal-name]').textContent=`這一格的目標：${paletteName(board.target[selected])}`;
  for(const [name,value]of[['row',pos.row],['column',pos.column]]){const select=$(`[data-tv-${name}]`);if(select.options.length!==size){select.replaceChildren();for(let n=1;n<=size;n++){const option=document.createElement('option');option.value=String(n);option.textContent=`第 ${n} ${name==='row'?'列':'格'}`;select.append(option);}}select.value=String(value);}
  $('[data-tv-next-empty]').disabled=nextEmpty(pixels,selected)<0;
 }
 function render(){
  root.dataset.task=String(task+1);root.querySelectorAll('[data-tv-task]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.tvTask)===task)));$('[data-tv-instruction]').textContent=`任務 ${task+1}｜${description[task]}`;
  const matching=task===0;$('[data-tv-work-solid]').hidden=!matching;$('[data-tv-target-solid]').hidden=!matching;$('[data-tv-work-grid]').hidden=matching;$('[data-tv-target-grid]').hidden=matching;
  $('[data-tv-work-heading]').textContent=['我調出的顏色','待修復畫面','我的空白畫布'][task];$('[data-tv-target-heading]').textContent=matching?'目標顏色':'完整目標';$('[data-tv-tuner-heading]').textContent='在這裡調整色光';
  $('[data-tv-purpose]').textContent=['你看到的兩個色塊，是單一像素的放大畫面；調整的是這個像素內的 RGB 子像素亮度。','畫面中的每個像素各有自己的顏色；這次只修復缺少的一格。','許多像素一起組成畫面。對照目標，替每格調色並填入，完成一個 8×8 的簡化螢幕。'][task];
  $('[data-tv-anatomy-heading]').textContent=matching?'目前的 RGB':'準備填入的 RGB';
  $('[data-tv-tuner-how]').textContent=matching?'每種色光只有三種選擇。':'點選亮度或選用我的色盤，再按「填入」。';
  $('[data-tv-step-first]').textContent=['看右邊的目標色','看右圖缺格對應的顏色','在左圖點選要填的一格'][task];$('[data-tv-step-last]').textContent=['按「檢查顏色」','按「填入缺格」','按「填入這一格」'][task];
  $('[data-tv-interaction-hint]').textContent=matching?'先判斷需要哪些色光，再比較強弱；檢查後可看調整方向。':task===1?'問號格已選好；可用我的色盤，再按「填入缺格」。':'選格 → 調色或選用色盤 → 填入。同色可重複使用；也可用列／格選單、方向鍵選格，Enter 填色。';
  $('[data-tv-next-colour]').hidden=!matching||!!helper;$('[data-tv-help]').hidden=matching;$('[data-tv-return]').hidden=!helper;$('[data-tv-apply]').hidden=matching;$('[data-tv-check]').hidden=task===1;$('[data-tv-reset]').hidden=matching;$('[data-tv-check]').textContent=matching?'檢查顏色':'檢查整幅圖';$('[data-tv-apply]').textContent=task===1?'填入缺格':'填入這一格';$('[data-tv-reset]').textContent=task===1?'重設缺格':'清空畫布';
  $('[data-tv-board-progress]').hidden=matching;$('[data-tv-cell-comparison]').hidden=matching;$('[data-tv-position-controls]').hidden=task!==2;
  $('[data-tv-helper-note]').hidden=!helper;if(helper){const p=coordinate(helper.index,boards[helper.origin].size);$('[data-tv-helper-note]').textContent=`正在為任務 ${helper.origin+1} 的第 ${p.row} 列、第 ${p.column} 格試調色。帶回後，再按填入。`;$('[data-tv-return]').textContent=`帶回任務 ${helper.origin+1} →`;}
  if(matching){const value=goal();$('[data-tv-target-solid]').style.backgroundColor=colourCss(value.levels);$('[data-tv-target-solid]').setAttribute('aria-label',`目標顏色：${value.name}`);$('[data-tv-work-caption]').textContent=paletteName(levels);$('[data-tv-target-caption]').textContent=`請對照這個${value.name}調色`;}renderTuner();renderBoard();renderFeedback();
 }
 function focusInstruction(){const heading=$('[data-tv-instruction]');heading.focus({preventScroll:true});heading.scrollIntoView({block:'start',behavior:'auto'});}
 function selectCell(index,focus=false){const board=boards[task];if(!board||index<0||index>=board.pixels.length||task===1&&index!==REPAIR_HOLE)return;board.selected=index;if(board.pixels[index])setLevels(board.pixels[index]);render();if(focus)$('[data-tv-work-grid]').focus({preventScroll:true});}
 function apply(){if(!task)return;const board=boards[task];board.pixels=fillPixel(board.pixels,board.selected,levels);board.reviewed=false;const result=evaluatePixels(board.pixels,board.target),matched=sameColour(levels,board.target[board.selected]);
  if(matched)rememberColour(levels);
  const hint=colourHint(levels,board.target[board.selected]);
  feedback[task]={kind:matched?'correct':'retry',title:matched?'這一格調對了！':hint.title,message:result.complete?(task===1?'缺格顏色與目標一致，畫面修復完成！已加入我的色盤。':'64 格都與目標一致！你已用 RGB 重建整幅圖。'):matched?'已加入我的色盤；下一個同色像素可直接選用。':`這一格已填入，仍可修正。${hint.message}`};render();}

 root.querySelectorAll('[data-tv-channel]').forEach(group=>{const i=Number(group.dataset.tvChannel);group.querySelectorAll('[data-tv-level]').forEach(button=>{const n=Number(button.dataset.tvLevel);button.addEventListener('click',()=>{const next=[...levels];next[i]=n;setLevels(next);renderTuner();renderFeedback();});});});
 root.querySelectorAll('[data-tv-task]').forEach(button=>button.addEventListener('click',()=>{if(helper)feedback[0]=null;helper=null;task=Number(button.dataset.tvTask);render();focusInstruction();}));
 $('[data-tv-next-colour]').addEventListener('click',()=>{colourIndex=(colourIndex+1)%COLOUR_TARGETS.length;feedback[0]=null;render();});
 $('[data-tv-help]').addEventListener('click',()=>{const board=boards[task];helper={origin:task,index:board.selected,target:[...board.target[board.selected]]};task=0;feedback[0]=null;render();focusInstruction();});
 $('[data-tv-return]').addEventListener('click',()=>{if(!helper)return;task=helper.origin;boards[task].selected=helper.index;helper=null;feedback[0]=null;render();focusInstruction();});
 $('[data-tv-apply]').addEventListener('click',apply);
 $('[data-tv-check]').addEventListener('click',()=>{if(!task){const matched=sameColour(levels,goal().levels),hint=colourHint(levels,goal().levels);if(matched)rememberColour(levels);say(matched?'correct':'retry',hint.message,hint.title);return;}const board=boards[task],result=evaluatePixels(board.pixels,board.target);board.reviewed=true;feedback[task]={kind:result.complete?'correct':'retry',message:result.complete?'64 格都與目標一致，整幅圖重建完成！':`已填入 ${result.filled} / ${result.total} 格，還有 ${result.missing.length} 格未填、${result.wrong.length} 格需要調整。虛線框標出要再檢查的位置。`};render();});
 $('[data-tv-reset]').addEventListener('click',()=>{const board=boards[task];if(!board)return;board.pixels=task===1?initialRepair():blankPicture();board.selected=task===1?REPAIR_HOLE:9;board.reviewed=false;feedback[task]={kind:'info',message:'本任務畫面已重設；其他任務進度與目前調色保留。'};render();});
 $('[data-tv-work-grid]').addEventListener('click',e=>{const cell=e.target.closest('[data-tv-cell]');if(cell)selectCell(Number(cell.dataset.tvCell),true);});
 $('[data-tv-work-grid]').addEventListener('keydown',e=>{const board=boards[task];if(!board)return;if(['Enter',' '].includes(e.key)){e.preventDefault();apply();return;}if(task!==2)return;const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-board.size,ArrowDown:board.size}[e.key];if(delta===undefined&&!['Home','End'].includes(e.key))return;e.preventDefault();selectCell(e.key==='Home'?0:e.key==='End'?board.pixels.length-1:Math.max(0,Math.min(board.pixels.length-1,board.selected+delta)),true);});
 for(const name of['row','column'])$(`[data-tv-${name}]`).addEventListener('change',()=>{const board=boards[task];if(board)selectCell((Number($('[data-tv-row]').value)-1)*board.size+Number($('[data-tv-column]').value)-1);});
 $('[data-tv-next-empty]').addEventListener('click',()=>{const board=boards[task],index=nextEmpty(board.pixels,board.selected);if(index>=0)selectCell(index);});
 root.querySelectorAll('[data-tv-pending]').forEach(el=>el.disabled=false);$('[data-tv-load-note]').hidden=true;render();root.dataset.ready='true';
}
