import {createLayerDeck, layerSnapshot, placeLayer, compareLayers, LAYER_NAMES} from './layer-speed-model.mjs?v=20261104-four1';

const root=document.querySelector('#rank-lab');
if(root){
  const q=selector=>root.querySelector(selector), svg=q('#rank-scene');
  const play=q('#rank-play'), sourceTrigger=q('#rank-source-trigger'), check=q('#rank-check'), form=q('#quiz');
  const next=document.querySelector('#rank-new'), result=q('#quiz-result'), help=q('#rank-sort-help');
  const slots=[...root.querySelectorAll('[data-rank-slot]')], tokens=[...root.querySelectorAll('[data-rank-medium]')];
  const deck=createLayerDeck(), names=LAYER_NAMES.map(name=>`介質${name}`);
  const defaultHelp='拖曳卡片；也可點選卡片，再選位置。';
  let question=deck.next(), order=names.map(()=>null), selected=null, revealed=false;
  let state='idle', elapsed=0, startTime=0, frame=0, observed=false, inView=true;
  let drag=null, suppressClickUntil=0, suppressClickTarget=null, project, pixelRatio=1, lastLayout='';
  const photoURLs=Object.fromEntries(['wide','tall','source'].map(key=>[key,new URL(`./layer-quiz-${key==='source'?'source':`bench-${key}`}.png`,import.meta.url).href]));
  photoURLs.materials=new URL('./light-speed-bench.png',import.meta.url).href;
  const materialRows={gas:{x:560,y:141,width:980,height:88},liquid:{x:540,y:285,width:1000,height:121},solid:{x:540,y:457,width:1000,height:139}};
  const kindNames={gas:'氣體',liquid:'液體',solid:'固體'};
  const photos=new Map();let backgroundKey='wide';
  function updateTextures(){
    const background=photos.get(backgroundKey)?.state||'loading',source=photos.get('source')?.state||'loading',materials=photos.get('materials')?.state||'loading';
    root.dataset.backgroundReady=String(background==='ready');root.dataset.sourceReady=String(source==='ready');root.dataset.materialsReady=String(materials==='ready');
    root.dataset.texture=[background,source,materials].includes('loading')?'loading':[background,source,materials].includes('fallback')?'fallback':'ready';
    q('#rank-fallback').textContent=root.dataset.texture==='fallback'?'目前使用簡化底圖，光路與排序仍可正常操作。':'';
  }
  function loadPhoto(key){
    if(photos.has(key))return;
    const image=new Image(),record={image,state:'loading'};photos.set(key,record);
    const timeout=setTimeout(()=>{record.state='fallback';updateTextures();},10000);
    image.onload=()=>{clearTimeout(timeout);record.state='ready';updateTextures();};
    image.onerror=()=>{clearTimeout(timeout);record.state='fallback';updateTextures();};
    image.src=photoURLs[key];
  }
  const line=(a,b)=>`M${a.join(' ')}L${b.join(' ')}`;
  const pointAt=(a,b,f)=>a.map((v,i)=>v+(b[i]-v)*f);
  const direction=(a,b,size)=>{
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(length<1e-8)return '';
    const ux=(b[0]-a[0])/length,uy=(b[1]-a[1])/length,p=pointAt(a,b,.58);
    return `M${p[0]-size*ux-size*.45*uy} ${p[1]-size*uy+size*.45*ux}L${p.join(' ')}L${p[0]-size*ux+size*.45*uy} ${p[1]-size*uy-size*.45*ux}`;
  };

  function buildScene(){
    const narrow=root.closest('.rank-quiz').clientWidth<=650, width=narrow?660:1200, height=narrow?720:600;
    const top=narrow?199:190,bottom=narrow?609:494,h=(bottom-top)/names.length,entry=narrow?280:400;
    const left=narrow?59:70,right=narrow?600:915,font=narrow?35:26;
    backgroundKey=narrow?'tall':'wide';loadPhoto(backgroundKey);loadPhoto('source');loadPhoto('materials');updateTextures();
    pixelRatio=svg.clientWidth/width;
    project=p=>[entry+p[0]*h,top+p[1]*h];
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const source=project(question.geometry.points[0]), lampScale=1;
    svg.innerHTML=`<title id="rank-scene-title">四層透明介質中的折射光路</title>
      <desc id="rank-scene-desc">尚未發射光束。四層介面互相平行，只比較介質甲、乙、丙、丁。</desc>
      <defs>
        <filter id="rank-object-shadow" x="-35%" y="-35%" width="170%" height="180%"><feDropShadow dx="1" dy="4" stdDeviation="3" flood-color="#44301b" flood-opacity=".32"/></filter>
        <filter id="rank-label-shadow" x="-15%" y="-25%" width="135%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-color="#67502b" flood-opacity=".28"/></filter>
        <linearGradient id="rank-ivory" x2=".15" y2="1"><stop stop-color="#fffef4"/><stop offset=".55" stop-color="#fff8df"/><stop offset="1" stop-color="#ecdfb9"/></linearGradient>
        ${[['#e3f4ef','#bfd5cf'],['#b6e0e6','#91bfc4'],['#fae4b9','#d9bc86']].map((colours,i)=>`<linearGradient id="rank-medium-fill-${['gas','liquid','solid'][i]}" x2="0" y2="1"><stop stop-color="${colours[0]}" stop-opacity="${i===1?.46:.3}"/><stop offset=".52" stop-color="${colours[1]}" stop-opacity="${i===1?.43:.25}"/><stop offset="1" stop-color="${colours[1]}" stop-opacity="${i===1?.54:.36}"/></linearGradient>`).join('')}
        <filter id="rank-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
        <linearGradient id="rank-metal"><stop stop-color="#10191b"/><stop offset=".18" stop-color="#6d7777"/><stop offset=".4" stop-color="#263033"/><stop offset=".78" stop-color="#101719"/><stop offset="1" stop-color="#414b4c"/></linearGradient>
        <linearGradient id="rank-rim"><stop stop-color="#665334"/><stop offset=".3" stop-color="#f4d58d"/><stop offset=".6" stop-color="#b18b47"/><stop offset="1" stop-color="#4b3e28"/></linearGradient>
        <linearGradient id="rank-frame"><stop stop-color="#6d6855"/><stop offset=".2" stop-color="#d9dbcc"/><stop offset=".48" stop-color="#9c9e88"/><stop offset=".68" stop-color="#fff5d7"/><stop offset="1" stop-color="#6f6d56"/></linearGradient>
        <linearGradient id="rank-reflection"><stop stop-color="#fff" stop-opacity=".24"/><stop offset=".12" stop-color="#fff" stop-opacity="0"/><stop offset=".84" stop-color="#fff" stop-opacity=".02"/><stop offset=".9" stop-color="#fff" stop-opacity=".23"/><stop offset="1" stop-color="#fff" stop-opacity=".03"/></linearGradient>
        <radialGradient id="rank-lens-on"><stop stop-color="#fffde4"/><stop offset=".5" stop-color="#ffe286"/><stop offset="1" stop-color="#ad8748"/></radialGradient>
      </defs>
      <g class="rank-bench-fallback" aria-hidden="true">
        <rect width="${width}" height="${height}" rx="16" fill="#d7ac72"/>
        <path d="M8 12H${width-8}M8 30H${width-8}M8 ${height-28}H${width-8}" stroke="#f8d79f" stroke-width="2" opacity=".5"/>
        <rect x="${left}" y="${top}" width="${right-left}" height="${bottom-top}" fill="#f4f7dc" opacity=".18"/>
        <path d="M${left-4} ${top-4}V${bottom+6}H${right+4}V${top-4}Z" fill="none" stroke="url(#rank-frame)" stroke-width="9"/>
      </g>
      <image class="rank-bench-photo" x="0" y="0" width="${width}" height="${height}" href="${photoURLs[backgroundKey]}" preserveAspectRatio="none" aria-hidden="true"/>
      ${question.geometry.layers.map((layer,i)=>{
        const cy=top+(i+.5)*h,plateX=left+18,plateWidth=190,kind=question.materials[i].kind,texture=materialRows[kind];
        const cropWidth=narrow?Math.min(texture.width,texture.height*(right-left)/h):texture.width;
        const cropX=texture.x+(texture.width-cropWidth)*(kind==='solid'?.67:.5);
        const crop=`${cropX} ${texture.y} ${cropWidth} ${texture.height}`;
        return `<g class="rank-medium" data-layer="${i}" data-material-kind="${kind}">
        <rect class="rank-layer" x="${left}" y="${top+i*h}" width="${right-left}" height="${h}" fill="url(#rank-medium-fill-${kind})"/>
        <svg class="rank-material-photo" x="${left}" y="${top+i*h}" width="${right-left}" height="${h}" viewBox="${crop}" preserveAspectRatio="none" aria-hidden="true"><image class="rank-material-image" href="${photoURLs.materials}" width="2022" height="778"/></svg>
        ${i>0?`<path class="rank-interface" d="M${left} ${top+i*h}H${right}"/>`:''}
        <g class="rank-nameplate" filter="url(#rank-label-shadow)" aria-hidden="true">
          <path d="M${plateX+8} ${cy-26}H${plateX+plateWidth-8}L${plateX+plateWidth} ${cy-18}V${cy+18}L${plateX+plateWidth-8} ${cy+26}H${plateX+8}L${plateX} ${cy+18}V${cy-18}Z" fill="url(#rank-ivory)" stroke="#b2985c" stroke-width="1.2"/>
          <path d="M${plateX+10} ${cy-23}H${plateX+plateWidth-10}" stroke="#fffef5" stroke-width="1.7"/>
          ${[plateX+9,plateX+plateWidth-9].map(x=>`<circle cx="${x}" cy="${cy}" r="3.1" fill="url(#rank-rim)" stroke="#a58c4e" stroke-width=".5"/><path d="M${x-1.6} ${cy}h3.2" stroke="#8f753c" stroke-width=".7"/>`).join('')}
        </g>
        <text class="rank-medium-name" data-center-x="${left+113}" data-compact-x="${left+77}" x="${left+113}" y="${cy+font*.35}" text-anchor="middle" font-size="${font}">${names[i]}</text>
        <g class="rank-speed-badge" visibility="hidden"><text x="${left+174}" y="${cy+font*.27}" text-anchor="middle" font-size="${font*.72}"></text></g>
      </g>`;}).join('')}
      <g class="rank-construction" aria-hidden="true">${question.geometry.layers.map(layer=>{
        const p=project(layer.from),theta=layer.angle*Math.PI/180,r=Math.min(narrow?65:44,h*.54);
        return `<g data-rank-construction="${layer.id}" visibility="hidden"><path class="rank-normal" d="M${p[0]} ${p[1]-Math.min(h*.2,20)}V${p[1]+Math.min(h-8,narrow?114:88)}"/>
          <path class="rank-angle" data-layer="${layer.id}" d="M${p[0]} ${p[1]+r}A${r} ${r} 0 0 0 ${p[0]+r*Math.sin(theta)} ${p[1]+r*Math.cos(theta)}"/>
          <text class="rank-angle-value" data-layer="${layer.id}" x="${p[0]+r*Math.sin(theta)+18}" y="${p[1]+r*Math.cos(theta)}" font-size="${font}" visibility="hidden">${layer.angle.toFixed(1)}°</text>
          ${layer.id===0?`<text x="${p[0]+18}" y="${p[1]-28}" font-size="${font}">法線</text>`:''}</g>`;
      }).join('')}</g>
      <g aria-hidden="true">${question.geometry.segments.map((segment,i)=>`<g class="rank-light-segment" data-segment="${i}"><path class="rank-beam-halo"/><path class="rank-beam"/><path class="rank-beam-core"/><path class="rank-direction"/></g>`).join('')}</g>
      <g class="rank-source-device" aria-hidden="true">
        <g filter="url(#rank-object-shadow)">
          <ellipse cx="${source[0]-78}" cy="${top-11}" rx="43" ry="10" fill="#543a21" opacity=".25"/>
          <ellipse cx="${source[0]-78}" cy="${top-17}" rx="39" ry="10" fill="#56482b" stroke="#9a793d"/>
          <ellipse cx="${source[0]-78}" cy="${top-20}" rx="37" ry="7" fill="url(#rank-rim)" stroke="#c7ab67"/>
          <rect x="${source[0]-85}" y="${source[1]-43}" width="14" height="${top-23-source[1]+43}" rx="3" fill="url(#rank-frame)" stroke="#817a59" stroke-width=".7"/>
          <path d="M${source[0]-82} ${source[1]-39}V${top-26}" stroke="#fff4bd" stroke-width="1.5" opacity=".75"/>
          <rect x="${source[0]-90}" y="${source[1]-47}" width="25" height="15" rx="3" fill="url(#rank-metal)" stroke="#8b8c74"/>
          <circle cx="${source[0]-78}" cy="${source[1]-39}" r="3.1" fill="url(#rank-rim)"/>
          <rect x="${source[0]-78}" y="${source[1]-46}" width="48" height="10" rx="3" fill="url(#rank-frame)" stroke="#7f7252" stroke-width=".7"/>
          <circle cx="${source[0]-31}" cy="${source[1]-41}" r="11" fill="url(#rank-rim)" stroke="#6e5730"/>
          <circle cx="${source[0]-31}" cy="${source[1]-41}" r="6" fill="#4e5143" stroke="#d9c790"/>
        </g>
        <g class="rank-source-optic" transform="translate(${source.join(' ')}) rotate(${-question.geometry.incident}) scale(${lampScale})">
          <g class="rank-source-fallback"><rect x="-29" y="-69" width="58" height="57" rx="10" fill="url(#rank-metal)"/><ellipse cy="-3" rx="31" ry="13" fill="url(#rank-rim)"/><ellipse cy="-3" rx="24" ry="8.5" fill="#57716a"/></g>
          <image class="rank-source-photo" x="-55" y="-128" width="111" height="141.7" href="${photoURLs.source}" preserveAspectRatio="none"/>
          <ellipse class="rank-source-lens" cx="0" cy="0" rx="26" ry="6.5" fill="url(#rank-lens-on)" opacity="0"/>
        </g>
      </g>`;
    const lampBox=svg.querySelector('.rank-source-photo').getBoundingClientRect(),stageBox=svg.parentElement.getBoundingClientRect();
    Object.assign(sourceTrigger.style,{left:`${lampBox.left-stageBox.left}px`,top:`${lampBox.top-stageBox.top}px`,width:`${lampBox.width}px`,height:`${lampBox.height}px`});
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
    svg.querySelector('.rank-source-lens').setAttribute('opacity',elapsed>0?'.82':'0');
    const comparison=compareLayers(question.geometry,order);
    svg.querySelectorAll('.rank-angle').forEach(arc=>arc.dataset.emphasis=String(revealed&&snapshot.complete));
    svg.querySelectorAll('.rank-angle-value').forEach(label=>label.setAttribute('visibility',snapshot.complete?'visible':'hidden'));
    svg.querySelectorAll('.rank-speed-badge').forEach((badge,i)=>{
      const shown=revealed&&comparison.correct&&snapshot.complete;
      const label=i===question.geometry.order[0]?'最快':i===question.geometry.order.at(-1)?'最慢':'';
      badge.setAttribute('visibility',shown&&label?'visible':'hidden');
      badge.querySelector('text').textContent=label;
      const name=badge.parentElement.querySelector('.rank-medium-name');
      name.setAttribute('x',shown&&label?name.dataset.compactX:name.dataset.centerX);
    });
    root.dataset.elapsedMs=elapsed;
    root.dataset.arrived=String(snapshot.complete);
  }

  function controls(){
    root.dataset.state=state;root.dataset.observed=String(observed);
    play.disabled=state==='running'||state==='suspended';
    sourceTrigger.disabled=play.disabled;
    sourceTrigger.setAttribute('aria-label',play.disabled?'光束前進中（照射燈）':elapsed>0?'重播光束（照射燈）':'發射光束（照射燈）');
    sourceTrigger.title=elapsed>0?'點擊照射燈重播光束':'點擊照射燈發射光束';
    play.textContent=state==='running'?'光束前進中…':state==='suspended'?'回到畫面後續播':elapsed>0?'▶ 重播光束':'▶ 發射光束';
    check.disabled=!observed||state==='running'||state==='suspended';
    q('#rank-play-state').textContent=state==='running'?'觀察光通過每一層時的方向。':state==='suspended'?'保留目前進度，回到畫面後繼續。':observed?'光路已保留，可直接比較。':'先發射光束，再比較四層光路。';
    const description=q('#rank-scene-desc');
    description.textContent=observed?`四層介面互相平行。${question.geometry.layers.map(layer=>`${names[layer.id]}為${kindNames[question.materials[layer.id].kind]}，其中光線與法線夾角約${layer.angle.toFixed(1)}度`).join('；')}。只比較甲、乙、丙、丁，不包括光源所在的空氣。`:'尚未完成發射。四層介面互相平行，只比較介質甲、乙、丙、丁。';
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
  sourceTrigger.addEventListener('click',()=>{if(!sourceTrigger.disabled)start(true);});
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)resume();else suspend();},{threshold:0}).observe(root);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else resume();});

  function renderOrder(focusSlot=null){
    slots.forEach((button,i)=>{
      const id=order[i];button.dataset.filled=String(id!==null);
      button.setAttribute('aria-pressed',String(id!==null&&selected===id));
      button.setAttribute('aria-label',`第${i+1}個位置${i===0?'，最快':i===names.length-1?'，最慢':''}，${id===null?'尚未放入介質':names[id]}`);
      const position=`<span class="rank-slot-position" aria-hidden="true">${i+1}${i===0?' · 最快':i===names.length-1?' · 最慢':''}</span>`;
      button.innerHTML=position+`<span class="rank-slot-content">${id===null?'<span class="rank-slot-placeholder" aria-hidden="true">⇩</span>':`<span class="rank-grip" aria-hidden="true">⠿</span><span>${names[id]}</span>`}</span>`;
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
    const columns=getComputedStyle(slot.closest('.rank-slots')).gridTemplateColumns.split(' ').length;
    const step=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:event.key==='ArrowUp'?-columns:event.key==='ArrowDown'?columns:0;
    if(step){event.preventDefault();const target=Math.max(0,Math.min(names.length-1,index+step));if(order[index]!==null)place(order[index],target);else slots[target].focus();}
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
    if(!comparison.complete){result.textContent='還有位置未放入介質，排好四個位置後再確認。';return;}
    revealed=true;result.dataset.result=comparison.correct?'correct':'retry';
    result.textContent=comparison.correct?`排序正確。光速由快到慢為${question.geometry.order.map(id=>LAYER_NAMES[id]).join('、')}；夾角越大，光速越快。`:'再比較一下：四層介面平行，光線與法線的夾角越大，光速越快。';
    slots.forEach((slot,i)=>slot.dataset.result=comparison.positions[i]?'correct':'retry');draw();
  });
  next.addEventListener('click',()=>{
    cancelDrag();stop();question=deck.next();order=names.map(()=>null);selected=null;revealed=false;
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
