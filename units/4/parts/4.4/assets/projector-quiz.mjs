import {PROJECTOR as G,initialProjector,moveProjector,projectorState,projectorHint,projectorRays} from './projector-optics.mjs';
import {paintCard,paintProjector} from './projector-art.mjs';
const root=document.querySelector('[data-projector-lab]');
if(root){
 const $=s=>root.querySelector(s),all=s=>[...root.querySelectorAll(s)],section=root.closest('.unit-quiz'),status=section.querySelector('[data-projector-status]');
 const card=$('[data-projector-card-art]'),paper=$('[data-projector-paper]');
 let state=initialProjector(),model=null,checked=false,showHint=false,queued=0,started=false;
 const labels=all('[data-projector-label]');
 function labelsAt(points){
  const box=$('.projector-stage').getBoundingClientRect();if(box.width<1)return;
  const placements=labels.map(e=>({e,key:e.dataset.projectorLabel,width:e.getBoundingClientRect().width||60,p:points[e.dataset.projectorLabel]}));
  for(let i=0;i<placements.length;i++){const a=placements[i];a.x=Math.max(a.width/2+8,Math.min(box.width-a.width/2-8,a.p.x));if(i)a.x=Math.max(a.x,placements[i-1].x+(placements[i-1].width+a.width)/2+7);}
  for(let i=placements.length-1;i>=0;i--){const a=placements[i];a.x=Math.min(a.x,box.width-a.width/2-8);if(i<placements.length-1)a.x=Math.min(a.x,placements[i+1].x-(placements[i+1].width+a.width)/2-7);}
  for(const a of placements){a.y=Math.max(76,a.p.y-12);a.e.style.left=`${a.x}px`;a.e.style.top=`${a.y}px`;}
  $('[data-projector-leaders]').setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);$('[data-projector-leaders]').innerHTML=placements.map(a=>`<path d="M${a.x} ${a.y+3}L${a.p.x} ${Math.max(a.y+8,a.p.y)}"/><circle cx="${a.p.x}" cy="${Math.max(a.y+8,a.p.y)}" r="2.5"/>`).join('');
 }
 function fallback(){
  const x=p=>148.46+p*73.46,y=p=>190-(p-G.axis)*40,l=x(state.lens),o=x(state.card),body=state.kind==='convex'?`M${l-3} 120Q${l-33} 190 ${l-3} 260L${l+3} 260Q${l+33} 190 ${l+3} 120Z`:`M${l-17} 120Q${l-2} 190 ${l-17} 260H${l+17}Q${l+2} 190 ${l+17} 120Z`;
  const rays=state.rays?projectorRays(state).map(r=>`<path d="M${x(r.from[0])} ${y(r.from[1])}L${x(r.lens[0])} ${y(r.lens[1])}L${x(r.end[0])} ${y(r.end[1])}" fill="none" stroke="${r.point>0?'#c26c53':'#4389a8'}" stroke-width="1.7"/>`).join(''):'';
  $('[data-projector-fallback]').innerHTML=`<defs><linearGradient id="pj-wood" x2="0" y2="1"><stop stop-color="#dfbf8c"/><stop offset="1" stop-color="#9e6b3e"/></linearGradient><linearGradient id="pj-glass"><stop stop-color="#a3cbc1" stop-opacity=".6"/><stop offset=".5" stop-color="#f7fffa" stop-opacity=".3"/><stop offset="1" stop-color="#8ab6ad" stop-opacity=".6"/></linearGradient><clipPath id="pj-scene-clip"><rect x="0" y="65" width="1150" height="275"/></clipPath></defs><path d="M25 319H1130V348H25Z" fill="url(#pj-wood)"/><path d="M40 317H1120" stroke="#6d7f70" stroke-width="6"/><g fill="#405f4b" stroke="#71856d"><rect x="55" y="138" width="93" height="105" rx="10"/><rect x="${o-35}" y="297" width="70" height="20" rx="5"/><rect x="${l-35}" y="297" width="70" height="20" rx="5"/><rect x="${o-3}" y="235" width="6" height="62"/><rect x="${l-3}" y="260" width="6" height="37"/></g><rect x="136" y="148" width="12" height="85" rx="3" fill="#fff0b7"/><rect x="${o-44}" y="140" width="88" height="100" rx="4" fill="url(#pj-glass)" stroke="#a9b9a4"/><image href="${card.toDataURL()}" x="${o-41}" y="145" width="82" height="90"/><path d="${body}" fill="url(#pj-glass)" stroke="#5c8c80" stroke-width="2"/><rect x="934" y="86" width="200" height="202" rx="6" fill="#e3dbc6" stroke="#c4b89c" stroke-width="4"/><image href="${paper.toDataURL()}" x="940" y="96" width="188" height="180"/><g clip-path="url(#pj-scene-clip)">${rays}</g>`;
  const rect=$('.projector-stage').getBoundingClientRect(),scale=Math.min(rect.width/1150,rect.height/400),offsetX=(rect.width-1150*scale)/2,offsetY=(rect.height-400*scale)/2;const p=(x,y)=>({x:x*scale+offsetX,y:y*scale+offsetY});labelsAt({lamp:p(100,135),card:p(o,140),lens:p(l,120),screen:p(1030,86)});
 }
 function feedback(g){
  const box=$('#quiz-result');box.hidden=!checked;if(!checked){box.replaceChildren();return;}
  const names={clear:'清楚',large:'放大',upright:'正立',inTarget:'目標範圍'};
  const title=g.success?'完成了！投影已符合所有目標。':g.image.type!=='real'?'牆上還沒有清楚實像。':!g.checks.clear?'先讓牆上的圖案清楚。':'再調整一下，還有目標未完成。';
  const text=g.success?'投影相對圖卡上下、左右反轉；圖卡倒放後，牆上就呈現正立圖案。':g.image.type!=='real'?'這個配置的光線沒有在牆上會聚。試著換鏡片，或拉開圖卡與鏡片的距離。':!g.checks.clear?'配合調整圖卡與鏡片的位置，再比較大小和方向。':!g.checks.upright?'對照屋頂與門窗方向，試著旋轉圖卡。':!g.checks.large?'目前圖案還沒有放大，調整距離後再重新對焦。':'圖案超出目標框，調整大小後再重新對焦。';
  box.dataset.result=g.success?'success':'retry';box.innerHTML=`<strong>${title}</strong><div class="projector-checks">${Object.entries(g.checks).map(([key,ok])=>`<span data-projector-check="${key}" data-pass="${ok}">${ok?'✓':'○'} ${names[key]}</span>`).join('')}</div><p>${text}</p>`;
 }
 function render(){
  queued=0;const g=paintProjector(paper,state);paintCard(card,state);
  for(const key of ['card','lens']){const input=$(`[data-projector-position=${key}]`);input.min=String(key==='lens'?Math.max(G.lensMin,state.card+G.minGap):G.cardMin);input.max=String(key==='card'?Math.min(G.cardMax,state.lens-G.minGap):G.lensMax);input.value=String(state[key]);input.style.setProperty('--projector-progress',`${(state[key]-Number(input.min))/(Number(input.max)-Number(input.min))*100}%`);}
  all('[data-projector-lens]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.projectorLens===state.kind)));
  for(const key of ['card','lens'])$(`[data-projector-position=${key}]`).setAttribute('aria-valuetext',`軌道位置 ${Math.round((state[key]-G[key+'Min'])/(G[key+'Max']-G[key+'Min'])*100)}%`);
  $('[data-projector-rotate]').setAttribute('aria-pressed',String(state.flipped));$('[data-projector-rotation]').textContent=state.flipped?'已旋轉 180°':'目前 0°';
  $('[data-projector-rays]').setAttribute('aria-pressed',String(state.rays));$('[data-projector-rays]').textContent=state.rays?'隱藏輔助光路':'顯示輔助光路';$('.projector-key').hidden=!state.rays;
  const description=g.image.type!=='real'?'牆上是散開的光，沒有清楚圖案。':`牆上圖案${g.checks.clear?'清楚':'失焦'}、${g.checks.upright?'正立':'倒立'}、${g.checks.large?'放大':'尚未放大'}。`;
  for(const e of [$('[data-projector-model]'),$('[data-projector-fallback]')])e.setAttribute('aria-label','光源、透明圖卡、鏡片與投影幕。'+description);
  root.dataset.kind=state.kind;root.dataset.flipped=String(state.flipped);root.dataset.card=String(state.card);root.dataset.lens=String(state.lens);root.dataset.clear=String(g.checks.clear);root.dataset.checked=String(checked);root.dataset.success=String(checked&&g.success);root.dataset.imageType=g.image.type;
  status.textContent=checked?(g.success?'挑戰完成':'再調整'):'調整中';status.dataset.complete=String(checked&&g.success);
  feedback(g);const hint=$('[data-projector-hint]');hint.hidden=!showHint;$('[data-projector-help]').setAttribute('aria-expanded',String(showHint));
  if(showHint){const h=projectorHint(state);hint.innerHTML=`<span>${h.text}</span>${h.href?` <a href="${h.href}">${h.label}</a>`:''}`;}
  if(model)model.update(state);else fallback();
  root.dataset.projectorReady='true';
 }
 function request(){if(!queued)queued=requestAnimationFrame(render);}
 function edit(){checked=false;showHint=false;request();}
 root.addEventListener('input',e=>{const key=e.target.dataset.projectorPosition;if(key){state=moveProjector(state,key,Number(e.target.value));edit();}});
 root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.projectorLens){state={...state,kind:b.dataset.projectorLens};edit();}
  else if(b.hasAttribute('data-projector-rotate')){state={...state,flipped:!state.flipped};edit();}
  else if(b.hasAttribute('data-projector-rays')){state={...state,rays:!state.rays};request();}
  else if(b.hasAttribute('data-projector-reset')){state=initialProjector();edit();}
  else if(b.hasAttribute('data-projector-help')){showHint=!showHint;request();}
 });
 root.addEventListener('submit',e=>{e.preventDefault();checked=true;showHint=false;render();});
 function failed(){const previous=model;model=null;previous?.dispose();root.dataset.projectorRender='fallback';$('[data-projector-model]').hidden=true;$('[data-projector-fallback]').toggleAttribute('hidden',false);const note=$('[data-projector-render-note]');note.hidden=false;note.textContent='目前以剖面圖呈現，操作與成像判定相同。';render();}
 function activate(){if(started)return;started=true;root.dataset.projectorRender='loading';import('./projector-model.mjs?v=20261106-projector1').then(({createProjectorModel})=>{
  try{model=createProjectorModel($('[data-projector-model]'),card,paper,labelsAt,failed);$('[data-projector-model]').hidden=false;$('[data-projector-fallback]').toggleAttribute('hidden',true);$('[data-projector-render-note]').hidden=true;root.dataset.projectorRender='3d';model.update(state);}catch{failed();}
 }).catch(failed);}
 const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();activate();}},{rootMargin:'300px'});observer.observe(root);
 new ResizeObserver(()=>{if(!model)fallback();}).observe($('.projector-stage'));
 render();
}
