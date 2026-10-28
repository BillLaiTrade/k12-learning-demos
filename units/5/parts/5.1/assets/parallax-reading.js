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
  const perimeter = [[-2.5,-.35],[-2.25,-.75],[2.25,-.75],[2.5,-.35],[2.5,.55],[2.18,.94],[-2.18,.94],[-2.5,.55]];
  const ring = y => perimeter.map(([x,z]) => [x,y,z]);
  const shapes = [];
  shapes.push(polygon(ring(position >= 0 ? 12 : -12), {fill:'#c4d5d1',stroke:'#9ab1ae','stroke-width':'.6'}));
  shapes.push(rect(-2.5,2.5,-12,12,-.35,{fill:'url(#px-body)',stroke:'#98afb0','stroke-width':'.75'}));
  shapes.push(polygon([[-2.5,-12,.55],[-2.18,-12,.94],[-2.18,12,.94],[-2.5,12,.55]],{fill:'url(#px-bevel)',stroke:'#9eb6b5','stroke-width':'.6'}));
  shapes.push(polygon([[2.18,-12,.94],[2.5,-12,.55],[2.5,12,.55],[2.18,12,.94]],{fill:'url(#px-bevel)',stroke:'#8ca7ad','stroke-width':'.6'}));
  shapes.push(rect(-2.18,2.18,-12,12,.94,{fill:'#eff8f2','fill-opacity':'.1'}));
  shapes.push(rect(.1,.82,-12,12,0,{fill:'url(#px-bore)',stroke:'#7c9b9e','stroke-width':'.8'}));
  shapes.push(rect(.19,.25,-12,12,.01,{fill:'#fff',opacity:'.9'}));
  // The center low point is at exactly 37.5°C; the curved edges rise slightly.
  const meniscus = [[.25,.045,0],[.3,.018,0],[.46,0,0],[.62,.018,0],[.67,.045,0]];
  shapes.push(polygon([[.25,-12,0],[.67,-12,0],...meniscus.slice().reverse()],{fill:'url(#px-liquid)',id:'parallax-liquid','data-world-temperature':SAMPLE_C}));
  shapes.push(node('path',{d:path(meniscus,false),fill:'none',stroke:'#ae0e2c','stroke-width':'1.2',id:'parallax-meniscus'}));
  shapes.push(rect(.29,.31,-12,-.1,.01,{fill:'#ffd7cf',opacity:'.8'}));
  const ticks = node('g',{id:'parallax-ticks',fill:'#253f41',stroke:'#2e4649','stroke-width':'1.35','stroke-linecap':'square'});
  for (let degree = 34; degree <= 41; degree++) {
    const y = degreeY(degree), long = degree % 5 === 0;
    ticks.append(node('path',{d:path([[-(long ? 1.12 : .89),y,SCALE_DEPTH],[-.19,y,SCALE_DEPTH]],false),'data-degree':degree}));
    const p=project([-1.3,y,SCALE_DEPTH]);
    const up=project([-1.3,y+.3,SCALE_DEPTH]), right=project([-1,y,SCALE_DEPTH]);
    const sx=(right[0]-p[0])/12, sy=(p[1]-up[1])/12;
    ticks.append(node('text',{x:0,y:0,transform:`matrix(${sx} ${(right[1]-p[1])/12} ${(p[0]-up[0])/12} ${sy} ${p[0]} ${p[1]})`,'text-anchor':'end','dominant-baseline':'middle','font-size':18,stroke:'none','font-family':'Arial, sans-serif','font-weight':400},String(degree)));
  }
  shapes.push(ticks);
  shapes.push(rect(-2.29,-2.24,-12,12,.95,{fill:'#fff',opacity:'.95'}));
  shapes.push(rect(-2.05,-2.02,-12,12,.95,{fill:'#fff',opacity:'.5'}));
  shapes.push(rect(2.04,2.12,-12,12,.95,{fill:'#fff',opacity:'.9'}));
  shapes.push(rect(1.87,1.9,-12,12,.95,{fill:'#fff',opacity:'.55'}));
  const tip = project([.46,0,0]);
  const scaleEdge = project([-.7,0,SCALE_DEPTH]);
  shapes.push(node('path',{d:`M${scaleEdge[0]} ${tip[1]}H${tip[0]}`,stroke:'#067b64','stroke-width':'1.3','stroke-dasharray':'3 3',fill:'none',id:'parallax-read-line'}));
  // The callout is a screen overlay, distinct from the marks engraved on glass.
  shapes.push(node('path',{d:`M${tip[0]+4} ${tip[1]}H337`,stroke:'#56857b','stroke-width':'.9',fill:'none',id:'parallax-tip-leader'}));
  shapes.push(node('circle',{cx:tip[0]+2,cy:tip[1],r:3,fill:'#fff',stroke:'#087e64','stroke-width':'1.2'}));
  const unit = project([-1.33,degreeY(41)+.45,SCALE_DEPTH]);
  shapes.push(node('text',{x:unit[0],y:unit[1],fill:'#365558','font-size':14,'font-family':'Arial, sans-serif','text-anchor':'end'},'°C'));
  stage.replaceChildren(...shapes);
  $('parallax-view').setAttribute('aria-label',`${description()}溫度計液面附近，最小刻度為 1°C。液柱保持不動，玻璃與刻線隨觀看角度改變。`);
  $('parallax-view').dataset.view = position === 0 ? 'level' : position > 0 ? 'high' : 'low';
}

function setPosition(value) {
  position = clamp(Math.round(value));
  // A small snap zone makes returning to level straightforward on touch screens.
  if (Math.abs(position) < 4) position = 0;
  const y = 357.5 - position * 2.25;
  eye.setAttribute('transform',`translate(915,${y})`);
  eye.setAttribute('aria-valuenow',position);
  eye.setAttribute('aria-valuetext',description());
  $('parallax-ray').setAttribute('d',`M580 357.5L850 ${y}`);
  $('parallax-view-badge').textContent = currentView();
  $('parallax-view-caption').textContent = position === 0 ? '視線與液面同高' : position > 0 ? '由上往下看・刻度看起來偏高' : '由下往上看・刻度看起來偏低';
  $('parallax-comparison').textContent = position === 0
    ? '平視：視線與液面同高，沿液面頂端對照刻度。'
    : position > 0 ? '俯視：你正由上往下看，液面看起來對應較高的刻度；液柱並沒有升高。'
    : '仰視：你正由下往上看，液面看起來對應較低的刻度；液柱並沒有降低。';
  document.querySelectorAll('[data-view]').forEach(button => {
    if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed',String(button.dataset.view === (position === 0 ? 'level' : position > 0 ? 'high' : 'low')));
  });
  renderPerspective();
}
for (let degree=0;degree<=60;degree++) {
  const y=545-degree*5, major=degree%10===0, middle=degree%5===0;
  $('parallax-side-ticks').append(node('path',{d:`M${major?567:middle?570:573} ${y}H576`,'stroke-width':major?1.2:.8,'data-degree':degree}));
  if(major) $('parallax-side-ticks').append(node('text',{x:565,y,'text-anchor':'end','dominant-baseline':'middle','font-size':12.5,'font-family':'Arial, sans-serif',stroke:'none'},degree));
}
$('parallax-side-ticks').append(node('text',{x:574,y:231,'text-anchor':'end','font-size':13,'font-family':'Arial, sans-serif',stroke:'none'},'°C'));
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
  drag={id:event.pointerId,offset:svgY(event)-(357.5-position*2.25)};
  eye.setPointerCapture(event.pointerId);eye.focus({preventScroll:true});
  eye.classList.add('is-dragging');event.preventDefault();
});
eye.addEventListener('pointermove',event=>{
  if (drag && event.pointerId===drag.id) setPosition((357.5-(svgY(event)-drag.offset))/2.25);
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
