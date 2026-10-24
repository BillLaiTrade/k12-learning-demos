import * as THREE from './vendor/three/build/three.module.js';

const canvas = document.querySelector('#shadow-3d-scene');
if (canvas) {
  const status = document.querySelector('#shadow-scene-status');
  const toggle = document.querySelector('#shadow-block-toggle');
  const toggleLabel = document.querySelector('#shadow-toggle-label');
  const resetButton = document.querySelector('#shadow-view-reset');

  try {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e9eee8');
    scene.fog = new THREE.Fog('#e9eee8', 14, 28);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const makeStudioEnvironment = () => {
      const envCanvas = document.createElement('canvas');
      envCanvas.width = 1024;
      envCanvas.height = 512;
      const context = envCanvas.getContext('2d');
      const base = context.createLinearGradient(0, 0, 0, 512);
      base.addColorStop(0, '#65766c');
      base.addColorStop(0.48, '#b5c3b5');
      base.addColorStop(1, '#76634f');
      context.fillStyle = base;
      context.fillRect(0, 0, 1024, 512);
      const softbox = (x, y, width, height, color) => {
        context.save();
        context.shadowColor = color;
        context.shadowBlur = 40;
        context.fillStyle = color;
        context.fillRect(x, y, width, height);
        context.restore();
      };
      softbox(125, 102, 170, 148, 'rgba(255, 245, 219, 0.82)');
      softbox(535, 76, 270, 128, 'rgba(255, 251, 235, 0.7)');
      softbox(850, 142, 80, 205, 'rgba(241, 192, 116, 0.38)');
      softbox(250, 390, 530, 18, 'rgba(255, 220, 164, 0.22)');
      const texture = new THREE.CanvasTexture(envCanvas);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    scene.environment = makeStudioEnvironment();
    scene.environmentIntensity = 0.42;

    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 60);
    const target = new THREE.Vector3(0, 1.24, 0.12);
    const initialOrbit = { azimuth: -2.82, polar: 1.22, radius: 11.8 };
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

    scene.add(new THREE.HemisphereLight('#fffdf4', '#77867d', 1.65));
    const fill = new THREE.DirectionalLight('#e2ece8', 1.25);
    fill.position.set(5, 8, -5);
    scene.add(fill);

    const makeWoodTexture = () => {
      const textureCanvas = document.createElement('canvas');
      textureCanvas.width = 1024;
      textureCanvas.height = 1024;
      const context = textureCanvas.getContext('2d');
      const base = context.createLinearGradient(0, 0, 0, textureCanvas.height);
      base.addColorStop(0, '#c9a77d');
      base.addColorStop(0.48, '#b68d62');
      base.addColorStop(1, '#a77c52');
      context.fillStyle = base;
      context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
      let seed = 17;
      const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
      for (let line = 0; line < 210; line += 1) {
        const y = random() * textureCanvas.height;
        context.beginPath();
        context.moveTo(0, y);
        for (let x = 0; x <= textureCanvas.width; x += 96) {
          context.quadraticCurveTo(x + 48, y + (random() - 0.5) * 13, x + 96, y + (random() - 0.5) * 7);
        }
        context.strokeStyle = random() > 0.54 ? `rgba(84, 53, 31, ${0.018 + random() * 0.035})` : `rgba(255, 232, 193, ${0.025 + random() * 0.035})`;
        context.lineWidth = 0.5 + random() * 2.2;
        context.stroke();
      }
      for (let knot = 0; knot < 11; knot += 1) {
        const x = random() * textureCanvas.width;
        const y = random() * textureCanvas.height;
        context.beginPath();
        context.ellipse(x, y, 10 + random() * 20, 2 + random() * 4, 0, 0, Math.PI * 2);
        context.strokeStyle = 'rgba(95, 59, 34, 0.08)';
        context.lineWidth = 1;
        context.stroke();
      }
      const texture = new THREE.CanvasTexture(textureCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2, 1);
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      return texture;
    };
    const makeBackdropTexture = () => {
      const textureCanvas = document.createElement('canvas');
      textureCanvas.width = 1024;
      textureCanvas.height = 768;
      const context = textureCanvas.getContext('2d');
      const wash = context.createLinearGradient(0, 0, 0, textureCanvas.height);
      wash.addColorStop(0, '#d6e0d6');
      wash.addColorStop(0.48, '#e8e7da');
      wash.addColorStop(1, '#f5e8d2');
      context.fillStyle = wash;
      context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
      const glow = context.createRadialGradient(650, 355, 25, 650, 355, 470);
      glow.addColorStop(0, 'rgba(255, 250, 231, 0.55)');
      glow.addColorStop(1, 'rgba(255, 250, 231, 0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
      let seed = 213;
      const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
      for (let grain = 0; grain < 7200; grain += 1) {
        const alpha = 0.012 + random() * 0.018;
        context.fillStyle = random() > 0.5 ? `rgba(255, 255, 255, ${alpha})` : `rgba(77, 101, 88, ${alpha})`;
        context.fillRect(random() * textureCanvas.width, random() * textureCanvas.height, 1.2, 1.2);
      }
      const texture = new THREE.CanvasTexture(textureCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const makeScreenTexture = () => {
      const textureCanvas = document.createElement('canvas');
      textureCanvas.width = 512;
      textureCanvas.height = 512;
      const context = textureCanvas.getContext('2d');
      const surface = context.createLinearGradient(0, 0, 512, 512);
      surface.addColorStop(0, '#fffef8');
      surface.addColorStop(1, '#f4f1e7');
      context.fillStyle = surface;
      context.fillRect(0, 0, 512, 512);
      let seed = 93;
      const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
      for (let fiber = 0; fiber < 4800; fiber += 1) {
        const shade = random() > 0.5 ? 'rgba(117, 106, 80, 0.035)' : 'rgba(255, 255, 255, 0.3)';
        context.fillStyle = shade;
        context.fillRect(random() * 512, random() * 512, 1 + random() * 2, 1);
      }
      const texture = new THREE.CanvasTexture(textureCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const makeBallTexture = () => {
      const textureCanvas = document.createElement('canvas');
      textureCanvas.width = 512;
      textureCanvas.height = 512;
      const context = textureCanvas.getContext('2d');
      context.fillStyle = '#64746a';
      context.fillRect(0, 0, 512, 512);
      let seed = 73;
      const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
      for (let dot = 0; dot < 4300; dot += 1) {
        const value = 77 + Math.floor(random() * 72);
        context.fillStyle = `rgba(${value + 4}, ${value + 12}, ${value + 7}, ${0.035 + random() * 0.12})`;
        const size = 0.35 + random() * 1.5;
        context.beginPath();
        context.arc(random() * 512, random() * 512, size, 0, Math.PI * 2);
        context.fill();
      }
      const texture = new THREE.CanvasTexture(textureCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      return texture;
    };
    const mat = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.68, metalness: 0.08, ...options });
    const woodTexture = makeWoodTexture();
    const backdropTexture = makeBackdropTexture();
    const screenTexture = makeScreenTexture();
    const ballTexture = makeBallTexture();
    const materials = {
      floor: mat('#f2e8d6'),
      table: new THREE.MeshPhysicalMaterial({ color: '#fff5e5', map: woodTexture, roughness: 0.43, metalness: 0.02, clearcoat: 0.24, clearcoatRoughness: 0.56 }),
      tableEdge: mat('#805c3c', { roughness: 0.56 }),
      backdrop: new THREE.MeshBasicMaterial({ map: backdropTexture }),
      metal: mat('#9aa79d', { metalness: 0.42, roughness: 0.34 }),
      metalDark: mat('#526158', { metalness: 0.34, roughness: 0.37 }),
      lamp: mat('#35443e', { metalness: 0.38, roughness: 0.34 }),
      ball: new THREE.MeshStandardMaterial({ color: '#dce4d9', map: ballTexture, roughness: 0.78, metalness: 0.015, bumpMap: ballTexture, bumpScale: 0.008 }),
      screen: new THREE.MeshPhysicalMaterial({ color: '#fffdf5', map: screenTexture, roughness: 0.91, metalness: 0, side: THREE.DoubleSide }),
      screenFrame: mat('#52645c', { metalness: 0.55, roughness: 0.31 }),
      lens: new THREE.MeshStandardMaterial({ color: '#ffe4a0', emissive: '#ffb937', emissiveIntensity: 2.2, roughness: 0.24 })
    };

    const box = (parent, size, position, material, { cast = true, receive = true } = {}) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...position);
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      parent.add(mesh);
      return mesh;
    };

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), materials.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.25;
    floor.receiveShadow = true;
    scene.add(floor);

    // A soft, textured studio wall gives the apparatus a warm illustrated-lab setting.
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), materials.backdrop);
    backdrop.position.set(0, 5, 6.1);
    backdrop.receiveShadow = false;
    scene.add(backdrop);

    // Table and the short cross-rail keep the sphere's distance from the lamp and screen fixed.
    box(scene, [8.2, 0.2, 5.6], [0, -0.08, 0], materials.table);
    box(scene, [8.2, 0.08, 5.6], [0, -0.22, 0], materials.tableEdge);
    for (const x of [-3.4, 3.4]) {
      for (const z of [-2.15, 2.15]) box(scene, [0.16, 0.45, 0.16], [x, -0.38, z], materials.metalDark);
    }

    // A compact fixed lamp points straight toward the screen.
    const lampBody = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.82, 48), materials.lamp);
    lampBody.rotation.x = Math.PI / 2;
    lampBody.position.set(0, 1.55, -3.95);
    lampBody.castShadow = true;
    scene.add(lampBody);
    for (const [z, radius] of [[-4.37, 0.34], [-3.58, 0.36]]) {
      const housingRim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.022, 10, 48), materials.metal);
      housingRim.position.set(0, 1.55, z);
      scene.add(housingRim);
    }
    const rearCap = new THREE.Mesh(new THREE.CircleGeometry(0.255, 48), materials.metalDark);
    rearCap.position.set(0, 1.55, -4.372);
    rearCap.rotation.y = Math.PI;
    scene.add(rearCap);
    const rearMark = new THREE.Mesh(new THREE.CircleGeometry(0.07, 32), materials.metal);
    rearMark.position.set(0, 1.55, -4.378);
    rearMark.rotation.y = Math.PI;
    scene.add(rearMark);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.29, 40), materials.lens);
    lens.position.set(0, 1.55, -3.52);
    scene.add(lens);
    const lampRim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.045, 10, 40), materials.metal);
    lampRim.position.set(0, 1.55, -3.49);
    scene.add(lampRim);
    for (const radius of [0.235, 0.275]) {
      const lensRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.012, 8, 40), materials.metalDark);
      lensRing.position.set(0, 1.55, -3.475);
      scene.add(lensRing);
    }
    for (const x of [-0.14, -0.07, 0, 0.07, 0.14]) {
      const vent = box(scene, [0.024, 0.014, 0.24], [x, 1.86, -4.02], materials.metalDark, { cast: false, receive: false });
      vent.rotation.z = x * 0.16;
    }
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
      const footScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.018, 16), materials.metal);
      footScrew.position.set(x, 0.19, -3.95);
      scene.add(footScrew);
    }
    const powerCableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.56, -4.36), new THREE.Vector3(-0.27, 1.05, -4.48),
      new THREE.Vector3(-0.3, 0.4, -4.44), new THREE.Vector3(-0.48, 0.035, -4.22),
      new THREE.Vector3(-0.94, 0.035, -3.96), new THREE.Vector3(-1.55, 0.035, -3.72)
    ]);
    const powerCable = new THREE.Mesh(new THREE.TubeGeometry(powerCableCurve, 56, 0.022, 8, false), materials.metalDark);
    powerCable.castShadow = true;
    scene.add(powerCable);

    const spotlight = new THREE.SpotLight('#ffe0a0', 78, 12, 0.41, 0.18, 1.35);
    spotlight.position.set(0, 1.55, -3.46);
    spotlight.target.position.set(0, 1.55, 3.7);
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.set(1024, 1024);
    spotlight.shadow.camera.near = 0.1;
    spotlight.shadow.camera.far = 12;
    spotlight.shadow.bias = -0.0002;
    spotlight.shadow.radius = 4;
    scene.add(spotlight, spotlight.target);

    // Fixed screen with a light-catching front surface and a slim physical frame.
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
    for (const x of [-screenWidth / 2 - 0.055, screenWidth / 2 + 0.055]) {
      for (const y of [screenCenterY - screenHeight / 2 + 0.18, screenCenterY + screenHeight / 2 - 0.18]) {
        const fastener = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.018, 16), materials.metalDark);
        fastener.position.set(x, y, screenZ - 0.025);
        fastener.rotation.x = Math.PI / 2;
        scene.add(fastener);
      }
    }

    // The sphere rides sideways into and out of the beam; its depth never changes.
    const railZ = 0.12;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(5.05, 0.075, 0.12), materials.metal);
    rail.position.set(0, 0.18, railZ);
    scene.add(rail);
    for (let mark = -11; mark <= 11; mark += 1) {
      const major = mark % 5 === 0;
      box(scene, [0.014, major ? 0.012 : 0.007, major ? 0.09 : 0.055], [mark * 0.205, 0.225, railZ + 0.05], materials.metalDark, { cast: false, receive: false });
    }
    for (const x of [-2.48, 2.48]) box(scene, [0.18, 0.16, 0.24], [x, 0.08, railZ], materials.metalDark);
    const blocker = new THREE.Group();
    scene.add(blocker);
    const carrier = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.34), materials.metalDark);
    carrier.position.set(0, 0.29, railZ);
    blocker.add(carrier);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.03, 18), materials.metal);
    post.position.set(0, 0.88, railZ);
    blocker.add(post);
    for (const y of [0.48, 1.27]) {
      const postCollar = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 8, 24), materials.metalDark);
      postCollar.position.set(0, y, railZ);
      postCollar.rotation.x = Math.PI / 2;
      blocker.add(postCollar);
    }
    const sphereRadius = 0.43;
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(sphereRadius, 40, 32), materials.ball);
    sphere.position.set(0, 1.61, railZ);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    blocker.add(sphere);
    const targetX = 0;
    const parkedX = 2.38;
    blocker.position.x = parkedX;

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

    let blocked = false;
    let animation = null;
    const duration = 920;
    const ease = (value) => value < 0.5 ? 4 * value ** 3 : 1 - ((-2 * value + 2) ** 3) / 2;
    const setToggleState = (value) => {
      blocked = value;
      toggle.setAttribute('aria-pressed', String(value));
      toggleLabel.textContent = value ? '滑出光路' : '滑入光路';
      toggle.setAttribute('aria-label', value ? '將遮擋球沿導軌滑出光路' : '將遮擋球沿導軌滑入光路');
    };
    toggle.addEventListener('click', () => {
      const nextState = !blocked;
      setToggleState(nextState);
      const from = blocker.position.x;
      const to = nextState ? targetX : parkedX;
      animation = { from, to, started: performance.now(), duration: duration * Math.max(0.25, Math.abs(to - from) / (parkedX - targetX)) };
      status.textContent = nextState ? '球體沿導軌滑入光路，屏幕上的影子逐漸形成。' : '球體沿導軌退出光路，屏幕逐漸恢復受光。';
    });

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
    const pinchDistance = () => {
      const points = [...pointers.values()];
      if (points.length < 2) return 0;
      return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    };
    canvas.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      previousPoint = { x: event.clientX, y: event.clientY };
      previousPinch = pinchDistance();
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!pointers.has(event.pointerId)) return;
      const point = { x: event.clientX, y: event.clientY };
      pointers.set(event.pointerId, point);
      if (pointers.size >= 2) {
        const nextPinch = pinchDistance();
        if (previousPinch > 0 && nextPinch > 0) radius = THREE.MathUtils.clamp(radius * (previousPinch / nextPinch), 6.5, 18);
        previousPinch = nextPinch;
      } else if (previousPoint) {
        azimuth -= (point.x - previousPoint.x) * 0.006;
        polar = THREE.MathUtils.clamp(polar + (point.y - previousPoint.y) * 0.005, 0.45, 1.72);
      }
      previousPoint = point;
      updateCamera();
    });
    const endPointer = (event) => {
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
      if (animation) {
        const progress = THREE.MathUtils.clamp((performance.now() - animation.started) / animation.duration, 0, 1);
        blocker.position.x = THREE.MathUtils.lerp(animation.from, animation.to, ease(progress));
        if (progress >= 1) {
          animation = null;
          status.textContent = blocked ? '球體擋住部分光，屏幕相應位置形成影子。' : '球體停在光路旁，屏幕均勻受光。';
        }
      }
      renderer.render(scene, camera);
    };
    animate();
  } catch (error) {
    console.error('Shadow 3D scene failed to initialize:', error);
    status.textContent = '立體實驗場景無法載入，請重新整理頁面再試。';
    canvas.setAttribute('aria-label', '影子實驗場景無法載入');
  }
}
