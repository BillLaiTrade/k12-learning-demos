import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.querySelector("#apple-3d-canvas");
const sceneCanvas = document.querySelector("#parallax-canvas");
const liveRegion = document.querySelector("#apple-model-status");
if (!canvas || !sceneCanvas) throw new Error("找不到蘋果 3D 場景畫布");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
camera.up.set(0, 1, 0);

let renderer;
let apple;
let modelReady = false;
let modelFailed = false;
let lastFrame = "";
const view = {
  edge: 7.62,
  start: 0,
  yaw: Math.asin(7.62 / (2 * 14 * Math.cos(0.35))),
  pitch: 0.35,
  orbitRadius: 14,
  centerZ: 2.5,
  focalLengthRatio: 1.45
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
  announce("此瀏覽器無法啟動 3D 蘋果模型。請使用支援 WebGL 的瀏覽器。");
  console.error("蘋果 3D 場景初始化失敗", error);
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
  const target = new THREE.Vector3(view.start + view.edge / 2, view.edge * 0.45, 0);
  const horizontal = view.orbitRadius * Math.cos(view.pitch);
  camera.position.set(
    target.x + horizontal * Math.sin(view.yaw),
    target.y + view.orbitRadius * Math.sin(view.pitch),
    target.z + horizontal * Math.cos(view.yaw)
  );
  camera.lookAt(target);

  apple.position.set(view.start + view.edge / 2, view.edge * 0.45 + 0.04, view.centerZ);
  renderer.render(scene, camera);
}

const loader = new GLTFLoader();
loader.load(
  "assets/models/food_apple_01/food_apple_01_2k.gltf",
  (gltf) => {
    apple = gltf.scene;
    const originalBounds = new THREE.Box3().setFromObject(apple);
    const originalCenter = originalBounds.getCenter(new THREE.Vector3());
    const originalSize = originalBounds.getSize(new THREE.Vector3());
    apple.position.sub(originalCenter);
    apple.scale.setScalar(view.edge / originalSize.x);
    apple.rotation.x = -Math.PI / 2;
    apple.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      if (object.material) object.material.side = THREE.DoubleSide;
    });
    scene.add(apple);
    modelReady = true;
    announce(`真實蘋果 3D 模型已載入；模型寬度基準為 ${view.edge.toFixed(2)} 公分。可拖曳畫面旋轉觀察。`);
    render();
    window.dispatchEvent(new Event("apple3d-ready"));
  },
  undefined,
  (error) => {
    modelFailed = true;
    canvas.hidden = true;
    announce("蘋果 3D 模型載入失敗；請確認本頁的模型素材完整後重新載入。");
    console.error("蘋果 3D 模型載入失敗", error);
  }
);

window.setApple3DView = (nextView = {}) => {
  Object.assign(view, nextView);
  render();
};

new ResizeObserver(resizeRenderer).observe(sceneCanvas);
window.addEventListener("resize", resizeRenderer, { passive: true });
resizeRenderer();
