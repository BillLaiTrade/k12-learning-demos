export function mountDensityExperimentQuiz() {
  const quiz = document.querySelector('#density-experiment-quiz');
  if (!quiz) return;

  const samples = {
    A: { mass: 39, before: 20, after: 35, image: 'assets/stone-model.webp' },
    B: { mass: 65, before: 20, after: 50, image: 'assets/stone-model-b.webp' }
  };
  const sampleCards = [...quiz.querySelectorAll('[data-experiment-sample]')];
  const tools = [...quiz.querySelectorAll('[data-instrument]')];
  const marks = [...quiz.querySelectorAll('[data-volume]')];
  const feedback = quiz.querySelector('[data-experiment-feedback]');
  let selectedSample = null;
  let scaleSample = null;
  let cylinderSample = null;
  let drag = null;

  function record(sample) {
    return quiz.querySelector(`[data-experiment-record="${sample}"]`);
  }

  function field(sample, name) {
    return record(sample).querySelector(`[data-entry="${name}"]`);
  }

  function setActiveMark(value) {
    marks.forEach(mark => mark.classList.toggle('is-active', Number(mark.dataset.volume) === Number(value)));
  }

  function setWaterReading(value) {
    const level = Math.min(60, Math.max(0, Number(value) || 0));
    const water = quiz.querySelector('[data-experiment-water]');
    water.style.height = `${level / 60 * 100}%`;
    quiz.querySelector('[data-water-reading]').textContent = `${value} mL`;
    setActiveMark(value);
  }

  function chooseSample(sample) {
    selectedSample = sample;
    sampleCards.forEach(card => card.setAttribute('aria-pressed', String(card.dataset.experimentSample === sample)));
    if (!cylinderSample) {
      const enteredBefore = field(sample, 'before').value;
      setWaterReading(enteredBefore === '' ? samples[sample].before : Number(enteredBefore));
    }
  }

  function placeSample(sample, instrument) {
    if (instrument === 'scale') {
      if (cylinderSample === sample) removeSample(sample, 'cylinder');
      if (scaleSample && scaleSample !== sample) removeSample(scaleSample, 'scale');
    }
    if (instrument === 'cylinder') {
      if (scaleSample === sample) removeSample(sample, 'scale');
      if (cylinderSample && cylinderSample !== sample) removeSample(cylinderSample, 'cylinder');
    }
    chooseSample(sample);
    if (instrument === 'scale') {
      scaleSample = sample;
      const rock = quiz.querySelector('[data-scale-rock]');
      rock.src = samples[sample].image;
      rock.dataset.dragSample = sample;
      rock.classList.add('is-visible');
      quiz.querySelector('[data-scale-reading]').textContent = samples[sample].mass.toFixed(1);
    }
    if (instrument === 'cylinder') {
      cylinderSample = sample;
      const rock = quiz.querySelector('[data-cylinder-rock]');
      rock.src = samples[sample].image;
      rock.dataset.dragSample = sample;
      rock.classList.add('is-visible');
      setWaterReading(samples[sample].after);
    }
  }

  function removeSample(sample, instrument) {
    if (instrument === 'scale' && scaleSample === sample) {
      scaleSample = null;
      const rock = quiz.querySelector('[data-scale-rock]');
      rock.classList.remove('is-visible');
      quiz.querySelector('[data-scale-reading]').textContent = '0.0';
    }
    if (instrument === 'cylinder' && cylinderSample === sample) {
      cylinderSample = null;
      const rock = quiz.querySelector('[data-cylinder-rock]');
      rock.classList.remove('is-visible');
      const before = selectedSample ? field(selectedSample, 'before').value : '';
      setWaterReading(before === '' ? 20 : Number(before));
    }
  }

  function updateRecord(sample) {
    const massInput = field(sample, 'mass');
    const beforeInput = field(sample, 'before');
    const afterInput = field(sample, 'after');
    const volumeInput = field(sample, 'volume');
    const mass = Number(massInput.value);
    const before = Number(beforeInput.value);
    const after = Number(afterInput.value);
    const hasReadings = beforeInput.value !== '' && afterInput.value !== '';
    const volume = after - before;
    const validVolume = hasReadings && Number.isFinite(volume) && volume > 0;

    volumeInput.value = validVolume ? String(volume) : '';
    record(sample).querySelector('[data-entry="delta"]').textContent = validVolume ? `${volume} mL` : '—';
    const densityOutput = record(sample).querySelector('[data-entry="density"]');
    if (massInput.value !== '' && mass > 0 && validVolume) {
      const density = mass / volume;
      densityOutput.textContent = `${density.toFixed(2)} g/cm³`;
      densityOutput.dataset.value = String(density);
    } else {
      densityOutput.textContent = '—';
      delete densityOutput.dataset.value;
    }
    afterInput.setAttribute('aria-invalid', String(hasReadings && !validVolume));

    if (selectedSample === sample && !cylinderSample) {
      setWaterReading(beforeInput.value === '' ? samples[sample].before : before);
    }
    if (cylinderSample === sample && afterInput.value !== '') setWaterReading(after);

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
    ghost.className = 'experiment-ghost';
    ghost.style.width = source.dataset.experimentSample ? '112px' : '112px';
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

  sampleCards.forEach(card => {
    card.addEventListener('click', () => chooseSample(card.dataset.experimentSample));
    card.addEventListener('pointerdown', event => startDrag(event, card));
    card.addEventListener('pointermove', event => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 5) drag.moved = true;
      moveGhost(event.clientX, event.clientY);
    });
    card.addEventListener('pointerup', event => finishDrag(event));
    card.addEventListener('pointercancel', event => finishDrag(event));
  });

  quiz.querySelectorAll('[data-drag-sample]').forEach(rock => {
    rock.addEventListener('pointerdown', event => startDrag(event, rock));
    rock.addEventListener('pointermove', event => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 5) drag.moved = true;
      moveGhost(event.clientX, event.clientY);
    });
    rock.addEventListener('pointerup', event => finishDrag(event));
    rock.addEventListener('pointercancel', event => finishDrag(event));
  });

  function finishDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const current = drag;
    drag = null;
    current.ghost.remove();
    tools.forEach(tool => tool.classList.remove('is-drop-target'));
    const moved = current.moved
      || Math.abs(event.clientX - current.startX) + Math.abs(event.clientY - current.startY) > 5;
    if (!moved) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-instrument]');
    if (current.sourceInstrument) removeSample(current.sample, current.sourceInstrument);
    if (target) placeSample(current.sample, target.dataset.instrument);
  }

  tools.forEach(tool => {
    tool.addEventListener('pointermove', event => {
      if (drag && drag.pointerId === event.pointerId
        && Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 5) drag.moved = true;
      moveGhost(event.clientX, event.clientY);
    });
    tool.addEventListener('pointerup', finishDrag);
    tool.addEventListener('pointercancel', finishDrag);
    tool.addEventListener('click', event => {
      if (selectedSample && !event.target.closest('[data-drag-sample]')) placeSample(selectedSample, tool.dataset.instrument);
    });
    tool.addEventListener('keydown', event => {
      if (selectedSample && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        placeSample(selectedSample, tool.dataset.instrument);
      }
    });
  });

  ['A', 'B'].forEach(sample => {
    record(sample).querySelectorAll('[data-entry]').forEach(input => {
      if (input.readOnly) return;
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
      feedback.textContent = '請先填妥兩顆石頭的質量和放入前後水位，再比較密度。';
      feedback.dataset.result = 'incomplete';
      return;
    }
    if (!answer) {
      feedback.textContent = '請選出你認為密度較大的石頭。';
      feedback.dataset.result = 'incomplete';
      return;
    }
    const correct = densities[0] === densities[1] ? null : densities[0] > densities[1] ? 'A' : 'B';
    if (answer === correct) {
      feedback.textContent = `比較正確。石頭 A 為 ${densities[0].toFixed(2)} g/cm³，石頭 B 為 ${densities[1].toFixed(2)} g/cm³。`;
      feedback.dataset.result = 'correct';
    } else if (correct === null) {
      feedback.textContent = `兩顆石頭計算出的密度相同，都是 ${densities[0].toFixed(2)} g/cm³。`;
      feedback.dataset.result = 'incorrect';
    } else {
      feedback.textContent = `再比一次數值：石頭 A 為 ${densities[0].toFixed(2)} g/cm³，石頭 B 為 ${densities[1].toFixed(2)} g/cm³。密度是質量除以體積。`;
      feedback.dataset.result = 'incorrect';
    }
  });
}

mountDensityExperimentQuiz();
