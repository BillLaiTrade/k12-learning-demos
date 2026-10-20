import * as THREE from '../../3.1/assets/vendor/three/build/three.module.js';
import { makeStone } from './stone-observer.js';

const MASS_G = 39;
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

function makeRestingStone() {
  const stone = makeStone();
  const vertices = stone.geometry.attributes.position;
  for (let index = 0; index < vertices.count; index += 1) {
    vertices.setY(index, Math.max(vertices.getY(index), -0.52));
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
  const sizes = { 20: [0.205, 0.19], 10: [0.176, 0.175], 5: [0.15, 0.16], 2: [0.128, 0.145], 1: [0.108, 0.135] };
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
  const top = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.55, 40), new THREE.MeshBasicMaterial({ map: labelTexture(`${value} g`, { width: 256, height: 96, fontSize: 42, color: '#493817' }) }));
  top.rotation.x = -Math.PI / 2;
  top.position.y = height + 0.057;
  group.add(top);
  return group;
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

function makeBalance(scene, materials) {
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
  const stone = makeRestingStone();
  stone.scale.setScalar(0.43);
  stone.rotation.set(0, -0.44, 0);
  const support = stoneSupportPoint(stone);
  // Rest the stone's flat natural contact patch directly on the pan.
  const stoneRestY = -0.643 - support.y;
  stone.position.set(0, stoneRestY + 0.78, 0);
  leftPan.add(stone);
  const panShadow = contactShadow(1.35, 0.9);
  panShadow.position.set(support.x, -0.638, support.z);
  panShadow.visible = false;
  leftPan.add(panShadow);
  base.position.y = 0;
  scene.add(base);
  return { base, pivot: beamPivot, arc: scaleArc, leftPan, rightPan, stone, panShadow, stoneRestY };
}

function makeDigitalScale(scene, materials) {
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

  const stone = makeRestingStone();
  stone.scale.setScalar(0.43);
  stone.rotation.set(0, -0.44, 0);
  const support = stoneSupportPoint(stone);
  // The stone settles into the top plate instead of appearing to hover on a single vertex.
  const restingY = 0.778 - support.y;
  stone.position.set(0, restingY, 0);
  stone.visible = false;
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
  return { base, stone, shadow, restingY, updateDisplay };
}

export function mountMassMeasurement() {
  const host = document.querySelector('#mass-instrument');
  const canvas = document.querySelector('#mass-instrument-canvas');
  if (!host || !canvas) return;
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
    platform: new THREE.MeshStandardMaterial({ color: 0xf7f8f4, metalness: 0.26, roughness: 0.5 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x37443e, roughness: 0.93 }),
    button: new THREE.MeshStandardMaterial({ color: 0xc8d8cc, metalness: 0.25, roughness: 0.38 })
  };
  const balance = makeBalance(scene, mat);
  const digital = makeDigitalScale(scene, mat);
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
  let placingBalance = false;
  let weights = [];
  const weightModels = [];
  let weighed = false;
  let placingDigital = false;
  let stoneTargetY = digital.restingY + 0.78;
  let hideStoneAfterMotion = false;
  let balanceStoneTargetY = balance.stoneRestY + 0.78;
  let targetTilt = 0;
  let currentTilt = 0;
  let width = 0, height = 0;

  function showReading() {
    digital.updateDisplay(mode === 'digital' && weighed ? '39' : '0.0', 'g');
  }

  function clearWeightModels() {
    weightModels.forEach(weight => {
      balance.rightPan.remove(weight);
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
    weights.forEach((value, index) => {
      const weight = makeWeight(value);
      const col = index % 3, row = Math.floor(index / 3);
      weight.position.set((col - 1) * 0.35, -0.64 + row * 0.02, (row - 0.5) * 0.32);
      balance.rightPan.add(weight);
      weightModels.push(weight);
      const tag = document.createElement('span');
      tag.className = 'weight-chip';
      tag.textContent = `${value} g`;
      weightTray.append(tag);
    });
    const total = weights.reduce((sum, value) => sum + value, 0);
    document.querySelectorAll('[data-weight]').forEach(button => {
      button.disabled = !balancePlaced || total + Number(button.dataset.weight) > 60;
    });
    weightTotal.textContent = `${total} g`;
    const difference = MASS_G - total;
    targetTilt = balancePlaced ? clamp(difference * 0.006, -0.18, 0.18) : 0;
    const balanced = balancePlaced && total === MASS_G;
    status.textContent = balanced
      ? '已達平衡！兩側質量相等。'
      : balancePlaced
        ? difference > 0
          ? '石頭這一側較低，砝碼還不夠；可以再加一些。'
          : '砝碼這一側較低，砝碼已過多；可以移除一些。'
        : placingBalance ? '石頭正放到左側秤盤上…' : '先將石頭放上左側秤盤。';
    status.dataset.balanced = String(balanced);
    showReading();
  }

  function resetBalance() {
    weights = [];
    drawWeights();
  }
  document.querySelectorAll('[data-weight]').forEach(button => button.addEventListener('click', () => {
    if (!balancePlaced) return;
    const next = Number(button.dataset.weight);
    if (weights.reduce((sum, value) => sum + value, 0) + next > 60) return;
    weights.push(next);
    drawWeights();
  }));
  document.querySelector('#balance-undo').addEventListener('click', () => { weights.pop(); drawWeights(); });
  document.querySelector('#balance-reset').addEventListener('click', resetBalance);
  balancePlaceButton.addEventListener('click', () => {
    if (balancePlaced || placingBalance) return;
    placingBalance = true;
    balanceStoneTargetY = balance.stoneRestY;
    balancePlaceButton.disabled = true;
    balancePlaceButton.textContent = '正在放上左盤…';
    status.textContent = '石頭正放到左側秤盤上…';
  });

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
    digital.base.visible = mode === 'digital';
    digital.stone.visible = mode === 'digital';
      digital.shadow.visible = mode === 'digital' && weighed;
    if (mode === 'digital') {
      balance.panShadow.visible = false;
      balance.stone.visible = false;
      balance.stone.removeFromParent();
      digital.stone.position.set(0, weighed || placingDigital ? digital.restingY : digital.restingY + 0.78, 0);
      digital.stone.scale.setScalar(0.43);
      digital.stone.visible = weighed || placingDigital;
      placeButton.disabled = weighed || placingDigital;
      placeButton.textContent = weighed ? '石頭已放上秤盤' : placingDigital ? '正在放上秤盤…' : '將石頭放上秤盤';
      removeButton.disabled = !weighed || placingDigital;
      digital.updateDisplay(weighed ? '39' : '0.0', 'g');
      stoneTargetY = weighed || placingDigital ? digital.restingY : digital.restingY + 0.78;
      status.textContent = weighed
        ? '石頭已放上秤盤；電子秤已讀取質量。'
        : placingDigital ? '石頭正放到電子秤秤盤上…' : '秤盤已歸零；按下按鈕，將同一塊石頭放上秤盤。';
    } else {
      digital.stone.visible = false;
      balance.leftPan.add(balance.stone);
      balance.stone.visible = true;
      balance.panShadow.visible = balancePlaced;
      balanceStoneTargetY = balancePlaced ? balance.stoneRestY : balance.stoneRestY + 0.78;
      balancePlaceButton.disabled = balancePlaced || placingBalance;
      balancePlaceButton.textContent = balancePlaced ? '石頭已放上左盤' : placingBalance ? '正在放上左盤…' : '將石頭放上左盤';
      resetBalance();
    }
    showReading();
    camera.position.set(mode === 'balance' ? 0.8 : 3.1, mode === 'balance' ? 3.25 : 3.1, mode === 'balance' ? 9.4 : 8.2);
    camera.lookAt(0, mode === 'balance' ? 1.05 : 0.78, 0);
    document.querySelector('#mass-instrument').dataset.mode = mode;
  }
  modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.massMode)));

  document.querySelector('#place-on-scale').addEventListener('click', () => {
    if (weighed || placingDigital) return;
    placingDigital = true;
    digital.stone.visible = true;
    placeButton.disabled = true;
    placeButton.textContent = '正在放上秤盤…';
    removeButton.disabled = true;
    hideStoneAfterMotion = false;
    stoneTargetY = digital.restingY;
    status.textContent = '石頭正放到電子秤秤盤上…';
    status.dataset.balanced = 'false';
    showReading();
  });
  document.querySelector('#remove-from-scale').addEventListener('click', () => {
    if (!weighed) return;
    weighed = false;
    removeButton.disabled = true;
    placeButton.disabled = true;
    hideStoneAfterMotion = true;
    stoneTargetY = digital.restingY + 0.78;
    status.textContent = '石頭正從秤盤取下…';
    status.dataset.balanced = 'false';
    showReading();
  });
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
    currentTilt += (targetTilt - currentTilt) * 0.12;
    digital.stone.position.y += (stoneTargetY - digital.stone.position.y) * 0.12;
    balance.stone.position.y += (balanceStoneTargetY - balance.stone.position.y) * 0.12;
    if (mode === 'balance' && placingBalance && Math.abs(balanceStoneTargetY - balance.stone.position.y) < 0.015) {
      placingBalance = false;
      balancePlaced = true;
      balance.panShadow.visible = true;
      balancePlaceButton.textContent = '石頭已放上左盤';
      drawWeights();
    }
    if (mode === 'digital' && placingDigital && Math.abs(stoneTargetY - digital.stone.position.y) < 0.015) {
      placingDigital = false;
      weighed = true;
      digital.shadow.visible = true;
      placeButton.disabled = true;
      placeButton.textContent = '石頭已放上秤盤';
      removeButton.disabled = false;
      status.textContent = '石頭已放穩；請讀取秤面上的數值。';
      status.dataset.balanced = 'true';
      showReading();
    }
    if (hideStoneAfterMotion && Math.abs(stoneTargetY - digital.stone.position.y) < 0.015) {
      digital.stone.visible = false;
      digital.shadow.visible = false;
      placeButton.disabled = false;
      placeButton.textContent = '將石頭放上秤盤';
      status.textContent = '秤盤已清空並歸零。放上同一塊石頭即可讀取質量。';
      hideStoneAfterMotion = false;
    }
    balance.pivot.rotation.z = currentTilt;
    balance.leftPan.rotation.z = -currentTilt;
    balance.rightPan.rotation.z = -currentTilt;
    renderer.render(scene, camera);
  }
  render();
  resetBalance();
  return () => { cancelAnimationFrame(raf); observer.disconnect(); renderer.dispose(); };
}
