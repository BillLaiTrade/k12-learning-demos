import {sideSpeaker,SIDE_AMPLITUDE} from './pitch-speaker-view.mjs?v=1';
export const PITCH_SECONDS=2;
const NS='http://www.w3.org/2000/svg';
function element(tag,attrs,parent){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;}
export function createPitchExperiment(root){
 const columns=[...root.querySelectorAll('.pitch-column')];let active=null,frequency=400;
 for(const col of columns)col.querySelector('.pitch-side-view').innerHTML=sideSpeaker(col.dataset.pitchSide);
 function setView(view){
  root.dataset.pitchView=view;
  for(const button of root.querySelectorAll('button[data-pitch-view]'))button.setAttribute('aria-pressed',String(button.dataset.pitchView===view));
  for(const col of columns){col.querySelector('.pitch-front-view').hidden=view!=='front';col.querySelector('.pitch-side-view').hidden=view!=='side';}
 }
 for(const button of root.querySelectorAll('button[data-pitch-view]'))button.addEventListener('click',()=>setView(button.dataset.pitchView));
 setView('front');
 function points(fraction,hz){return Array.from({length:Math.floor(480*fraction)+1},(_,i)=>`${i?'L':'M'}${(38+278*i/480).toFixed(3)} ${(84-48*Math.sin(2*Math.PI*hz*.01*i/480)).toFixed(3)}`).join(' ');}
 function graph(column,hz){
  const svg=column.querySelector('.pitch-wave');svg.replaceChildren();svg.dataset.frequency=hz;svg.dataset.amplitude='.5';svg.dataset.progress='0';
  svg.setAttribute('aria-label',`${hz}Hz，10毫秒內${hz/100}次完整振動，相對振幅固定0.50。`);
  for(let i=0;i<=5;i++){
   const x=38+278*i/5;element('path',{d:`M${x} 20V147`,class:'grid'},svg);
   const text=element('text',{x,y:169,'text-anchor':'middle'},svg);text.textContent=i*2;
  }
  element('path',{d:'M38 20V147H316M38 84H316',class:'axis'},svg);
  element('path',{d:points(1,hz),class:'pitch-guide',fill:'none'},svg);
  element('path',{d:'',class:'signal'},svg);
  element('path',{d:'M38 20V147',class:'pitch-cursor',visibility:'hidden'},svg);
  const end=38+278/(hz*.01);
  element('path',{d:`M38 138H${end}M38 138l4-3m-4 3 4 3M${end} 138l-4-3m4 3-4 3`,class:'pitch-period'},svg);
  let note=column.querySelector('.pitch-period-note');if(!note){note=document.createElement('p');note.className='pitch-period-note';svg.after(note);}note.textContent=`一次完整振動：${(1000/hz).toLocaleString('zh-TW',{maximumFractionDigits:2})}毫秒`;
  const time=element('text',{x:177,y:193,'text-anchor':'middle'},svg);time.textContent='時間（ms）';
 }
 function position(column,displacement){
  // 正面以軸向位移的透視投影呈現起伏；只移動紙盆，箱體及外框固定。
  const phase=displacement/14,scale=1+.1*phase;
  const front=column.querySelector('.pitch-front-cone');
  front.setAttribute('transform',`translate(${740+18*phase} 625) scale(${scale}) translate(-740 -625)`);
  front.dataset.displacement=String(displacement);

  const sideDisplacement=SIDE_AMPLITUDE*phase;
  column.querySelector('.pitch-cone').setAttribute('transform',`translate(${sideDisplacement} 0)`);
  column.querySelector('.pitch-diaphragm').dataset.displacement=String(displacement);
  column.querySelector('.pitch-diaphragm').dataset.excursion=String(sideDisplacement);
  column.querySelector('.pitch-surround-top').setAttribute('d',`M407 86C414 100 ${370+sideDisplacement*.5} 110 ${335+sideDisplacement} 105`);
  column.querySelector('.pitch-surround-bottom').setAttribute('d',`M407 283C414 269 ${370+sideDisplacement*.5} 259 ${335+sideDisplacement} 264`);
 }
 function stop(){
  active=null;root.querySelectorAll('[data-play^="pitch-"]').forEach(b=>b.setAttribute('aria-pressed','false'));
  for(const col of columns){col.dataset.sounding='false';position(col,0);}
 }
 return {
  render(hz){frequency=hz;stop();for(const col of columns)if(col.dataset.pitchSide==='right'||!col.querySelector('.signal'))graph(col,col.dataset.pitchSide==='left'?200:frequency);
   root.querySelector('#pitch-reading').textContent=`${hz} Hz`;
   root.querySelector('#pitch-count-right').textContent=`10毫秒內振動${hz/100}次`;
   root.querySelector('[data-pitch-step="-100"]').disabled=hz<=200;
   root.querySelector('[data-pitch-step="100"]').disabled=hz>=800;
   for(const btn of root.querySelectorAll('.pitch-apparatus [data-play="pitch-live"]'))btn.setAttribute('aria-label',`點喇叭播放右邊${hz}赫茲聲音`);
  },
  start(key){stop();active=columns[key==='pitch-reference'?0:1];active.dataset.sounding='true';active.querySelectorAll('[data-play]').forEach(b=>b.setAttribute('aria-pressed','true'));const svg=active.querySelector('.pitch-wave');svg.dataset.progress='0';svg.querySelector('.signal').setAttribute('d','');svg.querySelector('.pitch-cursor').setAttribute('visibility','visible');},
  update(seconds){if(!active)return;const svg=active.querySelector('.pitch-wave'),hz=Number(svg.dataset.frequency),progress=Math.min(1,Math.max(0,seconds/PITCH_SECONDS));
   svg.dataset.progress=String(progress);svg.querySelector('.signal').setAttribute('d',points(progress,hz));
   const x=38+278*progress;svg.querySelector('.pitch-cursor').setAttribute('d',`M${x} 20V147`);
   const displacement=14*Math.sin(2*Math.PI*hz*progress*.01);
   position(active,displacement);
  },
  finish(){this.update(PITCH_SECONDS);stop();},stop
 };
}
