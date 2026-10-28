const section = document.getElementById('card-03');
if (section) {
  const find = id => section.querySelector(`#${id}`);
  const objects = ['image-side-object', 'image-side-virtual', 'image-front-object', 'image-front-reflection'].map(find);
  const objectButton = find('toggle-image-object');
  const lightButton = find('toggle-image-rays');
  const status = find('image-object-status');
  const explanation = find('image-final-explanation');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let objectPresent = true;
  let phase = 'hidden';
  let extensionTimer;

  function show(group, visible) {
    group.style.display = visible ? 'inline' : 'none';
  }
  function cancelReveal() {
    clearTimeout(extensionTimer);
    extensionTimer = undefined;
  }
  function render() {
    objects.forEach(group => show(group, objectPresent));
    show(find('image-side-rays'), objectPresent && phase !== 'hidden');
    show(find('image-mirror-guides'), objectPresent && phase !== 'hidden');
    show(find('image-side-extensions'), objectPresent && phase === 'extended');
    objectButton.textContent = objectPresent ? '移除小熊' : '放回小熊';
    lightButton.disabled = !objectPresent;
    lightButton.textContent = phase === 'hidden' ? '看光怎麼走' : '隱藏光路';
    lightButton.setAttribute('aria-pressed', String(phase !== 'hidden'));
    status.textContent = !objectPresent
      ? '小熊已移除，鏡中像與鏡後的虛像示意也一起消失。'
      : phase === 'reflection'
        ? '從鼻尖的金色標記出發，沿實線經鏡面反射，再進入小葵眼睛。'
        : '小熊反射的光經鏡面進入眼睛。';
    explanation.textContent = objectPresent
      ? '把入眼光線反向延長，會指向鏡後的虛像位置；鏡後沒有光真的通過。'
      : '按「放回小熊」，兩圖中的實物與像就會一起回來。';
    section.dataset.objectPresent = String(objectPresent);
    section.dataset.lightPhase = phase;
  }
  objectButton.addEventListener('click', () => {
    cancelReveal();
    objectPresent = !objectPresent;
    phase = 'hidden';
    render();
  });
  lightButton.addEventListener('click', () => {
    if (!objectPresent) return;
    cancelReveal();
    phase = phase !== 'hidden' ? 'hidden' : reducedMotion.matches ? 'extended' : 'reflection';
    render();
    if (phase === 'reflection') {
      extensionTimer = setTimeout(() => {
        if (!objectPresent || phase !== 'reflection') return;
        phase = 'extended';
        render();
      }, 650);
    }
  });
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches || phase !== 'reflection') return;
    cancelReveal();
    phase = 'extended';
    render();
  });
  addEventListener('pagehide', cancelReveal);
  addEventListener('pageshow', () => {
    if (phase !== 'reflection') return;
    cancelReveal();
    phase = 'extended';
    render();
  });
  render();
}
