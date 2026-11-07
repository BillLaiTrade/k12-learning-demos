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
    const obstacles = [];
    const block = (left, top, right, bottom) => {
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', String(left - 4)); rect.setAttribute('y', String(top - 4));
      rect.setAttribute('width', String(right - left + 8)); rect.setAttribute('height', String(bottom - top + 8));
      apparatusExclusions.append(rect);
      obstacles.push({left:left-4,top:top-4,right:right+4,bottom:bottom+4});
    };
    for (const object of [...emitters, bench.mirror]) {
      const box = new THREE.Box3().setFromObject(object);
      const corners = Array.from({length: 8}, (_, i) => project(new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z)));
      block(Math.min(...corners.map(p => p[0])), Math.min(...corners.map(p => p[1])), Math.max(...corners.map(p => p[0])), Math.max(...corners.map(p => p[1])));
    }
    const frame = canvas.getBoundingClientRect();
    for (const el of canvas.parentElement.querySelectorAll('.reverse-device-label:not([hidden]),.reverse-overlap:not([hidden])')) {
      const r = el.getBoundingClientRect(); block(r.left - frame.left, r.top - frame.top, r.right - frame.left, r.bottom - frame.top);
    }
    const hit = project(bench.centerPoint);
    const radius = bench.protractorRadius;
    const rim = [...bench.arc(radius - .4, Math.PI / 2, -1).reverse(), ...bench.arc(radius - .4, Math.PI / 2, 1)];
    rimExclusions.setAttribute('d', 'M' + rim.map(p => pointText(project(p))).join('L'));
    const top = project(new THREE.Vector3(bench.centerPoint.x - radius, bench.centerPoint.y, 0));
    rimExclusions.setAttribute('stroke-width', String(Math.abs(hit[1] - top[1]) * .3 + 4));
    const rays = [];
    // Leave a visible gap wherever a leader would otherwise cross either ray.
    exclusions.setAttribute('d', [-1, 1].map(side => {
      const end = new THREE.Vector3(bench.centerPoint.x - 20 * Math.cos(angle), bench.centerPoint.y, side * 20 * Math.sin(angle));
      rays.push([hit, project(end)]);
      return `M${pointText(hit)}L${pointText(project(end))}`;
    }).join(''));

    const scale = Math.abs(hit[1] - top[1]) / radius;
    const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const crossesRay = (a, b, rect) => {
      let start = 0, end = 1;
      for (const [axis, min, max] of [[0, rect.left-6, rect.right+6], [1, rect.top-6, rect.bottom+6]]) {
        const d = b[axis] - a[axis];
        if (Math.abs(d) < 1e-8) { if (a[axis] < min || a[axis] > max) return false; }
        else { start = Math.max(start, Math.min((min-a[axis])/d, (max-a[axis])/d)); end = Math.min(end, Math.max((min-a[axis])/d, (max-a[axis])/d)); }
      }
      return start <= end;
    };
    const coversTicks = rect => {
      if (rect.top > hit[1] + 14) return false;
      const bottom = Math.min(rect.bottom, hit[1] + 14);
      const nearX = Math.max(rect.left, Math.min(hit[0], rect.right));
      const nearY = Math.max(rect.top, Math.min(hit[1], bottom));
      const closest = Math.hypot(nearX-hit[0], nearY-hit[1]);
      const farthest = Math.max(...[rect.left,rect.right].flatMap(x => [rect.top,bottom].map(y => Math.hypot(x-hit[0],y-hit[1]))));
      return closest < (radius+.55)*scale && farthest > (radius-1.35)*scale;
    };
    const placed = [];
    for (const [index, side] of [-1, 1].entries()) {
      const anchor = project(new THREE.Vector3(bench.centerPoint.x - 1.8 * Math.cos(angle/2), bench.centerPoint.y+.015, -side*1.8*Math.sin(angle/2)));
      const label = labels[index], incident = mode === 'b' ? side < 0 : side > 0;
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
      label.text.setAttribute('text-anchor','start'); label.text.setAttribute('x','0'); label.text.setAttribute('y','0');
      for (const part of [label.title,...label.title.children,label.value]) part.setAttribute('x','0');
      label.value.setAttribute('dy','1.22em');
      const measured = label.text.getBBox(), w = measured.width+4, h = measured.height+4;
      let best = null, bestScore = Infinity;
      // Search outward from the arc rather than assigning a fixed screen edge.
      for (let dx = 8; dx <= 200; dx += 8) for (let dy = -160; dy <= 160; dy += 8) {
        const centerX = anchor[0] + side*(dx+w/2), centerY = anchor[1]+dy;
        const box = {left:centerX-w/2, right:centerX+w/2, top:centerY-h/2, bottom:centerY+h/2};
        const score = (centerX-anchor[0])**2 + (centerY-anchor[1])**2;
        if (score >= bestScore || box.left < 5 || box.right > width-5 || box.top < 5 || box.bottom > height-5) continue;
        if (coversTicks(box) || rays.some(([a,b]) => crossesRay(a,b,box)) || [...obstacles,...placed].some(b => overlaps(box,b))) continue;
        best = box; bestScore = score;
      }
      // The top corners remain a last resort for extremely constrained views.
      best ||= {left:side<0?8:width-w-8, right:side<0?w+8:width-8, top:8, bottom:8+h};
      placed.push(best);
      const textX = best.left+2-measured.x, textY = best.top+2-measured.y;
      label.text.setAttribute('x',String(textX)); label.text.setAttribute('y',String(textY));
      for (const part of [label.title,...label.title.children,label.value]) part.setAttribute('x',String(textX));
      const endX = side < 0 ? best.right+2 : best.left-2;
      const endY = Math.max(best.top+5, Math.min(anchor[1], best.bottom-5));
      label.line.setAttribute('d', `M${pointText(anchor)}L${pointText([endX,endY])}`);
    }
  };
}
