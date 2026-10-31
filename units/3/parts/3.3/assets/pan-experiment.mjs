import {PAN_LENGTHS,panFrequency,panGeometry,panDisplacement} from './pan-model.mjs?v=2';
const image=(x,y,w,h,box)=>`<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${box}" preserveAspectRatio="none"><image href="assets/pan-bamboo.png" width="1024" height="1536"/></svg>`;
function pipe(index){
 const g=panGeometry(index),{x,top,height}=g,id=`pan-window-${index}`;
 const dots=Array.from({length:10},(_,row)=>Array.from({length:2},(_,col)=>{
  const y=g.bottom-(g.bottom-g.open-24)*row/10,fraction=(g.bottom-y)/(g.bottom-g.open);
  return `<circle class="pan-particle" cx="${x+27+col*18}" cy="${y}" r="3.2" data-origin-y="${y}" data-fraction="${fraction}"/>`;
 }).join('')).join('');
 return `<g class="pan-pipe" data-pan-index="${index}">
 <defs><mask id="${id}" maskUnits="userSpaceOnUse" x="${x-5}" y="${top-5}" width="84" height="${height+10}"><rect x="${x-5}" y="${top-5}" width="84" height="${height+10}" fill="white"/><rect class="pan-window-cut" x="${x+13}" y="${top+29}" width="46" height="${height-48}" rx="7"/></mask></defs>
 <rect class="pan-glass" x="${x+12}" y="${top+25}" width="48" height="${height-41}" rx="7" fill="url(#pan-glass)"/>
 <g class="pan-air">${dots}<path class="pan-direction" d="M${x+36} ${top+55}v22m-4-17 4-5 4 5m-8 12 4 5 4-5"/></g>
 <g class="pan-shell" mask="url(#${id})">${image(x,top,72,32,'375 5 280 120')}${image(x,top+32,72,height-55,'375 125 280 1260')}${image(x,top+height-23,72,23,'375 1385 280 140')}</g>
 <path d="M${x+6} ${top+20}V${top+height-17}Q${x+36} ${top+height+3} ${x+66} ${top+height-17}V${top+20}" class="pan-selected-outline"/>
 <g class="pan-breath"><path d="M${x+77} ${top-7}q17-7 30-5M${x+80} ${top+4}h30M${x+77} ${top+15}q17 7 30 5"/></g>
 </g>`;
}
export function createPanExperiment(root){
 let selected=5,sounding=false;
 root.querySelector('.pan-picture').innerHTML=`<svg class="pan-scene" viewBox="0 0 1000 520" role="img" aria-label="六根同材質與管徑的封底排笛，可點選20到40公分的管子吹奏；看管內顯示空氣在原位附近往返。"><defs><linearGradient id="pan-glass"><stop stop-color="#332d20"/><stop offset=".5" stop-color="#61543e"/><stop offset="1" stop-color="#342b1e"/></linearGradient></defs><ellipse cx="430" cy="465" rx="250" ry="15" fill="#624b30" opacity=".13"/>${PAN_LENGTHS.map((_,i)=>pipe(i)).join('')}<g class="pan-binding" fill="none"><path d="M216 208L658 252M216 219L658 263" stroke="#85562d" stroke-width="7"/><path d="M216 207L658 251M216 218L658 262" stroke="#d3ac70" stroke-width="4"/><path d="M216 207L658 251M216 218L658 262" stroke="#f0d5a1" stroke-width="1.5" stroke-dasharray="5 4"/></g><g class="pan-measure"><path class="pan-measure-line"/><rect class="pan-measure-label-bg" width="100" height="36" rx="9"/><text class="pan-measure-label" text-anchor="middle"/></g><g class="pan-selected-badge"><rect width="92" height="31" rx="10"/><text x="46" y="22" text-anchor="middle">已選取</text></g><g class="pan-inside-labels"><path class="pan-callout-line"/><text x="780" y="272">空氣在原位附近往返</text><text class="pan-bottom-label"/></g></svg>`;
 const buttons=[...root.querySelectorAll('.pan-pipe-button')];
 for(const [i,b]of buttons.entries()){
  const g=panGeometry(i);b.style.cssText=`left:${g.x/10}%;top:${g.top/5.2}%;width:7.2%;height:${g.height/5.2}%`;
  b.setAttribute('aria-label',`吹奏${g.length}公分排笛，${panFrequency(g.length).toFixed(1)}赫茲`);
 }
 function position(seconds,level){
  const hz=panFrequency(PAN_LENGTHS[selected]);
  for(const col of root.querySelectorAll('.pan-pipe')){
   const active=Number(col.dataset.panIndex)===selected&&sounding;
   for(const dot of col.querySelectorAll('.pan-particle')){
    const delta=active?panDisplacement(Number(dot.dataset.fraction),seconds,hz,level):0;
    dot.setAttribute('cy',String(Number(dot.dataset.originY)-delta));
   }
  }
 }
 function render(){
  const g=panGeometry(selected),hz=panFrequency(g.length);
  root.dataset.panSelected=String(selected);
  root.querySelector('#pan-length').textContent=`${g.length} cm`;
  root.querySelector('#pan-frequency').textContent=`${hz.toFixed(1)} Hz`;
  for(const [i,b]of buttons.entries())b.setAttribute('aria-pressed',String(i===selected));
  for(const p of root.querySelectorAll('.pan-pipe')){p.dataset.selected=String(Number(p.dataset.panIndex)===selected);p.dataset.sounding=String(Number(p.dataset.panIndex)===selected&&sounding);}
  const x=720,middle=(g.open+g.bottom)/2;
  root.querySelector('.pan-measure-line').setAttribute('d',`M${g.x+70} ${g.open}H${x}M${g.x+70} ${g.bottom}H${x}M${x} ${g.open}V${g.bottom}M${x-5} ${g.open+7}l5-7 5 7M${x-5} ${g.bottom-7}l5 7 5-7`);
  root.querySelector('.pan-measure-label-bg').setAttribute('x',String(x-50));root.querySelector('.pan-measure-label-bg').setAttribute('y',String(middle-19));
  const text=root.querySelector('.pan-measure-label');text.setAttribute('x',String(x));text.setAttribute('y',String(middle+7));text.textContent=`${g.length} cm`;
  root.querySelector('.pan-selected-badge').setAttribute('transform',`translate(${g.x-10} ${g.top-40})`);
  root.querySelector('.pan-callout-line').setAttribute('d',`M${g.x+40} ${g.open+70}L765 263`);
  const bottom=root.querySelector('.pan-bottom-label');bottom.setAttribute('x',String(g.x+10));bottom.setAttribute('y',String(g.bottom+49));bottom.textContent='管底封閉';
 }
 function setView(view){root.dataset.panView=view;for(const b of root.querySelectorAll('[data-pan-view]'))b.setAttribute('aria-pressed',String(b.dataset.panView===view));}
 for(const b of root.querySelectorAll('[data-pan-view]'))b.addEventListener('click',()=>setView(b.dataset.panView));
 setView('outside');render();position(0);
 return {
  settings(index){selected=index;render();return {frequency:panFrequency(PAN_LENGTHS[index]),amplitude:.55,tone:'pipe'};},
  start(){sounding=true;render();position(0);},
  update:position,
  stop(){sounding=false;render();position(0);},
  reset(){selected=5;setView('outside');sounding=false;render();position(0);}
 };
}
