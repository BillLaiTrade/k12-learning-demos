import {specimenGraphic as symbol} from './microscope-specimen.mjs?v=20261106-micro-same-colors21';
import {microscopeGeometry} from './microscope-optics.mjs';
const root=document.querySelector('#microscope-lab');
if(root){
 const $=s=>root.querySelector(s),all=s=>[...root.querySelectorAll(s)],g=microscopeGeometry();
 const red='#ec8b6d',blue='#6dbde3',axis=432,k=1.1,Y=s=>550-s*k;
 let step='both',rays=true,model=null,view='whole';
 const hardware=`<defs>
 <linearGradient id="m9-body"><stop stop-color="#a9b49d"/><stop offset=".25" stop-color="#fbf4dc"/><stop offset=".6" stop-color="#dcd4bc"/><stop offset="1" stop-color="#8d9d88"/></linearGradient>
 <linearGradient id="m9-dark"><stop stop-color="#172e26"/><stop offset=".45" stop-color="#5d7564"/><stop offset="1" stop-color="#1c382c"/></linearGradient>
 <linearGradient id="m9-glass"><stop stop-color="#6bafa6" stop-opacity=".8"/><stop offset=".5" stop-color="#e5ffff" stop-opacity=".65"/><stop offset="1" stop-color="#549c96" stop-opacity=".8"/></linearGradient>
 <linearGradient id="m9-tube"><stop stop-color="#d2d0b7"/><stop offset=".18" stop-color="#fff7e1"/><stop offset=".24" stop-color="#d3d5bd" stop-opacity=".2"/><stop offset=".78" stop-color="#182f26" stop-opacity=".3"/><stop offset=".82" stop-color="#d9d7be"/><stop offset="1" stop-color="#85967f"/></linearGradient>
 <radialGradient id="m9-wall"><stop stop-color="#617762"/><stop offset="1" stop-color="#354e40"/></radialGradient>
 <radialGradient id="m9-lamp"><stop stop-color="#fffef2"/><stop offset=".5" stop-color="#f5d686"/><stop offset="1" stop-color="#b48d42"/></radialGradient>
 ${[['red',red],['blue',blue]].map(([id,c])=>`<marker id="m9-${id}" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="${c}"/></marker>`).join('')}
 </defs>
 <rect width="760" height="780" fill="url(#m9-wall)"/>
 <ellipse cx="472" cy="744" rx="205" ry="18" fill="#1b3026" opacity=".45"/>
 <path d="M479 320C627 283 661 356 648 467L621 680H541L569 455Q582 379 480 387Z" fill="url(#m9-body)" stroke="#9ca98e" stroke-width="2"/>
 <path d="M571 356Q631 343 623 451L598 659" fill="none" stroke="#fff7db" stroke-opacity=".5" stroke-width="7"/>
 <path d="M319 699L578 677L649 713L620 742H295L280 724Z" fill="url(#m9-dark)" stroke="#253f30" stroke-width="2"/>
 <path d="M319 689L573 670L649 705L619 724H295L279 710Z" fill="url(#m9-body)" stroke="#9da88e"/>
 <ellipse cx="432" cy="687" rx="54" ry="18" fill="#253f32"/><ellipse cx="432" cy="680" rx="43" ry="12" fill="url(#m9-lamp)"/>
 <path d="M416 673L421 649H443L448 673" fill="#ffe0a0" opacity=".1"/>
 <path d="M321 624L545 614L579 636L555 653H312L298 637Z" fill="url(#m9-dark)" stroke="#24392b" stroke-width="2"/>
 <path d="M322 622L545 613L573 633L550 640H308Z" fill="#344d3d" stroke="#a4b397"/>
 <ellipse cx="432" cy="659" rx="33" ry="10" fill="url(#m9-dark)"/><ellipse cx="432" cy="653" rx="28" ry="7" fill="url(#m9-glass)"/>
 <path d="M390 631L472 629L489 638H380Z" fill="#b7ddd0" fill-opacity=".6" stroke="#d9f4e6"/>
 <path d="M369 623v13h27m101-15v13h-28" fill="none" stroke="#b4bba4" stroke-width="5"/>
 <g transform="rotate(90 432 638)">${symbol(432,638,5)}</g>
 <circle cx="436" cy="638" r="3" fill="${red}"/><circle cx="428" cy="638" r="3" fill="${blue}"/>
 <circle cx="596" cy="417" r="48" fill="#273f31" stroke="#c3c8b1" stroke-width="3"/><circle cx="596" cy="417" r="37" fill="url(#m9-dark)" stroke="#899b80"/>
 ${Array.from({length:24},(_,i)=>`<path transform="translate(596 417) rotate(${i*15})" d="M0 -39v-6" stroke="#82947a" stroke-width="2"/>`).join('')}
 <path d="M394 238V498H470V238L459 215H405Z" fill="url(#m9-tube)" stroke="#c3c7ab" stroke-width="2"/>
 <path d="M405 249V488M458 249V488" stroke="#f0efd9" stroke-opacity=".6"/>
 <path d="M392 185Q432 174 472 185V227Q432 237 392 227Z" fill="url(#m9-dark)" stroke="#a4ad94"/>
 <ellipse cx="432" cy="185" rx="40" ry="9" fill="#243b2e" stroke="#89977f"/>
 <ellipse cx="432" cy="220" rx="31" ry="7" fill="url(#m9-glass)" stroke="#bfe3d8"/>
 <path d="M392 494L474 494L494 511L470 525H390L371 510Z" fill="url(#m9-body)" stroke="#b2bba0"/>
 <g transform="rotate(30 396 512)"><rect x="380" y="510" width="28" height="61" rx="4" fill="url(#m9-body)" stroke="#c2c7ac"/><path d="M381 551h26" stroke="#a68948" stroke-width="4"/><ellipse cx="394" cy="571" rx="12" ry="4" fill="url(#m9-dark)"/></g>
 <g transform="rotate(-30 467 512)"><rect x="454" y="510" width="28" height="58" rx="4" fill="url(#m9-body)" stroke="#c2c7ac"/><path d="M455 549h26" stroke="#a68948" stroke-width="4"/><ellipse cx="468" cy="568" rx="12" ry="4" fill="url(#m9-dark)"/></g>
 <path d="M413 516H451V565L442 578H422L413 565Z" fill="url(#m9-tube)" stroke="#c6ceb2"/>
 <ellipse cx="432" cy="550" rx="16" ry="5" fill="url(#m9-glass)" stroke="#b1dbce"/><path d="M414 562h36" stroke="#b4a65e" stroke-width="3"/>
 <path d="M432 155V670" stroke="#e0e6d4" stroke-width="1" stroke-dasharray="6 7" opacity=".5"/>
 <path d="M409 144Q432 123 455 144Q432 165 409 144Z" fill="#fff9e5" stroke="#263f2f" stroke-width="2"/><circle cx="432" cy="144" r="7" fill="#355a40"/>
 `;
 function render(){
  root.dataset.step=step;root.dataset.rays=String(rays);root.dataset.view=view;
  const bounds=view==='objective'?{top:210,height:500}:view==='eyepiece'?{top:70,height:340}:{top:0,height:780};
  const fallback=(x,y)=>view==='whole'?[x,y]:[380+(x-432)*780/bounds.height,(y-bounds.top)*780/bounds.height];
  const project=(x,y)=>model?model.project(x,y):fallback(x,y);
  const at=(s,h=0)=>project(axis+h,Y(s));
  let out=model?hardware.slice(0,hardware.indexOf('</defs>')+8):`<g transform="translate(${380-432*780/bounds.height} ${-bounds.top*780/bounds.height}) scale(${780/bounds.height})">${hardware}</g>`;
  if(!model&&view==='whole')out=hardware;
  const ocular=at(g.separation),image=at(g.intermediate),objective=at(0);
  if(model&&view!=='objective'){const eye=at(g.eye+4);out+=`<path d="M${eye[0]-20} ${eye[1]}q20 -18 40 0q-20 18 -40 0Z" fill="#fff8e6" stroke="#76917a" stroke-width="2"/><circle cx="${eye[0]}" cy="${eye[1]}" r="6" fill="#355a40"/>`;}
  const box=$('.micro-stage').getBoundingClientRect();
  const position=p=>{
   if(model)return[p[0]/760*100,p[1]/780*100];
   const scale=Math.min(box.width/760,box.height/780);
   return[(p[0]*scale+(box.width-760*scale)/2)/box.width*100,(p[1]*scale+(box.height-780*scale)/2)/box.height*100];
  };
  let labels='';
  const targets=view==='objective'?[['中間像',image,true,null],['物鏡',objective,true,'objective'],['草履蟲',at(-g.objective.u),true,null]]:view==='eyepiece'?[['眼睛',at(g.eye+4),true,null],['目鏡',ocular,true,'eyepiece'],['中間像',image,true,null]]:[['目鏡',ocular,step!=='objective','eyepiece'],['中間像',image,true,null],['物鏡',objective,step!=='eyepiece','objective']];
  for(const [name,p,active,lens]of targets){
   const [x,y]=position(p),rightLabel=view!=='whole'||box.width<420,labelOffset=view==='whole'&&box.height<=320&&name==='目鏡'?(box.height<250?-10:-6):0,attrs=`class="micro-label${rightLabel?' micro-label-right':''}" style="left:calc(${x}% ${rightLabel?'+':'-'} 24px);top:calc(${y}% + ${labelOffset}px);opacity:${active?1:.55}"`;
   labels+=`<span class="micro-connector" style="left:calc(${x}% ${rightLabel?'+ 6':'- 24'}px);top:${y}%"></span>`;
   labels+=lens?`<button type="button" ${attrs} data-micro-lens="${lens}" title="點選近看${name}" aria-label="近看${name}${lens==='objective'?'成像':'觀察'}">${name}</button>`:`<span ${attrs}>${name}</span>`;
   if(lens)labels+=`<button type="button" class="micro-pick" data-micro-lens="${lens}" style="left:${x}%;top:${y}%" aria-label="近看${name}剖面"></button>`;
  }
  const left=project(axis-30,Y(g.intermediate)),right=project(axis+30,Y(g.intermediate));
  out+=`<path data-micro-image-plane d="M${left[0]} ${left[1]}L${right[0]} ${right[1]}" stroke="#f1dba2" stroke-width="2.3" stroke-dasharray="4 5"/>`;
  if(step!=='objective'&&view!=='objective'){
   const focusOnLeft=view==='eyepiece'&&box.width>=300,f=at(g.ocularFocus),x=ocular[0]+(focusOnLeft?-82:box.width<420?240:72);
   out+=`<path d="M${x} ${ocular[1]}V${f[1]}m-6 0h12M${x-6} ${ocular[1]}h12" stroke="#e3c888" fill="none" stroke-width="1.5"/>`;
   const [fx,fy]=position([x+(focusOnLeft?-22:13),f[1]]);
   labels+=`<span class="micro-focus-label" style="left:${fx}%;top:${fy}%">F</span>`;
  }
  const focused=document.activeElement?.dataset.microLens,focusWasLabel=document.activeElement?.classList.contains('micro-label');
  const callout=$('[data-micro-a-callout]');
  const calloutBox=callout.getBoundingClientRect(),startX=calloutBox.right-box.left,startY=calloutBox.top+calloutBox.height/2-box.top;
  const toSvg=(x,y)=>{if(model)return[x/box.width*760,y/box.height*780];const scale=Math.min(box.width/760,box.height/780);return[(x-(box.width-760*scale)/2)/scale,(y-(box.height-780*scale)/2)/scale];};
  const from=toSvg(startX,startY);
  out+=`<path data-micro-a-leader d="M${from[0]} ${from[1]}L${image[0]-20} ${image[1]}" stroke="#e7cb77" stroke-width="1.5" fill="none"/>`;
  $('.micro-labels').innerHTML=labels;
  if(focused)$(`${focusWasLabel?'.micro-label':'.micro-pick'}[data-micro-lens="${focused}"]`)?.focus({preventScroll:true});
  $('[data-micro-scope]').textContent=view==='whole'?'目前觀察：完整成像':view==='objective'?'目前近看：物鏡成像':'目前近看：目鏡觀察';
  $('[data-micro-process]').setAttribute('aria-label','完整成像關係，'+(view==='whole'?'目前觀察完整成像。':view==='objective'?'目前近看原物、物鏡與中間像。':'目前近看中間像、目鏡與眼睛。'));
  $('[data-micro-overview]').hidden=view==='whole';
  if(rays)for(const r of g.rays){
   const color=r.point==='top'?red:blue,marker=r.point==='top'?'red':'blue';
   const coords=pts=>pts.map((p,i)=>`${i?'L':'M'}${at(p[0],p[1]).map(n=>n.toFixed(2)).join(' ')}`).join('');
   const middle=[g.intermediate,g.first.m*r.objectHeight],ocular=[g.separation,r.ocularHeight];
   const pts=step==='objective'?[[-g.objective.u,r.objectHeight],[0,r.lensHeight],middle]:step==='eyepiece'?[middle,ocular,[g.eye,r.eyeHeight]]:[[-g.objective.u,r.objectHeight],[0,r.lensHeight],middle,ocular,[g.eye,r.eyeHeight]];
   out+=`<path data-micro-ray data-point="${r.point}" class="micro-ray" d="${coords(pts)}" stroke="${color}" marker-mid="url(#m9-${marker})" marker-end="url(#m9-${marker})"/>`;
   if(step!=='objective')out+=`<path class="micro-ray extension" d="${coords([ocular,[g.virtual,g.total*r.objectHeight]])}" stroke="${color}"/>`;
  }
  $('#microscope-scene').setAttribute('preserveAspectRatio',model?'none':'xMidYMid meet');
  $('#microscope-scene').innerHTML=out;
  const first=step==='objective',ocularStep=step==='eyepiece';
  $('[data-micro-a-role]').textContent=first?'物鏡形成的實像':ocularStep?'目鏡觀察的物體':'連接兩段的同一個像';
  $('[data-micro-view-title]').textContent=first?'物鏡形成的中間像':ocularStep?'目鏡觀察中間像':'透過目鏡看到的影像';
  $('.micro-compare-note').textContent='草履蟲玻片・方向比較';
  $('[data-micro-before-label]').textContent=ocularStep?'同一個中間像':'玻片上的草履蟲';
  $('[data-micro-after-label]').textContent=first?'中間實像':'最後看見的虛像';
  $('[data-micro-before]').innerHTML=symbol(100,115,ocularStep?64:38,ocularStep,ocularStep?'real':'original');
  $('[data-micro-before]').setAttribute('aria-label',ocularStep?'同一草履蟲的中間像：較圓端朝下，口溝在左':'玻片上的草履蟲：較圓端朝上，口溝在右');
  $('[data-micro-preview]').innerHTML=symbol(100,115,first?64:90,true,first?'real':'virtual');
  $('[data-micro-preview]').setAttribute('aria-label',first?'草履蟲的中間實像：較圓端朝下、口溝在左，倒立、放大':'透過目鏡看到的草履蟲虛像：較圓端仍朝下、口溝仍在左，進一步放大');
  $('[data-micro-before-direction]').textContent=ocularStep?'圓端朝下／口溝在左':'圓端朝上／口溝在右';
  $('[data-micro-after-direction]').textContent='圓端朝下／口溝在左';
  $('[data-micro-badge]').dataset.imageKind=first?'real':'virtual';
  $('[data-micro-badge]').textContent=first?'倒立・放大的實像':ocularStep?'不再倒轉・放大的虛像':'相對原物倒立・放大虛像';
  $('[data-micro-copy]').textContent=first?'中間像形成在鏡筒內，這裡沒有放置屏幕。':ocularStep?'目鏡放大同一個中間像，方向不再倒轉。':'同一個中間像，連接兩段成像。';
  $('#micro-result').textContent={objective:'近看物鏡成像：原物經物鏡，在鏡筒內形成中間實像。',eyepiece:'近看目鏡觀察：同一個中間像位於目鏡焦距內，成為目鏡觀察的物體。',both:'完整成像：物鏡形成的中間實像，就是目鏡接著觀察的物體，兩段接力放大。'}[step];
  all('[data-micro-frame]').forEach(e=>e.dataset.active=String(view===e.dataset.microFrame));
  all('[data-micro-node]').forEach(e=>e.dataset.active=String(view!=='whole'&&(e.dataset.microRange==='shared'||view===e.dataset.microRange)));
  all('[data-micro-card]').forEach(b=>{const selected=view===b.dataset.microCard;b.setAttribute('aria-pressed',String(selected));b.closest('section').dataset.active=String(selected);});
  all('[data-set=micro]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===step)));
  $('[data-micro-rays]').setAttribute('aria-pressed',String(rays));$('[data-micro-rays]').textContent=rays?'隱藏輔助光路':'顯示輔助光路';
  $('.micro-key').hidden=!rays;
  if(model)model.update(step,view);
  root.dataset.ready='true';
 }
 function showWhole(){step='both';view='whole';render();}
 function selectLens(lens){step=lens;view=lens;render();}
 root.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.microCard){selectLens(b.dataset.microCard);$(`[data-set=micro][data-value="${b.dataset.microCard}"]`).focus({preventScroll:true});$('.micro-workspace').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return;}
  if(b.dataset.microFlow){if(b.dataset.microFlow==='whole')showWhole();else selectLens(b.dataset.microFlow);return;}
  if(b.dataset.microLens){selectLens(b.dataset.microLens);return;}
  if(b.dataset.set==='micro'){step=b.dataset.value;view=step==='both'?'whole':step;}
  else if(b.hasAttribute('data-micro-overview')){showWhole();$('#micro-process-title').focus({preventScroll:true});return;}
  else if(b.hasAttribute('data-micro-rays'))rays=!rays;
  else if(b.hasAttribute('data-micro-reset')){step='both';view='whole';rays=true;}
  else return;render();
 });
 // Click-away returns to the whole process without resetting ray preferences.
 document.addEventListener('click',e=>{
  if(view==='whole'||!(e.target instanceof Element)||e.target.closest('button,a,input,select,textarea,summary,[contenteditable]'))return;
  const inWorkspace=$('.micro-workspace').contains(e.target),inContext=e.target.closest('.micro-context');
  if(!inWorkspace||inContext||e.target.matches('.micro-workspace,.micro-concepts,.micro-tools,.micro-stage,.micro-labels,canvas[data-micro-model],#microscope-scene'))showWhole();
 });
 new ResizeObserver(render).observe($('.micro-stage'));
 $('[data-micro-a-symbol]').innerHTML=symbol(50,50,40,true,'real');
 $('[data-micro-node-original]').innerHTML=symbol(50,64,36,false);
 $('[data-micro-node-real]').innerHTML=symbol(50,64,48,true,'real');
 $('[data-micro-node-virtual]').innerHTML=symbol(50,64,58,true,'virtual');
 render();
 import('./microscope-model.mjs?v=20261106-micro-same-colors21').then(({createMicroscopeModel})=>{try{model=createMicroscopeModel($('[data-micro-model]'),render);root.dataset.microRender='3d';render();}catch{root.dataset.microRender='fallback';}}).catch(()=>{root.dataset.microRender='fallback';});
}
