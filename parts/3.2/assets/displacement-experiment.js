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
    rock.setAttribute('aria-label', immersed ? '同一塊隕石已完全浸入量筒；可拖曳取出' : '同一塊隕石；可拖曳到量筒內，或按 Enter 放入');
    placeButton.disabled = immersed;
    resetButton.disabled = !immersed;
    status.dataset.state = immersed ? 'complete' : 'ready';
    if (immersed) {
      status.textContent = '隕石已完全浸入。比較放入前後的水位；水位差就是隕石排開水的體積。可將隕石拖出重新測量。';
    } else {
      status.textContent = '拖曳隕石進入量筒，讓它完全浸入水中；也可使用下方按鈕。';
    }
  }

  function placeRock() {
    drag = null;
    rock.style.left = '';
    rock.style.top = '';
    rock.style.bottom = '';
    rock.style.transform = '';
    setReading(true);
  }

  function resetRock() {
    drag = null;
    rock.style.left = '';
    rock.style.top = '';
    rock.style.bottom = '';
    rock.style.transform = '';
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
      placeRock();
      return;
    }
    if (wasImmersed) {
      resetRock();
      return;
    }
    rock.classList.remove('is-dragging');
    cylinder.classList.remove('drop-ready');
    rock.style.left = '';
    rock.style.top = '';
    rock.style.bottom = '';
    status.dataset.state = 'ready';
    status.textContent = '隕石要放在量筒內並完全浸入水中；再觀察水位變化。';
  }

  rock.addEventListener('pointerup', finishDrag);
  rock.addEventListener('pointercancel', finishDrag);
  rock.addEventListener('keydown', event => {
    if (!immersed && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      placeRock();
    }
  });
  placeButton.addEventListener('click', placeRock);
  resetButton.addEventListener('click', resetRock);
  setReading(false);
}
