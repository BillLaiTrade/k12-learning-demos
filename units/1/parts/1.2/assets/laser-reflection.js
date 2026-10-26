import * as THREE from '../../1.1/assets/vendor/three/build/three.module.js';

const canvas = document.querySelector('#laser-reflection-scene');
const slider = document.querySelector('#incident-angle');
if (!canvas || !slider) throw new Error('Laser reflection controls are missing.');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#d7d5ce');
scene.fog = new THREE.Fog('#d7d5ce', 14, 28);
const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 80);
camera.position.set(-9.4, 8.8, 11.8);
camera.lookAt(-1.1, 0.65, 1.6);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

scene.add(new THREE.HemisphereLight(0xfff5e4, 0x76604a, 2.05));
const key = new THREE.DirectionalLight(0xffefdc, 3.2);
key.position.set(-4, 10, 3);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
scene.add(key);
const fill = new THREE.DirectionalLight(0xe7f2ff, 1.15);
fill.position.set(6, 6, -6);
scene.add(fill);

const mat = (color, roughness = 0.7, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const wood = mat('#875431', 0.66);
const woodSeam = mat('#79492f', 0.82);
const black = mat('#171b1e', 0.34, 0.22);
const steel = mat('#4d5e61', 0.33, 0.7);
const screenMaterial = mat('#fbfaf5', 0.93);
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

// Wooden tabletop and a few restrained grain seams make the working plane legible.
box(scene, [13, 0.28, 15], [-2.2, -0.16, 2.1], wood);
for (let i = 0; i < 7; i++) box(scene, [12.92, 0.006, 0.014], [-2.2, -0.012, -4.7 + i * 2.12], woodSeam, false, false);
for (const x of [-7.3, 2.9]) for (const z of [-3.1, 7.1]) box(scene, [0.2, 1.15, 0.2], [x, -0.86, z], wood);
// Small feet are kept out of the rays and the tabletop reflection path.

// Upright mirror: the silver face is at x=-0.04, facing the laser on its left.
box(scene, [0.16, 1.92, 1.74], [0.065, 1.03, 0], black);
const mirror = box(scene, [0.055, 1.78, 1.58], [-0.04, 1.03, 0], mirrorMaterial);
mirror.castShadow = false;
box(scene, [0.42, 0.12, 0.4], [0.12, 0.06, 0], black);
box(scene, [0.12, 0.24, 0.12], [0.09, 0.2, -0.17], steel);
box(scene, [0.12, 0.24, 0.12], [0.09, 0.2, 0.17], steel);

// The fixed receiving screen is set obliquely so the full 10°–60° sweep lands on it.
// Its short width makes the moving hit spot visible without an oversized backdrop.
const screenAngle = THREE.MathUtils.degToRad(30);
const screenDistance = 3.8;
const rayAtDefault = new THREE.Vector3(-Math.cos(screenAngle), 0, Math.sin(screenAngle));
const screenCenter = rayAtDefault.clone().multiplyScalar(screenDistance);
const screenNormal = new THREE.Vector3(Math.cos(screenAngle), 0, -Math.sin(screenAngle));
const screenGroup = new THREE.Group();
screenGroup.position.set(screenCenter.x, 0.97, screenCenter.z);
screenGroup.rotation.y = screenAngle;
scene.add(screenGroup);
box(screenGroup, [0.10, 1.58, 5.2], [0, 0, 0], screenMaterial);
box(screenGroup, [0.17, 1.72, 0.12], [0.015, 0, -2.58], steel);
box(screenGroup, [0.17, 1.72, 0.12], [0.015, 0, 2.58], steel);
box(screenGroup, [0.62, 0.12, 0.55], [-0.18, -0.88, 0], black);
box(screenGroup, [0.13, 0.20, 0.13], [-0.16, -0.78, -0.22], steel);
box(screenGroup, [0.13, 0.20, 0.13], [-0.16, -0.78, 0.22], steel);

// Laser housing with a fixed-height beam, mounted on a moving goniometer base.
const emitter = new THREE.Group(); scene.add(emitter);
const emitterBody = new THREE.Group(); emitter.add(emitterBody);
const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.72, 32), black);
body.rotation.x = Math.PI / 2; body.position.z = -0.24; body.castShadow = true; emitterBody.add(body);
const rear = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.08, 32), steel);
rear.rotation.x = Math.PI / 2; rear.position.z = -0.62; emitterBody.add(rear);
const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.12, 32), steel);
bezel.rotation.x = Math.PI / 2; bezel.position.z = 0.13; emitterBody.add(bezel);
const lens = new THREE.Mesh(new THREE.CircleGeometry(0.155, 32), new THREE.MeshBasicMaterial({ color: '#ef3030' }));
lens.position.z = 0.195; emitterBody.add(lens);
const emitterStem = cylinder(scene, 0.055, 0.065, 0.42, [-2.0, 0.28, -1.8], steel);
const emitterFoot = box(scene, [0.72, 0.11, 0.72], [-2.0, 0.07, -1.8], black);
const pivot = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 8, 48), steel);
pivot.rotation.x = Math.PI / 2; pivot.position.set(-2.0, 0.15, -1.8); scene.add(pivot);
const centerPoint = new THREE.Vector3(0, 0.84, 0);

const rayMaterial = new THREE.LineBasicMaterial({ color: '#fa1e20', transparent: true, opacity: 0.94, depthTest: false });
function dynamicLine() {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const line = new THREE.Line(geometry, rayMaterial); line.renderOrder = 10; scene.add(line); return line;
}
function setLine(line, a, b) { line.geometry.dispose(); line.geometry = new THREE.BufferGeometry().setFromPoints([a, b]); }
const incoming = dynamicLine(), reflected = dynamicLine();
const normalGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-4.8, 0.845, 0), new THREE.Vector3(-0.1, 0.845, 0)]);
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
    points.push(new THREE.Vector3(-radius * Math.cos(a), 0.855, direction * radius * Math.sin(a)));
  }
  return points;
}
const incomingArc = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#2878df', depthTest: false, linewidth: 3 }));
const outgoingArc = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#27833d', depthTest: false, linewidth: 3 }));
incomingArc.renderOrder = outgoingArc.renderOrder = 11; scene.add(incomingArc, outgoingArc);

function svgArc(radius, degrees, lower) {
  const steps = Math.max(5, Math.ceil(degrees / 3));
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const a = degrees * Math.PI / 180 * i / steps;
    const x = 474 - radius * Math.cos(a), y = 130 + (lower ? 1 : -1) * radius * Math.sin(a);
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}
function update() {
  const deg = Number(slider.value), angle = THREE.MathUtils.degToRad(deg), radius = 3.25;
  const source = new THREE.Vector3(-radius * Math.cos(angle), centerPoint.y, -radius * Math.sin(angle));
  const hit = new THREE.Vector3(0, centerPoint.y, 0);
  const directionOut = new THREE.Vector3(-Math.cos(angle), 0, Math.sin(angle));
  const travel = screenCenter.dot(screenNormal) / directionOut.dot(screenNormal);
  const receiverSpot = directionOut.multiplyScalar(travel).add(new THREE.Vector3(0, centerPoint.y, 0));
  receiverSpot.y = centerPoint.y;
  const sourceDirection = new THREE.Vector3().subVectors(hit, source).normalize();
  emitter.position.copy(source);
  emitterBody.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), sourceDirection);
  const standPosition = new THREE.Vector3(source.x, 0, source.z);
  emitterStem.position.set(standPosition.x, 0.28, standPosition.z);
  emitterFoot.position.set(standPosition.x, 0.07, standPosition.z);
  pivot.position.set(standPosition.x, 0.15, standPosition.z);
  setLine(incoming, source, hit);
  setLine(reflected, hit, receiverSpot);
  spot.position.copy(receiverSpot); glow.position.copy(receiverSpot);
  incomingArc.geometry.dispose(); incomingArc.geometry = new THREE.BufferGeometry().setFromPoints(arc(0.68, angle, -1));
  outgoingArc.geometry.dispose(); outgoingArc.geometry = new THREE.BufferGeometry().setFromPoints(arc(0.68, angle, 1));

  const diagramLength = 312, x = 474 - diagramLength * Math.cos(angle), dy = diagramLength * Math.sin(angle);
  document.querySelector('#law-incident').setAttribute('d', `M${x.toFixed(1)} ${(130 - dy).toFixed(1)}L474 130`);
  document.querySelector('#law-reflected').setAttribute('d', `M474 130L${x.toFixed(1)} ${(130 + dy).toFixed(1)}`);
  document.querySelector('#law-arc-incident').setAttribute('d', svgArc(58, deg, false));
  document.querySelector('#law-arc-reflected').setAttribute('d', svgArc(58, deg, true));
  document.querySelector('#law-angle-in').textContent = `入射角 ${deg}°`;
  document.querySelector('#law-angle-out').textContent = `反射角 ${deg}°`;
  document.querySelector('#lab-angle-in').textContent = `${deg}°`;
  document.querySelector('#lab-angle-out').textContent = `${deg}°`;
  document.querySelector('#incident-angle-value').value = `${deg}°`;
  document.querySelector('#angle-observation').textContent = `入射角和反射角都是 ${deg}°。雷射移到新角度，反射光點也沿接收屏移動。`;
  renderer.render(scene, camera);
}

function resize() {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  update();
}
slider.addEventListener('input', update);
new ResizeObserver(resize).observe(canvas);
resize();
