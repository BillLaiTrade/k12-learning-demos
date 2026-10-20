export function mountDisplacementExperiment() {
  const scene = document.querySelector('#displacement-scene');
  const cylinder = document.querySelector('#measuring-cylinder');
  const rock = document.querySelector('#submerged-rock');
  const water = document.querySelector('#water');
  const status = document.querySelector('#displacement-status');
  const finalWater = document.querySelector('#final-water');
  const displaced = document.querySelector('#displaced');
  const explanation = document.querySelector('#displacement-explanation');
  const placeButton = document.querySelector('#immerse');
  const resetButton = document.querySelector('#water-reset');
  const marks = [...document.querySelectorAll('#measuring-cylinder .mark')];

  if (![scene, cylinder, rock, water, status, finalWater, displaced, explanation, placeButton, resetButton].every(Boolean)) return;

  let immersed = false;
  let drag = null;

  function setReading(isImmersed) {
    immersed = isImmersed;
    scene.classList.toggle('is-complete', immersed);
    rock.classList.toggle('is-immersed', immersed);
    rock.classList.remove('is-dragging');
    cylinder.classList.remove('drop-ready');
    water.style.height = immersed ? '65%' : '40%';
    marks.forEach(mark => mark.classList.toggle('active', Number(mark.dataset.volume) === (immersed ? 55 : 40)));
    finalWater.textContent = immersed ? '55 mL' : '尚未放入';
    displaced.textContent = immersed ? '15 cm³' : '尚未量出';
    cylinder.setAttribute('aria-label', '量筒，目前水量 ' + (immersed ? '55' : '40') + ' 毫升');
    rock.setAttribute('aria-label', immersed ? '同一塊石頭已完全浸入量筒；可拖曳取出' : '同一塊石頭；可拖曳到量筒內，或按 Enter 放入');
    placeButton.disabled = immersed;
    resetButton.disabled = !immersed;
    status.dataset.state = immersed ? 'complete' : 'ready';
    if (immersed) {
      status.textContent = '石頭已完全浸入。水位從 40 mL 升到 55 mL，上升 15 mL；可將石頭拖出量筒重新測量。';
      explanation.textContent = '55 mL − 40 mL = 15 mL。因為 1 mL = 1 cm³，所以這塊石頭的體積是 15 cm³。';
    } else {
      status.textContent = '拖曳石頭進入量筒，讓它完全浸入水中；也可使用下方按鈕。';
      explanation.textContent = '石頭完全浸入後，讀取量筒的水位變化；水位差代表石頭排開的水量。';
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
    status.textContent = '石頭要放在量筒內並完全浸入水中；再觀察水位變化。';
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
