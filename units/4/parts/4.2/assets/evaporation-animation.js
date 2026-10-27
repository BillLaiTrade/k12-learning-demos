import * as THREE from 'three';
import { RoomEnvironment } from '../../../../../parts/3.1/assets/vendor/three/examples/jsm/environments/RoomEnvironment.js';
import { CHECKPOINTS, DURATION, evaporationState } from './evaporation-state.js?v=boiling-1';

const host = document.getElementById('evap-visual');
const stage = document.getElementById('evap-stage');
const caption = document.getElementById('evap-caption');
const seek = document.getElementById('evap-seek');
const play = document.getElementById('evap-play');
const previous = document.getElementById('evap-prev');
const next = document.getElementById('evap-next');
const replay = document.getElementById('evap-replay');
const steps = [...document.querySelectorAll('[data-evap-step]')];
const phases = {
  warming: ['受熱升溫', '鹽水正在受熱，水面仍較平靜；水在還沒沸騰時也會蒸發。'],
  bubbles: ['細泡開始上升', '受熱處出現細小氣泡，氣泡往上移動；水面開始出現擾動。'],
  boiling: ['持續沸騰', '鹽水沸騰時，水蒸氣泡持續由液體內部上升，在水面破裂；水面翻動，水位逐漸降低。'],
  crystallizing: ['細晶逐漸長大', '水量減少後，鹽開始從溶液中析出。先看容器邊緣的細晶，再觀察晶體逐漸長大。'],
  shallow: ['水層變淺、晶體增多', '水層變得很淺，氣泡逐漸減少；底部留下的鹽晶體持續增多、長大。'],
  dry: ['留下鹽晶體', '水分蒸發後，容器底部留下固態的鹽晶體，不再有液層，也不再冒泡。']
};

async function initialize() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0xe7e0d4);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.replaceChildren(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2, 2, 1.251, -1.251, 0.1, 50);
  camera.position.set(0, 1.4, 10);
  camera.lookAt(0, -0.063, 0);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();

  scene.environmentIntensity = 0.7;
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x8e8170, 0.4));
  const key = new THREE.DirectionalLight(0xfff7ed, 1.6);
  key.position.set(-3, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -3;
  key.shadow.camera.right = key.shadow.camera.top = 3;
  key.shadow.bias = -0.001;
  key.shadow.normalBias = 0.025;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe6f0ff, 0.6);
  fill.position.set(4, 3, -3);
  scene.add(fill);

  // A fixed photographic apparatus stays still throughout the experiment.
  // The liquid is refractive geometry in front of it, using the photograph
  // as the transmission background rather than painting an oval on top.
  const apparatusTexture = await new THREE.TextureLoader().loadAsync(new URL('./evaporation-dish.webp', import.meta.url).href);
  apparatusTexture.colorSpace = THREE.SRGBColorSpace;
  // Stay in the opaque queue so the transmission pass includes the photo;
  // custom alpha blending still preserves the photographed glass edges.
  const apparatus = new THREE.Mesh(new THREE.PlaneGeometry(4, 4 * 992 / 1586), new THREE.MeshBasicMaterial({ map: apparatusTexture, toneMapped: false, blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation }));
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  apparatus.position.copy(new THREE.Vector3(0, -0.063, 0).addScaledVector(direction, 3));
  apparatus.quaternion.copy(camera.quaternion);
  scene.add(apparatus);

  // The liquid is one deforming volume, not a sequence of pictures.
  const waterProfile = [[0,0],[1,0],[1,0.015],[1,0.985],[0.999,1],[0.98,0.988]];
  for (let ring = 15; ring >= 0; ring--) waterProfile.push([0.96 * ring / 15, 0.988]);
  const waterGeometry = new THREE.LatheGeometry(waterProfile.map(([r,y]) => new THREE.Vector2(r,y)), 96);
  const originalPositions = waterGeometry.attributes.position.array.slice();
  const waterMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.035, transmission: 1, ior: 1.333, thickness: 0.4, envMapIntensity: 1.3, attenuationColor: new THREE.Color(0xf5fcfa), attenuationDistance: 5, side: THREE.DoubleSide });
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  scene.add(water);
  water.castShadow = false;
  water.renderOrder = 1;
  const waveData = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const k = (y * 128 + x) * 4;
    waveData[k] = 128 + Math.round(18 * Math.cos(x * Math.PI / 32) * Math.sin(y * Math.PI / 64));
    waveData[k + 1] = 128 + Math.round(18 * Math.sin(x * Math.PI / 32) * Math.cos(y * Math.PI / 64));
    waveData[k + 2] = 254; waveData[k + 3] = 255;
  }
  const normals = new THREE.DataTexture(waveData, 128, 128);
  normals.wrapS = normals.wrapT = THREE.RepeatWrapping;
  normals.needsUpdate = true;
  waterMaterial.normalMap = normals;
  waterMaterial.normalScale.set(0.035, 0.035);

  let seed = 421;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const saltMaterial = new THREE.MeshPhysicalMaterial({ color: 0xfffdf5, roughness: 0.27, clearcoat: 0.3 });
  const salt = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), saltMaterial, 340);
  salt.castShadow = true; salt.receiveShadow = true;
  salt.renderOrder = 0;
  scene.add(salt);
  const grains = Array.from({ length: salt.count }, () => {
    const angle = random() * Math.PI * 2, distance = Math.sqrt(random()) * 0.92;
    return { x: Math.cos(angle) * distance, z: Math.sin(angle) * distance, size: 0.018 + random() * 0.028, rotation: random() * Math.PI, onset: distance > 0.65 ? random() * 0.06 : 0.04 + random() * 0.18 };
  });
  // Air/vapor cavities have clear centers and reflective edges. They rise
  // inside the liquid and disappear at the surface, never above the bowl.
  const bubbleMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    vertexShader: `varying vec3 vNormal; varying vec3 vView;
      void main(){vec4 point=modelViewMatrix*instanceMatrix*vec4(position,1.0);
        vNormal=normalize(normalMatrix*mat3(instanceMatrix)*normal);vView=-point.xyz;
        gl_Position=projectionMatrix*point;}`,
    fragmentShader: `varying vec3 vNormal; varying vec3 vView;
      void main(){vec3 n=normalize(vNormal);vec3 eye=normalize(vView);
        float edge=pow(1.0-max(dot(n,eye),0.0),2.0);
        float shine=pow(max(dot(n,normalize(vec3(-0.4,0.8,0.7))),0.0),20.0);
        vec3 color=mix(vec3(0.25,0.31,0.33),vec3(1.0),max(edge,shine));
        gl_FragColor=vec4(color,0.045+edge*0.65+shine*0.35);}`
  });
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 10), bubbleMaterial, 56);
  bubbles.renderOrder = 2;
  scene.add(bubbles);
  const bubbleSeeds = Array.from({ length: bubbles.count }, () => {
    const angle = random() * Math.PI * 2, distance = Math.sqrt(random()) * 0.82;
    return { x: Math.cos(angle) * distance, z: Math.sin(angle) * distance, radius: 0.018 + random() * 0.032, phase: random(), speed: 0.65 + random() * 0.60 };
  });
  const transform = new THREE.Object3D();
  const contact = new THREE.Mesh(new THREE.CircleGeometry(0.98, 64), new THREE.ShadowMaterial({ opacity: 0.18 }));
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = -0.001;
  contact.receiveShadow = true;
  scene.add(contact);

  let progress = 0, playing = false, lastTime = null, animationId = null, currentStep = 0, currentPhase = '';
  function draw(time = 0) {
    const state = evaporationState(progress);
    const height = state.water * 0.45;
    water.visible = height > 0.001;
    const positions = waterGeometry.attributes.position.array;
    let surfaceDisplacement = 0;
    for (let i = 0; i < positions.length; i += 3) {
      const normalizedY = originalPositions[i + 1];
      const r = 0.975 + 0.30 * (height * normalizedY / 0.75);
      positions[i] = originalPositions[i] * r;
      positions[i + 1] = normalizedY * height;
      positions[i + 2] = originalPositions[i + 2] * r;
      const radial = Math.hypot(originalPositions[i], originalPositions[i + 2]);
      if (normalizedY > 0.98 && radial < 0.98) {
        const x = positions[i], z = positions[i + 2];
        const waves = Math.sin(radial * 24 - time * 12) * 0.55 + Math.sin(x * 19 + time * 15) * Math.cos(z * 16 - time * 9) * 0.45;
        const amplitude = Math.min(height * 0.18, 0.0006 + state.boiling * 0.014);
        let ripples = 0;
        for (let vent = 0; vent < 12; vent++) {
          const bubble = bubbleSeeds[vent];
          const life = (time * bubble.speed + bubble.phase) % 1;
          if (life <= 0.75) continue;
          const age = (life - 0.75) / 0.25;
          const distance = Math.hypot(x - bubble.x, z - bubble.z);
          ripples += Math.exp(-Math.pow((distance - age * 0.25) / 0.035, 2)) * Math.sin(age * Math.PI) * 0.007;
        }
        const displacement = (waves * amplitude + ripples * state.boiling * Math.min(1, height / 0.08)) * (1 - Math.pow(radial, 4));
        positions[i + 1] += displacement;
        surfaceDisplacement = Math.max(surfaceDisplacement, Math.abs(displacement));
      }
    }
    waterGeometry.attributes.position.needsUpdate = true;
    waterGeometry.computeVertexNormals();
    waterMaterial.thickness = Math.max(0.01, height);
    waterMaterial.normalScale.setScalar(0.035 + state.boiling * 0.13);
    normals.offset.set(time * 0.012, time * 0.007);
    let visibleGrains = 0;
    grains.forEach((grain, i) => {
      const localGrowth = THREE.MathUtils.clamp((state.crystals - grain.onset) / (1 - grain.onset), 0, 1);
      const growth = Math.pow(localGrowth, 0.45);
      const size = grain.size * growth;
      if (size > 0.004) visibleGrains++;
      transform.position.set(grain.x, 0.007 + size / 2, grain.z);
      transform.rotation.set(0.05, grain.rotation, 0.06);
      transform.scale.setScalar(size);
      transform.updateMatrix();
      salt.setMatrixAt(i, transform.matrix);
    });
    salt.instanceMatrix.needsUpdate = true;
    let visibleBubbles = 0;
    bubbleSeeds.forEach((bubble, i) => {
      const life = (time * bubble.speed + bubble.phase) % 1;
      const envelope = THREE.MathUtils.smoothstep(life, 0, 0.10) * (1 - THREE.MathUtils.smoothstep(life, 0.82, 1));
      const enabled = Math.min(1, Math.max(0, state.boiling * bubbles.count - i));
      const size = Math.min(bubble.radius * (0.35 + life * 0.65), height * 0.18) * envelope * enabled;
      if (size > 0.001) visibleBubbles++;
      transform.position.set(bubble.x + Math.sin(time * 3 + bubble.phase * 9) * 0.008, size + Math.max(0, height - size * 2) * Math.pow(life, 0.8), bubble.z);
      transform.rotation.set(0, 0, 0);
      transform.scale.set(size, size * 1.12, size);
      transform.updateMatrix();
      bubbles.setMatrixAt(i, transform.matrix);
    });
    bubbles.instanceMatrix.needsUpdate = true;
    stage.dataset.progress = progress.toFixed(5);
    stage.dataset.water = state.water.toFixed(5);
    stage.dataset.crystals = state.crystals.toFixed(5);
    stage.dataset.boiling = state.boiling.toFixed(5);
    stage.dataset.bubbles = String(visibleBubbles);
    stage.dataset.grains = String(visibleGrains);
    stage.dataset.ripple = surfaceDisplacement.toFixed(5);
    stage.dataset.phase = state.phase;
    stage.dataset.step = String(state.step);
    if (state.step !== currentStep) {
      currentStep = state.step;
      steps.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.evapStep) === currentStep)));
    }
    if (state.phase !== currentPhase) {
      currentPhase = state.phase;
      document.getElementById('evap-phase').textContent = phases[currentPhase][0];
      caption.textContent = phases[currentPhase][1];
    }
    seek.value = String(Math.round(progress * 1000));
    seek.setAttribute('aria-valuetext', `示意進度 ${Math.round(progress * 100)}%，${steps[currentStep - 1].textContent}`);
    document.getElementById('evap-progress').textContent = `${Math.round(progress * 100)}%`;
    previous.disabled = progress <= 0;
    next.disabled = progress >= 1;
    play.textContent = playing ? '暫停' : progress >= 1 ? '重新播放' : '播放';
    play.setAttribute('aria-pressed', String(playing));
    renderer.render(scene, camera);
  }
  function pause() {
    playing = false;
    lastTime = null;
    if (animationId !== null) cancelAnimationFrame(animationId);
    animationId = null;
    draw(progress * DURATION);
  }
  function frame(timestamp) {
    if (!playing) return;
    if (lastTime !== null) progress = Math.min(1, progress + Math.max(0, timestamp - lastTime) / (DURATION * 1000));
    lastTime = timestamp;
    if (progress >= 1) { pause(); return; }
    draw(progress * DURATION);
    animationId = requestAnimationFrame(frame);
  }
  function start() {
    if (playing) return;
    if (progress >= 1) progress = 0;
    playing = true;
    lastTime = null;
    draw(progress * DURATION);
    animationId = requestAnimationFrame(frame);
  }
  function jump(value) { pause(); progress = evaporationState(value).progress; draw(progress * DURATION); }
  play.addEventListener('click', () => playing ? pause() : start());
  replay.addEventListener('click', () => { jump(0); start(); });
  seek.addEventListener('input', () => jump(Number(seek.value) / 1000));
  steps.forEach(button => button.addEventListener('click', () => jump(CHECKPOINTS[Number(button.dataset.evapStep) - 1])));
  previous.addEventListener('click', () => jump([...CHECKPOINTS].reverse().find(value => value < progress - 0.001) ?? 0));
  next.addEventListener('click', () => jump(CHECKPOINTS.find(value => value > progress + 0.001) ?? 1));
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.top = 2 * height / width;
    camera.bottom = -camera.top;
    camera.updateProjectionMatrix();
    draw(progress * DURATION);
  }).observe(host);
  stage.dataset.ready = 'true';
  draw();
}

initialize().catch(error => {
  stage.dataset.ready = 'error';
  caption.textContent = '無法載入連續動畫，請重新整理頁面，或使用支援 WebGL 的瀏覽器。';
  [play, replay, previous, next, seek, ...steps].forEach(control => { control.disabled = true; });
  console.error('Evaporation animation failed:', error);
});
