import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.querySelector("#pencil-3d-canvas");
const sceneCanvas = document.querySelector("#parallax-canvas");
const liveRegion = document.querySelector("#pencil-model-status");
if (!canvas || !sceneCanvas) throw new Error("找不到鉛筆 3D 場景畫布");
const immersiveView = document.body.classList.contains("immersive-page");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
camera.up.set(0, 1, 0);

let renderer;
let pencil;
let modelReady = false;
let modelFailed = false;
let lastFrame = "";
const view = {
  edge: 18.2,
  start: 0,
  yaw: 0,
  pitch: 0.45,
  orbitRadius: 24,
  centerZ: 1.9,
  focalLengthRatio: immersiveView ? 0.5 : 0.9
};

function announce(message) {
  if (liveRegion) liveRegion.textContent = message;
}

try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xfff6ec, 0x44352d, 1.25));
  const keyLight = new THREE.DirectionalLight(0xffefd9, 2.15);
  keyLight.position.set(-5, 9, 8);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xdceaff, 0.7);
  fillLight.position.set(7, 4, 3);
  scene.add(fillLight);
} catch (error) {
  modelFailed = true;
  canvas.hidden = true;
  announce("此瀏覽器無法啟動 3D 鉛筆模型。請使用支援 WebGL 的瀏覽器。");
  console.error("鉛筆 3D 場景初始化失敗", error);
}

function resizeRenderer() {
  if (!renderer) return;
  const rect = sceneCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  const frame = `${width}:${height}:${window.devicePixelRatio || 1}`;
  if (frame === lastFrame) return;
  lastFrame = frame;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  render();
}

function render() {
  if (!renderer || !modelReady || modelFailed) return;
  camera.fov = 2 * Math.atan(1 / (2 * view.focalLengthRatio)) * 180 / Math.PI;
  camera.updateProjectionMatrix();
  const target = new THREE.Vector3(view.start + view.edge / 2, 0.3, 0);
  const horizontal = view.orbitRadius * Math.cos(view.pitch);
  camera.position.set(
    target.x + horizontal * Math.sin(view.yaw),
    target.y + view.orbitRadius * Math.sin(view.pitch),
    target.z + horizontal * Math.cos(view.yaw)
  );
  camera.lookAt(target);

  pencil.position.set(view.start + view.edge / 2, 0.3, view.centerZ);
  renderer.render(scene, camera);
}

function createPencil(length) {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0xd7a35a, roughness: 0.78 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xe4bd42, roughness: 0.52 });
  const graphite = new THREE.MeshStandardMaterial({ color: 0x30343a, roughness: 0.72 });
  const eraser = new THREE.MeshStandardMaterial({ color: 0xd88682, roughness: 0.6 });
  const ferrule = new THREE.MeshStandardMaterial({ color: 0xb5bdba, metalness: 0.65, roughness: 0.3 });
  const barrelLength = length - 1.55;
  const hex = new THREE.CylinderGeometry(0.34, 0.34, barrelLength, 6, 1);
  const body = new THREE.Mesh(hex, yellow);
  body.rotation.z = -Math.PI / 2;
  body.position.x = 0.025;
  body.castShadow = body.receiveShadow = true;
  group.add(body);
  const woodTip = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.75, 6), wood);
  woodTip.rotation.z = Math.PI / 2;
  woodTip.position.x = barrelLength / 2 + 0.25;
  woodTip.castShadow = true;
  group.add(woodTip);
  const lead = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.5, 6), graphite);
  lead.rotation.z = Math.PI / 2;
  lead.position.x = length / 2 - 0.25;
  lead.castShadow = true;
  group.add(lead);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.32, 6), ferrule);
  band.rotation.z = -Math.PI / 2;
  band.position.x = -length / 2 + 0.64;
  group.add(band);
  const rubber = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.48, 16), eraser);
  rubber.rotation.z = -Math.PI / 2;
  rubber.position.x = -length / 2 + 0.25;
  rubber.castShadow = true;
  group.add(rubber);
  group.traverse((object) => { if (object.isMesh) object.receiveShadow = true; });
  return group;
}

try {
  pencil = createPencil(view.edge);
  scene.add(pencil);
  modelReady = true;
  announce(`鉛筆 3D 模型已載入；固定模型長度為 ${view.edge.toFixed(1)} 公分。可拖曳畫面旋轉觀察。`);
  render();
  window.dispatchEvent(new Event("pencil3d-ready"));
} catch (error) {
  modelFailed = true;
  canvas.hidden = true;
  announce("鉛筆 3D 模型建立失敗；請重新載入頁面。");
  console.error("鉛筆 3D 模型建立失敗", error);
}

window.setPencil3DView = (nextView = {}) => {
  Object.assign(view, nextView);
  if (pencil && Number.isFinite(nextView.edge)) pencil.scale.x = nextView.edge / 18.2;
  render();
};

new ResizeObserver(resizeRenderer).observe(sceneCanvas);
window.addEventListener("resize", resizeRenderer, { passive: true });
resizeRenderer();
