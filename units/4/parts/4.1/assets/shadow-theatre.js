import * as THREE from './vendor/three/build/three.module.js?v=known-good-three-20261025';
import {THEATRE_OPTICS, shadowScaleAt, positionForShadow, assessShadow, DEPTH_LIMITS, DEPTH_RULER_MAX, depthToRuler, rulerToDepth} from './shadow-theatre-optics.mjs?v=2';

const waitUntilCanvasIsNearViewport = (canvas) => new Promise((resolve) => {
  if (!('IntersectionObserver' in window)) {
    resolve();
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      resolve();
    }
  }, { rootMargin: '320px 0px' });
  observer.observe(canvas);
});

const canvas = document.querySelector('#shadow-theatre-scene');
if (canvas) {
  await waitUntilCanvasIsNearViewport(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#101b2a');
  scene.fog = new THREE.Fog('#101b2a', 12, 24);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
  const cameraTarget = new THREE.Vector3(0, 1.48, -0.2);
  const home = { yaw: 0.25, pitch: 1.12, radius: 9.2 };
  let yaw = home.yaw;
  let pitch = home.pitch;
  let radius = home.radius;
  const updateCamera = () => {
    const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
    const fitRadius = Math.max(radius, radius * (1.12 / Math.max(aspect, 0.72)));
    camera.position.set(
      cameraTarget.x + fitRadius * Math.sin(pitch) * Math.sin(yaw),
      cameraTarget.y + fitRadius * Math.cos(pitch),
      cameraTarget.z + fitRadius * Math.sin(pitch) * Math.cos(yaw)
    );
    camera.lookAt(cameraTarget);
  };

  const makeWood = (base, grain, count = 44) => {
    const source = document.createElement('canvas');
    source.width = 512;
    source.height = 256;
    const ctx = source.getContext('2d');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < count; i += 1) {
      const y = Math.random() * 256;
      ctx.strokeStyle = `rgba(48, 31, 18, ${0.035 + Math.random() * 0.09})`;
      ctx.lineWidth = 1 + Math.random() * 2.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(120, y - 8, 310, y + 9, 512, y - 3);
      ctx.stroke();
      if (i % 5 === 0) {
        ctx.strokeStyle = `rgba(255, 223, 157, ${0.06 + Math.random() * 0.07})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y + 3);
        ctx.bezierCurveTo(140, y, 330, y + 5, 512, y + 2);
        ctx.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(source);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    return new THREE.MeshStandardMaterial({ map: texture, color: grain, roughness: 0.72, metalness: 0.04 });
  };
  const woodDark = makeWood('#68412a', '#b28a57');
  const woodLight = makeWood('#9b6b3c', '#d2a568');
  const woodTrim = new THREE.MeshStandardMaterial({ color: '#c49b5e', roughness: 0.36, metalness: 0.22 });
  const velvet = new THREE.MeshStandardMaterial({ color: '#254454', roughness: 0.94, side: THREE.DoubleSide });
  const gold = new THREE.MeshStandardMaterial({ color: '#dcb965', roughness: 0.32, metalness: 0.58 });
  const dark = new THREE.MeshStandardMaterial({ color: '#21302e', roughness: 0.65 });
  const groundMat = new THREE.MeshStandardMaterial({ color: '#19242e', roughness: 0.9 });

  scene.add(new THREE.HemisphereLight('#d4e5ef', '#2d1c21', 2.0));
  const warmFill = new THREE.PointLight('#ffcf72', 32, 12, 2);
  warmFill.position.set(-3.2, 2.5, 3.2);
  scene.add(warmFill);
  const frontFill = new THREE.PointLight('#9abaca', 13, 14, 2);
  frontFill.position.set(3.7, 3.7, 3.5);
  scene.add(frontFill);

  const screenZ = THEATRE_OPTICS.screenZ;
  const screenY = 1.63;
  const screenWidth = 4.55;
  const screenHeight = 2.65;
  const lightSource = new THREE.Vector3(THEATRE_OPTICS.light.x, THEATRE_OPTICS.light.y, THEATRE_OPTICS.light.z);
  const shadowLight = new THREE.SpotLight('#ffe2a4', 140, 13, 0.95, 0.28, 2);
  shadowLight.position.copy(lightSource);
  shadowLight.target.position.set(0, screenY, screenZ);
  shadowLight.castShadow = true;
  shadowLight.shadow.mapSize.set(2048, 2048);
  shadowLight.shadow.camera.near = 0.1;
  shadowLight.shadow.camera.far = 13;
  shadowLight.shadow.bias = -0.00018;
  shadowLight.shadow.normalBias = 0.025;
  shadowLight.shadow.radius = 4;
  scene.add(shadowLight, shadowLight.target);

  const addBox = (parent, size, position, material, options = {}) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = options.castShadow ?? true;
    mesh.receiveShadow = options.receiveShadow ?? true;
    parent.add(mesh);
    return mesh;
  };
  const roundedPanel = (width, height, radiusCorner, depth) => {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2 + radiusCorner, -height / 2);
    shape.lineTo(width / 2 - radiusCorner, -height / 2);
    shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radiusCorner);
    shape.lineTo(width / 2, height / 2 - radiusCorner);
    shape.quadraticCurveTo(width / 2, height / 2, width / 2 - radiusCorner, height / 2);
    shape.lineTo(-width / 2 + radiusCorner, height / 2);
    shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radiusCorner);
    shape.lineTo(-width / 2, -height / 2 + radiusCorner);
    shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radiusCorner, -height / 2);
    return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.035, bevelThickness: 0.035, curveSegments: 10 });
  };

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.13;
  ground.receiveShadow = true;
  scene.add(ground);
  const stage = new THREE.Group();
  scene.add(stage);
  addBox(stage, [5.65, 0.22, 2.1], [0, 0.08, -0.06], woodDark);
  addBox(stage, [5.48, 0.1, 1.94], [0, 0.23, -0.06], woodLight);
  addBox(stage, [5.38, 0.04, 1.8], [0, 0.3, -0.06], woodTrim);
  addBox(stage, [4.7, 0.06, 0.12], [0, 0.35, -1.16], gold);
  addBox(stage, [4.7, 0.06, 0.12], [0, 0.35, 0.88], woodDark);

  // The illuminated canvas is a real receiving surface; each movable cutout casts its own shadow onto it.
  const screenBacking = new THREE.Mesh(roundedPanel(screenWidth + 0.22, screenHeight + 0.25, 0.12, 0.13), woodDark);
  screenBacking.position.set(0, screenY, screenZ - 0.2);
  screenBacking.castShadow = true;
  screenBacking.receiveShadow = true;
  stage.add(screenBacking);
  const screenMat = new THREE.MeshStandardMaterial({ color: '#fff2cf', emissive: '#b9974f', emissiveIntensity: 0.11, roughness: 0.88, metalness: 0, side: THREE.DoubleSide });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenWidth, screenHeight), screenMat);
  screen.position.set(0, screenY, screenZ);
  screen.receiveShadow = true;
  stage.add(screen);
  for (const [x, y, sx, sy] of [[0, screenY + screenHeight / 2 + 0.105, screenWidth + 0.22, 0.13], [0, screenY - screenHeight / 2 - 0.105, screenWidth + 0.22, 0.13], [-screenWidth / 2 - 0.105, screenY, 0.13, screenHeight], [screenWidth / 2 + 0.105, screenY, 0.13, screenHeight]]) {
    addBox(stage, [sx, sy, 0.19], [x, y, screenZ - 0.09], woodTrim);
    if (sx < 0.2) {
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 14), gold);
      finial.position.set(x, y + Math.sign(y - screenY) * screenHeight * 0.52, screenZ - 0.08);
      stage.add(finial);
    }
  }
  // Folded side curtains add a stage silhouette without covering the projected image.
  for (const side of [-1, 1]) {
    const curtain = new THREE.Mesh(roundedPanel(0.39, screenHeight + 0.02, 0.08, 0.08), velvet);
    curtain.position.set(side * (screenWidth / 2 - 0.16), screenY, screenZ + 0.08);
    curtain.castShadow = false;
    stage.add(curtain);
    const tassel = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 12), gold);
    tassel.position.set(side * (screenWidth / 2 - 0.16), screenY - 0.52, screenZ + 0.16);
    stage.add(tassel);
  }

  // Keep the light source compact and beside the screen so it never crowds the movable props.
  const lamp = new THREE.Group();
  lamp.position.copy(lightSource);
  stage.add(lamp);
  const lampBody = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.34, 24, 1, false), dark);
  lampBody.rotation.x = Math.PI / 2;
  lampBody.castShadow = false;
  lamp.add(lampBody);
  const lampRim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 24), woodTrim);
  lampRim.position.z = 0.18;
  lamp.add(lampRim);
  const lampLens = new THREE.Mesh(new THREE.CircleGeometry(0.145, 24), new THREE.MeshBasicMaterial({ color: '#ffe6a0', side: THREE.DoubleSide }));
  lampLens.position.z = 0.181;
  lamp.add(lampLens);
  const lampGlow = new THREE.PointLight('#ffcf75', 7, 2.6, 2);
  lampGlow.position.z = 0.1;
  lamp.add(lampGlow);

  // Tiny carved stars on the theatre valance.
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const angle = Math.PI * i / 5 - Math.PI / 2;
    const r = i % 2 ? 0.065 : 0.145;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) starShape.moveTo(x, y); else starShape.lineTo(x, y);
  }
  starShape.closePath();
  const starGeometry = new THREE.ShapeGeometry(starShape);
  for (let i = 0; i < 5; i += 1) {
    const star = new THREE.Mesh(starGeometry, gold);
    star.position.set(-1.55 + i * 0.78, screenY + screenHeight / 2 + 0.11, screenZ + 0.025);
    stage.add(star);
  }

  const makeMoon = () => {
    const s = new THREE.Shape();
    s.moveTo(-0.28, 0.42);
    s.bezierCurveTo(0.36, 0.44, 0.62, -0.13, 0.28, -0.48);
    s.bezierCurveTo(0.09, -0.66, -0.22, -0.56, -0.4, -0.39);
    s.bezierCurveTo(-0.03, -0.5, 0.22, -0.27, 0.19, 0.02);
    s.bezierCurveTo(0.16, 0.25, -0.02, 0.4, -0.28, 0.42);
    return s;
  };
  const makeRabbit = () => {
    const s = new THREE.Shape();
    s.moveTo(-0.42, -0.35);
    s.bezierCurveTo(-0.57, -0.02, -0.34, 0.27, -0.05, 0.29);
    s.bezierCurveTo(-0.2, 0.68, -0.06, 1.0, 0.11, 0.91);
    s.bezierCurveTo(0.23, 0.84, 0.15, 0.48, 0.19, 0.31);
    s.bezierCurveTo(0.36, 0.67, 0.57, 0.86, 0.68, 0.73);
    s.bezierCurveTo(0.78, 0.6, 0.45, 0.23, 0.38, 0.12);
    s.bezierCurveTo(0.71, -0.12, 0.57, -0.44, 0.32, -0.52);
    s.bezierCurveTo(0.03, -0.7, -0.24, -0.59, -0.42, -0.35);
    s.closePath();
    const eye = new THREE.Path();
    eye.absellipse(0.25, 0.16, 0.035, 0.035, 0, Math.PI * 2, false, 0);
    s.holes.push(eye);
    return s;
  };
  const makeTree = () => {
    const s = new THREE.Shape();
    s.moveTo(-0.12, -0.5); s.lineTo(0.12, -0.5); s.lineTo(0.12, -0.1);
    s.lineTo(0.43, -0.1); s.lineTo(0.28, 0.08); s.lineTo(0.45, 0.11);
    s.lineTo(0.23, 0.3); s.lineTo(0.38, 0.34); s.lineTo(0.16, 0.56);
    s.lineTo(0.2, 0.66); s.lineTo(-0.2, 0.66); s.lineTo(-0.16, 0.56);
    s.lineTo(-0.38, 0.34); s.lineTo(-0.23, 0.3); s.lineTo(-0.45, 0.11);
    s.lineTo(-0.28, 0.08); s.lineTo(-0.43, -0.1); s.lineTo(-0.12, -0.1); s.closePath();
    return s;
  };
  const propDefinitions = {
    moon: { label: '月亮', shape: makeMoon(), color: '#334743', target: new THREE.Vector2(-1.47, 1.79), start: new THREE.Vector2(-1.75, 0.68), startZ: 0.92, size: 0.66 },
    rabbit: { label: '兔子', shape: makeRabbit(), color: '#293a37', target: new THREE.Vector2(-0.02, 1.31), start: new THREE.Vector2(0, 0.64), startZ: 0.7, size: 0.61 },
    tree: { label: '樹影', shape: makeTree(), color: '#334743', target: new THREE.Vector2(1.47, 1.53), start: new THREE.Vector2(1.67, 0.66), startZ: 0.02, size: 0.62 }
  };
  const shadowScale = shadowScaleAt(THEATRE_OPTICS.targetDepth);
  const targetGuideGroup = new THREE.Group();
  targetGuideGroup.renderOrder = 3;
  stage.add(targetGuideGroup);
  const props = new Map();
  const propMeshes = [];
  const materialForProp = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.46, metalness: 0.16, side: THREE.DoubleSide });
  for (const [id, definition] of Object.entries(propDefinitions)) {
    const geometry = new THREE.ExtrudeGeometry(definition.shape, { depth: 0.075, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.026, bevelThickness: 0.025, curveSegments: 22 });
    geometry.translate(0, 0, -0.0375);
    const mesh = new THREE.Mesh(geometry, materialForProp(definition.color));
    mesh.scale.setScalar(definition.size);
    mesh.position.set(definition.start.x, definition.start.y, definition.startZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.propId = id;
    stage.add(mesh);
    const rim = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 12), new THREE.LineBasicMaterial({ color: '#d4b36b', transparent: true, opacity: 0.72 }));
    rim.scale.copy(mesh.scale);
    rim.position.copy(mesh.position);
    rim.userData.propId = id;
    rim.userData.isRim = true;
    stage.add(rim);
    propMeshes.push(mesh, rim);

    const guideGeometry = new THREE.EdgesGeometry(new THREE.ShapeGeometry(definition.shape), 8);
    const guide = new THREE.LineSegments(guideGeometry, new THREE.LineDashedMaterial({ color: '#dfb64e', dashSize: 0.09, gapSize: 0.055, transparent: true, opacity: 0.88, depthTest: false }));
    guide.scale.setScalar(definition.size * shadowScale);
    guide.position.set(definition.target.x, definition.target.y, screenZ + 0.018);
    guide.computeLineDistances();
    guide.userData.propId = id;
    guide.userData.fadeStart = null;
    guide.renderOrder = 4;
    targetGuideGroup.add(guide);
    props.set(id, { id, ...definition, mesh, rim, guide, placed: false, startPosition: mesh.position.clone() });
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -THEATRE_OPTICS.targetDepth);
  const intersection = new THREE.Vector3();
  let activeDrag = null;
  let pointerDown = null;
  let selectedProp = null;
  let rotating = false;
  let completed = false;
  let animationId = 0;

  const status = document.querySelector('#shadow-theatre-status');
  const targetStatus = document.querySelector('#booklet-target-status');
  const finishNote = document.querySelector('#shadow-theatre-finish-note');
  const finishButton = document.querySelector('#shadow-theatre-finish');
  const progressFill = document.querySelector('#booklet-progress-fill');
  const progressTrack = document.querySelector('.booklet-progress-track');
  const selectionButtons = [...document.querySelectorAll('[data-prop-select]')];
  const depthControls = document.querySelector('#shadow-theatre-depth-controls');
  const depthReadout = document.querySelector('#shadow-theatre-depth-readout');
  const depthInput = document.querySelector('#shadow-theatre-depth');
  const depthLabel = document.querySelector('#shadow-theatre-depth-label');
  const depthTicks = document.querySelector('#shadow-theatre-depth-ticks');
  const depthNumbers = document.querySelector('#shadow-theatre-depth-numbers');
  for (let i = 0; i <= 50; i += 1) {
    const tick = document.createElement('i');
    tick.style.left = `${i * 2}%`;
    tick.className = i % 10 === 0 ? 'is-major' : i % 5 === 0 ? 'is-mid' : '';
    depthTicks.append(tick);
  }
  for (let i = 0; i <= DEPTH_RULER_MAX; i += 2) {
    const number = document.createElement('span');
    number.style.left = `${i / DEPTH_RULER_MAX * 100}%`;
    number.textContent = String(i);
    depthNumbers.append(number);
  }
  const syncDepthControls = (prop) => {
    const value = depthToRuler(prop.mesh.position.z);
    depthInput.value = String(value);
    depthReadout.textContent = `位置 ${value.toFixed(1)}`;
    depthLabel.textContent = `${prop.label}・前後位置`;
    depthInput.setAttribute('aria-valuetext', `${prop.label}，位置 ${value.toFixed(1)}；左端光源，右端屏幕`);
  };

  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    updateCamera();
  };

  const setSelected = (id) => {
    selectedProp = id;
    depthControls.hidden = !id || props.get(id)?.placed;
    selectionButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.propSelect === id)));
    for (const [propId, prop] of props) {
      const focused = propId === id && !prop.placed;
      prop.mesh.material.emissive.set(focused ? '#563d14' : '#000000');
      prop.mesh.material.emissiveIntensity = focused ? 0.35 : 0;
    }
    if (id && props.has(id) && !props.get(id).placed) {
      syncDepthControls(props.get(id));
      status.textContent = `拖動「${props.get(id).label}」剪影，讓投影對上描邊`;
    }
  };

  const updateProgress = () => {
    const count = [...props.values()].filter((prop) => prop.placed).length;
    progressFill.style.width = `${count / props.size * 100}%`;
    progressTrack.setAttribute('aria-valuenow', String(count));
    targetStatus.textContent = count === 3 ? '月亮兔登上舞台' : `還有 ${3 - count} 個影子等待定位`;
    for (const [id, prop] of props) {
      const button = document.querySelector(`[data-prop-select="${id}"]`);
      const state = document.querySelector(`[data-prop-state="${id}"]`);
      const slot = document.querySelector(`[data-prop-slot="${id}"]`);
      button.classList.toggle('is-placed', prop.placed);
      state.textContent = prop.placed ? '已對準' : '待定位';
      slot.classList.toggle('is-placed', prop.placed);
    }
    finishButton.disabled = completed || count < props.size;
    if (count === props.size) status.textContent = '三道影子拼在一起了！可以開始演出。';
    return count;
  };

  const setPointer = (event) => {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
  };

  const syncPropRim = (prop) => prop.rim.position.copy(prop.mesh.position);
  const checkPlacement = (prop, allowSnap = true) => {
    if (prop.placed) return;
    const assessment = assessShadow(prop.mesh.position, prop.target);
    if (!assessment.matches) {
      setSelected(prop.id);
      status.textContent = !assessment.sizeMatches
        ? `「${prop.label}」的影子偏${assessment.sizeError > 0 ? '大' : '小'}，再調整前後距離`
        : `「${prop.label}」的影子大小接近了，位置還沒對齊`;
      return;
    }
    if (!allowSnap) {
      status.textContent = `「${prop.label}」的影子大小與位置接近了`;
      return;
    }
    const aligned = positionForShadow(prop.target, prop.mesh.position.z);
    prop.mesh.position.x = aligned.x;
    prop.mesh.position.y = aligned.y;
    syncPropRim(prop);
    prop.placed = true;
    prop.guide.userData.fadeStart = performance.now();
    prop.mesh.material.emissive.set('#000000');
    prop.mesh.scale.setScalar(prop.size);
    setSelected(null);
    const count = updateProgress();
    if (count < props.size) status.textContent = `「${prop.label}」的影子對準了！描邊淡出了。`;
  };

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    setPointer(event);
    pointerDown = { x: event.clientX, y: event.clientY, yaw, pitch };
    const hit = raycaster.intersectObjects([...props.values()].filter((prop) => !prop.placed).map((prop) => prop.mesh), false)[0];
    if (hit) {
      const prop = props.get(hit.object.userData.propId);
      dragPlane.constant = -prop.mesh.position.z;
      raycaster.ray.intersectPlane(dragPlane, intersection);
      activeDrag = { prop, offset: new THREE.Vector3(prop.mesh.position.x - intersection.x, prop.mesh.position.y - intersection.y, 0) };
      setSelected(prop.id);
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = 'grabbing';
      event.preventDefault();
      return;
    }
    const selected = props.get(selectedProp);
    dragPlane.constant = selected && !selected.placed ? -selected.mesh.position.z : -THEATRE_OPTICS.targetDepth;
    if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
      const nearest = [...props.values()].filter((prop) => !prop.placed)
        .map((prop) => ({ prop, distance: Math.hypot(prop.mesh.position.x - intersection.x, prop.mesh.position.y - intersection.y) }))
        .sort((a, b) => a.distance - b.distance)[0];
      if (nearest && nearest.distance < 0.58) {
        dragPlane.constant = -nearest.prop.mesh.position.z;
        raycaster.ray.intersectPlane(dragPlane, intersection);
        activeDrag = { prop: nearest.prop, offset: new THREE.Vector3(nearest.prop.mesh.position.x - intersection.x, nearest.prop.mesh.position.y - intersection.y, 0) };
        setSelected(nearest.prop.id);
        canvas.setPointerCapture(event.pointerId);
        canvas.style.cursor = 'grabbing';
        event.preventDefault();
        return;
      }
    }
    rotating = true;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!pointerDown) return;
    const dx = event.clientX - pointerDown.x;
    const dy = event.clientY - pointerDown.y;
    if (activeDrag) {
      setPointer(event);
      if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
        const prop = activeDrag.prop;
        prop.mesh.position.x = THREE.MathUtils.clamp(intersection.x + activeDrag.offset.x, -2.3, 2.3);
        prop.mesh.position.y = THREE.MathUtils.clamp(intersection.y + activeDrag.offset.y, 0.48, 2.65);
        syncPropRim(prop);
      }
      status.textContent = `移動「${activeDrag.prop.label}」的影子，觀察它和描邊的相對位置`;
    } else if (rotating) {
      yaw = THREE.MathUtils.clamp(pointerDown.yaw - dx * 0.006, -0.82, 0.92);
      pitch = THREE.MathUtils.clamp(pointerDown.pitch + dy * 0.0032, 0.88, 1.34);
      updateCamera();
    }
  });

  const releasePointer = (event) => {
    if (activeDrag) checkPlacement(activeDrag.prop);
    activeDrag = null;
    rotating = false;
    pointerDown = null;
    canvas.style.cursor = 'grab';
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);
  canvas.addEventListener('lostpointercapture', () => {
    activeDrag = null;
    rotating = false;
    pointerDown = null;
    canvas.style.cursor = 'grab';
  });

  selectionButtons.forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.propSelect;
    if (props.get(id).placed) {
      status.textContent = `${props.get(id).label}已完成；若要重來，按「重設舞台」。`;
      return;
    }
    setSelected(selectedProp === id ? null : id);
  }));

  const setDepth = (prop, z, allowSnap = true) => {
    if (!prop || prop.placed) return;
    prop.mesh.position.z = THREE.MathUtils.clamp(z, DEPTH_LIMITS.min, DEPTH_LIMITS.max);
    syncPropRim(prop);
    syncDepthControls(prop);
    checkPlacement(prop, allowSnap);
  };
  const moveDepth = (prop, direction) => { if (prop) setDepth(prop, prop.mesh.position.z + direction * 0.16); };
  depthInput.addEventListener('input', () => setDepth(props.get(selectedProp), rulerToDepth(Number(depthInput.value)), false));
  depthInput.addEventListener('change', () => {
    const prop = props.get(selectedProp);
    if (prop && !prop.placed) checkPlacement(prop);
  });
  canvas.addEventListener('wheel', (event) => {
    const prop = props.get(selectedProp);
    if (!prop || prop.placed) return;
    event.preventDefault();
    moveDepth(prop, event.deltaY < 0 ? 1 : -1);
  }, { passive: false });

  const reset = () => {
    completed = false;
    yaw = home.yaw;
    pitch = home.pitch;
    radius = home.radius;
    updateCamera();
    for (const [id, prop] of props) {
      prop.mesh.position.copy(prop.startPosition);
      prop.rim.position.copy(prop.mesh.position);
      prop.placed = false;
      prop.guide.material.opacity = 0.88;
      prop.guide.userData.fadeStart = null;
      prop.mesh.material.emissive.set('#000000');
      prop.mesh.material.emissiveIntensity = 0;
      const button = document.querySelector(`[data-prop-select="${id}"]`);
      button.classList.remove('is-placed');
    }
    setSelected(null);
    finishNote.textContent = '道具就位後，描邊會全部消失。';
    finishNote.dataset.done = 'false';
    finishButton.textContent = '完成演出';
    status.textContent = '月亮、兔子、樹影，等你上場';
    updateProgress();
  };
  document.querySelector('#shadow-theatre-reset').addEventListener('click', reset);
  document.querySelector('#shadow-theatre-view').addEventListener('click', () => {
    yaw = yaw > 0.45 ? -0.25 : 0.72;
    pitch = 1.04;
    updateCamera();
    status.textContent = '換個角度看看舞台上的道具和屏幕';
  });
  finishButton.addEventListener('click', () => {
    if (finishButton.disabled) return;
    completed = true;
    finishButton.textContent = '演出完成';
    finishButton.disabled = true;
    finishNote.textContent = '想重新挑戰，請按上方「重設舞台」。';
    finishNote.dataset.done = 'true';
    status.textContent = '演出完成！你的影子戲登上月光舞台。';
    warmFill.intensity = 43;
    window.setTimeout(() => { if (completed) warmFill.intensity = 32; }, 750);
  });

  canvas.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const prop = props.get(selectedProp);
    if (!prop || prop.placed) return;
    event.preventDefault();
    const step = event.shiftKey ? 0.12 : 0.035;
    if (event.ctrlKey && event.key === 'ArrowUp') prop.mesh.position.z = Math.min(DEPTH_LIMITS.max, prop.mesh.position.z + step);
    else if (event.ctrlKey && event.key === 'ArrowDown') prop.mesh.position.z = Math.max(DEPTH_LIMITS.min, prop.mesh.position.z - step);
    else if (event.key === 'ArrowLeft') prop.mesh.position.x -= step;
    else if (event.key === 'ArrowRight') prop.mesh.position.x += step;
    else if (event.key === 'ArrowUp') prop.mesh.position.y += step;
    else if (event.key === 'ArrowDown') prop.mesh.position.y -= step;
    prop.mesh.position.x = THREE.MathUtils.clamp(prop.mesh.position.x, -2.3, 2.3);
    prop.mesh.position.y = THREE.MathUtils.clamp(prop.mesh.position.y, 0.48, 2.65);
    syncPropRim(prop);
    syncDepthControls(prop);
    checkPlacement(prop);
  });

  const clock = new THREE.Clock();
  const animate = () => {
    animationId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    lampLens.material.color.setHSL(0.12, 0.62, 0.78 + Math.sin(t * 2.1) * 0.035);
    for (const prop of props.values()) {
      if (prop.guide.userData.fadeStart === null) continue;
      const progress = Math.min((performance.now() - prop.guide.userData.fadeStart) / 420, 1);
      prop.guide.material.opacity = 0.88 * (1 - progress);
      if (progress === 1) prop.guide.userData.fadeStart = null;
    }
    renderer.render(scene, camera);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();
  updateProgress();
  animate();

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(animationId);
    resizeObserver.disconnect();
    renderer.dispose();
    for (const prop of props.values()) {
      prop.mesh.geometry.dispose();
      prop.mesh.material.dispose();
      prop.rim.geometry.dispose();
      prop.rim.material.dispose();
      prop.guide.geometry.dispose();
      prop.guide.material.dispose();
    }
  }, { once: true });
}
