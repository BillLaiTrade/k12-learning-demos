import {forkFrame,FORK_LEVELS,FORK_SECONDS,STRIKE_DELAY} from './fork-model.mjs?v=1';
const NS='http://www.w3.org/2000/svg';
function node(tag,attrs,parent){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;}
export function createForkExperiment(root){
 const find=id=>root.querySelector('#'+id),photo=find('fork-photo'),prongs=[];
 // 連續向量叉股；固定U形根部與木座，只讓自由端平滑彎曲。
 const defs=node('defs',{},photo);
 for(const[id,stops]of [['fork-steel',[[0,'#47545a'],[.12,'#a4b2b8'],[.28,'#f8fcfc'],[.43,'#b6c4c9'],[.68,'#72848c'],[.84,'#e2edf0'],[1,'#52646d']]],['fork-wood',[[0,'#c18b4d'],[.4,'#ad7137'],[1,'#77471f']]]]){
  const g=node('linearGradient',{id},defs);for(const[offset,color]of stops)node('stop',{offset,'stop-color':color},g);
 }
 node('ellipse',{cx:243,cy:367,rx:99,ry:14,fill:'#453323',opacity:'.18'},photo);
 node('path',{d:'M151 320L290 320L326 338L185 340Z',fill:'#d5a569',stroke:'#a97740'},photo);
 node('path',{d:'M151 320L185 340V374L151 352Z',fill:'#855125',stroke:'#75471f'},photo);
 node('path',{d:'M185 340L326 338V371L185 374Z',fill:'url(#fork-wood)',stroke:'#7c4b24'},photo);
 for(let i=0;i<6;i++)node('path',{d:`M190 ${345+i*4}Q230 ${340+i*4} 270 ${345+i*4}T321 ${342+i*4}`,fill:'none',stroke:i%2?'#e3b67b':'#76441f','stroke-width':'.8',opacity:'.35'},photo);
 node('ellipse',{cx:238,cy:330,rx:16,ry:5,fill:'#5b452f',opacity:'.3'},photo);
 node('rect',{x:233,y:264,width:11,height:65,rx:3,fill:'url(#fork-steel)',stroke:'#697b83','stroke-width':1},photo);
 node('ellipse',{cx:238.5,cy:328,rx:12,ry:3,fill:'url(#fork-steel)',stroke:'#667983'},photo);
 node('path',{d:'M210 225V236C210 278 267 278 267 236V225',fill:'none',stroke:'#455861','stroke-width':20,'stroke-linecap':'round'},photo);
 node('path',{d:'M210 225V236C210 278 267 278 267 236V225',fill:'none',stroke:'url(#fork-steel)','stroke-width':17,'stroke-linecap':'round'},photo);
 for(const[side,x,direction]of [['left',210,-1],['right',267,1]]){
  const gradient=node('linearGradient',{id:`fork-steel-${side}`,gradientUnits:'userSpaceOnUse',x1:x-10,x2:x+10,y1:0,y2:0},defs);
  for(const stop of defs.querySelector('#fork-steel').children)gradient.append(stop.cloneNode(true));
  const group=node('g',{'data-prong':side},photo),paths=[];
  for(const[width,color]of [[20,'#4e616b'],[17,`url(#fork-steel-${side})`],[1.5,'#f7ffff']])paths.push(node('path',{fill:'none',stroke:color,'stroke-width':width,'stroke-linecap':'round'},group));
  node('ellipse',{cx:x,cy:80,rx:8.4,ry:2.5,fill:'#e6f0f1',stroke:'#7e939b','stroke-width':'.7','data-tip-cap':'true'},group);
  prongs.push({group,paths,x,direction});
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
  for(const{group,paths,x,direction}of prongs){
   const shift=23*displacement*direction;
   paths.forEach((path,i)=>path.setAttribute('d',`M${x+(i===2?-5:0)} 229C${x+(i===2?-5:0)} 182 ${x+shift*.5+(i===2?-5:0)} 115 ${x+shift+(i===2?-5:0)} 80`));
   group.querySelector('[data-tip-cap]').setAttribute('cx',x+shift);
   group.dataset.displacement=String(shift);
  }
  find('fork-apparatus').dataset.displacement=String(displacement);
 }
 function trace(key,progress){
  const graph=find(key==='soft'?'amplitude-reference':'amplitude-live'),p=Math.max(0,Math.min(1,progress));
  const count=Math.floor(500*p),amplitude=FORK_LEVELS[key];
  const points=Array.from({length:count+1},(_,i)=>`${i?'L':'M'}${50+i} ${(85-58*amplitude*Math.sin(i/500*8*Math.PI)).toFixed(3)}`).join(' ');
  graph.querySelector('.signal')?.setAttribute('d',p>0?points:'');
  graph.dataset.progress=String(p);
 }
 function mallet(progress){
  const p=Math.max(0,Math.min(1,progress));
  find('fork-mallet').setAttribute('transform',`translate(${404-101*p} ${330-175*p}) rotate(${24-55*p})`);
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
  trace('soft',0);trace('strong',0);
  root.querySelectorAll('[data-fork-record]').forEach(card=>{card.dataset.observed='false';card.querySelector('.fork-record-body').hidden=true;card.querySelector('.fork-record-pending').hidden=false;});
  root.querySelector('.fork-same-pitch').hidden=true;root.querySelector('.fork-conclusion').hidden=true;
 }
 reset();
 return {
  start(key){trace(key,0);current={key,amplitude:FORK_LEVELS[key],recorded:false};root.dataset.forkState='striking';setButtons(key);find('fork-detail-caption').textContent='準備敲擊';drawTip(0,0);},
  update(time){
   if(!current)return;
   if(time<0){const p=(time+STRIKE_DELAY)/STRIKE_DELAY;mallet((1-Math.cos(Math.PI*Math.max(0,p)))/2);return;}
   if(!current.recorded){record(current.key);current.recorded=true;root.dataset.forkState='vibrating';find('fork-detail-caption').textContent='振動放慢觀察';}
   trace(current.key,time/FORK_SECONDS);
   root.dataset.forkTime=String(time);
   const frame=forkFrame(time,current.amplitude);bend(frame.displacement);drawTip(frame.displacement,frame.extent);mallet(1-time/.12);
  },
  finish(){if(current)trace(current.key,1);stop();},stop,reset
 };
}
