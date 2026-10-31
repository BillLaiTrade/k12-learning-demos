/* A rendered life scene has no timer: the particle controller supplies its progress. */
(() => {
  const base = new URL('.', document.currentScript.src);
  const asset = name => new URL(`phase-life-${name}.webp`, base).href;
  const root = document.getElementById('phase-life');
  const title = root.querySelector('h4'), description = root.querySelector('.phase-life-description');
  const stage = root.querySelector('.phase-life-stage'), picture = root.querySelector('.phase-life-picture');
  const reference = root.querySelector('.phase-life-reference');
  const scenes = {
    melt: { title:'盤子上的冰塊融化了', background:'plate', copy:'冰塊逐漸縮小，盤子上留下液態水。', stages:['冰塊放在盤子上','冰塊融化，液態水逐漸增加','冰塊融化成水'] },
    freeze: { title:'冷凍盒中的水結成冰', background:'cold', copy:'水放出熱量，冰晶逐漸長大，最後結成冰。', stages:['盒中原本是液態水','冰晶逐漸長大','水已凝固成冰'] },
    vaporization: { title:'桌上的水怎麼變少了？', background:'glass', copy:'部分液態水變成看不見的水蒸氣，進入空氣中。', stages:['水面與原水位線齊平','水逐漸蒸發，水面慢慢下降','部分水已蒸發，杯中仍有水'] },
    condensation: { title:'冰飲杯外壁出現水珠', background:'glass', copy:'空氣中的水蒸氣遇到較冷的杯壁，凝結成小水珠；水珠不是從杯內滲出來的。', stages:['冰飲杯外壁尚無水珠','杯外的小水珠逐漸增加、長大','杯外聚集了液態水珠'] },
    sublimation: { title:'冷凍庫裡的冰逐漸變小', background:'cold', copy:'低溫、乾燥時，冰也能直接變成水蒸氣，中間不經過液態水。', stages:['冷凍盒中放著冰塊','冰直接昇華，體積逐漸縮小','示意冰塊已昇華，沒有留下水'] },
    deposition: { title:'冷凍庫的冷表面結霜', background:'cold', copy:'水蒸氣在低於冰點的冷表面直接形成霜晶，中間不經過液態水。', stages:['冷表面尚未結霜','霜晶逐漸形成、長大','冷表面已形成一層霜晶'] }
  };
  const images = Object.fromEntries(['glass','plate','cold','ice','frost'].map(name => {
    const img = new Image(); img.src = asset(name); return [name,img];
  }));
  let ready = false, selected = '', svg, water, surface, ice, pool, frost, droplets, line;
  const readyPromise = Promise.all(Object.values(images).map(img => img.decode().catch(() => null))).then(() => {
    ready = true;
    root.dataset.assets = Object.values(images).every(img => img.naturalWidth) ? 'ready' : 'failed';
  });
  const defs = `<defs>
    <linearGradient id="life-water" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#b9d8dd" stop-opacity=".48"/><stop offset=".28" stop-color="#e9fbfb" stop-opacity=".13"/><stop offset=".72" stop-color="#b1d1d7" stop-opacity=".28"/><stop offset="1" stop-color="#b9d8dd" stop-opacity=".5"/></linearGradient>
    <radialGradient id="life-drop" cx=".28" cy=".2"><stop stop-color="#fff" stop-opacity=".95"/><stop offset=".22" stop-color="#f8ffff" stop-opacity=".25"/><stop offset=".73" stop-color="#d3e8ed" stop-opacity=".4"/><stop offset="1" stop-color="#6e8f9a" stop-opacity=".8"/></radialGradient>
    <radialGradient id="life-pool"><stop stop-color="#dae8e9" stop-opacity=".18"/><stop offset=".85" stop-color="#bdd6dc" stop-opacity=".35"/><stop offset="1" stop-color="#7fabb4" stop-opacity=".55"/></radialGradient>
    <clipPath id="life-glass-clip"><path d="M383 101L396 450Q500 480 598 450L611 101Z"/></clipPath>
    <clipPath id="life-frozen-clip"><path d="M220 376 300 322 705 322 785 376 735 400 270 400Z"/></clipPath>
    <clipPath id="life-freeze-front"><rect x="200" y="270" width="0" height="180"/></clipPath>
    <clipPath id="life-frost-front"><rect x="175" y="270" width="0" height="200"/></clipPath>
  </defs>`;
  function build(key) {
    const scene = scenes[key]; selected = key;
    title.textContent = `生活中的變化｜${scene.title}`; description.textContent = scene.copy;
    reference.hidden = key !== 'vaporization';
    picture.querySelector('svg')?.remove();
    picture.insertAdjacentHTML('afterbegin', `<svg viewBox="0 0 1000 562" role="img" aria-label="${scene.title}">${defs}
      <image href="${asset(scene.background)}" width="1000" height="562"/>
      <g id="life-glass" clip-path="url(#life-glass-clip)"><path id="life-water-body" fill="url(#life-water)"/><ellipse id="life-water-surface" cx="499" rx="108" ry="12" fill="#e0f2f2" fill-opacity=".28" stroke="#eaffff" stroke-opacity=".8" stroke-width="2.5"/></g>
      <ellipse id="life-pool-shape" cx="500" cy="410" rx="200" ry="37" fill="url(#life-pool)" stroke="#d4e4e4" stroke-width="2"/>
      <g id="life-ice"><image href="${asset('ice')}" x="330" y="205" width="340" height="280"/></g>
      <g id="life-frost" stroke="#f6ffff" stroke-linecap="round"/>
      <g id="life-droplets" fill="url(#life-drop)" stroke="#91a6ac" stroke-opacity=".65" stroke-width=".8"/>
      <path id="life-reference-line" d="M382 250H617" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="9 7"/>
    </svg>`);
    svg = picture.querySelector('svg');
    water = svg.querySelector('#life-water-body'); surface = svg.querySelector('#life-water-surface');
    ice = svg.querySelector('#life-ice'); pool = svg.querySelector('#life-pool-shape');
    frost = svg.querySelector('#life-frost'); droplets = svg.querySelector('#life-droplets'); line = svg.querySelector('#life-reference-line');
    if (key === 'freeze') {
      ice.innerHTML = `<g clip-path="url(#life-freeze-front)"><g clip-path="url(#life-frozen-clip)"><path d="M220 376 300 322 705 322 785 376 735 400 270 400Z" fill="#d4e9ed" fill-opacity=".85" stroke="#ecffff" stroke-width="3"/><image href="${asset('ice')}" x="200" y="235" width="600" height="210" opacity=".8" preserveAspectRatio="none"/></g></g>`;
    }
    if (key === 'condensation') {
      ice.innerHTML = `<g clip-path="url(#life-glass-clip)"><image href="${asset('ice')}" x="405" y="210" width="190" height="165"/></g>`;
      for (let i=0;i<42;i++) {
        const x=404+(i*47%187), y=290+(i*61%150);
        droplets.insertAdjacentHTML('beforeend', `<ellipse cx="${x}" cy="${y}" rx="${3+i%4}" ry="${4+i%5}"/>`);
      }
    }
    if (key === 'deposition') {
      frost.innerHTML=`<image href="${asset('frost')}" x="175" y="317" width="650" height="95" preserveAspectRatio="none" clip-path="url(#life-frost-front)"/>`;
    }
  }
  function render(progress) {
    if (!selected) return;
    const p=Math.max(0,Math.min(1,progress)), key=selected;
    root.dataset.progress=p.toFixed(6);
    stage.textContent=scenes[key].stages[p===0?0:p>=1?2:1];
    svg.setAttribute('aria-label', `${scenes[key].title}：${stage.textContent}`);
    water.parentElement.style.display=['vaporization','condensation'].includes(key)?'':'none';
    ice.style.display=['melt','freeze','sublimation','condensation'].includes(key)?'':'none';
    pool.style.display=['melt','freeze'].includes(key)?'':'none';
    line.style.display=key==='vaporization'?'':'none';
    if(key==='vaporization'||key==='condensation') {
      const y=key==='vaporization'?250+100*p:265;
      water.setAttribute('d',`M385 ${y}Q499 ${y+22} 609 ${y}L598 450Q499 478 396 450Z`);
      surface.setAttribute('cy',y); surface.setAttribute('rx',108-(y-250)*.025);
      root.dataset.waterY=y.toFixed(4);
    }
    if(key==='melt'||key==='sublimation') {
      const size=Math.cbrt(1-p);
      ice.setAttribute('transform',`translate(500 422) scale(${size}) translate(-500 -422)`);
      ice.style.opacity=p===1?'0':'1';
      pool.setAttribute('rx',30+175*Math.sqrt(p)); pool.setAttribute('ry',6+32*Math.sqrt(p)); pool.style.opacity=String(p);
    } else { ice.removeAttribute('transform'); ice.style.opacity='1'; }
    svg.querySelector('#life-freeze-front rect').setAttribute('width',600*p);
    svg.querySelector('#life-frost-front rect').setAttribute('width',650*p);
    if(key==='freeze') { pool.setAttribute('rx','270');pool.setAttribute('ry','24');pool.setAttribute('cy','377');pool.style.opacity=String(1-p); }
    else pool.setAttribute('cy','410');
    [...droplets.children].forEach((drop,i) => {
      const local=Math.max(0,Math.min(1,(p-i/60)*2.6));
      drop.style.opacity=String(local);drop.setAttribute('transform',`translate(${drop.getAttribute('cx')} ${drop.getAttribute('cy')}) scale(${local}) translate(${-drop.getAttribute('cx')} ${-drop.getAttribute('cy')})`);
    });
    [...frost.children].forEach((crystal,i) => {crystal.style.opacity=String(Math.max(0,Math.min(1,(p-i/140)*3.5)));});
  }
  window.PhaseLife={
    get ready(){return ready;}, readyPromise,
    begin(key){ if(selected!==key)build(key);root.hidden=false;root.dataset.process=key;render(0); },
    render,
    hide(){root.hidden=true;}
  };
})();
