import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';

// Place labels in screen coordinates while their leader lines follow the 3D arcs.
export function createAngleCallouts(canvas, bench) {
  const ns = 'http://www.w3.org/2000/svg';
  const overlay = document.createElementNS(ns, 'svg');
  overlay.classList.add('angle-callouts');
  overlay.setAttribute('aria-hidden', 'true');
  const labels = ['left', 'right'].map(side => {
    const group = document.createElementNS(ns, 'g');
    group.classList.add('angle-callout', `angle-callout-${side}`);
    const line = document.createElementNS(ns, 'path');
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
    for (const [index, side] of [-1, 1].entries()) {
      // Positive z appears on the left of this top-down view.
      const point = new THREE.Vector3(bench.centerPoint.x - 1.8 * Math.cos(angle / 2), bench.centerPoint.y + .015, -side * 1.8 * Math.sin(angle / 2)).project(bench.camera);
      const x = (point.x + 1) * width / 2, y = (1 - point.y) * height / 2;
      const margin = width < 500 ? 7 : 12, offset = width < 500 ? 44 : 68;
      let endX = Math.max(margin, Math.min(width - margin, x + side * offset));
      const endY = Math.max(27, y - (width < 500 ? 24 : 34));
      const label = labels[index];
      const incident = mode === 'b' ? side < 0 : side > 0;
      label.group.dataset.kind = mode === 'both' ? 'both' : incident ? 'incident' : 'reflected';
      label.title.textContent = mode === 'both' ? '入射／反射角' : incident ? '入射角' : '反射角';
      label.value.textContent = `${degrees}°`;
      const textWidth = Math.max(label.title.getComputedTextLength(), label.value.getComputedTextLength());
      endX = side < 0 ? Math.max(margin + textWidth, endX) : Math.min(width - margin - textWidth, endX);
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
