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

    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 60);
    const target = new THREE.Vector3(0, 1.24, 0.12);
    const initialOrbit = { azimuth: -2.48, polar: 1.19, radius: 9.7 };
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

    const mat = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.68, metalness: 0.08, ...options });
    const materials = {
      floor: mat('#e9eee8'),
      table: mat('#b58d61', { roughness: 0.82 }),
      tableEdge: mat('#836347'),
      metal: mat('#65746e', { metalness: 0.62, roughness: 0.34 }),
      metalDark: mat('#3c4a45', { metalness: 0.46, roughness: 0.39 }),
      lamp: mat('#263431', { metalness: 0.42, roughness: 0.38 }),
      ball: mat('#343c39', { roughness: 0.34, metalness: 0.12 }),
      screen: mat('#fffdf4', { roughness: 0.98, side: THREE.DoubleSide }),
      screenFrame: mat('#52645c', { metalness: 0.3, roughness: 0.48 }),
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

    // Table and the short cross-rail keep the sphere's distance from the lamp and screen fixed.
    box(scene, [8.2, 0.2, 5.6], [0, -0.08, 0], materials.table);
    box(scene, [8.2, 0.08, 5.6], [0, -0.22, 0], materials.tableEdge);
    for (const x of [-3.4, 3.4]) {
      for (const z of [-2.15, 2.15]) box(scene, [0.16, 0.45, 0.16], [x, -0.38, z], materials.metalDark);
    }

    // A compact fixed lamp points straight toward the screen.
    const lampBody = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.82, 32), materials.lamp);
    lampBody.rotation.x = Math.PI / 2;
    lampBody.position.set(0, 1.55, -3.95);
    lampBody.castShadow = true;
    scene.add(lampBody);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.29, 40), materials.lens);
    lens.position.set(0, 1.55, -3.52);
    scene.add(lens);
    const lampRim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.045, 10, 40), materials.metal);
    lampRim.position.set(0, 1.55, -3.49);
    scene.add(lampRim);
    const lampStand = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 1.02, 20), materials.metalDark);
    lampStand.position.set(0, 0.62, -3.95);
    scene.add(lampStand);
    const lampFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 0.13, 28), materials.metalDark);
    lampFoot.position.set(0, 0.12, -3.95);
    scene.add(lampFoot);

    const spotlight = new THREE.SpotLight('#ffe0a0', 78, 12, 0.41, 0.18, 1.35);
    spotlight.position.set(0, 1.55, -3.46);
    spotlight.target.position.set(0, 1.55, 3.7);
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.set(1024, 1024);
    spotlight.shadow.camera.near = 0.1;
    spotlight.shadow.camera.far = 12;
    spotlight.shadow.bias = -0.0002;
    spotlight.shadow.normalBias = 0.018;
    spotlight.shadow.radius = 4;
    scene.add(spotlight, spotlight.target);

    // Fixed screen with a light-catching front surface and a slim physical frame.
    const screenZ = 3.72;
    const screenWidth = 4.25;
    const screenHeight = 3.08;
    const screenCenterY = 1.62;
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

    // The sphere rides sideways into and out of the beam; its depth never changes.
    const railZ = 0.12;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(5.05, 0.075, 0.12), materials.metal);
    rail.position.set(0, 0.18, railZ);
    scene.add(rail);
    for (const x of [-2.48, 2.48]) box(scene, [0.18, 0.16, 0.24], [x, 0.08, railZ], materials.metalDark);
    const blocker = new THREE.Group();
    scene.add(blocker);
    const carrier = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.34), materials.metalDark);
    carrier.position.set(0, 0.29, railZ);
    blocker.add(carrier);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.03, 18), materials.metal);
    post.position.set(0, 0.88, railZ);
    blocker.add(post);
    const sphereRadius = 0.43;
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(sphereRadius, 40, 32), materials.ball);
    sphere.position.set(0, 1.61, railZ);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    blocker.add(sphere);
    const targetX = 0;
    const parkedX = 2.38;
    blocker.position.x = parkedX;

    // Thin conceptual rays stop at the opaque sphere. They are teaching overlays, not visible air beams.
    const rayMaterial = new THREE.LineBasicMaterial({ color: '#e6aa46', transparent: true, opacity: 0.68, depthWrite: false });
    const sourcePoint = new THREE.Vector3(0, 1.55, -3.45);
    const rayTargets = [];
    const rays = [];
    for (let i = -3; i <= 3; i += 1) {
      const endpoint = new THREE.Vector3(i * 0.49, 1.55, screenZ - 0.018);
      const geometry = new THREE.BufferGeometry().setFromPoints([sourcePoint, endpoint]);
      const line = new THREE.Line(geometry, rayMaterial);
      line.renderOrder = 2;
      scene.add(line);
      rayTargets.push(endpoint);
      rays.push(line);
    }

    const updateRays = () => {
      const center = new THREE.Vector3(blocker.position.x, 1.61, railZ);
      rayTargets.forEach((endpoint, index) => {
        const direction = endpoint.clone().sub(sourcePoint);
        const length = direction.length();
        direction.normalize();
        const projection = center.clone().sub(sourcePoint).dot(direction);
        const closest = sourcePoint.clone().addScaledVector(direction, projection);
        const distanceToRay = closest.distanceTo(center);
        let end = endpoint;
        if (projection > 0 && projection < length && distanceToRay < sphereRadius) {
          const stopDistance = Math.max(0.06, projection - Math.sqrt(sphereRadius ** 2 - distanceToRay ** 2));
          end = sourcePoint.clone().addScaledVector(direction, stopDistance);
        }
        rays[index].geometry.setFromPoints([sourcePoint, end]);
      });
    };

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
        updateRays();
        if (progress >= 1) {
          animation = null;
          status.textContent = blocked ? '球體擋住部分光，屏幕相應位置形成影子。' : '球體停在光路旁，屏幕均勻受光。';
        }
      }
      renderer.render(scene, camera);
    };
    updateRays();
    animate();
  } catch (error) {
    console.error('Shadow 3D scene failed to initialize:', error);
    status.textContent = '立體實驗場景無法載入，請重新整理頁面再試。';
    canvas.setAttribute('aria-label', '影子實驗場景無法載入');
  }
}
