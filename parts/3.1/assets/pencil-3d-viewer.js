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
  edge: 18,
  start: 0,
  yaw: 0,
  pitch: 0.45,
  orbitRadius: 24,
  centerY: 0.8,
  centerZ: 2.5,
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
  const orbitCenter = new THREE.Vector3(view.start + view.edge / 2, view.centerY, 0);
  const target = new THREE.Vector3(
    Number.isFinite(view.lookAtX) ? view.lookAtX : view.start + view.edge / 2,
    Number.isFinite(view.lookAtY) ? view.lookAtY : view.centerY,
    Number.isFinite(view.lookAtZ) ? view.lookAtZ : 0
  );
  const horizontal = view.orbitRadius * Math.cos(view.pitch);
  camera.position.set(
    orbitCenter.x + horizontal * Math.sin(view.yaw),
    orbitCenter.y + view.orbitRadius * Math.sin(view.pitch),
    orbitCenter.z + horizontal * Math.cos(view.yaw)
  );
  camera.lookAt(target);

  pencil.position.set(view.start + view.edge / 2, view.centerY, view.centerZ);
  renderer.render(scene, camera);
}

function createPencil(length) {
  const texture = new THREE.TextureLoader().load("assets/pencil-photo.webp", render);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.04,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const photographicCutout = new THREE.Mesh(
    new THREE.PlaneGeometry(length, length / 19.7),
    material
  );
  photographicCutout.name = "realistic-pencil-cutout";
  photographicCutout.position.set(0, 0, 0);
  photographicCutout.renderOrder = 2;
  return photographicCutout;
}

try {
  pencil = createPencil(view.edge);
  scene.add(pencil);
  modelReady = true;
  announce("鉛筆 3D 場景已載入。可拖曳畫面旋轉觀察。");
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
  if (pencil && Number.isFinite(nextView.edge)) pencil.scale.x = nextView.edge / 18;
  render();
};

new ResizeObserver(resizeRenderer).observe(sceneCanvas);
window.addEventListener("resize", resizeRenderer, { passive: true });
resizeRenderer();
