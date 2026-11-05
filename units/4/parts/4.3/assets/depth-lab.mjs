import { depthGeometry, clamp, TANK, DEPTH_INITIAL } from './depth-model.mjs?v=20261105-eleven1';
import { eyeArtwork } from './depth-eye-art.mjs?v=20261104-review1';
import { createTextures } from './depth-observer.mjs?v=20261105-eleven1';
import { createObserverRenderer } from './depth-observer-client.mjs?v=20261105-eleven1';

const root = document.querySelector('#depth-lab');
if (root) {
  const q = selector => root.querySelector(selector), svg = q('#depth-scene'), canvas = q('#depth-observer');
  const photoURL = new URL('./oblique-entry-water.png', import.meta.url).href;
  const X = x => 18 + x * 1.92, Y = y => 460 - y * 1.92;
  const point = p => [X(p[0]), Y(p[1])];
  const path = points => `M${points.map(p => point(p).join(' ')).join('L')}`;
  const waterState=depth=>depth===0?'空槽':depth<34?'水位較低':depth<67?'水位中等':'水位較高';
  const eyeState=x=>x<254?'靠近水槽':x<296?'中間位置':'遠離水槽';
  let geometry = depthGeometry(), textures = createTextures(null);
  let drawFrame = 0, animation = 0, playing = false, lastTime = 0, inView = false;
  let eyeX = DEPTH_INITIAL.eyeX;
  let waterElapsed = 0, waterStart = 0, waterTarget = 0;
  // Water-level change is the lesson: keep it gradual under either motion
  // preference. Decorative transitions still respect reduced motion in CSS.
  const waterDurationMs = 2000;
  let observerResult = null, paintedGeometry=geometry, interacting=false, detailTimer=0;
  const observer=createObserverRenderer(canvas,paintObserver);
  observer.setTextures(textures);

  svg.innerHTML = `<defs>
    <filter id="depth-eye-cue-glow" x="-40%" y="-70%" width="180%" height="240%"><feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#dfbd70" flood-opacity=".65"/></filter>
    <filter id="depth-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
    <filter id="depth-object-shadow" x="-40%" y="-50%" width="200%" height="220%"><feDropShadow dx="2" dy="5" stdDeviation="4" flood-color="#342619" flood-opacity=".5"/></filter>
    <linearGradient id="depth-wall" x2="1" y2="0"><stop stop-color="#9f7743"/><stop offset=".45" stop-color="#e5d9b2"/><stop offset="1" stop-color="#6f583c"/></linearGradient>
    <linearGradient id="depth-coin" x2=".7" y2="1"><stop stop-color="#fff0b8"/><stop offset=".35" stop-color="#c58a46"/><stop offset=".7" stop-color="#e7b46c"/><stop offset="1" stop-color="#81532a"/></linearGradient>
    <linearGradient id="depth-wet" x2="0" y2="1"><stop stop-color="#1fd5ed"/><stop offset="1" stop-color="#0087bb"/></linearGradient>
    <linearGradient id="depth-reflection"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".12" stop-color="#fff" stop-opacity=".35"/><stop offset=".16" stop-color="#fff" stop-opacity=".08"/><stop offset=".65" stop-color="#fff" stop-opacity="0"/><stop offset=".82" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    ${eyeArtwork()}
    <clipPath id="depth-water-clip"><rect/></clipPath>
  </defs>
  <rect width="720" height="530" fill="#d5b28a"/>
  <svg class="depth-wood-texture" width="720" height="530" viewBox="350 320 550 180" preserveAspectRatio="none"><image width="1254" height="1254"/></svg>
  <rect width="720" height="530" fill="#f4e8d8" opacity=".24"/>
  <g clip-path="url(#depth-water-clip)"><rect x="${X(0)}" y="${Y(TANK.height)}" width="${X(TANK.length)-X(0)}" height="${TANK.height*1.92}" fill="url(#depth-wet)"/>
    <svg class="depth-water-texture" x="${X(0)}" y="${Y(TANK.height)}" width="${X(TANK.length)-X(0)}" height="${TANK.height*1.92}" viewBox="250 610 750 220" preserveAspectRatio="none"><image width="1254" height="1254"/></svg></g>
  <path class="depth-wall" d="M${X(0)-7} ${Y(TANK.height)}H${X(0)+3}V${Y(0)+5}H${X(0)-7}Z M${X(TANK.length)-3} ${Y(TANK.height)}H${X(TANK.length)+7}V${Y(0)+5}H${X(TANK.length)-3}Z"/>
  <path class="depth-glass" d="M${X(0)-9} ${Y(TANK.height)-5}V${Y(0)+11}H${X(TANK.length)+10}V${Y(TANK.height)-5} M${X(0)+5} ${Y(0)+5}H${X(TANK.length)-5}"/>
  <g class="depth-photo-frame" filter="url(#depth-object-shadow)" aria-hidden="true">
    <svg x="${X(0)-18}" y="${Y(TANK.height)-6}" width="21" height="${TANK.height*1.92+20}" viewBox="154 268 60 630" preserveAspectRatio="none"><image width="1254" height="1254"/></svg>
    <svg x="${X(TANK.length)}" y="${Y(TANK.height)-6}" width="21" height="${TANK.height*1.92+20}" viewBox="1044 268 60 630" preserveAspectRatio="none"><image width="1254" height="1254"/></svg>
    <svg x="${X(0)-17}" y="${Y(0)+1}" width="${X(TANK.length)+30}" height="20" viewBox="206 889 850 44" preserveAspectRatio="none"><image width="1254" height="1254"/></svg>
  </g>
  <rect x="${X(0)+4}" y="${Y(TANK.height)}" width="${TANK.length*1.92-8}" height="${TANK.height*1.92}" fill="url(#depth-reflection)" pointer-events="none"/>
  <path class="depth-front-outline" d="M${X(TANK.length)+8} ${Y(TANK.height)}V${Y(0)}" stroke="#a98551" stroke-width="5" opacity=".6"/>
  <path class="depth-meniscus" stroke="#a9ffff" stroke-width="7" opacity=".5" fill="none"/>
  <path class="depth-waterline"/>
  <g class="depth-eye-guide" aria-hidden="true"><path class="depth-eye-guide-line" d="M${X(210)} ${Y(TANK.eyeHeight)}H${X(340)}"/></g>
  <g class="depth-construction" aria-hidden="true"></g>
  <g class="depth-coin" transform="translate(${X(TANK.coinX)} ${Y(0)})" filter="url(#depth-object-shadow)" aria-hidden="true">
    <ellipse cy="3" rx="25" ry="9" fill="#5a3a21"/><ellipse rx="25" ry="9" fill="url(#depth-coin)" stroke="#fce8ab" stroke-width="1.5"/>
    <ellipse cy="-1" rx="18" ry="5" fill="none" stroke="#8e5c30" stroke-width="1.3"/>
    ${Array.from({length:36},(_,i)=>{const a=i*Math.PI/18;return `<path d="M${20*Math.cos(a)} ${6.5*Math.sin(a)}L${23*Math.cos(a)} ${8*Math.sin(a)}" stroke="#fbe4ac" stroke-width=".9"/>`;}).join('')}
    <text x="0" y="5" text-anchor="middle" font-size="18" transform="scale(1 .45)" style="fill:#81542b;stroke:#ffe0a5;stroke-width:.5">1</text>
  </g>
  <g class="depth-annotations" aria-hidden="true"></g>
  <path class="depth-water-hit" stroke="transparent" fill="none" aria-hidden="true"/>
  <g id="depth-eye" class="depth-eye" tabindex="0" role="slider" aria-label="前後拖曳眼睛調整觀看位置" aria-orientation="horizontal" aria-controls="depth-observer" aria-describedby="depth-control-help depth-view-relationship" aria-valuemin="210" aria-valuemax="340" aria-valuenow="300">
    <title>沿虛線左右拖動眼睛靠近或遠離；方向鍵微調，PageUp／PageDown加快，Home／End到兩端</title>
    <rect class="depth-eye-hit" x="-48" y="-45" width="96" height="90" rx="16" fill="transparent"/>
    <g class="depth-eye-device" filter="url(#depth-eye-cue-glow)">
      <ellipse class="depth-eye-bezel" rx="45" ry="29" fill="none" stroke="#d2b56c" stroke-width="1.1" opacity=".8"/>
      <use href="#depth-eye-art" transform="scale(1.08)"/>
    </g>
    <ellipse class="depth-eye-focus" rx="42" ry="26"/>
  </g>`;
  const eye = q('.depth-eye');
  eye.addEventListener('focus',()=>{root.dataset.eyeActive='true';});
  eye.addEventListener('blur',()=>{root.dataset.eyeActive='false';});
  document.fonts.ready.then(()=>drawSide());

  function badge(text, x, y, font, anchor = 'start') {
    const width = text.length * font + font * .65, left = anchor === 'end' ? x - width : x;
    return `<g><rect class="depth-label-bg" x="${left - 5}" y="${y - font}" width="${width + 10}" height="${font * 1.4}" rx="7"/><text x="${left}" y="${y}" font-size="${font}" stroke="none">${text}</text></g>`;
  }
  function arrow(points, fraction) {
    const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
    let distance = lengths.reduce((a, b) => a + b, 0) * fraction;
    for (let i = 0; i < lengths.length; i++) {
      if (distance <= lengths[i]) {
        const a = point(points[i]), b = point(points[i + 1]), t = distance / lengths[i], x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
        const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
        return `<path class="depth-direction" d="M-12-6L0 0L-12 6" transform="translate(${x} ${y}) rotate(${angle * 180 / Math.PI})"/>`;
      }
      distance -= lengths[i];
    }
    return '';
  }
  function drawConstruction(g=paintedGeometry) {
    const show = q('#show-rays').checked;
    const representative = g.representative, blocked = !representative.visible;
    const traces = g.rays;
    let content = '';
    if (show) {
      const normalX = X(representative.hit[0]);
      if(g.depth>0)content += `<path class="depth-normal" d="M${normalX} ${Y(g.depth)-57}V${Y(g.depth)+55}"/>`;
      for (const [i, ray] of (g.depth>0?traces:traces.slice(0,1)).entries()) {
        const end = ray.visible ? ray.eye : ray.blockPoint;
        const points = g.depth>0?[ray.coin, ray.hit, end]:[ray.coin,end], d = path(points);
        content += `<g opacity="${i ? .55 : 1}"><path class="depth-ray-halo" d="${d}"/><path class="depth-ray" d="${d}"/><path class="depth-core" d="${d}"/>${[.26,.76].map(t => arrow(points,t)).join('')}</g>`;
      }
      if (g.depth>0 && !blocked) {
        content += g.rays.map(r => `<path class="extension" d="${path([r.hit,g.apparent])}"/>`).join('');
        content += `<ellipse class="depth-apparent" cx="${X(g.apparent[0])}" cy="${Y(g.apparent[1])}" rx="21" ry="8"/>`;
      }
    }
    q('.depth-construction').innerHTML = content;
    drawLabels(g);
  }
  function drawLabels(g=paintedGeometry) {
    const ratio=Math.max(.2,svg.clientWidth/720),font=Math.max(21,13.5/ratio),s=Y(g.depth);
    const show=q('#show-rays').checked,blocked=!g.representative.visible;
    let html=badge(g.depth>0?'空氣':'空槽',30,110,font);
    html+=`<text class="depth-eye-endpoint" x="${X(210)-10}" y="${Y(TANK.eyeHeight)-44}" font-size="${font}">靠近</text><text class="depth-eye-endpoint" x="${X(340)+10}" y="${Y(TANK.eyeHeight)-44}" text-anchor="end" font-size="${font}">遠離</text>`;
    // Once light reaches the eye, retain the double arrow and make room for
    // the incoming ray; the full instruction remains in the intro and ARIA.
    const cue=show&&!blocked?'↔':'↔ 左右拖動';
    const cueX=cue==='↔'?X(g.eyeX):clamp(X(g.eyeX),font*3+12,708-font*3);
    html+=`<text class="depth-eye-drag-cue" x="${cueX}" y="${Y(TANK.eyeHeight)+font+36}" text-anchor="middle" font-size="${font}">${cue}</text>`;
    html+=badge(ratio<.56?'拉水位':'↕ 拉動水位',450,ratio<.56?300:Y(TANK.height)+24,font);
    html+=`<path d="M${X(g.coin[0])} ${Y(0)+10}L105 480" fill="none" stroke="#fffbe7" stroke-width="2"/>`+badge('實際位置',28,511,font);
    // Keep the front wall's name in the same place for dry/wet and visible/hidden states.
    html+=`<path d="M${X(TANK.length)+9} ${Y(TANK.height)+10}L270 175" fill="none" stroke="#8f7048" stroke-width="2"/>`+badge('前側槽壁',70,175,font);
    if(g.depth>0){
      if(Y(0)-s>font*1.6)html+=badge('水面',30,s+font+9,font);
      if(Y(0)-s>font*4.2+20)html+=badge('水',30,(s+Y(0))/2+font*.3,font);
    }
    if(show&&blocked){
      const p=point(g.representative.blockPoint);
      html+=`<circle class="depth-block-point" cx="${p[0]}" cy="${p[1]}" r="9" fill="#fff3d4" stroke="#956e3e" stroke-width="2.5"/>`;
      html+=`<path d="M${p[0]-5} ${p[1]-5}L${p[0]+5} ${p[1]+5}M${p[0]-5} ${p[1]+5}L${p[0]+5} ${p[1]-5}" fill="none" stroke="#956e3e" stroke-width="2"/>`;
      html+=badge('光被擋住',ratio<.56?390:460,ratio<.56?390:342,font);
    }
    if(g.depth>0&&show&&!blocked){
      const virtual=point(g.apparent),labelY=Math.max(s+font+14,Math.min(virtual[1]+font,425),ratio<.56?385:0);
      html+=`<path d="M${virtual[0]+23} ${virtual[1]}L380 ${labelY-8}" fill="none" stroke="#a56336" stroke-width="2"/>`+badge('看似位置',ratio<.56?390:460,labelY,font);
    }
    if(g.depth>0&&show){
      const nx=X(g.representative.hit[0]);
      // The normal label sits on the air side, away from the water-surface label.
      html+=badge('法線',Math.max(26,nx-font*2.65-8),s-30,font);
    }
    q('.depth-annotations').innerHTML=html;
  }
  function drawSide(g=paintedGeometry) {
    const s = Y(g.depth);
    const ratio=Math.max(.2,svg.clientWidth/720),hitSize = Math.max(112, 46 / ratio);
    const hitLeft=Math.min(-hitSize/2,720-X(g.eyeX)-hitSize);
    for (const [key,value] of Object.entries({x:hitLeft,y:-hitSize/2,width:hitSize,height:hitSize}))
      q('.depth-eye-hit').setAttribute(key,value);
    for (const [k,v] of Object.entries({ x:X(0),y:s,width:X(TANK.length)-X(0),height:Y(0)-s })) q('#depth-water-clip rect').setAttribute(k,v);
    const water = q('.depth-water-texture'); water.setAttribute('y',s); water.setAttribute('height',Y(0)-s);
    q('.depth-waterline').setAttribute('d',`M${X(0)} ${s}H${X(TANK.length)}`);
    q('.depth-meniscus').setAttribute('d',`M${X(0)+1} ${s+3}H${X(TANK.length)-1}`);
    q('.depth-waterline').style.display=q('.depth-meniscus').style.display=g.depth>0?'':'none';
    q('.depth-water-hit').setAttribute('d',`M${X(0)+2} ${s}H${X(TANK.length)-3}`);
    q('.depth-water-hit').setAttribute('stroke-width',44/ratio);
    const waterControl=q('.depth-water-control'),handleX=ratio<.56?svg.clientWidth-27:(X(TANK.length)+55)*ratio;
    Object.assign(waterControl.style,{left:`${handleX-22}px`,top:`${Y(100)*ratio-22}px`,height:`${(Y(0)-Y(100))*ratio+44}px`});
    q('#depth-input').setAttribute('aria-valuetext',waterState(g.depth));
    root.dataset.directReady='true';
    eye.setAttribute('transform',`translate(${X(g.eyeX)} ${Y(TANK.eyeHeight)})`);
    eye.setAttribute('aria-valuenow',g.eyeX); eye.setAttribute('aria-valuetext',eyeState(g.eyeX));
    drawConstruction(g);
    const observation=g.status==='hidden'?'槽壁遮住硬幣的光。':g.depth===0?'未加水，光在空氣中直線傳播到觀看位置。':'出水折射後的光進入觀看位置，硬幣看起來較淺。';
    svg.setAttribute('aria-label',`${waterState(g.depth)}，硬幣固定在槽底，眼睛${eyeState(g.eyeX)}。${observation}${q('#show-rays').checked?(g.depth>0?'顯示光路與反向延長線。':'顯示直線傳播的光。'):'光路與輔助線已隱藏。'}`);
    root.dataset.depth=g.depth; root.dataset.eyeX=g.eyeX; root.dataset.visible=g.status;
  }
  function paintObserver(result,g) {
    observerResult=result;paintedGeometry=g;drawSide(g);
    const wall=observerResult.frontWallBounds,wallLabel=q('.depth-front-wall');
    wallLabel.hidden=!wall||wall.height*canvas.clientHeight<32;
    if(!wallLabel.hidden)Object.assign(wallLabel.style,{left:`${(wall.x+wall.width/2)*100}%`,top:`${(wall.y+wall.height*.72)*100}%`,bottom:'auto',transform:'translate(-50%,-50%)'});
    const visible=g.status!=='hidden';
    const state=visible?(g.status==='partial'?`${g.depth===0?'空槽・':''}可以看見部分硬幣`:g.depth===0?'空槽・可以直接看見':'可以看見硬幣'):g.depth===0?'空槽・看不到硬幣':'槽壁遮住・看不到硬幣';
    q('#depth-visibility').textContent=state; q('#depth-visibility').dataset.visible=visible?'visible':'hidden';
    q('#depth-view-result').textContent=visible?(g.depth>0?'光出水後轉向，越過前側槽壁進入眼睛；硬幣仍在原處。':'觀看位置較近，光可直接越過槽緣進入眼睛。'):g.depth===0?'前側槽壁擋住硬幣的光，光還沒進入眼睛。':'光仍被前側槽壁擋住；繼續加水，比較光路是否能越過槽緣。';
    q('.depth-takeaway').textContent=g.depth===0
      ?visible?'硬幣沒有移動。空槽中，光沿直線越過槽緣進入眼睛。':'硬幣沒有移動。空槽中，光沿直線前進，被槽壁擋住。'
      :visible?'硬幣沒有移動。光出水轉向，眼睛沿直線回推，所以看起來較淺。':'硬幣沒有移動。光出水時折射，仍被槽壁擋住，尚未進入眼睛。';
    canvas.setAttribute('aria-label',`這隻眼睛看到的畫面：${waterState(g.depth)}、眼睛${eyeState(g.eyeX)}的視野。${state}。`);
    canvas.dataset.coinPixels=observerResult.coinPixels; canvas.dataset.depth=g.depth;canvas.dataset.eyeX=g.eyeX;canvas.dataset.visibility=g.status;
    canvas.dataset.coinBounds=JSON.stringify(observerResult.bounds);
    q('#depth-live').textContent=`${waterState(g.depth)}，${state}；硬幣實際位置不變。`;
  }
  function drawObserver() {
    drawFrame=0;
    try{observer.request(geometry,{preview:playing||interacting||!inView});}
    catch{q('#depth-fallback').textContent='此瀏覽器無法繪製觀看畫面；左側仍可比較光路。';}
  }
  function scheduleObserver() { if(!drawFrame)drawFrame=requestAnimationFrame(drawObserver); }
  function settleDetail(){
    clearTimeout(detailTimer);
    detailTimer=setTimeout(()=>{interacting=false;if(!playing&&inView)scheduleObserver();},160);
  }
  function stopAnimation() { if(animation)cancelAnimationFrame(animation);animation=0;lastTime=0; }
  function syncGeometry() {
    geometry=depthGeometry(Number(q('#depth-input').value),eyeX);
    q('#depth-fill').disabled=geometry.depth>=100;
    q('#depth-drain').disabled=geometry.depth<=0;
    scheduleObserver();
  }
  function finishAnimation() {
    playing=false;stopAnimation();root.dataset.state='ready';
  }
  function update() {
    finishAnimation();interacting=true;syncGeometry();settleDetail();
  }
  function updateEye(){
    interacting=true;syncGeometry();settleDetail();
  }
  function beginManual(kind='water') {
    if(kind==='water')finishAnimation();
    clearTimeout(detailTimer);interacting=true;scheduleObserver();
  }
  function tick(time) {
    animation=0;
    if(!playing||!inView||document.hidden)return;
    const dt=lastTime?time-lastTime:0;lastTime=time;waterElapsed+=dt;
    const duration=waterDurationMs;
    const depth=Math.round(waterStart+(waterTarget-waterStart)*Math.min(1,waterElapsed/duration));
    if(depth!==geometry.depth){q('#depth-input').value=depth;syncGeometry();}
    if(waterElapsed<duration)animation=requestAnimationFrame(tick);
    else {finishAnimation();interacting=true;scheduleObserver();settleDetail();}
  }
  q('#depth-input').addEventListener('input',update);
  q('#depth-input').addEventListener('pointerdown',()=>beginManual('water'));
  q('#show-rays').addEventListener('change',()=>{drawConstruction();drawSide();});
  function changeWater(direction) {
    const target=direction>0?100:0;
    if(target===geometry.depth||(playing&&target===waterTarget))return;
    finishAnimation();
    waterStart=geometry.depth;waterTarget=target;waterElapsed=0;
    clearTimeout(detailTimer);interacting=false;syncGeometry();playing=true;root.dataset.state=direction>0?'filling':'draining';
    if(inView&&!document.hidden)animation=requestAnimationFrame(tick);
  }
  q('#depth-fill').addEventListener('click',()=>changeWater(1));
  q('#depth-drain').addEventListener('click',()=>changeWater(-1));
  eye.addEventListener('keydown',e=>{
    const step={ArrowLeft:-2,ArrowDown:-2,ArrowRight:2,ArrowUp:2,PageDown:-10,PageUp:10}[e.key];
    if(step!==undefined||e.key==='Home'||e.key==='End'){e.preventDefault();eyeX=e.key==='Home'?210:e.key==='End'?340:clamp(geometry.eyeX+step,210,340);updateEye();}
  });
  function bindDrag(target,kind) {
    let start=null;
    const local=e=>new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    target.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;e.preventDefault();beginManual(kind);
      start={point:local(e),value:kind==='eye'?eyeX:geometry.depth,id:e.pointerId};
      target.setPointerCapture(e.pointerId);
      (kind==='eye'?eye:q('#depth-input')).focus({preventScroll:true});
    });
    target.addEventListener('pointermove',e=>{
      if(!start||start.id!==e.pointerId)return;e.preventDefault();const p=local(e);
      if(kind==='eye')eyeX=clamp(Math.round(start.value+(p.x-start.point.x)/1.92),210,340);
      else q('#depth-input').value=clamp(Math.round(start.value+(start.point.y-p.y)/1.92),0,100);
      if(kind==='eye')updateEye();else update();
    });
    const end=()=>{start=null;settleDetail();};target.addEventListener('pointerup',end);target.addEventListener('pointercancel',end);target.addEventListener('lostpointercapture',end);
  }
  bindDrag(eye,'eye');bindDrag(q('.depth-water-hit'),'water');
  const resume=()=>{stopAnimation();if(playing&&inView&&!document.hidden){root.dataset.state=waterTarget>waterStart?'filling':'draining';animation=requestAnimationFrame(tick);}else if(playing)root.dataset.state='paused';};
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;resume();if(inView)scheduleObserver();},{threshold:.05}).observe(root);
  document.addEventListener('visibilitychange',resume);
  new ResizeObserver(()=>{drawSide();scheduleObserver();}).observe(canvas);
  function loadPhoto() {
    const photo=new Image();photo.decoding='async';
    photo.onload=()=>{textures=createTextures(photo);observer.setTextures(textures);for(const image of svg.querySelectorAll('image'))image.setAttribute('href',photoURL);q('#depth-fallback').replaceChildren();scheduleObserver();root.dataset.texture='ready';};
    photo.onerror=()=>{root.dataset.texture='fallback';const note=q('#depth-fallback');note.textContent='材質圖片未載入，目前以簡化材質呈現。';const retry=document.createElement('button');retry.type='button';retry.textContent='重新載入材質';retry.onclick=loadPhoto;note.append(' ',retry);};
    photo.src=photoURL;
  }
  drawSide();update();loadPhoto();
}
