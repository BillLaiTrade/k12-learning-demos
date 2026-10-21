import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.querySelector("#pencil-3d-canvas");
const sceneCanvas = document.querySelector("#parallax-canvas");
const magnifierCanvas = document.querySelector("#parallax-magnifier-canvas");
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
const magnifierCamera = new THREE.PerspectiveCamera(11, 1, 0.1, 80);
let rulerModel;
let pencil;
let projectionRay;
let landingMarker;
let landingRing;
let modelReady = false;
let modelFailed = false;
let lastFrame = "";
const view = {
  edge: 18.4,
  start: 0,
  yaw: 0,
  pitch: 0.48,
  orbitRadius: 24,
  centerY: 0.78,
  centerZ: -1.3,
  lookAtX: 9.2,
  lookAtY: 0.04,
  lookAtZ: 0,
  focalLengthRatio: 2.5,
  rayStart: null,
  rayEnd: null
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
  const body = new THREE.Mesh(roundedRulerGeometry(rulerLength + 0.6, 3.2, 0.4, 0.16), [bodyMaterial, rulerSideMaterial]);
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
    const tickLength = major ? 0.84 : 0.56;
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.014, tickLength),
      scaleInk
    );
    tick.position.set(centimeter, 0.211, 1.5 - tickLength / 2);
    tick.castShadow = false;
    tick.receiveShadow = true;
    group.add(tick);

    // The opposite edge has a second graduation row, like a marked ruler edge.
    const farTickLength = major ? 0.44 : 0.28;
    const farTick = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.014, farTickLength),
      scaleInk
    );
    farTick.position.set(centimeter, 0.211, -1.5 + farTickLength / 2);
    farTick.castShadow = false;
    farTick.receiveShadow = true;
    group.add(farTick);
  }

  for (let centimeter = 0; centimeter <= rulerLength; centimeter += 5) {
    const number = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 1.2),
      new THREE.MeshBasicMaterial({
        map: makeTextTexture(String(centimeter)),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    number.rotation.x = -Math.PI / 2;
    const labelX = centimeter === 0 ? 0.32 : centimeter === rulerLength ? rulerLength - 0.32 : centimeter;
    number.position.set(labelX, 0.21, 0.02);
    number.renderOrder = 2;
    number.userData.rulerMajorNumber = true;
    group.add(number);
  }

  const sideStripe = standardMaterial(0xb18b48, { metalness: 0.35, roughness: 0.3 });
  for (const z of [-1.51, 1.51]) {
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

  const eraser = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.02, 5, 24), eraserMaterial);
  eraser.rotation.z = -Math.PI / 2;
  eraser.scale.y = 0.81;
  eraser.position.x = 18.1;
  eraser.castShadow = true;
  eraser.receiveShadow = true;
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
  // Keep the magnified edge unnumbered, like the opposite physical edge of the ruler.
  pencil = createPencil();
  scene.add(pencil);

  projectionRay = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineDashedMaterial({ color: 0xc45a2b, dashSize: 0.16, gapSize: 0.1, linewidth: 1.5 })
  );
  projectionRay.renderOrder = 3;
  scene.add(projectionRay);
  landingMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 20, 14),
    new THREE.MeshStandardMaterial({ color: 0xc45a2b, roughness: 0.38, emissive: 0x491708, emissiveIntensity: 0.25 })
  );
  landingMarker.position.y = 0.28;
  landingMarker.renderOrder = 4;
  scene.add(landingMarker);
  landingRing = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.3, 28),
    new THREE.MeshBasicMaterial({ color: 0xc45a2b, side: THREE.DoubleSide, depthWrite: false })
  );
  landingRing.rotation.x = -Math.PI / 2;
  landingRing.position.y = 0.255;
  landingRing.renderOrder = 5;
  scene.add(landingRing);

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
    projectionRay.geometry.setFromPoints([
      new THREE.Vector3(view.rayEnd.x, view.centerY, view.rayEnd.z),
      new THREE.Vector3(view.rayEnd.x, view.rayEnd.y, view.rayEnd.z)
    ]);
    projectionRay.computeLineDistances();
    landingMarker.position.set(view.rayEnd.x, 0.28, view.rayEnd.z);
    landingRing.position.set(view.rayEnd.x, 0.255, view.rayEnd.z);
    projectionRay.visible = true;
    landingMarker.visible = true;
    landingRing.visible = true;
  } else {
    projectionRay.visible = false;
    landingMarker.visible = false;
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
      magnifierCamera.aspect = rect.width / rect.height;
      magnifierCamera.updateProjectionMatrix();
      const magnifierTarget = new THREE.Vector3(view.start + 18.5, 0.22, -1.48);
      const viewDirection = camera.position.clone().sub(target).normalize();
      viewDirection.z = -Math.abs(viewDirection.z);
      viewDirection.y = Math.max(viewDirection.y, 2.5);
      viewDirection.normalize();
      magnifierCamera.position.copy(magnifierTarget).addScaledVector(viewDirection, 7.2);
      magnifierCamera.lookAt(magnifierTarget);
      const majorLabels = rulerModel.children.filter((child) => child.userData.rulerMajorNumber);
      for (const label of majorLabels) label.visible = false;
      const markerScale = landingMarker.scale.clone();
      const ringScale = landingRing.scale.clone();
      landingMarker.scale.setScalar(0.3);
      landingRing.scale.setScalar(0.45);
      magnifierRenderer.render(scene, magnifierCamera);
      landingMarker.scale.copy(markerScale);
      landingRing.scale.copy(ringScale);
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
      ruler18: projectToPanel(18, 0.23, -1.3),
      ruler19: projectToPanel(19, 0.23, -1.3),
      pencilTip: projectToPanel(view.start + view.edge, view.centerY, view.centerZ),
      projectedReading: view.rayEnd?.x ?? view.edge
    }
  }));
}

window.setPencil3DView = (nextView = {}) => {
  Object.assign(view, nextView);
  render();
};

new ResizeObserver(resizeRenderer).observe(sceneCanvas);
window.addEventListener("resize", resizeRenderer, { passive: true });
resizeRenderer();
