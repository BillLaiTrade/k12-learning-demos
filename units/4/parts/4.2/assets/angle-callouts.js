import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';

// Place labels in screen coordinates while their leader lines follow the 3D arcs.
export function createAngleCallouts(canvas, bench) {
  const ns = 'http://www.w3.org/2000/svg';
  const overlay = document.createElementNS(ns, 'svg');
  overlay.classList.add('angle-callouts');
  overlay.setAttribute('aria-hidden', 'true');
  const maskId = `${canvas.id}-callout-clearance`;
  const defs = document.createElementNS(ns, 'defs');
  const mask = document.createElementNS(ns, 'mask');
  mask.id = maskId;
  mask.setAttribute('maskUnits', 'userSpaceOnUse');
  const clear = document.createElementNS(ns, 'rect');
  clear.setAttribute('fill', 'white');
  const exclusions = document.createElementNS(ns, 'path');
  exclusions.setAttribute('fill', 'none');
  exclusions.setAttribute('stroke', 'black');
  exclusions.setAttribute('stroke-width', '9');
  const rimExclusions = document.createElementNS(ns, 'path');
  rimExclusions.setAttribute('fill', 'none');
  rimExclusions.setAttribute('stroke', 'black');
  const apparatusExclusions = document.createElementNS(ns, 'g');
  apparatusExclusions.setAttribute('fill', 'black');
  mask.append(clear, exclusions, rimExclusions, apparatusExclusions); defs.append(mask); overlay.append(defs);
  const labels = ['left', 'right'].map(side => {
    const group = document.createElementNS(ns, 'g');
    group.classList.add('angle-callout', `angle-callout-${side}`);
    const line = document.createElementNS(ns, 'path');
    line.setAttribute('mask', `url(#${maskId})`);
    const text = document.createElementNS(ns, 'text');
    const title = document.createElementNS(ns, 'tspan');
    const value = document.createElementNS(ns, 'tspan');
    text.append(title, value); group.append(line, text); overlay.append(group);
    return { group, line, text, title, value };
  });
  canvas.parentElement.append(overlay);
  return (degrees, mode = 'a', emitters = [bench.emitterBody]) => {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    overlay.setAttribute('viewBox', `0 0 ${width} ${height}`);
    overlay.style.display = mode === 'off' ? 'none' : '';
    if (mode === 'off') return;
    const angle = THREE.MathUtils.degToRad(degrees);
    const project = world => {
      const p = world.clone().project(bench.camera);
      return [(p.x + 1) * width / 2, (1 - p.y) * height / 2];
    };
    const pointText = p => p.map(n => n.toFixed(1)).join(' ');
    clear.setAttribute('width', String(width)); clear.setAttribute('height', String(height));
    mask.setAttribute('width', String(width)); mask.setAttribute('height', String(height));
    apparatusExclusions.replaceChildren();
    const block = (left, top, right, bottom) => {
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', String(left - 4)); rect.setAttribute('y', String(top - 4));
      rect.setAttribute('width', String(right - left + 8)); rect.setAttribute('height', String(bottom - top + 8));
      apparatusExclusions.append(rect);
    };
    for (const object of emitters) {
      const box = new THREE.Box3().setFromObject(object);
      const corners = Array.from({length: 8}, (_, i) => project(new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z)));
      block(Math.min(...corners.map(p => p[0])), Math.min(...corners.map(p => p[1])), Math.max(...corners.map(p => p[0])), Math.max(...corners.map(p => p[1])));
    }
    const frame = canvas.getBoundingClientRect();
    for (const el of canvas.parentElement.querySelectorAll('.reverse-device-label:not([hidden]),.reverse-overlap:not([hidden])')) {
      const r = el.getBoundingClientRect(); block(r.left - frame.left, r.top - frame.top, r.right - frame.left, r.bottom - frame.top);
    }
    const hit = project(bench.centerPoint);
    const rim = [...bench.arc(4.6, Math.PI / 2, -1).reverse(), ...bench.arc(4.6, Math.PI / 2, 1)];
    rimExclusions.setAttribute('d', 'M' + rim.map(p => pointText(project(p))).join('L'));
    const top = project(new THREE.Vector3(bench.centerPoint.x - 5, bench.centerPoint.y, 0));
    rimExclusions.setAttribute('stroke-width', String(Math.abs(hit[1] - top[1]) * .3 + 4));
    // Leave a visible gap wherever a leader would otherwise cross either ray.
    exclusions.setAttribute('d', [-1, 1].map(side => {
      const end = new THREE.Vector3(bench.centerPoint.x - 20 * Math.cos(angle), bench.centerPoint.y, side * 20 * Math.sin(angle));
      return `M${pointText(hit)}L${pointText(project(end))}`;
    }).join(''));

    for (const [index, side] of [-1, 1].entries()) {
      // Positive z appears on the left of this top-down view.
      const point = new THREE.Vector3(bench.centerPoint.x - 1.8 * Math.cos(angle / 2), bench.centerPoint.y + .015, -side * 1.8 * Math.sin(angle / 2)).project(bench.camera);
      const x = (point.x + 1) * width / 2, y = (1 - point.y) * height / 2;
      const margin = width < 500 ? 10 : 22;
      let endX = side < 0 ? margin : width - margin;
      const edge = project(new THREE.Vector3(bench.centerPoint.x, bench.centerPoint.y, -side * 5));
      const endY = Math.max(34, Math.min(height - 28, y - 6));
      const label = labels[index];
      const incident = mode === 'b' ? side < 0 : side > 0;
      label.group.dataset.kind = mode === 'both' ? 'both' : incident ? 'incident' : 'reflected';
      const stacked = mode === 'both' && width < 500;
      label.title.textContent = mode === 'both' ? '入射／反射角' : incident ? '入射角' : '反射角';
      if (stacked) {
        label.title.replaceChildren();
        for (const [i, name] of ['入射角', '反射角'].entries()) {
          const row = document.createElementNS(ns, 'tspan'); row.textContent = name; row.setAttribute('dy', i ? '1.15em' : '0'); label.title.append(row);
        }
      }
      label.value.textContent = `${degrees}°`;
      const textWidth = Math.max(...(stacked ? [...label.title.children].map(row => row.getComputedTextLength()) : [label.title.getComputedTextLength()]), label.value.getComputedTextLength());
      const gutter = side < 0 ? edge[0] - margin : width - margin - edge[0];
      const beside = gutter >= textWidth + 16;
      endX = side < 0 ? margin + textWidth : width - margin - textWidth;
      const labelY = beside ? endY : 34;
      const elbowX = side < 0 ? x - 24 : x + 24;
      label.line.setAttribute('d', `M${x.toFixed(1)} ${y.toFixed(1)}L${elbowX.toFixed(1)} ${labelY.toFixed(1)}L${endX.toFixed(1)} ${labelY.toFixed(1)}`);
      label.text.setAttribute('x', String(endX));
      label.text.setAttribute('y', String(labelY - 4));
      label.text.setAttribute('text-anchor', side < 0 ? 'end' : 'start');
      label.title.setAttribute('x', String(endX));
      for (const row of label.title.children) row.setAttribute('x', String(endX));
      label.value.setAttribute('x', String(endX));
      label.value.setAttribute('dy', '1.22em');
    }
  };
}
