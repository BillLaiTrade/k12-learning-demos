import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.querySelector("#pencil-3d-canvas");
const sceneCanvas = document.querySelector("#parallax-canvas");
const magnifierCanvas = document.querySelector("#parallax-magnifier-canvas");
const correctionCanvas = document.querySelector("#correction-parallax-canvas");
const correctionMagnifierCanvas = document.querySelector("#correction-parallax-magnifier-canvas");
const correctionSceneCanvas = document.querySelector("#correction-parallax-scene");
const liveRegion = document.querySelector("#pencil-model-status");
if (!canvas || !sceneCanvas) throw new Error("找不到鉛筆 3D 場景畫布");

const scene = new THREE.Scene();
scene.background = null;
scene.fog = new THREE.Fog(0xf7f8f3, 43, 82);
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 180);
camera.up.set(0, 1, 0);
const rulerLength = 20;

let renderer;
let magnifierRenderer;
let correctionRenderer;
let correctionMagnifierRenderer;
const magnifierCamera = new THREE.PerspectiveCamera(24, 1, 0.1, 80);
const correctionCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 180);
const correctionMagnifierCamera = new THREE.PerspectiveCamera(24, 1, 0.1, 80);
const correctionInteractionRaycaster = new THREE.Raycaster();
const correctionInteractionPointer = new THREE.Vector2();
let correctionScene;
const magnifierLabels = new THREE.Group();
let correctionMagnifierLabels;
let rulerModel;
let correctionRulerModel;
let pencil;
let correctionPencil;
let projectionRay;
let correctionProjectionRay;
let landingRing;
let correctionLandingRing;
let modelReady = false;
let modelFailed = false;
let lastFrame = "";
const view = {
  edge: 18.4,
  start: 0,
  rulerOffset: 0,
  tickInterval: 1,
  yaw: 0,
  pitch: 0.48,
  orbitRadius: 24,
  centerY: 0.78,
  centerZ: -0.1,
  lookAtX: 9.2,
  lookAtY: 0.04,
  lookAtZ: 0,
  focalLengthRatio: 2.5,
  rayStart: null,
  rayEnd: null
};
const correctionView = {
  ...view,
  yaw: 0,
  pitch: 0.68,
  rulerOffset: -1,
  tickInterval: 5
};

function announce(message) {
  if (liveRegion) liveRegion.textContent = message;
}

function standardMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.02, ...options });
}

function cylinderAlongX(radiusTop, radiusBottom, length, material, radialSegments = 24) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, length, radialSegments, 1, false),
    material
  );
  mesh.rotation.z = -Math.PI / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createProjectionGuide() {
  const guide = new THREE.Group();
  guide.name = "measurement-projection-ray";
  guide.visible = false;
  return guide;
}

function updateProjectionGuide(guide, start, end) {
  if (!guide || !start || !end) return;
  const from = new THREE.Vector3(start.x, start.y, start.z);
  const to = new THREE.Vector3(end.x, end.y, end.z);
  const delta = to.clone().sub(from);
  const length = delta.length();
  if (length < 0.01) {
    guide.visible = false;
    return;
  }
  const direction = delta.normalize();
  const dashLength = 0.18;
  const dashGap = 0.13;
  const dashCount = Math.ceil(length / (dashLength + dashGap));
  while (guide.children.length < dashCount) {
    const dash = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 1, 8, 1, false),
      new THREE.MeshBasicMaterial({ color: 0xc45a2b, transparent: true, opacity: 0.72, depthTest: false, depthWrite: false, toneMapped: false })
    );
    dash.renderOrder = 7;
    guide.add(dash);
  }
  for (let index = 0; index < guide.children.length; index += 1) {
    const dash = guide.children[index];
    const offset = index * (dashLength + dashGap);
    const segmentLength = Math.max(0, Math.min(dashLength, length - offset));
    dash.visible = segmentLength > 0;
    if (!dash.visible) continue;
    dash.position.copy(from).addScaledVector(direction, offset + segmentLength / 2);
    dash.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    dash.scale.set(1, segmentLength, 1);
  }
  guide.visible = true;
}

function setMagnifierCrop(magnifierCamera, sourceCamera, worldTarget, viewport) {
  const magnification = 6;
  const fullHeight = 1000;
  const fullWidth = fullHeight * sourceCamera.aspect;
  const cropHeight = fullHeight / magnification;
  const cropWidth = Math.min(fullWidth, cropHeight * viewport.width / viewport.height);
  const projectedTarget = worldTarget.clone().project(sourceCamera);
  const centerX = (projectedTarget.x + 1) * fullWidth / 2;
  const centerY = (1 - projectedTarget.y) * fullHeight / 2;
  const cropX = THREE.MathUtils.clamp(centerX - cropWidth / 2, 0, fullWidth - cropWidth);
  const cropY = THREE.MathUtils.clamp(centerY - cropHeight / 2, 0, fullHeight - cropHeight);

  magnifierCamera.fov = sourceCamera.fov;
  magnifierCamera.aspect = sourceCamera.aspect;
  magnifierCamera.position.copy(sourceCamera.position);
  magnifierCamera.quaternion.copy(sourceCamera.quaternion);
  magnifierCamera.updateProjectionMatrix();
  magnifierCamera.setViewOffset(fullWidth, fullHeight, cropX, cropY, cropWidth, cropHeight);
  magnifierCamera.updateMatrixWorld(true);
}

function makeTextTexture(text) {
  const label = document.createElement("canvas");
  label.width = 256;
  label.height = 128;
  const context = label.getContext("2d");
  context.clearRect(0, 0, label.width, label.height);
  context.fillStyle = "#26383a";
  context.font = "700 112px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, label.width / 2, label.height / 2);
  const texture = new THREE.CanvasTexture(label);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function roundedRulerGeometry(width, depth, thickness, radius) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + radius, -halfDepth);
  shape.lineTo(halfWidth - radius, -halfDepth);
  shape.quadraticCurveTo(halfWidth, -halfDepth, halfWidth, -halfDepth + radius);
  shape.lineTo(halfWidth, halfDepth - radius);
  shape.quadraticCurveTo(halfWidth, halfDepth, halfWidth - radius, halfDepth);
  shape.lineTo(-halfWidth + radius, halfDepth);
  shape.quadraticCurveTo(-halfWidth, halfDepth, -halfWidth, halfDepth - radius);
  shape.lineTo(-halfWidth, -halfDepth + radius);
  shape.quadraticCurveTo(-halfWidth, -halfDepth, -halfWidth + radius, -halfDepth);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness - 0.04,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelThickness: 0.02,
    bevelSize: 0.035,
    curveSegments: 5
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function createRuler() {
  const group = new THREE.Group();
  group.name = "solid-rounded-20-centimeter-ruler";

  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe1c477,
    roughness: 0.3,
    metalness: 0.04,
    clearcoat: 0.55,
    clearcoatRoughness: 0.24,
    transparent: false,
    opacity: 1
  });
  const rulerSideMaterial = standardMaterial(0x98733a, { roughness: 0.42, metalness: 0.08 });
  const body = new THREE.Mesh(roundedRulerGeometry(rulerLength + 0.6, 2.0, 0.4, 0.16), [bodyMaterial, rulerSideMaterial]);
  body.position.set(rulerLength / 2, -0.18, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(body.geometry, 22),
    new THREE.LineBasicMaterial({ color: 0x9a804d, transparent: true, opacity: 0.75 })
  );
  edge.position.copy(body.position);
  group.add(edge);

  const scaleInk = standardMaterial(0x24383a, { roughness: 0.7 });
  for (let centimeter = 0; centimeter <= rulerLength; centimeter += 1) {
    const major = centimeter % 5 === 0;
    const tickLength = major ? 0.58 : 0.46;
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.014, tickLength),
      scaleInk
    );
    tick.position.set(centimeter, 0.211, 0.95 - tickLength / 2);
    tick.userData.rulerTick = centimeter;
    tick.castShadow = false;
    tick.receiveShadow = true;
    group.add(tick);

    // The opposite edge has a second graduation row, like a marked ruler edge.
    const farTickLength = major ? 0.36 : 0.24;
    const farTick = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.014, farTickLength),
      scaleInk
    );
    farTick.position.set(centimeter, 0.211, -0.94 + farTickLength / 2);
    farTick.userData.rulerFarTick = centimeter;
    farTick.castShadow = false;
    farTick.receiveShadow = true;
    group.add(farTick);
  }

  for (let centimeter = 0; centimeter <= rulerLength; centimeter += 5) {
    const number = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 0.5),
      new THREE.MeshBasicMaterial({
        map: makeTextTexture(String(centimeter)),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    number.rotation.x = -Math.PI / 2;
    const labelX = centimeter === 0 ? 0.32 : centimeter === rulerLength ? rulerLength - 0.32 : centimeter;
    number.position.set(labelX, 0.235, -0.16);
    number.renderOrder = 2;
    number.userData.rulerMajorNumber = true;
    number.userData.rulerCentimeter = centimeter;
    group.add(number);
  }

  const sideStripe = standardMaterial(0xb18b48, { metalness: 0.35, roughness: 0.3 });
  for (const z of [-0.99, 0.99]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(rulerLength + 0.2, 0.018, 0.045), sideStripe);
    stripe.position.set(rulerLength / 2, 0.207, z);
    group.add(stripe);
  }
  return group;
}

function createPencil() {
  const group = new THREE.Group();
  group.name = "three-dimensional-hexagonal-pencil";

  const yellowLacquer = new THREE.MeshPhysicalMaterial({
    color: 0xf5a900,
    roughness: 0.27,
    metalness: 0.08,
    clearcoat: 0.78,
    clearcoatRoughness: 0.2
  });
  const lacquerHighlight = standardMaterial(0xffcf36, { roughness: 0.25, metalness: 0.08 });
  const wood = standardMaterial(0xb97934, { roughness: 0.78 });
  const graphite = standardMaterial(0x24282a, { roughness: 0.48, metalness: 0.18 });
  const ferruleMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xb8c0c2,
    roughness: 0.24,
    metalness: 0.88,
    clearcoat: 0.5
  });
  const ferruleGroove = standardMaterial(0x6d7479, { metalness: 0.82, roughness: 0.31 });
  const eraserMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe88487,
    roughness: 0.48,
    metalness: 0,
    clearcoat: 0.12
  });

  const barrelStart = 1.22;
  const barrelEnd = 16.93;
  const barrelFacets = [0xf4a900, 0xffca32, 0xe99b00, 0xffc327, 0xe69a00, 0xffbd1c].map((color) => new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.28,
    metalness: 0.06,
    clearcoat: 0.82,
    clearcoatRoughness: 0.2
  }));
  barrelFacets.push(yellowLacquer, yellowLacquer);
  const barrelRadius = 0.4;
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(barrelRadius, barrelRadius, barrelEnd - barrelStart, 6, 1, false),
    barrelFacets
  );
  barrel.rotation.z = -Math.PI / 2;
  barrel.position.set((barrelStart + barrelEnd) / 2, 0, 0);
  barrel.castShadow = true;
  barrel.receiveShadow = true;
  group.add(barrel);

  const facetEdges = [];
  const edgeRadius = 0.405;
  for (let side = 0; side < 6; side += 1) {
    const angle = (side / 6) * Math.PI * 2;
    const y = -Math.cos(angle) * edgeRadius;
    const z = Math.sin(angle) * edgeRadius;
    facetEdges.push(new THREE.Vector3(barrelStart, y, z), new THREE.Vector3(barrelEnd, y, z));
  }
  const facetOutline = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(facetEdges),
    new THREE.LineBasicMaterial({ color: 0x9d6800, transparent: true, opacity: 0.48 })
  );
  group.add(facetOutline);

  const paintedFlute = new THREE.Mesh(
    new THREE.BoxGeometry(13.7, 0.012, 0.026),
    lacquerHighlight
  );
  paintedFlute.position.set(8.25, 0.257, 0.15);
  group.add(paintedFlute);

  const woodPoint = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.38, 1.22, 6, 1, false),
    wood
  );
  woodPoint.rotation.z = Math.PI / 2;
  woodPoint.position.x = 0.61;
  woodPoint.castShadow = true;
  group.add(woodPoint);

  const lead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.055, 0.34, 8, 1, false),
    graphite
  );
  lead.rotation.z = Math.PI / 2;
  lead.position.x = 0.17;
  lead.castShadow = true;
  group.add(lead);

  const ferrule = cylinderAlongX(0.38, 0.38, 0.88, ferruleMaterial);
  ferrule.position.x = 17.37;
  group.add(ferrule);
  for (const x of [17.06, 17.25, 17.47, 17.68]) {
    const groove = cylinderAlongX(0.39, 0.39, 0.045, ferruleGroove);
    groove.position.x = x;
    group.add(groove);
  }

  // Keep the eraser as a short barrel along the pencil, rather than a sphere-like capsule.
  const eraser = cylinderAlongX(0.34, 0.34, 0.62, eraserMaterial, 24);
  eraser.position.x = 18.1;
  group.add(eraser);

  const imprintCanvas = document.createElement("canvas");
  imprintCanvas.width = 256;
  imprintCanvas.height = 64;
  const imprintContext = imprintCanvas.getContext("2d");
  imprintContext.fillStyle = "#775316";
  imprintContext.font = "700 34px Georgia, serif";
  imprintContext.textAlign = "center";
  imprintContext.textBaseline = "middle";
  imprintContext.fillText("HB", 128, 32);
  const imprintTexture = new THREE.CanvasTexture(imprintCanvas);
  imprintTexture.colorSpace = THREE.SRGBColorSpace;
  const imprint = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.14),
    new THREE.MeshBasicMaterial({ map: imprintTexture, transparent: true, side: THREE.DoubleSide })
  );
  imprint.position.set(14.3, 0, 0.355);
  group.add(imprint);

  return group;
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
  renderer.toneMappingExposure = 0.94;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  try {
    magnifierRenderer = new THREE.WebGLRenderer({
      canvas: magnifierCanvas,
      alpha: false,
      antialias: true,
      powerPreference: "low-power"
    });
    magnifierRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    magnifierRenderer.outputColorSpace = THREE.SRGBColorSpace;
    magnifierRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    magnifierRenderer.toneMappingExposure = 0.94;
    magnifierRenderer.setClearColor(0xfffefa, 1);
  } catch (error) {
    document.querySelector(".parallax-magnifier").hidden = true;
    console.warn("無法啟動刻度放大窗", error);
  }

  try {
    correctionRenderer = new THREE.WebGLRenderer({
      canvas: correctionCanvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power"
    });
    correctionRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    correctionRenderer.outputColorSpace = THREE.SRGBColorSpace;
    correctionRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    correctionRenderer.toneMappingExposure = 0.94;
    correctionRenderer.setClearColor(0x000000, 0);
    correctionRenderer.shadowMap.enabled = true;
    correctionRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    correctionMagnifierRenderer = new THREE.WebGLRenderer({
      canvas: correctionMagnifierCanvas,
      alpha: false,
      antialias: true,
      powerPreference: "low-power"
    });
    correctionMagnifierRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    correctionMagnifierRenderer.outputColorSpace = THREE.SRGBColorSpace;
    correctionMagnifierRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    correctionMagnifierRenderer.toneMappingExposure = 0.94;
    correctionMagnifierRenderer.setClearColor(0xfffefa, 1);
  } catch (error) {
    correctionCanvas.hidden = true;
    document.querySelector("#correction-parallax-fallback").hidden = false;
    console.warn("無法啟動第七區塊的 3D 場景", error);
  }

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  pmrem.dispose();

  const keyLight = new THREE.DirectionalLight(0xfff2d7, 3.1);
  keyLight.position.set(-7, 13, 9);
  keyLight.target.position.set(rulerLength / 2, 0, 0);
  scene.add(keyLight.target);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -18;
  keyLight.shadow.camera.right = 18;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -10;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xd7e8ff, 1.5);
  fillLight.position.set(12, 7, -6);
  scene.add(fillLight);
  scene.add(new THREE.HemisphereLight(0xfff8e9, 0x5b503e, 1.55));

  const shadowSurface = new THREE.Mesh(
    new THREE.PlaneGeometry(rulerLength + 4, 6),
    new THREE.ShadowMaterial({ color: 0x473619, opacity: 0.18 })
  );
  shadowSurface.rotation.x = -Math.PI / 2;
  shadowSurface.position.set(rulerLength / 2, -0.207, 0);
  shadowSurface.receiveShadow = true;
  scene.add(shadowSurface);

  rulerModel = createRuler();
  scene.add(rulerModel);
  if (magnifierRenderer) {
    magnifierLabels.name = "ruler-magnifier-labels";
    for (const centimeter of [18, 19]) {
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeTextTexture(String(centimeter)), transparent: true, depthTest: false, depthWrite: false }));
      label.scale.set(0.56, 0.3, 1);
      label.position.set(centimeter, 0.27, 0.34);
      label.renderOrder = 6;
      magnifierLabels.add(label);
    }
    scene.add(magnifierLabels);
  }
  pencil = createPencil();
  scene.add(pencil);

  projectionRay = createProjectionGuide();
  scene.add(projectionRay);
  landingRing = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.3, 28),
    new THREE.MeshBasicMaterial({ color: 0xc45a2b, side: THREE.DoubleSide, depthWrite: false })
  );
  landingRing.name = "measurement-landing-ring";
  landingRing.rotation.x = -Math.PI / 2;
  landingRing.position.y = 0.255;
  landingRing.renderOrder = 5;
  scene.add(landingRing);

  correctionScene = scene.clone(true);
  correctionRulerModel = correctionScene.getObjectByName(rulerModel.name);
  correctionPencil = correctionScene.getObjectByName(pencil.name);
  correctionProjectionRay = correctionScene.getObjectByName(projectionRay.name);
  correctionLandingRing = correctionScene.getObjectByName(landingRing.name);
  correctionMagnifierLabels = correctionScene.getObjectByName(magnifierLabels.name);
  correctionMagnifierLabels.visible = false;

  modelReady = true;
  announce("三維鉛筆與直尺已載入。可拖曳畫面旋轉觀察。");
  window.dispatchEvent(new Event("pencil3d-ready"));
} catch (error) {
  modelFailed = true;
  canvas.hidden = true;
  announce("此瀏覽器無法啟動 3D 鉛筆模型。請使用支援 WebGL 的瀏覽器。");
  console.error("三維鉛筆與直尺場景初始化失敗", error);
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
  const center = new THREE.Vector3(view.start + rulerLength / 2, view.centerY, 0);
  const target = new THREE.Vector3(view.lookAtX, view.lookAtY, view.lookAtZ);
  const horizontal = view.orbitRadius * Math.cos(view.pitch);
  camera.position.set(
    center.x + horizontal * Math.sin(view.yaw),
    center.y + view.orbitRadius * Math.sin(view.pitch),
    center.z + horizontal * Math.cos(view.yaw)
  );
  camera.lookAt(target);

  pencil.position.set(view.start, view.centerY, view.centerZ);
  if (view.rayStart && view.rayEnd) {
    const guideStart = {
      x: view.rayStart.x + (view.rayEnd.x - view.rayStart.x) * 0.04,
      y: view.rayStart.y + (view.rayEnd.y - view.rayStart.y) * 0.04,
      z: view.rayStart.z + (view.rayEnd.z - view.rayStart.z) * 0.04
    };
    updateProjectionGuide(projectionRay,
      guideStart,
      { x: view.rayEnd.x, y: view.rayEnd.y + 0.01, z: view.rayEnd.z });
    landingRing.position.set(view.rayEnd.x, 0.255, view.rayEnd.z);
    projectionRay.visible = true;
    landingRing.visible = true;
  } else {
    projectionRay.visible = false;
    landingRing.visible = false;
  }
  renderer.render(scene, camera);
  if (magnifierRenderer && sceneCanvas.parentElement.dataset.magnifier === "true") {
    const rect = magnifierCanvas.getBoundingClientRect();
    if (rect.width && rect.height) {
      const size = `${Math.round(rect.width)}:${Math.round(rect.height)}:${window.devicePixelRatio || 1}`;
      if (magnifierCanvas.dataset.size !== size) {
        magnifierCanvas.dataset.size = size;
        magnifierRenderer.setSize(Math.round(rect.width), Math.round(rect.height), false);
      }
      const magnifierTarget = new THREE.Vector3(
        view.rayStart && view.rayEnd ? (view.rayStart.x + view.rayEnd.x) / 2 : view.start + 18.5,
        view.rayStart ? (view.rayStart.y + 0.22) / 2 : 0.3,
        view.rayStart ? (view.rayStart.z + 0.95) / 2 : -0.16
      );
      setMagnifierCrop(magnifierCamera, camera, magnifierTarget, rect);
      const majorLabels = rulerModel.children.filter((child) => child.userData.rulerMajorNumber);
      for (const label of majorLabels) label.visible = false;
      magnifierLabels.visible = true;
      const ringScale = landingRing.scale.clone();
      const ringWasVisible = landingRing.visible;
      landingRing.scale.setScalar(0.18);
      landingRing.visible = false;
      magnifierRenderer.render(scene, magnifierCamera);
      magnifierLabels.visible = false;
      landingRing.scale.copy(ringScale);
      landingRing.visible = ringWasVisible;
      for (const label of majorLabels) label.visible = true;
    }
  }

  const panelRect = sceneCanvas.parentElement.getBoundingClientRect();
  const canvasRect = sceneCanvas.getBoundingClientRect();
  const projectToPanel = (x, y, z) => {
    const point = new THREE.Vector3(x, y, z).project(camera);
    return {
      x: canvasRect.left - panelRect.left + (point.x + 1) * canvasRect.width / 2,
      y: canvasRect.top - panelRect.top + (1 - point.y) * canvasRect.height / 2
    };
  };
  window.dispatchEvent(new CustomEvent("pencil3d-projection", {
    detail: {
      sceneId: "parallax-scene",
      ruler18: projectToPanel(18, 0.23, 0.34),
      ruler19: projectToPanel(19, 0.23, 0.34),
      pencilTip: projectToPanel(view.start + view.edge, view.centerY, view.centerZ),
      projectedReading: view.rayEnd?.x ?? view.edge
    }
  }));
}

function renderCorrection() {
  if (!correctionRenderer || !modelReady || modelFailed) return;
  const rect = correctionCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const frame = `${Math.round(rect.width)}:${Math.round(rect.height)}:${window.devicePixelRatio || 1}`;
  if (correctionCanvas.dataset.size !== frame) {
    correctionCanvas.dataset.size = frame;
    correctionRenderer.setSize(Math.round(rect.width), Math.round(rect.height), false);
  }
  correctionCamera.fov = 2 * Math.atan(1 / (2 * correctionView.focalLengthRatio)) * 180 / Math.PI;
  correctionCamera.aspect = rect.width / rect.height;
  correctionCamera.updateProjectionMatrix();
  const center = new THREE.Vector3(correctionView.start + rulerLength / 2, correctionView.centerY, 0);
  const target = new THREE.Vector3(correctionView.lookAtX, correctionView.lookAtY, correctionView.lookAtZ);
  const horizontal = correctionView.orbitRadius * Math.cos(correctionView.pitch);
  correctionCamera.position.set(
    center.x + horizontal * Math.sin(correctionView.yaw),
    center.y + correctionView.orbitRadius * Math.sin(correctionView.pitch),
    center.z + horizontal * Math.cos(correctionView.yaw)
  );
  correctionCamera.lookAt(target);
  correctionRulerModel.position.x = correctionView.rulerOffset;
  correctionMagnifierLabels.position.x = correctionView.rulerOffset;
  correctionRulerModel.traverse((object) => {
    if (object.userData.rulerTick !== undefined) object.visible = object.userData.rulerTick % correctionView.tickInterval === 0;
    if (object.userData.rulerFarTick !== undefined) object.visible = object.userData.rulerFarTick % correctionView.tickInterval === 0;
  });
  correctionPencil.position.set(correctionView.start, correctionView.centerY, correctionView.centerZ);
  if (correctionView.rayStart && correctionView.rayEnd) {
    const guideStart = {
      x: correctionView.rayStart.x + (correctionView.rayEnd.x - correctionView.rayStart.x) * 0.04,
      y: correctionView.rayStart.y + (correctionView.rayEnd.y - correctionView.rayStart.y) * 0.04,
      z: correctionView.rayStart.z + (correctionView.rayEnd.z - correctionView.rayStart.z) * 0.04
    };
    updateProjectionGuide(correctionProjectionRay,
      guideStart,
      { x: correctionView.rayEnd.x, y: correctionView.rayEnd.y + 0.01, z: correctionView.rayEnd.z });
    correctionLandingRing.position.set(correctionView.rayEnd.x, 0.255, correctionView.rayEnd.z);
    correctionProjectionRay.visible = true;
    correctionLandingRing.visible = true;
  } else {
    correctionProjectionRay.visible = false;
    correctionLandingRing.visible = false;
  }
  correctionRenderer.render(correctionScene, correctionCamera);
  if (correctionMagnifierRenderer && correctionSceneCanvas.dataset.magnifier === "true") {
    const inset = correctionMagnifierCanvas.getBoundingClientRect();
    if (inset.width && inset.height) {
      const size = `${Math.round(inset.width)}:${Math.round(inset.height)}:${window.devicePixelRatio || 1}`;
      if (correctionMagnifierCanvas.dataset.size !== size) {
        correctionMagnifierCanvas.dataset.size = size;
        correctionMagnifierRenderer.setSize(Math.round(inset.width), Math.round(inset.height), false);
      }
      const magnifierTarget = new THREE.Vector3(
        correctionView.magnifierTargetX ?? (correctionView.rayStart && correctionView.rayEnd
          ? (correctionView.rayStart.x + correctionView.rayEnd.x) / 2
          : correctionView.start + correctionView.rulerOffset + 18.5),
        correctionView.rayStart ? (correctionView.rayStart.y + 0.22) / 2 : 0.3,
        correctionView.rayStart ? (correctionView.rayStart.z + 0.95) / 2 : -0.16
      );
      setMagnifierCrop(correctionMagnifierCamera, correctionCamera, magnifierTarget, inset);
      const majorLabels = correctionRulerModel.children.filter((child) => child.userData.rulerMajorNumber);
      const showEndpointLabels = correctionView.magnifierMode !== "origin";
      for (const label of majorLabels) label.visible = !showEndpointLabels;
      correctionMagnifierLabels.visible = showEndpointLabels;
      const ringWasVisible = correctionLandingRing.visible;
      correctionLandingRing.visible = false;
      correctionMagnifierRenderer.render(correctionScene, correctionMagnifierCamera);
      correctionMagnifierLabels.visible = false;
      correctionLandingRing.visible = ringWasVisible;
      for (const label of majorLabels) label.visible = true;
    }
  }
}

window.setPencil3DView = (nextView = {}) => {
  Object.assign(view, nextView);
  render();
};

window.setPencil3DCorrectionView = (nextView = {}) => {
  Object.assign(correctionView, nextView);
  renderCorrection();
};

window.getPencil3DCorrectionDragTarget = (clientX, clientY) => {
  if (!correctionRenderer || !modelReady || modelFailed || !correctionPencil || !correctionRulerModel) return null;
  const rect = correctionCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
  correctionInteractionPointer.set(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  );
  correctionScene.updateMatrixWorld(true);
  correctionCamera.updateMatrixWorld(true);
  correctionInteractionRaycaster.setFromCamera(correctionInteractionPointer, correctionCamera);
  const pencilHit = correctionInteractionRaycaster.intersectObject(correctionPencil, true)[0];
  const rulerHit = correctionInteractionRaycaster.intersectObject(correctionRulerModel, true)[0];
  if (!pencilHit && !rulerHit) return null;
  return pencilHit && (!rulerHit || pencilHit.distance < rulerHit.distance) ? "pencil" : "ruler";
};

new ResizeObserver(resizeRenderer).observe(sceneCanvas);
window.addEventListener("resize", resizeRenderer, { passive: true });
resizeRenderer();
new ResizeObserver(renderCorrection).observe(correctionCanvas);
window.addEventListener("resize", renderCorrection, { passive: true });
renderCorrection();
