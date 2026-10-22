export function mountDisplacementExperiment() {
  const scene = document.querySelector('#displacement-scene');
  const cylinder = document.querySelector('#measuring-cylinder');
  const rock = document.querySelector('#submerged-rock');
  const water = document.querySelector('#water');
  const status = document.querySelector('#displacement-status');
  const placeButton = document.querySelector('#immerse');
  const resetButton = document.querySelector('#water-reset');
  const marks = [...document.querySelectorAll('#measuring-cylinder [data-volume]')];

  if (![scene, cylinder, rock, water, status, placeButton, resetButton].every(Boolean)) return;

  let immersed = false;
  let animating = false;
  let drag = null;

  function setReading(isImmersed) {
    immersed = isImmersed;
    scene.classList.toggle('is-complete', immersed);
    rock.classList.toggle('is-immersed', immersed);
    rock.classList.remove('is-dragging');
    cylinder.classList.remove('drop-ready');
    water.style.height = immersed ? '91.6667%' : '66.6667%';
    marks.forEach(mark => mark.classList.toggle('active', Number(mark.dataset.volume) === (immersed ? 55 : 40)));
    cylinder.setAttribute('aria-label', '量筒，目前水量 ' + (immersed ? '55' : '40') + ' 毫升');
    rock.setAttribute('aria-label', immersed ? '同一塊石頭已完全浸入量筒；可拖曳取出' : '同一塊石頭；可拖曳到量筒內，或按 Enter 放入');
    placeButton.disabled = immersed || animating;
    resetButton.disabled = !immersed || animating;
    status.dataset.state = immersed ? 'complete' : 'ready';
    if (immersed) {
      status.textContent = '石頭已完全浸入。比較放入前後的水位；水位差就是石頭排開水的體積。可將石頭拖出重新測量。';
    } else {
      status.textContent = '拖曳石頭進入量筒，讓它完全浸入水中；也可使用下方按鈕。';
    }
  }

  function clearPosition() {
    rock.style.left = '';
    rock.style.top = '';
    rock.style.bottom = '';
    rock.style.transform = '';
  }

  async function throwRockIntoCylinder() {
    if (immersed || animating) return;
    drag = null;
    animating = true;
    placeButton.disabled = true;
    resetButton.disabled = true;
    rock.classList.remove('is-dragging');
    cylinder.classList.remove('drop-ready');

    const sceneRect = scene.getBoundingClientRect();
    const startRect = rock.getBoundingClientRect();
    const startLeft = startRect.left - sceneRect.left;
    const startTop = startRect.top - sceneRect.top;
    const savedPosition = {
      left: rock.style.left,
      top: rock.style.top,
      bottom: rock.style.bottom,
      transform: rock.style.transform
    };

    clearPosition();
    rock.classList.add('is-throwing');
    rock.classList.add('is-immersed');
    const targetRect = rock.getBoundingClientRect();
    rock.classList.remove('is-immersed');
    rock.style.left = startLeft + 'px';
    rock.style.top = startTop + 'px';
    rock.style.bottom = 'auto';
    rock.style.transform = 'none';

    const targetLeft = targetRect.left - sceneRect.left;
    const targetTop = targetRect.top - sceneRect.top;
    const cylinderRect = cylinder.getBoundingClientRect();
    const cylinderLeft = cylinderRect.left - sceneRect.left;
    const cylinderTop = cylinderRect.top - sceneRect.top;
    const waterTop = water.getBoundingClientRect().top - sceneRect.top;
    const entryLeft = targetLeft + Math.max(0, (targetRect.width - startRect.width) / 2);
    const entryTop = Math.max(0, waterTop - startRect.height * 0.3);
    const apexLeft = Math.max(startLeft, cylinderLeft - startRect.width - 12);
    const apexTop = Math.max(0, cylinderTop - startRect.height - 12);

    status.textContent = '石頭沿著弧線落入量筒，再沉到水底；觀察水位上升。';
    const animation = rock.animate([
      { offset: 0, left: startLeft + 'px', top: startTop + 'px', transform: 'rotate(0deg)', easing: 'cubic-bezier(.2,.65,.45,1)' },
      { offset: 0.42, left: apexLeft + 'px', top: apexTop + 'px', transform: 'rotate(6deg)', easing: 'cubic-bezier(.48,0,.8,.45)' },
      { offset: 0.58, left: entryLeft + 'px', top: Math.min(entryTop, apexTop + 8) + 'px', transform: 'rotate(10deg)', easing: 'cubic-bezier(.1,.65,.5,1)' },
      { offset: 0.74, left: entryLeft + 'px', top: entryTop + 'px', transform: 'rotate(14deg)', easing: 'cubic-bezier(.1,.65,.5,1)' },
      { offset: 0.82, left: entryLeft + 2 + 'px', top: Math.max(0, entryTop - 8) + 'px', transform: 'rotate(8deg)', easing: 'cubic-bezier(.3,0,.8,.4)' },
      { offset: 1, left: targetLeft + 'px', top: targetTop + 'px', transform: 'rotate(0deg)' }
    ], { duration: 980, fill: 'forwards' });

    try {
      await animation.finished;
    } catch {
      // A canceled animation should still leave the sample in a valid state.
    }
    animation.cancel();
    rock.style.left = savedPosition.left;
    rock.style.top = savedPosition.top;
    rock.style.bottom = savedPosition.bottom;
    rock.style.transform = savedPosition.transform;
    animating = false;
    placeRock();
  }

  function placeRock() {
    drag = null;
    rock.classList.add('is-throwing');
    clearPosition();
    animating = false;
    setReading(true);
    rock.getBoundingClientRect();
    requestAnimationFrame(() => rock.classList.remove('is-throwing'));
  }

  function resetRock() {
    drag = null;
    clearPosition();
    animating = false;
    setReading(false);
  }

  function centerIsInCylinder() {
    const rockRect = rock.getBoundingClientRect();
    const cylinderRect = cylinder.getBoundingClientRect();
    const centerX = rockRect.left + rockRect.width / 2;
    const centerY = rockRect.top + rockRect.height / 2;
    return centerX >= cylinderRect.left + 12
      && centerX <= cylinderRect.right - 12
      && centerY >= cylinderRect.top + 18
      && centerY <= cylinderRect.bottom - 12;
  }

  rock.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (animating) return;
    event.preventDefault();
    const sceneRect = scene.getBoundingClientRect();
    let rockRect = rock.getBoundingClientRect();
    const wasImmersed = immersed;
    if (wasImmersed) {
      rock.style.left = rockRect.left - sceneRect.left + 'px';
      rock.style.top = rockRect.top - sceneRect.top + 'px';
      rock.style.bottom = 'auto';
      rock.style.transform = 'none';
      rock.classList.remove('is-immersed');
      rockRect = rock.getBoundingClientRect();
    }
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rockRect.left - sceneRect.left,
      top: rockRect.top - sceneRect.top,
      wasImmersed
    };
    rock.classList.add('is-dragging');
    rock.setPointerCapture(event.pointerId);
  });

  rock.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    rock.style.left = drag.left + event.clientX - drag.startX + 'px';
    rock.style.top = drag.top + event.clientY - drag.startY + 'px';
    rock.style.bottom = 'auto';
    const overTarget = centerIsInCylinder();
    cylinder.classList.toggle('drop-ready', overTarget);
  });

  function finishDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const validDrop = centerIsInCylinder();
    const wasImmersed = drag.wasImmersed;
    drag = null;
    if (validDrop) {
      throwRockIntoCylinder();
      return;
    }
    if (wasImmersed) {
      resetRock();
      return;
    }
    rock.classList.remove('is-dragging');
    cylinder.classList.remove('drop-ready');
    clearPosition();
    status.dataset.state = 'ready';
    status.textContent = '石頭要放在量筒內並完全浸入水中；再觀察水位變化。';
  }

  rock.addEventListener('pointerup', finishDrag);
  rock.addEventListener('pointercancel', finishDrag);
  rock.addEventListener('keydown', event => {
    if (!immersed && !animating && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      throwRockIntoCylinder();
    }
  });
  placeButton.addEventListener('click', throwRockIntoCylinder);
  resetButton.addEventListener('click', resetRock);
  setReading(false);
}
