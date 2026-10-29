/* Same quantity of substance in each comparison. No hidden detail panel. */
(() => {
  'use strict';
  const section = document.getElementById('s2');
  if (!section) return;
  const forms = [{ width:58, height:106 }, { width:98, height:64 }, { width:78, height:80 }];
  // Initial irregular positions; each particle then follows its own free-motion path.
  const gasPositions = [[0.6307, 0.6772], [0.9022, 0.2328], [0.1175, 0.7853], [0.3531, 0.3877], [0.8605, 0.4922], [0.5642, 0.1293], [0.7979, 0.7418], [0.9336, 0.0707], [0.9175, 0.6256], [0.2826, 0.599], [0.6797, 0.5213], [0.1469, 0.4049], [0.6826, 0.2933], [0.5652, 0.4259], [0.3776, 0.7477], [0.3578, 0.1103], [0.5755, 0.8581], [0.1454, 0.5547], [0.8344, 0.3635], [0.7855, 0.1502], [0.3275, 0.2391], [0.6896, 0.9361], [0.8883, 0.8693], [0.2553, 0.8784]];
  const gasFields = [];
  const fieldByGroup = new WeakMap();
  function gasFieldFor(group, bounds) {
    const existing = fieldByGroup.get(group);
    if (existing) { existing.resize(bounds); return existing; }
    let box = bounds;
    const fieldIndex = gasFields.length;
    const particles = [...group.querySelectorAll('.sv-particle')].map((node, i) => {
      const radius = +node.getAttribute('r');
      const angle = i * 2.39996323 + fieldIndex * .83;
      const speed = 28 + (i * 7 % 13);
      return { node, radius,
        x:box.left + radius + gasPositions[i][0] * (box.right - box.left - radius * 2),
        y:box.top + radius + gasPositions[i][1] * (box.bottom - box.top - radius * 2),
        vx:Math.cos(angle) * speed, vy:Math.sin(angle) * speed };
    });
    function keepInside(p) {
      const minX = box.left + p.radius, maxX = box.right - p.radius;
      const minY = box.top + p.radius, maxY = box.bottom - p.radius;
      if (p.x < minX) { p.x = minX; p.vx = Math.abs(p.vx); }
      if (p.x > maxX) { p.x = maxX; p.vx = -Math.abs(p.vx); }
      if (p.y < minY) { p.y = minY; p.vy = Math.abs(p.vy); }
      if (p.y > maxY) { p.y = maxY; p.vy = -Math.abs(p.vy); }
    }
    function separateCollisions() {
      for (let i = 0; i < particles.length; i++) for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = b.x - a.x, dy = b.y - a.y, radius = a.radius + b.radius;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared >= radius * radius) continue;
        const distance = Math.sqrt(distanceSquared);
        const nx = distance > .0001 ? dx / distance : Math.cos(i + j);
        const ny = distance > .0001 ? dy / distance : Math.sin(i + j);
        const overlap = (radius - distance) / 2 + .005;
        a.x -= nx * overlap; a.y -= ny * overlap;
        b.x += nx * overlap; b.y += ny * overlap;
        // Equal-mass elastic scattering changes direction without regenerating particles.
        const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (relative < 0) {
          a.vx += relative * nx; a.vy += relative * ny;
          b.vx -= relative * nx; b.vy -= relative * ny;
        }
        keepInside(a); keepInside(b);
      }
    }
    function render() {
      particles.forEach(p => { p.node.setAttribute('cx',p.x.toFixed(3)); p.node.setAttribute('cy',p.y.toFixed(3)); });
    }
    const field = {
      resize(next) {
        if (['left','right','top','bottom'].every(key => box[key] === next[key])) return;
        // Preserve each particle's current position within the changing space, not its seed.
        for (const p of particles) {
          const u = (p.x - box.left - p.radius) / (box.right - box.left - p.radius * 2);
          const v = (p.y - box.top - p.radius) / (box.bottom - box.top - p.radius * 2);
          p.x = next.left + p.radius + u * (next.right - next.left - p.radius * 2);
          p.y = next.top + p.radius + v * (next.bottom - next.top - p.radius * 2);
        }
        box = next;
        particles.forEach(keepInside); separateCollisions(); render();
      },
      step(dt) {
        particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; keepInside(p); });
        separateCollisions(); render();
      }
    };
    separateCollisions(); render();
    fieldByGroup.set(group,field); gasFields.push(field);
    return field;
  }
  function layoutGasShape(group) {
    const box = group.parentElement.querySelector('.sv-glass');
    const x = +box.getAttribute('x'), y = +box.getAttribute('y');
    const width = +box.getAttribute('width'), height = +box.getAttribute('height');
    gasFieldFor(group,{ left:x + 4, top:y + 4, right:x + width - 4, bottom:y + height - 4 });
  }
  section.querySelectorAll('[data-shape-particles]').forEach(layoutGasShape);
  section.querySelectorAll('[data-change-vessel]').forEach(button => {
    let current = 0;
    button.addEventListener('click', () => {
      current = (current + 1) % forms.length;
      const { width, height } = forms[current], kind = button.dataset.changeVessel;
      const group = section.querySelector(`[data-vessel-changing="${kind}"]`);
      const x = 178 - width / 2, y = 123 - height;
      const glass = group.querySelector('.sv-glass');
      for (const [key, value] of Object.entries({ x, y, width, height })) glass.setAttribute(key, value);
      group.querySelector('.sv-highlight').setAttribute('d', `M${x + 6} ${y + 8}v${height - 18}`);
      if (kind === 'liquid') {
        // In a constant-depth cross section, equal filled area represents equal volume.
        const waterHeight = 2300 / (width - 8), water = group.querySelector('.sv-water');
        for (const [key, value] of Object.entries({ x:x + 4, y:119 - waterHeight, width:width - 8, height:waterHeight })) water.setAttribute(key, value);
        group.querySelector('.sv-surface').setAttribute('d', `M${x + 4} ${119 - waterHeight}h${width - 8}`);
      } else if (kind === 'gas') {
        group.querySelector('.sv-seal').setAttribute('d', `M${x} ${y}h${width}`);
        layoutGasShape(group.querySelector('[data-shape-particles]'));
      }
      const rim = group.querySelector('.sv-rim');
      rim.setAttribute('cx',178); rim.setAttribute('cy',y); rim.setAttribute('rx',width / 2);
      const floor = group.querySelector('.sv-floor-line');
      floor.setAttribute('cx',178); floor.setAttribute('rx',width / 2 - 1);
      const meniscus = group.querySelector('.sv-meniscus');
      if (meniscus) {
        const water = group.querySelector('.sv-water');
        meniscus.setAttribute('cx',178); meniscus.setAttribute('cy',water.getAttribute('y'));
        meniscus.setAttribute('rx',(width - 8) / 2);
      }
      group.dataset.form = String(current);
      button.setAttribute('aria-label', `換個容器；目前${['細高', '寬淺', '方形'][current]}容器`);
    });
  });
  const volumeContainer = section.querySelector('[data-gas-volume]');
  const volumeParticles = volumeContainer.querySelector('[data-volume-particles]');
  const gasVolumeMin = 100, gasVolumeMax = 300, gasVolumeStep = 50;
  let currentGasVolume = 200;
  function selectGasVolume(requested) {
    if (!Number.isFinite(requested)) return;
    const value = Math.max(gasVolumeMin,Math.min(gasVolumeMax,Math.round(requested / gasVolumeStep) * gasVolumeStep));
    currentGasVolume = value;
    // Adjustable sealed container with a fixed cross-section; no piston.
    const height = 8 + value / 100 * 36, y = 138 - height;
    const glass = volumeContainer.querySelector('.sv-glass');
    glass.setAttribute('y',y); glass.setAttribute('height',height);
    volumeContainer.querySelector('.sv-rim').setAttribute('cy',y);
    volumeContainer.querySelector('.sv-highlight').setAttribute('d',`M78 ${y+8}v${height-18}`);
    volumeContainer.dataset.volume = String(value);
    volumeContainer.setAttribute('aria-label',`${value}毫升密閉容器，同一批氣體粒子分布於全部可用空間`);
    gasFieldFor(volumeParticles,{left:76,top:y+4,right:164,bottom:134});
    section.querySelector('[data-gas-volume-readout]').textContent = `${value} mL`;
    section.querySelectorAll('[data-gas-volume-step]').forEach(button => {
      button.disabled = +button.dataset.gasVolumeStep < 0 ? value <= gasVolumeMin : value >= gasVolumeMax;
    });
  }
  selectGasVolume(200);
  section.querySelectorAll('[data-gas-volume-step]').forEach(button => {
    button.addEventListener('click',()=>selectGasVolume(currentGasVolume + +button.dataset.gasVolumeStep * gasVolumeStep));
  });
  section.querySelectorAll('[data-piston]').forEach(svg => {
    // The fixed barrel has its bottom at y=140. Gas space = bottom minus piston.
    const kind = svg.dataset.kind;
    const handle = svg.querySelector('[data-piston-handle]');
    svg.setAttribute('role', 'group');
    const output = section.querySelector(`[data-piston-readout="${svg.dataset.piston}"]`);
    const dots = [...svg.querySelectorAll('.sv-particle')];
    dots.forEach(dot => dot.setAttribute('r', '2.1'));
    const gasField = kind === 'gas' ? gasFieldFor(svg.querySelector('[data-piston-particles]'),{ left:76, top:84, right:164, bottom:138 }) : null;
    let compression = 0;
    function update(value) {
      compression = Math.max(0, Math.min(100, value));
      // Ordinary pressure: solid/liquid movement is too small to show at this scale.
      const y = 80 + compression / 100 * (kind === 'gas' ? 36 : 0);
      const volume = (140 - y) / 60 * 100;
      handle.setAttribute('transform', `translate(0 ${y})`);
      handle.setAttribute('aria-valuenow', String(kind === 'gas' ? Math.round(compression) : 0));
      handle.setAttribute('aria-valuetext', kind === 'gas' ? `可用空間約 ${Math.round(volume)} 毫升` : '施力時體積幾乎不變');
      svg.dataset.volume = String(volume);
      svg.dataset.compression = String(kind === 'gas' ? compression : 0);
      if (kind === 'gas') {
        gasField.resize({ left:76, top:y + 4, right:164, bottom:138 });
        output.textContent = `約 ${Math.round(volume)} mL・粒子數不變`;
      } else {
        const fill = svg.querySelector('[data-piston-fill]');
        fill.setAttribute('y', y + 4.5);
        fill.setAttribute('height', 138 - y - 4.5);
        output.textContent = compression > 0 ? '約 100 mL・幾乎不變' : '約 100 mL';
      }

    }
    update(compression);
    let pointer = null, startY = 0, startCompression = 0;
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || pointer !== null) return;
      pointer = event.pointerId;
      handle.classList.add('is-dragging');
      startY = event.clientY;
      startCompression = compression;
      handle.focus({ preventScroll:true });
      handle.setPointerCapture(pointer);
      event.preventDefault();
    });
    handle.addEventListener('pointermove', event => {
      if (pointer !== event.pointerId) return;
      const scale = svg.getBoundingClientRect().height / 160;
      update(startCompression + (event.clientY - startY) / (36 * scale) * 100);
    });
    function stop(event) {
      if (event.pointerId !== pointer) return;
      if (handle.hasPointerCapture(pointer)) handle.releasePointerCapture(pointer);
      pointer = null;
      handle.classList.remove('is-dragging');
    }
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
    handle.addEventListener('lostpointercapture', () => { pointer = null; handle.classList.remove('is-dragging'); });
    handle.addEventListener('keydown', event => {
      const actions = { ArrowDown:compression + 10, ArrowUp:compression - 10, ArrowRight:compression + 10, ArrowLeft:compression - 10, Home:0, End:100 };
      if (!(event.key in actions)) return;
      event.preventDefault(); update(actions[event.key]);
    });

  });
  // Only animate while this section is on screen and the document is visible.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = section.querySelector('[data-gas-motion-toggle]');
  let visible = true, paused = false, frame = null, previous = 0;
  function tick(now) {
    frame = null;
    const dt = previous ? Math.min(.035,(now - previous) / 1000) : 0;
    previous = now;
    if (dt > 0) gasFields.forEach(field => field.step(dt * (reducedMotion.matches ? .4 : 1)));
    frame = requestAnimationFrame(tick);
  }
  function syncMotion() {
    const running = visible && !document.hidden && !paused;
    section.dataset.gasMotion = running ? 'running' : 'paused';
    if (running && frame === null) { previous = 0; frame = requestAnimationFrame(tick); }
    else if (!running && frame !== null) { cancelAnimationFrame(frame); frame = null; previous = 0; }
  }
  toggle.addEventListener('click', () => {
    paused = !paused;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = paused ? '繼續粒子運動' : '暫停粒子運動';
    syncMotion();
  });
  document.addEventListener('visibilitychange', syncMotion);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting; syncMotion();
    },{ rootMargin:'120px' }).observe(section);
  }
  syncMotion();

})();
