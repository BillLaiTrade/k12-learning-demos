/* Static documentary photographs. Particle animation stays in the lesson controller. */
(() => {
  const base = new URL('.', document.currentScript.src);
  const root = document.getElementById('phase-life');
  const title = root.querySelector('h4'), description = root.querySelector('.phase-life-description');
  const photos = [...root.querySelectorAll('.phase-life-photo img')];
  const source = root.querySelector('.phase-life-source');
  const scenes = {
    melt: {title:'冰塊融化', copy:'同一杯冰塊逐漸變小，液態水增加。', alt:['杯中放著多塊固態冰','冰塊變小，杯中液態水增加']},
    freeze: {title:'水滴凝固', copy:'低溫實驗中，同一顆透明水滴凝固成冰。', alt:['低溫表面上的透明液態水滴','同一水滴凝固成白色冰珠']},
    vaporization: {title:'水分蒸發', copy:'同一份鹽水的水分蒸發後，表面留下鹽；水蒸氣看不見。', alt:['把鹽水倒在受熱的石板上','十三分鐘後水分蒸發，石板上留下鹽']},
    condensation: {title:'冷表面凝結出水珠', copy:'顯微實拍：空氣中的水蒸氣在冷表面形成液態水珠。', alt:['冷表面剛開始凝結，水珠還不明顯','同一冷表面出現許多液態水珠']},
    sublimation: {title:'水冰直接昇華', copy:'火星探測器實拍：同一位置的水冰小塊，四天後已昇華消失。', alt:['火星土壤中可見淺色水冰小塊，攝於2008年6月15日','同一位置的水冰小塊四天後已消失，攝於2008年6月19日']},
    deposition: {title:'冰面長出霜晶', copy:'低溫實驗中，水蒸氣在同一冰面形成新的霜晶。', alt:['冰珠表面尚未長出明顯霜晶','同一冰珠表面長出許多枝狀霜晶']}
  };
  const url = (key, side) => new URL(`phase-photo-${key}-${side}.webp`, base).href;
  let ready = false;
  const readyPromise = Promise.all(Object.keys(scenes).flatMap(key => ['before','after'].map(side => {
    const image = new Image(); image.src = url(key, side); return image.decode().then(() => true, () => false);
  }))).then(results => {
    ready = true;
    root.dataset.assets = results.every(Boolean) ? 'ready' : 'failed';
  });
  // Use the measured particle panel height so the whole photo block, including
  // labels and text, is half as tall on both desktop and laptop layouts.
  function sizeToParticlePanel() {
    const height = document.querySelector('.phase-solid-stage').getBoundingClientRect().height;
    if (height > 0) root.style.setProperty('--phase-photo-height', `${height / 2}px`);
  }
  new ResizeObserver(sizeToParticlePanel).observe(document.querySelector('.phase-solid-stage'));
  window.PhaseLife = {
    get ready() { return ready; }, readyPromise,
    begin(key) {
      const scene = scenes[key];
      title.textContent = `實拍對照｜${scene.title}`;
      description.textContent = scene.copy;
      ['before','after'].forEach((side, i) => { photos[i].src = url(key, side); photos[i].alt = scene.alt[i]; });
      source.href = new URL(`phase-life-credits.html#${key}`, base).href;
      root.dataset.process = key; root.hidden = false;
      sizeToParticlePanel();
    },
    // Compatibility with the unchanged particle controller; photographs never animate.
    render() {},
    hide() { root.hidden = true; }
  };
})();
