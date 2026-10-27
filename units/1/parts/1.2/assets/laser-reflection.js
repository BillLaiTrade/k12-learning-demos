import * as THREE from '../../1.1/assets/vendor/three/build/three.module.js';

const canvas = document.querySelector('#laser-reflection-scene');
const slider = document.querySelector('#incident-angle');
if (!canvas || !slider) throw new Error('Laser reflection controls are missing.');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#e5e6e1');
scene.fog = new THREE.Fog('#e5e6e1', 14, 28);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

scene.add(new THREE.HemisphereLight(0xfff5e4, 0x76604a, 1.7));
const key = new THREE.DirectionalLight(0xffefdc, 2.7);
key.position.set(-4, 10, 3);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
scene.add(key);
const fill = new THREE.DirectionalLight(0xe7f2ff, 0.9);
fill.position.set(6, 6, -6);
scene.add(fill);

const mat = (color, roughness = 0.7, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const wood = mat('#795234', 0.66);
const woodTextureCanvas = document.createElement('canvas');
woodTextureCanvas.width = 1024; woodTextureCanvas.height = 512;
const woodContext = woodTextureCanvas.getContext('2d');
const woodGradient = woodContext.createLinearGradient(0, 0, 0, 512);
woodGradient.addColorStop(0, '#765037'); woodGradient.addColorStop(0.24, '#8d6543'); woodGradient.addColorStop(0.54, '#80583a'); woodGradient.addColorStop(0.78, '#956d48'); woodGradient.addColorStop(1, '#70492f');
woodContext.fillStyle = woodGradient; woodContext.fillRect(0, 0, 1024, 512);
for (let i = 0; i < 72; i++) {
  const y = (i / 72) * 512 + Math.sin(i * 2.7) * 3;
  woodContext.strokeStyle = i % 4 === 0 ? '#d9b17b1d' : '#44251512';
  woodContext.lineWidth = i % 9 === 0 ? 2 : 0.8;
  woodContext.beginPath(); woodContext.moveTo(0, y);
  woodContext.bezierCurveTo(240, y + Math.sin(i) * 9, 700, y - Math.cos(i * 1.7) * 8, 1024, y + Math.sin(i * 2.1) * 4);
  woodContext.stroke();
}
const woodTexture = new THREE.CanvasTexture(woodTextureCanvas);
woodTexture.colorSpace = THREE.SRGBColorSpace;
const woodTop = new THREE.MeshStandardMaterial({ color: '#ffffff', map: woodTexture, roughness: 0.58 });
const woodEdge = mat('#75472d', 0.72);
const black = mat('#171b1e', 0.34, 0.22);
const steel = mat('#4d5e61', 0.33, 0.7);
const screenMaterial = mat('#fbfaf5', 0.93);
const screenRim = mat('#d8dfdb', 0.62, 0.08);
const reflectionEnvironmentCanvas = document.createElement('canvas');
reflectionEnvironmentCanvas.width = 512; reflectionEnvironmentCanvas.height = 256;
const reflectionContext = reflectionEnvironmentCanvas.getContext('2d');
const reflectionGradient = reflectionContext.createLinearGradient(0, 0, 0, 256);
reflectionGradient.addColorStop(0, '#666a68'); reflectionGradient.addColorStop(0.46, '#e4e0d6'); reflectionGradient.addColorStop(0.53, '#c5bcae'); reflectionGradient.addColorStop(1, '#75583e');
reflectionContext.fillStyle = reflectionGradient; reflectionContext.fillRect(0, 0, 512, 256);
reflectionContext.fillStyle = '#fffdf3'; reflectionContext.fillRect(90, 42, 74, 88); reflectionContext.fillRect(252, 28, 104, 96); reflectionContext.fillStyle = '#a9afb0'; reflectionContext.fillRect(170, 45, 38, 76); reflectionContext.fillRect(382, 52, 48, 70);
const reflectionEnvironment = new THREE.CanvasTexture(reflectionEnvironmentCanvas);
reflectionEnvironment.mapping = THREE.EquirectangularReflectionMapping;
reflectionEnvironment.colorSpace = THREE.SRGBColorSpace;
const mirrorMaterial = new THREE.MeshStandardMaterial({ color: '#f0f3f2', roughness: 0.13, metalness: 0.78, envMap: reflectionEnvironment, envMapIntensity: 1.15 });

function box(parent, size, position, material, cast = true, receive = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position); mesh.castShadow = cast; mesh.receiveShadow = receive; parent.add(mesh); return mesh;
}
function cylinder(parent, radiusTop, radiusBottom, height, position, material, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 24), material);
  mesh.position.set(...position); mesh.rotation.set(...rotation); mesh.castShadow = true; parent.add(mesh); return mesh;
}

// Wooden tabletop with subtle grain and no seams across the experiment surface.
const tabletop = new THREE.Mesh(new THREE.BoxGeometry(17, 0.28, 18), [woodEdge, woodEdge, woodTop, woodEdge, woodEdge, woodEdge]);
tabletop.position.set(-4, -0.16, 2); tabletop.castShadow = true; tabletop.receiveShadow = true; scene.add(tabletop);
// Fine grain remains visible without plank seams competing with the laser paths.
for (const x of [-11.1, 3.1]) for (const z of [-5.5, 9.5]) box(scene, [0.2, 1.15, 0.2], [x, -0.86, z], wood);
// Small feet are kept out of the rays and the tabletop reflection path.

// Upright mirror: its reflective face points left toward the laser source.
box(scene, [0.16, 3.05, 2.30], [2.065, 1.59, 0], black);
const mirror = box(scene, [0.055, 2.90, 2.14], [1.96, 1.59, 0], mirrorMaterial);
mirror.castShadow = false;
box(scene, [0.42, 0.12, 0.4], [2.12, 0.06, 0], black);
box(scene, [0.12, 0.24, 0.12], [2.09, 0.2, -0.17], steel);
box(scene, [0.12, 0.24, 0.12], [2.09, 0.2, 0.17], steel);

// The fixed receiving screen is angled to catch the reflected beam across the 20°–40° control range.
const screenAngle = THREE.MathUtils.degToRad(30);
const screenDistance = 11;
const rayAtDefault = new THREE.Vector3(-Math.cos(screenAngle), 0, Math.sin(screenAngle));
const centerPoint = new THREE.Vector3(2, 1.4, 0);
const screenHeight = 1.8, screenY = screenHeight / 2;
const screenCenter = rayAtDefault.clone().multiplyScalar(screenDistance).add(new THREE.Vector3(centerPoint.x, screenY, centerPoint.z));
const screenNormal = new THREE.Vector3(Math.cos(screenAngle), 0, -Math.sin(screenAngle));
const screenGroup = new THREE.Group();
screenGroup.position.set(screenCenter.x, screenY, screenCenter.z);
screenGroup.rotation.y = screenAngle;
scene.add(screenGroup);
box(screenGroup, [0.08, screenHeight, 3.8], [0, 0, 0], screenMaterial);
box(screenGroup, [0.10, screenHeight + 0.04, 0.08], [0.005, 0, -1.88], screenRim);
box(screenGroup, [0.10, screenHeight + 0.04, 0.08], [0.005, 0, 1.88], screenRim);

// Laser housing with a fixed-height beam, mounted on a moving goniometer base.
const emitter = new THREE.Group(); scene.add(emitter);
const emitterBody = new THREE.Group(); emitter.add(emitterBody);
// The long, asymmetric housing makes its changing aim visible; its front lens sits at the beam origin.
emitterBody.scale.setScalar(2.3);
box(emitterBody, [0.46, 0.38, 1.05], [0, 0, -0.525], black);
box(emitterBody, [0.50, 0.42, 0.12], [0, 0, -1.08], steel);
box(emitterBody, [0.18, 0.16, 0.58], [0, 0.26, -0.40], steel);
box(emitterBody, [0.34, 0.08, 0.25], [0, 0.42, -0.83], black);
const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.08, 32), steel);
bezel.rotation.x = Math.PI / 2; bezel.position.z = -0.015; emitterBody.add(bezel);
const lens = new THREE.Mesh(new THREE.CircleGeometry(0.18, 32), new THREE.MeshBasicMaterial({ color: '#ef3030' }));
lens.position.z = 0.028; emitterBody.add(lens);
const emitterStem = cylinder(scene, 0.055, 0.065, 1.2, [-2.0, 0.62, -1.8], steel);
const emitterFoot = box(scene, [0.72, 0.11, 0.72], [-2.0, 0.07, -1.8], black);
const pivot = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 8, 48), steel);
pivot.rotation.x = Math.PI / 2; pivot.position.set(-2.0, 0.15, -1.8); scene.add(pivot);
const rayMaterial = new THREE.LineBasicMaterial({ color: '#fa1e20', transparent: true, opacity: 0.94, depthTest: false });
function dynamicLine() {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const line = new THREE.Line(geometry, rayMaterial); line.renderOrder = 10; scene.add(line); return line;
}
function setLine(line, a, b) { line.geometry.dispose(); line.geometry = new THREE.BufferGeometry().setFromPoints([a, b]); }
const incoming = dynamicLine(), reflected = dynamicLine();
const normalGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(centerPoint.x - 4.8, 1.405, 0), new THREE.Vector3(centerPoint.x - 0.1, 1.405, 0)]);
const normal = new THREE.Line(normalGeometry, new THREE.LineDashedMaterial({ color: '#fff8df', dashSize: 0.22, gapSize: 0.12, transparent: true, opacity: 0.96, depthTest: false }));
normal.computeLineDistances(); normal.renderOrder = 11; scene.add(normal);
const spotMaterial = new THREE.MeshBasicMaterial({ color: '#ff2529', depthTest: false });
const spot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 24), spotMaterial); spot.renderOrder = 12; scene.add(spot);
const glow = new THREE.PointLight('#ff3535', 2.2, 1.8); scene.add(glow);

function arc(radius, angle, direction) {
  const points = [];
  const steps = Math.max(8, Math.ceil(angle * 1.5));
  for (let i = 0; i <= steps; i++) {
    const a = angle * i / steps;
    points.push(new THREE.Vector3(centerPoint.x - radius * Math.cos(a), centerPoint.y + 0.015, direction * radius * Math.sin(a)));
  }
  return points;
}
const incomingArc = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#2878df', depthTest: false, linewidth: 3 }));
const outgoingArc = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#27833d', depthTest: false, linewidth: 3 }));
incomingArc.renderOrder = outgoingArc.renderOrder = 11; scene.add(incomingArc, outgoingArc);

const protractorRadius = 5.0;
const protractor = new THREE.Group();
protractor.position.set(centerPoint.x, 1.405, centerPoint.z); scene.add(protractor);
const protractorShape = new THREE.Shape(); protractorShape.moveTo(0, 0);
for (let i = 0; i <= 90; i++) {
  const angle = THREE.MathUtils.degToRad(-90 + i * 2);
  protractorShape.lineTo(-protractorRadius * Math.cos(angle), protractorRadius * Math.sin(angle));
}
protractorShape.closePath();
const protractorFaceGeometry = new THREE.ShapeGeometry(protractorShape); protractorFaceGeometry.rotateX(Math.PI / 2);
const protractorFace = new THREE.Mesh(protractorFaceGeometry, new THREE.MeshBasicMaterial({ color: '#dff4ed', transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false, depthTest: false }));
protractorFace.renderOrder = 6; protractor.add(protractorFace);
const protractorArcPoints = [];
for (let i = 0; i <= 90; i++) {
  const angle = THREE.MathUtils.degToRad(-90 + i * 2);
  protractorArcPoints.push(new THREE.Vector3(-protractorRadius * Math.cos(angle), 0.035, protractorRadius * Math.sin(angle)));
}
const protractorArc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(protractorArcPoints), new THREE.LineBasicMaterial({ color: '#57736b', transparent: true, opacity: 0.9, depthTest: false }));
protractorArc.renderOrder = 8; protractor.add(protractorArc);
const minorTicks = [], majorTicks = [];
for (const side of [-1, 1]) for (let degrees = 5; degrees <= 90; degrees += 5) {
  const angle = THREE.MathUtils.degToRad(side * degrees), direction = new THREE.Vector3(-Math.cos(angle), 0, Math.sin(angle));
  const length = degrees % 10 === 0 ? 0.44 : 0.22, inner = direction.clone().multiplyScalar(protractorRadius - length), outer = direction.clone().multiplyScalar(protractorRadius);
  const points = degrees % 10 === 0 ? majorTicks : minorTicks;
  points.push(inner.x, 0.04, inner.z, outer.x, 0.04, outer.z);
}
function protractorTickLines(points, color, opacity, width) {
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity, linewidth: width, depthTest: false }));
  lines.renderOrder = 9; protractor.add(lines);
}
protractorTickLines(minorTicks, '#71877e', 0.65, 1);
protractorTickLines(majorTicks, '#405e54', 0.95, 2);
function addProtractorNumber(degrees, side) {
  const labelCanvas = document.createElement('canvas'); labelCanvas.width = 256; labelCanvas.height = 96;
  const context = labelCanvas.getContext('2d'); context.fillStyle = '#29483e'; context.font = 'bold 68px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(`${degrees}°`, 128, 50);
  const texture = new THREE.CanvasTexture(labelCanvas); texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  label.scale.set(1.0, 0.64, 1); label.renderOrder = 10;
  if (degrees === 0) label.position.set(-protractorRadius + 0.34, 0.11, 0.62);
  else {
    const angle = THREE.MathUtils.degToRad(side * degrees), radius = protractorRadius - 0.72;
    label.position.set(-radius * Math.cos(angle), 0.11, radius * Math.sin(angle));
  }
  protractor.add(label);
}
for (let degrees = 0; degrees <= 90; degrees += 10) {
  addProtractorNumber(degrees, -1);
  if (degrees) addProtractorNumber(degrees, 1);
}
const incomingScaleHit = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), new THREE.MeshBasicMaterial({ color: '#2878df', depthTest: false }));
const reflectedScaleHit = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), new THREE.MeshBasicMaterial({ color: '#27833d', depthTest: false }));
incomingScaleHit.renderOrder = reflectedScaleHit.renderOrder = 12; protractor.add(incomingScaleHit, reflectedScaleHit);

function makeAngleLabel(color, size = [3.3, 0.82]) {
  const labelCanvas = document.createElement('canvas'); labelCanvas.width = 512; labelCanvas.height = 128;
  const context = labelCanvas.getContext('2d');
  const texture = new THREE.CanvasTexture(labelCanvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(size[0], size[1], 1); sprite.renderOrder = 14; sprite.visible = false; scene.add(sprite);
  sprite.userData.labelCanvas = labelCanvas; sprite.userData.context = context; sprite.userData.texture = texture; sprite.userData.labelColor = color; sprite.userData.labelText = '';
  return sprite;
}
function updateAngleLabel(sprite, text) {
  if (sprite.userData.labelText === text) return;
  const { labelCanvas, context, texture, labelColor } = sprite.userData;
  context.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
  context.fillStyle = '#fffdf4ee'; context.strokeStyle = `${labelColor}aa`; context.lineWidth = 5;
  context.beginPath(); context.roundRect(8, 8, 496, 112, 26); context.fill(); context.stroke();
  context.fillStyle = labelColor; context.font = 'bold 58px "Noto Sans TC", "Microsoft JhengHei", sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillText(text, 256, 66); texture.needsUpdate = true; sprite.userData.labelText = text;
}
const equalityLabel = makeAngleLabel('#14533f', [4.8, 0.92]);
equalityLabel.visible = true;

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
  const deg = Number(slider.value), angle = THREE.MathUtils.degToRad(deg), radius = 8.0;
  const source = new THREE.Vector3(centerPoint.x - radius * Math.cos(angle), centerPoint.y, -radius * Math.sin(angle));
  const hit = new THREE.Vector3(centerPoint.x, centerPoint.y, 0);
  const directionOut = new THREE.Vector3(-Math.cos(angle), 0, Math.sin(angle));
  const travel = screenCenter.clone().sub(centerPoint).dot(screenNormal) / directionOut.dot(screenNormal);
  const receiverSpot = directionOut.multiplyScalar(travel).add(centerPoint);
  receiverSpot.y = centerPoint.y;
  const sourceDirection = new THREE.Vector3().subVectors(hit, source).normalize();
  emitter.position.copy(source);
  emitterBody.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), sourceDirection);
  const standPosition = new THREE.Vector3(source.x, 0, source.z);
  emitterStem.position.set(standPosition.x, 0.62, standPosition.z);
  emitterFoot.position.set(standPosition.x, 0.07, standPosition.z);
  pivot.position.set(standPosition.x, 0.15, standPosition.z);
  setLine(incoming, source, hit);
  setLine(reflected, hit, receiverSpot);
  spot.position.copy(receiverSpot); glow.position.copy(receiverSpot);
  incomingArc.geometry.dispose(); incomingArc.geometry = new THREE.BufferGeometry().setFromPoints(arc(1.2, angle, -1));
  outgoingArc.geometry.dispose(); outgoingArc.geometry = new THREE.BufferGeometry().setFromPoints(arc(1.2, angle, 1));
  incomingScaleHit.position.set(centerPoint.x - protractorRadius * Math.cos(angle), 1.47, centerPoint.z - protractorRadius * Math.sin(angle));
  reflectedScaleHit.position.set(centerPoint.x - protractorRadius * Math.cos(angle), 1.47, centerPoint.z + protractorRadius * Math.sin(angle));
  equalityLabel.position.set(-4, 1.5, canvas.clientWidth < 500 ? -0.8 : 0.3);
  updateAngleLabel(equalityLabel, '入射角 ＝ 反射角');

  const diagramLength = 190, dx = diagramLength * Math.sin(angle), dy = diagramLength * Math.cos(angle);
  const endOffset = 14, halfAngle = angle / 2, labelRadius = 150;
  const contactX = 300 - dx / diagramLength * endOffset, contactY = 280 - dy / diagramLength * endOffset;
  const reflectedStartX = 300 + dx / diagramLength * endOffset;
  document.querySelector('#law-incident').setAttribute('d', `M${(300 - dx).toFixed(1)} ${(280 - dy).toFixed(1)}L${contactX.toFixed(1)} ${contactY.toFixed(1)}`);
  document.querySelector('#law-reflected').setAttribute('d', `M${reflectedStartX.toFixed(1)} ${contactY.toFixed(1)}L${(300 + dx).toFixed(1)} ${(280 - dy).toFixed(1)}`);
  document.querySelector('#law-wedge-incident').setAttribute('d', svgSector(166, deg, false));
  document.querySelector('#law-wedge-reflected').setAttribute('d', svgSector(166, deg, true));
  document.querySelector('#law-arc-incident').setAttribute('d', svgArc(82, deg, false));
  document.querySelector('#law-arc-reflected').setAttribute('d', svgArc(82, deg, true));
  const angleLabelX = 300 - labelRadius * Math.sin(halfAngle), angleLabelY = 280 - labelRadius * Math.cos(halfAngle);
  const valueX = 300 - 110 * Math.sin(halfAngle), valueY = 280 - 110 * Math.cos(halfAngle);
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
  document.querySelector('#lab-angle-in').textContent = `${deg}°`;
  document.querySelector('#lab-angle-out').textContent = `${deg}°`;
  document.querySelector('#incident-angle-value').value = `${deg}°`;
  document.querySelector('#angle-observation').textContent = `發射器轉到 ${deg}°；入射角和反射角相等，反射光點沿接收屏移動。`;
  renderer.render(scene, camera);
}

function resize() {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.fov = width < 200 ? 45 : width < 500 ? 33 : 45;
  const compact = width < 500, focusX = compact ? -2.7 : -2.5, focusZ = compact ? -0.8 : 0.3;
  camera.up.set(-1, 0, 0); camera.position.set(focusX, compact ? 20 : 18.5, focusZ); camera.lookAt(focusX, 1.4, focusZ);
  camera.updateProjectionMatrix();
  update();
}
slider.addEventListener('input', update);
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
  dragAngleOffset = Number(slider.value) - pointerAngle(point);
  canvas.style.cursor = 'grabbing';
  canvas.setPointerCapture(event.pointerId);
  event.preventDefault();
});

canvas.addEventListener('pointermove', (event) => {
  if (draggingEmitter) {
    const point = pointerWorldPoint(event);
    if (!point) return;
    const target = Math.round(THREE.MathUtils.clamp(pointerAngle(point) + dragAngleOffset, Number(slider.min), Number(slider.max)));
    if (target !== Number(slider.value)) {
      slider.value = String(target);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return;
  }
  canvas.style.cursor = isEmitterAtPointer(event) ? 'grab' : 'default';
});

canvas.addEventListener('pointerup', finishEmitterDrag);
canvas.addEventListener('pointercancel', finishEmitterDrag);
canvas.addEventListener('lostpointercapture', () => { draggingEmitter = false; canvas.style.cursor = 'default'; });
