const $ = (selector) => document.querySelector(selector);
const NS = 'http://www.w3.org/2000/svg';
const defs = `<defs>
  <linearGradient id="wall" x2="0" y2="1"><stop stop-color="#e8eee8"/><stop offset=".62" stop-color="#f3f0e5"/><stop offset="1" stop-color="#ded9c8"/></linearGradient>
  <linearGradient id="wood" x2="0" y2="1"><stop stop-color="#d8b786"/><stop offset=".38" stop-color="#c39a68"/><stop offset="1" stop-color="#9c7148"/></linearGradient>
  <linearGradient id="edge" x2="0" y2="1"><stop stop-color="#e1c79d"/><stop offset="1" stop-color="#79593b"/></linearGradient>
  <linearGradient id="metal" x2="1" y2="1"><stop stop-color="#d7dfd7"/><stop offset=".42" stop-color="#7c9188"/><stop offset="1" stop-color="#435a52"/></linearGradient>
  <radialGradient id="orb" cx="32%" cy="25%"><stop stop-color="#f4fff4"/><stop offset=".2" stop-color="#93b7a5"/><stop offset=".57" stop-color="#395e50"/><stop offset="1" stop-color="#152b27"/></radialGradient>
  <radialGradient id="lampGlow"><stop stop-color="#fff8c9" stop-opacity=".95"/><stop offset=".28" stop-color="#ffdc78" stop-opacity=".32"/><stop offset="1" stop-color="#ffdc78" stop-opacity="0"/></radialGradient>
  <radialGradient id="spot"><stop stop-color="#fffdf1"/><stop offset=".4" stop-color="#fff0a8"/><stop offset="1" stop-color="#e3aa43"/></radialGradient>
  <filter id="soft"><feGaussianBlur stdDeviation="11"/></filter><filter id="shadow"><feGaussianBlur stdDeviation="7"/></filter>
  <pattern id="grain" width="150" height="54" patternUnits="userSpaceOnUse"><path d="M0 13Q35 5 76 13T150 12M-20 35Q25 28 67 37T160 32" fill="none" stroke="#704d2e" stroke-opacity=".12" stroke-width="2"/><path d="M20 48Q65 44 106 49" fill="none" stroke="#fff3d9" stroke-opacity=".18"/></pattern>
</defs>`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function svgFrame(inner, view) {
  const zoom = view.zoom, yaw = view.yaw;
  return `<svg viewBox="0 0 900 500" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${defs}<rect width="900" height="500" fill="url(#wall)"/><g opacity=".15"><path d="M70 114h760M70 184h760" stroke="#82938a" stroke-width="10"/><path d="M145 80v34m72-25v25m475-37v37m70-29v29" stroke="#85968a" stroke-width="22"/></g><g transform="translate(450 260) rotate(${yaw}) scale(${zoom}) translate(-450 -260)">${inner}</g><path d="M0 461H900" stroke="#c6c1af" stroke-width="2" opacity=".55"/></svg>`;
}
function bench() { return `<ellipse cx="460" cy="421" rx="385" ry="37" fill="#3a3025" opacity=".16" filter="url(#shadow)"/><path d="M56 335 760 276 852 340 150 414Z" fill="url(#wood)" stroke="#916c48" stroke-width="3"/><path d="m56 335 704-59 92 64-702 74Z" fill="url(#grain)" opacity=".8"/><path d="m150 414 702-74v15l-702 75Z" fill="url(#edge)"/><path d="m56 335 94 79v15l-94-81Z" fill="#8a6544"/>`; }
function lamp(x,y=290){return `<ellipse cx="${x}" cy="${y}" rx="82" ry="82" fill="url(#lampGlow)"/><path d="M${x-17} ${y+101}h34l-4-95h-26Z" fill="#263a34"/><path d="m${x-28} ${y+101} 56 0 13 16h-82Z" fill="#182c27"/><path d="M${x-14} ${y+6}q14-23 28 0v16h-28Z" fill="#d6a83f"/><ellipse cx="${x}" cy="${y+7}" rx="12" ry="8" fill="#fff1b2"/>`; }
function sphere(x,y,r=34){return `<g data-drag="object" style="cursor:grab"><ellipse cx="${x+8}" cy="${y+r+15}" rx="${r*1.1}" ry="9" fill="#26382f" opacity=".25" filter="url(#shadow)"/><path d="M${x-8} ${y+r-1}v36m-24 2h48v13h-48Z" fill="url(#metal)"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#orb)" stroke="#d7e0d5" stroke-width="4"/><ellipse cx="${x-r*.28}" cy="${y-r*.35}" rx="${r*.2}" ry="${r*.13}" fill="#f1fff1" opacity=".55"/></g>`; }
function screen(x, y=181, h=190, shadowR=0){return `<path d="M${x} ${y}h16v${h}h-16Zm88 0h16v${h}h-16Z" fill="#556c61"/><path d="M${x-9} ${y-8}h122v${h+12}h-122Z" fill="none" stroke="#60746a" stroke-width="9"/><rect x="${x}" y="${y}" width="104" height="${h}" rx="2" fill="#f8f6e9" stroke="#e2dfd0" stroke-width="4"/><ellipse cx="${x+52}" cy="${y+h*.52}" rx="${shadowR}" ry="${shadowR*.82}" fill="#303c37" opacity="${shadowR ? .78 : 0}"/>`; }
function addDrag(stage, config){
  let drag=null; const pointers=new Map();
  stage.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return; const target=e.target.closest('[data-drag]'); drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,kind:target?.dataset.drag||'view',index:Number(target?.dataset.index||0)}; stage.classList.add('is-dragging'); stage.setPointerCapture(e.pointerId); pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});});
  stage.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const b=stage.getBoundingClientRect(),dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY;drag.lastX=e.clientX;drag.lastY=e.clientY;config.move(drag,dx,dy,b);});
  const end=e=>{if(drag?.id===e.pointerId){drag=null;stage.classList.remove('is-dragging');}};
  stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);
  stage.addEventListener('wheel',e=>{e.preventDefault();config.zoom(e.deltaY<0?1.08:.92);},{passive:false});
  stage.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='='){config.zoom(1.1);e.preventDefault();}else if(e.key==='-'){config.zoom(.9);e.preventDefault();}});
}
function installAperture(){
 const stage=$('#aperture-3d-scene');if(!stage)return;
 const input=$('#aperture-offset'), output=$('#aperture-offset-output'),result=$('#aperture-result'),observation=$('#aperture-xiaokui-observation');
 const names=['小孔板 1','中間板','小孔板 3'];let heights=[0,.3,0],xs=[260,425,590],selected=1,view={yaw:0,zoom:1};
 const render=()=>{const holes=heights.map(v=>290-v*130),miss=Math.max(...holes)-Math.min(...holes),aligned=miss<13,light=miss<30?Math.max(0,1-miss/35):0;let s=bench();
  s+=`<path d="M160 291 722 ${aligned?291:holes[1]} 776 291 716 292Z" fill="#ffe38a" opacity="${aligned?.25:.08}"/><path d="M158 290H753" stroke="#ffe9a8" stroke-width="${aligned?5:2}" opacity="${light*.9}" stroke-dasharray="9 9"/>${lamp(130,290)}`;
  s+=`<path d="M744 187h12v195h-12Zm31 0h12v195h-12Z" fill="#87958a"/><rect x="756" y="187" width="20" height="195" fill="#f8f6ea" stroke="#7d8c80" stroke-width="3"/>`;
  if(light>0)s+=`<circle cx="766" cy="290" r="${6+light*7}" fill="url(#spot)" opacity="${light}"/><circle cx="766" cy="290" r="${12+light*18}" fill="url(#lampGlow)" opacity="${light}"/>`;
  xs.forEach((x,i)=>{const y=holes[i],active=selected===i;s+=`<g data-drag="plate" data-index="${i}" style="cursor:ns-resize"><ellipse cx="${x+7}" cy="390" rx="34" ry="8" fill="#26352f" opacity=".2"/><path d="M${x-4} 388v-30m8 30v-30" stroke="#53675e" stroke-width="5"/><path d="M${x-46} ${y-72}h92v144h-92Z" fill="${active?'#345448':'#243530'}" stroke="${active?'#e4bd63':'#91a197'}" stroke-width="${active?5:3}"/><path d="M${x-38} ${y-63}h76v126h-76Z" fill="#263833"/><ellipse cx="${x}" cy="${y}" rx="14" ry="18" fill="${aligned?'#ffe8a1':'#111d1a'}" stroke="#dfca8b" stroke-width="4"/><path d="M${x-43} ${y-68}h7v136h-7Zm79 0h7v136h-7Z" fill="#7f9589" opacity=".7"/></g>`;});
  s+=`<text x="126" y="450" class="label">光源</text><text x="766" y="450" class="label">屏幕</text><text x="450" y="462" text-anchor="middle" class="hint">拖曳孔板上下調整；拖曳空白處轉動視角</text>`;
  stage.innerHTML=svgFrame(s,view).replace('</svg>','<style>.label{font:700 18px system-ui;fill:#34554a;text-anchor:middle}.hint{font:15px system-ui;fill:#607168}</style></svg>');
  const lit=miss<30;result.classList.toggle('is-blocked',!lit);result.querySelector('span:last-child').textContent=miss<13?'三個小孔排成一直線，屏幕上出現清楚的亮點。':lit?'小孔稍微偏離直線，屏幕上的亮點變暗。':'小孔沒有排成一直線，光被孔板擋住，屏幕亮點消失。';observation.textContent=miss<13?'三個小孔排成一直線時，光可以穿過孔板，在屏幕上形成亮點。':lit?'小孔稍微偏離直線時，屏幕上的亮點變暗了。':'小孔偏離太多，光沒有繞過孔板，屏幕上的亮點消失了。';
  document.querySelectorAll('[data-plate]').forEach((b,i)=>{b.setAttribute('aria-pressed',String(selected===i));b.setAttribute('aria-label',`${names[i]}，${Math.abs(heights[i])<.18?'接近對齊':'高度已偏移'}`)});
  input.value=String(Math.round(heights[selected]/.62*100));const val=Number(input.value);output.textContent=Math.abs(val)<4?'標準高度':`${val>0?'上移':'下移'} ${Math.abs(val)}%`;output.classList.toggle('is-standard',Math.abs(val)<4);
 };
 const resetView=()=>{view={yaw:0,zoom:1};render()};
 document.querySelectorAll('[data-plate]').forEach(b=>b.addEventListener('click',()=>{selected=Number(b.dataset.plate);render()}));
 input.addEventListener('input',()=>{heights[selected]=Number(input.value)/100*.62;render()});
 $('#aperture-reset').addEventListener('click',()=>{heights=[0,.3,0];xs=[260,425,590];selected=1;render()});$('#aperture-view-reset').addEventListener('click',resetView);
 addDrag(stage,{move:(d,dx,dy,b)=>{if(d.kind==='plate'){heights[d.index]=Math.max(-.62,Math.min(.62,heights[d.index]-dy/b.height*.9));xs[d.index]=Math.max(205,Math.min(640,xs[d.index]+dx/b.width*900));selected=d.index;}else view.yaw=Math.max(-10,Math.min(10,view.yaw+dx*.12));render()},zoom:f=>{view.zoom=Math.max(.82,Math.min(1.25,view.zoom*f));render()}});render();
}
function installShadow(){
 const stage=$('#shadow-3d-scene');if(!stage)return;const status=$('#shadow-scene-status'),obs=$('#shadow-xiaokui-observation'),toggle=$('#shadow-block-toggle'),label=$('#shadow-toggle-label');let x=652,view={yaw:0,zoom:1};
 const draw=()=>{const blocked=x<535;const shadowRx=blocked?Math.max(24,100-(x-400)*.22):0;let s=bench();s+=`<path d="M174 286 748 204 748 328Z" fill="#ffe49a" opacity=".16"/><path d="M174 286 748 204M174 286 748 328" stroke="#ffe6a0" stroke-width="2" opacity=".68" stroke-dasharray="10 8"/>${lamp(166,285)}${screen(738,190,190,shadowRx)}<path d="M130 405h590" stroke="#536c60" stroke-width="8" stroke-linecap="round"/><path d="M150 397v16m80-19v16m80-19v16m80-19v16m80-19v16m80-19v16m80-19v16" stroke="#b8c1b6" stroke-width="3"/>${sphere(x,285,34)}<text x="166" y="451" class="label">固定光源</text><text x="790" y="451" class="label">固定屏幕</text><text x="450" y="472" text-anchor="middle" class="hint">拖曳球體進入或離開光路</text>`;stage.innerHTML=svgFrame(s,view).replace('</svg>','<style>.label{font:700 17px system-ui;fill:#34554a;text-anchor:middle}.hint{font:15px system-ui;fill:#607168}</style></svg>');toggle.setAttribute('aria-pressed',String(blocked));toggle.setAttribute('aria-label',blocked?'將遮擋球沿導軌滑出光路':'將遮擋球沿導軌滑入光路');label.textContent=blocked?'滑出光路':'滑入光路';status.textContent=blocked?'球擋住光路，屏幕上形成影子。':'球停在光路旁，屏幕均勻受光。';obs.textContent=blocked?'球擋住光線後，光照不到的地方就在屏幕上形成影子。':'球移到光路旁後，光線照到屏幕，影子消失了。'};
 toggle.addEventListener('click',()=>{x=x<535?652:455;draw()});$('#shadow-view-reset').addEventListener('click',()=>{view={yaw:0,zoom:1};draw()});
 addDrag(stage,{move:(d,dx)=>{if(d.kind==='object')x=Math.max(285,Math.min(665,x+dx/stage.clientWidth*900));else view.yaw=Math.max(-10,Math.min(10,view.yaw+dx*.12));draw()},zoom:f=>{view.zoom=Math.max(.82,Math.min(1.25,view.zoom*f));draw()}});
 stage.addEventListener('pointerdown',e=>{if(e.target.closest('[data-drag="object"]'))e.preventDefault()});draw();
}
function installShadowSize(){
 const stage=$('#shadow-size-3d-scene');if(!stage)return;const status=$('#shadow-size-scene-status'),feedback=$('#shadow-size-feedback'),obs=$('#shadow-size-xiaokui-observation');let x=330,view={yaw:0,zoom:1},moved=false;
 const draw=()=>{const source=160,screenX=740,ratio=(screenX-source)/(x-source),r=Math.max(15,Math.min(130,34*ratio));let s=bench();s+=`<path d="M${source} 290 ${screenX} ${290-r*.82} ${screenX} ${290+r*.82}Z" fill="#ffe49a" opacity=".14"/><path d="M${source} 290 ${screenX} ${290-r*.82}M${source} 290 ${screenX} ${290+r*.82}" stroke="#ffe6a0" stroke-width="2" opacity=".58" stroke-dasharray="9 8"/>${lamp(source,290)}<path d="M130 405h590" stroke="#536c60" stroke-width="8" stroke-linecap="round"/><path d="M150 397v16m80-19v16m80-19v16m80-19v16m80-19v16m80-19v16m80-19v16" stroke="#b8c1b6" stroke-width="3"/>${screen(screenX,190,190,r)}${sphere(x,290,34)}<text x="160" y="451" class="label">光源</text><text x="790" y="451" class="label">屏幕</text><text x="450" y="472" text-anchor="middle" class="hint">沿導軌移動球體，比較影子大小</text>`;stage.innerHTML=svgFrame(s,view).replace('</svg>','<style>.label{font:700 17px system-ui;fill:#34554a;text-anchor:middle}.hint{font:15px system-ui;fill:#607168}</style></svg>');status.textContent=x<410?'球體靠近光源，屏幕上的影子較大。':x>540?'球體遠離光源，屏幕上的影子較小。':'球體在光源和屏幕之間移動，影子大小正在改變。';feedback.textContent=moved?'球體越靠近光源，屏幕上的影子越大；越靠近屏幕，影子越小。':'拖曳球體沿導軌前後移動，比較屏幕上影子的大小。';obs.textContent=x<410?'球靠近光源時，屏幕上的影子變大了。':x>540?'球遠離光源、靠近屏幕時，屏幕上的影子變小了。':'移動球體時，屏幕上的影子大小也跟著改變。'};
 $('#shadow-size-view-reset').addEventListener('click',()=>{view={yaw:0,zoom:1};draw()});addDrag(stage,{move:(d,dx)=>{if(d.kind==='object'){x=Math.max(260,Math.min(635,x+dx/stage.clientWidth*900));moved=true;}else view.yaw=Math.max(-10,Math.min(10,view.yaw+dx*.12));draw()},zoom:f=>{view.zoom=Math.max(.82,Math.min(1.25,view.zoom*f));draw()}});draw();
}
installAperture();installShadow();installShadowSize();
