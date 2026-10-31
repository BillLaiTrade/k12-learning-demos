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
    vaporization: {illustration:true, title:'地磚積水蒸發', copy:'地磚表面的積水蒸發，變成看不見的水蒸氣。', alt:['寫實生成示意：不吸水的地磚表面有一灘水','寫實生成示意：同一處積水蒸發後，地磚表面變乾']},
    condensation: {illustration:true, title:'清晨草葉上的露水', copy:'清晨草葉表面較冷，空氣中的水蒸氣遇冷凝結，形成小露珠。', alt:['寫實生成示意：同一片綠色草葉的乾燥表面','寫實生成示意：空氣中的水蒸氣凝結後，草葉表面布滿透明露珠']},
    sublimation: {illustration:true, title:'冷凍庫中的冰昇華', copy:'冰持續處於零下、乾燥的冷凍庫中，經長時間直接昇華成看不見的水蒸氣。', alt:['寫實生成示意：零下冷凍庫中的乾燥金屬盤內有一塊冰','寫實生成示意：冰在持續零下、乾燥的環境中經長時間昇華後，留下乾燥空盤']},
    deposition: {illustration:true, title:'窗玻璃長出霜晶', copy:'水蒸氣在零下的窗玻璃表面放熱，直接形成固態霜晶。', alt:['寫實生成示意：同一木框窗玻璃尚未出現明顯枝狀霜晶','寫實生成示意：水蒸氣在零下窗玻璃表面直接形成枝狀固態霜晶']}
  };
  const photoVersions = {melt:'20261031-melt-generated1', freeze:'20261031-freeze-generated1', vaporization:'20261031-vaporization-generated1', condensation:'20261031-condensation-generated1', sublimation:'20261031-sublimation-generated1', deposition:'20261031-deposition-generated1'};
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
      title.textContent = `生活例子｜${scene.title}`;
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
