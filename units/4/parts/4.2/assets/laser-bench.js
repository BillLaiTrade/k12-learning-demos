import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';
import { MIRROR_FACE_X, LASER_HEIGHT } from './planar-reflection.mjs';

// Shared unchanged apparatus/materials from the approved section 02 laboratory.
export function createLaserBench(canvas) {
const scene = new THREE.Scene();
scene.background = new THREE.Color('#8a6346');
scene.fog = new THREE.Fog('#8a6346', 22, 48);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, 2), 3));
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
woodTexture.wrapS = THREE.RepeatWrapping;
woodTexture.wrapT = THREE.RepeatWrapping;
woodTexture.repeat.set(4.7, 2.67);
scene.background = new THREE.Color('#8a6346');
const woodTop = new THREE.MeshStandardMaterial({ color: '#ffffff', map: woodTexture, roughness: 0.58 });
const woodEdge = mat('#75472d', 0.72);
const black = mat('#171b1e', 0.34, 0.22);
const steel = mat('#4d5e61', 0.33, 0.7);
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
const tabletop = new THREE.Mesh(new THREE.BoxGeometry(80, 0.28, 80), [woodEdge, woodEdge, woodTop, woodEdge, woodEdge, woodEdge]);
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

const centerPoint = new THREE.Vector3(MIRROR_FACE_X, LASER_HEIGHT, 0);
const reflectedRayLength = 10.5;

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
lens.name = 'laser-lens'; lens.position.z = 0.028; emitterBody.add(lens);
const emitterStem = cylinder(scene, 0.055, 0.065, 1.2, [-2.0, 0.62, -1.8], steel);
const emitterFoot = box(scene, [0.72, 0.11, 0.72], [-2.0, 0.07, -1.8], black);
const pivot = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 8, 48), steel);
pivot.rotation.x = Math.PI / 2; pivot.position.set(-2.0, 0.15, -1.8); scene.add(pivot);
const rayMaterial = new THREE.MeshBasicMaterial({ color: '#fa1e20', transparent: true, opacity: 0.96, depthTest: false, depthWrite: false });
function dynamicBeam() {
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1, 10), rayMaterial);
  beam.renderOrder = 10; beam.frustumCulled = false; scene.add(beam); return beam;
}
function setBeam(beam, a, b) {
  const direction = new THREE.Vector3().subVectors(b, a), length = direction.length();
  beam.position.copy(a).add(b).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  beam.scale.set(1, length, 1);
}
const incoming = dynamicBeam(), reflected = dynamicBeam();
const normalDashCount = 10, normalDashLength = 0.28, normalDashSpacing = 0.5;
const normalDashRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
const normalDashDark = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.068, 0.068, 1, 10), new THREE.MeshBasicMaterial({ color: '#40564c', depthTest: false, depthWrite: false }), normalDashCount);
const normalDashLight = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.038, 0.038, 1, 10), new THREE.MeshBasicMaterial({ color: '#fff8df', depthTest: false, depthWrite: false }), normalDashCount);
for (let i = 0; i < normalDashCount; i++) {
  const x = centerPoint.x - normalDashLength / 2 - (normalDashCount - 1 - i) * normalDashSpacing;
  const position = new THREE.Vector3(x, centerPoint.y + 0.025, centerPoint.z);
  normalDashDark.setMatrixAt(i, new THREE.Matrix4().compose(position, normalDashRotation, new THREE.Vector3(1, normalDashLength, 1)));
  normalDashLight.setMatrixAt(i, new THREE.Matrix4().compose(position, normalDashRotation, new THREE.Vector3(1, normalDashLength - 0.02, 1)));
}
normalDashDark.instanceMatrix.needsUpdate = true; normalDashLight.instanceMatrix.needsUpdate = true;
normalDashDark.renderOrder = normalDashLight.renderOrder = 11; scene.add(normalDashDark, normalDashLight);
function arc(radius, angle, direction) {
  const points = [];
  const steps = Math.max(8, Math.ceil(angle * 1.5));
  for (let i = 0; i <= steps; i++) {
    const a = angle * i / steps;
    points.push(new THREE.Vector3(centerPoint.x - radius * Math.cos(a), centerPoint.y + 0.015, direction * radius * Math.sin(a)));
  }
  return points;
}
function makeAngleSector(color) {
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthTest: false, depthWrite: false });
  const sector = new THREE.Mesh(new THREE.BufferGeometry(), material);
  sector.renderOrder = 7; scene.add(sector); return sector;
}
function setAngleSector(sector, points) {
  const center = new THREE.Vector3(centerPoint.x, centerPoint.y + 0.02, centerPoint.z), positions = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    positions.push(center.x, center.y, center.z, a.x, center.y, a.z, b.x, center.y, b.z);
  }
  sector.geometry.dispose(); sector.geometry = new THREE.BufferGeometry();
  sector.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  sector.geometry.computeBoundingSphere();
}
const incomingSector = makeAngleSector('#72aefa'), reflectedSector = makeAngleSector('#78c98c');
const incomingArc = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: '#2878df', depthTest: false }));
const outgoingArc = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: '#27833d', depthTest: false }));
incomingArc.renderOrder = outgoingArc.renderOrder = 11; scene.add(incomingArc, outgoingArc);
function setThickArc(mesh, points) {
  mesh.geometry.dispose();
  mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(12, points.length * 2), 0.05, 7, false);
}

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
  const labelCanvas = document.createElement('canvas'); labelCanvas.width = 512; labelCanvas.height = 192;
  const context = labelCanvas.getContext('2d'); context.fillStyle = '#29483e'; context.font = 'bold 136px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(`${degrees}°`, 256, 100);
  const texture = new THREE.CanvasTexture(labelCanvas); texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  label.scale.set(1.0, 0.64, 1); label.renderOrder = 12;
  const angle = THREE.MathUtils.degToRad(side * degrees), radius = protractorRadius - 0.72;
  label.position.set(-radius * Math.cos(angle), 0.11, radius * Math.sin(angle));
  protractor.add(label);
}
for (let degrees = 10; degrees <= 90; degrees += 10) {
  addProtractorNumber(degrees, -1);
  addProtractorNumber(degrees, 1);
}
function makeAngleLabel(color, size = [3.3, 0.82]) {
  const labelCanvas = document.createElement('canvas'); labelCanvas.width = 1024; labelCanvas.height = 256;
  const context = labelCanvas.getContext('2d');
  const texture = new THREE.CanvasTexture(labelCanvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(size[0], size[1], 1); sprite.renderOrder = 14; sprite.visible = false; scene.add(sprite);
  sprite.userData.labelCanvas = labelCanvas; sprite.userData.context = context; sprite.userData.texture = texture; sprite.userData.labelColor = color; sprite.userData.labelText = '';
  sprite.userData.textScaleX = (labelCanvas.width / labelCanvas.height) / (size[0] / size[1]);
  return sprite;
}
function updateAngleLabel(sprite, text) {
  if (sprite.userData.labelText === text) return;
  const { labelCanvas, context, texture, labelColor } = sprite.userData;
  context.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
  context.fillStyle = '#fffdf4ee'; context.strokeStyle = `${labelColor}aa`; context.lineWidth = 10;
  context.beginPath(); context.roundRect(16, 16, 992, 224, 52); context.fill(); context.stroke();
  context.fillStyle = labelColor; context.font = 'bold 164px "Noto Sans TC", "Microsoft JhengHei", sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.save(); context.translate(512, 0); context.scale(sprite.userData.textScaleX, 1); context.translate(-512, 0);
  context.fillText(text, 512, 132); context.restore();
  texture.needsUpdate = true; sprite.userData.labelText = text;
}
const normalLabel = makeAngleLabel('#40566c', [1.9, 0.8]);
normalLabel.visible = true;


return { scene, camera, renderer, centerPoint, reflectedRayLength, emitter, emitterBody, emitterStem, emitterFoot, pivot, incoming, reflected, setBeam, incomingSector, reflectedSector, incomingArc, outgoingArc, arc, setAngleSector, setThickArc, normalLabel, makeAngleLabel, updateAngleLabel, rayMaterial };
}
