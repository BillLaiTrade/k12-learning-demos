import * as THREE from '../../1.1/assets/vendor/three/build/three.module.js';

const canvas = document.querySelector('#reflection-3d-scene');
if (!canvas) throw new Error('Reflection scene canvas is missing.');

const fireButtons = [
  document.querySelector('#reflection-fire-mirror'),
  document.querySelector('#reflection-fire-paper')
];
const status = document.querySelector('#reflection-status');
const fallback = document.querySelector('#reflection-fallback');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

try {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#394541');
  scene.fog = new THREE.Fog('#394541', 11, 22);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 45);
  const cameraTarget = new THREE.Vector3(-0.05, 0.38, 0);
  const cameraOffset = new THREE.Vector3(-3.0, 3.6, 9.2);
  const cameraDistance = cameraOffset.length();
  let cameraAzimuth = Math.atan2(cameraOffset.x, cameraOffset.z);
  let cameraPolar = Math.acos(cameraOffset.y / cameraDistance);
  let pointerDrag = null;
  const updateCamera = (distance = cameraDistance) => {
    const sinPolar = Math.sin(cameraPolar);
    camera.position.set(
      cameraTarget.x + Math.sin(cameraAzimuth) * sinPolar * distance,
      cameraTarget.y + Math.cos(cameraPolar) * distance,
      cameraTarget.z + Math.cos(cameraAzimuth) * sinPolar * distance
    );
    camera.lookAt(cameraTarget);
  };
  updateCamera();

  scene.add(new THREE.HemisphereLight('#fff1d5', '#334744', 0.42));
  const keyLight = new THREE.DirectionalLight('#ffe2ac', 0.55);
  keyLight.position.set(-1.5, 7, 4.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.bias = -0.0003;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight('#9eb9c4', 0.16);
  fillLight.position.set(3, 4, -5);
  scene.add(fillLight);

  const standard = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.68, ...options });
  const surfaceBaseColor = '#deded8';
  const mats = {
    tableTop: new THREE.MeshPhysicalMaterial({ color: '#c4a57c', roughness: 0.48, metalness: 0.015, clearcoat: 0.16, clearcoatRoughness: 0.58 }),
    tableEdge: standard('#67503b', { roughness: 0.58 }),
    source: standard('#273330', { metalness: 0.32, roughness: 0.38 }),
    frame: standard('#52645e', { metalness: 0.55, roughness: 0.34 }),
    // Match the paper's neutral base tint while retaining a narrow mirror
    // highlight; the environment map supplies reflections from the lab scene.
    mirror: new THREE.MeshPhysicalMaterial({ color: surfaceBaseColor, metalness: 0.12, roughness: 0.035, clearcoat: 1, clearcoatRoughness: 0.02 }),
    mirrorBacking: standard('#374743', { metalness: 0.38, roughness: 0.3 }),
    paper: new THREE.MeshStandardMaterial({ color: surfaceBaseColor, roughness: 0.9, side: THREE.DoubleSide }),
    paperFrame: standard('#66776e', { metalness: 0.22, roughness: 0.5 }),
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
  const table = addBox(scene, [8.8, 0.22, 4.15], [0, -0.18, 0], mats.tableTop);
  table.receiveShadow = true;
  addBox(scene, [8.8, 0.14, 4.15], [0, -0.36, 0], mats.tableEdge);
  for (const x of [-3.7, 3.7]) {
    for (const z of [-1.55, 1.55]) addBox(scene, [0.16, 0.66, 0.16], [x, -0.75, z], mats.tableEdge);
  }

  const mirrorCenter = new THREE.Vector3(-1.85, 0.114, -0.78);
  const paperCenter = new THREE.Vector3(1.75, 0.114, 0.78);
  const stationBase = (center, accent) => {
    addBox(scene, [1.9, 0.12, 1.55], [center.x, -0.005, center.z], mats.frame);
    addBox(scene, [1.7, 0.035, 1.35], [center.x, 0.072, center.z], accent);
  };
  stationBase(mirrorCenter, mats.mirrorBacking);
  stationBase(paperCenter, mats.mirrorBacking);
  // A flat polished mirror tile and a visually flat sheet of matte paper.
  const mirrorTile = addBox(scene, [1.55, 0.025, 1.18], [mirrorCenter.x, 0.102, mirrorCenter.z], mats.mirror);

  const roughTextureCanvas = document.createElement('canvas');
  roughTextureCanvas.width = 256;
  roughTextureCanvas.height = 256;
  const roughContext = roughTextureCanvas.getContext('2d');
  roughContext.fillStyle = surfaceBaseColor;
  roughContext.fillRect(0, 0, 256, 256);
  let seed = 19;
  const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let i = 0; i < 1800; i += 1) {
    const shade = random() > 0.52 ? '255,255,255' : '38,42,40';
    roughContext.fillStyle = `rgba(${shade},${0.035 + random() * 0.11})`;
    const size = 1 + random() * 4;
    roughContext.fillRect(random() * 256, random() * 256, size, size);
  }
  const roughTexture = new THREE.CanvasTexture(roughTextureCanvas);
  roughTexture.colorSpace = THREE.SRGBColorSpace;
  roughTexture.wrapS = roughTexture.wrapT = THREE.RepeatWrapping;
  roughTexture.repeat.set(2, 1.4);
  const roughMaterial = new THREE.MeshStandardMaterial({ map: roughTexture, color: surfaceBaseColor, roughness: 0.98, metalness: 0, side: THREE.DoubleSide });
  addBox(scene, [1.55, 0.018, 1.18], [paperCenter.x, 0.102, paperCenter.z], roughMaterial, false, true);
  // Start slightly outside the mirror's specular direction so the matte paper
  // remains visible while the mirror sends its reflected light away from view.
  // The second lamp uses the same incident direction, so only the surface changes.
  const initialViewDirection = camera.position.clone().sub(mirrorCenter).normalize();
  const mirrorReflectionDirection = initialViewDirection.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(5));
  const incidentTowardMirror = mirrorReflectionDirection.clone().reflect(new THREE.Vector3(0, 1, 0));
  const mirrorSource = mirrorCenter.clone().addScaledVector(incidentTowardMirror, -3.2);
  const sourceOffset = mirrorSource.clone().sub(mirrorCenter);
  const stations = [
    { surface: mirrorCenter, source: mirrorSource },
    { surface: paperCenter, source: paperCenter.clone().add(sourceOffset) }
  ];
  const lamps = [];
  const lampLenses = [];
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
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.58, 28), mats.source);
    barrel.position.y = -0.29;
    barrel.castShadow = true;
    lamp.add(barrel);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.2, 28), mats.frame);
    head.position.y = 0.02;
    lamp.add(head);
    const lensMaterial = new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#ffc653', emissiveIntensity: 0, roughness: 0.18 });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.16, 36), lensMaterial);
    lens.position.y = 0.125;
    lamp.add(lens);
    lampLenses.push(lensMaterial);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.022, 10, 36), mats.frame);
    rim.position.y = 0.13;
    lamp.add(rim);
    lamps.push(lamp);
    const sourceGlow = new THREE.PointLight('#ffffff', 0, 1.4);
    sourceGlow.position.copy(station.source);
    scene.add(sourceGlow);
    sourceGlows.push(sourceGlow);
    const spotLight = new THREE.SpotLight('#ffffff', 0, 9, 0.28, 0.42, 1.4);
    spotLight.position.copy(station.source);
    spotLight.target.position.copy(target);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.set(768, 768);
    spotLight.shadow.bias = -0.0002;
    scene.add(spotLight, spotLight.target);
    spotLights.push(spotLight);
    station.target = target;

  }

  // Capture the nearby scene as a dynamic environment map for the mirror.
  // This supplies actual reflected surroundings instead of rendering an
  // unlit, fully metallic surface as black.
  const mirrorEnvironmentTarget = new THREE.WebGLCubeRenderTarget(128, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter
  });
  const mirrorEnvironmentCamera = new THREE.CubeCamera(0.1, 24, mirrorEnvironmentTarget);
  mirrorEnvironmentCamera.position.set(mirrorCenter.x, 0.14, mirrorCenter.z);
  mats.mirror.envMap = mirrorEnvironmentTarget.texture;
  mats.mirror.envMapIntensity = 0.25;
  const refreshMirrorEnvironment = () => {
    mirrorTile.visible = false;
    mirrorEnvironmentCamera.update(renderer, scene);
    mirrorTile.visible = true;
  };
  refreshMirrorEnvironment();

  let startedAt = 0;
  const duration = 1150;
  const render = () => renderer.render(scene, camera);
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
    event.preventDefault();
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
    updateCamera(cameraDistance * (camera.aspect < 1.1 ? 1.08 : 1));
    render();
  });
  const endPointerDrag = (event) => {
    if (!pointerDrag || pointerDrag.id !== event.pointerId) return;
    const clickedFlashlight = event.type === 'pointerup' && !pointerDrag.moved ? flashlightIndexAtPointer(event) : -1;
    pointerDrag = null;
    canvas.classList.remove('is-dragging');
    if (clickedFlashlight >= 0) fireLight(clickedFlashlight);
  };
  canvas.addEventListener('pointerup', endPointerDrag);
  canvas.addEventListener('pointercancel', endPointerDrag);
  const setIllumination = (index, progress) => {
    const eased = 1 - Math.pow(1 - progress, 3);
    spotLights[index].intensity = 75 * eased;
    sourceGlows[index].intensity = 0.65 * eased;
    lampLenses[index].emissiveIntensity = 1.8 * eased;
    if (progress >= 1) refreshMirrorEnvironment();
    render();
  };

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = camera.aspect < 1.1 ? 46 : 39;
    const zoom = camera.aspect < 1.1 ? 1.08 : 1;
    updateCamera(cameraDistance * zoom);
    camera.updateProjectionMatrix();
    render();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  const animationFrames = [0, 0];
  const illuminated = [false, false];
  const fireLight = (index) => {
    cancelAnimationFrame(animationFrames[index]);
    illuminated[index] = true;
    fireButtons[index].querySelector('small').textContent = '再照一次';
    fireButtons[index].setAttribute('aria-pressed', 'true');
    const chosen = index === 0 ? '左側平面鏡已點亮：反光集中在特定方向；轉動視角觀察反光變化。' : '右側霧面紙已點亮：漫反射會讓表面從較多方向看起來明亮。';
    const other = illuminated[1 - index]
      ? (index === 0 ? '右側霧面紙也已點亮。' : '左側平面鏡也已點亮。')
      : (index === 0 ? '右側霧面紙仍未點亮。' : '左側平面鏡仍未點亮。');
    status.textContent = `${chosen} ${other}`;
    if (reducedMotion.matches) {
      setIllumination(index, 1);
      return;
    }
    const startedAt = performance.now();
    const animate = (now) => {
      const progress = THREE.MathUtils.clamp((now - startedAt) / duration, 0, 1);
      setIllumination(index, progress);
      if (progress < 1) animationFrames[index] = requestAnimationFrame(animate);
    };
    animationFrames[index] = requestAnimationFrame(animate);
  };
  fireButtons.forEach((button, index) => button.addEventListener('click', () => fireLight(index)));

  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', () => {
    animationFrames.forEach((frame) => cancelAnimationFrame(frame));
    renderer.dispose();
    roughTexture.dispose();
    woodTexture.dispose();
    mirrorEnvironmentTarget.dispose();
  }, { once: true });
} catch (error) {
  console.error('Unable to initialize the 3D reflection scene:', error);
  canvas.hidden = true;
  fallback.hidden = false;
  fireButtons.forEach((button) => { button.disabled = true; });
  status.textContent = '目前裝置無法呈現 3D 場景；請閱讀卡片說明了解反射差異。';
}
