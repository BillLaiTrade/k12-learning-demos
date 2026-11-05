import {createEyeModel} from './eye-model.mjs?v=20261105-correction3';
import {EYE,initialEye,changeEye,eyeState,accommodationFor} from './eye-optics.mjs?v=20261104-eye1';
const root=document.querySelector('[data-eye-lab]');
if(root){
 const $=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)],svg=$('[data-eye-scene]'),preview=$('[data-eye-preview]');
 const red='#d65b47',blue='#2588ba',Y=220,SY=160,CX=302,LX=CX+353*EYE.lens;
 let state=initialEye(),model=null;
 try{model=createEyeModel($('[data-eye-model]'));root.dataset.eyeRender='3d';}catch{root.dataset.eyeRender='fallback';}
 const n=v=>Number(v.toFixed(3)),point=(x,y)=>`${n(x)} ${n(y)}`,wall=y=>655-.0025*(y-Y)**2;
 const label=(x,y,name,role,tx,ty)=>`<g><path class="eye-leader" d="M${x} ${y+67}L${x} ${ty-20}L${tx} ${ty}"/><circle cx="${tx}" cy="${ty}" r="3.5" fill="#41684b"/><text class="eye-label" x="${x}" y="${y+7}" text-anchor="middle">${name}</text><text class="eye-role-label" x="${x}" y="${y+53}" text-anchor="middle">${role}</text></g>`;
 function draw(g){
  const sourceX=state.distance==='far'?64:155,h=16+20*state.accommodation/100,retina=[];
  for(let y=100;y<=340;y+=4)retina.push([wall(y),y]);
  const retinaPath=retina.map(([x,y],i)=>`${i?'L':'M'}${point(x,y)}`).join('')+retina.toReversed().map(([x,y])=>`L${point(x+6,y)}`).join('')+'Z';
  const back=offset=>retina.map(([x,y])=>`L${point(x+offset,y)}`).join('');
  let out=`<defs>
  <linearGradient id="eye7-shell" x2="1" y2="1"><stop stop-color="#b9cf9a"/><stop offset=".5" stop-color="#ecf2d5"/><stop offset="1" stop-color="#91b185"/></linearGradient>
  <radialGradient id="eye7-interior" cx=".4" cy=".4"><stop stop-color="#fffef3"/><stop offset="1" stop-color="#f7e8c9"/></radialGradient>
  <linearGradient id="eye7-glass"><stop stop-color="#b4e0df" stop-opacity=".75"/><stop offset=".35" stop-color="#f0ffff" stop-opacity=".9"/><stop offset=".7" stop-color="#b3deea" stop-opacity=".75"/><stop offset="1" stop-color="#82b5c5" stop-opacity=".6"/></linearGradient>
  <linearGradient id="eye7-retina"><stop stop-color="#f7dba9"/><stop offset="1" stop-color="#e6ad7e"/></linearGradient>
  ${[red,blue].map((c,i)=>`<marker id="eye7-arrow${i}" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0L7 3L0 6Z" fill="${c}"/></marker>`).join('')}</defs>
  <g data-eye-anatomy><ellipse cx="481" cy="383" rx="157" ry="9" fill="#67865c" opacity=".08"/>
  <path data-eye-shell d="M320 118C364 67 445 55 509 67C573 71 615 65 637 100${back(18)}C611 385 501 402 430 375C377 358 345 345 320 322Q264 220 320 118Z" fill="url(#eye7-shell)" stroke="#91aa7a" stroke-width="2"/>
  <path d="M325 125C367 78 443 65 507 77C571 81 609 74 631 100${back(12)}C605 375 503 392 433 365C382 348 350 337 325 314Q278 220 325 125Z" fill="url(#eye7-interior)" stroke="#f8fbeb" stroke-width="3"/>
  <path data-eye-retina d="${retinaPath}" fill="url(#eye7-retina)" stroke="#d6a777" stroke-width="1.1"/>
  <path d="M325 127C269 167 267 272 325 313C302 274 298 170 325 127Z" fill="url(#eye7-glass)" stroke="#91bfcb" stroke-width="1.8"/>
  <path d="M316 138C278 178 278 266 316 303" fill="none" stroke="#f5ffff" stroke-width="3" opacity=".8"/>
  <path data-eye-lens d="M${LX} 150Q${LX+2*h} 220 ${LX} 290Q${LX-2*h} 220 ${LX} 150Z" fill="url(#eye7-glass)" stroke="#81b6c6" stroke-width="1.8"/>
  <path d="M${LX-2} 159Q${LX-1.6*h} 220 ${LX-2} 281" fill="none" stroke="#f3ffff" stroke-width="2.2" opacity=".9"/>
  </g><path d="M25 ${Y}H704" stroke="#82967c" stroke-width="1.2" stroke-dasharray="7 6" opacity=".7"/>
  <rect data-eye-card x="${sourceX-23}" y="120" width="46" height="200" rx="8" fill="#fffdf0" stroke="#a4b38d" stroke-width="1.5"/>
  <path d="M${sourceX} 147V300" stroke="#6d9467" stroke-width="3.5"/><path d="M${sourceX} 140L${sourceX-11} 161H${sourceX+11}Z" fill="${red}"/><circle cx="${sourceX}" cy="300" r="8" fill="${blue}"/>
  <text class="eye-caption" x="${sourceX}" y="352" text-anchor="middle">${state.distance==='far'?'遠方':'近處'}圖卡</text>`;
  if(state.rays){
   for(const r of g.rays.filter(r=>state.point==='both'||r.name===state.point)){
    const c=r.name==='top'?red:blue,points=[[sourceX,Y+r.objectY*SY],[CX,Y+r.corneaY*SY],[LX,Y+r.lensY*SY],[wall(Y+r.retinaY*SY),Y+r.retinaY*SY]];
    out+=`<path class="eye-ray" data-eye-ray="${r.name}" d="${points.map(([x,y],i)=>`${i?'L':'M'}${point(x,y)}`).join('')}" stroke="${c}"/>`;
    for(const [a,b]of [[points[0],points[1]],[points[2],points[3]]]){const x=a[0]+(b[0]-a[0])*.62,y=a[1]+(b[1]-a[1])*.62;out+=`<path d="M${point(x-(b[0]-a[0])*.025,y-(b[1]-a[1])*.025)}L${point(x,y)}" stroke="${c}" stroke-width="2.2" marker-end="url(#eye7-arrow${r.name==='top'?0:1})"/>`;}
    out+=`<circle data-eye-hit="${r.name}" cx="${wall(points[3][1])}" cy="${points[3][1]}" r="${g.clear?2.8:3.8}" fill="${c}" opacity="${g.clear?1:.65}"/>`;
   }
   for(const name of ['top','bottom'].filter(name=>state.point==='both'||name===state.point)){const a=g.rays.filter(r=>r.name===name),y=Y+(a[0].retinaY+a[1].retinaY)/2*SY;out+=`<ellipse cx="${wall(y)}" cy="${y}" rx="3" ry="${Math.max(3,g.spread*SY/2+2)}" fill="${name==='top'?red:blue}" opacity=".22"/>`;}
  }
  out+=label(236,62,'角膜','主要會聚',287,177)+label(405,45,'水晶體','調節會聚',LX,174)+label(611,62,'視網膜','接收影像',wall(165)+3,165);
  const hitYs=g.rays.map(r=>Y+r.retinaY*SY),top=Math.min(...hitYs)-8,bottom=Math.max(...hitYs)+8;
  out+=`<g data-eye-image-region><path class="eye-region-bracket" d="M667 ${n(top)}H674Q680 ${n(top)} 680 ${n(top+6)}V${n(bottom-6)}Q680 ${n(bottom)} 674 ${n(bottom)}H667M680 220H691"/><rect x="691" y="204" width="65" height="32" rx="7" class="eye-region-box"/><text x="723.5" y="226" text-anchor="middle" class="eye-region-label">成像區</text></g>`;
  svg.innerHTML=out;
  const message=g.clear?'光在視網膜上各自成像，圖案清楚。':`尚未對焦：會聚位置在視網膜${g.position==='behind'?'後':'前'}，視網膜上的圖案模糊。`;
  svg.setAttribute('aria-label',`${state.distance==='far'?'看遠方':'看近處'}，${message}眼球與視網膜固定，水晶體厚度可調。`);
  preview.innerHTML=`<defs><filter id="eye7-preview-blur"><feGaussianBlur stdDeviation="${n(g.blur)}"/></filter></defs><g data-eye-image filter="url(#eye7-preview-blur)"><path d="M100 52V145" stroke="#769367" stroke-width="4"/><circle data-eye-image-blue cx="100" cy="50" r="10" fill="${blue}"/><path data-eye-image-red d="M100 157L88 135H112Z" fill="${red}"/></g>`;
  preview.setAttribute('aria-label',`視網膜上的倒立${g.clear?'清楚':'模糊'}圖案，僅比較清晰程度的放大示意`);
  $('[data-result]').textContent=message;
 }
 function render(){
  const g=eyeState(state);draw(g);model?.update(state);
  $$('[data-eye-distance]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.eyeDistance===state.distance)));
  $$('[data-eye-point]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.eyePoint===state.point));b.disabled=!state.rays;});
  const toggle=$('[data-eye-rays]');toggle.setAttribute('aria-pressed',String(state.rays));toggle.textContent=state.rays?'隱藏輔助光路':'顯示輔助光路';
  const target=Math.round(accommodationFor(state.distance)),mark=$('[data-eye-clear]');mark.style.left=`calc(${target}% + ${10-target*.2}px)`;mark.dataset.target=target;mark.setAttribute('aria-label',`${state.distance==='far'?'看遠方':'看近處'}的清楚像：點選快速對焦`);
  const input=$('[data-eye-accommodation]');input.value=state.accommodation;input.style.setProperty('--eye-progress',state.accommodation+'%');input.setAttribute('aria-valuetext',`${state.accommodation<40?'水晶體較扁':state.accommodation>65?'水晶體較厚':'水晶體調節中'}，${g.clear?'已對焦':'尚未對焦'}`);
  const status=$('[data-eye-status]');status.textContent=`${state.distance==='far'?'看遠方':'看近處'}・${g.clear?'已對焦':'尚未對焦'}`;status.dataset.clear=g.clear;
  $('[data-eye-copy]').textContent=g.clear?'光在視網膜上成像，圖案清楚。':`會聚位置在視網膜${g.position==='behind'?'後':'前'}，試著${g.position==='behind'?'增加':'減少'}水晶體的會聚作用。`;
  $('[data-eye-adjust]').textContent=state.accommodation<40?'水晶體較扁，會聚作用較弱。':state.accommodation>65?'水晶體較厚，會聚作用較強。':'水晶體厚薄與會聚作用正在改變。';
  Object.assign(root.dataset,{ready:'true',distance:state.distance,accommodation:state.accommodation,clear:g.clear,focus:g.focus,position:g.position,rays:state.rays,point:state.point,retina:EYE.retina,lensPosition:EYE.lens});
 }
 root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-eye-reset'))state=initialEye();else if(b.hasAttribute('data-eye-clear'))state=changeEye(state,'accommodation',Math.round(accommodationFor(state.distance)));else if(b.hasAttribute('data-eye-distance'))state=changeEye(state,'distance',b.dataset.eyeDistance);else if(b.hasAttribute('data-eye-point'))state=changeEye(state,'point',b.dataset.eyePoint);else if(b.hasAttribute('data-eye-rays'))state=changeEye(state,'rays',!state.rays);else return;render();});
 $('[data-eye-accommodation]').addEventListener('input',e=>{state=changeEye(state,'accommodation',Number(e.target.value));render();});
 render();
}
