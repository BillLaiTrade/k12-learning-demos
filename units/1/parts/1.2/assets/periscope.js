import {OPTICS, mirror, viewRay, exteriorSample, observe, traceRay, returnSignal} from './periscope-optics.mjs';

const root=document.querySelector('#unit-quiz');
if(root) {
  const $=s=>root.querySelector(s), $$=s=>[...root.querySelectorAll(s)];
  const svg=$('#periscope-scene'), canvas=$('#periscope-view'), ctx=canvas.getContext('2d',{alpha:false});
  const groups=[$('#periscope-mirror-0'),$('#periscope-mirror-1')];
  const state={stage:0,angles:[38,51],done:[false,false,false],order:[null,null],chip:null,diagnosis:null,prediction:null,path:false,hint:0,signal:false,verified:false,saved:[45,45]};
  let scenePixels=null, lastViewKey='', pending=0, dragging=null;
  const sceneImage=new Image();
  sceneImage.src=new URL('periscope/submarine-scene.webp',import.meta.url).href;
  sceneImage.onload=()=>{
    const source=document.createElement('canvas');source.width=900;source.height=760;
    const sctx=source.getContext('2d',{willReadFrequently:true});sctx.drawImage(sceneImage,0,0,900,760);
    scenePixels=sctx.getImageData(0,0,900,760).data;lastViewKey='';render();root.dataset.ready='true';
  };
  sceneImage.onerror=()=>{feedback('場景素材未載入，請重新整理頁面後再挑戰。','try');root.dataset.ready='error';};
  function feedback(text,kind='') {$('#periscope-feedback').textContent=text;$('#periscope-feedback').dataset.state=kind;}
  function point(p) {return p.slice(0,2).map(n=>n.toFixed(2)).join(',');}
  function drawPath(el,points,color,reverse=false,muted=false) {
    el.replaceChildren(); if(points.length<2)return;
    const ns='http://www.w3.org/2000/svg', d='M'+points.map(point).join('L');
    const add=(path,cls,stroke)=>{const e=document.createElementNS(ns,'path');e.setAttribute('d',path);e.setAttribute('class',cls);e.setAttribute('stroke',stroke);el.append(e);};
    if(!muted)add(d,'light-glow',color);
    add(d,'light-line',color);
    if(muted){el.style.opacity='.65';return;} el.style.opacity='1';
    for(let i=1;i<points.length;i++) {
      const a=reverse?points[i]:points[i-1], b=reverse?points[i-1]:points[i], len=Math.hypot(b[0]-a[0],b[1]-a[1]);
      if(len<60)continue;
      const t=state.stage===2?.43:.62, x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,dx=(b[0]-a[0])/len,dy=(b[1]-a[1])/len;
      add(`M${x-dx*13-dy*7},${y-dy*13+dx*7}L${x},${y}L${x-dx*13+dy*7},${y-dy*13-dx*7}`,'light-arrow',color);
    }
  }
  function forwardRay() {
    const ray=traceRay([508.0001,190,0],[1,0,0],state.angles);
    return {...ray,points:[[170,190,0],...ray.points]};
  }
  function signalPoints(result) {
    const points=result.ray.points.map(p=>[...p]);
    if(result.endpoint)points.push(result.endpoint);
    return points;
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
      g.setAttribute('aria-disabled',String(state.stage===2));g.setAttribute('tabindex',state.stage===2?'-1':'0');
    });
    const ray=forwardRay(), marker=$('#periscope-block-marker');
    marker.hidden=true;marker.setAttribute('hidden','');
    $('#periscope-normal').replaceChildren();
    if(state.stage===2) {
      const saved=returnSignal(state.saved);
      drawPath($('#periscope-recorded'),signalPoints(saved).reverse(),'#fff0b1',false,true);
      if(state.signal)drawPath($('#periscope-light'),signalPoints(returnSignal(state.angles)),'#48a9ff');
      else $('#periscope-light').replaceChildren();
    } else {
      $('#periscope-recorded').replaceChildren();
      if(state.path) {
        drawPath($('#periscope-light'),ray.points,'#ffe471');
        if(ray.kind==='blocked') {marker.removeAttribute('hidden');marker.hidden=false;marker.setAttribute('transform',`translate(${point(ray.points.at(-1))})`);}
      } else $('#periscope-light').replaceChildren();
      if(state.hint>=2) {
        const hit=ray.hits.at(-1);
        if(hit) {
          const n=document.createElementNS('http://www.w3.org/2000/svg','path'),p=hit.point,v=hit.normal;
          n.setAttribute('d',`M${p[0]-v[0]*65},${p[1]-v[1]*65}L${p[0]+v[0]*65},${p[1]+v[1]*65}`);n.setAttribute('stroke','#eafff9');n.setAttribute('stroke-width','3');n.setAttribute('stroke-dasharray','8 6');$('#periscope-normal').append(n);
        }
      }
    }
  }
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
    const info=observe(state.angles), messages={blocked:'視線被管壁或鏡背擋住',boat:info.target?'船的駕駛艙已在中央':'看見船了，再調整一下',sky:'目前主要看見天空',sea:'目前主要看見海面'};
    root.dataset.phase=String(state.stage);root.dataset.angles=state.angles.join(',');root.dataset.view=info.kind;root.dataset.target=String(info.target);root.dataset.completed=state.done.join(',');root.dataset.path=String(state.path);root.dataset.signal=String(state.signal);
    $('#periscope-view-state').textContent=messages[info.kind];$('#periscope-view-state').dataset.kind=info.kind;
    $('#periscope-view').setAttribute('aria-label',messages[info.kind]+'。'+(info.blocked?'部分視線受到遮擋。':''));
    $('#periscope-view-copy').textContent=state.stage===2?'鏡片保持固定；這是剛才修復後的景象。':info.kind==='blocked'?'鏡子未把外界的光送進眼睛。看看光在哪裡被擋住。':info.blocked/(info.clear+info.blocked)>.3?'邊緣的暗區是管壁或有限鏡片造成的遮擋。':'試著微轉鏡片，觀察船、天空與海面如何移動。';
    $$('.periscope-steps button').forEach((b,i)=>{b.disabled=i>0&&!state.done[i-1];b.setAttribute('aria-selected',String(i===state.stage));b.tabIndex=i===state.stage?0:-1;b.dataset.complete=String(state.done[i]);});
    $('#periscope-panel').setAttribute('aria-labelledby',`periscope-tab-${state.stage}`);
    for(let i=0;i<3;i++)$(`#periscope-question-${i}`).hidden=i!==state.stage;
    $$('.periscope-slot').forEach((b,i)=>{b.textContent=state.order[i]===null?i===0?'第一個位置':'第二個位置':state.order[i]===0?'鏡面一':'鏡面二';b.dataset.filled=String(state.order[i]!==null);b.setAttribute('aria-label',`${i===0?'第一':'第二'}個反射位置，${state.order[i]===null?'尚未填入':b.textContent}`);});
    $$('.periscope-chip').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.chip)===state.chip)));
    $$('[data-diagnosis]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.diagnosis)===state.diagnosis)));
    $$('[data-prediction]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.prediction===state.prediction)));
    $('#periscope-fine').hidden=state.stage===2;$('#periscope-toggle-path').hidden=state.stage===2;$('#periscope-toggle-path').setAttribute('aria-pressed',String(state.path));$('#periscope-toggle-path').textContent=state.path?'◎ 隱藏光路':'◎ 顯示光路';
    $('#periscope-signal').hidden=state.stage!==2;$('#periscope-signal').disabled=!state.prediction;$('#periscope-signal').setAttribute('aria-pressed',String(state.signal));$('#periscope-signal').textContent=state.signal?'關閉訊號光':'發送訊號光';
    $('#periscope-reset-stage').textContent=['↻ 重新組裝','↻ 重現故障','↻ 重做預測'][state.stage];
    $('#periscope-check').textContent=['檢查我的設計','檢查修復結果','確認我的預測'][state.stage];
    $('#periscope-next').hidden=!state.done[state.stage]||state.stage===2;$('#periscope-next').textContent=state.stage===0?'前往修復光路 →':'前往反向傳訊 →';
    $('#periscope-complete').hidden=!state.done[2];
    $('#periscope-drag-help').textContent=state.stage===2?'這一關固定鏡面。先預測，再比較黃色原路線與藍色訊號光。':'抓住鏡片端點旋轉；也可點選鏡片後，用 ← → 微調，Shift 加快。';
    drawOptics();renderView();
  }
  function schedule(){if(!pending)pending=requestAnimationFrame(render);}
  function invalidate() {
    // A completed design is valid only while its geometry and reasoning match.
    if(state.done[state.stage]) {
      for(let i=state.stage;i<3;i++)state.done[i]=false;
      feedback('設計已改變，請重新檢查目前的操作與說明。');
    }
  }
  function setAngle(i,value) {
    if(state.stage===2)return;
    const n=Math.round(Math.max(OPTICS.minAngle,Math.min(OPTICS.maxAngle,value))*10)/10;
    if(n===state.angles[i])return;
    invalidate();state.angles[i]=n;state.verified=false;schedule();
  }
  function svgPoint(e) {
    const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());return [p.x,p.y];
  }
  groups.forEach((g,i)=>{
    g.addEventListener('pointerdown',e=>{
      if(state.stage===2||e.button>0)return;e.preventDefault();
      const p=svgPoint(e),c=i===0?OPTICS.upper:OPTICS.lower;
      const initial=Math.atan2(p[1]-c[1],p[0]-c[0])*180/Math.PI;
      dragging={i,id:e.pointerId,start:initial,angle:state.angles[i]};g.setPointerCapture(e.pointerId);g.focus({preventScroll:true});
    });
    g.addEventListener('pointermove',e=>{
      if(!dragging||dragging.i!==i||dragging.id!==e.pointerId)return;
      const p=svgPoint(e),c=i===0?OPTICS.upper:OPTICS.lower,angle=Math.atan2(p[1]-c[1],p[0]-c[0])*180/Math.PI;
      let delta=angle-dragging.start;if(delta>180)delta-=360;if(delta<-180)delta+=360;
      setAngle(i,dragging.angle+delta);
    });
    const end=e=>{if(dragging?.id===e.pointerId){dragging=null;if(g.hasPointerCapture(e.pointerId))g.releasePointerCapture(e.pointerId);}};
    g.addEventListener('pointerup',end);g.addEventListener('pointercancel',end);g.addEventListener('lostpointercapture',()=>{dragging=null;});
    g.addEventListener('keydown',e=>{if(state.stage===2)return;let n=state.angles[i],step=e.shiftKey?2:.5;if(e.key==='ArrowLeft'||e.key==='ArrowDown')n-=step;else if(e.key==='ArrowRight'||e.key==='ArrowUp')n+=step;else if(e.key==='Home')n=OPTICS.minAngle;else if(e.key==='End')n=OPTICS.maxAngle;else return;e.preventDefault();setAngle(i,n);});
  });
  $$('[data-fine]').forEach(b=>b.addEventListener('click',()=>{const [i,step]=b.dataset.fine.split(',').map(Number);setAngle(i,state.angles[i]+step);}));
  function putChip(slot,chip) {
    if(chip!==0&&chip!==1)return;
    invalidate();const other=1-slot,old=state.order[slot];if(state.order[other]===chip)state.order[other]=old;
    state.order[slot]=chip;state.chip=null;render();
  }
  $$('.periscope-chip').forEach(b=>{
    b.addEventListener('click',()=>{state.chip=Number(b.dataset.chip);render();});
    b.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',b.dataset.chip);e.dataTransfer.effectAllowed='move';});
  });
  $$('.periscope-slot').forEach(b=>{
    b.addEventListener('click',()=>{if(state.chip!==null)putChip(Number(b.dataset.slot),state.chip);else feedback('先點選下方的鏡面標籤，再點要放入的位置。');});
    b.addEventListener('dragover',e=>{e.preventDefault();b.classList.add('is-drop-target');});
    b.addEventListener('dragleave',()=>b.classList.remove('is-drop-target'));
    b.addEventListener('drop',e=>{e.preventDefault();b.classList.remove('is-drop-target');const value=e.dataTransfer.getData('text/plain');if(value==='0'||value==='1')putChip(Number(b.dataset.slot),Number(value));});
  });
  $('#periscope-clear-order').addEventListener('click',()=>{invalidate();state.order=[null,null];state.chip=null;render();});
  $$('[data-diagnosis]').forEach(b=>b.addEventListener('click',()=>{invalidate();state.diagnosis=Number(b.dataset.diagnosis);render();}));
  $$('[data-prediction]').forEach(b=>b.addEventListener('click',()=>{invalidate();state.prediction=b.dataset.prediction;state.verified=false;state.signal=false;render();}));
  $('#periscope-toggle-path').addEventListener('click',()=>{state.path=!state.path;render();});
  const hints=[
    ['先讓眼睛收到下方鏡片反射的光，再觀察上方鏡片把視線帶向哪裡。','看天空或海面時，外界光路仍接通；全暗則先檢查視線有沒有撞上管壁。','沿法線比較入射與反射方向。黃色叉號是這條示例光線被擋住的位置。'],
    ['故障前，下方鏡片已把光送進眼睛。先比較光路從哪一處開始偏離。','法線與鏡面垂直。每一處反射都要讓入射角等於反射角。','只剩天空不代表光消失了，而是看向了另一個方向。'],
    ['將傳播方向反過來，入射線與反射線的角色會交換。','鏡子固定時，同一反射點兩側的角度仍相等。','藍光由原本眼睛的位置出發；比較它和黃色原路線是否完整重合。']
  ];
  $('#periscope-hint').addEventListener('click',()=>{state.hint=Math.min(3,state.hint+1);$('#periscope-hint-copy').hidden=false;$('#periscope-hint-copy').textContent=hints[state.stage][state.hint-1];if(state.stage!==2)state.path=true;render();});
  $('#periscope-signal').addEventListener('click',()=>{if(!state.prediction)return;state.signal=!state.signal;if(state.signal)state.verified=true;render();});
  function enterStage(stage,reset=false) {
    if(stage>0&&!state.done[stage-1])return;
    state.stage=stage;state.path=false;state.hint=0;state.signal=false;state.verified=false;
    $('#periscope-hint-copy').hidden=true;
    const content=[
      ['我在潛水艇裡，怎麼看見海上的船？','先轉動鏡片，再從觀察窗找找船在哪裡。','任務一｜把船的駕駛艙調到觀察窗中央','拖曳鏡片端點旋轉。先試著觀察，需要時再顯示輔助光路。'],
      ['剛才明明看見船，怎麼現在偏向天空了？','先判斷哪片鏡子被轉動，再把景象修回來。','任務二｜找出故障，讓船重新回到中央','先選擇你的判斷，再拖動鏡片修復；需要時可顯示光路。'],
      ['我能沿同一條路，把訊號送回船上嗎？','鏡片保持不動，先預測，再發送藍色訊號光。','任務三｜讓訊號沿原光路返回','黃色是剛才進入眼睛的一條代表光線；藍光由眼睛原位置反向發出。']
    ][stage];
    ['#periscope-student','#periscope-grandpa','#periscope-task-title','#periscope-task-copy'].forEach((id,i)=>$(id).textContent=content[i]);
    if(stage===0) {
      if(reset){state.angles=[38,51];state.order=[null,null];state.chip=null;state.done=[false,false,false];}
      feedback('先調整觀察窗，再完成光經過鏡面的順序。');
    } else if(stage===1) {
      state.angles=[Math.min(65,state.saved[0]+9),state.saved[1]];state.diagnosis=null;state.done[1]=false;state.done[2]=false;
      feedback('先判斷哪片鏡子偏了，再修復；只碰巧看到船還不算完成。');
    } else {state.angles=[...state.saved];state.prediction=null;state.done[2]=false;feedback('先選擇預測，再發送訊號，最後確認你的判斷。');}
    lastViewKey='';render();
  }
  $$('.periscope-steps button').forEach((b,i)=>{
    b.addEventListener('click',()=>{if(i!==state.stage)enterStage(i);});
    b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const available=$$('.periscope-steps button').filter(x=>!x.disabled),at=available.indexOf(b),next=e.key==='Home'?0:e.key==='End'?available.length-1:(at+(e.key==='ArrowRight'?1:-1)+available.length)%available.length;available[next].click();available[next].focus();});
  });
  $('#periscope-next').addEventListener('click',()=>{enterStage(state.stage+1);$('#periscope-panel').scrollIntoView({block:'start',behavior:'smooth'});});
  $('#periscope-reset-stage').addEventListener('click',()=>{
    for(let i=state.stage;i<3;i++)state.done[i]=false;
    enterStage(state.stage,state.stage===0);
  });
  $('#periscope-restart').addEventListener('click',()=>enterStage(0,true));
  $('#periscope-check').addEventListener('click',()=>{
    const info=observe(state.angles);
    if(state.stage===0) {
      if(!info.target){feedback('還沒對準船的駕駛艙。看看觀察窗：目前是天空、海面，還是被管壁擋住？','try');return;}
      if(state.order[0]!==0||state.order[1]!==1){feedback('已看見船！再追蹤船反射的光，確認先碰到哪片鏡子、接著到哪裡。','try');return;}
      state.saved=[...state.angles];state.done[0]=true;feedback('設計完成！船反射的光先到鏡面一，再到鏡面二，最後進入眼睛。接著試著排除故障。','good');
    } else if(state.stage===1) {
      if(state.diagnosis===null){feedback('先判斷哪片鏡子被轉動，再檢查修復結果。','try');return;}
      if(state.diagnosis!==0){feedback('這次被轉動的鏡片與你的判斷不同。比較光從哪一處開始偏離，再試一次。','try');return;}
      if(!info.target){feedback('已找出故障鏡片，還要把船的駕駛艙調回觀察窗中央。','try');return;}
      if(!returnSignal(state.angles).receiver){feedback('船已進入視野，再微調到駕駛艙中央，讓接下來的訊號也能回到船上。','try');return;}
      state.saved=[...state.angles];state.done[1]=true;feedback('修復成功！上方鏡片偏轉，會把視線帶向天空或海面；偏得太多也會被管壁擋住。','good');
    } else {
      if(!state.prediction){feedback('先選擇一個預測，再發送訊號驗證。','try');return;}
      if(!state.verified){feedback('按「發送訊號光」，實際比較藍光與黃色原路線。','try');return;}
      if(state.prediction!=='same'){feedback('比較藍光：它是否只在管內重合？看看離開上方入口後，是否仍沿黃色原路線返回。','try');return;}
      if(!returnSignal(state.angles).receiver){feedback('訊號尚未回到船上的接收位置，請返回修復光路任務重新對準。','try');return;}
      state.done[2]=true;feedback('預測與驗證一致！兩次反射的順序反過來，光仍沿原路徑回到船上，這就是光路可逆。','good');
    }
    render();
  });
  render();
}
