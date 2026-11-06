import {OPTICS, mirror, viewRay, exteriorSample, observe, traceSightline} from './periscope-optics.mjs?v=2';
import {FLASH_MS,STATIC_FLASH_MS,REST_MS,pulseOpacity} from './periscope-pulse.mjs?v=2';

const root=document.querySelector('#unit-quiz');
if(root) {
  const $=s=>root.querySelector(s), $$=s=>[...root.querySelectorAll(s)];
  const svg=$('#periscope-scene'), canvas=$('#periscope-view'), ctx=canvas.getContext('2d',{alpha:false});
  const groups=[$('#periscope-mirror-0'),$('#periscope-mirror-1')];
  const DRAG_GAIN=.35,DRAG_CENTER_RADIUS=18;
  const state={angles:[38,51],done:false};
  let scenePixels=null, lastViewKey='', pending=0, dragging=null;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let pulse=null,pulseFrame=0,pulseEndTimer=0,pulseUnlockTimer=0,nextPulseAt=0,pulseCount=0;
  root.dataset.ready='loading';
  const sceneImage=new Image();
  sceneImage.src=new URL('periscope/submarine-scene.webp?v=2',import.meta.url).href;
  sceneImage.onload=()=>{
    const source=document.createElement('canvas');source.width=900;source.height=760;
    const sctx=source.getContext('2d',{willReadFrequently:true});sctx.drawImage(sceneImage,0,0,900,760);
    scenePixels=sctx.getImageData(0,0,900,760).data;lastViewKey='';root.dataset.ready='true';render();
  };
  sceneImage.onerror=()=>{root.dataset.ready='error';feedback('場景素材未載入，請重新整理頁面後再挑戰。','try');render();};
  function feedback(text,kind='') {$('#periscope-feedback').textContent=text;$('#periscope-feedback').dataset.state=kind;}
  function point(p) {return p.slice(0,2).map(n=>n.toFixed(2)).join(',');}
  function drawPath(el,points,color) {
    el.replaceChildren();
    if(points.length<2)return;
    const ns='http://www.w3.org/2000/svg', d='M'+points.map(point).join('L');
    for(const cls of ['light-glow','light-line']) {
      const path=document.createElementNS(ns,'path');
      path.setAttribute('d',d);path.setAttribute('class',cls);path.setAttribute('stroke',color);el.append(path);
    }
    el.style.opacity='1';
  }
  function drawOptics() {
    groups.forEach((g,i)=>{
      const m=mirror(i,state.angles[i]);
      for(const line of g.querySelectorAll('line')) {
        const offset=line.classList.contains('mirror-back')?-5:line.classList.contains('mirror-highlight')?1:0;
        line.setAttribute('x1',m.ends[0][0]+offset*m.normal[0]);line.setAttribute('y1',m.ends[0][1]+offset*m.normal[1]);
        line.setAttribute('x2',m.ends[1][0]+offset*m.normal[0]);line.setAttribute('y2',m.ends[1][1]+offset*m.normal[1]);
      }
      [...g.querySelectorAll('.scope-mirror-handle')].forEach((c,j)=>{c.setAttribute('cx',m.ends[j][0]);c.setAttribute('cy',m.ends[j][1]);});
      g.setAttribute('aria-valuenow',state.angles[i].toFixed(1));g.setAttribute('aria-valuetext',`鏡面方向 ${state.angles[i].toFixed(1)} 度，可用方向鍵微調`);
    });
    if(pulse)drawPulse();
    else $('#periscope-light').replaceChildren();
  }

  function updatePulseControls() {
    const busy=Boolean(pulse),waiting=performance.now()<nextPulseAt;
    root.dataset.pulseStatus=busy?'running':waiting?'cooldown':'idle';
    const button=$('#periscope-pulse');
    button.disabled=!scenePixels||busy||waiting;
    $('.periscope-pulse-label').textContent=busy?'視線追蹤中':waiting?'稍後可再試':'追蹤目前視線';
    $('.periscope-pulse-invite').textContent=busy?'看看光在哪裡轉彎或停下':waiting?'調整鏡片，再試一次':'點一下，看看光走到哪裡';
    $('#periscope-pulse-note').textContent=busy?'從小葵的觀察口出發，看看這次視線通往哪裡。':waiting?'追蹤已結束。先調整鏡片，再追蹤一次。':'光線短暫亮起後會自動消失。';
  }
  function cancelPulse(reset=false) {
    cancelAnimationFrame(pulseFrame);clearTimeout(pulseEndTimer);pulse=null;
    if(reset){clearTimeout(pulseUnlockTimer);nextPulseAt=0;}
    const light=$('#periscope-light');light.replaceChildren();light.style.opacity='1';delete light.dataset.opacity;
    updatePulseControls();
  }
  function drawPulse() {
    if(!pulse)return;
    const {ray,opacity}=pulse,light=$('#periscope-light');
    drawPath(light,ray.points,'#ffe471');
    light.style.opacity=String(opacity);light.dataset.opacity=String(opacity);
    if(ray.kind==='blocked') {
      const p=ray.points.at(-1),spot=document.createElementNS('http://www.w3.org/2000/svg','g');
      spot.setAttribute('class','periscope-wall-spot');
      for(const [radius,fill,alpha] of [[13,'#ffe397',.5],[6,'#ffe9a2',.75],[3,'#fff9de',1]]) {
        const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
        c.setAttribute('cx',p[0]);c.setAttribute('cy',p[1]);c.setAttribute('r',radius);c.setAttribute('fill',fill);c.setAttribute('opacity',alpha);
        if(radius===13)c.setAttribute('filter','url(#scope-glow)');spot.append(c);
      }
      light.append(spot);
    }

  }
  function emitPulse() {
    const now=performance.now();
    if(!scenePixels || pulse || dragging || document.hidden || now<nextPulseAt)return;
    const duration=reducedMotion.matches?STATIC_FLASH_MS:FLASH_MS;
    const shot={ray:traceSightline(state.angles),opacity:reducedMotion.matches?1:0};
    pulse=shot;nextPulseAt=now+duration+REST_MS;root.dataset.pulseId=String(++pulseCount);
    render();
    const animate=time=>{
      if(pulse!==shot)return;
      const elapsed=Math.max(0,time-now);
      shot.opacity=pulseOpacity(elapsed);
      drawPulse();
      if(elapsed<duration)pulseFrame=requestAnimationFrame(animate);
    };
    if(!reducedMotion.matches)pulseFrame=requestAnimationFrame(animate);
    pulseEndTimer=setTimeout(()=>{if(pulse===shot)cancelPulse();},duration);
    pulseUnlockTimer=setTimeout(updatePulseControls,duration+REST_MS);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelPulse();else updatePulseControls();});
  reducedMotion.addEventListener('change',()=>{if(pulse)cancelPulse();});
  window.addEventListener('pagehide',()=>cancelPulse(true));
  function renderView() {
    if(!scenePixels)return;
    const key=state.angles.join(',');if(key===lastViewKey)return;lastViewKey=key;
    const n=canvas.width, pixels=ctx.createImageData(n,n), out=pixels.data, f=OPTICS.field*Math.PI/180;
    // Plane mirror normals have zero z component: horizontal slope is unchanged
    // by reflection. One full geometric trace per row + exact z-aperture tests
    // gives the same pinhole field as tracing every pixel, without 57k traces.
    for(let y=0;y<n;y++) {
      const ny=(y+.5)/n*2-1,v=ny*OPTICS.field, ray=viewRay(0,v,state.angles), sample=exteriorSample(ray);
      let length=0, lastMirror=0;
      for(let j=1;j<ray.points.length;j++) {
        length+=Math.hypot(ray.points[j][0]-ray.points[j-1][0],ray.points[j][1]-ray.points[j-1][1]);
        if(ray.hits.some(h=>Math.hypot(h.point[0]-ray.points[j][0],h.point[1]-ray.points[j][1])<1e-4))lastMirror=length;
      }
      const end=ray.points.at(-1), outsideLength=sample?(OPTICS.exteriorPlane-end[0])/ray.direction[0]:0;
      for(let x=0;x<n;x++) {
        const nx=(x+.5)/n*2-1,k=(y*n+x)*4,factor=Math.tan(nx*f)/Math.hypot(1,Math.tan(v*Math.PI/180));
        const clear=sample && Math.abs(factor*length)<=OPTICS.halfDepth && Math.abs(factor*lastMirror)<=OPTICS.mirrorDepth;
        let r,g,b;
        if(clear) {
          let sx=170+factor*(length+outsideLength)*.62, sy=sample.y;
          sx=Math.max(0,Math.min(430,Math.round(sx)));
          // Downward exterior rays see the sea SURFACE, never a texture of
          // underwater fish or the cabin. Upward rays extend the sky.
          if(sy>250)sy=250+(sy-250)%22;
          sy=Math.round(Math.max(4,Math.min(275,sy)));
          const p=(sy*900+sx)*4;r=scenePixels[p];g=scenePixels[p+1];b=scenePixels[p+2];
          r*=.94;g*=.97;b*=.98;
        } else {
          const shade=9+8*(1-Math.abs(nx))+(ray.reason==='mirror-back'?8:0);
          r=shade;g=shade+6;b=shade+10;
        }
        const edge=Math.max(0,Math.hypot(nx,ny)-.72), vignette=1-edge*.6;
        out[k]=r*vignette;out[k+1]=g*vignette;out[k+2]=b*vignette;out[k+3]=255;
      }
    }
    ctx.putImageData(pixels,0,0);
  }
  function render() {
    pending=0;
    const info=observe(state.angles), messages={blocked:'視線被管壁或鏡背擋住',boat:info.target?'船已在觀察窗中央':'看見船了，再調整一下',sky:'目前主要看見天空',sea:'目前主要看見海面'};
    root.dataset.angles=state.angles.join(',');root.dataset.view=info.kind;root.dataset.target=String(info.target);root.dataset.completed=String(state.done);
    const viewMessage=scenePixels?messages[info.kind]:root.dataset.ready==='error'?'場景素材未載入，請重新整理頁面再試。':'正在準備觀察窗…';
    $('#periscope-view-state').textContent=viewMessage;$('#periscope-view-state').dataset.kind=scenePixels?info.kind:root.dataset.ready;
    $('#periscope-view').setAttribute('aria-label',viewMessage+'。'+(info.blocked?'部分視線受到遮擋。':''));
    $('#periscope-view-copy').textContent=info.kind==='blocked'?'鏡子未把外界的光送進眼睛。看看光在哪裡被擋住。':info.blocked/(info.clear+info.blocked)>.3?'邊緣的暗區是管壁或有限鏡片造成的遮擋。':'試著微轉鏡片，觀察船、天空與海面如何移動。';
    updatePulseControls();
    $('#periscope-check').disabled=!scenePixels;
    drawOptics();renderView();
  }
  function schedule(){if(!pending)pending=requestAnimationFrame(render);}
  function invalidate() {
    if(state.done) {
      state.done=false;
      feedback('鏡片角度改變了，調整完成後可以再檢查一次。');
    }
  }
  function setAngle(i,value) {
    const n=Math.round(Math.max(OPTICS.minAngle,Math.min(OPTICS.maxAngle,value))*10)/10;
    if(n===state.angles[i])return;
    cancelPulse();invalidate();state.angles[i]=n;schedule();
  }
  function svgPoint(e) {
    const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());return [p.x,p.y];
  }
  groups.forEach((g,i)=>{
    g.addEventListener('pointerdown',e=>{
      if(e.button>0)return;e.preventDefault();cancelPulse();
      const p=svgPoint(e),c=i===0?OPTICS.upper:OPTICS.lower;
      const initial=Math.atan2(p[1]-c[1],p[0]-c[0])*180/Math.PI;
      dragging={i,id:e.pointerId,last:Math.hypot(p[0]-c[0],p[1]-c[1])<DRAG_CENTER_RADIUS?null:initial,angle:state.angles[i]};g.setPointerCapture(e.pointerId);g.focus({preventScroll:true});
    });
    g.addEventListener('pointermove',e=>{
      if(!dragging||dragging.i!==i||dragging.id!==e.pointerId)return;
      const p=svgPoint(e),c=i===0?OPTICS.upper:OPTICS.lower;
      // 轉軸附近無穩定方向；離開後以新的指向重新接續，避免突然翻轉。
      if(Math.hypot(p[0]-c[0],p[1]-c[1])<DRAG_CENTER_RADIUS){dragging.last=null;return;}
      const angle=Math.atan2(p[1]-c[1],p[0]-c[0])*180/Math.PI;
      if(dragging.last===null){dragging.last=angle;return;}
      let delta=angle-dragging.last;if(delta>180)delta-=360;if(delta<-180)delta+=360;
      dragging.last=angle;
      // 保留未取整的小數；碰到邊界時同步收住，反向拖動立即有反應。
      dragging.angle=Math.max(OPTICS.minAngle,Math.min(OPTICS.maxAngle,dragging.angle+delta*DRAG_GAIN));
      setAngle(i,dragging.angle);
    });
    const end=e=>{if(dragging?.id===e.pointerId){dragging=null;if(g.hasPointerCapture(e.pointerId))g.releasePointerCapture(e.pointerId);}};
    g.addEventListener('pointerup',end);g.addEventListener('pointercancel',end);g.addEventListener('lostpointercapture',()=>{dragging=null;});
    g.addEventListener('keydown',e=>{let n=state.angles[i],step=e.shiftKey?2:.5;if(e.key==='ArrowLeft'||e.key==='ArrowDown')n-=step;else if(e.key==='ArrowRight'||e.key==='ArrowUp')n+=step;else if(e.key==='Home')n=OPTICS.minAngle;else if(e.key==='End')n=OPTICS.maxAngle;else return;e.preventDefault();setAngle(i,n);});
  });
  $('#periscope-pulse').addEventListener('click',emitPulse);
  $('#periscope-check').addEventListener('click',()=>{
    if(!scenePixels)return;
    const info=observe(state.angles);
    if(!info.target){feedback('船還沒在觀察窗中央。看看觀察窗：目前是天空、海面，還是被管壁擋住？','try');return;}
    state.done=true;
    feedback('設計完成！小葵在觀察窗中央看見船了。光經過兩面鏡子反射，進入小葵的眼睛。','good');
    render();
  });
  render();
}
