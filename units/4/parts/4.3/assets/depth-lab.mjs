import { depthGeometry, clamp, TANK } from './depth-model.mjs?v=20261103-dual2';
import { createTextures, renderObserver } from './depth-observer.mjs?v=20261103-dual2';

const root = document.querySelector('#depth-lab');
if (root) {
  const q = selector => root.querySelector(selector), svg = q('#depth-scene'), canvas = q('#depth-observer');
  const photoURL = new URL('./oblique-entry-water.png', import.meta.url).href;
  const X = x => 45 + x * 1.85, Y = y => 430 - y * 1.85;
  const point = p => [X(p[0]), Y(p[1])];
  const path = points => `M${points.map(p => point(p).join(' ')).join('L')}`;
  let geometry = depthGeometry(), textures = createTextures(null);
  let drawFrame = 0, animation = 0, progress = 1, playing = false, lastTime = 0, inView = false, dragging = false;
  let observerResult = null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  svg.innerHTML = `<defs>
    <filter id="depth-glow"><feGaussianBlur stdDeviation="4"/></filter>
    <linearGradient id="depth-wall" x2="1" y2="0"><stop stop-color="#9f7743"/><stop offset=".45" stop-color="#e5d9b2"/><stop offset="1" stop-color="#6f583c"/></linearGradient>
    <linearGradient id="depth-coin" x2=".7" y2="1"><stop stop-color="#fff0b8"/><stop offset=".35" stop-color="#c58a46"/><stop offset=".7" stop-color="#e7b46c"/><stop offset="1" stop-color="#81532a"/></linearGradient>
    <linearGradient id="depth-wet" x2="0" y2="1"><stop stop-color="#1fd5ed"/><stop offset="1" stop-color="#0087bb"/></linearGradient>
    <clipPath id="depth-water-clip"><rect/></clipPath>
  </defs>
  <rect width="720" height="500" fill="#c69660"/>
  <svg class="depth-wood-texture" width="720" height="500" viewBox="250 310 750 220" preserveAspectRatio="none"><image width="1254" height="1254"/></svg>
  <g clip-path="url(#depth-water-clip)"><rect x="45" y="150" width="315" height="280" fill="url(#depth-wet)"/>
    <svg class="depth-water-texture" x="45" y="150" width="315" height="280" viewBox="250 610 750 220" preserveAspectRatio="none"><image width="1254" height="1254"/></svg></g>
  <path class="depth-wall" d="M38 ${Y(TANK.height)}H48V435H38Z M${X(TANK.length)-3} ${Y(TANK.height)}H${X(TANK.length)+7}V435H${X(TANK.length)-3}Z"/>
  <path class="depth-glass" d="M36 ${Y(TANK.height)-5}V441H${X(TANK.length)+10}V${Y(TANK.height)-5} M50 435H${X(TANK.length)-5}"/>
  <path class="depth-waterline"/>
  <g class="depth-construction" aria-hidden="true"></g>
  <g class="depth-coin" transform="translate(${X(TANK.coinX)} ${Y(0)})" aria-hidden="true">
    <ellipse cy="3" rx="23" ry="8" fill="#5a3a21"/><ellipse rx="23" ry="8" fill="url(#depth-coin)" stroke="#fce8ab" stroke-width="1.5"/>
    <ellipse cy="-1" rx="18" ry="5" fill="none" stroke="#8e5c30" stroke-width="1.3"/>
  </g>
  <g class="depth-annotations" aria-hidden="true"></g>
  <g class="depth-eye" tabindex="0" role="slider" aria-label="觀看位置，可拖曳或以方向鍵調整" aria-valuemin="210" aria-valuemax="340" aria-valuenow="250">
    <rect class="depth-eye-hit" x="-48" y="-45" width="96" height="90" rx="16" fill="transparent"/>
    <path d="M-34 0Q0-33 34 0Q0 33-34 0Z" fill="#fff9e8" stroke="#526747" stroke-width="3"/>
    <circle r="13" fill="#778d61"/><circle r="7" fill="#172e28"/><circle cx="-3" cy="-4" r="3" fill="#fff"/>
  </g>`;
  const eye = q('.depth-eye');

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
  function partial(points, fraction) {
    const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
    let remaining = lengths.reduce((a, b) => a + b, 0) * fraction;
    const result = [points[0]];
    for (let i = 0; i < lengths.length; i++) {
      if (remaining >= lengths[i]) { result.push(points[i + 1]); remaining -= lengths[i]; }
      else { const t = remaining / lengths[i]; result.push(points[i].map((v, j) => v + (points[i + 1][j] - v) * t)); break; }
    }
    return result;
  }
  function drawConstruction() {
    const g = geometry, show = q('#show-rays').checked;
    const representative = g.representative, blocked = !representative.visible;
    const traces = g.rays;
    const lightProgress = Math.min(1, progress / .76);
    let content = '';
    if (show) {
      const normalX = X(representative.hit[0]);
      content += `<path class="depth-normal" d="M${normalX} ${Y(g.depth)-57}V${Y(g.depth)+55}"/>`;
      for (const [i, ray] of traces.entries()) {
        const end = ray.visible ? ray.eye : ray.blockPoint;
        const points = [ray.coin, ray.hit, end], d = path(partial(points, lightProgress));
        content += `<g opacity="${i ? .55 : 1}"><path class="depth-ray-halo" d="${d}"/><path class="depth-ray" d="${d}"/><path class="depth-core" d="${d}"/>${[.26,.76].filter(t => lightProgress > t).map(t => arrow(points,t)).join('')}</g>`;
      }
      if (!blocked && progress >= .76) {
        content += g.rays.map(r => `<path class="extension" d="${path([r.hit,g.apparent])}"/>`).join('');
        content += `<ellipse class="depth-apparent" cx="${X(g.apparent[0])}" cy="${Y(g.apparent[1])}" rx="21" ry="8"/>`;
      }
    }
    q('.depth-construction').innerHTML = content;
    drawLabels();
  }
  function drawLabels() {
    const g = geometry, font = Math.max(21, 13.5 / Math.max(.2, svg.clientWidth / 720)), s = Y(g.depth);
    let html = badge('空氣', 53, 130, font) + badge('水', 53, 405, font) + badge('水面', 53, s - 18, font);
    html += badge('觀看位置', Math.min(520, X(g.eyeX)-90), 46, font);
    html += `<path d="M${X(g.coin[0])+15} 433L200 474" fill="none" stroke="#fffbe7" stroke-width="2"/>` + badge('實際位置', 205, 483, font);
    if (q('#show-rays').checked && g.status !== 'hidden' && progress >= .76) {
      const labelX = 375, labelY = Math.max(s + font * 1.6, Math.min(397, Y(g.apparent[1]) + font));
      html += `<path d="M${X(g.apparent[0])+20} ${Y(g.apparent[1])}L${labelX-10} ${labelY-8}" fill="none" stroke="#fffbe7" stroke-width="2"/>` + badge('看起來的位置', labelX, labelY, font);
    }
    if (q('#show-rays').checked) html += badge('法線', X(g.representative.hit[0])+12, Math.max(185,s-63), font);
    q('.depth-annotations').innerHTML = html;
  }
  function drawSide() {
    const g = geometry, s = Y(g.depth);
    const hitSize = Math.max(96, 46 / Math.max(.2, svg.clientWidth / 720));
    for (const [key,value] of Object.entries({x:-hitSize/2,y:-hitSize/2,width:hitSize,height:hitSize}))
      q('.depth-eye-hit').setAttribute(key,value);
    for (const [k,v] of Object.entries({ x:45,y:s,width:X(TANK.length)-45,height:430-s })) q('#depth-water-clip rect').setAttribute(k,v);
    const water = q('.depth-water-texture'); water.setAttribute('y',s); water.setAttribute('height',430-s);
    q('.depth-waterline').setAttribute('d',`M45 ${s}H${X(TANK.length)}`);
    eye.setAttribute('transform',`translate(${X(g.eyeX)} ${Y(TANK.eyeHeight)})`);
    eye.setAttribute('aria-valuenow',g.eyeX); eye.setAttribute('aria-valuetext',`離槽前側${g.eyeX-TANK.length}公分`);
    drawConstruction();
    svg.setAttribute('aria-label',`實際水深${g.depth}公分，硬幣固定在槽底，觀看位置離槽前側${g.eyeX-TANK.length}公分。${g.status==='hidden'?'槽壁遮住硬幣的光。':'出水折射後的光進入觀看位置，硬幣看起來較淺。'}${q('#show-rays').checked?'顯示光路與反向延長線。':'光路與輔助線已隱藏。'}`);
    root.dataset.depth=g.depth; root.dataset.eyeX=g.eyeX; root.dataset.visible=g.status;
  }
  function drawObserver() {
    drawFrame=0;
    try { observerResult=renderObserver(canvas,geometry,textures); }
    catch { q('#depth-fallback').textContent='此瀏覽器無法繪製觀看畫面；左側仍可比較實際位置與看起來的位置。'; return; }
    const visible=observerResult.coinPixels>0;
    const state=visible?(geometry.status==='partial'?'部分硬幣被槽壁遮住':'目前可以看見硬幣'):'目前被前側槽壁遮住';
    q('#depth-visibility').textContent=state; q('#depth-visibility').dataset.visible=visible?'visible':'hidden';
    q('#depth-view-result').textContent=visible?'光經過水面折射後，進入目前的觀看位置。':'硬幣仍在槽底；可試著靠近，或提高水位。';
    canvas.setAttribute('aria-label',`目前水深${geometry.depth}公分，離槽前側${geometry.eyeX-TANK.length}公分的視野。${state}。`);
    canvas.dataset.coinPixels=observerResult.coinPixels; canvas.dataset.depth=geometry.depth;canvas.dataset.eyeX=geometry.eyeX;
    canvas.dataset.coinBounds=JSON.stringify(observerResult.bounds);
    q('#depth-live').textContent=`實際水深${geometry.depth}公分，${state}；硬幣實際位置不變。`;
  }
  function scheduleObserver() { if(!drawFrame)drawFrame=requestAnimationFrame(drawObserver); }
  function stopAnimation() { if(animation)cancelAnimationFrame(animation);animation=0;lastTime=0; }
  function update() {
    playing=false;stopAnimation();progress=1;root.dataset.state='ready';q('#depth-replay').textContent='▶ 重播光路';
    geometry=depthGeometry(Number(q('#depth-input').value),Number(q('#depth-eye').value));
    q('#depth-output').textContent=`${geometry.depth} 公分`;
    q('#depth-eye-output').textContent=`距槽前 ${geometry.eyeX-TANK.length} cm`;
    drawSide();scheduleObserver();
  }
  function tick(time) {
    animation=0;
    if(!playing||!inView||document.hidden)return;
    if(lastTime)progress=Math.min(1,progress+Math.min(80,time-lastTime)/2400);
    lastTime=time;drawConstruction();
    if(progress<1)animation=requestAnimationFrame(tick);
    else { playing=false;lastTime=0;root.dataset.state='ready';q('#depth-replay').textContent='▶ 重播光路'; }
  }
  q('#depth-input').addEventListener('input',update);q('#depth-eye').addEventListener('input',update);
  q('#show-rays').addEventListener('change',()=>{drawConstruction();drawSide();});
  q('#depth-replay').addEventListener('click',()=>{
    stopAnimation();q('#show-rays').checked=true;playing=!reduced.matches;progress=playing?0:1;root.dataset.state=playing?'playing':'ready';
    q('#depth-replay').textContent=playing?'↻ 從頭觀看':'▶ 重播光路';drawConstruction();if(playing&&inView&&!document.hidden)animation=requestAnimationFrame(tick);
  });
  q('#depth-reset').addEventListener('click',()=>{q('#depth-input').value=70;q('#depth-eye').value=250;q('#show-rays').checked=true;update();});
  eye.addEventListener('keydown',e=>{
    const step={ArrowLeft:-2,ArrowDown:-2,ArrowRight:2,ArrowUp:2}[e.key];
    if(step!==undefined||e.key==='Home'||e.key==='End'){e.preventDefault();q('#depth-eye').value=e.key==='Home'?210:e.key==='End'?340:clamp(geometry.eyeX+step,210,340);update();}
  });
  eye.addEventListener('pointerdown',e=>{e.preventDefault();dragging=true;eye.setPointerCapture(e.pointerId);eye.focus({preventScroll:true});});
  eye.addEventListener('pointermove',e=>{if(!dragging)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());q('#depth-eye').value=clamp(Math.round((p.x-45)/1.85),210,340);update();});
  eye.addEventListener('pointerup',()=>{dragging=false;});eye.addEventListener('pointercancel',()=>{dragging=false;});
  const resume=()=>{stopAnimation();if(playing&&inView&&!document.hidden){root.dataset.state='playing';animation=requestAnimationFrame(tick);}else if(playing)root.dataset.state='paused';};
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;resume();},{threshold:.05}).observe(root);
  document.addEventListener('visibilitychange',resume);
  reduced.addEventListener('change',()=>{if(reduced.matches&&playing){playing=false;stopAnimation();progress=1;root.dataset.state='ready';q('#depth-replay').textContent='▶ 重播光路';drawConstruction();}});
  new ResizeObserver(()=>{drawSide();scheduleObserver();}).observe(canvas);
  function loadPhoto() {
    const photo=new Image();photo.decoding='async';
    photo.onload=()=>{textures=createTextures(photo);for(const image of svg.querySelectorAll('image'))image.setAttribute('href',photoURL);q('#depth-fallback').replaceChildren();scheduleObserver();root.dataset.texture='ready';};
    photo.onerror=()=>{root.dataset.texture='fallback';const note=q('#depth-fallback');note.textContent='材質圖片未載入，目前以簡化材質呈現。';const retry=document.createElement('button');retry.type='button';retry.textContent='重新載入材質';retry.onclick=loadPhoto;note.append(' ',retry);};
    photo.src=photoURL;
  }
  update();loadPhoto();
}
