import {drawMixtureCup,drawMixtureSugar} from './concentration-renderer.js?v=mixture-1';
const clamp=t=>Math.max(0,Math.min(1,t));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;
export function createMixture({images,values,ready,busy,prepare,repaint,reduced}){
  const root=document.getElementById('mixture-workspace'),button=document.getElementById('mixture-play');
  const overlay=document.getElementById('mixture-overlay'),ctx=overlay.getContext('2d');
  const progress=document.getElementById('mixture-progress'),destination=document.getElementById('mixture-destination');
  let mode='ready',start=0,frame=null,lastStage='',snapshot=null;
  const duration=reduced?700:6200;
  function message(text){if(progress.textContent!==text)progress.textContent=text;}
  function geometry(){
    const r=root.getBoundingClientRect(),scene=document.getElementById('mix-canvas').getBoundingClientRect(),d=destination.getBoundingClientRect();
    const unit=1536/r.width;
    overlay.width=1536;overlay.height=Math.ceil(r.height*unit);
    return {unit,sourceX:(scene.left-r.left)*unit+980,sourceY:(scene.top-r.top)*unit+447,targetX:(d.left-r.left+d.width/2)*unit,targetY:(d.top-r.top+d.height/2)*unit,targetScale:d.height*unit/320};
  }
  function draw(now){
    if(!snapshot||mode==='ready')return;
    const g=geometry(),v=snapshot,elapsed=mode==='complete'?1:clamp((now-start)/(v.sugar===0?1400:duration));
    const t=v.sugar===0?.76+.24*elapsed:elapsed;
    const transfer=reduced?1:ease((t-.76)/.24),scale=lerp(1,g.targetScale,transfer);
    const x=lerp(g.sourceX,g.targetX,transfer),y=lerp(g.sourceY,g.targetY,transfer);
    const pouring=clamp((t-.20)/.25),dissolving=clamp((t-.45)/.27);
    if(!reduced){
      const lift=ease(t/.20),back=ease((t-.47)/.20);
      const px=lerp(lerp(544,780,lift),544,back),py=lerp(lerp(570,230,lift),570,back),angle=.65*lift*(1-back);
      ctx.save();ctx.translate(px,py);ctx.rotate(angle);
      ctx.beginPath();ctx.moveTo(-137,-48);ctx.lineTo(124,-48);ctx.lineTo(110,12);ctx.lineTo(72,48);ctx.lineTo(-112,48);ctx.closePath();ctx.clip();
      ctx.drawImage(images.background,407,522,261,96,-137,-48,261,96);
      ctx.restore();
      if(v.sugar>0&&pouring<1){ctx.save();ctx.translate(px,py);ctx.rotate(angle);drawMixtureSugar(ctx,v.sugar*(1-pouring),0,0,.8);ctx.restore();}
      if(v.sugar>0&&t>.20&&t<.47){
        for(let i=0;i<45;i++){
          const f=(pouring*4+i/45)%1;
          ctx.fillStyle=i%3?'#fffef3':'#d5cfbd';ctx.beginPath();ctx.ellipse(lerp(px+80,g.sourceX,f)+Math.sin(i*7)*8,lerp(py+18,g.sourceY+20,f*f),2,1.7,0,0,Math.PI*2);ctx.fill();
        }
      }
    }
    ctx.save();if(reduced)ctx.globalAlpha=elapsed;
    drawMixtureCup(ctx,images.beaker,v.water,x,y,scale,now,!reduced&&t>.45&&t<.73?1:0,v.sugar>0?pouring*(1-dissolving):0);ctx.restore();
    const stage=t<.2?'lift':t<.45?'pour':t<.76?'stir':'move';
    if(stage!==lastStage&&mode==='playing'){
      lastStage=stage;message(stage==='lift'?'拿起已秤量的糖':stage==='pour'?'將糖倒入水中':stage==='stir'?'攪拌，讓糖完全溶解':'將糖水移到下方');
      if(stage==='move')destination.scrollIntoView({block:'center',behavior:reduced?'instant':'smooth'});
    }
    root.dataset.mixtureStage=stage;
    if(t>=1&&mode==='playing'){
      mode='complete';root.dataset.mixture=mode;button.textContent='調整配方';button.disabled=false;
      message(`${v.sugar?'糖水':'水'}已配好：${v.total} 克`);repaint();
    }
    if(mode==='playing')frame=requestAnimationFrame(draw);
  }
  function cancel(){
    if(frame!==null)cancelAnimationFrame(frame);frame=null;mode='ready';snapshot=null;lastStage='';root.dataset.mixture=mode;delete root.dataset.mixtureStage;
    ctx.clearRect(0,0,overlay.width,overlay.height);message('');button.textContent='▶ 觀看混合過程';
  }
  button.addEventListener('click',()=>{
    if(mode==='complete'){cancel();repaint();document.getElementById('mix-canvas').scrollIntoView({block:'center',behavior:reduced?'instant':'smooth'});return;}
    if(!ready()||busy())return;
    prepare();snapshot={...values()};mode='playing';root.dataset.mixture=mode;start=performance.now();button.disabled=true;message('開始混合');repaint();
    document.getElementById('mix-canvas').scrollIntoView({block:'center',behavior:reduced?'instant':'smooth'});
    frame=requestAnimationFrame(draw);
  });
  const observer=new ResizeObserver(()=>{if(mode==='complete')draw(performance.now());});observer.observe(root);
  function update(){
    button.disabled=!ready()||mode==='playing'||busy();
    for(const icon of root.querySelectorAll('[data-mixture-icon]')){
      const c=icon.getContext('2d');c.clearRect(0,0,180,120);
      if(!ready())continue;
      if(icon.dataset.mixtureIcon==='sugar')drawMixtureSugar(c,values().sugar,90,74,.6);
      else drawMixtureCup(c,images.beaker,values().water,90,60,.32,0);
    }
  }
  addEventListener('pagehide',()=>{cancel();repaint();observer.disconnect();});
  addEventListener('pageshow',()=>observer.observe(root));
  return {get active(){return mode!=='ready';},cancel,update};
}
