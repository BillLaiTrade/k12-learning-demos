import * as THREE from '../../3.1/assets/vendor/three/build/three.module.js';
import { makeMeteoriteMesh, makeStone } from './stone-observer.js?v=meteorite-20261023-6';

const MASS_G = 910;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function stoneSupportPoint(stone) {
  stone.updateMatrix();
  const vertices = stone.geometry.attributes.position;
  const point = new THREE.Vector3();
  let minY = Infinity;
  for (let index = 0; index < vertices.count; index += 1) {
    point.fromBufferAttribute(vertices, index).applyMatrix4(stone.matrix);
    minY = Math.min(minY, point.y);
  }
  const support = new THREE.Vector3();
  let count = 0;
  for (let index = 0; index < vertices.count; index += 1) {
    point.fromBufferAttribute(vertices, index).applyMatrix4(stone.matrix);
    if (Math.abs(point.y - minY) < 1e-5) {
      support.x += point.x;
      support.z += point.z;
      count += 1;
    }
  }
  support.set(support.x / count, minY, support.z / count);
  return support;
}

function makeRestingStone(stone = makeStone()) {
  const vertices = stone.geometry.attributes.position;
  let minY = Infinity, maxY = -Infinity;
  for (let index = 0; index < vertices.count; index += 1) {
    minY = Math.min(minY, vertices.getY(index));
    maxY = Math.max(maxY, vertices.getY(index));
  }
  const contactY = minY + (maxY - minY) * 0.015;
  for (let index = 0; index < vertices.count; index += 1) {
    vertices.setY(index, Math.max(vertices.getY(index), contactY));
  }
  vertices.needsUpdate = true;
  stone.geometry.computeVertexNormals();
  stone.geometry.computeBoundingSphere();
  return stone;
}

function labelTexture(text, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = options.width || 256;
  canvas.height = options.height || 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.fillStyle = options.color || '#25352d';
  ctx.font = `700 ${options.fontSize || 48}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function contactShadow(width, depth) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 5, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(32, 38, 33, .42)');
  gradient.addColorStop(0.55, 'rgba(32, 38, 33, .2)');
  gradient.addColorStop(1, 'rgba(32, 38, 33, 0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.renderOrder = 3;
  return shadow;
}

function makeWeight(value) {
  const sizes = { 500: [0.205, 0.19], 200: [0.19, 0.18], 100: [0.175, 0.17], 50: [0.16, 0.155], 10: [0.16, 0.155] };
  const [radius, height] = sizes[value];
  const group = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: 0xc99a45, metalness: 0.72, roughness: 0.3 });
  const edge = new THREE.MeshStandardMaterial({ color: 0xe1bb6d, metalness: 0.76, roughness: 0.25 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.91, radius, height, 48, 1), brass);
  body.position.y = height * 0.5;
  group.add(body);
  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.82, radius * 0.91, 0.035, 48), edge);
  shoulder.position.y = height * 0.79;
  group.add(shoulder);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.48, radius * 0.53, 0.055, 40), edge);
  crown.position.y = height + 0.028;
  group.add(crown);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.18, radius * 0.26, 0.12, 20), brass);
  knob.position.y = height + 0.11;
  group.add(knob);
  const markHeight = Math.min(0.15, height * 0.9);
  const markCenterY = height * 0.54;
  const markRadius = radius * (1 - 0.09 * (markCenterY / height) + 0.006);
  const markSegments = 40;
  const markAngle = 1.12;
  const markGeometry = new THREE.BufferGeometry();
  const markPositions = [];
  const markUvs = [];
  const markIndices = [];
  for (let row = 0; row <= 1; row += 1) {
    for (let column = 0; column <= markSegments; column += 1) {
      const angle = -markAngle + (column / markSegments) * markAngle * 2;
      markPositions.push(Math.sin(angle) * markRadius, markCenterY + (row - 0.5) * markHeight, Math.cos(angle) * markRadius);
      markUvs.push(column / markSegments, row);
    }
  }
  for (let column = 0; column < markSegments; column += 1) {
    const lowerLeft = column, lowerRight = column + 1;
    const upperLeft = markSegments + 1 + column, upperRight = upperLeft + 1;
    markIndices.push(lowerLeft, lowerRight, upperLeft, lowerRight, upperRight, upperLeft);
  }
  markGeometry.setAttribute('position', new THREE.Float32BufferAttribute(markPositions, 3));
  markGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(markUvs, 2));
  markGeometry.setIndex(markIndices);
  const inscription = new THREE.Mesh(
    markGeometry,
    new THREE.MeshBasicMaterial({ map: labelTexture(`${value} g`, { width: 512, height: 160, fontSize: 190, color: '#211708' }), transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })
  );
  group.add(inscription);
  return group;
}

function makeWeightTray(scene, materials) {
  const tray = new THREE.Group();
  tray.position.set(1.4, 0, 1.08);
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.14, 0.72), materials.base);
  base.position.y = 0.07;
  tray.add(base);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(2.84, 0.035, 0.68), materials.trim);
  rim.position.y = 0.155;
  tray.add(rim);
  const inset = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.035, 0.54), materials.pan);
  inset.position.y = 0.177;
  tray.add(inset);
  const values = [500, 200, 100, 50, 10];
  const spacing = 0.52;
  const weights = values.map((value, index) => {
    const weight = makeWeight(value);
    const x = (index - (values.length - 1) / 2) * spacing;
    weight.position.set(x, 0.2, 0);
    tray.add(weight);
    return { value, model: weight, position: weight.position.clone(), quaternion: weight.quaternion.clone(), scale: weight.scale.clone() };
  });
  scene.add(tray);
  return { tray, weights };
}

function makePan(x, materials) {
  const group = new THREE.Group();
  group.position.x = x;
  const rods = [-0.43, 0.43].flatMap(dx => [-0.27, 0.27].map(dz => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.64, 12), materials.steel);
    rod.position.set(dx, -0.36, dz);
    return rod;
  }));
  rods.forEach(rod => group.add(rod));
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.77, 0.7, 0.09, 64, 1, false), materials.pan);
  plate.position.y = -0.69;
  group.add(plate);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.026, 12, 64), materials.trim);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.63;
  group.add(rim);
  return group;
}

function makeBalance(scene, materials, stoneModel) {
  const base = new THREE.Group();
  const foot = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.16, 1.18), materials.base);
  foot.position.y = 0.08;
  base.add(foot);
  for (const x of [-1.8, -0.9, 0, 0.9, 1.8]) {
    const inlay = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.006, 0.94), materials.inlay);
    inlay.position.set(x, 0.164, 0);
    base.add(inlay);
  }
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.48, 0.2, 48), materials.trim);
  plinth.position.y = 0.25;
  base.add(plinth);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.16, 1.15, 32), materials.steel);
  column.position.y = 0.91;
  base.add(column);
  const postCollar = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.028, 14, 40), materials.trim);
  postCollar.rotation.x = Math.PI / 2;
  postCollar.position.y = 1.46;
  base.add(postCollar);

  const beamPivot = new THREE.Group();
  beamPivot.position.set(0, 1.55, 0);
  scene.add(beamPivot);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.12, 0.22), materials.beam);
  beamPivot.add(beam);
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(4.55, 0.025, 0.245), materials.trim);
  topRail.position.y = 0.073;
  beamPivot.add(topRail);
  const centerHub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.26, 48), materials.trim);
  centerHub.rotation.x = Math.PI / 2;
  beamPivot.add(centerHub);
  const indicator = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.45, 0.07), materials.indicator);
  indicator.position.set(0, 0.27, 0.1);
  beamPivot.add(indicator);
  const scaleArc = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.018, 10, 64, Math.PI), materials.steel);
  scaleArc.position.set(0, 1.91, 0.09);
  scene.add(scaleArc);

  const leftPan = makePan(-1.82, materials);
  const rightPan = makePan(1.82, materials);
  beamPivot.add(leftPan, rightPan);
  const stone = makeRestingStone(stoneModel);
  stone.scale.setScalar(0.43);
  stone.rotation.set(0, -0.44, 0);
  const support = stoneSupportPoint(stone);
  // Rest the stone's flat natural contact patch directly on the pan.
  const stoneRestY = -0.643 - support.y;
  const sourcePosition = new THREE.Vector3(-2.2, -support.y + 0.02, 1.05);
  stone.position.copy(sourcePosition);
  scene.add(stone);
  const panShadow = contactShadow(1.35, 0.9);
  panShadow.position.set(support.x, -0.638, support.z);
  panShadow.visible = false;
  leftPan.add(panShadow);
  base.position.y = 0;
  scene.add(base);
  const rightPanShadow = contactShadow(1.35, 0.9);
  rightPanShadow.position.copy(panShadow.position);
  rightPanShadow.visible = false;
  rightPan.add(rightPanShadow);
  return { base, pivot: beamPivot, arc: scaleArc, leftPan, rightPan, stone, panShadow, rightPanShadow, stoneRestY, sourcePosition };
}

function makeDigitalScale(scene, materials, stoneModel) {
  const base = new THREE.Group();
  const housing = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.47, 1.72), materials.base);
  housing.position.y = 0.34;
  base.add(housing);
  const bevel = new THREE.Mesh(new THREE.BoxGeometry(2.84, 0.085, 1.82), materials.trim);
  bevel.position.y = 0.59;
  base.add(bevel);
  const platform = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.14, 1.51), materials.steel);
  platform.position.y = 0.68;
  base.add(platform);
  const topPanel = new THREE.Mesh(new THREE.BoxGeometry(2.43, 0.028, 1.42), materials.platform);
  topPanel.position.y = 0.762;
  base.add(topPanel);
  for (const x of [-1, 1]) for (const z of [-0.52, 0.52]) {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.12, 24), materials.rubber);
    foot.position.set(x, 0.06, z);
    base.add(foot);
  }
  const displayCanvas = document.createElement('canvas');
  displayCanvas.width = 512; displayCanvas.height = 192;
  const displayCtx = displayCanvas.getContext('2d');
  const displayTexture = new THREE.CanvasTexture(displayCanvas);
  displayTexture.colorSpace = THREE.SRGBColorSpace;
  const displayMat = new THREE.MeshBasicMaterial({ map: displayTexture });
  const display = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 0.46), displayMat);
  display.position.set(0, 0.39, 0.875);
  base.add(display);
  const unitCanvas = document.createElement('canvas');
  unitCanvas.width = 320; unitCanvas.height = 80;
  const unitCtx = unitCanvas.getContext('2d');
  const unitTexture = new THREE.CanvasTexture(unitCanvas);
  unitTexture.colorSpace = THREE.SRGBColorSpace;
  const unitLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.16), new THREE.MeshBasicMaterial({ map: unitTexture }));
  unitLabel.position.set(0, 0.67, 0.875);
  base.add(unitLabel);
  const tareButton = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.055, 32), materials.button);
  tareButton.rotation.x = Math.PI / 2;
  tareButton.position.set(0.88, 0.4, 0.88);
  base.add(tareButton);
  const tareLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.11), new THREE.MeshBasicMaterial({ map: labelTexture('ZERO', { background: '#d9e8df', color: '#31473b', fontSize: 26 }) }));
  tareLabel.position.set(0.88, 0.52, 0.89);
  base.add(tareLabel);

  const stone = makeRestingStone(stoneModel);
  stone.scale.setScalar(0.43);
  stone.rotation.set(0, -0.44, 0);
  const support = stoneSupportPoint(stone);
  // The stone settles into the top plate instead of appearing to hover on a single vertex.
  const restingY = 0.778 - support.y;
  const sourcePosition = new THREE.Vector3(-2.2, -support.y + 0.02, 1.05);
  stone.position.copy(sourcePosition);
  stone.visible = true;
  const shadow = contactShadow(1.72, 1.1);
  shadow.position.set(support.x, 0.779, support.z);
  shadow.visible = false;
  scene.add(base);
  scene.add(stone);
  scene.add(shadow);
  function updateDisplay(value, unit = 'g') {
    displayCtx.fillStyle = '#17201d';
    displayCtx.fillRect(0, 0, displayCanvas.width, displayCanvas.height);
    displayCtx.strokeStyle = '#536a5d'; displayCtx.lineWidth = 7;
    displayCtx.strokeRect(8, 8, displayCanvas.width - 16, displayCanvas.height - 16);
    displayCtx.fillStyle = '#b7e5c5';
    displayCtx.font = '600 116px ui-monospace, SFMono-Regular, monospace';
    displayCtx.textAlign = 'right'; displayCtx.textBaseline = 'middle';
    displayCtx.fillText(value, 390, 102);
    displayCtx.font = '600 48px sans-serif'; displayCtx.textAlign = 'left';
    displayCtx.fillText(unit, 414, 105);
    displayTexture.needsUpdate = true;
    unitCtx.fillStyle = '#26332f'; unitCtx.fillRect(0, 0, unitCanvas.width, unitCanvas.height);
    unitCtx.fillStyle = '#b9ddc5'; unitCtx.font = '700 36px sans-serif';
    unitCtx.textAlign = 'center'; unitCtx.textBaseline = 'middle';
    unitCtx.fillText(`質量・${unit}`, unitCanvas.width / 2, unitCanvas.height / 2);
    unitTexture.needsUpdate = true;
  }
  updateDisplay('0.0');
  return { base, stone, shadow, restingY, sourcePosition, updateDisplay };
}

export async function mountMassMeasurement() {
  const host = document.querySelector('#mass-instrument');
  const canvas = document.querySelector('#mass-instrument-canvas');
  if (!host || !canvas) return;
  let balanceStone, digitalStone;
  try {
    [balanceStone, digitalStone] = await Promise.all([makeMeteoriteMesh(), makeMeteoriteMesh()]);
  } catch {
    balanceStone = makeStone();
    digitalStone = makeStone();
  }
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#edf2eb');
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 60);
  camera.position.set(0.8, 3.25, 9.4);
  camera.lookAt(0, 1.05, 0);
  scene.add(new THREE.HemisphereLight(0xf8fbf5, 0x5d6259, 2));
  const key = new THREE.DirectionalLight(0xfff0d7, 3.2); key.position.set(-3, 7, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xd8e5ed, 1.7); fill.position.set(4, 2, -3); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.15); rim.position.set(0, 5, -5); scene.add(rim);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0xe8eee7, roughness: 0.94 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.025; scene.add(ground);
  const mat = {
    base: new THREE.MeshStandardMaterial({ color: 0x496f5b, metalness: 0.33, roughness: 0.4 }),
    beam: new THREE.MeshStandardMaterial({ color: 0x4c715e, metalness: 0.52, roughness: 0.32 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc6cfca, metalness: 0.76, roughness: 0.28 }),
    pan: new THREE.MeshStandardMaterial({ color: 0xe7ece8, metalness: 0.46, roughness: 0.33, side: THREE.DoubleSide }),
    trim: new THREE.MeshStandardMaterial({ color: 0xd4b86d, metalness: 0.74, roughness: 0.27 }),
    inlay: new THREE.MeshStandardMaterial({ color: 0xc9d6ca, metalness: 0.48, roughness: 0.3 }),
    indicator: new THREE.MeshStandardMaterial({ color: 0xbf6338, metalness: 0.2, roughness: 0.5 }),
    platform: new THREE.MeshStandardMaterial({ color: 0xb9c9bd, metalness: 0.16, roughness: 0.68 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x37443e, roughness: 0.93 }),
    button: new THREE.MeshStandardMaterial({ color: 0xc8d8cc, metalness: 0.25, roughness: 0.38 })
  };
  const balance = makeBalance(scene, mat, balanceStone);
  const digital = makeDigitalScale(scene, mat, digitalStone);
  const weightSource = makeWeightTray(scene, mat);
  const sourceWeightModels = weightSource.weights.map(item => item.model);
  const modeButtons = [...document.querySelectorAll('[data-mass-mode]')];
  const balancePanel = document.querySelector('#balance-controls');
  const digitalPanel = document.querySelector('#digital-controls');
  const status = document.querySelector('#mass-status');
  const balancePlaceButton = document.querySelector('#place-on-balance');
  const weightTray = document.querySelector('#weight-tray');
  const weightTotal = document.querySelector('#weight-total');
  const placeButton = document.querySelector('#place-on-scale');
  const removeButton = document.querySelector('#remove-from-scale');
  let mode = 'balance';
  let balancePlaced = false;
  let balanceSide = 'left';
  let placingBalance = false;
  let weights = [];
  let weightOrigins = [];
  let weightSides = [];
  const weightModels = [];
  let weighed = false;
  let placingDigital = false;
  let returningDigital = false;
  let returningBalance = false;
  let activeStoneDrag = null;
  const fallingItems = [];
  const digitalTargetPosition = digital.sourcePosition.clone();
  const balanceTargetPosition = balance.sourcePosition.clone();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const dragPlane = new THREE.Plane();
  const planeNormal = new THREE.Vector3();
  const planeHit = new THREE.Vector3();
  const dragOffset = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  let targetTilt = 0;
  let currentTilt = 0;
  let width = 0, height = 0;

  function showReading() {
    digital.updateDisplay(mode === 'digital' && weighed ? '910' : '0.0', 'g');
  }

  function clearWeightModels() {
    weightModels.forEach(weight => {
      weight.removeFromParent();
      weight.traverse(part => {
        if (!part.isMesh) return;
        part.geometry.dispose();
        const materials = Array.isArray(part.material) ? part.material : [part.material];
        materials.forEach(material => {
          material.map?.dispose();
          material.dispose();
        });
      });
    });
    weightModels.length = 0;
  }

  function drawWeights() {
    clearWeightModels();
    weightTray.replaceChildren();
    const sideCounts = { left: 0, right: 0 };
    weights.forEach((value, index) => {
      const weight = makeWeight(value);
      const side = weightSides[index] === 'left' ? 'left' : 'right';
      const localIndex = sideCounts[side]++;
      const col = localIndex % 3, row = Math.floor(localIndex / 3);
      weight.position.set((col - 1) * 0.35, -0.64 + row * 0.02, (row - 0.5) * 0.32);
      (side === 'left' ? balance.leftPan : balance.rightPan).add(weight);
      weightModels.push(weight);
      const tag = document.createElement('span');
      tag.className = 'weight-chip';
      tag.textContent = `${value} g`;
      weightTray.append(tag);
    });
    document.querySelectorAll('[data-weight]').forEach(button => { button.disabled = false; });
    const total = weights.reduce((sum, value) => sum + value, 0);
    weightTotal.textContent = `${total} g`;
    const leftWeight = weights.reduce((sum, value, index) => sum + (weightSides[index] === 'left' ? value : 0), 0);
    const rightWeight = weights.reduce((sum, value, index) => sum + (weightSides[index] === 'right' ? value : 0), 0);
    const leftMass = leftWeight + (balancePlaced && balanceSide === 'left' ? MASS_G : 0);
    const rightMass = rightWeight + (balancePlaced && balanceSide === 'right' ? MASS_G : 0);
    const difference = leftMass - rightMass;
    targetTilt = clamp(difference * 0.006, -0.18, 0.18);
    const balanced = leftMass === rightMass && leftMass > 0;
    status.textContent = balanced
      ? '已達平衡！兩側質量相等。'
      : balancePlaced || total > 0
        ? difference > 0
          ? '左側秤盤較重；可以調整兩側的物件，直到平衡。'
          : '右側秤盤較重；可以調整兩側的物件，直到平衡。'
        : placingBalance ? '隕石正移至秤盤…' : '把隕石或砝碼拖到任一秤盤上。';
    status.dataset.balanced = String(balanced);
    showReading();
  }

  function clearBalanceWeights() {
    weightOrigins.forEach(origin => { if (origin !== null) sourceWeightModels[origin].visible = true; });
    weights = [];
    weightOrigins = [];
    weightSides = [];
    drawWeights();
  }
  function resetBalance() {
    const stoneWasOnPan = balancePlaced || balance.stone.parent === balance.leftPan || balance.stone.parent === balance.rightPan;
    placingBalance = false;
    balancePlaced = false;
    balance.panShadow.visible = false;
    balance.rightPanShadow.visible = false;
    balance.stone.visible = mode === 'balance';
    if (stoneWasOnPan) {
      if (balance.stone.parent !== scene) detachPreservingWorldTransform(balance.stone);
      returningBalance = true;
    } else {
      returningBalance = false;
      balance.stone.removeFromParent();
      scene.add(balance.stone);
      balance.stone.position.copy(balance.sourcePosition);
    }
    balanceTargetPosition.copy(balance.sourcePosition);
    balancePlaceButton.disabled = false;
    balancePlaceButton.textContent = '將隕石放上左盤';
    clearBalanceWeights();
  }
  let suppressWeightClick = false;
  function addWeight(next, origin = null, side = 'right') {
    weights.push(next);
    weightOrigins.push(origin);
    weightSides.push(side);
    if (origin !== null) sourceWeightModels[origin].visible = false;
    drawWeights();
  }
  document.querySelectorAll('[data-weight]').forEach(button => {
    button.addEventListener('click', () => {
      if (suppressWeightClick) { suppressWeightClick = false; return; }
      const value = Number(button.dataset.weight);
      addWeight(value, null, 'right');
    });
    let start = null;
    let ghost = null;
    button.addEventListener('pointerdown', event => {
      if (event.button !== undefined && event.button !== 0 || button.disabled) return;
      start = { id: event.pointerId, x: event.clientX, y: event.clientY, value: Number(button.dataset.weight), moved: false };
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointermove', event => {
      if (!start || start.id !== event.pointerId) return;
      if (!start.moved && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) {
        start.moved = true;
        ghost = document.createElement('div');
        ghost.className = 'weight-drag-preview';
        ghost.setAttribute('aria-hidden', 'true');
        ghost.innerHTML = `<svg viewBox="0 0 96 112" role="presentation"><defs><linearGradient id="dragWeightGold" x1="0" x2="1"><stop offset="0" stop-color="#9b6d22"/><stop offset=".38" stop-color="#f3d98e"/><stop offset=".68" stop-color="#c99a45"/><stop offset="1" stop-color="#8a6020"/></linearGradient><linearGradient id="dragWeightTop" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f6dfa1"/><stop offset="1" stop-color="#a8792e"/></linearGradient></defs><ellipse cx="48" cy="101" rx="29" ry="5" fill="#26342c" opacity=".18"/><path d="M43 9 Q48 6 53 9 L55 28 L41 28 Z" fill="url(#dragWeightGold)" stroke="#8c6328" stroke-width="1.5"/><ellipse cx="48" cy="28" rx="15" ry="5" fill="url(#dragWeightTop)" stroke="#8c6328" stroke-width="1.5"/><path d="M23 36 Q24 30 48 30 Q72 30 73 36 L70 82 Q69 91 48 93 Q27 91 26 82 Z" fill="url(#dragWeightGold)" stroke="#8c6328" stroke-width="1.8"/><ellipse cx="48" cy="36" rx="25" ry="7" fill="url(#dragWeightTop)" stroke="#8c6328" stroke-width="1.6"/><path d="M25 43 Q48 49 71 43" fill="none" stroke="#f5dc9a" stroke-width="2" opacity=".8"/><text x="48" y="68" text-anchor="middle" dominant-baseline="middle" fill="#38250c" font-family="sans-serif" font-size="14" font-weight="800">${start.value} g</text></svg>`;
        document.body.append(ghost);
        suppressWeightClick = true;
      }
      if (ghost) {
        ghost.style.left = `${event.clientX}px`;
        ghost.style.top = `${event.clientY}px`;
      }
    });
    const finishWeightDrag = event => {
      if (!start || start.id !== event.pointerId) return;
      const drag = start;
      start = null;
      if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
      ghost?.remove(); ghost = null;
      const side = balanceDropSide(event);
      if (drag.moved && mode === 'balance' && side) addWeight(drag.value, null, side);
      if (drag.moved) window.setTimeout(() => { suppressWeightClick = false; }, 0);
    };
    button.addEventListener('pointerup', finishWeightDrag);
    button.addEventListener('pointercancel', finishWeightDrag);
  });
  document.querySelector('#balance-undo').addEventListener('click', () => {
    weights.pop();
    const origin = weightOrigins.pop();
    weightSides.pop();
    if (origin !== null && origin !== undefined) sourceWeightModels[origin].visible = true;
    drawWeights();
  });
  document.querySelector('#balance-reset').addEventListener('click', resetBalance);
  function placeStoneOnBalance(side = 'left') {
    if (balancePlaced || placingBalance) return;
    returningBalance = false;
    balanceSide = side;
    placingBalance = true;
    const pan = side === 'left' ? balance.leftPan : balance.rightPan;
    balanceTargetPosition.copy(pan.localToWorld(new THREE.Vector3(0, balance.stoneRestY, 0)));
    balancePlaceButton.disabled = true;
    balancePlaceButton.textContent = '正在放上秤盤…';
    status.textContent = '隕石正移至秤盤…';
  }
  function settleBalanceStone() {
    placingBalance = false;
    balancePlaced = true;
    balance.stone.removeFromParent();
    const pan = balanceSide === 'left' ? balance.leftPan : balance.rightPan;
    pan.add(balance.stone);
    balance.stone.position.set(0, balance.stoneRestY, 0);
    balance.panShadow.visible = balanceSide === 'left';
    balance.rightPanShadow.visible = balanceSide === 'right';
    balancePlaceButton.textContent = `隕石已放上${balanceSide === 'left' ? '左' : '右'}盤`;
    drawWeights();
  }
  balancePlaceButton.addEventListener('click', () => placeStoneOnBalance('left'));

  function setMode(nextMode) {
    mode = nextMode;
    modeButtons.forEach(button => {
      const active = button.dataset.massMode === mode;
      button.setAttribute('aria-pressed', String(active));
    });
    balancePanel.hidden = mode !== 'balance';
    digitalPanel.hidden = mode !== 'digital';
    balance.pivot.visible = mode === 'balance';
    balance.base.visible = mode === 'balance';
    balance.arc.visible = mode === 'balance';
    balance.leftPan.visible = mode === 'balance';
    balance.rightPan.visible = mode === 'balance';
    weightSource.tray.visible = mode === 'balance';
    digital.base.visible = mode === 'digital';
    digital.stone.visible = mode === 'digital';
      digital.shadow.visible = mode === 'digital' && weighed;
    if (mode === 'digital') {
      balance.panShadow.visible = false;
      balance.rightPanShadow.visible = false;
      balance.stone.visible = false;
      digital.stone.scale.setScalar(0.43);
      digital.stone.visible = true;
      if (!placingDigital && !returningDigital) {
        digital.stone.position.copy(weighed ? new THREE.Vector3(0, digital.restingY, 0) : digital.sourcePosition);
        digitalTargetPosition.copy(digital.stone.position);
      }
      placeButton.disabled = weighed || placingDigital;
      placeButton.textContent = weighed ? '隕石已放上秤盤' : placingDigital ? '正在放上秤盤…' : '將隕石放上秤盤';
      removeButton.disabled = !weighed || placingDigital;
      digital.updateDisplay(weighed ? '910' : '0.0', 'g');
      status.textContent = weighed
        ? '隕石已放穩；請讀取秤面上的數值。'
        : placingDigital ? '隕石正移至電子秤秤盤…' : '拖曳隕石到電子秤秤盤，或按下按鈕。';
    } else {
      digital.stone.visible = false;
      balance.stone.visible = true;
      balance.panShadow.visible = balancePlaced && balanceSide === 'left';
      balance.rightPanShadow.visible = balancePlaced && balanceSide === 'right';
      if (balancePlaced) {
        const pan = balanceSide === 'left' ? balance.leftPan : balance.rightPan;
        if (balance.stone.parent !== pan) pan.add(balance.stone);
        balance.stone.position.set(0, balance.stoneRestY, 0);
      } else if (!placingBalance && !returningBalance) {
        if (balance.stone.parent !== scene) scene.add(balance.stone);
        balance.stone.position.copy(balance.sourcePosition);
        balanceTargetPosition.copy(balance.sourcePosition);
      }
      balancePlaceButton.disabled = balancePlaced || placingBalance;
      balancePlaceButton.textContent = balancePlaced ? `隕石已放上${balanceSide === 'left' ? '左' : '右'}盤` : placingBalance ? '正在放上秤盤…' : '將隕石放上左盤';
      clearBalanceWeights();
    }
    showReading();
    camera.position.set(mode === 'balance' ? 0.8 : 3.1, mode === 'balance' ? 3.25 : 3.1, mode === 'balance' ? 9.4 : 8.2);
    camera.lookAt(0, mode === 'balance' ? 1.05 : 0.78, 0);
    document.querySelector('#mass-instrument').dataset.mode = mode;
  }
  modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.massMode)));

  function placeStoneOnDigitalScale() {
    if (weighed || placingDigital) return;
    returningDigital = false;
    placingDigital = true;
    digital.stone.visible = true;
    digitalTargetPosition.set(0, digital.restingY, 0);
    placeButton.disabled = true;
    placeButton.textContent = '正在放上秤盤…';
    removeButton.disabled = true;
    status.textContent = '隕石正移至電子秤秤盤…';
    status.dataset.balanced = 'false';
    showReading();
  }
  placeButton.addEventListener('click', placeStoneOnDigitalScale);
  removeButton.addEventListener('click', () => {
    if (!weighed) return;
    weighed = false;
    returningDigital = true;
    removeButton.disabled = true;
    placeButton.disabled = true;
    digitalTargetPosition.copy(digital.sourcePosition);
    status.textContent = '隕石正移回秤盤旁…';
    status.dataset.balanced = 'false';
    showReading();
  });
  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
  }
  function panDropTarget(event, pan) {
    camera.updateMatrixWorld();
    pan.updateWorldMatrix(true, false);
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    const radius = 0.9, segments = 24;
    const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    for (const level of [-0.64, 0.05, 0.42]) for (let i = 0; i < segments; i++) {
      const angle = Math.PI * 2 * i / segments;
      const point = pan.localToWorld(new THREE.Vector3(Math.cos(angle) * radius, level, Math.sin(angle) * radius));
      point.project(camera);
      const px = (point.x + 1) * rect.width / 2, py = (1 - point.y) * rect.height / 2;
      bounds.left = Math.min(bounds.left, px); bounds.right = Math.max(bounds.right, px);
      bounds.top = Math.min(bounds.top, py); bounds.bottom = Math.max(bounds.bottom, py);
    }
    return x >= bounds.left - 12 && x <= bounds.right + 12 && y >= bounds.top - 10 && y <= bounds.bottom + 10;
  }
  function balanceDropSide(event) {
    if (panDropTarget(event, balance.leftPan)) return 'left';
    if (panDropTarget(event, balance.rightPan)) return 'right';
    return null;
  }
  function balanceDropSideOrAbove(event) {
    if (panDropTargetOrAbove(event, balance.leftPan)) return 'left';
    if (panDropTargetOrAbove(event, balance.rightPan)) return 'right';
    return null;
  }
  function panDropTargetOrAbove(event, pan) {
    camera.updateMatrixWorld();
    pan.updateWorldMatrix(true, false);
    const rect = canvas.getBoundingClientRect();
    const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    for (const level of [-0.64, 0.05, 0.42]) for (let i = 0; i < 24; i++) {
      const angle = Math.PI * 2 * i / 24;
      const point = pan.localToWorld(new THREE.Vector3(Math.cos(angle) * 0.9, level, Math.sin(angle) * 0.9));
      point.project(camera);
      const px = rect.left + (point.x + 1) * rect.width / 2;
      const py = rect.top + (1 - point.y) * rect.height / 2;
      bounds.left = Math.min(bounds.left, px); bounds.right = Math.max(bounds.right, px);
      bounds.top = Math.min(bounds.top, py); bounds.bottom = Math.max(bounds.bottom, py);
    }
    return event.clientX >= bounds.left - 12 && event.clientX <= bounds.right + 12
      && event.clientY >= bounds.top - Math.max(110, rect.height * 0.34)
      && event.clientY <= bounds.bottom + 10;
  }
  function fallToPosition(object, targetPosition, onLand) {
    fallingItems.push({
      object,
      startPosition: object.position.clone(),
      targetPosition: targetPosition.clone(),
      startedAt: performance.now(),
      duration: 620,
      onLand
    });
  }
  function updateFallingItems(now) {
    for (let index = fallingItems.length - 1; index >= 0; index -= 1) {
      const item = fallingItems[index];
      const progress = clamp((now - item.startedAt) / item.duration, 0, 1);
      const fall = progress * progress;
      item.object.position.set(
        THREE.MathUtils.lerp(item.startPosition.x, item.targetPosition.x, progress),
        THREE.MathUtils.lerp(item.startPosition.y, item.targetPosition.y, fall),
        THREE.MathUtils.lerp(item.startPosition.z, item.targetPosition.z, progress)
      );
      if (progress >= 1) {
        fallingItems.splice(index, 1);
        item.object.position.copy(item.targetPosition);
        item.onLand();
      }
    }
  }
  function digitalDropTarget(event) {
    camera.updateMatrixWorld();
    digital.base.updateWorldMatrix(true, false);
    const rect = canvas.getBoundingClientRect();
    const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    for (const x of [-1.3, 1.3]) for (const z of [-0.79, 0.79]) {
      const point = digital.base.localToWorld(new THREE.Vector3(x, 0.79, z));
      point.project(camera);
      const px = rect.left + (point.x + 1) * rect.width / 2;
      const py = rect.top + (1 - point.y) * rect.height / 2;
      bounds.left = Math.min(bounds.left, px); bounds.right = Math.max(bounds.right, px);
      bounds.top = Math.min(bounds.top, py); bounds.bottom = Math.max(bounds.bottom, py);
    }
    const horizontalPadding = Math.max(32, rect.width * 0.12);
    const upperPadding = Math.max(96, rect.height * 0.38);
    const lowerPadding = Math.max(32, rect.height * 0.12);
    return event.clientX >= bounds.left - horizontalPadding && event.clientX <= bounds.right + horizontalPadding
      && event.clientY >= bounds.top - upperPadding && event.clientY <= bounds.bottom + lowerPadding;
  }
  function detachPreservingWorldTransform(object) {
    const position = object.getWorldPosition(new THREE.Vector3());
    const quaternion = object.getWorldQuaternion(new THREE.Quaternion());
    const scale = object.getWorldScale(new THREE.Vector3());
    object.removeFromParent();
    scene.add(object);
    object.position.copy(position);
    object.quaternion.copy(quaternion);
    object.scale.copy(scale);
  }
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== undefined && event.button !== 0) return;
    if (placingBalance || placingDigital || returningBalance || returningDigital || fallingItems.length) return;
    updatePointer(event);
    let object, dragKind, weightIndex = -1, sourceIndex = -1;
    if (mode === 'balance') {
      const weightHit = raycaster.intersectObjects(weightModels, true)[0];
      if (weightHit) {
        object = weightModels.find(weight => weight === weightHit.object || weightHit.object.parent === weight);
        if (!object) {
          let parent = weightHit.object;
          while (parent && !weightModels.includes(parent)) parent = parent.parent;
          object = parent;
        }
        weightIndex = weightModels.indexOf(object);
        dragKind = 'weight';
      } else {
        const sourceHit = raycaster.intersectObjects(sourceWeightModels.filter(model => model.visible), true)[0];
        if (sourceHit) {
          object = sourceWeightModels.find(weight => weight === sourceHit.object || sourceHit.object.parent === weight);
          if (!object) {
            let parent = sourceHit.object;
            while (parent && !sourceWeightModels.includes(parent)) parent = parent.parent;
            object = parent;
          }
          sourceIndex = sourceWeightModels.indexOf(object);
          const sourceModel = object;
          object = sourceModel.clone(true);
          scene.add(object);
          object.position.copy(sourceModel.getWorldPosition(new THREE.Vector3()));
          object.quaternion.copy(sourceModel.getWorldQuaternion(new THREE.Quaternion()));
          object.scale.copy(sourceModel.getWorldScale(new THREE.Vector3()));
          dragKind = 'source-weight';
        } else if (raycaster.intersectObject(balance.stone, true).length) {
          object = balance.stone;
          dragKind = 'balance-stone';
          if (balancePlaced) {
            balancePlaced = false;
            balance.panShadow.visible = false;
            balance.rightPanShadow.visible = false;
            detachPreservingWorldTransform(object);
            balancePlaceButton.disabled = false;
            balancePlaceButton.textContent = '將隕石放上左盤';
            drawWeights();
          }
        }
      }
    } else if (raycaster.intersectObject(digital.stone, true).length) {
      object = digital.stone;
      dragKind = 'digital-stone';
      if (weighed) {
        weighed = false;
        digital.shadow.visible = false;
        placeButton.disabled = false;
        placeButton.textContent = '將隕石放上秤盤';
        removeButton.disabled = true;
        showReading();
      }
    }
    if (!object) return;
    if (dragKind === 'weight') detachPreservingWorldTransform(object);
    const center = object.getWorldPosition(new THREE.Vector3());
    camera.getWorldDirection(planeNormal);
    dragPlane.setFromNormalAndCoplanarPoint(planeNormal, center);
    const point = raycaster.ray.intersectPlane(dragPlane, planeHit);
    if (!point) return;
    dragOffset.copy(center).sub(point);
    activeStoneDrag = { pointerId: event.pointerId, mode, object, kind: dragKind, weightIndex, sourceIndex };
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
    status.textContent = dragKind === 'weight' || dragKind === 'source-weight' ? '把砝碼拖到任一秤盤正上方放開，或拖離秤盤取下。' : mode === 'balance' ? '把隕石拖到任一秤盤正上方放開，或拖離秤盤取下。' : '將隕石拖到電子秤秤盤，或拖離秤盤取下。';
    event.preventDefault();
  });
  canvas.addEventListener('pointermove', event => {
    if (!activeStoneDrag || activeStoneDrag.pointerId !== event.pointerId) return;
    updatePointer(event);
    const point = raycaster.ray.intersectPlane(dragPlane, planeHit);
    if (point) activeStoneDrag.object.position.copy(point.add(dragOffset));
  });
  function finishStoneDrag(event) {
    if (!activeStoneDrag || activeStoneDrag.pointerId !== event.pointerId) return;
    const dragged = activeStoneDrag;
    activeStoneDrag = null;
    canvas.releasePointerCapture(event.pointerId);
    canvas.style.cursor = 'grab';
    if (dragged.kind === 'source-weight') {
      const source = weightSource.weights[dragged.sourceIndex];
      const side = balanceDropSideOrAbove(event);
      if (side) {
        if (balanceDropSide(event) === side) {
          addWeight(source.value, null, side);
          dragged.object.removeFromParent();
        } else {
          status.textContent = `砝碼落到${side === 'left' ? '左' : '右'}側秤盤…`;
          const pan = side === 'left' ? balance.leftPan : balance.rightPan;
          fallToPosition(dragged.object, pan.localToWorld(new THREE.Vector3(0, -0.64, 0)), () => {
            addWeight(source.value, null, side);
            dragged.object.removeFromParent();
          });
        }
      } else {
        status.textContent = '可將砝碼拖到任一秤盤，架上的砝碼會留在原位。';
        dragged.object.removeFromParent();
      }
    } else if (dragged.kind === 'weight') {
      const side = balanceDropSideOrAbove(event);
      if (side) {
        if (balanceDropSide(event) !== side) {
          status.textContent = `砝碼落到${side === 'left' ? '左' : '右'}側秤盤…`;
          const sideCount = weightSides.filter((value, index) => index !== dragged.weightIndex && value === side).length;
          const col = sideCount % 3, row = Math.floor(sideCount / 3);
          const pan = side === 'left' ? balance.leftPan : balance.rightPan;
          const target = pan.localToWorld(new THREE.Vector3((col - 1) * 0.35, -0.64 + row * 0.02, (row - 0.5) * 0.32));
          fallToPosition(dragged.object, target, () => {
            weightSides[dragged.weightIndex] = side;
            drawWeights();
          });
          return;
        }
        weightSides[dragged.weightIndex] = side;
        drawWeights();
        status.textContent = `砝碼已放上${side === 'left' ? '左' : '右'}側秤盤；也可以拖出秤盤移除。`;
      } else {
        weights.splice(dragged.weightIndex, 1);
        const origin = weightOrigins.splice(dragged.weightIndex, 1)[0];
        weightSides.splice(dragged.weightIndex, 1);
        if (origin !== null && origin !== undefined) sourceWeightModels[origin].visible = true;
        drawWeights();
      }
    } else if (dragged.mode === 'balance') {
      const side = balanceDropSideOrAbove(event);
      if (side) {
        balanceSide = side;
        if (balanceDropSide(event) === side) placeStoneOnBalance(side);
        else {
          status.textContent = `隕石從上方落到${side === 'left' ? '左' : '右'}側秤盤…`;
          const pan = side === 'left' ? balance.leftPan : balance.rightPan;
          const target = pan.localToWorld(new THREE.Vector3(0, balance.stoneRestY, 0));
          fallToPosition(balance.stone, target, settleBalanceStone);
        }
      }
      else {
        returningBalance = true;
        status.textContent = '隕石已取下，移回秤盤旁。';
        drawWeights();
      }
    } else if (digitalDropTarget(event)) placeStoneOnDigitalScale();
    else {
      returningDigital = true;
      digitalTargetPosition.copy(digital.sourcePosition);
      status.textContent = '隕石已取下，移回電子秤旁。';
    }
  }
  canvas.addEventListener('pointerup', finishStoneDrag);
  canvas.addEventListener('pointercancel', finishStoneDrag);

  setMode('balance');

  function resize() {
    width = host.clientWidth; height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host); resize();
  let raf = 0;
  function render() {
    raf = requestAnimationFrame(render);
    updateFallingItems(performance.now());
    currentTilt += (targetTilt - currentTilt) * 0.12;
    balance.pivot.rotation.z = currentTilt;
    balance.leftPan.rotation.z = -currentTilt;
    balance.rightPan.rotation.z = -currentTilt;
    if (placingBalance) {
        const targetPan = balanceSide === 'left' ? balance.leftPan : balance.rightPan;
        balanceTargetPosition.copy(targetPan.localToWorld(new THREE.Vector3(0, balance.stoneRestY, 0)));
      balance.stone.position.lerp(balanceTargetPosition, 0.12);
      if (balance.stone.position.distanceTo(balanceTargetPosition) < 0.015) {
        placingBalance = false;
        balancePlaced = true;
        balance.stone.removeFromParent();
        const pan = balanceSide === 'left' ? balance.leftPan : balance.rightPan;
        pan.add(balance.stone);
        balance.stone.position.set(0, balance.stoneRestY, 0);
        balance.panShadow.visible = balanceSide === 'left';
        balance.rightPanShadow.visible = balanceSide === 'right';
        balancePlaceButton.textContent = `隕石已放上${balanceSide === 'left' ? '左' : '右'}盤`;
        drawWeights();
      }
    } else if (returningBalance) {
      if (balance.stone.parent !== scene) scene.add(balance.stone);
      balance.stone.position.lerp(balance.sourcePosition, 0.12);
      if (balance.stone.position.distanceTo(balance.sourcePosition) < 0.015) {
        returningBalance = false;
        balance.stone.position.copy(balance.sourcePosition);
      }
    }
    if (mode === 'digital' && (placingDigital || returningDigital)) {
      digital.stone.position.lerp(digitalTargetPosition, 0.12);
      if (digital.stone.position.distanceTo(digitalTargetPosition) < 0.015) {
        digital.stone.position.copy(digitalTargetPosition);
        if (placingDigital) {
          placingDigital = false;
          weighed = true;
          digital.shadow.visible = true;
          placeButton.disabled = true;
          placeButton.textContent = '隕石已放上秤盤';
          removeButton.disabled = false;
          status.textContent = '隕石已放穩；請讀取秤面上的數值。';
          status.dataset.balanced = 'true';
          showReading();
        }
        if (returningDigital) {
          returningDigital = false;
          digital.shadow.visible = false;
          placeButton.disabled = false;
          placeButton.textContent = '將隕石放上秤盤';
          status.textContent = '隕石已取下並回到電子秤旁；可拖曳或按鈕再次秤量。';
        }
      }
    }
    renderer.render(scene, camera);
  }
  render();
  resetBalance();
  return () => { cancelAnimationFrame(raf); observer.disconnect(); renderer.dispose(); };
}
