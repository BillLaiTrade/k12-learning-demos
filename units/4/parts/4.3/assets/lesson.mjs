import { materials, rayGeometry, apparentDepth } from './optics.mjs';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const line = (a,b,cls='ray',extra='') => `<path class="${cls}" d="M${a} L${b}" ${extra}/>`;
const label = (x,y,s,extra='') => `<text x="${x}" y="${y}" ${extra}>${s}</text>`;
function defs(id){return `<defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#246e9c"/></marker></defs>`;}
function arrow(a,b,id){return line(a,b,'ray',`marker-end="url(#${id})"`);}
function animate(duration, update, done){
  let id, start;
  const frame = t => { start ??= t; const elapsed=Math.min(t-start,duration); update(elapsed); if(elapsed<duration)id=requestAnimationFrame(frame);else done?.(); };
  id=requestAnimationFrame(frame); return ()=>cancelAnimationFrame(id);
}
let cancelRace=()=>{};
const names=['air','water','glass'];
function drawRace(elapsed=0){
  $('#race-scene').innerHTML=names.map((key,i)=>{
    const y=65+i*85, progress=Math.min(1,elapsed/(2000*materials[key].n));
    return label(20,y+7,materials[key].name)+line([130,y],[620,y],'ghost')+`<circle cx="${130+490*progress}" cy="${y}" r="9" fill="#c96b32"/>`+label(640,y+7,progress===1?'到達':'');
  }).join('');
}
function resetRace(){cancelRace();drawRace();$('#race-start').textContent='同時出發';$('#race-status').textContent='三道光已就位，按「同時出發」開始比較。';}
$('#race-start').onclick=()=>{cancelRace();$('#race-start').textContent='重新出發';$('#race-status').textContent='三道光同時出發，觀察各自到達的先後。';cancelRace=animate(3000,drawRace,()=>{$('#race-status').textContent='空氣先到，接著是水，最後是這個模型中的玻璃。';});};
$('#race-reset').onclick=resetRace;drawRace();
const normalResets=[];
$$('[data-ray-lab]').forEach(root=>{
  const type=root.dataset.rayLab, normal=type==='normal', reverse=type==='leave', svg=$('svg',root);
  let medium='water', angle=normal?0:30, cancel=()=>{}, dragging=false;
  function reset(){cancel(); if(normal)$('.normal-status',root).textContent='光源已就位，尚未開始前進。';render();}
  function render(){
    const g=rayGeometry(medium,angle,reverse), arrowId=`arrow-${type}`;
    const arc=(a,normalSign,side)=>{const r=47,rad=a*Math.PI/180;return `<path class="angle" d="M320 ${190+normalSign*r} A${r} ${r} 0 0 ${normalSign*side<0?1:0} ${320+side*r*Math.sin(rad)} ${190+normalSign*r*Math.cos(rad)}"/>`;};
    svg.innerHTML=defs(arrowId)+`<rect x="0" y="190" width="640" height="210" fill="#dceeea"/>`+line([20,190],[620,190],'normal')+label(35,45,'空氣')+label(35,360,materials[medium].name)+label(485,180,'介面')+line([320,15],[320,380],'normal')+label(335,30,'法線')+arrow(g.source,g.hit,arrowId)+arrow(g.hit,g.end,arrowId)+(normal?'':arc(angle,reverse?1:-1,-1)+arc(g.outgoing,reverse?-1:1,1))+`<circle class="source" cx="${g.source[0]}" cy="${g.source[1]}" r="12" ${normal?'':`tabindex="0" role="slider" aria-label="拖曳光源調整入射角" aria-valuemin="0" aria-valuemax="${reverse?35:60}" aria-valuenow="${angle}" aria-valuetext="${angle}度"`}/>`+(normal?`<circle class="pulse" cx="320" cy="30" r="8" fill="#c96b32"/>`:'');
    if(!normal){$('.angle-input',root).value=angle;$('.angle-output',root).textContent=`${angle}°`;$('.incident-readout',root).textContent=`${angle}°`;$('.refracted-readout',root).textContent=`${g.outgoing.toFixed(1)}°`;}
    svg.setAttribute('aria-label',`空氣在上方，${materials[medium].name}在下方；${reverse?'由下往上':'由上往下'}，入射角${angle}度，折射角${g.outgoing.toFixed(1)}度`);
  }
  $$('[data-medium]',root).forEach(btn=>btn.onclick=()=>{medium=btn.dataset.medium;$$('[data-medium]',root).forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));reset();});
  if(normal){
    normalResets.push(reset);$('.normal-reset',root).onclick=reset;
    $('.normal-play',root).onclick=()=>{reset();$('.normal-status',root).textContent='光由空氣進入下方介質，觀察跨越介面前後的速度。';cancel=animate(1000+1125*materials[medium].n,t=>{const y=t<=1000?30+160*t/1000:190+180*(t-1000)/(1125*materials[medium].n);$('.pulse',svg).setAttribute('cy',y);},()=>{$('.normal-status',root).textContent=`光進入${materials[medium].name}後前進較慢，仍沿法線前進。`;});};
  }else{
    const setAngle=value=>{angle=Math.max(0,Math.min(reverse?35:60,Math.round(value)));render();};
    $('.angle-input',root).oninput=e=>setAngle(Number(e.target.value));
    const move=e=>{const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());setAngle(Math.atan2(Math.max(0,320-p.x),Math.max(1,reverse?p.y-190:190-p.y))*180/Math.PI);};
    svg.onpointerdown=e=>{if(e.target.classList.contains('source')){e.preventDefault();dragging=true;svg.setPointerCapture(e.pointerId);}};
    svg.onpointermove=e=>{if(dragging)move(e);};svg.onpointerup=svg.onpointercancel=()=>{dragging=false;};
    svg.onkeydown=e=>{if(e.target.getAttribute('role')!=='slider')return;const step={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1}[e.key];if(step!==undefined||e.key==='Home'||e.key==='End'){e.preventDefault();setAngle(e.key==='Home'?0:e.key==='End'?(reverse?35:60):angle+step);$('.source',svg).focus();}};
  }
  render();
});
let reversed=false;
function drawPaths(){
  for(const kind of ['reflect','refract']){
    const id=`path-${kind}`, hit=[210,165], a=[130,26], b=kind==='reflect'?[290,26]:[210+160*.375,165+160*Math.sqrt(1-.375**2)];
    const points=reversed?[b,hit,a]:[a,hit,b];
    $(`#${kind}-scene`).innerHTML=defs(id)+(kind==='refract'?'<rect x="0" y="165" width="420" height="165" fill="#dceeea"/>':'')+line([20,165],[400,165],'normal')+line([210,5],[210,325],'normal')+line(a,hit,'ghost')+line(hit,b,'ghost')+arrow(points[0],hit,id)+arrow(hit,points[2],id)+label(22,150,kind==='reflect'?'鏡面':'空氣')+(kind==='refract'?label(22,200,'水'):'')+label(a[0]-65,a[1]+5,`A ${reversed?'終點':'起點'}`)+label(b[0]+8,b[1]+5,`B ${reversed?'起點':'終點'}`);
  }
  $('#reverse-label').textContent=`目前：由 ${reversed?'B 前往 A':'A 前往 B'}`;
  $('#reverse-path').textContent=reversed?'恢復由 A 前往 B':'反向沿原路走';$('#reverse-path').setAttribute('aria-pressed',String(reversed));
}
$('#reverse-path').onclick=()=>{reversed=!reversed;drawPaths();};drawPaths();
function drawDepth(){
  const depth=Number($('#depth-input').value), g=apparentDepth(depth), show=$('#show-rays').checked;
  $('#depth-output').textContent=`${depth} 公分`;
  $('#depth-scene').innerHTML=defs('depth-arrow')+`<rect x="50" y="${g.surface}" width="590" height="${370-g.surface}" fill="#dceeea"/>`+line([50,g.surface],[640,g.surface],'normal')+label(540,g.surface-14,'水面')+label(555,350,'水中')+label(555,45,'空氣')+line([50,370],[640,370],'normal')+(show?g.rays.map(r=>arrow(g.coin,r.hit,'depth-arrow')+arrow(r.hit,r.eye,'depth-arrow')+line(r.hit,g.apparent,'extension')).join(''):'')+`<circle cx="${g.coin[0]}" cy="${g.coin[1]}" r="11" fill="#966023"/><circle cx="${g.apparent[0]}" cy="${g.apparent[1]}" r="11" fill="#fff9ee" stroke="#c96b32" stroke-width="3"/>`+label(190,405,'硬幣實際位置')+label(g.apparent[0]+18,g.apparent[1]+5,'看起來的位置')+`<ellipse cx="370" cy="60" rx="22" ry="13" fill="white" stroke="#203f36" stroke-width="2"/><circle cx="370" cy="60" r="7" fill="#203f36"/>`+label(405,67,'小葵的眼睛')+line([100,g.surface],[100,g.coin[1]],'normal')+line([90,g.surface],[110,g.surface],'normal')+line([90,g.coin[1]],[110,g.coin[1]],'normal')+label(115,(g.surface+g.coin[1])/2,`${depth} cm`);
  $('#depth-scene').setAttribute('aria-label',`實際水深${depth}公分，硬幣實際位置固定，看起來的位置在硬幣上方。${show?'顯示由硬幣進入眼睛的光與反向延長線。':'光路已隱藏。'}`);
}
$('#depth-input').oninput=drawDepth;$('#show-rays').onchange=drawDepth;drawDepth();
const quiz=$('#quiz'), result=$('#quiz-result');
const answers=['toward','speed','apparent'];
const explanations=['光由空氣進入水中會偏向法線，折射角較小。','沿法線入射時，速度改變，方向不偏折。','光由水中進入空氣時折射，眼睛沿入眼光線反向延伸，判斷出較淺的位置。'];
quiz.onsubmit=e=>{e.preventDefault();const data=new FormData(quiz);const missing=answers.map((_,i)=>i+1).filter(i=>!data.has(`q${i}`));if(missing.length){result.textContent=`還有第 ${missing.join('、')} 題未作答，完成後再送出。`;return;}const wrong=answers.map((answer,i)=>data.get(`q${i+1}`)===answer?null:i).filter(i=>i!==null);result.innerHTML=wrong.length?`<strong>再觀察一下，有 ${wrong.length} 題可以修正。</strong>`+wrong.map(i=>`<p>第 ${i+1} 題：${explanations[i]} <a href="#s${[3,2,6][i]}">回到相關探索</a></p>`).join(''):'<strong>三題都答對了！</strong><p>你已能比較折射方向，並用光路解釋水底物體看起來較淺的原因。</p>';};
quiz.onchange=()=>{result.textContent='';};quiz.onreset=()=>{result.textContent='';};
const links=$$('nav a');
function updateNav(){
  const sections=$$('main section');
  const current=sections.filter(s=>s.getBoundingClientRect().top<=160).at(-1) || sections[0];
  links.forEach(a=>a.hash===`#${current.id}`?a.setAttribute('aria-current','location'):a.removeAttribute('aria-current'));
}
window.addEventListener('scroll',updateNav,{passive:true});updateNav();
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetRace();normalResets.forEach(reset=>reset());}});
