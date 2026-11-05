import {imageFor,rayAt,eyeModel} from './optics.mjs';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const RED='#c46548',BLUE='#387fa6',GOLD='#aa7c3e';
const fmt=n=>Math.abs(n-Math.round(n))<.05?Math.round(n).toString():n.toFixed(1);
function defs(id){return `<defs>
<linearGradient id="${id}-wood" x2="0" y2="1"><stop stop-color="#e9d3af"/><stop offset=".25" stop-color="#d8b98c"/><stop offset="1" stop-color="#bd986b"/></linearGradient>
<linearGradient id="${id}-metal"><stop stop-color="#596b63"/><stop offset=".3" stop-color="#b5c0b6"/><stop offset=".55" stop-color="#ecede0"/><stop offset=".75" stop-color="#87978d"/><stop offset="1" stop-color="#4e6456"/></linearGradient>
<linearGradient id="${id}-glass"><stop stop-color="#83b9ac" stop-opacity=".65"/><stop offset=".4" stop-color="#f4ffff" stop-opacity=".8"/><stop offset=".65" stop-color="#bfded2" stop-opacity=".4"/><stop offset="1" stop-color="#5d9b91" stop-opacity=".7"/></linearGradient>
<radialGradient id="${id}-wall"><stop stop-color="#fffef8"/><stop offset="1" stop-color="#eaf0e6"/></radialGradient>
<filter id="${id}-shadow" x="-30%" y="-30%" width="170%" height="180%"><feDropShadow dx="2" dy="4" stdDeviation="4" flood-color="#40513d" flood-opacity=".15"/></filter>
<filter id="${id}-blur"><feGaussianBlur stdDeviation="3"/></filter>
${[RED,BLUE,GOLD].map((c,i)=>`<marker id="${id}-arrow${i}" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0L7 3L0 6Z" fill="${c}"/></marker>`).join('')}</defs>`;}
const text=(x,y,s,cls='',anchor='start')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${s}</text>`;
function line(a,b,c=RED,dash=false,id=''){const ci=c===RED?0:c===BLUE?1:2;return `<path class="${dash?'extension':'light-ray'}" d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}" stroke="${c}" ${!dash&&id?`marker-end="url(#${id}-arrow${ci})"`:''}/>`;}
function symbol(x,y,m=1,ghost=false){return `<g transform="translate(${x} ${y}) scale(${m})" ${ghost?'opacity=".5"':''}><path d="M0 -35V35" stroke="#6b8771" stroke-width="5"/><path d="M0 -45L-11 -27H11Z" fill="${RED}" stroke="#fff9" stroke-width="1.5"/><circle cy="35" r="9" fill="${BLUE}" stroke="#fff9" stroke-width="1.5"/></g>`;}
function stand(x,id,type='lens'){return `<ellipse cx="${x+4}" cy="309" rx="38" ry="7" fill="#3f503e" opacity=".1"/><path d="M${x-26} 302L${x-35} 312H${x+35}L${x+25} 302Z" fill="url(#${id}-metal)" stroke="#6e8270"/><rect x="${x-4}" y="242" width="8" height="60" rx="2" fill="url(#${id}-metal)"/>`;}
function lens(x,id,convex=true){const contour=convex?`M${x} 93 Q${x+35} 180 ${x} 267 Q${x-35} 180 ${x} 93Z`:`M${x-18} 93Q${x+3} 180 ${x-18} 267L${x+18} 267Q${x-3} 180 ${x+18} 93Z`;return stand(x,id)+`<path d="${contour}" fill="url(#${id}-glass)" stroke="#6c9c91" stroke-width="2"/><path d="${convex?`M${x-3} 104Q${x-20} 180 ${x-3} 254`:`M${x-14} 104Q${x+5} 180 ${x-14} 254`}" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="3"/>`;}
function background(id,eye=false){return `<rect width="900" height="390" rx="13" fill="url(#${id}-wall)"/>${eye?'':`<path d="M20 300H880L900 342H0Z" fill="url(#${id}-wood)"/><path d="M0 342H900V358H0Z" fill="#b9976b"/><path d="M45 316H860M70 329H840" stroke="#f5e7cc" stroke-opacity=".6"/><rect x="45" y="294" width="810" height="9" rx="3" fill="url(#${id}-metal)"/>${Array.from({length:39},(_,i)=>`<path d="M${60+i*20} 294v${i%5===0?8:4}" stroke="#647961" stroke-width="1"/>`).join('')}`}<path class="optical-axis" d="M25 180H875"/>`;}
function eyeIcon(x,y=180){return `<g transform="translate(${x},${y})"><path d="M-23 0Q0 -25 23 0Q0 25 -23 0Z" fill="#fff" stroke="#607964" stroke-width="2"/><circle r="9" fill="#678f81"/><circle r="4.5" fill="#243a35"/><circle cx="-2" cy="-3" r="2" fill="#fff"/></g>`;}
function screen(x,id,handle=true){return stand(x,id)+`<g ${handle?'class="drag-handle" data-drag="screen" role="slider" tabindex="0" aria-label="移動屏幕"':''}><rect x="${x-7}" y="88" width="14" height="181" rx="3" fill="#fffef6" stroke="#afba9e" stroke-width="2"/><path d="M${x-3} 94V260" stroke="#fff" stroke-width="3"/><rect x="${x-20}" y="270" width="40" height="23" rx="6" fill="#f9fcf3" stroke="#a1b29a"/><path d="M${x-8} 282h16m-12-4l-4 4 4 4m8-8l4 4-4 4" stroke="#5b795c" fill="none"/></g>`;}
function projection(root,m=1,blur=0,noImage=''){
 const box=$('[data-image]',root);if(!box)return;
 if(noImage){box.innerHTML=`<p class="no-image">${noImage}</p>`;return;}
 const scale=Math.min(1.1,Math.abs(m))*Math.sign(m);
 box.innerHTML=`<svg viewBox="0 0 140 110" role="img" aria-label="${m<0?'倒立':'正立'}${blur>1?'模糊':'清楚'}的圖案"><defs><filter id="preview-${root.id}"><feGaussianBlur stdDeviation="${Math.min(6,blur)}"/></filter></defs><g filter="url(#preview-${root.id})">${symbol(70,55,scale)}</g></svg>`;
}
const initial=i=>({rays:true,extensions:true,lens:i===6?'concave':'convex',point:'both',object:i===1?180:i===5?60:i===6?160:320,screen:i===1?140:i===5?180:240,distance:'far',kind:i===9?'myopia':'normal',adjusted:false,corrected:false,view:'eye',records:[],stage:i===4?'focus':null});
$$('[data-lab]').forEach(root=>{
 const canCorrect=root.hasAttribute('data-correction'),i=Number(root.dataset.lab),svg=$('[data-scene]',root),id=root.id;let s=initial(i),dragKey=null;
 if(i===5){const mode=document.createElement('div');mode.className='choice-row';mode.setAttribute('role','group');mode.setAttribute('aria-label','觀看方式');mode.innerHTML='<button type="button" data-set="view" data-value="eye" aria-pressed="true">透過透鏡看</button><button type="button" data-set="view" data-value="screen" aria-pressed="false">移動屏幕比較</button>';$('.tool-row',root).before(mode);}
 function render(){
  if(root.hasAttribute('data-focus-sequence')){
   const focus=s.stage==='focus';root.dataset.focusStep=s.stage;
   $('[data-input=object]',root).disabled=focus;$('.object-control',root).hidden=focus;
   $('.distance-controls',root).hidden=focus;$('.range-grid',root).classList.toggle('single',focus);
   $('[data-record-controls]',root).hidden=focus;$('[data-records]',root).hidden=focus;
   $('[data-focus-heading]',root).textContent=focus?'固定較遠物體，只移動屏幕，找出清楚的倒立像。':'先改物體遠近，再重新移動屏幕；清楚後才留下比較紀錄。';
  }
  if(i<=6)drawBench();else drawEye();
  $$('[data-set]',root).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.set==='distance'&&i===4?s.object===Number(b.dataset.value):String(s[b.dataset.set])===b.dataset.value)));
  $$('[data-input]',root).forEach(input=>{input.value=s[input.dataset.input];$(`#${input.id}-out`,root).textContent=`${fmt(s[input.dataset.input])} 公分`;});
  $$('[data-toggle]',root).forEach(input=>input.checked=s[input.dataset.toggle]);
  if(i===5){const c=$('[data-input=screen]',root).closest('.control');c.hidden=s.view!=='screen';$('.projection .label',root).textContent=s.view==='screen'?'屏幕上的投影':'透過透鏡的觀察窗';}
  $$('[data-drag]',svg).forEach(g=>{const input=$(`[data-input=${g.dataset.drag}]`,root);if(input)for(const [a,v] of Object.entries({'aria-valuemin':input.min,'aria-valuemax':input.max,'aria-valuenow':input.value,'aria-valuetext':`${input.value} 公分`}))g.setAttribute(a,v);});
  root.dataset.ready='true';
 }
 function drawBench(){
  const X=370,Y=180,k=.85,u=s.object,f=s.lens==='concave'?-100:100,g=imageFor(f,u),show=s.rays;let out=defs(id)+background(id);
  const objectX=X-u*k,screenX=X+s.screen*k,hasScreen=[1,3,4].includes(i)||(i===5&&s.view==='screen');
  out+=text(38,38,i===2?'同一組平行光':'同一個發光圖案','device-label')+text(370,38,s.lens==='concave'?'凹透鏡':'凸透鏡','device-label','middle')+text(740,38,hasScreen?'白色屏幕':g.type==='virtual'?'透過鏡片觀察':'觀察光束的會聚','device-label','middle');
  out+=lens(X,id,s.lens==='convex');
  for(const v of [-100,100])out+=`<path d="M${X+v*k} 262v8" stroke="#79927a"/>`+text(X+v*k,285,'F','f-label','middle');
  // Objects and screen are on the same optical rail in every lens experiment.
  out+=stand(objectX,id)+`<rect x="${objectX-17}" y="126" width="34" height="110" rx="5" fill="#fff9ea" stroke="#a5ae96"/>`;
  out+=`<g ${(i===4&&s.stage==='compare')||i===5||i===6?'class="drag-handle" data-drag="object" role="slider" tabindex="0" aria-label="移動物體"':''}>${symbol(objectX,Y)}<rect x="${objectX-18}" y="270" width="36" height="22" rx="6" fill="#eff6e9" stroke="#9baf94"/></g>`;
  const observeEye=!hasScreen&&g.finite&&g.type==='virtual',eyeX=580;
  let endX=hasScreen?screenX:observeEye?eyeX:835;
  if(show)for(const [oy,c,point] of [[-35,RED,'top'],[35,BLUE,'bottom']]){
   if(s.point!=='both'&&s.point!==point)continue;
   const d=(endX-X)/k,den=1+d*(1/u-1/f);
   const heights=observeEye?[-6,0,6].map(pupil=>(pupil+d*oy/u)/den):[-48,0,48];
   for(const h of heights){
    out+=line([objectX,Y+oy],[X,Y+h],c,false,id)+line([X,Y+h],[endX,Y+rayAt(f,u,oy,h,(endX-X)/k)],c,false,id);
    if(g.finite&&g.v<0&&s.extensions)out+=line([X,Y+h],[X+g.v*k,Y+g.m*oy],c,true);
   }
  }
  if(hasScreen)out+=screen(screenX,id);
  else if(observeEye)out+=eyeIcon(eyeX)+text(eyeX,236,'眼睛','dim-label','middle');
  if(g.finite){
   const imageX=X+g.v*k;
   if(imageX>25&&imageX<865&&Math.abs(g.m)<3.5){
    if(!hasScreen)out+=symbol(imageX,Y,g.m,true)+text(imageX,80,g.type==='virtual'?'看起來的像':'光會聚形成的像','dim-label','middle');
    if(hasScreen&&g.v>0&&Math.abs(s.screen-g.v)<=3)out+=symbol(screenX,Y,g.m);
   }
  }
  out+=text(38,377,`物體到透鏡 ${fmt(u)} 公分`,'dim-label')+text(860,377,hasScreen?`透鏡到屏幕 ${fmt(s.screen)} 公分`:'F：焦點（焦距固定為 100 公分）','dim-label','end');
  let message='';
  if(!g.finite){message='物體正好在焦點：同一物點的光通過後平行，有限距離的屏幕都接不到清楚像。';projection(root,1,0,'這裡沒有有限距離的像');}
  else if(hasScreen&&g.type==='real'){
   const error=Math.abs(s.screen-g.v),clear=error<=3;
   message=clear?`屏幕已對焦：倒立${sizeText(g.size)}的實像。清楚像離透鏡約 ${fmt(g.v)} 公分。`:`屏幕尚未對焦，圖案仍模糊。移動屏幕，找同一物點的光會聚的位置。`;
   projection(root,g.m,clear?0:Math.min(12,2+error/8));
  }else if(hasScreen){message='光通過透鏡後仍發散；移動屏幕，也無法直接接到這個正立放大的虛像。';projection(root,1,0,'屏幕上沒有清楚投影');}
  else{message=`${g.upright?'正立':'倒立'}、${sizeText(g.size)}的${g.type==='virtual'?'虛像：光的反向延長線交於物體同側。':'實像：光在透鏡另一側會聚。'}`;if(X+g.v*k<25||X+g.v*k>865)message+=' 像的位置超出這張光路圖的範圍。';projection(root,g.m);}
  $('[data-result]',root).textContent=message;
  if(i===4){
   const clear=g.finite&&g.type==='real'&&Math.abs(s.screen-g.v)<=3;
   $('[data-action=record]',root).disabled=!clear;
   $('[data-record-status]',root).textContent=clear?'已清楚成像，可以留下比較。':'先把屏幕移到清楚的位置。';
   $('[data-records]',root).innerHTML=s.records.map(r=>`<div class="${r.u===u?'selected':''}"><b>物距 ${fmt(r.u)} 公分</b><span>像距 ${fmt(r.v)} 公分 · 倒立${sizeText(r.size)}</span></div>`).join('');
  }
  svg.innerHTML=out;svg.setAttribute('aria-label',message);
 }
 function drawEye(){
  const kind=i===7?'normal':s.kind,near=i===7&&s.distance==='near',g=eyeModel(kind,near,s.adjusted,canCorrect&&s.corrected);
  const X=430,Y=180,rx=X+160;let out=defs(id)+background(id,true);
  out+=text(30,38,near?'近處物體的光':'同一遠方物體的光','device-label')+text(510,38,'固定的眼球與視網膜','device-label','middle');
  out+=`<ellipse cx="508" cy="180" rx="136" ry="113" fill="#f6eee2" stroke="#8f9b84" stroke-width="2"/><ellipse cx="508" cy="180" rx="123" ry="102" fill="#fffcf3" stroke="#e7c5ac" stroke-width="5"/><path d="M395 129Q359 180 395 231" fill="#cce5da" stroke="#7caca0" stroke-width="2"/><path d="M${X} 125Q${s.adjusted&&near?X+30:X+18} 180 ${X} 235Q${s.adjusted&&near?X-30:X-18} 180 ${X} 125Z" fill="url(#${id}-glass)" stroke="#74a196" stroke-width="2"/><path d="M${rx} 111V249" fill="none" stroke="#c67854" stroke-width="7"/><path d="M641 168L695 157L704 191L643 197" fill="#d9baa0" stroke="#ad927d"/>`;
  out+=text(340,281,'角膜','dim-label')+`<path d="M365 270L382 230" stroke="#7c9481"/>`+text(X,306,'水晶體','dim-label','middle')+`<path d="M${X} 290V239" stroke="#7c9481"/>`+text(603,290,'視網膜接收面','device-label','middle')+`<path d="M600 273L590 245" stroke="#a67856"/>`+text(710,178,'神經訊號 →','dim-label');
  if(canCorrect){out+=text(275,60,kind==='normal'?'正常成像，無需矯正':s.corrected?kind==='myopia'?'凹透鏡矯正':'凸透鏡矯正':'尚未加鏡片','device-label','middle');if(s.corrected)out+=lens(X-g.gap,id,kind==='hyperopia');}
  if(s.rays){for(const r of g.objectRays){
   const c=r.objectY<0?RED:BLUE;
   const left=75,sp=X-g.gap;
   // All source rays converge backwards at the same object location.
   const leftY=Y+r.objectY+(r.spectacleY-r.objectY)*(left-(X-g.u))/(g.u-g.gap);
   out+=line([left,leftY],[sp,Y+r.spectacleY],c,false,id)+line([sp,Y+r.spectacleY],[X,Y+r.eyeY],c,false,id)+line([X,Y+r.eyeY],[rx,Y+r.retinaY],c,false,id);
   if(g.focus>160.1)out+=line([rx,Y+r.retinaY],[X+g.focus,Y+r.eyeY+g.focus*r.slope],c,true);
  }}
  out+=`<path d="M${rx-5} 163v34" stroke="#c67854" stroke-width="2"/><path d="M${X+g.focus} 125V235" stroke="${GOLD}" stroke-dasharray="4 5" stroke-width="1"/>`;
  const clear=Math.abs(g.focus-160)<.1,position=clear?'視網膜上':g.focus<160?'視網膜前':'視網膜後';
  out+=text(Math.min(790,Math.max(480,X+g.focus)),85,`會聚位置：${position}`,'device-label','middle');
  const message=clear?'光在視網膜上成像，圖案清楚。':`光的會聚位置在${position}，到達視網膜時成為光斑，圖案模糊。${g.focus>160?'虛線只標出幾何延伸的位置。':''}`;
  $('[data-result]',root).textContent=message;projection(root,-.65,clear?0:5);
  if(i===7)$('[data-adjust]',root).textContent=s.adjusted?(near?'看近處：水晶體較厚，會聚作用較強。':'看遠方：水晶體較扁，會聚作用較弱。'):'保留原本看遠方的調節狀態。';
  if(canCorrect){const b=$('[data-action=correct]',root);b.disabled=kind==='normal';b.setAttribute('aria-pressed',String(s.corrected));b.textContent=kind==='normal'?'正常成像不需矯正鏡片':s.corrected?'取下矯正鏡片':`加入${kind==='myopia'?'凹':'凸'}透鏡矯正`;}
  out+=text(450,365,'光路以等效透鏡表示角膜與水晶體的總作用；視網膜以固定平面簡化表示。','dim-label','middle');
  svg.innerHTML=out;svg.setAttribute('aria-label',message);
 }
 function set(key,value){if(i===4&&s.stage==='focus'&&['object','distance'].includes(key))return;s[key]=value;if(key==='stage'&&value==='focus')s.object=320;if(key==='distance'){if(i===4)s.object=Number(value);else s.adjusted=false;}if(key==='kind')s.corrected=false;render();}
 root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.set)set(b.dataset.set,b.dataset.value);
  if(b.dataset.action==='reset'){s=initial(i);render();}
  if(b.dataset.action==='accommodate'){s.adjusted=true;render();}
  if(b.dataset.action==='correct'&&canCorrect&&s.kind!=='normal'){s.corrected=!s.corrected;render();}
  if(b.dataset.action==='record'){
   const g=imageFor(100,s.object);if(!g.finite||g.type!=='real'||Math.abs(s.screen-g.v)>3)return;
   s.records=s.records.filter(r=>r.u!==s.object);s.records.push({u:s.object,v:g.v,size:g.size});s.records=s.records.slice(-3);render();
  }
 });
 root.addEventListener('input',e=>{if(e.target.dataset.input)set(e.target.dataset.input,Number(e.target.value));});
 root.addEventListener('change',e=>{if(e.target.dataset.toggle)set(e.target.dataset.toggle,e.target.checked);});
 const limit=(key,v)=>{const input=$(`[data-input=${key}]`,root);if(!input||input.disabled)return;const step=Number(input.step);set(key,Math.max(Number(input.min),Math.min(Number(input.max),Math.round(v/step)*step)));};
 svg.addEventListener('pointerdown',e=>{const h=e.target.closest('[data-drag]');if(!h)return;e.preventDefault();dragKey=h.dataset.drag;svg.setPointerCapture(e.pointerId);});
 svg.addEventListener('pointermove',e=>{if(!dragKey)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse()),origin=i===1?390:370;limit(dragKey,dragKey==='screen'?(p.x-origin)/.85:(origin-p.x)/.85);});
 svg.addEventListener('pointerup',()=>{dragKey=null;});svg.addEventListener('pointercancel',()=>{dragKey=null;});svg.addEventListener('lostpointercapture',()=>{dragKey=null;});
 svg.addEventListener('keydown',e=>{const g=e.target.closest('[data-drag]');if(!g)return;const key=g.dataset.drag,input=$(`[data-input=${key}]`,root);let v=s[key];if(e.key==='Home')v=Number(input.min);else if(e.key==='End')v=Number(input.max);else if(['ArrowLeft','ArrowDown','ArrowRight','ArrowUp'].includes(e.key))v+=(['ArrowLeft','ArrowDown'].includes(e.key)?-1:1)*Number(input.step);else return;e.preventDefault();limit(key,v);$(`[data-drag=${key}]`,svg)?.focus();});
 render();
});
function sizeText(size){return {equal:'等大',larger:'放大',smaller:'縮小'}[size];}
const quiz=$('#quiz'),result=$('#quiz-result');
const answers=['1','0','2','1'],reviewTargets=$$('fieldset',quiz).map(f=>f.dataset.review);
const explanations=['上下端的光各自沿直線穿過小孔，落在屏幕相反高度。','物體在焦距外向透鏡靠近時，清楚實像離透鏡更遠、變大，仍是倒立。','虛像的位置由入眼光線的反向延長線判斷；光沒有真的在那裡會聚。','凹透鏡先改變入眼光束，使整體光路在視網膜上成像。'];
quiz.addEventListener('submit',e=>{e.preventDefault();const data=new FormData(quiz),missing=answers.map((_,i)=>i+1).filter(i=>!data.has(`q${i}`));if(missing.length){result.textContent=`還有第 ${missing.join('、')} 題未作答，完成後再送出。`;return;}
 const wrong=answers.map((a,i)=>data.get(`q${i+1}`)===a?null:i).filter(i=>i!==null);
 result.innerHTML=wrong.length?'<strong>再沿著光路觀察一下。</strong>'+wrong.map(i=>`<p>第 ${i+1} 題：${explanations[i]} <a href="${reviewTargets[i]}">回到相關探索</a></p>`).join(''):'<strong>四題都答對了！</strong><p>你能根據光路，解釋成像的位置、大小，以及透鏡如何配合眼睛。</p>';
});quiz.addEventListener('change',()=>result.replaceChildren());quiz.addEventListener('reset',()=>result.replaceChildren());
const route=$('.route'),inner=$('.route-inner'),links=$$('.route a'),sections=links.map(a=>$(a.hash));let active,frame;
function nav(){
 const mobile=matchMedia('(max-width:760px)').matches,threshold=mobile?route.getBoundingClientRect().height+50:160;
 const current=sections.filter(s=>s.getBoundingClientRect().top<=threshold).at(-1)||sections[0],index=sections.indexOf(current);
 links.forEach(a=>a.hash===`#${current.id}`?a.setAttribute('aria-current','step'):a.removeAttribute('aria-current'));
 const count=sections.filter(s=>!s.classList.contains('unit-quiz')).length;$('#route-progress').textContent=current.classList.contains('unit-quiz')?'目前位置：單元小測':`目前位置：第 ${String(index+1).padStart(2,'0')}／${String(count).padStart(2,'0')} 個學習區塊`;
 if(mobile&&current!==active){const l=links[index].getBoundingClientRect(),r=inner.getBoundingClientRect();if(l.left<r.left||l.right>r.right)inner.scrollLeft+=l.left-r.left;}
 active=current;
}
function requestNav(){if(frame)return;frame=requestAnimationFrame(()=>{frame=null;nav();});}
window.addEventListener('scroll',requestNav,{passive:true});window.addEventListener('resize',requestNav);window.addEventListener('hashchange',()=>{jump();nav();});
function jump(){const target=location.hash&&document.getElementById(location.hash.slice(1));if(target){const section=target.closest('.lesson-card,.unit-quiz')||target;const offset=matchMedia('(max-width:760px)').matches?route.getBoundingClientRect().height+22:24;window.scrollTo({top:scrollY+section.getBoundingClientRect().top-offset,behavior:'instant'});}}
links.forEach(a=>a.addEventListener('click',e=>{if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();if(location.hash!==a.hash)history.pushState(null,'',a.hash);jump();nav();}));
window.addEventListener('load',()=>{jump();nav();});nav();
