import * as THREE from '../../1.1/assets/vendor/three/build/three.module.js';
import { createLaserBench } from './laser-bench.js';
import { reciprocalPath } from './planar-reflection.mjs';

const section = document.querySelector('#card-06');
const canvas = section.querySelector('#reverse-scene');
const input = section.querySelector('#reverse-angle');
const prior = document.querySelector('#laser-reflection-scene');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = n => Math.round(Math.max(20, Math.min(60, n)));
let degrees = clamp(Number(prior.dataset.angle || 30));
let state = 'setup', progress = 0, startTime = 0, frame = 0, started = false, drawnAngle;
let reframe = () => {};
let model = reciprocalPath(degrees);
let bench;
try { bench = createLaserBench(canvas); }
catch (error) {
  canvas.hidden = true;
  section.querySelector('#reverse-fallback').hidden = false;
  section.querySelector('#reverse-fallback-message').textContent = '目前無法顯示 3D 器材，改用同一幾何模型的光路圖；仍可完成三步操作。';
}
const V = p => new THREE.Vector3(...p);
let sourceB, bodyB, lensB, stemB, footB, pivotB, gray, blue, arrows, hitDot;

if (bench) {
  const { scene, emitterBody, emitterStem, emitterFoot, pivot } = bench;
  sourceB = new THREE.Group(); scene.add(sourceB);
  bodyB = emitterBody.clone(true); sourceB.add(bodyB);
  lensB = bodyB.getObjectByName('laser-lens'); lensB.material = lensB.material.clone();
  for (const original of [emitterStem, emitterFoot, pivot]) scene.add(original.clone());
  // Identical hardware instances, using the approved section 02 geometry/materials.
  [stemB, footB, pivotB] = scene.children.slice(-3);
  const beam = (color, radius, opacity) => {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 10), material);
    mesh.renderOrder = 10; mesh.frustumCulled = false; scene.add(mesh); return mesh;
  };
  gray = [beam('#b0b5b5', 0.058, 0.9), beam('#b0b5b5', 0.058, 0.9)];
  blue = [beam('#205df5', 0.026, 1), beam('#205df5', 0.026, 1)];
  blue.forEach(mesh => { mesh.renderOrder = 13; });
  arrows = [0, 1].map(() => {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 16), new THREE.MeshBasicMaterial({ color: '#205df5', depthTest: false }));
    mesh.renderOrder = 15; scene.add(mesh); return mesh;
  });
  hitDot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: '#f34230', depthTest: false }));
  hitDot.renderOrder = 16; hitDot.position.copy(bench.centerPoint); scene.add(hitDot);
}

const elements = Object.fromEntries(['setup', 'record', 'ray', 'reset', 'state', 'angle-value', 'lock-note', 'status-a', 'status-b', 'route-back', 'overlap'].map(id => [id, section.querySelector('#reverse-' + id)]));
const vec = (a, b, fraction) => a.map((v, i) => v + fraction * (b[i] - v));

function positionEmitter(group, body, stem, foot, pivot, position, target) {
  group.position.copy(V(position));
  body.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), V(target).sub(V(position)).normalize());
  stem.position.set(position[0], 0.62, position[2]);
  foot.position.set(position[0], 0.07, position[2]); pivot.position.set(position[0], 0.15, position[2]);
}

function label(id, world, offsetY = 0) {
  const p = V(world).project(bench.camera), target = section.querySelector(id);
  const half = target.offsetWidth / 2;
  target.style.left = `${Math.max(half + 8, Math.min(canvas.clientWidth - half - 8, (p.x + 1) * canvas.clientWidth / 2))}px`;
  const y = (1 - p.y) * canvas.clientHeight / 2 + offsetY;
  target.style.top = `${id.endsWith('-m') ? y : Math.max(target.offsetHeight + 10, y)}px`;
}

function draw() {
  if (!bench) { drawFallback(); return; }
  const b = bench, { forward: f, backward: r } = model;
  positionEmitter(b.emitter, b.emitterBody, b.emitterStem, b.emitterFoot, b.pivot, f.source, f.hit);
  positionEmitter(sourceB, bodyB, stemB, footB, pivotB, f.end, f.hit);
  const tracing = state === 'tracing' || state === 'complete';
  b.emitterBody.getObjectByName('laser-lens').material.color.set(state === 'setup' ? '#ef3030' : '#435058');
  lensB.material.color.set(tracing ? '#205df5' : '#435058');
  b.incoming.visible = b.reflected.visible = state === 'setup';
  b.setBeam(b.incoming, V(f.source), V(f.hit)); b.setBeam(b.reflected, V(f.hit), V(f.end));
  gray.forEach(mesh => { mesh.visible = state !== 'setup'; });
  b.setBeam(gray[0], V(f.source), V(f.hit)); b.setBeam(gray[1], V(f.hit), V(f.end));
  const t1 = Math.min(1, progress * 2), t2 = Math.max(0, progress * 2 - 1);
  blue[0].visible = tracing && t1 > 0; blue[1].visible = tracing && t2 > 0;
  b.setBeam(blue[0], V(r.source), V(vec(r.source, r.hit, t1)));
  b.setBeam(blue[1], V(r.hit), V(vec(r.hit, r.end, t2)));
  [[r.source, r.hit, t1], [r.hit, r.end, t2]].forEach(([from, to, amount], index) => {
    arrows[index].visible = tracing && amount >= 0.53;
    arrows[index].position.copy(V(vec(from, to, 0.5)));
    arrows[index].quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), V(to).sub(V(from)).normalize());
  });
  if (drawnAngle !== degrees) {
    const a = THREE.MathUtils.degToRad(degrees);
    b.setAngleSector(b.incomingSector, b.arc(1.8, a, -1));
    b.setAngleSector(b.reflectedSector, b.arc(1.8, a, 1));
    b.setThickArc(b.incomingArc, b.arc(1.8, a, -1));
    b.setThickArc(b.outgoingArc, b.arc(1.8, a, 1));
    drawnAngle = degrees;
  }
  // Rebuild sectors only when angle changes; traces animate without reallocations.
  b.normalLabel.position.set(b.centerPoint.x - 5.5, 1.5, 0); b.updateAngleLabel(b.normalLabel, '法線');
  b.renderer.render(b.scene, b.camera);
  const bodyCenter = V(vec(f.hit, f.source, 1.17)).project(b.camera);
  canvas.dataset.emitterScreen = JSON.stringify([(bodyCenter.x + 1) * canvas.clientWidth / 2, (1 - bodyCenter.y) * canvas.clientHeight / 2]);
  const above = p => { const v = vec(model.forward.hit, p, 1.48); v[1] += 0.4; return v; };
  label('#reverse-label-a', above(f.source), -7); label('#reverse-label-b', above(f.end), -7);
  label('#reverse-label-m', f.hit, 13);
}

function drawFallback() {
  section.querySelectorAll('.reverse-device-label').forEach(el => { el.hidden = true; });
  const { forward: f, backward: r } = model;
  const map = p => [200 - p[2] * 20, 280 + (p[0] - f.hit[0]) * 30];
  const points = [f.source, f.hit, f.end].map(map);
  const coords = p => p.map(v => v.toFixed(2)).join(',');
  const path = 'M' + points.map(coords).join('L');
  const t1 = Math.min(1, progress * 2), t2 = Math.max(0, progress * 2 - 1);
  section.querySelector('#reverse-fallback-svg').innerHTML = `<title>同一幾何的俯視光路</title><defs><marker id="reverse-fallback-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0L5 2.5L0 5Z" fill="#205df5"/></marker></defs><path d="M50 280H350" stroke="#82988e" stroke-width="8"/><path d="M200 40V280" stroke="#60756c" stroke-dasharray="5 5"/><path d="${path}" fill="none" stroke="${state === 'setup' ? '#e32622' : '#adb3b3'}" stroke-width="6"/><text x="${points[0][0]}" y="${points[0][1] - 14}" text-anchor="middle">A</text><text x="${points[2][0]}" y="${points[2][1] - 14}" text-anchor="middle">B</text><text x="200" y="306">M</text>${progress ? `<path d="M${[r.source, vec(r.source, r.hit, t1)].map(map).map(coords).join('L')}" fill="none" stroke="#205df5" stroke-width="3" marker-end="url(#reverse-fallback-arrow)"/>` : ''}${t2 ? `<path d="M${[r.hit, vec(r.hit, r.end, t2)].map(map).map(coords).join('L')}" fill="none" stroke="#205df5" stroke-width="3" marker-end="url(#reverse-fallback-arrow)"/>` : ''}`;
}

function updateUI() {
  section.dataset.reverseState = state;
  section.dataset.reverseAngle = String(degrees);
  section.dataset.reverseProgress = String(progress);
  section.dataset.reverseModel = JSON.stringify({ forward: model.forward, backward: model.backward, error: model.error });
  input.value = String(degrees); input.disabled = state !== 'setup';
  elements['angle-value'].textContent = `${degrees}°`;
  elements['lock-note'].textContent = state === 'setup' ? '拖動 A 發射器設定方向，也可用滑桿或方向鍵調整。' : `鏡面與 M 點固定・角度已鎖定 ${degrees}°`;
  section.querySelector('.reverse-angle-settings').hidden = state !== 'setup';
  canvas.setAttribute('aria-disabled', String(state !== 'setup'));
  canvas.setAttribute('aria-valuenow', String(degrees));
  canvas.setAttribute('aria-valuetext', `${state === 'setup' ? '可調整' : '已鎖定'}入射角 ${degrees} 度`);
  elements.setup.setAttribute('aria-current', state === 'setup' ? 'step' : 'false');
  elements.record.setAttribute('aria-current', state === 'recorded' ? 'step' : 'false');
  elements.ray.setAttribute('aria-current', ['tracing', 'complete'].includes(state) ? 'step' : 'false');
  elements.record.disabled = state !== 'setup';
  elements.ray.disabled = state === 'setup' || state === 'tracing';
  elements.ray.textContent = state === 'complete' ? '③ 再從 B 照回' : '③ 從 B 照回';
  elements['status-a'].textContent = state === 'setup' ? '正在發光' : state === 'recorded' ? '光路已記錄' : '現在接收';
  elements['status-b'].textContent = ['tracing', 'complete'].includes(state) ? '正在發光' : state === 'recorded' ? '準備發光' : '尚未發光';
  elements['status-a'].dataset.active = String(state === 'setup');
  elements['status-b'].dataset.active = String(['tracing', 'complete'].includes(state));
  elements['route-back'].textContent = state === 'complete' ? 'B → M → A' : state === 'tracing' ? 'B → M → …' : '等待從 B 發光';
  elements.overlap.hidden = state !== 'complete';
  elements.state.textContent = ({ setup: '先調整 A 的方向，再記下第一次光路。', recorded: '第一次光路已保留。從 B 朝 M 發光，比較它會走到哪裡。', tracing: 'B 正朝 M 發光；觀察反射後的光是否沿原路返回。', complete: '方向已反轉：兩次光路重合，路徑相同，方向相反。' })[state];
  section.querySelector('#reverse-reason-angles').textContent = `兩次的入射角與反射角都是 ${degrees}°。`;
}

function refresh() { updateUI(); reframe(); draw(); }
function cancelTrace() { cancelAnimationFrame(frame); frame = 0; }
function reset() { cancelTrace(); state = 'setup'; progress = 0; started = true; refresh(); }
function setAngle(value) {
  if (state !== 'setup') return;
  degrees = clamp(value); started = true; model = reciprocalPath(degrees); refresh();
}
input.addEventListener('input', () => setAngle(Number(input.value)));
elements.setup.addEventListener('click', reset); elements.reset.addEventListener('click', reset);
elements.record.addEventListener('click', () => { if (state !== 'setup') return; state = 'recorded'; progress = 0; started = true; refresh(); });
function finish() { state = 'complete'; progress = 1; frame = 0; refresh(); }
elements.ray.addEventListener('click', () => {
  if (!['recorded', 'complete'].includes(state)) return;
  cancelTrace(); state = 'tracing'; progress = 0; refresh();
  if (reduced.matches || document.hidden) { finish(); return; }
  startTime = performance.now();
  function tick(time) {
    if (state !== 'tracing') return;
    progress = Math.min(1, (time - startTime) / 1800);
    if (progress === 1) { finish(); return; }
    section.dataset.reverseProgress = String(progress); draw(); frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
});
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'tracing') { cancelTrace(); finish(); } });
reduced.addEventListener('change', () => { if (reduced.matches && state === 'tracing') { cancelTrace(); finish(); } });
prior.addEventListener('laser-angle-change', event => {
  if (!started && state === 'setup') { degrees = clamp(event.detail.degrees); model = reciprocalPath(degrees); refresh(); }
});

if (bench) {
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -bench.centerPoint.y);
  const meshes = []; bench.emitterBody.traverse(obj => { if (obj.isMesh) meshes.push(obj); });
  let dragging = false, offset = 0;
  function world(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) * 2 / rect.width - 1, 1 - (event.clientY - rect.top) * 2 / rect.height);
    raycaster.setFromCamera(pointer, bench.camera);
    return raycaster.ray.intersectPlane(plane, new THREE.Vector3());
  }
  function angle(point) { return THREE.MathUtils.radToDeg(Math.atan2(-point.z, bench.centerPoint.x - point.x)); }
  canvas.addEventListener('pointerdown', event => {
    if (state !== 'setup') return;
    const point = world(event);
    if (!point || !raycaster.intersectObjects(meshes, false).length) return;
    dragging = true; offset = degrees - angle(point); canvas.setPointerCapture(event.pointerId); event.preventDefault();
  });
  canvas.addEventListener('pointermove', event => {
    if (state !== 'setup') return;
    const point = world(event);
    canvas.style.cursor = raycaster.intersectObjects(meshes, false).length ? 'grab' : 'default';
    if (dragging && point) setAngle(angle(point) + offset);
  });
  function endDrag(event) { dragging = false; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); }
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('lostpointercapture', () => { dragging = false; });
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    bench.renderer.setSize(w, h, false); bench.camera.aspect = w / h;
    bench.camera.fov = 38;
    // Keep both existing housings in frame across the full useful angle range.
    const halfWidth = Math.max(6.5, 11 * Math.sin(degrees * Math.PI / 180));
    const height = Math.max(10.5, 2 * halfWidth / bench.camera.aspect);
    const distance = height / (2 * Math.tan(THREE.MathUtils.degToRad(19)));
    bench.camera.up.set(-1, 0, 0); bench.camera.position.set(-2.3, 1.4 + distance, 0); bench.camera.lookAt(-2.3, 1.4, 0);
    bench.camera.updateProjectionMatrix();
  }
  reframe = resize;
  new ResizeObserver(() => { resize(); draw(); }).observe(canvas); resize();
}
canvas.addEventListener('keydown', event => {
  if (state !== 'setup') return;
  if (['ArrowLeft', 'ArrowDown'].includes(event.key)) setAngle(degrees - 1);
  else if (['ArrowRight', 'ArrowUp'].includes(event.key)) setAngle(degrees + 1);
  else if (event.key === 'Home') setAngle(20);
  else if (event.key === 'End') setAngle(60);
  else return;
  event.preventDefault();
});
refresh();
