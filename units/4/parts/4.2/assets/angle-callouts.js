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
  mask.append(clear, exclusions, rimExclusions); defs.append(mask); overlay.append(defs);
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
  return (degrees, mode = 'a') => {
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
      const endY = Math.min(height - 29, hit[1] + (width < 500 ? 38 : 54));
      const label = labels[index];
      const incident = mode === 'b' ? side < 0 : side > 0;
      label.group.dataset.kind = mode === 'both' ? 'both' : incident ? 'incident' : 'reflected';
      label.title.textContent = mode === 'both' ? '入射／反射角' : incident ? '入射角' : '反射角';
      label.value.textContent = `${degrees}°`;
      const textWidth = Math.max(label.title.getComputedTextLength(), label.value.getComputedTextLength());
      endX = side < 0 ? Math.max(margin + textWidth, edge[0] - 12) : Math.min(width - margin - textWidth, edge[0] + 12);
      label.line.setAttribute('d', `M${x.toFixed(1)} ${y.toFixed(1)}L${endX.toFixed(1)} ${endY.toFixed(1)}`);
      label.text.setAttribute('x', String(endX));
      label.text.setAttribute('y', String(endY - 4));
      label.text.setAttribute('text-anchor', side < 0 ? 'end' : 'start');
      label.title.setAttribute('x', String(endX));
      label.value.setAttribute('x', String(endX));
      label.value.setAttribute('dy', '1.22em');
    }
  };
}
