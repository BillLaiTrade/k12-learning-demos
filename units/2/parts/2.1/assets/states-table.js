/* Same quantity of substance in each comparison. No hidden detail panel. */
(() => {
  'use strict';
  const section = document.getElementById('s2');
  if (!section) return;
  const forms = [{ width:58, height:106 }, { width:98, height:64 }, { width:78, height:80 }];
  // Fixed, irregular model positions avoid suggesting a crystal lattice for gas.
  const gasPositions = [[0.6307, 0.6772], [0.9022, 0.2328], [0.1175, 0.7853], [0.3531, 0.3877], [0.8605, 0.4922], [0.5642, 0.1293], [0.7979, 0.7418], [0.9336, 0.0707], [0.9175, 0.6256], [0.2826, 0.599], [0.6797, 0.5213], [0.1469, 0.4049], [0.6826, 0.2933], [0.5652, 0.4259], [0.3776, 0.7477], [0.3578, 0.1103], [0.5755, 0.8581], [0.1454, 0.5547], [0.8344, 0.3635], [0.7855, 0.1502], [0.3275, 0.2391], [0.6896, 0.9361], [0.8883, 0.8693], [0.2553, 0.8784]];
  function layoutGasShape(group) {
    const box = group.parentElement.querySelector('.sv-glass');
    const x = +box.getAttribute('x'), y = +box.getAttribute('y');
    const width = +box.getAttribute('width'), height = +box.getAttribute('height');
    group.querySelectorAll('.sv-particle').forEach((dot, i) => {
      dot.setAttribute('cx', x + 7 + gasPositions[i][0] * (width - 14));
      dot.setAttribute('cy', y + 7 + gasPositions[i][1] * (height - 14));
    });
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
      group.dataset.form = String(current);
      button.setAttribute('aria-label', `換個容器；目前${['細高', '寬淺', '方形'][current]}容器`);
    });
  });
  section.querySelectorAll('[data-piston]').forEach(svg => {
    // The fixed barrel has its bottom at y=140. Gas space = bottom minus piston.
    const kind = svg.dataset.kind, mode = svg.dataset.mode;
    const handle = svg.querySelector('[data-piston-handle]');
    svg.setAttribute('role', 'group');
    const output = section.querySelector(`[data-piston-readout="${svg.dataset.piston}"]`);
    const dots = [...svg.querySelectorAll('.sv-particle')];
    dots.forEach(dot => dot.setAttribute('r', '2.1'));
    let compression = mode === 'volume' ? 100 / 3 : 0;
    function update(value) {
      compression = Math.max(0, Math.min(100, value));
      // Solid/liquid displacement is exaggerated slightly to be visible, and stays <2%.
      const y = 80 + compression / 100 * (kind === 'gas' ? 36 : .7);
      const volume = (140 - y) / 60 * 100;
      handle.setAttribute('transform', `translate(0 ${y})`);
      handle.setAttribute('aria-valuenow', String(Math.round(compression)));
      handle.setAttribute('aria-valuetext', kind === 'gas' ? `可用空間約 ${Math.round(volume)} 毫升` : '施力時體積幾乎不變');
      svg.dataset.volume = String(volume);
      svg.dataset.compression = String(compression);
      if (kind === 'gas') {
        dots.forEach((dot, i) => {
          dot.setAttribute('cx', 78 + gasPositions[i][0] * 84);
          dot.setAttribute('cy', y + 4 + gasPositions[i][1] * (140 - y - 8));
        });
        output.textContent = mode === 'volume' ? `可用空間：約 ${Math.round(volume)} mL` : `約 ${Math.round(volume)} mL・粒子數不變`;
      } else {
        const fill = svg.querySelector('[data-piston-fill]');
        fill.setAttribute('y', y + 4.5);
        fill.setAttribute('height', 138 - y - 4.5);
        output.textContent = compression > 0 ? '約 100 mL・幾乎不變' : '約 100 mL';
      }
      const button = section.querySelector(`[data-press="${kind}"]`);
      if (mode === 'compress' && button) {
        button.setAttribute('aria-pressed', String(compression > 0));
        button.textContent = compression > 0 ? '放開活塞 ↑' : '按壓活塞 ↓';
      }
    }
    update(compression);
    let pointer = null, startY = 0, startCompression = 0;
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      pointer = event.pointerId;
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
    }
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
    handle.addEventListener('lostpointercapture', () => { pointer = null; });
    handle.addEventListener('keydown', event => {
      const actions = { ArrowDown:compression + 10, ArrowUp:compression - 10, ArrowRight:compression + 10, ArrowLeft:compression - 10, Home:0, End:100 };
      if (!(event.key in actions)) return;
      event.preventDefault(); update(actions[event.key]);
    });
    if (mode === 'compress' && kind !== 'gas') {
      section.querySelector(`[data-press="${kind}"]`).addEventListener('click', () => update(compression > 0 ? 0 : 100));
    }
  });
})();
