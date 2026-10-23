export function mountComparisonExperiment() {
  const scene = document.querySelector('#gold-scene');
  const sample = scene?.querySelector('.sample-display');
  const rock = document.querySelector('#comparison-rock');
  const gold = document.querySelector('#comparison-gold');
  const cylinder = scene?.querySelector('.comparison-cylinder');
  const water = scene?.querySelector('.comparison-water');
  const status = document.querySelector('#comparison-status');
  const mass = document.querySelector('#sample-mass');
  const massLabel = document.querySelector('#sample-mass-label');
  const placeButton = document.querySelector('#compare-immerse');
  const resetButton = document.querySelector('#compare-reset');
  const specimenButtons = [...document.querySelectorAll('.specimen-choice')];

  if (![scene, sample, rock, gold, cylinder, water, status, mass, massLabel, placeButton, resetButton].every(Boolean)) return;

  let chosenSpecimen = 'stone';
  let immersed = false;
  let animating = false;
  let drag = null;

  function clearPosition() {
    sample.style.removeProperty('left');
    sample.style.removeProperty('top');
    sample.style.removeProperty('transform');
  }

  function setButtons() {
    placeButton.disabled = immersed || animating;
    resetButton.disabled = !immersed || animating;
    specimenButtons.forEach(button => {
      button.disabled = animating || Boolean(drag);
      button.setAttribute('aria-pressed', String(button.dataset.specimen === chosenSpecimen));
    });
  }

  function setState(nextImmersed, message) {
    immersed = nextImmersed;
    scene.classList.toggle('is-immersed', immersed);
    sample.classList.toggle('in-water', immersed);
    mass.textContent = immersed ? '0.0 g' : chosenSpecimen === 'stone' ? '910 g' : '約 6,755 g';
    status.textContent = message || (immersed
      ? '樣本已浸入；把它往上提過量筒口再移出，或按下取出按鈕。'
      : '把樣本拖到量筒口正上方並放開；量測後可再拖出。也可用下方按鈕操作。');
    setButtons();
  }

  function cylinderGeometry(sampleWidth, sampleHeight) {
    const sceneRect = scene.getBoundingClientRect();
    const cylinderRect = cylinder.getBoundingClientRect();
    const waterRect = water.getBoundingClientRect();
    const left = cylinderRect.left - sceneRect.left;
    const top = cylinderRect.top - sceneRect.top;
    const width = cylinderRect.width;
    const bottom = cylinderRect.bottom - sceneRect.top;
    return {
      left,
      top,
      right: cylinderRect.right - sceneRect.left,
      width,
      waterTop: waterRect.top - sceneRect.top,
      clearTop: Math.max(0, top - sampleHeight - 12),
      exitLeft: left - sampleWidth - 12,
      targetLeft: left + (width - sampleWidth) / 2,
      targetTop: bottom - sampleHeight - 10
    };
  }

  function setFinalPosition(left, top, isImmersed) {
    cylinder.classList.remove('drop-ready');
    water.style.transitionDuration = '';
    sample.classList.remove('is-dragging');
    sample.classList.add('is-animating');
    if (isImmersed) {
      sample.style.left = left + 'px';
      sample.style.top = top + 'px';
      sample.style.transform = 'none';
    } else {
      clearPosition();
    }
    animating = false;
    setState(isImmersed, isImmersed
      ? '樣本已完全浸入；觀察量筒中的水位變化，再與右側的量測結果比較。往上提過筒口可取出。'
      : `${chosenSpecimen === 'stone' ? '隕石' : '純金塊'}已取出；可再次放入觀察水位變化。`);
    sample.getBoundingClientRect();
    requestAnimationFrame(() => sample.classList.remove('is-animating'));
  }

  async function animateSample(enter, alreadyClearedRim = false, dropFromAbove = false) {
    if (animating || enter === immersed) return;
    animating = true;
    setButtons();
    sample.classList.add('is-animating');

    const sceneRect = scene.getBoundingClientRect();
    const initialRect = sample.getBoundingClientRect();
    const startLeft = initialRect.left - sceneRect.left;
    const startTop = initialRect.top - sceneRect.top;
    const width = initialRect.width;
    const height = initialRect.height;
    let returnRect = null;

    if (!enter) {
      clearPosition();
      sample.classList.remove('in-water');
      returnRect = sample.getBoundingClientRect();
    }

    sample.style.left = startLeft + 'px';
    sample.style.top = startTop + 'px';
    sample.style.transform = 'none';

    const geometry = cylinderGeometry(width, height);
    const entryTop = Math.max(0, geometry.waterTop - height * 0.3);
    let segments;

    if (enter) {
      status.textContent = dropFromAbove
        ? '樣本從量筒口正上方落入水中；觀察水位上升。'
        : '樣本先越過量筒口，再落入水中；觀察水位上升。';
      if (dropFromAbove) {
        segments = [
          { duration: 720, frames: [
            { left: startLeft + 'px', top: startTop + 'px', transform: 'rotate(0deg)', easing: 'cubic-bezier(.4,0,.95,.5)' },
            { left: startLeft + 'px', top: entryTop + 'px', transform: 'rotate(4deg)' }
          ] },
          { duration: 520, frames: [
            { left: startLeft + 'px', top: entryTop + 'px', transform: 'rotate(4deg)' },
            { left: geometry.targetLeft + 'px', top: geometry.targetTop + 'px', transform: 'rotate(0deg)' }
          ] }
        ];
      } else if (alreadyClearedRim) {
        segments = [
          { duration: 620, frames: [
            { left: startLeft + 'px', top: startTop + 'px', transform: 'rotate(0deg)' },
            { left: geometry.targetLeft + 'px', top: Math.min(startTop, geometry.clearTop - 5) + 'px', transform: 'rotate(5deg)' }
          ] },
          { duration: 420, frames: [
            { left: geometry.targetLeft + 'px', top: Math.min(startTop, geometry.clearTop - 5) + 'px', transform: 'rotate(5deg)' },
            { left: geometry.targetLeft + 'px', top: entryTop + 'px', transform: 'rotate(12deg)' }
          ] },
          { duration: 360, frames: [
            { left: geometry.targetLeft + 'px', top: entryTop + 'px', transform: 'rotate(12deg)' },
            { left: geometry.targetLeft + 2 + 'px', top: Math.max(0, entryTop - 8) + 'px', transform: 'rotate(8deg)' },
            { left: geometry.targetLeft + 'px', top: geometry.targetTop + 'px', transform: 'rotate(0deg)' }
          ] }
        ];
      } else {
        const apexLeft = Math.max(startLeft, geometry.exitLeft);
        const apexTop = Math.max(0, geometry.clearTop - 8);
        segments = [
          { duration: 390, frames: [
            { left: startLeft + 'px', top: startTop + 'px', transform: 'rotate(0deg)' },
            { left: apexLeft + 'px', top: apexTop + 'px', transform: 'rotate(6deg)' }
          ] },
          { duration: 620, frames: [
            { left: apexLeft + 'px', top: apexTop + 'px', transform: 'rotate(6deg)' },
            { left: geometry.targetLeft + 'px', top: apexTop + 'px', transform: 'rotate(10deg)' }
          ] },
          { duration: 370, frames: [
            { left: geometry.targetLeft + 'px', top: apexTop + 'px', transform: 'rotate(10deg)' },
            { left: geometry.targetLeft + 'px', top: entryTop + 'px', transform: 'rotate(14deg)' }
          ] },
          { duration: 370, frames: [
            { left: geometry.targetLeft + 'px', top: entryTop + 'px', transform: 'rotate(14deg)' },
            { left: geometry.targetLeft + 2 + 'px', top: Math.max(0, entryTop - 8) + 'px', transform: 'rotate(8deg)' },
            { left: geometry.targetLeft + 'px', top: geometry.targetTop + 'px', transform: 'rotate(0deg)' }
          ] }
        ];
      }
    } else {
      const returnLeft = returnRect.left - sceneRect.left;
      const returnTop = returnRect.top - sceneRect.top;
      const insideTop = geometry.top + 12;
      status.textContent = '樣本先從量筒口提起，再移到量筒外；水位隨後重設。';
      const apexTop = Math.max(0, geometry.clearTop - 8);
      segments = [
        { duration: 300, frames: [
          { left: startLeft + 'px', top: startTop + 'px', transform: 'rotate(0deg)' },
          { left: startLeft + 'px', top: insideTop + 'px', transform: 'rotate(-4deg)' }
        ] },
        { duration: 380, frames: [
          { left: startLeft + 'px', top: insideTop + 'px', transform: 'rotate(-4deg)' },
          { left: startLeft + 'px', top: apexTop + 'px', transform: 'rotate(-7deg)' }
        ] },
        { duration: 420, frames: [
          { left: startLeft + 'px', top: apexTop + 'px', transform: 'rotate(-7deg)' },
          { left: geometry.exitLeft + 'px', top: apexTop + 'px', transform: 'rotate(-9deg)' }
        ] },
        { duration: 420, frames: [
          { left: geometry.exitLeft + 'px', top: apexTop + 'px', transform: 'rotate(-9deg)' },
          { left: returnLeft + 'px', top: Math.max(0, returnTop - 8) + 'px', transform: 'rotate(-5deg)' },
          { left: returnLeft + 'px', top: returnTop + 'px', transform: 'rotate(0deg)' }
        ] }
      ];
    }

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      if (enter && index === segments.length - 1) {
        // Begin the water rise as the sample reaches the water, and finish it
        // with the same drop segment so the two motions read as one action.
        water.style.transitionDuration = `${segment.duration}ms`;
        scene.classList.add('is-immersed');
      }
      const animation = sample.animate(segment.frames, { duration: segment.duration, fill: 'forwards', easing: 'cubic-bezier(.2,.65,.45,1)' });
      try {
        await animation.finished;
      } catch {
        // Keep the sample in a valid state if an animation is canceled.
      }
      const lastFrame = segment.frames[segment.frames.length - 1];
      sample.style.left = lastFrame.left;
      sample.style.top = lastFrame.top;
      sample.style.transform = lastFrame.transform;
      animation.cancel();
    }

    if (enter) setFinalPosition(geometry.targetLeft, geometry.targetTop, true);
    else setFinalPosition(0, 0, false);
  }

  function selectSpecimen(kind) {
    if (animating || drag) return;
    chosenSpecimen = kind;
    scene.dataset.specimen = kind;
    rock.hidden = kind !== 'stone';
    gold.style.display = kind === 'gold' ? 'block' : 'none';
    sample.setAttribute('aria-label', kind === 'stone' ? '隕石；可拖曳放入或移出量筒' : '純金塊；可拖曳放入或移出量筒');
    massLabel.textContent = kind === 'stone' ? '隕石樣本質量' : '純金樣本質量';
    placeButton.textContent = kind === 'stone' ? '把隕石放入水中' : '把純金塊放入水中';
    clearPosition();
    sample.classList.remove('in-water');
    cylinder.classList.remove('drop-ready');
    setState(false, '把樣本拖到量筒口正上方並放開；量測後可再拖出。也可用下方按鈕操作。');
  }

  function sampleCenterIsInCylinder() {
    const sampleRect = sample.getBoundingClientRect();
    const cylinderRect = cylinder.getBoundingClientRect();
    const centerX = sampleRect.left + sampleRect.width / 2;
    const centerY = sampleRect.top + sampleRect.height / 2;
    return centerX >= cylinderRect.left + 8
      && centerX <= cylinderRect.right - 8
      && centerY >= cylinderRect.top + 12
      && centerY <= cylinderRect.bottom - 8;
  }

  function sampleIsAboveCylinderMouth() {
    const sampleRect = sample.getBoundingClientRect();
    const cylinderRect = cylinder.getBoundingClientRect();
    const centerX = sampleRect.left + sampleRect.width / 2;
    return centerX >= cylinderRect.left + 8
      && centerX <= cylinderRect.right - 8
      && sampleRect.bottom <= cylinderRect.top + 8;
  }

  specimenButtons.forEach(button => button.addEventListener('click', () => selectSpecimen(button.dataset.specimen)));
  placeButton.addEventListener('click', () => animateSample(true));
  resetButton.addEventListener('click', () => animateSample(false));

  sample.addEventListener('pointerdown', event => {
    if ((event.button !== undefined && event.button !== 0) || animating) return;
    event.preventDefault();
    const sceneRect = scene.getBoundingClientRect();
    const rect = sample.getBoundingClientRect();
    const wasImmersed = immersed;
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left - sceneRect.left,
      top: rect.top - sceneRect.top,
      wasImmersed,
      clearedRim: false,
      moved: false
    };
    sample.classList.add('is-animating', 'is-dragging');
    sample.style.left = drag.left + 'px';
    sample.style.top = drag.top + 'px';
    sample.style.transform = 'none';
    sample.setPointerCapture(event.pointerId);
  });

  sample.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    if (!drag.moved) return;

    const sceneRect = scene.getBoundingClientRect();
    const sampleRect = sample.getBoundingClientRect();
    const geometry = cylinderGeometry(sampleRect.width, sampleRect.height);
    let nextLeft = drag.left + dx;
    const nextTop = drag.top + dy;

    if (drag.wasImmersed) {
      const rimClearedTop = geometry.top - sampleRect.height + 8;
      if (nextTop > rimClearedTop) {
        nextLeft = Math.max(geometry.left + 3, Math.min(geometry.right - sampleRect.width - 3, nextLeft));
      } else {
        drag.clearedRim = true;
      }
    } else if (nextTop + sampleRect.height > geometry.top + 8) {
      nextLeft = Math.min(nextLeft, geometry.exitLeft);
    } else {
      drag.clearedRim = true;
    }

    sample.style.left = nextLeft + 'px';
    sample.style.top = nextTop + 'px';
    sample.style.transform = 'none';
    cylinder.classList.toggle('drop-ready', !drag.wasImmersed && (sampleCenterIsInCylinder() || sampleIsAboveCylinderMouth()));
  });

  function finishDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const result = drag;
    drag = null;
    sample.releasePointerCapture(event.pointerId);
    setButtons();

    if (!result.moved) {
      sample.classList.remove('is-dragging', 'is-animating');
      clearPosition();
      return;
    }

    const aboveMouth = sampleIsAboveCylinderMouth();
    const inside = sampleCenterIsInCylinder();
    cylinder.classList.remove('drop-ready');
    if (result.wasImmersed) {
      if (result.clearedRim && !inside) {
        setFinalPosition(0, 0, false);
      } else {
        const sceneRect = scene.getBoundingClientRect();
        const cylinderRect = cylinder.getBoundingClientRect();
        const sampleRect = sample.getBoundingClientRect();
        const left = cylinderRect.left - sceneRect.left + (cylinderRect.width - sampleRect.width) / 2;
        const top = cylinderRect.bottom - sceneRect.top - sampleRect.height - 10;
        setFinalPosition(left, top, true);
      }
      return;
    }

    if (aboveMouth) animateSample(true, true, true);
    else if (inside && result.clearedRim) animateSample(true, true);
    else {
      sample.classList.remove('is-dragging', 'is-animating');
      clearPosition();
      status.textContent = '樣本需要先越過量筒口，再放進量筒。';
    }
  }

  sample.addEventListener('pointerup', finishDrag);
  sample.addEventListener('pointercancel', finishDrag);
  sample.addEventListener('keydown', event => {
    if (animating || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    animateSample(!immersed);
  });

  setState(false, '把樣本拖到量筒口正上方並放開；量測後可再拖出。也可用下方按鈕操作。');
}
