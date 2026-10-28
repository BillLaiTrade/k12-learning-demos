(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const states = {
    balance: {time:0, playing:false, same:false},
    conduction: {time:0, playing:false, metal:Array(13).fill(20), wood:Array(13).fill(20)},
    convection: {time:0, playing:false, medium:'water'},
    radiation: {time:0, playing:false, shield:false},
    insulation: {time:0, playing:false}
  };
  let frame=0, last=null;
  const temperature = (initial, ambient, time, rate=.16) => {
    const value=ambient+(initial-ambient)*Math.exp(-rate*time);
    return Math.abs(value-ambient)<.05?ambient:value;
  };
  const degrees = t => `${t.toFixed(1)}°C`;
  const color = t => {
    const f=Math.max(0,Math.min(1,(t-20)/40));
    return `rgb(${Math.round(167+62*f)},${Math.round(201-31*f)},${Math.round(213-97*f)})`;
  };
  function renderBalance() {
    const s=states.balance, difference=s.same?0:20*Math.exp(-.24*s.time);
    const d=difference<.05?0:difference, a=40+d, b=40-d;
    $('balance-temp-a').textContent=degrees(a);$('balance-temp-b').textContent=degrees(b);
    $('balance-block-a').setAttribute('fill',color(a));$('balance-block-b').setAttribute('fill',color(b));
    $('balance-arrow').style.display=d===0?'none':'';
    $('balance-note').textContent=d===0?'兩塊金屬達到同溫，彼此沒有淨熱傳遞。':'A 的溫度較高，熱由 A 傳向 B；兩塊金屬的溫度逐漸接近。';
    if(d===0)s.playing=false;
  }
  function diffuse(values, rate, dt) {
    const next=values.slice();next[0]=60;
    for(let i=1;i<values.length;i++){
      const right=i===values.length-1?values[i]:values[i+1];
      next[i]=values[i]+rate*dt*(values[i-1]+right-2*values[i]);
    }
    return next;
  }
  function renderConduction() {
    const s=states.conduction;
    document.querySelectorAll('[data-conduction]').forEach(n=>n.setAttribute('fill',color(s[n.dataset.conduction][Number(n.dataset.index)])));
    $('conduction-metal-tip').textContent=degrees(s.metal[12]);$('conduction-wood-tip').textContent=degrees(s.wood[12]);
  }
  function renderConvection() {
    const s=states.convection;
    $('convection-fluid').setAttribute('fill',s.medium==='water'?'#e0eef2':'#f1f1e5');
    $('convection-note').textContent=`${s.medium==='water'?'水':'空氣'}受熱後，較暖、密度較小的部分上升，周圍較冷的${s.medium==='water'?'水':'空氣'}補入。`;
    document.querySelectorAll('[data-flow-particle]').forEach(n=>{
      const path=$(`convection-${n.dataset.flowParticle}`), length=path.getTotalLength();
      const p=path.getPointAtLength(((s.time*.12+Number(n.dataset.phase))%1)*length);
      n.setAttribute('cx',p.x);n.setAttribute('cy',p.y);
    });
  }
  function renderRadiation() {
    const s=states.radiation;
    $('radiation-shield').toggleAttribute('hidden',!s.shield);
    document.querySelectorAll('[data-radiation-ray]').forEach(n=>{
      const y=n.getAttribute('d').match(/^M225 (\d+)/)[1];
      n.setAttribute('d',`M225 ${y}H${s.shield?440:675}`);
    });
    $('radiation-rays').setAttribute('stroke-dashoffset',-s.time*30);
    $('radiation-shield-toggle').setAttribute('aria-pressed',String(s.shield));
    $('radiation-shield-toggle').textContent=s.shield?'移開遮擋板':'加入遮擋板';
    $('radiation-note').textContent=s.shield?'遮擋板減少了到達地球的直接照射；遮擋物仍可能吸熱與再放熱。':'輻射能穿越沒有空氣的太空，將能量傳向地球。';
  }
  function renderInsulation() {
    const s=states.insulation, wall=$('insulation-wall').checked, air=$('insulation-air').checked, reflect=$('insulation-reflect').checked;
    const factor=.4*(wall?.45:1)+.4*(air?.4:1)+.2*(reflect?.4:1);
    $('insulation-base-temp').textContent=degrees(temperature(60,25,s.time));
    $('insulation-design-temp').textContent=degrees(temperature(60,25,s.time,.16*factor));
    $('insulation-coat').toggleAttribute('hidden',!wall);$('insulation-silver').toggleAttribute('hidden',!reflect);
    $('insulation-conduction').textContent=wall?'減少':'原先';$('insulation-convection').textContent=air?'減少':'原先';$('insulation-radiation').textContent=reflect?'減少':'原先';
  }
  const renderers={balance:renderBalance,conduction:renderConduction,convection:renderConvection,radiation:renderRadiation,insulation:renderInsulation};
  function renderOne(id) {
    renderers[id]();
    const button=$(`${id}-play`), label=states[id].playing?'暫停觀察':states[id].time>0?'繼續觀察':'開始觀察';
    if(button.textContent!==label)button.textContent=label;
    button.setAttribute('aria-pressed',String(states[id].playing));
  }
  function renderAll() { Object.keys(renderers).forEach(renderOne); }
  function tick(now) {
    const dt=last===null?0:Math.max(0,Math.min(.05,(now-last)/1000));last=now;
    Object.entries(states).forEach(([id,s])=>{
      if(!s.playing)return;
      s.time+=dt;
      if(id==='conduction'){
        s.metal=diffuse(s.metal,7,dt);
        s.wood=diffuse(s.wood,.6,dt);
      }
      renderOne(id);
    });
    if(Object.values(states).some(s=>s.playing))frame=requestAnimationFrame(tick);else{frame=0;last=null;}
  }
  function start(){if(!frame){last=null;frame=requestAnimationFrame(tick);}}
  function reset(id) {
    const s=states[id];s.time=0;s.playing=false;
    if(id==='conduction'){s.metal=Array(13).fill(20);s.wood=Array(13).fill(20);}
    if(id==='radiation')s.shield=false;
    renderOne(id);
  }
  Object.keys(states).forEach(id=>{
    $(`${id}-play`).addEventListener('click',()=>{states[id].playing=!states[id].playing;renderOne(id);start();});
    $(`${id}-reset`).addEventListener('click',()=>reset(id));
  });
  document.querySelectorAll('[data-balance]').forEach(button=>button.addEventListener('click',()=>{
    states.balance.same=button.dataset.balance==='same';
    document.querySelectorAll('[data-balance]').forEach(n=>n.setAttribute('aria-pressed',String(n===button)));reset('balance');
  }));
  document.querySelectorAll('[data-medium]').forEach(button=>button.addEventListener('click',()=>{
    states.convection.medium=button.dataset.medium;
    document.querySelectorAll('[data-medium]').forEach(n=>n.setAttribute('aria-pressed',String(n===button)));reset('convection');
  }));
  $('radiation-shield-toggle').addEventListener('click',()=>{states.radiation.shield=!states.radiation.shield;renderRadiation();});
  ['wall','air','reflect'].forEach(id=>$(`insulation-${id}`).addEventListener('change',()=>reset('insulation')));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){Object.values(states).forEach(s=>{s.playing=false;});cancelAnimationFrame(frame);frame=0;last=null;renderAll();}});
  const form=$('heat-quiz'),result=$('heat-quiz-result');
  form.noValidate=true;
  form.addEventListener('submit',event=>{
    event.preventDefault();const data=new FormData(form);result.replaceChildren();result.hidden=false;
    const add=text=>{const p=document.createElement('p');p.textContent=text;result.append(p);};
    const correct={direction:'outside',metal:'conduction',air:'convection',sun:'radiation'};
    if(Object.keys(correct).some(key=>!data.get(key))){add('先完成熱傳方向與三條路徑的判斷，再一起核對。');return;}
    const feedback={direction:'比較 25°C 的環境與 10°C 的冷水：熱由環境傳向冷水。',metal:'能量沿金屬瓶蓋與瓶壁傳遞，屬於傳導。',air:'流動空氣攜帶能量，屬於對流。',sun:'陽光直接傳來的能量，屬於輻射。'};
    const wrong=Object.keys(correct).filter(key=>data.get(key)!==correct[key]);
    if(wrong.length===0){add('判斷都合理！保冷要減慢外界向水壺內部的熱交換。');add('同一個水壺可能同時存在多種傳熱方式，需要分別找出路徑。');}
    else{add('再看一下這幾條路徑：');wrong.forEach(key=>add(feedback[key]));}
  });
  form.addEventListener('reset',()=>{result.hidden=true;result.replaceChildren();});
  const links=[...document.querySelectorAll('.route a[href^="#"]')];
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting)links.forEach(link=>{if(link.hash===`#${entry.target.id}`)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});
  }),{rootMargin:'-20% 0px -65% 0px'});
  links.forEach(link=>observer.observe(document.querySelector(link.hash)));
  renderAll();
})();
