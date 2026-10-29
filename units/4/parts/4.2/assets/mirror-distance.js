const section = document.querySelector('#card-04');

if (section) {
  const svg = section.querySelector('#distance-side-view');
  const object = section.querySelector('#distance-side-object');
  const image = section.querySelector('#distance-side-image');
  const frontObject = section.querySelector('#distance-front-object');
  const frontReflection = section.querySelector('#distance-front-reflection');
  const ticks = section.querySelector('#distance-ruler-ticks');
  const values = section.querySelector('#distance-ruler-values');
  const ns = 'http://www.w3.org/2000/svg';
  const mirrorX = 310;
  const unitsPerCm = 4;
  let distance = 40;
  let drag = null;

  for (let cm = -60; cm <= 60; cm += 5) {
    const x = mirrorX + cm * unitsPerCm;
    const major = cm % 10 === 0;
    const tick = document.createElementNS(ns, 'line');
    for (const [name, value] of Object.entries({ x1: x, x2: x, y1: 260, y2: major ? 274 : 267, class: `ruler-tick${major ? ' is-major' : ''}${cm === 0 ? ' is-zero' : ''}` })) tick.setAttribute(name, value);
    ticks.append(tick);
    if (major) {
      const label = document.createElementNS(ns, 'text');
      for (const [name, value] of Object.entries({ x, y: 292, class: `ruler-label${cm === 0 ? ' is-zero' : ''}` })) label.setAttribute(name, value);
      label.textContent = String(Math.abs(cm));
      values.append(label);
    }
  }

  const updateDistance = (nextDistance) => {
    distance = Math.round(Math.max(10, Math.min(60, nextDistance)));
    const objectX = mirrorX - distance * unitsPerCm;
    const imageX = mirrorX + distance * unitsPerCm;
    object.setAttribute('transform', `translate(${objectX - 182} 0)`);
    image.setAttribute('transform', `translate(${imageX - 438} 0)`);
    section.querySelector('#distance-object-measure').setAttribute('d', `M${objectX} 116H${mirrorX}`);
    section.querySelector('#distance-image-measure').setAttribute('d', `M${mirrorX} 116H${imageX}`);
    for (const [id, x, text] of [
      ['distance-object-measure-label', Math.min(245, (objectX + mirrorX) / 2), `物距 ${distance} cm`],
      ['distance-image-measure-label', Math.max(375, (imageX + mirrorX) / 2), `像距 ${distance} cm`]
    ]) {
      const label = section.querySelector(`#${id}`);
      label.setAttribute('x', x);
      label.textContent = text;
    }
    for (const [id, x] of [['distance-ruler-object-marker', objectX], ['distance-ruler-image-marker', imageX]]) {
      const marker = section.querySelector(`#${id}`);
      marker.setAttribute('x1', x);
      marker.setAttribute('x2', x);
    }
    object.setAttribute('aria-valuenow', distance);
    object.setAttribute('aria-valuetext', `物距 ${distance} 公分，像距 ${distance} 公分`);
    section.querySelector('#distance-front-status').textContent = `物體離鏡面 ${distance} cm｜虛像在鏡後 ${distance} cm`;
    frontObject.setAttribute('transform', `translate(0 ${(distance - 40) * .65})`);
    frontReflection.setAttribute('transform', `translate(0 ${(40 - distance) * .65})`);
  };

  const pointerX = (event) => {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(matrix.inverse()).x;
  };
  object.addEventListener('pointerdown', (event) => {
    if (drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const x = pointerX(event);
    if (x === null) return;
    event.preventDefault();
    drag = { pointerId: event.pointerId, x, distance };
    object.dataset.input = 'pointer';
    object.focus({ preventScroll: true });
    object.setPointerCapture(event.pointerId);
    section.classList.add('is-distance-dragging');
  });
  const moveDrag = (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const x = pointerX(event);
    if (x === null) return;
    event.preventDefault();
    const next = Math.max(10, Math.min(60, drag.distance - (x - drag.x) / unitsPerCm));
    drag.x = x;
    drag.distance = next;
    updateDistance(next);
  };
  object.addEventListener('pointermove', moveDrag);
  const endDrag = (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.type === 'pointerup') moveDrag(event);
    drag = null;
    section.classList.remove('is-distance-dragging');
    if (object.hasPointerCapture(event.pointerId)) object.releasePointerCapture(event.pointerId);
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) object.addEventListener(type, endDrag);
  object.addEventListener('keydown', (event) => {
    delete object.dataset.input;
    if (drag) return;
    const step = event.shiftKey ? 10 : 1;
    let next = distance;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next += step;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next -= step;
    else if (event.key === 'Home') next = 10;
    else if (event.key === 'End') next = 60;
    else return;
    event.preventDefault();
    updateDistance(next);
  });
  updateDistance(distance);
}
