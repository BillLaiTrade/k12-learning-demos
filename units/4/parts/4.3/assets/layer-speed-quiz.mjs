import {createLayerDeck, layerSnapshot, placeLayer, compareLayers, LAYER_NAMES} from './layer-speed-model.mjs?v=20261104-rank1';

const root=document.querySelector('#rank-lab');
if(root){
  const q=selector=>root.querySelector(selector), svg=q('#rank-scene');
  const play=q('#rank-play'), check=q('#rank-check'), form=q('#quiz');
  const next=document.querySelector('#rank-new'), result=q('#quiz-result'), help=q('#rank-sort-help');
  const slots=[...root.querySelectorAll('[data-rank-slot]')], tokens=[...root.querySelectorAll('[data-rank-medium]')];
  const deck=createLayerDeck(), names=LAYER_NAMES.map(name=>`介質${name}`);
  const defaultHelp='拖曳卡片；也可點選卡片，再選位置。';
  let question=deck.next(), order=[null,null,null], selected=null, revealed=false;
  let state='idle', elapsed=0, startTime=0, frame=0, observed=false, inView=true;
  let drag=null, suppressClickUntil=0, suppressClickTarget=null, project, pixelRatio=1, lastLayout='';
  const photoURL=new URL('./oblique-entry-water.png',import.meta.url).href;
  const line=(a,b)=>`M${a.join(' ')}L${b.join(' ')}`;
  const pointAt=(a,b,f)=>a.map((v,i)=>v+(b[i]-v)*f);
  const direction=(a,b,size)=>{
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(length<1e-8)return '';
    const ux=(b[0]-a[0])/length,uy=(b[1]-a[1])/length,p=pointAt(a,b,.58);
    return `M${p[0]-size*ux-size*.45*uy} ${p[1]-size*uy+size*.45*ux}L${p.join(' ')}L${p[0]-size*ux+size*.45*uy} ${p[1]-size*uy-size*.45*ux}`;
  };

  function buildScene(){
    const narrow=root.closest('.rank-quiz').clientWidth<=650, width=narrow?660:1200, height=narrow?720:580;
    const h=narrow?170:115, top=narrow?175:170, entry=narrow?250:390;
    const left=narrow?20:38, right=narrow?640:948, font=narrow?35:26;
    pixelRatio=svg.clientWidth/width;
    project=p=>[entry+p[0]*h,top+p[1]*h];
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const source=project(question.geometry.points[0]), lampScale=narrow?1.05:1;
    svg.innerHTML=`<title id="rank-scene-title">三層透明介質中的折射光路</title>
      <desc id="rank-scene-desc">尚未發射光束。三層介面互相平行，只比較介質甲、乙、丙。</desc>
      <defs>
        <filter id="rank-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
        <linearGradient id="rank-metal"><stop stop-color="#10191b"/><stop offset=".18" stop-color="#6d7777"/><stop offset=".4" stop-color="#263033"/><stop offset=".78" stop-color="#101719"/><stop offset="1" stop-color="#414b4c"/></linearGradient>
        <linearGradient id="rank-rim"><stop stop-color="#665334"/><stop offset=".3" stop-color="#f4d58d"/><stop offset=".6" stop-color="#b18b47"/><stop offset="1" stop-color="#4b3e28"/></linearGradient>
        <linearGradient id="rank-frame"><stop stop-color="#6d6855"/><stop offset=".2" stop-color="#d9dbcc"/><stop offset=".48" stop-color="#9c9e88"/><stop offset=".68" stop-color="#fff5d7"/><stop offset="1" stop-color="#6f6d56"/></linearGradient>
        <linearGradient id="rank-reflection"><stop stop-color="#fff" stop-opacity=".24"/><stop offset=".12" stop-color="#fff" stop-opacity="0"/><stop offset=".84" stop-color="#fff" stop-opacity=".02"/><stop offset=".9" stop-color="#fff" stop-opacity=".23"/><stop offset="1" stop-color="#fff" stop-opacity=".03"/></linearGradient>
        <radialGradient id="rank-lens-on"><stop stop-color="#fffde4"/><stop offset=".5" stop-color="#ffe286"/><stop offset="1" stop-color="#ad8748"/></radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="#d7ae7e"/>
      <svg width="${width}" height="${height}" viewBox="250 310 750 220" preserveAspectRatio="none" aria-hidden="true"><image class="rank-wood-photo" width="1254" height="1254" href="${photoURL}"/></svg>
      <rect width="${width}" height="${height}" fill="#ffe6bf" opacity=".15"/>
      ${question.geometry.layers.map((layer,i)=>`<g class="rank-medium" data-layer="${i}">
        <rect class="rank-layer" x="${left}" y="${top+i*h}" width="${right-left}" height="${h}" fill="${['#d7e4dc','#b5d7d2','#efd49f'][i]}" fill-opacity="${[.56,.62,.5][i]}"/>
        <rect x="${left+18}" y="${top+(i+.5)*h-25}" width="${narrow?166:166}" height="50" rx="8" fill="#fff9e6" stroke="#b4a06c" stroke-width="1"/>
        <text x="${left+101}" y="${top+(i+.5)*h+font*.35}" text-anchor="middle" font-size="${font}">${names[i]}</text>
        <g class="rank-speed-badge" visibility="hidden"><text x="${left+101}" y="${top+(i+.5)*h+61}" text-anchor="middle" font-size="${font*.82}"></text></g>
      </g>`).join('')}
      <rect x="${left+2}" y="${top+2}" width="${right-left-4}" height="${3*h-4}" fill="url(#rank-reflection)" pointer-events="none"/>
      <path d="M${left-4} ${top-4}V${top+3*h+6}H${right+4}V${top-4}Z" fill="none" stroke="url(#rank-frame)" stroke-width="9"/>
      <path d="M${left+5} ${top+3*h-2}H${right-5}" fill="none" stroke="#fff9dc" stroke-width="2" opacity=".7"/>
      <g class="rank-construction" aria-hidden="true">${question.geometry.layers.map(layer=>{
        const p=project(layer.from),theta=layer.angle*Math.PI/180,r=narrow?65:44;
        return `<g data-rank-construction="${layer.id}" visibility="hidden"><path class="rank-normal" d="M${p[0]} ${p[1]-46}V${p[1]+Math.min(h-8,narrow?114:88)}"/>
          <path class="rank-angle" data-layer="${layer.id}" d="M${p[0]} ${p[1]+r}A${r} ${r} 0 0 0 ${p[0]+r*Math.sin(theta)} ${p[1]+r*Math.cos(theta)}"/>
          ${layer.id===0?`<text x="${p[0]+18}" y="${p[1]-54}" font-size="${font}">法線</text>`:''}</g>`;
      }).join('')}</g>
      <g aria-hidden="true">${question.geometry.segments.map((segment,i)=>`<g class="rank-light-segment" data-segment="${i}"><path class="rank-beam-halo"/><path class="rank-beam"/><path class="rank-beam-core"/><path class="rank-direction"/></g>`).join('')}</g>
      <g aria-hidden="true">
        <rect x="${source[0]-76}" y="${source[1]-29}" width="12" height="${top-12-source[1]+29}" rx="3" fill="url(#rank-rim)"/>
        <ellipse cx="${source[0]-70}" cy="${top-9}" rx="37" ry="8" fill="url(#rank-rim)" stroke="#6c5c39"/>
        <rect x="${source[0]-70}" y="${source[1]-34}" width="43" height="10" rx="3" fill="url(#rank-rim)"/><circle cx="${source[0]-27}" cy="${source[1]-29}" r="7" fill="url(#rank-rim)" stroke="#695430"/>
        <g transform="translate(${source.join(' ')}) rotate(${-question.geometry.incident}) scale(${lampScale})">
          <rect x="-29" y="-69" width="58" height="57" rx="10" fill="url(#rank-metal)" stroke="#182321" stroke-width="2"/>
          <path d="M-20-60V-26M-15-60V-26" stroke="#a5afaa" stroke-width="1.4" opacity=".5"/>
          <rect x="-32" y="-22" width="64" height="13" rx="4" fill="url(#rank-rim)"/>
          <ellipse cy="-5" rx="31" ry="13" fill="url(#rank-rim)" stroke="#443a26" stroke-width="2"/>
          <ellipse class="rank-source-lens" cy="-3" rx="24" ry="8.5" fill="#57716a" stroke="#68573b" stroke-width="1.5"/>
        </g>
      </g>`;
    svg.querySelector('.rank-wood-photo').addEventListener('error',()=>{
      q('#rank-fallback').textContent='目前使用簡化底圖，光路與排序仍可正常操作。';
    },{once:true});
    draw();
  }

  function draw(){
    const snapshot=layerSnapshot(question.geometry,elapsed);
    svg.querySelectorAll('.rank-light-segment').forEach((group,i)=>{
      const segment=snapshot.segments[i],a=project(segment.from),b=project(segment.end);
      const d=segment.fraction>0?line(a,b):'';
      group.dataset.fraction=segment.fraction;
      group.querySelectorAll('path:not(.rank-direction)').forEach(path=>path.setAttribute('d',d));
      const fullEnd=project(segment.to);
      const passed=segment.fraction>.58+8/(pixelRatio*Math.hypot(fullEnd[0]-a[0],fullEnd[1]-a[1]));
      group.querySelector('.rank-direction').setAttribute('d',passed?direction(a,fullEnd,9/pixelRatio):'');
      if(segment.layer>=0)svg.querySelector(`[data-rank-construction="${segment.layer}"]`).setAttribute('visibility',segment.fraction>0?'visible':'hidden');
    });
    svg.querySelector('.rank-source-lens').setAttribute('fill',elapsed>0?'url(#rank-lens-on)':'#57716a');
    const comparison=compareLayers(question.geometry,order);
    svg.querySelectorAll('.rank-angle').forEach(arc=>arc.dataset.emphasis=String(revealed&&snapshot.complete));
    svg.querySelectorAll('.rank-speed-badge').forEach((badge,i)=>{
      const shown=revealed&&comparison.correct&&snapshot.complete;
      badge.setAttribute('visibility',shown?'visible':'hidden');
      badge.querySelector('text').textContent=i===question.geometry.order[0]?'最快':i===question.geometry.order[2]?'最慢':'';
    });
    root.dataset.elapsedMs=elapsed;
    root.dataset.arrived=String(snapshot.complete);
  }

  function controls(){
    root.dataset.state=state;root.dataset.observed=String(observed);
    play.disabled=state==='running'||state==='suspended';
    play.textContent=state==='running'?'光束前進中…':state==='suspended'?'回到畫面後續播':elapsed>0?'▶ 重播光束':'▶ 發射光束';
    check.disabled=!observed||state==='running'||state==='suspended';
    q('#rank-play-state').textContent=state==='running'?'觀察光通過每一層時的方向。':state==='suspended'?'保留目前進度，回到畫面後繼續。':observed?'光路已保留，可直接比較。':'先發射光束，再比較三層光路。';
    const description=q('#rank-scene-desc');
    description.textContent=observed?`三層介面互相平行。${question.geometry.layers.map(layer=>`${names[layer.id]}中的光線與法線夾角約${layer.angle.toFixed(1)}度`).join('；')}。只比較甲、乙、丙，不包括光源所在的空氣。`:'尚未完成發射。三層介面互相平行，只比較介質甲、乙、丙。';
  }
  function stop(){cancelAnimationFrame(frame);frame=0;}
  function tick(now){
    if(state!=='running')return;
    elapsed=Math.min(question.geometry.durationMs,Math.max(0,now-startTime));draw();
    if(elapsed>=question.geometry.durationMs){frame=0;observed=true;state='complete';controls();}
    else frame=requestAnimationFrame(tick);
  }
  function start(restart=true){
    stop();if(restart)elapsed=0;
    state='running';startTime=performance.now()-elapsed;draw();controls();
    if(document.hidden||!inView){state='suspended';controls();}else frame=requestAnimationFrame(tick);
  }
  function suspend(){
    if(state!=='running')return;
    stop();elapsed=Math.min(question.geometry.durationMs,performance.now()-startTime);
    if(elapsed>=question.geometry.durationMs){observed=true;state='complete';}else state='suspended';
    draw();controls();
  }
  function resume(){if(state==='suspended'&&inView&&!document.hidden)start(false);}
  play.addEventListener('click',()=>start(true));
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)resume();else suspend();},{threshold:0}).observe(root);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else resume();});

  function renderOrder(focusSlot=null){
    slots.forEach((button,i)=>{
      const id=order[i];button.dataset.filled=String(id!==null);
      button.setAttribute('aria-pressed',String(id!==null&&selected===id));
      button.setAttribute('aria-label',`第${i+1}個位置${i===0?'，最快':i===2?'，最慢':''}，${id===null?'尚未放入介質':names[id]}`);
      button.innerHTML=id===null?'<span class="rank-slot-placeholder" aria-hidden="true">⇩</span>':`<span class="rank-grip" aria-hidden="true">⠿</span><span>${names[id]}</span>`;
      delete button.dataset.result;
    });
    tokens.forEach((button,i)=>{button.hidden=order.includes(i);button.setAttribute('aria-pressed',String(selected===i));});
    help.textContent=selected===null?defaultHelp:`已選取${names[selected]}，點選排序位置放入。`;
    if(focusSlot!==null)slots[focusSlot].focus({preventScroll:true});
  }
  function changed(){revealed=false;result.textContent='';delete result.dataset.result;draw();}
  function place(medium,slot){order=placeLayer(order,medium,slot);selected=null;changed();renderOrder(slot);}
  function returnLayer(slot){const id=order[slot];order[slot]=null;selected=null;changed();renderOrder();if(id!==null)tokens[id].focus({preventScroll:true});}
  function activate(button){
    if(!button)return;
    if(button.hasAttribute('data-rank-medium')){const id=Number(button.dataset.rankMedium);selected=selected===id?null:id;renderOrder();}
    if(button.hasAttribute('data-rank-slot')){const index=Number(button.dataset.rankSlot);if(selected!==null)place(selected,index);else if(order[index]!==null){selected=order[index];renderOrder();}}
  }
  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-rank-medium],[data-rank-slot]');
    if(event.detail>0&&performance.now()<suppressClickUntil&&button===suppressClickTarget){event.preventDefault();return;}
    activate(button);
  });
  slots.forEach((slot,index)=>slot.addEventListener('keydown',event=>{
    const step=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0;
    if(step){event.preventDefault();const target=Math.max(0,Math.min(2,index+step));if(order[index]!==null)place(order[index],target);else slots[target].focus();}
    if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();returnLayer(index);}
  }));
  root.addEventListener('keydown',event=>{if(event.key==='Escape'){cancelDrag();selected=null;renderOrder();}});

  function dropTarget(event){const element=document.elementFromPoint(event.clientX,event.clientY);return element&&root.contains(element)?element:null;}
  function cancelDrag(){
    if(!drag)return;
    const current=drag;drag=null;current.ghost?.remove();root.removeAttribute('data-dragging');
    slots.forEach(slot=>slot.classList.remove('rank-drop'));
    if(current.button.hasPointerCapture(current.pointerId))current.button.releasePointerCapture(current.pointerId);
  }
  root.addEventListener('pointerdown',event=>{
    if(event.button!==0||drag)return;
    const button=event.target.closest('[data-rank-medium],[data-rank-slot]');if(!button)return;
    const id=button.hasAttribute('data-rank-medium')?Number(button.dataset.rankMedium):order[Number(button.dataset.rankSlot)];
    drag={pointerId:event.pointerId,button,id,x:event.clientX,y:event.clientY,moved:false};button.setPointerCapture(event.pointerId);
  });
  root.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<8)return;
    event.preventDefault();
    if(drag.id===null){drag.moved=true;return;}
    if(!drag.moved){drag.moved=true;drag.ghost=document.createElement('div');drag.ghost.className='rank-drag-ghost';drag.ghost.textContent=names[drag.id];drag.ghost.setAttribute('aria-hidden','true');document.body.append(drag.ghost);root.dataset.dragging='true';}
    drag.ghost.style.left=`${event.clientX}px`;drag.ghost.style.top=`${event.clientY}px`;
    const target=dropTarget(event)?.closest('[data-rank-slot]');slots.forEach(slot=>slot.classList.toggle('rank-drop',slot===target));
  });
  root.addEventListener('pointerup',event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    if(drag.moved&&drag.id===null){cancelDrag();return;}
    if(drag.moved){
      event.preventDefault();suppressClickUntil=performance.now()+400;suppressClickTarget=drag.button;
      const target=dropTarget(event),slot=target?.closest('[data-rank-slot]'),id=drag.id;
      cancelDrag();
      if(slot)place(id,Number(slot.dataset.rankSlot));
      else if(target?.closest('.rank-pool')&&order.includes(id))returnLayer(order.indexOf(id));
    }else if(event.pointerType==='touch'){
      // Mobile browsers can drop the first compatibility click after a drag.
      // Activate a real tap on pointerup, suppressing only its duplicate click.
      const button=drag.button;cancelDrag();event.preventDefault();
      suppressClickUntil=performance.now()+400;suppressClickTarget=button;activate(button);
    }else cancelDrag();
  });
  root.addEventListener('pointercancel',cancelDrag);
  root.addEventListener('lostpointercapture',()=>{if(drag?.moved)cancelDrag();});
  window.addEventListener('blur',cancelDrag);

  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!observed||state==='running'||state==='suspended'){result.textContent='先發射光束，觀察完整光路後再確認。';return;}
    const comparison=compareLayers(question.geometry,order);
    if(!comparison.complete){result.textContent='還有位置未放入介質，排好三個位置後再確認。';return;}
    revealed=true;result.dataset.result=comparison.correct?'correct':'retry';
    result.textContent=comparison.correct?`排序正確。光速由快到慢為${question.geometry.order.map(id=>LAYER_NAMES[id]).join('、')}；夾角越大，光速越快。`:'再比較一下：三層介面平行，光線與法線的夾角越大，光速越快。';
    slots.forEach((slot,i)=>slot.dataset.result=comparison.positions[i]?'correct':'retry');draw();
  });
  next.addEventListener('click',()=>{
    cancelDrag();stop();question=deck.next();order=[null,null,null];selected=null;revealed=false;
    state='idle';elapsed=0;observed=false;result.textContent='';delete result.dataset.result;
    root.dataset.question=question.id;renderOrder();buildScene();controls();
  });
  new ResizeObserver(()=>{
    const layout=`${svg.clientWidth}`;
    if(layout!==lastLayout){lastLayout=layout;buildScene();controls();}
  }).observe(svg.parentElement);
  next.disabled=false;tokens.forEach(button=>button.disabled=false);slots.forEach(button=>button.disabled=false);
  q('#rank-fallback').textContent='';root.dataset.question=question.id;root.dataset.ready='true';renderOrder();buildScene();controls();
}
