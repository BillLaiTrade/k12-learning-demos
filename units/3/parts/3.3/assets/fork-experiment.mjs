import {forkFrame,FORK_LEVELS,STRIKE_DELAY} from './fork-model.mjs?v=1';
const NS='http://www.w3.org/2000/svg';
const PHOTO=new URL('./fork-apparatus.png',import.meta.url).href;
function node(tag,attrs,parent){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;}
export function createForkExperiment(root){
 const find=id=>root.querySelector('#'+id),photo=find('fork-photo'),strips=[];
 // 原始透明照片：1024×1536；木座、叉柄與U形根部固定，僅叉股分段彎曲。
 const image=node('svg',{x:60,y:45,width:390,height:345,viewBox:'0 0 1024 1536','aria-hidden':'true'},photo);
 const defs=node('defs',{},image);
 const cut=node('clipPath',{id:'fork-fixed-photo'},defs);
 node('path',{d:'M0 0H1024V1536H0Z M360 90H470V800H360Z M560 90H668V800H560Z','clip-rule':'evenodd'},cut);
 node('image',{href:PHOTO,width:1024,height:1536,'clip-path':'url(#fork-fixed-photo)'},image);
 for(const[side,x,width,direction]of [['left',360,110,-1],['right',560,108,1]]){
  for(let i=0;i<72;i++){
   const y=90+710*i/72,h=710/72,clip=node('clipPath',{id:`fork-${side}-${i}`},defs);
   node('rect',{x,y:y-.6,width,height:h+1.2},clip);
   const group=node('g',{'data-prong':side},image);
   node('image',{href:PHOTO,width:1024,height:1536,'clip-path':`url(#fork-${side}-${i})`},group);
   strips.push({group,factor:direction*((800-y-h/2)/710)**2});
  }
 }
 let current=null,last=null,observed=new Set();
 function setButtons(key){root.querySelectorAll('[data-fork-strike]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.forkStrike===key)));}
 function drawTip(displacement,extent){
  const center=80+140*displacement,end=80+140*extent;
  find('fork-prong-tip').setAttribute('transform',`translate(${center} 0)`);
  find('fork-amplitude-marker').setAttribute('visibility',extent>0?'visible':'hidden');
  find('fork-amplitude-arrow').setAttribute('d',`M80 88H${end}`);
  find('fork-extreme-guide').setAttribute('d',`M${end} 81V120`);
  find('fork-amplitude-label').setAttribute('x',(80+end)/2);
  find('fork-detail').dataset.displacement=String(displacement);
  find('fork-detail').dataset.extent=String(extent);
 }
 function bend(displacement){
  for(const{group,factor}of strips)group.setAttribute('transform',`translate(${45*displacement*factor} 0)`);
  find('fork-apparatus').dataset.displacement=String(displacement);
 }
 function mallet(progress){
  const p=Math.max(0,Math.min(1,progress));
  find('fork-mallet').setAttribute('transform',`translate(${404-91*p} ${330-175*p}) rotate(${24-55*p})`);
 }
 function record(key){
  observed.add(key);last=key;
  const card=root.querySelector(`[data-fork-record="${key}"]`);
  card.dataset.observed='true';card.querySelector('.fork-record-body').hidden=false;card.querySelector('.fork-record-pending').hidden=true;
  const complete=observed.size===2;
  root.querySelector('.fork-same-pitch').hidden=!complete;root.querySelector('.fork-conclusion').hidden=!complete;
 }
 function stop(){
  current=null;root.dataset.forkState='idle';setButtons(null);bend(0);mallet(0);
  const peak=last?FORK_LEVELS[last]:0;
  drawTip(peak,peak);find('fork-detail-caption').textContent=last?'此次最大振幅示意':'等待敲擊';
 }
 function reset(){
  observed.clear();last=null;stop();
  root.querySelectorAll('[data-fork-record]').forEach(card=>{card.dataset.observed='false';card.querySelector('.fork-record-body').hidden=true;card.querySelector('.fork-record-pending').hidden=false;});
  root.querySelector('.fork-same-pitch').hidden=true;root.querySelector('.fork-conclusion').hidden=true;
 }
 reset();
 return {
  start(key){current={key,amplitude:FORK_LEVELS[key],recorded:false};root.dataset.forkState='striking';setButtons(key);find('fork-detail-caption').textContent='準備敲擊';drawTip(0,0);},
  update(time){
   if(!current)return;
   if(time<0){const p=(time+STRIKE_DELAY)/STRIKE_DELAY;mallet((1-Math.cos(Math.PI*Math.max(0,p)))/2);return;}
   if(!current.recorded){record(current.key);current.recorded=true;root.dataset.forkState='vibrating';find('fork-detail-caption').textContent='振動放慢觀察';}
   root.dataset.forkTime=String(time);
   const frame=forkFrame(time,current.amplitude);bend(frame.displacement);drawTip(frame.displacement,frame.extent);mallet(1-time/.12);
  },
  stop,reset
 };
}
