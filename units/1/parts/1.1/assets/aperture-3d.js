import * as THREE from './vendor/three/build/three.module.js?v=known-good-three-20261025';

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

const canvas = document.querySelector('#aperture-3d-scene');
if (canvas) {
  await waitUntilCanvasIsNearViewport(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dce4df');
  scene.fog = new THREE.Fog('#dce4df', 15, 32);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  const target = new THREE.Vector3(0, 1, 0);
  const initialOrbit = { azimuth: -0.66, polar: 1.16, radius: 11.8 };
  let azimuth = initialOrbit.azimuth;
  let polar = initialOrbit.polar;
  let radius = initialOrbit.radius;
  const updateCamera = () => {
    const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
    const responsiveRadius = Math.max(radius, initialOrbit.radius * (1.5 / Math.max(aspect, 0.72)));
    camera.position.set(
      target.x + responsiveRadius * Math.sin(polar) * Math.sin(azimuth),
      target.y + responsiveRadius * Math.cos(polar),
      target.z + responsiveRadius * Math.sin(polar) * Math.cos(azimuth)
    );
    camera.lookAt(target);
  };
  updateCamera();

  scene.add(new THREE.HemisphereLight('#fff7e7', '#526b65', 1.8));
  const keyLight = new THREE.DirectionalLight('#ffe3b4', 3.15);
  keyLight.position.set(-4, 8, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.bias = -0.00018;
  keyLight.shadow.radius = 4;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight('#b3d6e4', 1.1);
  fillLight.position.set(6, 5, -6);
  scene.add(fillLight);

  const makeWoodTexture = () => {
    const woodCanvas = document.createElement('canvas');
    woodCanvas.width = 1024;
    woodCanvas.height = 512;
    const context = woodCanvas.getContext('2d');
    const base = context.createLinearGradient(0, 0, 0, 512);
    base.addColorStop(0, '#d0ae82');
    base.addColorStop(0.48, '#bb9264');
    base.addColorStop(1, '#a97c53');
    context.fillStyle = base;
    context.fillRect(0, 0, 1024, 512);
    let seed = 31;
    const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    for (let line = 0; line < 185; line += 1) {
      const y = random() * 512;
      context.beginPath();
      context.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 96) context.quadraticCurveTo(x + 48, y + (random() - 0.5) * 10, x + 96, y + (random() - 0.5) * 5);
      context.strokeStyle = random() > 0.5 ? `rgba(74, 45, 27, ${0.018 + random() * 0.032})` : `rgba(255, 235, 202, ${0.025 + random() * 0.04})`;
      context.lineWidth = 0.6 + random() * 1.4;
      context.stroke();
    }
    const texture = new THREE.CanvasTexture(woodCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2.4, 1.2);
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    return texture;
  };
  const woodTexture = makeWoodTexture();

  const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.66, metalness: 0.08, ...options });
  const mats = {
    floor: material('#dce4df'),
    benchTop: new THREE.MeshPhysicalMaterial({ color: '#fff3df', map: woodTexture, roughness: 0.46, metalness: 0.015, clearcoat: 0.2, clearcoatRoughness: 0.58 }),
    benchSide: material('#78563a', { roughness: 0.55 }),
    rail: material('#87928d', { metalness: 0.64, roughness: 0.35 }),
    railDark: material('#586560', { metalness: 0.45, roughness: 0.4 }),
    source: material('#1d2928', { roughness: 0.38, metalness: 0.34 }),
    sourceFace: material('#ffe3a0', { emissive: '#ffad35', emissiveIntensity: 1.25, roughness: 0.24 }),
    plate: material('#273330', { roughness: 0.34, metalness: 0.38 }),
    selectedPlate: material('#315648', { roughness: 0.34, metalness: 0.32 }),
    plateEdge: material('#b0bcb0', { metalness: 0.62, roughness: 0.28 }),
    brass: material('#c6974e', { metalness: 0.72, roughness: 0.26 }),
    carriage: material('#76847d', { metalness: 0.5, roughness: 0.42 }),
    screen: material('#f4f0e3', { roughness: 0.84 }),
    screenFrame: material('#697970', { metalness: 0.36, roughness: 0.43 }),
    spot: new THREE.MeshBasicMaterial({ color: '#ffe090', transparent: true, opacity: 1, depthWrite: false }),
    spotGlow: new THREE.MeshBasicMaterial({ color: '#ffc64b', transparent: true, opacity: 0.34, depthWrite: false })
  };

  const addBox = (parent, size, position, mat, castShadow = true, receiveShadow = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
    mesh.position.set(...position);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    parent.add(mesh);
    return mesh;
  };

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mats.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.24;
  floor.receiveShadow = true;
  scene.add(floor);

  // The optical bench, its rails, light source and screen stay fixed during this experiment.
  addBox(scene, [10.4, 0.22, 2.35], [0, -0.08, 0], mats.benchTop);
  addBox(scene, [10.4, 0.08, 2.35], [0, -0.21, 0], mats.benchSide);
  for (const z of [-0.78, 0.78]) {
    addBox(scene, [9.9, 0.09, 0.12], [0, 0.075, z], mats.rail);
    addBox(scene, [9.9, 0.025, 0.035], [0, 0.132, z], mats.railDark, false, false);
  }
  for (const x of [-4.6, 4.6]) {
    for (const z of [-0.82, 0.82]) addBox(scene, [0.13, 0.24, 0.13], [x, -0.01, z], mats.railDark);
  }
  // Fine engraved scale and brass index marks give the rail a precision optical-bench finish.
  for (let tick = 0; tick <= 40; tick += 1) {
    const x = -4 + tick * 0.2;
    const major = tick % 5 === 0;
    addBox(scene, [0.018, 0.008, major ? 0.2 : 0.11], [x, 0.139, 0.92], major ? mats.brass : mats.railDark, false, false);
  }
  for (const x of [-5.03, 5.03]) {
    const foot = addBox(scene, [0.48, 0.09, 2.08], [x, -0.17, 0], mats.benchSide);
    foot.castShadow = true;
    for (const z of [-0.78, 0.78]) {
      const footPad = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.08, 20), mats.railDark);
      footPad.position.set(x, -0.25, z);
      scene.add(footPad);
    }
  }

  // Fixed compact optical lamp, with a machined barrel and warm glass aperture.
  const lampBody = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.72, 48), mats.source);
  lampBody.rotation.z = Math.PI / 2;
  lampBody.position.set(-4.42, 1.28, 0);
  lampBody.castShadow = true;
  scene.add(lampBody);
  for (const [x, size] of [[-4.79, 0.35], [-4.04, 0.39]]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(size, 0.035, 10, 48), mats.plateEdge);
    rim.position.set(x, 1.28, 0);
    rim.rotation.y = Math.PI / 2;
    scene.add(rim);
  }
  const visibleEmitter = new THREE.Mesh(new THREE.CircleGeometry(0.2, 40), mats.sourceFace);
  visibleEmitter.position.set(-4.805, 1.28, 0);
  visibleEmitter.rotation.y = -Math.PI / 2;
  scene.add(visibleEmitter);
  const emitterBezel = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.025, 10, 40), mats.brass);
  emitterBezel.position.set(-4.82, 1.28, 0);
  emitterBezel.rotation.y = -Math.PI / 2;
  scene.add(emitterBezel);
  for (let vent = 0; vent < 8; vent += 1) {
    const angle = (vent / 8) * Math.PI * 2;
    const groove = addBox(scene, [0.16, 0.018, 0.014], [-4.44, 1.28 + Math.sin(angle) * 0.31, Math.cos(angle) * 0.31], mats.railDark, false, false);
    groove.rotation.x = angle;
  }
  const lampMount = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.12, 28), mats.plateEdge);
  lampMount.position.set(-4.42, 0.88, 0);
  scene.add(lampMount);
  const lensDisc = new THREE.Mesh(new THREE.CircleGeometry(0.29, 48), mats.sourceFace);
  lensDisc.position.set(-4.035, 1.28, 0);
  lensDisc.rotation.y = Math.PI / 2;
  scene.add(lensDisc);
  const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.044, 10, 48), mats.brass);
  lensRing.position.set(-4.015, 1.28, 0);
  lensRing.rotation.y = Math.PI / 2;
  scene.add(lensRing);
  const lampLens = new THREE.Mesh(new THREE.SphereGeometry(0.09, 28, 20), mats.sourceFace);
  lampLens.position.set(-4.0, 1.28, 0);
  scene.add(lampLens);
  const lampGlow = new THREE.PointLight('#ffd778', 1.4, 3.2);
  lampGlow.position.copy(lampLens.position);
  scene.add(lampGlow);

  // Fixed matte screen. Only the spot changes when the holes no longer line up.
  addBox(scene, [0.13, 2.75, 1.85], [4.4, 1.28, 0], mats.screenFrame);
  addBox(scene, [0.08, 2.58, 1.68], [4.32, 1.28, 0], mats.screen, false, true);
  addBox(scene, [0.018, 2.38, 0.018], [4.273, 1.28, -0.72], mats.brass, false, false);
  addBox(scene, [0.018, 2.38, 0.018], [4.273, 1.28, 0.72], mats.brass, false, false);
  for (const y of [0.12, 2.44]) {
    for (const z of [-0.76, 0.76]) {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.018, 16), mats.brass);
      screw.position.set(4.327, y, z);
      screw.rotation.z = Math.PI / 2;
      scene.add(screw);
    }
  }
  addBox(scene, [0.22, 0.11, 0.22], [4.4, 0.18, 0], mats.carriage);
  addBox(scene, [0.11, 0.96, 0.11], [4.42, 0.67, 0], mats.railDark);
  const spot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), mats.spot);
  spot.position.set(4.265, 1.28, 0);
  scene.add(spot);
  const spotGlow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), mats.spotGlow);
  spotGlow.position.copy(spot.position);
  scene.add(spotGlow);

  const homeX = [-2.35, 0, 2.35];
  const homeHeight = [0, 0.31, 0];
  const plateStates = homeX.map((x, index) => ({ x, height: homeHeight[index] }));
  const plateGap = 0.16;
  const railLimits = { min: -3.65, max: 3.85 };
  const plates = [];
  const makePlate = (index) => {
    const carriage = new THREE.Group();
    scene.add(carriage);
    addBox(carriage, [0.62, 0.16, 0.7], [0, 0.18, 0], mats.carriage);
    addBox(carriage, [0.16, 0.09, 0.82], [0, 0.19, 0], mats.railDark);
    // Sliding height post and collar show how the plate is held on the bench.
    const post = addBox(carriage, [0.1, 1.2, 0.1], [0, 0.79, -0.62], mats.rail);
    const collar = addBox(carriage, [0.24, 0.12, 0.16], [0, 1.25, -0.58], mats.plateEdge);
    const plate = new THREE.Group();
    carriage.add(plate);
    const plateBars = [];
    const bar = (size, position) => { const mesh = addBox(plate, size, position, mats.plate); plateBars.push(mesh); return mesh; };
    // Four opaque bars leave a real, open square aperture in the centre.
    bar([0.12, 0.92, 1.62], [0, 0.64, 0]);
    bar([0.12, 0.92, 1.62], [0, -0.64, 0]);
    bar([0.12, 0.36, 0.56], [0, 0, -0.49]);
    bar([0.12, 0.36, 0.56], [0, 0, 0.49]);
    const pickSurface = new THREE.Mesh(new THREE.BoxGeometry(0.012, 2.2, 1.62), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, colorWrite: false, depthWrite: false, side: THREE.DoubleSide }));
    pickSurface.position.x = -0.067;
    plate.add(pickSurface);
    // A narrow metal edge makes the cut-out and plate thickness legible as the camera turns.
    const edgeMat = mats.plateEdge;
    bar([0.035, 2.2, 0.045], [0.075, 0, -0.81]).material = edgeMat;
    bar([0.035, 2.2, 0.045], [0.075, 0, 0.81]).material = edgeMat;
    // Small countersunk fasteners and a fine brass aperture bezel make each plate feel machined.
    for (const y of [-0.99, 0.99]) {
      for (const z of [-0.68, 0.68]) {
        const washer = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.018, 24), mats.railDark);
        washer.position.set(-0.078, y, z);
        washer.rotation.z = Math.PI / 2;
        plate.add(washer);
        const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.022, 20), mats.brass);
        screw.position.set(-0.09, y, z);
        screw.rotation.z = Math.PI / 2;
        plate.add(screw);
      }
    }
    for (const [y, z, size] of [[0, -0.29, [0.018, 0.38, 0.018]], [0, 0.29, [0.018, 0.38, 0.018]], [-0.19, 0, [0.018, 0.018, 0.58]], [0.19, 0, [0.018, 0.018, 0.58]]]) {
      const bezel = addBox(plate, size, [0.092, y, z], mats.plateEdge, false, false);
      bezel.material = mats.brass;
    }
    plate.position.y = 1.28;
    carriage.position.set(plateStates[index].x, 0, 0);
    plates.push({ carriage, plate, post, collar, plateBars, pickSurface });
    pickSurface.userData.plateIndex = index;
  };
  homeX.forEach((_, index) => makePlate(index));

  const plateButtons = [...document.querySelectorAll('[data-plate]')];
  const heightInput = document.querySelector('#aperture-offset');
  const heightOutput = document.querySelector('#aperture-offset-output');
  const result = document.querySelector('#aperture-result');
  const resultText = result.querySelector('span:last-child');
  const xiaokuiObservation = document.querySelector('#aperture-xiaokui-observation');
  let selectedIndex = 1;
  const standardHeightTolerance = 0.02;
  const fullBlockOffset = 0.36;
  const visibleLightThreshold = 0.2;
  const lightRemainingAtOffset = (deviation) => {
    const remaining = THREE.MathUtils.clamp(1 - deviation / fullBlockOffset, 0, 1);
    return remaining <= visibleLightThreshold ? 0 : remaining;
  };
  const selectableSurfaces = plates.map(({ pickSurface }) => pickSurface);

  const updateExperiment = () => {
    plates.forEach(({ carriage, plate, post, collar, plateBars }, index) => {
      const state = plateStates[index];
      carriage.position.x = state.x;
      plate.position.y = 1.28 + state.height;
      plateBars.slice(0, 4).forEach((bar) => { bar.material = index === selectedIndex ? mats.selectedPlate : mats.plate; });
      post.scale.y = Math.max(0.22, 1.2 + state.height);
      post.position.y = 0.19 + post.scale.y / 2;
      collar.position.y = 0.19 + post.scale.y - 0.03;
    });
    const selected = plateStates[selectedIndex];
    heightInput.value = String(Math.round(selected.height / 0.62 * 100));
    const heightPercent = Number(heightInput.value);
    const selectedDeviation = Math.abs(selected.height);
    const isStandardHeight = selectedDeviation <= standardHeightTolerance;
    const isFullyBlocked = lightRemainingAtOffset(selectedDeviation) === 0;
    heightOutput.textContent = isStandardHeight ? '標準高度' : isFullyBlocked ? (heightPercent > 0 ? '偏高' : '偏低') : (heightPercent > 0 ? '略微偏高' : '略微偏低');
    heightOutput.classList.toggle('is-standard', isStandardHeight);
    const plateNames = ['小孔板 1', '中間板', '小孔板 3'];
    plateButtons.forEach((button, index) => {
      const letsLightThrough = lightRemainingAtOffset(Math.abs(plateStates[index].height)) > 0;
      button.classList.toggle('is-transmitting', letsLightThrough);
      button.setAttribute('aria-label', `${plateNames[index]}，${letsLightThrough ? '仍有光通過' : '偏移過大，光被擋住'}`);
      button.title = letsLightThrough ? '仍有光通過這片小孔板' : '偏移過大，光被這片小孔板擋住';
    });
    const maxDeviation = Math.max(...plateStates.map((state) => Math.abs(state.height)));
    const transmission = lightRemainingAtOffset(maxDeviation);
    mats.spot.opacity = transmission;
    mats.spotGlow.opacity = transmission * 0.34;
    spot.scale.setScalar(0.72 + transmission * 0.28);
    spotGlow.scale.setScalar(0.6 + transmission * 0.4);
    result.classList.toggle('is-blocked', transmission <= 0);
    if (maxDeviation <= standardHeightTolerance) resultText.textContent = '三個小孔排成一直線，屏幕上出現清楚亮點。';
    else if (transmission > 0) resultText.textContent = '小孔略有偏移，仍有部分光線通過，屏幕亮點變暗。';
    else resultText.textContent = '光被偏移過大的小孔板擋住，屏幕亮點消失。';
    if (maxDeviation <= standardHeightTolerance) xiaokuiObservation.textContent = '所以小孔排成一直線，光才能一路通過。';
    else if (transmission > 0) xiaokuiObservation.textContent = '亮點變暗了，表示還有一些光穿過小孔。';
    else xiaokuiObservation.textContent = '原來光沒有繞過孔板，得讓小孔對齊才能通過。';
  };

  const selectPlate = (index) => {
    selectedIndex = index;
    plateButtons.forEach((item, itemIndex) => item.setAttribute('aria-pressed', String(itemIndex === index)));
    updateExperiment();
  };
  plateButtons.forEach((button) => button.addEventListener('click', () => {
    selectPlate(Number(button.dataset.plate));
  }));
  heightInput.addEventListener('input', () => {
    plateStates[selectedIndex].height = Number(heightInput.value) / 100 * 0.62;
    updateExperiment();
  });
  document.querySelector('#aperture-reset').addEventListener('click', () => {
    plateStates.forEach((state, index) => { state.x = homeX[index]; state.height = homeHeight[index]; });
    selectedIndex = 1;
    plateButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === selectedIndex)));
    updateExperiment();
  });

  const viewReset = () => {
    azimuth = initialOrbit.azimuth;
    polar = initialOrbit.polar;
    radius = initialOrbit.radius;
    updateCamera();
  };
  document.querySelector('#aperture-view-reset').addEventListener('click', viewReset);
  const activePointers = new Map();
  const pointerRaycaster = new THREE.Raycaster();
  let lastPointer = null;
  let pinchDistance = 0;
  let pointerStart = null;
  let pointerDragged = false;
  let movingPlateIndex = null;
  let plateDragStart = null;
  let plateDragPositions = null;
  const findPlateAt = (clientX, clientY) => {
    const bounds = canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((clientX - bounds.left) / bounds.width) * 2 - 1,
      -((clientY - bounds.top) / bounds.height) * 2 + 1
    );
    pointerRaycaster.setFromCamera(pointer, camera);
    return pointerRaycaster.intersectObjects(selectableSurfaces, false)[0] || null;
  };
  const projectWorldPoint = (x, y) => {
    const projected = new THREE.Vector3(x, y, 0).project(camera);
    const bounds = canvas.getBoundingClientRect();
    return [bounds.left + (projected.x + 1) * bounds.width / 2, bounds.top + (1 - projected.y) * bounds.height / 2];
  };
  const distanceBetweenPointers = () => {
    const points = [...activePointers.values()];
    if (points.length < 2) return 0;
    return Math.hypot(points[0][0] - points[1][0], points[0][1] - points[1][1]);
  };
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const hit = findPlateAt(event.clientX, event.clientY);
    activePointers.set(event.pointerId, [event.clientX, event.clientY]);
    lastPointer = [event.clientX, event.clientY];
    if (activePointers.size === 1) {
      pointerStart = [event.clientX, event.clientY];
      pointerDragged = false;
      movingPlateIndex = hit ? hit.object.userData.plateIndex : null;
      if (movingPlateIndex !== null) {
        selectPlate(movingPlateIndex);
        const state = plateStates[movingPlateIndex];
        plateDragStart = { x: state.x, y: 1.28 + state.height, screen: projectWorldPoint(state.x, 1.28 + state.height) };
        plateDragPositions = plateStates.map((plateState) => plateState.x);
        canvas.style.cursor = 'grabbing';
      }
    } else {
      pointerDragged = true;
      movingPlateIndex = null;
      pinchDistance = distanceBetweenPointers();
    }
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!activePointers.has(event.pointerId)) {
      canvas.style.cursor = findPlateAt(event.clientX, event.clientY) ? 'move' : 'grab';
      return;
    }
    activePointers.set(event.pointerId, [event.clientX, event.clientY]);
    if (pointerStart && Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) > 6) pointerDragged = true;
    if (activePointers.size > 1) {
      const nextDistance = distanceBetweenPointers();
      if (pinchDistance > 0 && nextDistance > 0) radius = THREE.MathUtils.clamp(radius - (nextDistance - pinchDistance) * 0.035, 8, 24);
      pinchDistance = nextDistance;
      updateCamera();
      return;
    }
    if (movingPlateIndex !== null && plateDragStart) {
      if (pointerDragged) {
        const startScreen = plateDragStart.screen;
        const xScreen = projectWorldPoint(plateDragStart.x + 1, plateDragStart.y);
        const yScreen = projectWorldPoint(plateDragStart.x, plateDragStart.y + 1);
        const a = xScreen[0] - startScreen[0];
        const c = xScreen[1] - startScreen[1];
        const b = yScreen[0] - startScreen[0];
        const d = yScreen[1] - startScreen[1];
        const determinant = a * d - b * c;
        if (Math.abs(determinant) > 0.001) {
          const dx = event.clientX - pointerStart[0];
          const dy = event.clientY - pointerStart[1];
          const moveX = (dx * d - b * dy) / determinant;
          const moveY = (a * dy - dx * c) / determinant;
          const desiredX = plateDragStart.x + moveX;
          const positions = [...plateDragPositions];
          positions[movingPlateIndex] = desiredX;
          if (desiredX >= plateDragPositions[movingPlateIndex]) {
            for (let index = movingPlateIndex + 1; index < positions.length; index += 1) {
              positions[index] = Math.max(positions[index], positions[index - 1] + plateGap);
            }
            const overflow = Math.max(0, positions.at(-1) - railLimits.max);
            if (overflow) {
              positions[movingPlateIndex] -= overflow;
              for (let index = movingPlateIndex + 1; index < positions.length; index += 1) {
                positions[index] = Math.max(plateDragPositions[index], positions[index - 1] + plateGap);
              }
            }
          } else {
            for (let index = movingPlateIndex - 1; index >= 0; index -= 1) {
              positions[index] = Math.min(positions[index], positions[index + 1] - plateGap);
            }
            const overflow = Math.max(0, railLimits.min - positions[0]);
            if (overflow) {
              positions[movingPlateIndex] += overflow;
              for (let index = movingPlateIndex - 1; index >= 0; index -= 1) {
                positions[index] = Math.min(plateDragPositions[index], positions[index + 1] - plateGap);
              }
            }
          }
          plateStates.forEach((state, index) => { state.x = positions[index]; });
          plateStates[movingPlateIndex].height = THREE.MathUtils.clamp(plateDragStart.y + moveY - 1.28, -0.62, 0.62);
          updateExperiment();
        }
      }
      return;
    }
    if (!lastPointer) return;
    const dx = event.clientX - lastPointer[0];
    const dy = event.clientY - lastPointer[1];
    lastPointer = [event.clientX, event.clientY];
    azimuth -= dx * 0.008;
    polar = THREE.MathUtils.clamp(polar + dy * 0.006, 0.34, 1.48);
    updateCamera();
  });
  const stopDrag = (event) => {
    activePointers.delete(event.pointerId);
    pinchDistance = 0;
    lastPointer = activePointers.size === 1 ? [...activePointers.values()][0] : null;
    if (activePointers.size === 0) {
      pointerStart = null;
      plateDragStart = null;
      plateDragPositions = null;
      movingPlateIndex = null;
      pointerDragged = false;
      canvas.style.cursor = 'grab';
    }
  };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    radius = THREE.MathUtils.clamp(radius + event.deltaY * 0.009, 8, 17);
    updateCamera();
  }, { passive: false });
  canvas.addEventListener('keydown', (event) => {
    const step = 0.08;
    if (event.key === 'ArrowLeft') azimuth += step;
    else if (event.key === 'ArrowRight') azimuth -= step;
    else if (event.key === 'ArrowUp') polar = Math.max(0.34, polar - step);
    else if (event.key === 'ArrowDown') polar = Math.min(1.48, polar + step);
    else return;
    event.preventDefault();
    updateCamera();
  });

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = camera.aspect < 1.15 ? 50 : 38;
    camera.updateProjectionMatrix();
    updateCamera();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();
  updateExperiment();
  renderer.setAnimationLoop(() => renderer.render(scene, camera));
}
