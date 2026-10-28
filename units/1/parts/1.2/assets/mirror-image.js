import {MIRROR_SCENE as scene, observation, spriteAt, opticalPath, clampEye, mirrorPoint} from './mirror-image-geometry.mjs?v=1';

const section = document.getElementById('card-03');
if (section) {
  const find = id => section.querySelector(`#${id}`);
  const svg = find('image-side-view'), observer = find('image-observer');
  const objectButton = find('toggle-image-object'), changeButton = find('change-image-observer');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const objects = ['image-side-object', 'image-side-virtual', 'image-front-object', 'image-front-reflection'].map(find);
  const state = {present: true, eyeY: scene.initialEye, recordedY: null};
  let dragging = null, animation = 0;
  const show = (element, visible) => { element.style.display = visible ? 'inline' : 'none'; };
  const attrs = (element, values) => { for (const [name, value] of Object.entries(values)) element.setAttribute(name, value); };

  // Both bears use this exact sprite; the virtual copy reflects all points across the same plane.
  attrs(find('image-bear-sprite'), spriteAt(scene.source, scene.bearNose, scene.bearSize));
  const profile = spriteAt([0, 0], scene.observerEye, scene.observerSize);
  attrs(find('image-observer-profile'), profile);
  attrs(find('image-observer-hit'), {x: profile.x - 8, y: profile.y - 8, width: profile.width + 16, height: profile.height + 16});
  attrs(find('image-side-virtual-shape'), {transform: `translate(${2 * scene.mirrorX} 0) scale(-1 1)`});
  const image = mirrorPoint(scene.source);
  attrs(find('image-object-point'), {cx: scene.source[0], cy: scene.source[1]});
  attrs(find('image-virtual-point'), {cx: image[0], cy: image[1]});
  attrs(find('image-distance-guide'), {d: `M${scene.source[0]},650H${scene.mirrorX}H${image[0]}M${scene.source[0]},643V657M${scene.mirrorX},643V657M${image[0]},643V657`});

  function drawRay(prefix, ray) {
    attrs(find(`image-ray-${prefix}-in`), {d: opticalPath(ray.incoming, true)});
    attrs(find(`image-ray-${prefix}-out`), {d: opticalPath(ray.outgoing, true)});
    attrs(find(`image-extension-${prefix}`), {d: opticalPath(ray.extension)});
    attrs(find(`image-hit-${prefix}`), {cx: ray.hit[0], cy: ray.hit[1]});
  }
  function render() {
    const current = observation(state.eyeY);
    const compare = state.recordedY !== null && Math.abs(state.eyeY - state.recordedY) > .1;
    objects.forEach(group => show(group, state.present));
    show(find('image-side-rays'), state.present);
    show(find('image-side-extensions'), state.present);
    show(find('image-mirror-guides'), state.present);
    show(find('image-record-rays'), state.present && compare);
    show(find('image-extension-record'), state.present && compare);
    show(find('image-hit-record'), state.present && compare);
    show(find('image-observer-record'), state.present && compare);
    show(find('image-record-label'), state.present && compare);
    show(find('image-point-callout'), state.present && compare);
    drawRay('current', current);
    attrs(observer, {transform: `translate(${current.eye.join(' ')})`});
    if (state.recordedY !== null) {
      const recorded = observation(state.recordedY);
      drawRay('record', recorded);
      attrs(find('image-observer-record'), {transform: `translate(${recorded.eye.join(' ')})`});
      const above = recorded.eye[1] < current.eye[1];
      attrs(find('image-record-label'), {transform: `translate(20 ${recorded.eye[1] + (above ? -100 : 90)})`});
    }
    const currentBelow = !compare || state.eyeY > state.recordedY;
    attrs(find('image-current-label'), {transform: `translate(20 ${state.eyeY + (currentBelow ? 90 : -100)})`});
    find('image-current-label-text').textContent = compare ? 'B 現在的位置' : '小葵目前的位置';
    const dragHintY = state.eyeY > 190 ? state.eyeY + 74 : state.eyeY + 45;
    attrs(find('image-drag-hint'), {transform: `translate(240 ${dragHintY})`});
    observer.setAttribute('aria-valuenow', String(Math.round((scene.eyeMax - state.eyeY) / (scene.eyeMax - scene.eyeMin) * 100)));
    observer.setAttribute('aria-valuetext', `觀察位置${state.eyeY < 190 ? '較高' : '較低'}，可上下拖動或使用方向鍵`);
    observer.setAttribute('aria-disabled', String(!state.present));
    observer.setAttribute('tabindex', state.present ? '0' : '-1');
    objectButton.textContent = state.present ? '移除小熊' : '放回小熊';
    changeButton.disabled = !state.present;
    find('image-object-status').textContent = !state.present
      ? '小熊已移除，鏡中像與鏡後的虛像示意也一起消失。'
      : compare
        ? '橘色保留上一次觀察，藍色是目前光路；兩次反向延長線指向同一個鼻尖像點。'
        : '先沿藍色實線看光怎麼進入眼睛，再拖動小葵或按「換個位置看看」。';
    find('image-final-explanation').textContent = state.present
      ? '小熊各點都能這樣找像，合起來就是完整的虛像；虛線只是輔助線，鏡後沒有光真的通過。'
      : '按「放回小熊」，實物與對稱的虛像就會一起回來。';
    section.dataset.objectPresent = String(state.present);
    section.dataset.eyeY = String(state.eyeY);
    section.dataset.recordedY = state.recordedY === null ? '' : String(state.recordedY);
    section.dataset.observationCount = String(compare ? 2 : 1);
    svg.dataset.mirrorX = String(scene.mirrorX);
    svg.dataset.objectPoint = current.source.join(',');
    svg.dataset.imagePoint = current.image.join(',');
    svg.dataset.eyePoint = current.eye.join(',');
  }
  function stopAnimation() { cancelAnimationFrame(animation); animation = 0; }
  function move(y) { state.eyeY = clampEye(y); render(); }
  changeButton.addEventListener('click', () => {
    if (!state.present) return;
    stopAnimation();
    state.recordedY = state.eyeY;
    const start = state.eyeY, target = start < 190 ? scene.otherEye : scene.initialEye;
    if (reducedMotion.matches) { move(target); return; }
    const began = performance.now();
    const frame = now => {
      const t = Math.min(1, (now - began) / 450), eased = t * t * (3 - 2 * t);
      move(start + (target - start) * eased);
      if (t < 1) animation = requestAnimationFrame(frame); else animation = 0;
    };
    render(); animation = requestAnimationFrame(frame);
  });
  function svgY(event) { return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse()).y; }
  observer.addEventListener('pointerdown', event => {
    if (!state.present || event.button > 0) return;
    event.preventDefault();stopAnimation();state.recordedY = state.eyeY;
    dragging = {id: event.pointerId, last: svgY(event), eye: state.eyeY};
    observer.setPointerCapture(event.pointerId);observer.focus({preventScroll: true});render();
  });
  function updateDrag(event) {
    if (!dragging || dragging.id !== event.pointerId) return;
    const y = svgY(event);
    dragging.eye = clampEye(dragging.eye + (y - dragging.last) * .7);
    dragging.last = y;move(dragging.eye);
  }
  observer.addEventListener('pointermove', event => {
    if (dragging && dragging.id === event.pointerId) {event.preventDefault();updateDrag(event);}
  });
  function release(event) {
    if (!dragging || dragging.id !== event.pointerId) return;
    if (event.type === 'pointerup') updateDrag(event);
    dragging = null;if (observer.hasPointerCapture(event.pointerId)) observer.releasePointerCapture(event.pointerId);
  }
  observer.addEventListener('pointerup', release);observer.addEventListener('pointercancel', release);
  observer.addEventListener('lostpointercapture', () => { dragging = null; });
  observer.addEventListener('keydown', event => {
    if (!state.present) return;
    const step = event.shiftKey ? 12 : 4;
    const next = {ArrowUp: state.eyeY - step, ArrowDown: state.eyeY + step, Home: scene.eyeMax, End: scene.eyeMin}[event.key];
    if (next === undefined) return;
    event.preventDefault();stopAnimation();if (!event.repeat) state.recordedY = state.eyeY;move(next);
  });
  objectButton.addEventListener('click', () => {
    stopAnimation();
    if (dragging && observer.hasPointerCapture(dragging.id)) observer.releasePointerCapture(dragging.id);
    dragging = null;state.present = !state.present;state.recordedY = null;render();
  });
  reducedMotion.addEventListener('change', stopAnimation);
  addEventListener('pagehide', stopAnimation);
  render();
}
