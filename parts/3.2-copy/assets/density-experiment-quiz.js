export function mountDensityExperimentQuiz() {
  const quiz = document.querySelector('#density-experiment-quiz');
  if (!quiz) return;

  const samples = {
    A: { mass: 714, volume: 37, image: 'assets/golden-wreath.webp' },
    B: { mass: 714, volume: 46.3, image: 'assets/golden-wreath.webp' }
  };
  const sampleCards = [...quiz.querySelectorAll('[data-experiment-sample]')];
  const tools = [...quiz.querySelectorAll('[data-instrument]')];
  const feedback = quiz.querySelector('[data-experiment-feedback]');
  let selectedSample = null;
  const scaleSamples = new Set();
  const tankSamples = new Set();
  let drag = null;

  function record(sample) {
    return quiz.querySelector(`[data-experiment-record="${sample}"]`);
  }

  function field(sample, name) {
    return record(sample).querySelector(`[data-entry="${name}"]`);
  }

  function sampleMass(sample) {
    const input = field(sample, 'mass');
    const entered = Number(input.value);
    return input.value !== '' && Number.isFinite(entered) && entered > 0 ? entered : samples[sample].mass;
  }

  function sampleVolume(sample) {
    const input = field(sample, 'displacement');
    const entered = Number(input.value);
    return input.value !== '' && Number.isFinite(entered) && entered > 0 ? entered : samples[sample].volume;
  }

  function setWaterReading(value) {
    const level = Math.min(100, Math.max(0, Number(value) || 0));
    const water = quiz.querySelector('[data-overflow-water]');
    const tray = water.parentElement;
    const scale = tray.querySelector('.overflow-catch-scale');
    const trayBounds = tray.getBoundingClientRect();
    const scaleBounds = scale.getBoundingClientRect();
    water.style.bottom = `${trayBounds.bottom - scaleBounds.bottom}px`;
    water.style.height = `${scaleBounds.height * level / 100}px`;
    quiz.querySelector('[data-water-reading]').textContent = `${value} mL`;
  }

  function refreshScale() {
    const group = quiz.querySelector('[data-scale-rocks]');
    const totalMass = [...scaleSamples].reduce((sum, sample) => sum + sampleMass(sample), 0);
    group.innerHTML = [...scaleSamples].map(sample => `<img class="experiment-scale-rock crown-thumb" data-drag-sample="${sample}" data-sample="${sample}" src="${samples[sample].image}" alt="皇冠樣本 ${sample}，可拖曳移動">`).join('');
    quiz.querySelector('[data-scale-reading]').textContent = totalMass.toFixed(1);
    quiz.querySelector('[data-instrument="scale"]').setAttribute('aria-label', `電子秤，放有 ${scaleSamples.size} 頂皇冠，總質量 ${totalMass.toFixed(1)} 公克`);
  }

  function refreshTank() {
    const group = quiz.querySelector('[data-cylinder-rocks]');
    const totalVolume = [...tankSamples].reduce((sum, sample) => sum + sampleVolume(sample), 0);
    group.innerHTML = [...tankSamples].map(sample => `<img class="experiment-cylinder-rock crown-thumb" data-drag-sample="${sample}" data-sample="${sample}" src="${samples[sample].image}" alt="皇冠樣本 ${sample}，可拖曳移動">`).join('');
    setWaterReading(totalVolume);
    quiz.querySelector('[data-instrument="cylinder"]').classList.toggle('has-overflow', tankSamples.size > 0);
    quiz.querySelector('[data-instrument="cylinder"]').setAttribute('aria-label', `滿水溢流水槽與有刻度的接水盤，${tankSamples.size} 頂皇冠完全浸入，收集到溢出水 ${totalVolume} 毫升`);
  }

  function chooseSample(sample) {
    selectedSample = sample;
    sampleCards.forEach(card => card.setAttribute('aria-pressed', String(card.dataset.experimentSample === sample)));
  }

  function placeSample(sample, instrument) {
    if (instrument === 'scale' && tankSamples.delete(sample)) refreshTank();
    if (instrument === 'cylinder' && scaleSamples.delete(sample)) refreshScale();
    chooseSample(sample);
    if (instrument === 'scale') {
      scaleSamples.add(sample);
      refreshScale();
    }
    if (instrument === 'cylinder') {
      tankSamples.add(sample);
      refreshTank();
    }
  }

  function removeSample(sample, instrument) {
    if (instrument === 'scale' && scaleSamples.delete(sample)) refreshScale();
    if (instrument === 'cylinder' && tankSamples.delete(sample)) refreshTank();
  }

  function updateRecord(sample) {
    const massInput = field(sample, 'mass');
    const displacementInput = field(sample, 'displacement');
    const volumeInput = field(sample, 'volume');
    const mass = Number(massInput.value);
    const volume = Number(displacementInput.value);
    const validVolume = displacementInput.value !== '' && Number.isFinite(volume) && volume > 0;
    volumeInput.value = validVolume ? String(volume) : '';
    record(sample).querySelector('[data-entry="delta"]').textContent = validVolume ? `${volume} mL` : '—';
    const densityOutput = record(sample).querySelector('[data-entry="density"]');
    if (massInput.value !== '' && Number.isFinite(mass) && mass > 0 && validVolume) {
      const density = mass / volume;
      densityOutput.textContent = `${density.toFixed(2)} g/cm³`;
      densityOutput.dataset.value = String(density);
    } else {
      densityOutput.textContent = '—';
      delete densityOutput.dataset.value;
    }
    displacementInput.setAttribute('aria-invalid', String(displacementInput.value !== '' && !validVolume));
    if (scaleSamples.has(sample)) refreshScale();
    if (tankSamples.has(sample)) refreshTank();
    feedback.textContent = '';
    feedback.removeAttribute('data-result');
  }

  function startDrag(event, source) {
    if (event.button !== undefined && event.button !== 0) return;
    const sample = source.dataset.experimentSample || source.dataset.dragSample;
    if (!sample) return;
    event.preventDefault();
    const ghost = document.createElement('img');
    ghost.src = samples[sample].image;
    ghost.alt = '';
    ghost.className = `experiment-ghost crown-thumb${sample === 'B' ? ' alloy' : ''}`;
    ghost.style.width = source.dataset.experimentSample ? '116px' : '116px';
    document.body.append(ghost);
    drag = {
      sample,
      sourceInstrument: source.dataset.dragSample ? source.closest('[data-instrument]')?.dataset.instrument : null,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      ghost,
      moved: false
    };
    source.setPointerCapture?.(event.pointerId);
    moveGhost(event.clientX, event.clientY);
  }

  function moveGhost(x, y) {
    if (!drag) return;
    drag.ghost.style.left = `${x}px`;
    drag.ghost.style.top = `${y}px`;
    const target = document.elementFromPoint(x, y)?.closest('[data-instrument]');
    tools.forEach(tool => tool.classList.toggle('is-drop-target', tool === target));
  }

  function finishDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const current = drag;
    drag = null;
    current.ghost.remove();
    tools.forEach(tool => tool.classList.remove('is-drop-target'));
    const moved = current.moved || Math.abs(event.clientX - current.startX) + Math.abs(event.clientY - current.startY) > 5;
    if (!moved) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-instrument]');
    if (current.sourceInstrument) removeSample(current.sample, current.sourceInstrument);
    if (target) placeSample(current.sample, target.dataset.instrument);
  }

  sampleCards.forEach(card => card.addEventListener('click', () => chooseSample(card.dataset.experimentSample)));
  quiz.addEventListener('pointerdown', event => {
    const source = event.target.closest('[data-experiment-sample], [data-drag-sample]');
    if (source && quiz.contains(source)) startDrag(event, source);
  });
  quiz.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 5) drag.moved = true;
    moveGhost(event.clientX, event.clientY);
  });
  quiz.addEventListener('pointerup', finishDrag);
  quiz.addEventListener('pointercancel', finishDrag);

  tools.forEach(tool => {
    tool.addEventListener('pointermove', event => {
      if (drag && drag.pointerId === event.pointerId && Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 5) drag.moved = true;
      moveGhost(event.clientX, event.clientY);
    });
    tool.addEventListener('pointerup', finishDrag);
    tool.addEventListener('pointercancel', finishDrag);
    tool.addEventListener('click', event => {
      if (!selectedSample || event.target.closest('[data-drag-sample]')) return;
      const inTool = tool.dataset.instrument === 'scale' ? scaleSamples : tankSamples;
      if (inTool.has(selectedSample)) removeSample(selectedSample, tool.dataset.instrument);
      else placeSample(selectedSample, tool.dataset.instrument);
    });
    tool.addEventListener('keydown', event => {
      if (selectedSample && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        placeSample(selectedSample, tool.dataset.instrument);
      }
    });
  });

  ['A', 'B'].forEach(sample => {
    record(sample).querySelectorAll('[data-entry="mass"], [data-entry="displacement"]').forEach(input => {
      input.addEventListener('input', () => updateRecord(sample));
    });
  });

  const answerButtons = [...quiz.querySelectorAll('[data-experiment-answer]')];
  let answer = null;
  answerButtons.forEach(button => button.addEventListener('click', () => {
    answer = button.dataset.experimentAnswer;
    answerButtons.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
    feedback.textContent = '';
    feedback.removeAttribute('data-result');
  }));

  quiz.querySelector('[data-experiment-submit]').addEventListener('click', () => {
    const densities = ['A', 'B'].map(sample => {
      const value = record(sample).querySelector('[data-entry="density"]').dataset.value;
      return value === undefined ? null : Number(value);
    });
    if (densities.some(value => value === null)) {
      feedback.textContent = '請先填妥兩頂皇冠的質量與排出水量，再比較密度。';
      feedback.dataset.result = 'incomplete';
      return;
    }
    if (!answer) {
      feedback.textContent = '請選出你認為密度較大的皇冠。';
      feedback.dataset.result = 'incomplete';
      return;
    }
    const correct = densities[0] === densities[1] ? null : densities[0] > densities[1] ? 'A' : 'B';
    if (answer === correct) {
      feedback.textContent = `比較正確。純金皇冠 A 為 ${densities[0].toFixed(2)} g/cm³，合金皇冠 B 為 ${densities[1].toFixed(2)} g/cm³；密度較大的是皇冠 ${correct}。`;
      feedback.dataset.result = 'correct';
    } else if (correct === null) {
      feedback.textContent = `兩頂皇冠計算出的密度相同，都是 ${densities[0].toFixed(2)} g/cm³。`;
      feedback.dataset.result = 'incorrect';
    } else {
      feedback.textContent = `再比較一次數值：純金皇冠 A 為 ${densities[0].toFixed(2)} g/cm³，合金皇冠 B 為 ${densities[1].toFixed(2)} g/cm³。密度較大的是皇冠 ${correct}。`;
      feedback.dataset.result = 'incorrect';
    }
  });
}

mountDensityExperimentQuiz();
