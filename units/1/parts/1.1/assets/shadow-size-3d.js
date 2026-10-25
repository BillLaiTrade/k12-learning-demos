import * as THREE from './vendor/three/build/three.module.js?v=webgl-render-refresh-20261025';
import { manageRendererContextVisibility } from './renderer-visibility.js';

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

const canvas = document.querySelector('#shadow-size-3d-scene');
if (canvas) {
  await waitUntilCanvasIsNearViewport(canvas);
  const feedback = document.querySelector('#shadow-size-feedback');
  const status = document.querySelector('#shadow-size-scene-status');
  const xiaokuiObservation = document.querySelector('#shadow-size-xiaokui-observation');
  const resetButton = document.querySelector('#shadow-size-view-reset');

  try {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#14232b');
    scene.fog = new THREE.Fog('#273a3d', 16, 34);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    manageRendererContextVisibility(renderer, canvas);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const makeEnvironment = () => {
      const source = document.createElement('canvas');
      source.width = 1024;
      source.height = 512;
      const context = source.getContext('2d');
      const wash = context.createLinearGradient(0, 0, 0, 512);
      wash.addColorStop(0, '#23363b');
      wash.addColorStop(0.32, '#304341');
      wash.addColorStop(0.58, '#465047');
      wash.addColorStop(0.82, '#625b48');
      wash.addColorStop(1, '#78624d');
      context.fillStyle = wash;
      context.fillRect(0, 0, 1024, 512);
      const glow = context.createRadialGradient(700, 300, 25, 700, 300, 500);
      glow.addColorStop(0, 'rgba(255, 195, 111, 0.28)');
      glow.addColorStop(1, 'rgba(255, 195, 111, 0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, 1024, 512);
      context.save();
      context.filter = 'blur(7px)';
      context.fillStyle = 'rgba(12, 24, 26, 0.52)';
      context.fillRect(70, 226, 884, 20);
      context.fillRect(70, 352, 884, 15);
      context.fillStyle = 'rgba(209, 157, 88, 0.42)';
      context.fillRect(118, 219, 790, 5);
      for (const [x, y, width, height, color] of [
        [142, 145, 34, 74, 'rgba(100, 162, 150, .42)'], [205, 158, 24, 59, 'rgba(214, 177, 115, .38)'],
        [306, 132, 42, 87, 'rgba(90, 142, 141, .4)'], [730, 147, 30, 72, 'rgba(198, 139, 83, .38)'],
        [812, 125, 40, 94, 'rgba(97, 157, 151, .38)'], [890, 163, 22, 57, 'rgba(222, 175, 102, .4)']
      ]) {
        context.fillStyle = color;
        context.beginPath();
        context.rect(x, y, width, height);
        context.fill();
        context.fillStyle = 'rgba(255, 224, 164, .35)';
        context.fillRect(x + 5, y + 7, width - 10, 2);
      }
      context.restore();
      const texture = new THREE.CanvasTexture(source);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const environment = makeEnvironment();
    scene.background = environment;
    scene.environment = environment;
    scene.environmentIntensity = 0.42;

    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 80);
    const target = new THREE.Vector3(0, 1.25, 0.05);
    const initialOrbit = { azimuth: -2.25, polar: 1.18, radius: 12.2 };
    let azimuth = initialOrbit.azimuth;
    let polar = initialOrbit.polar;
    let radius = initialOrbit.radius;
    const updateCamera = () => {
      const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
      const responsiveRadius = Math.max(radius, radius * (1.25 / Math.max(aspect, 0.82)));
      camera.position.set(
        target.x + responsiveRadius * Math.sin(polar) * Math.sin(azimuth),
        target.y + responsiveRadius * Math.cos(polar),
        target.z + responsiveRadius * Math.sin(polar) * Math.cos(azimuth)
      );
      camera.lookAt(target);
    };

    scene.add(new THREE.HemisphereLight('#e7f0e9', '#31443f', 1.2));
    const fill = new THREE.DirectionalLight('#d3e3e3', 0.9);
    fill.position.set(5, 8, -5);
    scene.add(fill);
    const warmBounce = new THREE.PointLight('#ffbd70', 16, 8, 1.8);
    warmBounce.position.set(-1.6, 2.3, -2.4);
    scene.add(warmBounce);

    const makeWoodTexture = () => {
      const source = document.createElement('canvas');
      source.width = 1024;
      source.height = 1024;
      const context = source.getContext('2d');
      const base = context.createLinearGradient(0, 0, 0, 1024);
      base.addColorStop(0, '#c9a77d');
      base.addColorStop(0.48, '#b68d62');
      base.addColorStop(1, '#a77c52');
      context.fillStyle = base;
      context.fillRect(0, 0, 1024, 1024);
      let seed = 17;
      const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
      for (let line = 0; line < 210; line += 1) {
        const y = random() * 1024;
        context.beginPath();
        context.moveTo(0, y);
        for (let x = 0; x < 1024; x += 96) context.quadraticCurveTo(x + 48, y + (random() - 0.5) * 13, x + 96, y + (random() - 0.5) * 7);
        context.strokeStyle = random() > 0.54 ? `rgba(84, 53, 31, ${0.018 + random() * 0.035})` : `rgba(255, 232, 193, ${0.025 + random() * 0.035})`;
        context.lineWidth = 0.5 + random() * 2.2;
        context.stroke();
      }
      const texture = new THREE.CanvasTexture(source);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2, 1);
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      return texture;
    };
    const makeBallTexture = () => {
      const source = document.createElement('canvas');
      source.width = 512;
      source.height = 512;
      const context = source.getContext('2d');
      context.fillStyle = '#64746a';
      context.fillRect(0, 0, 512, 512);
      let seed = 73;
      const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
      for (let dot = 0; dot < 3600; dot += 1) {
        const value = 77 + Math.floor(random() * 72);
        context.fillStyle = `rgba(${value + 4}, ${value + 12}, ${value + 7}, ${0.035 + random() * 0.12})`;
        context.beginPath();
        context.arc(random() * 512, random() * 512, 0.35 + random() * 1.5, 0, Math.PI * 2);
        context.fill();
      }
      const texture = new THREE.CanvasTexture(source);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const makeScreenTexture = () => {
      const source = document.createElement('canvas');
      source.width = 512;
      source.height = 512;
      const context = source.getContext('2d');
      context.fillStyle = '#fbfaf2';
      context.fillRect(0, 0, 512, 512);
      let seed = 93;
      const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
      for (let fiber = 0; fiber < 4800; fiber += 1) {
        context.fillStyle = random() > 0.5 ? 'rgba(117, 106, 80, 0.035)' : 'rgba(255, 255, 255, 0.3)';
        context.fillRect(random() * 512, random() * 512, 1 + random() * 2, 1);
      }
      const texture = new THREE.CanvasTexture(source);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.68, metalness: 0.08, ...options });
    const woodTexture = makeWoodTexture();
    const ballTexture = makeBallTexture();
    const screenTexture = makeScreenTexture();
    const materials = {
      floor: material('#f2e8d6'),
      wood: new THREE.MeshPhysicalMaterial({ color: '#fff5e5', map: woodTexture, roughness: 0.43, metalness: 0.02, clearcoat: 0.24, clearcoatRoughness: 0.56 }),
      woodEdge: material('#805c3c', { roughness: 0.56 }),
      metal: material('#9aa79d', { metalness: 0.42, roughness: 0.34 }),
      metalDark: material('#526158', { metalness: 0.34, roughness: 0.37 }),
      brass: material('#c6974e', { metalness: 0.72, roughness: 0.26 }),
      lamp: material('#35443e', { metalness: 0.38, roughness: 0.34 }),
      ball: new THREE.MeshStandardMaterial({ color: '#dce4d9', map: ballTexture, roughness: 0.78, metalness: 0.015, bumpMap: ballTexture, bumpScale: 0.008 }),
      screen: new THREE.MeshPhysicalMaterial({ color: '#fffdf5', map: screenTexture, roughness: 0.91, metalness: 0, side: THREE.DoubleSide }),
      screenFrame: material('#52645c', { metalness: 0.55, roughness: 0.31 }),
      lampLens: new THREE.MeshStandardMaterial({ color: '#ffe4a0', emissive: '#ffb937', emissiveIntensity: 2.2, roughness: 0.24 })
    };
    const box = (parent, size, position, surface, { cast = true, receive = true } = {}) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), surface);
      mesh.position.set(...position);
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      parent.add(mesh);
      return mesh;
    };

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), materials.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.25;
    floor.receiveShadow = true;
    scene.add(floor);

    // Fixed wooden bench, lamp and screen; only the sphere's distance changes.
    box(scene, [8.2, 0.2, 5.6], [0, -0.08, 0], materials.wood);
    box(scene, [8.2, 0.08, 5.6], [0, -0.22, 0], materials.woodEdge);
    for (const x of [-3.4, 3.4]) for (const z of [-2.15, 2.15]) box(scene, [0.16, 0.45, 0.16], [x, -0.38, z], materials.metalDark);

    const lampBody = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.82, 48), materials.lamp);
    lampBody.rotation.x = Math.PI / 2;
    lampBody.position.set(0, 1.55, -3.95);
    lampBody.castShadow = true;
    scene.add(lampBody);
    for (const [z, ringRadius] of [[-4.37, 0.34], [-3.58, 0.36]]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(ringRadius, 0.022, 10, 48), materials.metal);
      rim.position.set(0, 1.55, z);
      scene.add(rim);
    }
    const rearCap = new THREE.Mesh(new THREE.CircleGeometry(0.255, 48), materials.metalDark);
    rearCap.position.set(0, 1.55, -4.372);
    rearCap.rotation.y = Math.PI;
    scene.add(rearCap);
    const rearMark = new THREE.Mesh(new THREE.CircleGeometry(0.07, 32), materials.metal);
    rearMark.position.set(0, 1.55, -4.378);
    rearMark.rotation.y = Math.PI;
    scene.add(rearMark);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.29, 40), materials.lampLens);
    lens.position.set(0, 1.55, -3.52);
    scene.add(lens);
    const lensRim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.045, 10, 40), materials.metal);
    lensRim.position.set(0, 1.55, -3.49);
    scene.add(lensRim);
    const lampJoint = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.025, 10, 28), materials.metal);
    lampJoint.position.set(0, 1.1, -3.95);
    lampJoint.rotation.x = Math.PI / 2;
    scene.add(lampJoint);
    const lampStand = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 1.02, 20), materials.metalDark);
    lampStand.position.set(0, 0.62, -3.95);
    scene.add(lampStand);
    const lampFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 0.13, 28), materials.metalDark);
    lampFoot.position.set(0, 0.12, -3.95);
    scene.add(lampFoot);
    for (const x of [-0.31, 0.31]) {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.018, 16), materials.metal);
      screw.position.set(x, 0.19, -3.95);
      scene.add(screw);
    }
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.56, -4.36), new THREE.Vector3(-0.27, 1.05, -4.48),
      new THREE.Vector3(-0.3, 0.4, -4.44), new THREE.Vector3(-0.48, 0.035, -4.22),
      new THREE.Vector3(-0.94, 0.035, -3.96), new THREE.Vector3(-1.55, 0.035, -3.72)
    ]);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 56, 0.022, 8, false), materials.metalDark);
    scene.add(cable);

    const spotlight = new THREE.SpotLight('#ffe0a0', 78, 12, 0.41, 0.18, 1.35);
    spotlight.position.set(0, 1.55, -3.46);
    spotlight.target.position.set(0, 1.55, 3.7);
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.set(512, 512);
    spotlight.shadow.camera.near = 0.1;
    spotlight.shadow.camera.far = 12;
    spotlight.shadow.bias = -0.0002;
    spotlight.shadow.normalBias = 0.018;
    spotlight.shadow.radius = 4;
    scene.add(spotlight, spotlight.target);
    const lampBounce = new THREE.PointLight('#ffc765', 8, 5.5, 1.7);
    lampBounce.position.set(0, 1.5, -3.4);
    scene.add(lampBounce);

    const screenZ = 3.72;
    const screenWidth = 4.25;
    const screenHeight = 3.08;
    const screenCenterY = 1.62;
    box(scene, [screenWidth + 0.1, screenHeight + 0.12, 0.055], [0, screenCenterY, screenZ + 0.055], materials.metalDark, { cast: false });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenWidth, screenHeight), materials.screen);
    screen.position.set(0, screenCenterY, screenZ);
    screen.receiveShadow = true;
    screen.castShadow = false;
    scene.add(screen);
    for (const x of [-screenWidth / 2 - 0.055, screenWidth / 2 + 0.055]) {
      box(scene, [0.11, screenHeight + 0.16, 0.11], [x, screenCenterY, screenZ + 0.04], materials.screenFrame);
      box(scene, [0.42, 0.09, 0.36], [x, 0.07, screenZ + 0.05], materials.metalDark);
    }
    box(scene, [screenWidth + 0.18, 0.1, 0.1], [0, screenCenterY + screenHeight / 2 + 0.045, screenZ + 0.04], materials.screenFrame);
    box(scene, [screenWidth + 0.18, 0.1, 0.1], [0, screenCenterY - screenHeight / 2 - 0.045, screenZ + 0.04], materials.screenFrame);
    for (const x of [-screenWidth / 2 + 0.13, screenWidth / 2 - 0.13]) {
      box(scene, [0.018, screenHeight - 0.32, 0.018], [x, screenCenterY, screenZ - 0.028], materials.brass, { cast: false, receive: false });
    }
    for (const x of [-screenWidth / 2 - 0.055, screenWidth / 2 + 0.055]) {
      for (const y of [screenCenterY - screenHeight / 2 + 0.18, screenCenterY + screenHeight / 2 - 0.18]) {
        const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.018, 16), materials.metalDark);
        screw.position.set(x, y, screenZ - 0.025);
        screw.rotation.x = Math.PI / 2;
        scene.add(screw);
      }
    }

    // The rail follows the light path from near the lamp to near the screen.
    const nearLightZ = -1.3;
    const nearScreenZ = 2.72;
    const railLength = nearScreenZ - nearLightZ;
    const railCenter = (nearLightZ + nearScreenZ) / 2;
    box(scene, [0.12, 0.075, railLength + 0.08], [0, 0.18, railCenter], materials.metal);
    for (let mark = 0; mark <= 20; mark += 1) {
      const major = mark % 5 === 0;
      const z = nearLightZ + railLength * mark / 20;
      box(scene, [major ? 0.09 : 0.055, major ? 0.012 : 0.007, 0.014], [0, 0.225, z], materials.metalDark, { cast: false, receive: false });
    }
    for (const z of [nearLightZ - 0.13, nearScreenZ + 0.13]) box(scene, [0.24, 0.16, 0.18], [0, 0.08, z], materials.metalDark);

    const blocker = new THREE.Group();
    blocker.position.set(0, 0, nearLightZ);
    scene.add(blocker);
    const carrier = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.34), materials.metalDark);
    carrier.position.set(0, 0.29, 0);
    blocker.add(carrier);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.03, 18), materials.metal);
    post.position.set(0, 0.88, 0);
    blocker.add(post);
    for (const y of [0.48, 1.27]) {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 8, 24), materials.metalDark);
      collar.position.set(0, y, 0);
      collar.rotation.x = Math.PI / 2;
      blocker.add(collar);
    }
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.43, 40, 32), materials.ball);
    sphere.position.set(0, 1.61, 0);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    blocker.add(sphere);

    const minPosition = 0;
    const maxPosition = 100;
    const zFromPosition = (position) => THREE.MathUtils.lerp(nearLightZ, nearScreenZ, position / maxPosition);
    const positionFromZ = (z) => THREE.MathUtils.mapLinear(z, nearLightZ, nearScreenZ, minPosition, maxPosition);
    let hasMovedSphere = false;
    const updateReadout = (position, dragging = false) => {
      if (dragging) hasMovedSphere = true;
      const value = THREE.MathUtils.clamp(position, minPosition, maxPosition);
      const nearLight = value <= 28;
      const nearScreen = value >= 72;
      feedback.textContent = nearLight
        ? '球體靠近光源，屏幕上的影子較大；往屏幕方向拖動，影子會逐漸縮小。'
        : nearScreen
          ? '球體靠近屏幕，影子較小；往光源方向拖動，影子會逐漸放大。'
          : '球體越靠近光源，屏幕上的影子越大；越靠近屏幕，影子越小。';
      xiaokuiObservation.textContent = !hasMovedSphere
        ? '遮擋物靠近光源時，影子會變大；遠離光源時，影子會變小。'
        : nearLight
          ? '球和光源的距離變近，影子反而變大了！'
          : nearScreen
            ? '球靠近屏幕後，影子縮小了。'
            : '物體大小不變，移動位置也會改變影子的大小。';
      if (dragging) status.textContent = '拖曳球體前後移動，屏幕影子會即時改變。';
      else if (nearLight) status.textContent = '球體靠近光源，屏幕上的影子較大。';
      else if (nearScreen) status.textContent = '球體靠近屏幕，影子縮小。';
      else status.textContent = '球體在光源與屏幕之間，影子大小隨位置改變。';
    };
    blocker.position.z = zFromPosition(minPosition);
    updateReadout(minPosition);

    const resize = () => {
      const width = Math.max(canvas.clientWidth, 1);
      const height = Math.max(canvas.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      updateCamera();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const resetView = () => {
      azimuth = initialOrbit.azimuth;
      polar = initialOrbit.polar;
      radius = initialOrbit.radius;
      updateCamera();
    };
    resetButton.addEventListener('click', resetView);

    const pointers = new Map();
    let previousPoint = null;
    let previousPinch = 0;
    let draggingSpherePointer = null;
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const depthPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
    const depthIntersection = new THREE.Vector3();
    const castPointerRay = (event) => {
      const bounds = canvas.getBoundingClientRect();
      pointerNdc.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointerNdc, camera);
    };
    const pointerHitsSphere = (event) => {
      castPointerRay(event);
      blocker.updateMatrixWorld(true);
      return raycaster.intersectObject(sphere, false).length > 0;
    };
    const updateSphereFromPointer = (event) => {
      castPointerRay(event);
      if (!raycaster.ray.intersectPlane(depthPlane, depthIntersection)) return;
      const position = positionFromZ(depthIntersection.z);
      blocker.position.z = zFromPosition(THREE.MathUtils.clamp(position, minPosition, maxPosition));
      updateReadout(position, true);
    };
    const pinchDistance = () => {
      const points = [...pointers.values()];
      if (points.length < 2) return 0;
      return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    };
    canvas.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (pointers.size === 0 && pointerHitsSphere(event)) {
        draggingSpherePointer = event.pointerId;
        canvas.classList.add('dragging-size-object');
        status.textContent = '拖曳球體前後移動，屏幕影子會即時改變。';
      } else if (pointers.size > 0) {
        draggingSpherePointer = null;
        canvas.classList.remove('dragging-size-object');
      }
      canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      previousPoint = draggingSpherePointer === event.pointerId ? null : { x: event.clientX, y: event.clientY };
      previousPinch = pinchDistance();
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!pointers.has(event.pointerId)) {
        if (event.pointerType === 'mouse') canvas.style.cursor = pointerHitsSphere(event) ? 'pointer' : 'grab';
        return;
      }
      const point = { x: event.clientX, y: event.clientY };
      pointers.set(event.pointerId, point);
      if (draggingSpherePointer === event.pointerId && pointers.size === 1) {
        updateSphereFromPointer(event);
      } else if (pointers.size >= 2) {
        const nextPinch = pinchDistance();
        if (previousPinch > 0 && nextPinch > 0) radius = THREE.MathUtils.clamp(radius * (previousPinch / nextPinch), 6.5, 18);
        previousPinch = nextPinch;
      } else if (previousPoint) {
        azimuth -= (point.x - previousPoint.x) * 0.006;
        polar = THREE.MathUtils.clamp(polar + (point.y - previousPoint.y) * 0.005, 0.45, 1.62);
      }
      previousPoint = point;
      updateCamera();
    });
    const endPointer = (event) => {
      if (draggingSpherePointer === event.pointerId) {
        draggingSpherePointer = null;
        canvas.classList.remove('dragging-size-object');
        updateReadout(positionFromZ(blocker.position.z));
      }
      pointers.delete(event.pointerId);
      previousPoint = pointers.size === 1 ? [...pointers.values()][0] : null;
      previousPinch = pinchDistance();
    };
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      radius = THREE.MathUtils.clamp(radius * Math.exp(event.deltaY * 0.001), 6.5, 18);
      updateCamera();
    }, { passive: false });

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();
  } catch (error) {
    console.error('Shadow size 3D scene failed to initialize:', error);
    const reason = error instanceof Error ? error.message : String(error);
    const frame = canvas.closest('.shadow-size-scene-frame');
    const fallback = document.createElement('div');
    fallback.className = 'shadow-size-2d-fallback';
    fallback.setAttribute('role', 'group');
    fallback.setAttribute('aria-label', '影子大小互動示意場景');
    fallback.style.cssText = 'position:absolute;inset:0;z-index:1;overflow:hidden;border-radius:inherit;';
    fallback.innerHTML = `
      <svg viewBox="0 0 1000 600" preserveAspectRatio="none" style="display:block;width:100%;height:100%" role="img" aria-label="拖曳球體在光源與屏幕之間移動，觀察屏幕影子大小">
        <defs>
          <linearGradient id="fallback-room" x2="0" y2="1"><stop stop-color="#e7ede7"/><stop offset=".64" stop-color="#eff0e5"/><stop offset="1" stop-color="#f8f1df"/></linearGradient>
          <linearGradient id="fallback-table" x2="0" y2="1"><stop stop-color="#d8b37d"/><stop offset="1" stop-color="#9b7149"/></linearGradient>
          <linearGradient id="fallback-screen" x2="1" y2="1"><stop stop-color="#fffdf2"/><stop offset="1" stop-color="#ded9c7"/></linearGradient>
          <radialGradient id="fallback-lamp-glow"><stop stop-color="#fff4b5" stop-opacity=".9"/><stop offset="1" stop-color="#ffc85b" stop-opacity="0"/></radialGradient>
          <radialGradient id="fallback-ball-gradient" cx=".32" cy=".25"><stop stop-color="#899b8d"/><stop offset=".42" stop-color="#435c50"/><stop offset="1" stop-color="#1d302c"/></radialGradient>
          <filter id="fallback-blur"><feGaussianBlur stdDeviation="12"/></filter>
        </defs>
        <rect width="1000" height="600" fill="url(#fallback-room)"/>
        <g opacity=".26" fill="#71847b"><path d="M70 125h860v14H70zM70 205h860v12H70z"/><path d="M115 74h35v50h-35zm78 13h25v37h-25zm565-9h30v46h-30zm83 4h44v42h-44z"/></g>
        <path d="M0 447 1000 382v218H0z" fill="url(#fallback-table)"/><path d="m0 447 1000-65v16L0 464z" fill="#775a3e" opacity=".45"/>
        <path d="m90 468 720-48" stroke="#596b61" stroke-width="12" stroke-linecap="round"/><path d="m90 464 720-48" stroke="#b8c2b8" stroke-width="4" stroke-linecap="round"/>
        <g opacity=".52" stroke="#485b50" stroke-width="3"><path d="m180 458 2 16m90-22 2 16m90-22 2 16m90-22 2 16m90-22 2 16m90-22 2 16"/></g>
        <ellipse cx="242" cy="370" rx="115" ry="110" fill="url(#fallback-lamp-glow)"/>
        <path d="M188 452h96l-13 17h-70z" fill="#35443e"/><path d="M219 452V357l22-30 22 30v95z" fill="#263631"/><ellipse cx="241" cy="357" rx="23" ry="15" fill="#e5c47f"/><ellipse cx="241" cy="354" rx="14" ry="8" fill="#fff5bf"/>
        <path id="fallback-beam" d="" fill="#ffdc8a" opacity=".23"/>
        <path d="M770 194 912 205v298l-142-12z" fill="#718077"/><path d="M787 210 897 218v270l-110-9z" fill="url(#fallback-screen)" stroke="#69776b" stroke-width="4"/>
        <ellipse id="fallback-shadow-blur" cx="842" cy="350" rx="40" ry="52" fill="#475047" opacity=".16" filter="url(#fallback-blur)"/>
        <ellipse id="fallback-shadow" cx="842" cy="350" rx="40" ry="52" fill="#4d5147" opacity=".75"/>
        <g id="fallback-size-ball" tabindex="0" role="slider" aria-label="沿光路調整球體位置" aria-valuemin="0" aria-valuemax="100" aria-valuenow="14" style="cursor:grab;touch-action:none">
          <path id="fallback-post" d="" stroke="#526258" stroke-width="8"/>
          <rect id="fallback-carriage" x="305" y="430" width="70" height="20" rx="6" fill="#414f48"/>
          <circle id="fallback-ball-object" cx="340" cy="370" r="39" fill="url(#fallback-ball-gradient)" stroke="#c6d1c6" stroke-width="4"/>
          <ellipse id="fallback-highlight" cx="330" cy="355" rx="12" ry="7" fill="#d8e3d8" opacity=".42"/>
        </g>
        <g fill="#33483f" font-family="system-ui,sans-serif" font-size="20" font-weight="700"><text x="170" y="525">光源</text><text x="778" y="545">屏幕</text><text x="394" y="575" font-size="17" font-weight="500">拖曳球體，觀察影子大小變化</text></g>
      </svg>`;
    frame.insertBefore(fallback, canvas);
    canvas.hidden = true;
    resetButton.parentElement.hidden = true;
    status.textContent = '拖曳球體靠近或遠離光源，觀察影子大小。';
    feedback.textContent = '靠近光源時，影子較大；遠離光源時，影子較小。';
    xiaokuiObservation.textContent = '遮擋物靠近光源時，影子會變大；遠離光源時，影子會變小。';
    const svg = fallback.querySelector('svg');
    const ballHandle = fallback.querySelector('#fallback-size-ball');
    const beam = fallback.querySelector('#fallback-beam');
    const shadow = fallback.querySelector('#fallback-shadow');
    const shadowBlur = fallback.querySelector('#fallback-shadow-blur');
    const post = fallback.querySelector('#fallback-post');
    const carriage = fallback.querySelector('#fallback-carriage');
    const ball = fallback.querySelector('#fallback-ball-object');
    const highlight = fallback.querySelector('#fallback-highlight');
    let position = 340;
    let draggingFallback = false;
    const updateFallback = (next) => {
      position = THREE.MathUtils.clamp(next, 320, 710);
      const shadowRadius = THREE.MathUtils.mapLinear(position, 320, 710, 46, 17);
      ballHandle.setAttribute('aria-valuenow', String(Math.round((position - 320) / 3.9)));
      post.setAttribute('d', `M${position} 405v27`);
      carriage.setAttribute('x', String(position - 35));
      ball.setAttribute('cx', String(position));
      highlight.setAttribute('cx', String(position - 10));
      shadow.setAttribute('rx', String(shadowRadius));
      shadow.setAttribute('ry', String(shadowRadius * 1.12));
      shadowBlur.setAttribute('rx', String(shadowRadius * 1.2));
      shadowBlur.setAttribute('ry', String(shadowRadius * 1.35));
      beam.setAttribute('d', `M250 337 L${position} 331 L842 ${350 - shadowRadius} L842 ${350 + shadowRadius} L${position} 409 L250 386 Z`);
      const nearLight = position < 430;
      feedback.textContent = nearLight
        ? '球體靠近光源，屏幕上的影子較大；往屏幕方向移動，影子會縮小。'
        : position > 610
          ? '球體遠離光源、靠近屏幕，影子較小；往光源方向移動，影子會放大。'
          : '球體越靠近光源，屏幕上的影子越大；越遠離光源，影子越小。';
      status.textContent = nearLight ? '球體靠近光源，影子較大。' : position > 610 ? '球體遠離光源，影子較小。' : '拖曳球體，觀察屏幕影子變化。';
      xiaokuiObservation.textContent = '遮擋物靠近光源時，影子會變大；遠離光源時，影子會變小。';
    };
    const moveFallback = (event) => {
      const bounds = svg.getBoundingClientRect();
      updateFallback((event.clientX - bounds.left) * 1000 / bounds.width);
    };
    ballHandle.addEventListener('pointerdown', (event) => { draggingFallback = true; svg.setPointerCapture(event.pointerId); ballHandle.style.cursor = 'grabbing'; moveFallback(event); });
    svg.addEventListener('pointermove', (event) => { if (draggingFallback) moveFallback(event); });
    const stopFallback = (event) => { draggingFallback = false; if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId); ballHandle.style.cursor = 'grab'; };
    svg.addEventListener('pointerup', stopFallback);
    svg.addEventListener('pointercancel', stopFallback);
    ballHandle.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      updateFallback(position + (event.key === 'ArrowLeft' ? -18 : 18));
    });
    updateFallback(position);
    canvas.setAttribute('aria-label', '使用可拖曳的影子大小互動示意場景');
  }
}
