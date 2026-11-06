import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';

const canvas = document.querySelector('#laser-reflection-scene');
if (!canvas) throw new Error('Laser reflection scene is missing.');
import { createLaserBench } from './laser-bench.js';
import { directionArrow } from './laser-direction.js?v=20261106';
import { createAngleCallouts } from './angle-callouts.js?v=side-leaders-20261106';
import { laserPath } from './planar-reflection.mjs';
const MIN_ANGLE = 20, MAX_ANGLE = 90;
let angleDegrees = 30;

let bench;
try {
  bench = createLaserBench(canvas);
} catch (error) {
  canvas.hidden = true;
  canvas.style.display = 'none';
  canvas.tabIndex = -1;
  canvas.setAttribute('aria-disabled', 'true');
  canvas.dataset.ready = 'error';
  document.querySelector('#angle-observation').textContent = '目前裝置無法呈現 3D 雷射實驗。上方保留入射角與反射角皆為 30° 的示意圖；可重新整理頁面再試。';
}
if (bench) {
const { scene, camera, renderer, centerPoint, reflectedRayLength, emitter, emitterBody, emitterStem, emitterFoot, pivot, incoming, reflected, setBeam, incomingSector, reflectedSector, incomingArc, outgoingArc, arc, setAngleSector, setThickArc, normalLabel, makeAngleLabel, updateAngleLabel, rayMaterial } = bench;

const updateCallouts = createAngleCallouts(canvas, bench);
const directionArrows = [0, 1].map(() => {
  const arrow = directionArrow(rayMaterial.color);
  scene.add(arrow);
  return arrow;
});
const reflectedTipArrow = directionArrow(rayMaterial.color);
scene.add(reflectedTipArrow);

function svgArc(radius, degrees, rightSide) {
  const radians = degrees * Math.PI / 180;
  const x = 300 + (rightSide ? 1 : -1) * radius * Math.sin(radians);
  const y = 292 - radius * Math.cos(radians);
  return `M300 ${292-radius}A${radius} ${radius} 0 0 ${rightSide ? 1 : 0} ${x.toFixed(3)} ${y.toFixed(3)}`;
}
function svgSector(radius, degrees, rightSide) {
  return `M300 292L${svgArc(radius,degrees,rightSide).slice(1)}Z`;
}
function update() {
  const deg = angleDegrees, angle = THREE.MathUtils.degToRad(deg), radius = 7.0;
  const model = deg === 90 ? null : laserPath(deg, radius, reflectedRayLength);
  // Preserve section 02's existing grazing-angle display at its 90° boundary.
  const source = model ? new THREE.Vector3(...model.source) : new THREE.Vector3(centerPoint.x, centerPoint.y, -radius);
  const hit = new THREE.Vector3(centerPoint.x, centerPoint.y, 0);
  const reflectedEnd = model ? new THREE.Vector3(...model.end) : new THREE.Vector3(centerPoint.x, centerPoint.y, reflectedRayLength);
  const sourceDirection = new THREE.Vector3().subVectors(hit, source).normalize();
  emitter.position.copy(source);
  emitterBody.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), sourceDirection);
  const standPosition = new THREE.Vector3(source.x, 0, source.z);
  emitterStem.position.set(standPosition.x, 0.62, standPosition.z);
  emitterFoot.position.set(standPosition.x, 0.07, standPosition.z);
  pivot.position.set(standPosition.x, 0.15, standPosition.z);
  setBeam(incoming, source, hit);
  setBeam(reflected, hit, reflectedEnd);
  [[source, hit], [hit, reflectedEnd]].forEach(([from, to], index) => {
    const arrow = directionArrows[index];
    arrow.position.copy(from).lerp(to, index === 0 ? 0.49 : 0.35);
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), to.clone().sub(from).normalize());
  });
  // Place the tip at the visible end, including when the ray leaves the frame.
  // The top-down camera projects this horizontal light path linearly.
  const projectedHit = hit.clone().project(camera), projectedEnd = reflectedEnd.clone().project(camera);
  let visibleEnd = 1;
  for (const axis of ['x', 'y']) {
    if (Math.abs(projectedEnd[axis]) > 0.96) {
      const edge = Math.sign(projectedEnd[axis]) * 0.96;
      visibleEnd = Math.min(visibleEnd, (edge - projectedHit[axis]) / (projectedEnd[axis] - projectedHit[axis]));
    }
  }
  // The shared arrow's tip sits 0.36 units ahead of its origin.
  reflectedTipArrow.position.copy(hit).lerp(reflectedEnd, visibleEnd).addScaledVector(reflectedEnd.clone().sub(hit).normalize(), -0.36);
  reflectedTipArrow.quaternion.copy(directionArrows[1].quaternion);
  setAngleSector(incomingSector, arc(1.8, angle, -1));
  setAngleSector(reflectedSector, arc(1.8, angle, 1));
  setThickArc(incomingArc, arc(1.8, angle, -1));
  setThickArc(outgoingArc, arc(1.8, angle, 1));
  normalLabel.position.set(centerPoint.x - 5.5, 1.5, centerPoint.z);
  updateAngleLabel(normalLabel, '法線');

  const diagramLength = 223, dx = diagramLength * Math.sin(angle), dy = diagramLength * Math.cos(angle);
  const compact = document.querySelector('.laser-diagram').clientWidth <= 460;
  const halfAngle = angle / 2, labelRadius = compact ? 230 : deg < 25 ? 200 : 175;
  const valueRadius = compact ? 173 : deg < 25 ? 150 : 128;
  document.querySelector('#law-incident').setAttribute('d', `M${(300 + dx).toFixed(3)} ${(292 - dy).toFixed(3)}L300 292`);
  document.querySelector('#law-incident-direction').setAttribute('d', `M${(300 + 30*Math.sin(angle)).toFixed(3)} ${(292 - 30*Math.cos(angle)).toFixed(3)}L${(300 + 15*Math.sin(angle)).toFixed(3)} ${(292 - 15*Math.cos(angle)).toFixed(3)}`);
  document.querySelector('#law-reflected').setAttribute('d', `M300 292L${(300 - dx).toFixed(3)} ${(292 - dy).toFixed(3)}`);
  document.querySelector('#law-wedge-incident').setAttribute('d', svgSector(142, deg, true));
  document.querySelector('#law-wedge-reflected').setAttribute('d', svgSector(142, deg, false));
  document.querySelector('#law-arc-incident').setAttribute('d', svgArc(104, deg, true));
  document.querySelector('#law-arc-reflected').setAttribute('d', svgArc(104, deg, false));
  const angleLabelX = 300 + Math.max(compact ? 44 : 0,labelRadius * Math.sin(halfAngle)), angleLabelY = 292 - labelRadius * Math.cos(halfAngle);
  const valueX = 300 + valueRadius * Math.sin(halfAngle), valueY = 292 - valueRadius * Math.cos(halfAngle);
  document.querySelector('#law-angle-name-in').setAttribute('x', angleLabelX.toFixed(3));
  document.querySelector('#law-angle-name-out').setAttribute('x', (600 - angleLabelX).toFixed(3));
  document.querySelector('#law-angle-name-in').setAttribute('y', (angleLabelY + 4).toFixed(3));
  document.querySelector('#law-angle-name-out').setAttribute('y', (angleLabelY + 4).toFixed(3));
  document.querySelector('#law-angle-in').setAttribute('x', valueX.toFixed(3));
  document.querySelector('#law-angle-out').setAttribute('x', (600 - valueX).toFixed(3));
  document.querySelector('#law-angle-in').setAttribute('y', (valueY + 5).toFixed(3));
  document.querySelector('#law-angle-out').setAttribute('y', (valueY + 5).toFixed(3));
  document.querySelector('#law-angle-in').textContent = `${deg}°`;
  document.querySelector('#law-angle-out').textContent = `${deg}°`;
  const lineLabelX = Math.min(548,300 + dx + (compact ? 65 : 25));
  const lineLabelY = Math.max(55,292 - dy - (compact ? 24 : 16));
  document.querySelector('#law-line-name-in').setAttribute('transform', `translate(${lineLabelX.toFixed(3)} ${lineLabelY.toFixed(3)})`);
  document.querySelector('#law-line-name-out').setAttribute('transform', `translate(${(600 - lineLabelX).toFixed(3)} ${lineLabelY.toFixed(3)})`);
  const normalName = document.querySelector('#law-normal-name');
  normalName.setAttribute('x', compact ? '300' : '322');
  normalName.setAttribute('y', compact ? '30' : '40');
  normalName.setAttribute('text-anchor', compact ? 'middle' : 'start');
  document.querySelector('#law-normal-leader').setAttribute('d', compact ? 'M300 33V35' : 'M306 47L316 35');
  canvas.setAttribute('aria-valuenow', String(deg));
  canvas.setAttribute('aria-valuetext', `入射角 ${deg} 度，反射角 ${deg} 度`);
  updateCallouts(deg);
  renderer.render(scene, camera);
  const bodyCenter = source.clone().addScaledVector(sourceDirection, -1.2).project(camera);
  canvas.dataset.emitterScreen = JSON.stringify([(bodyCenter.x + 1) * canvas.clientWidth / 2, (1 - bodyCenter.y) * canvas.clientHeight / 2]);
  canvas.dataset.angle = String(deg);
  canvas.dispatchEvent(new CustomEvent('laser-angle-change', { detail: { degrees: deg } }));
}

function setAngle(value) {
  const next = Math.round(THREE.MathUtils.clamp(value, MIN_ANGLE, MAX_ANGLE));
  if (next === angleDegrees) return;
  angleDegrees = next;
  update();
}

function resize() {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.fov = width < 200 ? 40 : width < 500 ? 34 : 38;
  const compact = width < 500, focusX = compact ? -2.7 : -2.0, focusZ = compact ? -0.8 : 0.3;
  camera.up.set(-1, 0, 0); camera.position.set(focusX, compact ? 20 : 18.5, focusZ); camera.lookAt(focusX, 1.4, focusZ);
  camera.updateProjectionMatrix();
  update();
}
new ResizeObserver(resize).observe(canvas);
resize();
canvas.dataset.ready = 'true';

const dragRaycaster = new THREE.Raycaster();
const dragPointer = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -centerPoint.y);
const emitterHitMeshes = [];
emitterBody.traverse((object) => { if (object.isMesh) emitterHitMeshes.push(object); });
let draggingEmitter = false;
let dragAngleOffset = 0;

function pointerWorldPoint(event) {
  const rect = canvas.getBoundingClientRect();
  dragPointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  dragRaycaster.setFromCamera(dragPointer, camera);
  const point = new THREE.Vector3();
  return dragRaycaster.ray.intersectPlane(dragPlane, point) ? point : null;
}

function pointerAngle(point) {
  return THREE.MathUtils.radToDeg(Math.atan2(-point.z, centerPoint.x - point.x));
}

function isEmitterAtPointer(event) {
  pointerWorldPoint(event);
  return dragRaycaster.intersectObjects(emitterHitMeshes, false).length > 0;
}

function finishEmitterDrag(event) {
  if (!draggingEmitter) return;
  draggingEmitter = false;
  canvas.style.cursor = isEmitterAtPointer(event) ? 'grab' : 'default';
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}

canvas.addEventListener('pointerdown', (event) => {
  const point = pointerWorldPoint(event);
  if (!point || !dragRaycaster.intersectObjects(emitterHitMeshes, false).length) return;
  draggingEmitter = true;
  dragAngleOffset = angleDegrees - pointerAngle(point);
  canvas.style.cursor = 'grabbing';
  canvas.setPointerCapture(event.pointerId);
  event.preventDefault();
});

canvas.addEventListener('pointermove', (event) => {
  if (draggingEmitter) {
    const point = pointerWorldPoint(event);
    if (!point) return;
    setAngle(pointerAngle(point) + dragAngleOffset);
    return;
  }
  canvas.style.cursor = isEmitterAtPointer(event) ? 'grab' : 'default';
});

canvas.addEventListener('pointerup', finishEmitterDrag);
canvas.addEventListener('pointercancel', finishEmitterDrag);
canvas.addEventListener('lostpointercapture', () => { draggingEmitter = false; canvas.style.cursor = 'default'; });
canvas.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') setAngle(angleDegrees - 1);
  else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') setAngle(angleDegrees + 1);
  else if (event.key === 'Home') setAngle(MIN_ANGLE);
  else if (event.key === 'End') setAngle(MAX_ANGLE);
  else return;
  event.preventDefault();
});

}
