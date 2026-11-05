import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';

const canvas = document.querySelector('#reflection-3d-scene');
if (!canvas) throw new Error('Reflection scene canvas is missing.');
const comparison = document.querySelector('.reflection-comparison');
const referenceMatchButton = document.querySelector('#reflection-match-reference');

const fireButtons = [
  document.querySelector('#reflection-fire-mirror'),
  document.querySelector('#reflection-fire-paper')
];
const status = document.querySelector('#reflection-status');
const fallback = document.querySelector('#reflection-fallback');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const viewButtons = [...document.querySelectorAll('[data-reflection-view]')];
const viewStatus = document.querySelector('#reflection-view-status');

try {
  const scene = new THREE.Scene();
  // A light neutral gray gives the mirror a visible environmental reflection
  // without returning to the dark backdrop.
  scene.background = new THREE.Color('#e7e9e6');
  scene.fog = new THREE.Fog('#e7e9e6', 11, 22);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  // This comparison should show the reflected light patterns without dark
  // cast shadows from the lamps and stands.
  renderer.shadowMap.enabled = false;

  // Parallel viewing rays keep both samples equally sized and the initial
  // specular alignment consistent when the responsive viewport changes size.
  const camera = new THREE.OrthographicCamera(-4, 4, 2.5, -2.5, 0.1, 45);
  const cameraTarget = new THREE.Vector3(0, 0.65, -0.35);
  const cameraOffset = new THREE.Vector3(0, 6.4, 7.63);
  const cameraDistance = cameraOffset.length();
  let cameraAzimuth = Math.atan2(cameraOffset.x, cameraOffset.z);
  let cameraPolar = Math.acos(cameraOffset.y / cameraDistance);
  const frontPolar = cameraPolar;
  const viewPresets = { front: 0, left: -38 * Math.PI / 180, right: 38 * Math.PI / 180 };
  const framingPoints = [];
  let pointerDrag = null;
  const fitCamera = (targetCamera, aspect) => {
    targetCamera.updateMatrixWorld();
    if (!framingPoints.length) return;
    const points = framingPoints.map(point => point.clone().applyMatrix4(targetCamera.matrixWorldInverse));
    const xs = points.map(point => point.x), ys = points.map(point => point.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const height = Math.max(maxY - minY, (maxX - minX) / aspect) * 1.12;
    const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
    targetCamera.left = centerX - height * aspect / 2;
    targetCamera.right = centerX + height * aspect / 2;
    targetCamera.bottom = centerY - height / 2;
    targetCamera.top = centerY + height / 2;
    targetCamera.updateProjectionMatrix();
  };
  const updateCamera = () => {
    const sinPolar = Math.sin(cameraPolar);
    camera.position.set(
      cameraTarget.x + Math.sin(cameraAzimuth) * sinPolar * cameraDistance,
      cameraTarget.y + Math.cos(cameraPolar) * cameraDistance,
      cameraTarget.z + Math.cos(cameraAzimuth) * sinPolar * cameraDistance
    );
    camera.lookAt(cameraTarget);
    fitCamera(camera, canvas.clientWidth / Math.max(1, canvas.clientHeight));
  };
  updateCamera();

  scene.add(new THREE.HemisphereLight('#ffffff', '#a9b5ab', 0.5));
  scene.add(new THREE.AmbientLight('#ffffff', 0.45));
  const keyLight = new THREE.DirectionalLight('#ffffff', 0.3);
  keyLight.position.set(-1.5, 7, 4.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.bias = -0.0003;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight('#e6eceb', 0.1);
  fillLight.position.set(3, 4, -5);
  scene.add(fillLight);

  const standard = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.68, ...options });
  const surfaceBaseColor = '#f6f6f3';
  const mats = {
    tableTop: new THREE.MeshPhysicalMaterial({ color: '#c4a57c', roughness: 0.96, metalness: 0, clearcoat: 0 }),
    tableEdge: standard('#67503b', { roughness: 0.58 }),
    frame: standard('#84918e', { metalness: 0.42, roughness: 0.36 }),
    lampBody: standard('#35433d', { metalness: 0.2, roughness: 0.48 }),
    lampTrim: standard('#60736a', { metalness: 0.25, roughness: 0.4 }),
    mirror: new THREE.MeshPhysicalMaterial({ color: '#dce4e2', metalness: 0.96, roughness: 0.035, clearcoat: 0.65, clearcoatRoughness: 0.03 }),
    mirrorBacking: standard('#7c8885', { metalness: 0.3, roughness: 0.38 }),
  };

  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 512;
  woodCanvas.height = 256;
  const woodContext = woodCanvas.getContext('2d');
  const woodGradient = woodContext.createLinearGradient(0, 0, 0, 256);
  woodGradient.addColorStop(0, '#c7a47a');
  woodGradient.addColorStop(0.5, '#d2b48c');
  woodGradient.addColorStop(1, '#b89166');
  woodContext.fillStyle = woodGradient;
  woodContext.fillRect(0, 0, 512, 256);
  let woodSeed = 23;
  const woodRandom = () => { woodSeed = (woodSeed * 1664525 + 1013904223) % 4294967296; return woodSeed / 4294967296; };
  for (let line = 0; line < 90; line += 1) {
    const y = woodRandom() * 256;
    woodContext.beginPath();
    woodContext.moveTo(0, y);
    for (let x = 0; x <= 512; x += 64) woodContext.quadraticCurveTo(x + 32, y + (woodRandom() - 0.5) * 8, x + 64, y + (woodRandom() - 0.5) * 4);
    woodContext.strokeStyle = woodRandom() > 0.5 ? `rgba(74,45,27,${0.025 + woodRandom() * 0.035})` : `rgba(255,235,202,${0.025 + woodRandom() * 0.035})`;
    woodContext.lineWidth = 0.5 + woodRandom() * 1.1;
    woodContext.stroke();
  }
  const woodTexture = new THREE.CanvasTexture(woodCanvas);
  woodTexture.colorSpace = THREE.SRGBColorSpace;
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.repeat.set(2.2, 1.3);
  mats.tableTop.map = woodTexture;
  mats.tableTop.needsUpdate = true;

  const addBox = (parent, size, position, material, castShadow = true, receiveShadow = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    parent.add(mesh);
    return mesh;
  };

  // Two separate experiment blocks share one table and use matched light geometry.
  const table = addBox(scene, [8.0, 0.22, 3.9], [0, -0.18, 0], mats.tableTop);
  table.receiveShadow = true;
  addBox(scene, [8.0, 0.14, 3.9], [0, -0.36, 0], mats.tableEdge);
  for (const x of [-3.5, 3.5]) {
    for (const z of [-1.55, 1.55]) addBox(scene, [0.16, 0.66, 0.16], [x, -0.75, z], mats.tableEdge);
  }

  const mirrorCenter = new THREE.Vector3(-1.85, 0.13, 0);
  const paperCenter = new THREE.Vector3(1.85, 0.13, 0);
  const stationBase = (center, accent) => {
    // Keep the raised mounts from producing heavy black patches on the desk.
    addBox(scene, [2.7, 0.12, 2.1], [center.x, -0.005, center.z], mats.frame, false, true);
    addBox(scene, [2.55, 0.035, 1.95], [center.x, 0.072, center.z], accent, false, true);
  };
  stationBase(mirrorCenter, mats.mirrorBacking);
  stationBase(paperCenter, mats.mirrorBacking);
  // A flat polished mirror tile and a visually flat sheet of matte paper.
  const mirrorTile = addBox(scene, [2.45, 0.025, 1.8], [mirrorCenter.x, 0.1175, mirrorCenter.z], mats.mirror, false, true);

  const roughTextureCanvas = document.createElement('canvas');
  roughTextureCanvas.width = 512;
  roughTextureCanvas.height = 512;
  const roughContext = roughTextureCanvas.getContext('2d');
  roughContext.fillStyle = '#ffffff';
  roughContext.fillRect(0, 0, 512, 512);
  let seed = 19;
  const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let i = 0; i < 8500; i += 1) {
    const x = random() * 512, y = random() * 512;
    roughContext.strokeStyle = `rgba(90,84,65,${0.025 + random() * 0.09})`;
    roughContext.lineWidth = 0.5 + random();
    roughContext.beginPath();
    roughContext.moveTo(x, y);
    roughContext.lineTo(x + 2 + random() * 6, y + (random() - 0.5) * 5);
    roughContext.stroke();
  }
  const roughTexture = new THREE.CanvasTexture(roughTextureCanvas);
  roughTexture.colorSpace = THREE.SRGBColorSpace;
  roughTexture.wrapS = roughTexture.wrapT = THREE.RepeatWrapping;
  const roughBump = roughTexture.clone();
  roughBump.colorSpace = THREE.NoColorSpace;
  roughBump.needsUpdate = true;
  const roughMaterial = new THREE.MeshStandardMaterial({ map: roughTexture, bumpMap: roughBump, bumpScale: 0.001, color: surfaceBaseColor, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  const paperTile = addBox(scene, [2.45, 0.018, 1.8], [paperCenter.x, 0.121, paperCenter.z], roughMaterial, false, true);
  const surfaceLabelTextures = [];
  const addSurfaceLabel = (center, title) => {
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512;
    labelCanvas.height = 180;
    const context = labelCanvas.getContext('2d');
    context.fillStyle = '#f4f2eb';
    context.beginPath();
    context.roundRect(16, 12, 480, 156, 28);
    context.fill();
    context.strokeStyle = '#d2c9b6';
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = '#263a34';
    context.font = '700 64px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(title, 256, 90);
    const texture = new THREE.CanvasTexture(labelCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    surfaceLabelTextures.push(texture);
    const tag = new THREE.Group();
    tag.position.set(center.x, 0.12, 1.38);
    tag.rotation.x = -Math.PI / 4;
    const backing = new THREE.Mesh(
      new THREE.PlaneGeometry(1.96, 0.56),
      new THREE.MeshBasicMaterial({ color: '#c3cbc4', toneMapped: false, side: THREE.DoubleSide })
    );
    tag.add(backing);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 0.52),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false })
    );
    label.position.z = 0.003;
    tag.add(label);
    scene.add(tag);
    tag.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(tag);
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) framingPoints.push(new THREE.Vector3(x, y, z));
  };
  addSurfaceLabel(mirrorCenter, '平面鏡');
  addSurfaceLabel(paperCenter, '霧面白紙');
  // Aim the plane mirror's reflected beam toward the initial observer so the
  // specular reflection is clear as soon as the left flashlight is switched on.
  // The second lamp keeps the same incident direction to isolate surface texture.
  const initialViewDirection = camera.position.clone().sub(cameraTarget).normalize();
  const mirrorReflectionDirection = initialViewDirection.clone();
  const incidentTowardMirror = mirrorReflectionDirection.clone().reflect(new THREE.Vector3(0, 1, 0));
  const mirrorSource = mirrorCenter.clone().addScaledVector(incidentTowardMirror, -2.8);
  const sourceOffset = mirrorSource.clone().sub(mirrorCenter);
  const stations = [
    { surface: mirrorCenter, source: mirrorSource },
    { surface: paperCenter, source: paperCenter.clone().add(sourceOffset) }
  ];
  const lamps = [];
  const lampLenses = [];
  const lampIndicators = [];
  const sourceGlows = [];
  const spotLights = [];
  for (const station of stations) {
    const target = station.surface.clone();
    const direction = target.clone().sub(station.source).normalize();
    const lamp = new THREE.Group();
    lamp.position.copy(station.source);
    lamp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    lamp.scale.setScalar(1.15);
    scene.add(lamp);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.58, 28), mats.lampBody);
    barrel.position.y = -0.29;
    barrel.castShadow = true;
    lamp.add(barrel);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.2, 28), mats.lampTrim);
    head.position.y = 0.02;
    lamp.add(head);
    const lensMaterial = new THREE.MeshStandardMaterial({ color: '#35423a', emissive: '#fff0b8', emissiveIntensity: 0, roughness: 0.18, side: THREE.DoubleSide });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.16, 36), lensMaterial);
    lens.position.y = 0.125;
    lens.rotation.x = -Math.PI / 2;
    lamp.add(lens);
    lampLenses.push(lensMaterial);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.022, 10, 36), mats.lampTrim);
    rim.position.y = 0.13;
    rim.rotation.x = -Math.PI / 2;
    lamp.add(rim);
    const indicatorMaterial = new THREE.MeshStandardMaterial({ color: '#465b4c', emissive: '#ffdb88', emissiveIntensity: 0, roughness: 0.4 });
    const indicator = new THREE.Mesh(new THREE.CylinderGeometry(0.222, 0.211, 0.045, 32), indicatorMaterial);
    indicator.position.y = 0.075;
    lamp.add(indicator);
    lampIndicators.push(indicatorMaterial);
    lamps.push(lamp);
    const sourceGlow = new THREE.PointLight('#fff0c7', 0, 0.65);
    sourceGlow.position.copy(station.source);
    scene.add(sourceGlow);
    sourceGlows.push(sourceGlow);
    // A matched narrow cone fits on each enlarged tile, rather than lighting
    // conspicuous patches on the wood in front of the samples.
    const spotLight = new THREE.SpotLight('#ffffff', 0, 9, 0.12, 0.45, 2);
    spotLight.position.copy(station.source);
    spotLight.target.position.copy(target);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.set(768, 768);
    spotLight.shadow.bias = -0.0002;
    scene.add(spotLight, spotLight.target);
    spotLights.push(spotLight);
    station.target = target;
    lamp.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(lamp);
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) framingPoints.push(new THREE.Vector3(x, y, z));
  }
  for (const tile of [mirrorTile, paperTile]) {
    tile.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(tile);
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) framingPoints.push(new THREE.Vector3(x, y, z));
  }

  // A uniform ambient environment keeps the polished surface readable.
  // Flashlight models are excluded; the direct spotlight provides the glint.
  const mirrorEnvironmentTarget = new THREE.WebGLCubeRenderTarget(128, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter
  });
  const mirrorEnvironmentCamera = new THREE.CubeCamera(0.1, 24, mirrorEnvironmentTarget);
  mirrorEnvironmentCamera.position.set(mirrorCenter.x, 0.14, mirrorCenter.z);
  const mirrorEnvironmentScene = new THREE.Scene();
  mirrorEnvironmentScene.background = scene.background;
  mats.mirror.envMap = mirrorEnvironmentTarget.texture;
  mats.mirror.envMapIntensity = 0.35;
  const refreshMirrorEnvironment = () => {
    // Reflect only the bright background. The direct spotlight still reaches
    // the mirror in the main scene, but flashlight models cannot appear in it.
    mirrorEnvironmentCamera.update(renderer, mirrorEnvironmentScene);
  };
  refreshMirrorEnvironment();

  const duration = 1150;
  const render = () => renderer.render(scene, camera);
  const updateViewControls = () => {
    const normalizedAzimuth = Math.atan2(Math.sin(cameraAzimuth), Math.cos(cameraAzimuth));
    const current = Object.keys(viewPresets).find(key => Math.abs(normalizedAzimuth - viewPresets[key]) < 0.001 && Math.abs(cameraPolar - frontPolar) < 0.001);
    viewButtons.forEach(button => {
      const pressed = String(button.dataset.reflectionView === current);
      if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
    });
    const label = '目前觀看位置：' + (current ? { front: '正面', left: '稍向左', right: '稍向右' }[current] : '自由觀看');
    if (viewStatus.textContent !== label) viewStatus.textContent = label;
    canvas.dataset.view = current || 'free';
  };
  viewButtons.forEach(button => button.addEventListener('click', () => {
    cameraAzimuth = viewPresets[button.dataset.reflectionView];
    cameraPolar = frontPolar;
    updateCamera();
    updateViewControls();
    render();
  }));
  const raycaster = new THREE.Raycaster();
  const pointerPosition = new THREE.Vector2();
  const flashlightIndexAtPointer = (event) => {
    const bounds = canvas.getBoundingClientRect();
    pointerPosition.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1
    );
    raycaster.setFromCamera(pointerPosition, camera);
    return lamps.findIndex((lamp) => raycaster.intersectObject(lamp, true).length > 0 || raycaster.ray.distanceToPoint(lamp.position) < 0.42);
  };

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    pointerDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
    canvas.classList.remove('is-pointing-source');
    // touch-action handles touch dragging without suppressing the browser's
    // later native button clicks. Mouse dragging still prevents selection.
    if (event.pointerType !== 'touch') event.preventDefault();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!pointerDrag || pointerDrag.id !== event.pointerId) {
      if (event.pointerType !== 'touch') canvas.classList.toggle('is-pointing-source', flashlightIndexAtPointer(event) >= 0);
      return;
    }
    const deltaX = event.clientX - pointerDrag.x;
    const deltaY = event.clientY - pointerDrag.y;
    if (Math.hypot(event.clientX - pointerDrag.startX, event.clientY - pointerDrag.startY) > 6) pointerDrag.moved = true;
    pointerDrag.x = event.clientX;
    pointerDrag.y = event.clientY;
    cameraAzimuth -= deltaX * 0.008;
    cameraPolar = THREE.MathUtils.clamp(cameraPolar + deltaY * 0.008, 0.2, 1.48);
    updateCamera();
    updateViewControls();
    render();
  });
  const endPointerDrag = (event) => {
    if (!pointerDrag || pointerDrag.id !== event.pointerId) return;
    const clickedFlashlight = event.type === 'pointerup' && !pointerDrag.moved ? flashlightIndexAtPointer(event) : -1;
    pointerDrag = null;
    canvas.classList.remove('is-dragging');
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (clickedFlashlight >= 0) toggleLight(clickedFlashlight);
  };
  canvas.addEventListener('pointerup', endPointerDrag);
  canvas.addEventListener('pointercancel', endPointerDrag);
  canvas.addEventListener('lostpointercapture', () => { pointerDrag = null; canvas.classList.remove('is-dragging'); });
  const illuminationLevels = [0, 0];
  const setIllumination = (index, level) => {
    illuminationLevels[index] = level;
    spotLights[index].intensity = 17 * level;
    sourceGlows[index].intensity = 0.35 * level;
    lampLenses[index].color.set(level > 0 ? '#fff2bf' : '#35423a');
    lampLenses[index].emissiveIntensity = 2.5 * level;
    lampIndicators[index].emissiveIntensity = 1.4 * level;
    render();
  };

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    updateCamera();
    render();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const animationFrames = [0, 0];
  const illuminated = [false, false];
  const updateLightControls = () => {
    illuminated.forEach((isOn, index) => {
      fireButtons[index].querySelector('small').textContent = isOn ? '已開啟' : '已關閉';
      fireButtons[index].setAttribute('aria-pressed', String(isOn));
      fireButtons[index].setAttribute('aria-label', `${isOn ? '關閉' : '開啟'}${index === 0 ? '鏡面' : '霧面紙'}手電筒`);
    });
    status.textContent = `照向平面鏡的手電筒${illuminated[0] ? '已開啟' : '已關閉'}；照向霧面紙的手電筒${illuminated[1] ? '已開啟' : '已關閉'}。`;
  };
  const toggleLight = (index) => {
    cancelAnimationFrame(animationFrames[index]);
    illuminated[index] = !illuminated[index];
    const startLevel = illuminationLevels[index];
    const targetLevel = illuminated[index] ? 1 : 0;
    updateLightControls();
    if (reducedMotion.matches) {
      setIllumination(index, targetLevel);
      refreshMirrorEnvironment();
      return;
    }
    const startedAt = performance.now();
    const animate = (now) => {
      const progress = THREE.MathUtils.clamp((now - startedAt) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setIllumination(index, startLevel + (targetLevel - startLevel) * eased);
      if (progress < 1) animationFrames[index] = requestAnimationFrame(animate);
      else refreshMirrorEnvironment();
    };
    animationFrames[index] = requestAnimationFrame(animate);
  };
  fireButtons.forEach((button, index) => button.addEventListener('click', () => toggleLight(index)));
  const applyReference = () => {
    if (referenceMatchButton.disabled) return;
    cameraAzimuth = viewPresets.front;
    cameraPolar = frontPolar;
    updateCamera();
    updateViewControls();
    animationFrames.forEach(frame => cancelAnimationFrame(frame));
    illuminated.fill(true);
    setIllumination(0, 1);
    setIllumination(1, 1);
    updateLightControls();
    render();
    canvas.focus({ preventScroll: true });
    canvas.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  };
  // Some touch browsers suppress the compatibility click after a 3D drag.
  // Accept a stationary native touch release, without treating scrolling as
  // a tap or applying the action again when the regular click follows.
  let referenceTouch = null, handledReferenceTouch = false;
  referenceMatchButton.addEventListener('pointerdown', event => {
    handledReferenceTouch = false;
    referenceTouch = event.pointerType === 'touch' && event.isPrimary
      ? { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false } : null;
  });
  referenceMatchButton.addEventListener('pointermove', event => {
    if (referenceTouch?.id === event.pointerId && Math.hypot(event.clientX - referenceTouch.x, event.clientY - referenceTouch.y) > 8) referenceTouch.moved = true;
  });
  referenceMatchButton.addEventListener('pointercancel', () => { referenceTouch = null; handledReferenceTouch = false; });
  referenceMatchButton.addEventListener('pointerup', event => {
    const contact = referenceTouch;
    referenceTouch = null;
    if (!contact || contact.id !== event.pointerId || contact.moved) return;
    const bounds = referenceMatchButton.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) return;
    handledReferenceTouch = true;
    applyReference();
  });
  referenceMatchButton.addEventListener('click', event => {
    if (handledReferenceTouch && (event.pointerType === 'touch' || event.detail > 0)) { handledReferenceTouch = false; return; }
    applyReference();
  });
  [...fireButtons, ...viewButtons, referenceMatchButton].forEach(button => { button.disabled = false; });
  updateLightControls();
  updateViewControls();
  canvas.dataset.ready = 'true';

  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', () => {
    animationFrames.forEach((frame) => cancelAnimationFrame(frame));
    resizeObserver.disconnect();
    window.removeEventListener('resize', resize);
    // Dispose GPU resources while their renderer property cache still exists.
    roughTexture.dispose();
    roughBump.dispose();
    surfaceLabelTextures.forEach((texture) => texture.dispose());
    woodTexture.dispose();
    mirrorEnvironmentTarget.dispose();
    renderer.dispose();
  }, { once: true });
} catch (error) {
  console.error('Unable to initialize the 3D reflection scene:', error);
  canvas.hidden = true;
  comparison.hidden = true;
  fallback.hidden = false;
  [...fireButtons, ...viewButtons, referenceMatchButton].forEach((button) => { button.disabled = true; });
  canvas.dataset.ready = 'error';
  status.textContent = '目前裝置無法呈現 3D 場景；請閱讀卡片說明了解反射差異。';
}
