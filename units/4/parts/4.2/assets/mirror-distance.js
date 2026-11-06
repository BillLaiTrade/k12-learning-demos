import {FRONT_VIEW, projectMirrorDistance} from './mirror-distance-projection.mjs?v=1';

const section = document.querySelector('#card-05');

if (section) {
  const svg = section.querySelector('#distance-side-view');
  const object = section.querySelector('#distance-side-object');
  const image = section.querySelector('#distance-side-image');
  const frontObject = section.querySelector('#distance-front-object');
  const frontReflection = section.querySelector('#distance-front-reflection');
  const frontSvg = section.querySelector('#distance-front-view');
  const ticks = section.querySelector('#distance-ruler-ticks');
  const values = section.querySelector('#distance-ruler-values');
  const ns = 'http://www.w3.org/2000/svg';
  const mirrorX = 310;
  const unitsPerCm = 4;
  let distance = 40;
  let drag = null;
  let frontProjection = projectMirrorDistance(distance);
  const tagWidths = new Map();
  const placeFrontLabels = () => {
    const scale = frontSvg.viewBox.baseVal.width / frontSvg.clientWidth;
    if (!Number.isFinite(scale)) return;
    const entries = [['reflection',frontProjection.image],['front-object',frontProjection.object]];
    const minY=11*scale+5, maxY=380-11*scale-5, gap=28*scale;
    const targets=entries.map(([,p])=>p.top+p.size*.46);
    let ys=targets.map(y=>Math.max(minY,Math.min(maxY,y)));
    if(ys[1]-ys[0]<gap){
      const midpoint=Math.max(minY+gap/2,Math.min(maxY-gap/2,(ys[0]+ys[1])/2));
      ys=[midpoint-gap/2,midpoint+gap/2];
    }
    entries.forEach(([name, projection],index) => {
      const tag = frontSvg.querySelector(`[data-distance-tag="${name}"]`), width = tagWidths.get(tag);
      if (!width) return;
      const targetY = targets[index], y=ys[index];
      const rect = tag.querySelector('rect'), text = tag.querySelector('text');
      text.setAttribute('y', y + 4.9*scale);
      rect.setAttribute('y', y - 11*scale);
      tag.querySelector('.distance-leader').setAttribute('d', `M${FRONT_VIEW.centerX + projection.size*.46} ${targetY}L${500-width/2-5} ${y}`);
    });
  };
  const placeSideLabels = () => {
    for (const [name, center, origin] of [['object', mirrorX - distance * unitsPerCm, 182], ['image', mirrorX + distance * unitsPerCm, 438]]) {
      const tag = svg.querySelector(`[data-distance-tag="${name}"]`);
      const width = tagWidths.get(tag);
      if (!width) continue;
      const min = name === 'object' ? 8 + width / 2 : mirrorX + 8 + width / 2;
      const max = name === 'object' ? mirrorX - 8 - width / 2 : 612 - width / 2;
      const x = Math.max(min, Math.min(max, center)) - (center - origin);
      tag.querySelector('text').setAttribute('x', x);
      tag.querySelector('rect').setAttribute('x', x - width / 2);
    }
  };
  const sizeLabels = () => {
    for (const drawing of section.querySelectorAll('#distance-side-view,#distance-front-view')) {
      if (!drawing.clientWidth) continue;
      const scale = drawing.viewBox.baseVal.width / drawing.clientWidth;
      drawing.style.setProperty('--distance-svg-scale', scale);
      for (const tag of drawing.querySelectorAll('[data-distance-tag]')) {
        const text = tag.querySelector('text'), rect = tag.querySelector('rect');
        // These labels contain full-width Chinese characters. Reserve their
        // em width directly so a resize cannot reuse a stale SVG text box.
        const y = Number(tag.dataset.tagY), width = (text.textContent.length * 14 + 12) * scale;
        text.setAttribute('y', y + 4.9 * scale);
        for (const [name, value] of Object.entries({x: Number(text.getAttribute('x')) - width / 2, y: y - 11 * scale, width, height: 22 * scale, rx: 4 * scale})) rect.setAttribute(name, value);
        tagWidths.set(tag, width);
      }
    }
    placeSideLabels();
    placeFrontLabels();
  };

  for (let cm = -60; cm <= 60; cm += 5) {
    const x = mirrorX + cm * unitsPerCm;
    const major = cm % 10 === 0;
    const tick = document.createElementNS(ns, 'line');
    for (const [name, value] of Object.entries({ x1: x, x2: x, y1: 260, y2: major ? 274 : 267, class: `ruler-tick${major ? ' is-major' : ''}${cm === 0 ? ' is-zero' : ''}` })) tick.setAttribute(name, value);
    ticks.append(tick);
    if (major) {
      const label = document.createElementNS(ns, 'text');
      for (const [name, value] of Object.entries({ x, y: 310, class: `ruler-label${cm === 0 ? ' is-zero' : ''}` })) label.setAttribute(name, value);
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
    for (const [id, text] of [
      ['distance-object-measure-label', `物距 ${distance} cm`],
      ['distance-image-measure-label', `像距 ${distance} cm`]
    ]) {
      const label = section.querySelector(`#${id}`);
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
    frontProjection = projectMirrorDistance(distance);
    for (const [group, projection] of [[frontObject,frontProjection.object],[frontReflection,frontProjection.image]]) {
      const size=projection.size, image=group.querySelector('image');
      for(const [name,value] of Object.entries({x:FRONT_VIEW.centerX-size/2,y:projection.top,width:size,height:size}))image.setAttribute(name,value);
      group.querySelectorAll('ellipse').forEach((shadow,index)=>{
        for(const [name,value] of Object.entries({cx:FRONT_VIEW.centerX,cy:projection.ground-2,rx:size*(index ? .25 : .36),ry:size*(index ? .028 : .05)}))shadow.setAttribute(name,value);
      });
    }
    placeSideLabels();
    placeFrontLabels();
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
  const labelObserver = new ResizeObserver(sizeLabels);
  for (const drawing of section.querySelectorAll('#distance-side-view,#distance-front-view')) labelObserver.observe(drawing);
  document.fonts.ready.then(sizeLabels);
  sizeLabels();
}
