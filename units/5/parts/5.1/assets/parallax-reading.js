import { SAMPLE_C, SCALE_DEPTH, degreeY, projectPoint } from './parallax-model.js';

const $ = id => document.getElementById(id);
const ns = 'http://www.w3.org/2000/svg';
const node = (tag, attrs, text) => {
  const el = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  if (text !== undefined) el.textContent = text;
  return el;
};
const eye = $('parallax-eye'), side = $('parallax-side'), stage = $('parallax-projection');
let position = 0, drag = null;
const clamp = value => Math.max(-100, Math.min(100, value));
const currentView = () => position === 0 ? '平視' : position > 0 ? '俯視' : '仰視';
const description = () => position === 0 ? '平視，與液面同高' : `${currentView()}，視線較${position > 0 ? '高' : '低'}`;

// An eight-sided glass stem, a capillary at z=0, and etched marks at z=.94.
// Project every vertex from the observer's position; do not translate a flat
// front-view picture. The liquid's world-space meniscus never changes.
function renderPerspective() {
  const project = point => projectPoint(point, position);
  const path = (points, close = true) => points.map((p, i) => `${i ? 'L' : 'M'}${project(p).map(n => n.toFixed(3)).join(' ')}`).join('') + (close ? 'Z' : '');
  const polygon = (points, attrs) => node('path', { d: path(points), ...attrs });
  const rect = (left, right, bottom, top, z, attrs) => polygon([[left,bottom,z],[right,bottom,z],[right,top,z],[left,top,z]], attrs);
  const perimeter = [[-1.5,-.35],[-1.25,-.75],[1.25,-.75],[1.5,-.35],[1.5,.55],[1.24,.94],[-1.24,.94],[-1.5,.55]];
  const ring = y => perimeter.map(([x,z]) => [x,y,z]);
  const shapes = [];
  // End faces expose the change from looking down to looking up. Stem extends
  // outside the magnified window so it reads as a crop of the same instrument.
  shapes.push(polygon(ring(position >= 0 ? 8 : -8), { fill:'#bdceca', 'fill-opacity':'.5', stroke:'#8da29f', 'stroke-width':'.8' }));
  shapes.push(rect(-1.5,1.5,-8,8,-.35,{fill:'url(#px-body)',stroke:'#9aacaa','stroke-width':'1'}));
  // Polished bevels, at different depths from the front face.
  shapes.push(polygon([[-1.5,-8,.55],[-1.24,-8,.94],[-1.24,8,.94],[-1.5,8,.55]],{fill:'#f9ffff',opacity:'.85',stroke:'#a6b6b2','stroke-width':'.8'}));
  shapes.push(polygon([[1.24,-8,.94],[1.5,-8,.55],[1.5,8,.55],[1.24,8,.94]],{fill:'#8fa5a3',opacity:'.5',stroke:'#91a7a2','stroke-width':'.8'}));
  shapes.push(rect(-1.24,1.24,-8,8,.94,{fill:'#f9fcf4','fill-opacity':'.22'}));
  shapes.push(rect(-.58,-.18,-8,8,0,{fill:'url(#px-bore)',stroke:'#9aafab','stroke-width':'.8'}));
  // Concave meniscus, not a screen-space rect whose value changes with the eye.
  const meniscus = [[-.51,0,0],[-.47,-.025,0],[-.38,-.045,0],[-.29,-.025,0],[-.25,0,0]];
  const liquid = polygon([[-.51,-8,0],[-.25,-8,0],...meniscus.slice().reverse()],{fill:'url(#px-liquid)',id:'parallax-liquid','data-world-temperature':SAMPLE_C});
  shapes.push(liquid, node('path',{d:path(meniscus,false),fill:'none',stroke:'#a90b24','stroke-width':'1.2',id:'parallax-meniscus'}));
  shapes.push(rect(-.48,-.455,-8,-.08,0.01,{fill:'#ffd8d3',opacity:'.7'}));
  // Each line is exactly 1°C apart. Labels and marks occupy the glass face.
  const ticks = node('g',{id:'parallax-ticks',fill:'#263f39',stroke:'#304a42','stroke-width':'1.35'});
  for (let degree = 34; degree <= 41; degree++) {
    const y = degreeY(degree), long = degree % 5 === 0;
    ticks.append(node('path',{d:path([[0,y,SCALE_DEPTH],[long ? .48 : .33,y,SCALE_DEPTH]],false),'data-degree':degree}));
    const p=project([.55,y,SCALE_DEPTH]);
    // Text follows the perspective's local scale, just like print on glass.
    const up=project([.55,y+.3,SCALE_DEPTH]), right=project([.85,y,SCALE_DEPTH]);
    const sx=(right[0]-p[0])/12, sy=(p[1]-up[1])/12;
    ticks.append(node('text',{x:0,y:0,transform:`matrix(${sx} ${(right[1]-p[1])/12} ${(p[0]-up[0])/12} ${sy} ${p[0]} ${p[1]})`,'dominant-baseline':'middle','font-size':17,stroke:'none','font-family':'Georgia, serif'},String(degree)));
  }
  shapes.push(ticks);
  // Project the subtle glass highlights at their own depth as well.
  shapes.push(rect(-1.15,-1.07,-8,8,.95,{fill:'#fff',opacity:'.9'}));
  shapes.push(rect(.99,1.04,-8,8,.95,{fill:'#fff',opacity:'.65'}));
  const tip = project([-.38,-.045,0]);
  const scaleEdge = project([.5,0,SCALE_DEPTH]);
  shapes.push(node('path',{d:`M${tip[0]} ${tip[1]}H${scaleEdge[0]}`,stroke:'#53865b','stroke-width':'1.2','stroke-dasharray':'3 3',fill:'none',id:'parallax-read-line'}));
  const unit = project([.55,degreeY(41)+.45,SCALE_DEPTH]);
  shapes.push(node('text',{x:unit[0],y:unit[1],fill:'#425f54','font-size':14,'font-family':'Georgia, serif'},'°C'));
  stage.replaceChildren(...shapes);
  $('parallax-view').setAttribute('aria-label',`${description()}溫度計液面附近，最小刻度為 1°C。液柱保持不動，玻璃與刻線隨觀看角度改變。`);
  $('parallax-view').dataset.view = position === 0 ? 'level' : position > 0 ? 'high' : 'low';
}

function setPosition(value) {
  position = clamp(Math.round(value));
  // A small snap zone makes returning to level straightforward on touch screens.
  if (Math.abs(position) < 4) position = 0;
  const y = 180 - position * 1.1;
  eye.setAttribute('transform',`translate(314,${y})`);
  eye.setAttribute('aria-valuenow',position);
  eye.setAttribute('aria-valuetext',description());
  $('parallax-ray').setAttribute('d',`M138 180L292 ${y}`);
  $('parallax-view-badge').textContent = currentView();
  $('parallax-comparison').textContent = position === 0
    ? '平視：視線與液面同高，沿液面頂端對照刻度。'
    : position > 0 ? '俯視：你正由上往下看，液面看起來對應較高的刻度；液柱並沒有升高。'
    : '仰視：你正由下往上看，液面看起來對應較低的刻度；液柱並沒有降低。';
  document.querySelectorAll('[data-view]').forEach(button => {
    if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed',String(button.dataset.view === (position === 0 ? 'level' : position > 0 ? 'high' : 'low')));
  });
  renderPerspective();
}
for (let degree=25;degree<=45;degree++) {
  const y=180-(degree-SAMPLE_C)*9;
  $('parallax-side-ticks').append(node('path',{d:`M146 ${y}h${degree%5===0?7:4}`}));
}
document.querySelectorAll('button[data-view]').forEach(button=>button.addEventListener('click',()=>setPosition({high:100,level:0,low:-100}[button.dataset.view])));
function svgY(event) {
  const point=side.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
  return point.matrixTransform(side.getScreenCTM().inverse()).y;
}
function stopDrag(event) {
  if (!drag || event && event.pointerId !== undefined && drag.id !== event.pointerId) return;
  const id=drag.id;drag=null;
  eye.classList.remove('is-dragging');
  if (eye.hasPointerCapture(id)) eye.releasePointerCapture(id);
}
eye.addEventListener('pointerdown',event=>{
  if (event.button!==0) return;
  drag={id:event.pointerId,offset:svgY(event)-(180-position*1.1)};
  eye.setPointerCapture(event.pointerId);eye.focus({preventScroll:true});
  eye.classList.add('is-dragging');event.preventDefault();
});
eye.addEventListener('pointermove',event=>{
  if (drag && event.pointerId===drag.id) setPosition((180-(svgY(event)-drag.offset))/1.1);
});
for (const type of ['pointerup','pointercancel','lostpointercapture']) eye.addEventListener(type,stopDrag);
window.addEventListener('blur',()=>stopDrag());
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopDrag();});
eye.addEventListener('keydown',event=>{
  const actions={ArrowUp:()=>position+10,ArrowRight:()=>position+10,ArrowDown:()=>position-10,ArrowLeft:()=>position-10,PageUp:()=>position+25,PageDown:()=>position-25,Home:()=>0,End:()=>-100};
  if(actions[event.key]){event.preventDefault();setPosition(actions[event.key]());}
});
$('parallax-record-form').addEventListener('submit',event=>{
  event.preventDefault();
  const input=$('parallax-reading'), raw=input.value.trim(), value=Number(raw);
  if(raw===''||!Number.isFinite(value)||value<0||value>100){
    input.setAttribute('aria-invalid','true');$('parallax-record').textContent='請輸入 0 到 100°C 之間的估讀值。';input.focus();return;
  }
  input.removeAttribute('aria-invalid');
  $('parallax-record').textContent=`我的紀錄：${value}°C（${currentView()}）。${position===0?'已記下數值與單位，可開啟參考比較。':'再回到平視，看看自己的估讀會不會不同。'}`;
});
$('parallax-reading').addEventListener('input',()=>{$('parallax-reading').removeAttribute('aria-invalid');});
$('parallax-reference-button').addEventListener('click',()=>{
  const show=$('parallax-reference').hidden;
  $('parallax-reference').hidden=!show;
  $('parallax-reference-button').setAttribute('aria-expanded',String(show));
  $('parallax-reference-button').textContent=show?'隱藏參考讀值':'顯示參考讀值';
});
setPosition(0);
