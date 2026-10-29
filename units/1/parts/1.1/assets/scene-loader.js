const failureMessage = '立體畫面未能載入，請重新整理頁面後再試。';

const scenes = [
  {
    canvas: '#aperture-3d-scene',
    root: '#card-03 .aperture-lab',
    notice: '#aperture-load-failure',
    load: () => import('./aperture-3d.js?v=straight-ray-apertures-20261029'),
    showUnavailable(root) {
      root.querySelector('#aperture-result').textContent = failureMessage;
      root.querySelector('#aperture-xiaokui-observation').textContent = '請重新整理頁面後再試。';
      const heightOutput = root.querySelector('#aperture-offset-output');
      heightOutput.textContent = '無法操作';
      heightOutput.classList.remove('is-standard');
      root.querySelectorAll('[data-plate]').forEach((button) => {
        button.classList.remove('is-transmitting');
        button.setAttribute('aria-pressed', 'false');
      });
    }
  },
  {
    canvas: '#shadow-theatre-scene',
    root: '#unit-booklet',
    notice: '#shadow-theatre-load-failure',
    load: () => import('./shadow-theatre.js?v=finish-state-retry-note-20261029'),
    showUnavailable(root) {
      root.querySelector('#shadow-theatre-status').textContent = '舞台暫時無法操作';
      root.querySelector('#booklet-target-status').textContent = '舞台暫時無法操作';
      const finishNote = root.querySelector('#shadow-theatre-finish-note');
      finishNote.textContent = failureMessage;
      finishNote.dataset.done = 'false';
    }
  }
];

// Load each scene independently so one failure cannot prevent the other activity.
for (const scene of scenes) {
  const canvas = document.querySelector(scene.canvas);
  const root = document.querySelector(scene.root);
  const notice = document.querySelector(scene.notice);
  if (!canvas || !root || !notice) continue;

  let failed = false;
  const showFailure = (error) => {
    if (failed) return;
    failed = true;
    root.dataset.sceneFailed = 'true';
    notice.textContent = failureMessage;
    notice.hidden = false;
    canvas.setAttribute('aria-disabled', 'true');
    canvas.setAttribute('aria-describedby', notice.id);
    canvas.tabIndex = -1;
    root.querySelectorAll('button, input').forEach((control) => { control.disabled = true; });
    scene.showUnavailable(root);
    if (root.contains(document.activeElement)) notice.focus();
    console.error('立體場景無法載入：', scene.canvas, error);
  };

  // Also block already-registered handlers if the graphics context is lost later.
  const stopFailedInteraction = (event) => {
    if (!failed || !(event.target instanceof Element)) return;
    if (event.target !== canvas && !event.target.closest('button, input')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  for (const type of ['click', 'input', 'change', 'pointerdown', 'pointermove', 'pointerup', 'keydown', 'wheel']) {
    root.addEventListener(type, stopFailedInteraction, { capture: true, passive: false });
  }
  canvas.addEventListener('webglcontextlost', () => showFailure('WebGL context lost'));
  // Dynamic import catches dependency download errors and initialization errors.
  scene.load().catch(showFailure);
}
