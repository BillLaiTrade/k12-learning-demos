import {microscopeGeometry} from './microscope-optics.mjs';
const root=document.querySelector('#microscope-lab');
if(root){
 const $=s=>root.querySelector(s),all=s=>[...root.querySelectorAll(s)],g=microscopeGeometry();
 const red='#ec8b6d',blue='#6dbde3',axis=432,k=1.1,Y=s=>550-s*k;
 let step='objective',rays=false,point='both';
 const symbol=(x,y,h,inverted=false)=>{
  const w=Math.max(4,h*.22),radius=Math.max(3,h*.18),stem=Math.max(2,h*.055);
  return `<g transform="translate(${x} ${y})${inverted?' rotate(180)':''}"><path d="M0 ${-h}V${h}" stroke="#8ca778" stroke-width="${stem}"/><path d="M0 ${-h-w}L${-w} ${-h+w}H${w}Z" fill="${red}"/><circle cy="${h}" r="${radius}" fill="${blue}"/></g>`;
 };
 const label=(x,y,w,t,path='')=>`${path?`<path d="${path}" class="micro-leader"/>`:''}<rect x="${x}" y="${y}" width="${w}" height="35" rx="7" fill="#fff9e6" stroke="#c1cbae"/><text x="${x+w/2}" y="${y+24}" class="micro-label" text-anchor="middle">${t}</text>`;
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
 <text x="380" y="38" text-anchor="middle" class="micro-small">顯微鏡構造與成像剖面示意</text>
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
 <text x="432" y="112" text-anchor="middle" class="micro-small">眼睛</text>
 ${label(246,182,76,'目鏡','M322 199L391 214')}
 ${label(255,414,76,'鏡筒','M331 431L394 431')}
 ${label(267,541,76,'物鏡','M343 558L413 550')}
 ${label(142,660,160,'載物臺與玻片','M302 678L345 641')}
 ${label(491,695,76,'照明','M491 712L462 684')}
 <path d="M515 220V330M508 220h14M508 330h14" fill="none" stroke="#ead17d" stroke-width="2"/><circle cx="515" cy="330" r="3" fill="#ead17d"/><text x="529" y="337" fill="#f1d684" font-size="22">F</text>
 ${label(540,232,187,'目鏡的焦距內','M515 249H540')}
 <text x="380" y="769" class="micro-small" text-anchor="middle">剖面與圖案為教學示意，非器材尺寸比例</text>`;
 function render(){
  root.dataset.step=step;root.dataset.rays=String(rays);root.dataset.point=point;
  let out=hardware;
  const dim=step==='eyepiece'?'micro-muted':'';
  out+=`<g class="${dim}"><rect x="86" y="535" width="144" height="94" rx="10" fill="#fff8e6" stroke="#bdc9ab"/><text x="158" y="562" class="micro-label" text-anchor="middle">原物（示意）</text>${symbol(158,597,12)}<path d="M230 594L428 638" class="micro-leader" stroke-dasharray="5 5"/></g>`;
  out+=`<rect x="86" y="243" width="145" height="151" rx="10" fill="#fff8e6" stroke="#bdc9ab"/><text x="158" y="272" class="micro-label" text-anchor="middle">中間像</text>${symbol(158,333,36,true)}<path d="M231 299L401 ${Y(g.intermediate)}H470" class="micro-leader" stroke-dasharray="5 5"/>`;
  out+=`<path data-micro-image-plane d="M402 ${Y(g.intermediate)}H471" stroke="#f1e8bd" stroke-width="2" stroke-dasharray="5 4"/>`;
  out+=label(534,365,213,'中間像｜倒立實像',`M534 382L485 382L470 ${Y(g.intermediate)}`);
  if(rays)for(const r of g.rays){
   if(point!=='both'&&point!==r.point)continue;
   const color=r.point==='top'?red:blue,marker=r.point==='top'?'red':'blue';
   const coords=pts=>pts.map((p,i)=>`${i?'L':'M'}${(axis+p[1]).toFixed(2)} ${Y(p[0]).toFixed(2)}`).join('');
   const middle=[g.intermediate,g.first.m*r.objectHeight],ocular=[g.separation,r.ocularHeight];
   const pts=step==='objective'?[[-g.objective.u,r.objectHeight],[0,r.lensHeight],middle]:step==='eyepiece'?[middle,ocular,[g.eye,r.eyeHeight]]:[[-g.objective.u,r.objectHeight],[0,r.lensHeight],middle,ocular,[g.eye,r.eyeHeight]];
   out+=`<path data-micro-ray data-point="${r.point}" class="micro-ray" d="${coords(pts)}" stroke="${color}" marker-mid="url(#m9-${marker})" marker-end="url(#m9-${marker})"/>`;
   if(step!=='objective')out+=`<path class="micro-ray extension" d="${coords([ocular,[g.virtual,g.total*r.objectHeight]])}" stroke="${color}"/>`;
  }
  $('#microscope-scene').innerHTML=out;
  const first=step==='objective';
  $('[data-micro-view-title]').textContent=first?'物鏡形成的中間像':'透過目鏡看到的圖案';
  $('[data-micro-preview]').innerHTML=symbol(100,115,first?36:90,true);
  $('[data-micro-preview]').setAttribute('aria-label',first?'倒立、放大的中間實像':'透過目鏡看到倒立、放大的虛像');
  $('[data-micro-badge]').textContent=first?'倒立・放大的實像':'倒立・放大的虛像';
  $('[data-micro-copy]').textContent=first?'中間像形成在鏡筒內，這裡沒有放置屏幕。':'目鏡把中間像當作觀察對象，圖案相對原物仍倒立。';
  $('#micro-result').textContent={objective:'① 物鏡先把原物形成倒立、放大的實像；這個像就是中間像。',eyepiece:'② 中間像位於目鏡焦距內，目鏡像放大鏡一樣觀察它，眼睛看見放大的虛像。',both:'③ 兩組透鏡接力：物鏡先成中間像，目鏡再觀察它；最終像仍相對原物倒立。'}[step];
  all('[data-set=micro]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===step)));
  $('[data-micro-rays]').setAttribute('aria-pressed',String(rays));$('[data-micro-rays]').textContent=rays?'隱藏輔助光路':'顯示輔助光路';
  all('[data-micro-point]').forEach(b=>{b.disabled=!rays;b.setAttribute('aria-pressed',String(b.dataset.microPoint===point));});
  root.dataset.ready='true';
 }
 root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.set==='micro')step=b.dataset.value;else if(b.hasAttribute('data-micro-rays'))rays=!rays;else if(b.dataset.microPoint)point=b.dataset.microPoint;else if(b.hasAttribute('data-micro-reset')){step='objective';rays=false;point='both';}else return;render();});
 render();
}
