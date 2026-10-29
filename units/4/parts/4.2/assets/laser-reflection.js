import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';

const canvas = document.querySelector('#laser-reflection-scene');
if (!canvas) throw new Error('Laser reflection scene is missing.');
import { createLaserBench } from './laser-bench.js';
import { laserPath } from './planar-reflection.mjs';
const MIN_ANGLE = 20, MAX_ANGLE = 90;
let angleDegrees = 30;

const { scene, camera, renderer, centerPoint, reflectedRayLength, emitter, emitterBody, emitterStem, emitterFoot, pivot, incoming, reflected, setBeam, incomingSector, reflectedSector, incomingArc, outgoingArc, arc, setAngleSector, setThickArc, normalLabel, makeAngleLabel, updateAngleLabel, rayMaterial } = createLaserBench(canvas);

function svgArc(radius, degrees, rightSide) {
  const steps = Math.max(5, Math.ceil(degrees / 3));
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const a = degrees * Math.PI / 180 * i / steps;
    const x = 300 + (rightSide ? 1 : -1) * radius * Math.sin(a), y = 280 - radius * Math.cos(a);
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}
function svgSector(radius, degrees, rightSide) {
  const steps = Math.max(5, Math.ceil(degrees / 3));
  let d = 'M300 280L300 ' + (280 - radius).toFixed(1);
  for (let i = 1; i <= steps; i++) {
    const a = degrees * Math.PI / 180 * i / steps;
    const x = 300 + (rightSide ? 1 : -1) * radius * Math.sin(a), y = 280 - radius * Math.cos(a);
    d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d + 'Z';
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
  setAngleSector(incomingSector, arc(1.8, angle, -1));
  setAngleSector(reflectedSector, arc(1.8, angle, 1));
  setThickArc(incomingArc, arc(1.8, angle, -1));
  setThickArc(outgoingArc, arc(1.8, angle, 1));
  normalLabel.position.set(centerPoint.x - 5.5, 1.5, centerPoint.z);
  updateAngleLabel(normalLabel, '法線');

  const diagramLength = 190, dx = diagramLength * Math.sin(angle), dy = diagramLength * Math.cos(angle);
  const endOffset = 14, halfAngle = angle / 2, labelRadius = 150;
  const incidentEndX = 300 + dx / diagramLength * endOffset, contactY = 280 - dy / diagramLength * endOffset;
  const reflectedStartX = 300 - dx / diagramLength * endOffset;
  document.querySelector('#law-incident').setAttribute('d', `M${(300 + dx).toFixed(1)} ${(280 - dy).toFixed(1)}L${incidentEndX.toFixed(1)} ${contactY.toFixed(1)}`);
  document.querySelector('#law-reflected').setAttribute('d', `M${reflectedStartX.toFixed(1)} ${contactY.toFixed(1)}L${(300 - dx).toFixed(1)} ${(280 - dy).toFixed(1)}`);
  document.querySelector('#law-wedge-incident').setAttribute('d', svgSector(166, deg, true));
  document.querySelector('#law-wedge-reflected').setAttribute('d', svgSector(166, deg, false));
  document.querySelector('#law-arc-incident').setAttribute('d', svgArc(82, deg, true));
  document.querySelector('#law-arc-reflected').setAttribute('d', svgArc(82, deg, false));
  const angleLabelX = 300 + labelRadius * Math.sin(halfAngle), angleLabelY = 280 - labelRadius * Math.cos(halfAngle);
  const valueX = 300 + 110 * Math.sin(halfAngle), valueY = 280 - 110 * Math.cos(halfAngle);
  document.querySelector('#law-angle-name-in').setAttribute('x', angleLabelX.toFixed(1));
  document.querySelector('#law-angle-name-out').setAttribute('x', (600 - angleLabelX).toFixed(1));
  document.querySelector('#law-angle-name-in').setAttribute('y', (angleLabelY + 4).toFixed(1));
  document.querySelector('#law-angle-name-out').setAttribute('y', (angleLabelY + 4).toFixed(1));
  document.querySelector('#law-angle-in').setAttribute('x', valueX.toFixed(1));
  document.querySelector('#law-angle-out').setAttribute('x', (600 - valueX).toFixed(1));
  document.querySelector('#law-angle-in').setAttribute('y', (valueY + 4).toFixed(1));
  document.querySelector('#law-angle-out').setAttribute('y', (valueY + 4).toFixed(1));
  document.querySelector('#law-angle-in').textContent = `${deg}°`;
  document.querySelector('#law-angle-out').textContent = `${deg}°`;
  const lineLabelX = 300 + dx + 40;
  const lineLabelY = 280 - dy - 24;
  document.querySelector('#law-line-name-in').setAttribute('transform', `translate(${lineLabelX.toFixed(1)} ${lineLabelY.toFixed(1)})`);
  document.querySelector('#law-line-name-out').setAttribute('transform', `translate(${(600 - lineLabelX).toFixed(1)} ${lineLabelY.toFixed(1)})`);
  document.querySelector('#lab-angle-in').textContent = `${deg}°`;
  document.querySelector('#lab-angle-out').textContent = `${deg}°`;
  canvas.setAttribute('aria-valuenow', String(deg));
  canvas.setAttribute('aria-valuetext', `入射角 ${deg} 度，反射角 ${deg} 度`);
  document.querySelector('#angle-observation').textContent = `發射器轉到 ${deg}°；觀察反射光方向如何改變，入射角與反射角始終相等。`;
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
