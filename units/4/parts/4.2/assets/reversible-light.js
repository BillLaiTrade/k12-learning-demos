import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';
import { createLaserBench } from './laser-bench.js';
import { reciprocalPath } from './planar-reflection.mjs';

const section = document.querySelector('#card-06');
const canvas = section.querySelector('#reverse-scene');
const prior = document.querySelector('#laser-reflection-scene');
const clamp = n => Math.round(Math.max(20, Math.min(60, n)));
let degrees = clamp(Number(prior.dataset.angle || 30));
let lights = { a: false, b: false }, started = false, drawnAngle;
let reframe = () => {};
let model = reciprocalPath(degrees);
let bench;
try { bench = createLaserBench(canvas); }
catch {
  canvas.hidden = true;
  section.querySelector('#reverse-fallback').hidden = false;
  section.querySelector('#reverse-fallback-message').textContent = '目前無法顯示 3D 器材，改用同一模型的可點選光路圖；也可用上方按鈕開關光源。';
}
const V = p => new THREE.Vector3(...p);
const vec = (a, b, t) => a.map((v, i) => v + t * (b[i] - v));
const colors = { a: '#ed2924', b: '#205df5', off: '#435058' };
let sourceB, bodyB, lensB, stemB, footB, pivotB, blue, arrows, hitDot;

// Keep the compact silhouette; inset its color to leave a fine black edge.
function directionArrow(color) {
  const points = [[0, 0.36], [-0.22, -0.23], [0, -0.10], [0.22, -0.23]].map(p => new THREE.Vector2(...p));
  const width = 0.018;
  const inset = points.map((point, index) => {
    const incoming = point.clone().sub(points[(index + points.length - 1) % points.length]).normalize();
    const outgoing = points[(index + 1) % points.length].clone().sub(point).normalize();
    const a = new THREE.Vector2(-incoming.y, incoming.x), b = new THREE.Vector2(-outgoing.y, outgoing.x);
    return point.clone().addScaledVector(a.clone().add(b), width / (1 + a.dot(b)));
  });
  const arrow = new THREE.Group();
  [[points, '#202622'], [inset, color]].forEach(([vertices, fill], index) => {
    const geometry = new THREE.ShapeGeometry(new THREE.Shape(vertices));
    geometry.rotateX(Math.PI / 2);
    // Beam tubes render in the transparent pass. Keep both arrow layers in
    // that pass too, so their higher renderOrder closes the tip over the beam.
    const layer = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: fill, side: THREE.DoubleSide, transparent: true, opacity: 1, depthTest: false, depthWrite: false
    }));
    layer.renderOrder = 15 + index; layer.frustumCulled = false; arrow.add(layer);
  });
  return arrow;
}

if (bench) {
  const { scene, emitterBody, emitterStem, emitterFoot, pivot } = bench;
  sourceB = new THREE.Group(); scene.add(sourceB);
  bodyB = emitterBody.clone(true); sourceB.add(bodyB);
  lensB = bodyB.getObjectByName('laser-lens'); lensB.material = lensB.material.clone();
  [stemB, footB, pivotB] = [emitterStem, emitterFoot, pivot].map(original => { const copy = original.clone(); scene.add(copy); return copy; });
  // Shared center lines, with a red outer edge and a blue core when both are on.
  // Neither direction is shifted away from its physical path for visibility.
  for (const mesh of [bench.incoming, bench.reflected]) {
    mesh.geometry.dispose(); mesh.geometry = new THREE.CylinderGeometry(0.058, 0.058, 1, 12);
    mesh.material.color.set(colors.a);
  }
  blue = [0, 1].map(() => {
    const material = new THREE.MeshBasicMaterial({ color: colors.b, transparent: true, opacity: 1, depthTest: false, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 1, 12), material);
    mesh.renderOrder = 13; mesh.frustumCulled = false; scene.add(mesh); return mesh;
  });
  arrows = Object.fromEntries(['a', 'b'].map(key => [key, [0, 1].map(() => {
    const arrow = directionArrow(colors[key]);
    scene.add(arrow); return arrow;
  })]));
  hitDot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: '#f34230', depthTest: false }));
  hitDot.name = 'reverse-hit-dot';
  hitDot.renderOrder = 16; hitDot.position.copy(bench.centerPoint); scene.add(hitDot);
}

function positionEmitter(group, body, stem, foot, pivot, position, target) {
  group.position.copy(V(position));
  body.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), V(target).sub(V(position)).normalize());
  stem.position.set(position[0], 0.62, position[2]);
  foot.position.set(position[0], 0.07, position[2]); pivot.position.set(position[0], 0.15, position[2]);
}
function label(id, world, offsetY = 0) {
  const p = V(world).project(bench.camera), target = section.querySelector(id), half = target.offsetWidth / 2;
  target.style.left = `${Math.max(half + 8, Math.min(canvas.clientWidth - half - 8, (p.x + 1) * canvas.clientWidth / 2))}px`;
  const y = (1 - p.y) * canvas.clientHeight / 2 + offsetY;
  target.style.top = `${id.endsWith('-m') ? y : Math.max(target.offsetHeight + 10, y)}px`;
}
function draw() {
  if (!bench) { drawFallback(); return; }
  const b = bench, { forward: f, backward: r } = model;
  positionEmitter(b.emitter, b.emitterBody, b.emitterStem, b.emitterFoot, b.pivot, f.source, f.hit);
  positionEmitter(sourceB, bodyB, stemB, footB, pivotB, f.end, f.hit);
  b.emitterBody.getObjectByName('laser-lens').material.color.set(lights.a ? colors.a : colors.off);
  lensB.material.color.set(lights.b ? colors.b : colors.off);
  b.incoming.visible = b.reflected.visible = lights.a;
  b.setBeam(b.incoming, V(f.source), V(f.hit)); b.setBeam(b.reflected, V(f.hit), V(f.end));
  blue.forEach(mesh => { mesh.visible = lights.b; });
  b.setBeam(blue[0], V(r.source), V(r.hit)); b.setBeam(blue[1], V(r.hit), V(r.end));
  // Both angles belong to either complete reflected path, and disappear with
  // the last active source. Keep the shared section 02 apparatus unchanged.
  for (const guide of [b.incomingSector, b.reflectedSector, b.incomingArc, b.outgoingArc, hitDot]) {
    guide.visible = lights.a || lights.b;
  }
  hitDot.material.color.set(lights.a ? colors.a : colors.b);
  for (const [key, path] of [['a', f], ['b', r]]) {
    [[path.source, path.hit], [path.hit, path.end]].forEach(([from, to], index) => {
      const arrow = arrows[key][index]; arrow.visible = lights[key];
      // Separate heads stay inside the numbered rim and outside the angle arcs.
      arrow.position.copy(V(vec(from, to, index === 0 ? 0.49 : 0.35)));
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), V(to).sub(V(from)).normalize());
    });
  }
  if (drawnAngle !== degrees) {
    const angle = THREE.MathUtils.degToRad(degrees);
    b.setAngleSector(b.incomingSector, b.arc(1.8, angle, -1));
    b.setAngleSector(b.reflectedSector, b.arc(1.8, angle, 1));
    b.setThickArc(b.incomingArc, b.arc(1.8, angle, -1));
    b.setThickArc(b.outgoingArc, b.arc(1.8, angle, 1));
    drawnAngle = degrees;
  }
  b.normalLabel.position.set(b.centerPoint.x - 5.5, 1.5, 0); b.updateAngleLabel(b.normalLabel, '法線');
  b.renderer.render(b.scene, b.camera);
  for (const [key, p] of [['a', f.source], ['b', f.end]]) {
    const center = V(vec(f.hit, p, 1.17)).project(b.camera);
    canvas.dataset[`emitter${key.toUpperCase()}Screen`] = JSON.stringify([(center.x + 1) * canvas.clientWidth / 2, (1 - center.y) * canvas.clientHeight / 2]);
    const above = vec(f.hit, p, 1.48); above[1] += 0.4;
    label(`#reverse-label-${key}`, above, -7);
  }
  label('#reverse-label-m', f.hit, 13);
}
function drawFallback() {
  section.querySelectorAll('.reverse-device-label').forEach(el => { el.hidden = true; });
  const { forward: f, backward: r } = model;
  const map = p => [200 - p[2] * 20, 280 + (p[0] - f.hit[0]) * 30];
  const coords = p => map(p).map(v => v.toFixed(2)).join(',');
  const toggle = (key, p) => { const [x, y] = map(p); return `<g data-source="${key}" role="button" tabindex="0" aria-label="開關 ${key.toUpperCase()} ${key === 'a' ? '紅' : '藍'}光" aria-pressed="${lights[key]}"><rect x="${x - 24}" y="${y - 26}" width="48" height="38" rx="8" fill="${lights[key] ? colors[key] : '#dfe5df'}"/><text x="${x}" y="${y - 2}" text-anchor="middle" fill="${lights[key] ? 'white' : '#304b40'}">${key.toUpperCase()}</text></g>`; };
  const beam = (key, ray) => {
    if (!lights[key]) return '';
    const heads = [[ray.source, ray.hit], [ray.hit, ray.end]].map(([from, to], index) => {
      const [x, y] = map(vec(from, to, index === 0 ? 0.49 : 0.35)), a = map(from), b = map(to);
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const dx = (b[0] - a[0]) / length, dy = (b[1] - a[1]) / length;
      const point = (along, across) => `${(x + dx * along - dy * across).toFixed(2)},${(y + dy * along + dx * across).toFixed(2)}`;
      return `<path data-direction="${key}" d="M${point(9, 0)}L${point(-7, 6)}L${point(-2, 0)}L${point(-7, -6)}Z" fill="${colors[key]}" stroke="#202622" stroke-width="1" stroke-linejoin="round" paint-order="stroke fill" vector-effect="non-scaling-stroke"/>`;
    }).join('');
    return `<path data-ray="${key}" d="M${[ray.source, ray.hit, ray.end].map(coords).join('L')}" fill="none" stroke="${colors[key]}" stroke-width="${key === 'a' ? 6 : 2.5}"/>${heads}`;
  };
  section.querySelector('#reverse-fallback-svg').innerHTML = `<title>A 紅光與 B 藍光各自開關</title><path d="M50 280H350" stroke="#82988e" stroke-width="8"/><path d="M200 40V280" stroke="#60756c" stroke-dasharray="5 5"/>${beam('a', f)}${beam('b', r)}${toggle('a', f.source)}${toggle('b', f.end)}<text x="200" y="306">M</text>`;
}
function updateUI() {
  section.dataset.lightA = lights.a ? 'on' : 'off'; section.dataset.lightB = lights.b ? 'on' : 'off';
  section.dataset.reverseAngle = String(degrees);
  section.dataset.reverseModel = JSON.stringify(model);
  section.querySelector('#reverse-angle-value').textContent = `${degrees}°`;
  canvas.setAttribute('aria-valuenow', String(degrees));
  canvas.setAttribute('aria-valuetext', `入射角 ${degrees} 度；A 紅光${lights.a ? '開啟' : '關閉'}，B 藍光${lights.b ? '開啟' : '關閉'}`);
  for (const key of ['a', 'b']) {
    const button = section.querySelector(`#reverse-toggle-${key}`), color = key === 'a' ? '紅' : '藍';
    button.textContent = `${lights[key] ? '關閉' : '開啟'} ${key.toUpperCase()} ${color}光`;
    button.setAttribute('aria-pressed', String(lights[key]));
    section.querySelector(`#reverse-status-${key}`).textContent = lights[key] ? '正在發光' : '已關閉';
    section.querySelector(`#reverse-status-${key}`).dataset.active = String(lights[key]);
    section.querySelector(`#reverse-path-${key}-status`).textContent = lights[key] ? '開啟' : '關閉';
  }
  section.querySelector('#reverse-overlap').hidden = !(lights.a && lights.b);
  section.querySelector('#reverse-state').textContent = lights.a && lights.b ? '紅光與藍光的路徑重合，傳播方向相反。' : lights.a ? 'A 紅光沿 A → M → B；再點 A 可關閉，點 B 可加入藍光。' : lights.b ? 'B 藍光沿 B → M → A；再點 B 可關閉，點 A 可加入紅光。' : '點擊任一發射器，開啟對應顏色的光；再點一次即可關閉。';
  section.querySelector('#reverse-reason-angles').textContent = `兩個方向的入射角與反射角都是 ${degrees}°。`;
}
function refresh() { updateUI(); reframe(); draw(); }
function toggle(key) { lights[key] = !lights[key]; started = true; refresh(); }
function setAngle(value) { degrees = clamp(value); started = true; model = reciprocalPath(degrees); refresh(); }
for (const key of ['a', 'b']) section.querySelector(`#reverse-toggle-${key}`).addEventListener('click', () => toggle(key));
section.querySelector('#reverse-reset').addEventListener('click', () => { lights = { a: false, b: false }; started = true; refresh(); });
prior.addEventListener('laser-angle-change', event => { if (!started) { degrees = clamp(event.detail.degrees); model = reciprocalPath(degrees); refresh(); } });
const fallback = section.querySelector('#reverse-fallback-svg');
for (const name of ['click', 'keydown']) fallback.addEventListener(name, event => {
  const target = event.target.closest('[data-source]');
  if (!target || (name === 'keydown' && !['Enter', ' '].includes(event.key))) return;
  event.preventDefault(); const key = target.dataset.source; toggle(key);
  if (name === 'keydown') fallback.querySelector(`[data-source="${key}"]`).focus();
});

if (bench) {
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -bench.centerPoint.y);
  const targets = Object.fromEntries([['a', bench.emitterBody], ['b', bodyB]].map(([key, body]) => {
    const meshes = []; body.traverse(obj => { if (obj.isMesh) meshes.push(obj); }); return [key, meshes];
  }));
  let press = null;
  function world(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) * 2 / rect.width - 1, 1 - (event.clientY - rect.top) * 2 / rect.height);
    raycaster.setFromCamera(pointer, bench.camera);
    return raycaster.ray.intersectPlane(plane, new THREE.Vector3());
  }
  function hit() { return ['a', 'b'].find(key => raycaster.intersectObjects(targets[key], false).length); }
  function angle(point) { return THREE.MathUtils.radToDeg(Math.atan2(-point.z, bench.centerPoint.x - point.x)); }
  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    const point = world(event), key = hit();
    if (!point || !key) return;
    press = { key, x: event.clientX, y: event.clientY, moved: false, offset: degrees - angle(point) };
    canvas.setPointerCapture(event.pointerId); event.preventDefault();
  });
  canvas.addEventListener('pointermove', event => {
    const point = world(event);
    canvas.style.cursor = hit() ? 'pointer' : 'default';
    if (!press) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6) press.moved = true;
    if (press.key === 'a' && press.moved && point) { canvas.style.cursor = 'grabbing'; setAngle(angle(point) + press.offset); }
  });
  canvas.addEventListener('pointerup', event => {
    if (!press) return;
    const original = press; world(event);
    const moved = original.moved || Math.hypot(event.clientX - original.x, event.clientY - original.y) > 6;
    const clicked = !moved && hit() === original.key;
    press = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (clicked) toggle(original.key);
  });
  function cancel(event) { press = null; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); }
  canvas.addEventListener('pointercancel', cancel); canvas.addEventListener('lostpointercapture', () => { press = null; });
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    bench.renderer.setSize(w, h, false); bench.camera.aspect = w / h; bench.camera.fov = 38;
    const halfWidth = Math.max(6.5, 11 * Math.sin(degrees * Math.PI / 180));
    const height = Math.max(10.5, 2 * halfWidth / bench.camera.aspect);
    const distance = height / (2 * Math.tan(THREE.MathUtils.degToRad(19)));
    bench.camera.up.set(-1, 0, 0); bench.camera.position.set(-2.3, 1.4 + distance, 0); bench.camera.lookAt(-2.3, 1.4, 0); bench.camera.updateProjectionMatrix();
  }
  reframe = resize; new ResizeObserver(() => { resize(); draw(); }).observe(canvas); resize();
}
canvas.addEventListener('keydown', event => {
  if (event.key.toLowerCase() === 'a') toggle('a');
  else if (event.key.toLowerCase() === 'b') toggle('b');
  else if (['ArrowLeft', 'ArrowDown'].includes(event.key)) setAngle(degrees - 1);
  else if (['ArrowRight', 'ArrowUp'].includes(event.key)) setAngle(degrees + 1);
  else if (event.key === 'Home') setAngle(20);
  else if (event.key === 'End') setAngle(60);
  else return;
  event.preventDefault();
});
refresh();
