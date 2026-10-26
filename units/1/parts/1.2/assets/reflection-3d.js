import * as THREE from '../../1.1/assets/vendor/three/build/three.module.js';

const canvas = document.querySelector('#reflection-3d-scene');
if (!canvas) throw new Error('Reflection scene canvas is missing.');

const button = document.querySelector('#reflection-fire');
const status = document.querySelector('#reflection-status');
const fallback = document.querySelector('#reflection-fallback');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

try {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#202b2a');
  scene.fog = new THREE.Fog('#202b2a', 11, 22);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 45);
  const cameraTarget = new THREE.Vector3(-0.05, 0.38, 0);
  const cameraOffset = new THREE.Vector3(-4.7, 3.35, 7.4);
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

  scene.add(new THREE.HemisphereLight('#fff1d5', '#334744', 1.45));
  const keyLight = new THREE.DirectionalLight('#ffe2ac', 2.15);
  keyLight.position.set(-1.5, 7, 4.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.bias = -0.0003;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight('#9eb9c4', 0.65);
  fillLight.position.set(3, 4, -5);
  scene.add(fillLight);

  const standard = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.68, ...options });
  const mats = {
    tableTop: new THREE.MeshPhysicalMaterial({ color: '#c4a57c', roughness: 0.48, metalness: 0.015, clearcoat: 0.16, clearcoatRoughness: 0.58 }),
    tableEdge: standard('#67503b', { roughness: 0.58 }),
    source: standard('#273330', { metalness: 0.32, roughness: 0.38 }),
    sourceLens: new THREE.MeshStandardMaterial({ color: '#fff0c0', emissive: '#f4a72f', emissiveIntensity: 0.22, roughness: 0.22 }),
    frame: standard('#52645e', { metalness: 0.55, roughness: 0.34 }),
    mirror: new THREE.MeshPhysicalMaterial({ color: '#cbd6d2', metalness: 0.18, roughness: 0.055, clearcoat: 1, clearcoatRoughness: 0.025 }),
    mirrorBacking: standard('#374743', { metalness: 0.38, roughness: 0.3 }),
    paper: new THREE.MeshStandardMaterial({ color: '#f5f1e6', roughness: 0.84, side: THREE.DoubleSide }),
    paperFrame: standard('#66776e', { metalness: 0.22, roughness: 0.5 }),
    spot: new THREE.MeshBasicMaterial({ color: '#fff1a6', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    spotGlow: new THREE.MeshBasicMaterial({ color: '#ffcb55', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    beam: new THREE.MeshBasicMaterial({ color: '#ffcf71', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    beamBounce: new THREE.MeshBasicMaterial({ color: '#ffe29b', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    roughRay: new THREE.MeshBasicMaterial({ color: '#f47b20', transparent: true, opacity: 0, depthTest: false, depthWrite: false, side: THREE.DoubleSide }),
    dust: new THREE.PointsMaterial({ color: '#ffe5ad', size: 0.055, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true }),
    roughGlow: new THREE.PointLight('#ffd27a', 0, 3.3, 2)
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

  // A real tabletop holds the two sample stations: the mirror is at the far side,
  // and the rough material is at the near side. Both are level with one another.
  const table = addBox(scene, [7.7, 0.22, 3.55], [0, -0.18, 0], mats.tableTop);
  table.receiveShadow = true;
  addBox(scene, [7.7, 0.14, 3.55], [0, -0.36, 0], mats.tableEdge);
  for (const x of [-3.15, 3.15]) {
    for (const z of [-1.32, 1.32]) addBox(scene, [0.16, 0.66, 0.16], [x, -0.75, z], mats.tableEdge);
  }

  // One handheld lamp has a broad, diverging spotlight; its cone reaches both samples.
  const source = new THREE.Vector3(-3.0, 1.62, 0);
  const aim = new THREE.Vector3(-0.15, 0.05, 0);
  const lampDirection = aim.clone().sub(source).normalize();
  const lamp = new THREE.Group();
  lamp.position.copy(source);
  lamp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), lampDirection);
  scene.add(lamp);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.62, 32), mats.source);
  barrel.position.y = -0.31;
  barrel.castShadow = true;
  lamp.add(barrel);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.17, 0.22, 32), mats.frame);
  head.position.y = 0.02;
  lamp.add(head);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.185, 40), mats.sourceLens);
  lens.position.y = 0.135;
  lamp.add(lens);
  const emitterRim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 10, 40), mats.frame);
  emitterRim.position.y = 0.14;
  lamp.add(emitterRim);
  const sourceGlow = new THREE.PointLight('#ffc864', 0.3, 1.8);
  sourceGlow.position.copy(source);
  scene.add(sourceGlow);

  const spotLight = new THREE.SpotLight('#ffe1a3', 0, 11, 0.49, 0.24, 1.4);
  spotLight.position.copy(source);
  spotLight.target.position.copy(aim);
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.set(1024, 1024);
  spotLight.shadow.bias = -0.0002;
  scene.add(spotLight, spotLight.target);

  const makeSampleBase = (z, accent) => {
    addBox(scene, [1.55, 0.12, 1.08], [-0.15, -0.02, z], mats.frame);
    addBox(scene, [1.38, 0.07, 0.92], [-0.15, 0.075, z], accent);
  };
  makeSampleBase(-0.66, mats.mirrorBacking);
  const mirrorGeometry = new THREE.PlaneGeometry(1.32, 0.86);
  mirrorGeometry.rotateX(-Math.PI / 2);
  const mirrorSurface = new THREE.Mesh(mirrorGeometry, mats.mirror);
  mirrorSurface.position.set(-0.15, 0.114, -0.66);
  mirrorSurface.receiveShadow = true;
  scene.add(mirrorSurface);

  const roughTextureCanvas = document.createElement('canvas');
  roughTextureCanvas.width = 256;
  roughTextureCanvas.height = 256;
  const roughContext = roughTextureCanvas.getContext('2d');
  roughContext.fillStyle = '#8a806e';
  roughContext.fillRect(0, 0, 256, 256);
  let seed = 19;
  const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let i = 0; i < 1800; i += 1) {
    const shade = random() > 0.52 ? '255,245,220' : '41,48,43';
    roughContext.fillStyle = `rgba(${shade},${0.035 + random() * 0.11})`;
    const size = 1 + random() * 4;
    roughContext.fillRect(random() * 256, random() * 256, size, size);
  }
  const roughTexture = new THREE.CanvasTexture(roughTextureCanvas);
  roughTexture.colorSpace = THREE.SRGBColorSpace;
  roughTexture.wrapS = roughTexture.wrapT = THREE.RepeatWrapping;
  roughTexture.repeat.set(2, 1.4);
  const roughMaterial = new THREE.MeshStandardMaterial({ map: roughTexture, color: '#b7aa91', roughness: 0.98, metalness: 0.01, side: THREE.DoubleSide });
  makeSampleBase(0.66, mats.tableEdge);
  const roughGeometry = new THREE.PlaneGeometry(1.32, 0.86, 28, 20);
  const roughPositions = roughGeometry.attributes.position;
  for (let i = 0; i < roughPositions.count; i += 1) {
    const x = roughPositions.getX(i);
    const y = roughPositions.getY(i);
    roughPositions.setZ(i, 0.032 * (Math.sin(x * 27) * Math.cos(y * 31) + 0.48 * Math.sin(x * 47 + y * 19)));
  }
  roughGeometry.rotateX(-Math.PI / 2);
  roughGeometry.computeVertexNormals();
  const roughSurface = new THREE.Mesh(roughGeometry, roughMaterial);
  roughSurface.position.set(-0.15, 0.12, 0.66);
  roughSurface.receiveShadow = true;
  scene.add(roughSurface);

  const mirrorHit = new THREE.Vector3(-0.15, 0.12, -0.66);
  const roughHit = new THREE.Vector3(-0.15, 0.12, 0.66);
  const incident = mirrorHit.clone().sub(source).normalize();
  const normal = new THREE.Vector3(0, 1, 0);
  const reflected = incident.clone().reflect(normal).normalize();
  const mirrorScreenX = 1.4;
  const screenDistance = (mirrorScreenX - mirrorHit.x) / reflected.x;
  const mirrorScreenPoint = mirrorHit.clone().addScaledVector(reflected, screenDistance);
  const screenNormal = reflected.clone().negate().normalize();
  const screenOrientation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), screenNormal);
  const mirrorTarget = new THREE.Group();
  mirrorTarget.position.copy(mirrorScreenPoint);
  mirrorTarget.quaternion.copy(screenOrientation);
  scene.add(mirrorTarget);
  const mirrorCardFrame = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.88, 0.045), mats.paperFrame);
  mirrorCardFrame.castShadow = true;
  mirrorCardFrame.receiveShadow = true;
  mirrorTarget.add(mirrorCardFrame);
  const mirrorCard = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.81), mats.paper);
  mirrorCard.position.z = 0.026;
  mirrorCard.receiveShadow = true;
  mirrorTarget.add(mirrorCard);
  const mirrorSpot = new THREE.Mesh(new THREE.CircleGeometry(0.18, 40), mats.spot);
  mirrorSpot.position.set(0.08, -0.04, 0.035);
  mirrorTarget.add(mirrorSpot);
  const mirrorGlow = new THREE.Mesh(new THREE.CircleGeometry(0.34, 40), mats.spotGlow);
  mirrorGlow.position.set(0.08, -0.04, 0.033);
  mirrorTarget.add(mirrorGlow);

  // Small matte cards around the rough sample make diffuse light visible at several places.
  const roughCards = [];
  const roughSpots = [];
  const makeRoughCard = (position, facing) => {
    const group = new THREE.Group();
    group.position.copy(position);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), facing.clone().normalize());
    scene.add(group);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.045), mats.paperFrame);
    frame.castShadow = true;
    group.add(frame);
    const cardMaterial = new THREE.MeshStandardMaterial({ color: '#85877d', roughness: 0.9, emissive: '#ffd080', emissiveIntensity: 0, side: THREE.DoubleSide });
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.57, 0.73), cardMaterial);
    card.position.z = 0.026;
    group.add(card);
    roughCards.push(cardMaterial);
    const spotGlow = new THREE.Mesh(new THREE.CircleGeometry(0.27, 40), new THREE.MeshBasicMaterial({ color: '#ff9d32', transparent: true, opacity: 0, depthTest: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    spotGlow.position.set(0, 0.015, 0.031);
    spotGlow.renderOrder = 11;
    group.add(spotGlow);
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.16, 40), new THREE.MeshBasicMaterial({ color: '#fff0a2', transparent: true, opacity: 0, depthTest: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    spot.position.set(0, 0.015, 0.033);
    spot.renderOrder = 12;
    group.add(spot);
    roughSpots.push({ glow: spotGlow.material, spot: spot.material });
    return { position, facing: facing.clone().normalize() };
  };
  const roughSource = new THREE.Vector3(0.42, 0.18, 0.66);
  const cardSpecs = [
    [new THREE.Vector3(1.15, 0.52, 0.66), new THREE.Vector3(-1, 0.18, 0)],
    [new THREE.Vector3(-0.85, 0.52, 0.66), new THREE.Vector3(1, 0.2, 0)],
    [new THREE.Vector3(0.06, 0.52, 1.55), new THREE.Vector3(0, 0.2, -1)],
    [new THREE.Vector3(0.06, 0.52, -0.25), new THREE.Vector3(0, 0.2, 1)]
  ];
  const roughTargets = cardSpecs.map(([position, facing]) => makeRoughCard(position, facing));
  mats.roughGlow.position.copy(roughSource);
  scene.add(mats.roughGlow);

  const makeBeamCone = (start, end, radius, material) => {
    const direction = end.clone().sub(start);
    const length = direction.length();
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, length, 28, 1, true), material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize().negate());
    mesh.renderOrder = 2;
    scene.add(mesh);
    return mesh;
  };
  const sourceBeamEnd = new THREE.Vector3(-0.15, 0.12, 0);
  const sourceBeamLength = source.distanceTo(sourceBeamEnd);
  const sourceBeam = makeBeamCone(source, sourceBeamEnd, Math.tan(0.49) * sourceBeamLength, mats.beam);
  const reflectionBeamEnd = mirrorScreenPoint.clone();
  const reflectionBeam = makeBeamCone(mirrorHit, reflectionBeamEnd, Math.min(0.075, Math.tan(0.035) * screenDistance), mats.beamBounce);
  const makeDirectionArrow = (start, end, material) => {
    const direction = end.clone().sub(start);
    const length = direction.length();
    const unitDirection = direction.normalize();
    const headLength = 0.16;
    const shaftLength = length - headLength;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, shaftLength, 10), material);
    shaft.position.copy(start).addScaledVector(unitDirection, shaftLength / 2);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), unitDirection);
    shaft.renderOrder = 10;
    scene.add(shaft);
    const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.11, headLength, 12), material);
    arrowHead.position.copy(end).addScaledVector(unitDirection, -headLength / 2);
    arrowHead.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), unitDirection);
    arrowHead.renderOrder = 10;
    scene.add(arrowHead);
  };
  roughTargets.forEach(({ position, facing }) => {
    const target = position.clone().sub(facing.clone().multiplyScalar(0.035));
    makeDirectionArrow(roughHit.clone().add(new THREE.Vector3(0, 0.025, 0)), target, mats.roughRay);
  });

  const dustGeometry = new THREE.BufferGeometry();
  const dustPositions = [];
  const axis = sourceBeamEnd.clone().sub(source).normalize();
  const tangentA = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 0, 1)).normalize();
  const tangentB = new THREE.Vector3().crossVectors(axis, tangentA).normalize();
  for (let i = 0; i < 110; i += 1) {
    const t = 0.06 + random() * 0.9;
    const angle = random() * Math.PI * 2;
    const radial = Math.sqrt(random()) * Math.tan(0.49) * sourceBeamLength * t * 0.82;
    const point = source.clone().addScaledVector(axis, sourceBeamLength * t)
      .addScaledVector(tangentA, Math.cos(angle) * radial)
      .addScaledVector(tangentB, Math.sin(angle) * radial);
    dustPositions.push(point.x, point.y, point.z);
  }
  dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeometry, mats.dust);
  scene.add(dust);

  let startedAt = 0;
  const duration = 1150;
  const render = () => renderer.render(scene, camera);
  const raycaster = new THREE.Raycaster();
  const pointerPosition = new THREE.Vector2();
  const isOverFlashlight = (event) => {
    const bounds = canvas.getBoundingClientRect();
    pointerPosition.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1
    );
    raycaster.setFromCamera(pointerPosition, camera);
    return raycaster.intersectObject(lamp, true).length > 0;
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
      if (event.pointerType !== 'touch') canvas.classList.toggle('is-pointing-source', isOverFlashlight(event));
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
    const clickedFlashlight = event.type === 'pointerup' && !pointerDrag.moved && isOverFlashlight(event);
    pointerDrag = null;
    canvas.classList.remove('is-dragging');
    if (clickedFlashlight) fireLight();
  };
  canvas.addEventListener('pointerup', endPointerDrag);
  canvas.addEventListener('pointercancel', endPointerDrag);
  const setIllumination = (progress) => {
    const eased = 1 - Math.pow(1 - progress, 3);
    mats.beam.opacity = 0.065 * eased;
    mats.beamBounce.opacity = 0.88 * eased;
    mats.roughRay.opacity = 0.8 * eased;
    mats.dust.opacity = 0.62 * eased;
    spotLight.intensity = 10.5 * eased;
    sourceGlow.intensity = 0.85 * eased;
    mats.roughGlow.intensity = 9.5 * eased;
    mats.spot.opacity = eased;
    mats.spotGlow.opacity = 0.7 * eased;
    mats.paper.emissive = new THREE.Color('#f2bf58');
    mats.paper.emissiveIntensity = 0.12 * eased;
    for (const cardMaterial of roughCards) cardMaterial.emissiveIntensity = 0.9 * eased;
    for (const { glow, spot } of roughSpots) {
      glow.opacity = 0.72 * eased;
      spot.opacity = 0.95 * eased;
    }
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

  let animationFrame = 0;
  const fireLight = () => {
    cancelAnimationFrame(animationFrame);
    button.textContent = '再發出光';
    status.textContent = '看反射光路：平滑表面讓光集中成一束，粗糙表面則把光散向多個方向。';
    if (reducedMotion.matches) {
      setIllumination(1);
      return;
    }
    startedAt = performance.now();
    const animate = (now) => {
      const progress = THREE.MathUtils.clamp((now - startedAt) / duration, 0, 1);
      setIllumination(progress);
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
  };
  button.addEventListener('click', fireLight);

  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(animationFrame);
    renderer.dispose();
    roughTexture.dispose();
    woodTexture.dispose();
  }, { once: true });
} catch (error) {
  console.error('Unable to initialize the 3D reflection scene:', error);
  canvas.hidden = true;
  fallback.hidden = false;
  button.disabled = true;
  status.textContent = '目前裝置無法呈現 3D 場景；請閱讀卡片說明了解反射差異。';
}
