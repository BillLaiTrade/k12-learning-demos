/* Static image comparisons. Particle animation stays in the lesson controller. */
(() => {
  const base = new URL('.', document.currentScript.src);
  const root = document.getElementById('phase-life');
  const title = root.querySelector('h4'), description = root.querySelector('.phase-life-description');
  const photos = [...root.querySelectorAll('.phase-life-photo img')];
  const source = root.querySelector('.phase-life-source');
  const scenes = {
    melt: {illustration:true, title:'冰塊融化', copy:'冰塊吸熱融化，變成杯中的液態水。', alt:['寫實生成示意：透明短杯中放著一塊冰','寫實生成示意：同款透明短杯中，冰塊完全融成液態水']},
    freeze: {illustration:true, title:'杯中的水凝固', copy:'水放熱凝固，在杯中形成固態冰。', alt:['寫實生成示意：透明短杯中的液態水','寫實生成示意：水在同款短杯內凝固成符合杯形的冰']},
    vaporization: {title:'水分蒸發', copy:'同一份鹽水的水分蒸發後，表面留下鹽；水蒸氣看不見。', alt:['把鹽水倒在受熱的石板上','十三分鐘後水分蒸發，石板上留下鹽']},
    condensation: {title:'清晨草葉上的露水', copy:'清晨草葉表面較冷，空氣中的水蒸氣遇冷凝結，形成小露珠。', alt:['表面乾燥、尚未出現明顯露珠的綠色草葉，凝結前示意','綠色草葉表面布滿透明露珠，凝結後示意']},
    sublimation: {title:'水冰直接昇華', copy:'火星探測器實拍：同一位置的水冰小塊，四天後已昇華消失。', alt:['火星土壤中可見淺色水冰小塊，攝於2008年6月15日','同一位置的水冰小塊四天後已消失，攝於2008年6月19日']},
    deposition: {title:'冰面長出霜晶', copy:'低溫實驗中，水蒸氣在同一冰面形成新的霜晶。', alt:['冰珠表面尚未長出明顯霜晶','同一冰珠表面長出許多枝狀霜晶']}
  };
  const photoVersions = {melt:'20261031-melt-generated1', freeze:'20261031-freeze-generated1', condensation:'20261031-dew1'};
  const url = (key, side) => new URL(`phase-photo-${key}-${side}.webp${photoVersions[key] ? `?v=${photoVersions[key]}` : ''}`, base).href;
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
      title.textContent = `${scene.illustration ? '寫實示意' : '實拍對照'}｜${scene.title}`;
      description.textContent = scene.copy;
      ['before','after'].forEach((side, i) => { photos[i].src = url(key, side); photos[i].alt = scene.alt[i]; });
      source.href = new URL(`phase-life-credits.html#${key}`, base).href;
      source.textContent = scene.illustration ? '圖片來源與製作說明' : '照片來源與拍攝條件';
      root.dataset.process = key; root.hidden = false;
      sizeToParticlePanel();
    },
    // Compatibility with the unchanged particle controller; photographs never animate.
    render() {},
    hide() { root.hidden = true; }
  };
})();
