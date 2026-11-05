import { materials, rayGeometry } from './optics.mjs';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const line = (a,b,cls='ray',extra='') => `<path class="${cls}" d="M${a} L${b}" ${extra}/>`;
const label = (x,y,s,extra='') => `<text x="${x}" y="${y}" ${extra}>${s}</text>`;
function defs(id){return `<defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#246e9c"/></marker></defs>`;}
function arrow(a,b,id){return line(a,b,'ray',`marker-end="url(#${id})"`);}
$$('[data-ray-lab]:not([data-return-lab])').forEach(root=>{
  const type=root.dataset.rayLab, reverse=type==='leave', svg=$('svg',root);
  let medium='water', angle=30, dragging=false;
  function reset(){render();}
  function render(){
    const g=rayGeometry(medium,angle,reverse), arrowId=`arrow-${type}`;
    const arc=(a,normalSign,side)=>{const r=47,rad=a*Math.PI/180;return `<path class="angle" d="M320 ${190+normalSign*r} A${r} ${r} 0 0 ${normalSign*side<0?1:0} ${320+side*r*Math.sin(rad)} ${190+normalSign*r*Math.cos(rad)}"/>`;};
    svg.innerHTML=defs(arrowId)+`<rect x="0" y="190" width="640" height="210" fill="#dceeea"/>`+line([20,190],[620,190],'normal')+label(35,45,'空氣')+label(35,360,materials[medium].name)+label(485,180,'介面')+line([320,15],[320,380],'normal')+label(335,30,'法線')+arrow(g.source,g.hit,arrowId)+arrow(g.hit,g.end,arrowId)+(arc(angle,reverse?1:-1,-1)+arc(g.outgoing,reverse?-1:1,1))+`<circle class="source" cx="${g.source[0]}" cy="${g.source[1]}" r="12" tabindex="0" role="slider" aria-label="拖曳光源調整入射角" aria-valuemin="0" aria-valuemax="${reverse?35:60}" aria-valuenow="${angle}" aria-valuetext="${angle}度"/>`;
    $('.angle-input',root).value=angle;$('.angle-output',root).textContent=`${angle}°`;$('.incident-readout',root).textContent=`${angle}°`;$('.refracted-readout',root).textContent=`${g.outgoing.toFixed(1)}°`;
    svg.setAttribute('aria-label',`空氣在上方，${materials[medium].name}在下方；${reverse?'由下往上':'由上往下'}，入射角${angle}度，折射角${g.outgoing.toFixed(1)}度`);
  }
  $$('[data-medium]',root).forEach(btn=>btn.onclick=()=>{medium=btn.dataset.medium;$$('[data-medium]',root).forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));reset();});
  const setAngle=value=>{angle=Math.max(0,Math.min(reverse?35:60,Math.round(value)));render();};
  $('.angle-input',root).oninput=e=>setAngle(Number(e.target.value));
  const move=e=>{const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());setAngle(Math.atan2(Math.max(0,320-p.x),Math.max(1,reverse?p.y-190:190-p.y))*180/Math.PI);};
  svg.onpointerdown=e=>{if(e.target.classList.contains('source')){e.preventDefault();dragging=true;svg.setPointerCapture(e.pointerId);}};
  svg.onpointermove=e=>{if(dragging)move(e);};svg.onpointerup=svg.onpointercancel=()=>{dragging=false;};
  svg.onkeydown=e=>{if(e.target.getAttribute('role')!=='slider')return;const step={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1}[e.key];if(step!==undefined||e.key==='Home'||e.key==='End'){e.preventDefault();setAngle(e.key==='Home'?0:e.key==='End'?(reverse?35:60):angle+step);$('.source',svg).focus();}};
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
const links=$$('.route-inner a');
const sections=links.map(a=>$(a.hash));
const teachingHeadings=sections.map(section=>$('.lesson-head h2',section));
function syncNavTitles(){
  teachingHeadings.forEach((heading,index)=>{
    if(heading)$('span',links[index]).textContent=heading.textContent.trim();
  });
}
syncNavTitles();
const titleObserver=new MutationObserver(syncNavTitles);
teachingHeadings.filter(Boolean).forEach(heading=>titleObserver.observe(heading,{childList:true,subtree:true,characterData:true}));
const route=$('.route'), routeInner=$('.route-inner');
let activeSection;
function updateNav(){
  const mobile=matchMedia('(max-width: 760px)').matches;
  const threshold=mobile?Math.max(route.getBoundingClientRect().height+28,parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)+24):160;
  const current=sections.filter(s=>s.getBoundingClientRect().top<=threshold).at(-1) || sections[0];
  links.forEach(a=>a.hash===`#${current.id}`?a.setAttribute('aria-current','step'):a.removeAttribute('aria-current'));
  $('#route-progress').textContent=current.id==='s7'?'目前位置：單元小測':`目前位置：第 ${String(sections.indexOf(current)+1).padStart(2,'0')}／06 個學習區塊`;
  const readingProgress=$('#lesson-progress');
  if(readingProgress)readingProgress.value=Math.min(6,sections.indexOf(current)+1);
  if(mobile && activeSection!==current){
    const link=links[sections.indexOf(current)], box=link.getBoundingClientRect(), viewport=routeInner.getBoundingClientRect();
    if(box.left<viewport.left || box.right>viewport.right)routeInner.scrollLeft+=box.left-viewport.left;
  }
  activeSection=current;
}
window.addEventListener('scroll',updateNav,{passive:true});
window.addEventListener('resize',updateNav);
window.addEventListener('hashchange',updateNav);
window.addEventListener('load',()=>{
  const target=location.hash && document.getElementById(location.hash.slice(1));
  if(target && (sections.includes(target) || target.id==='unit-quiz'))target.scrollIntoView({block:'start',behavior:'instant'});
  updateNav();
});
updateNav();
