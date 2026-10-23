export function mountDensityExperimentQuiz() {
  const quiz = document.querySelector('#density-experiment-quiz');
  if (!quiz) return;

  quiz.querySelector('.overflow-level-detail')?.remove();
  const removedCrownDisplay = document.createElement('div');
  removedCrownDisplay.className = 'overflow-removed-crown';
  removedCrownDisplay.setAttribute('aria-hidden', 'true');
  quiz.querySelector('.experiment-overflow-layout').append(removedCrownDisplay);
  const catchLevelLens = document.createElement('div');
  catchLevelLens.className = 'catch-level-lens';
  catchLevelLens.setAttribute('aria-hidden', 'true');
  catchLevelLens.innerHTML = '<div class="catch-level-lens-ruler"><span data-lens-upper>10</span><i data-lens-line></i><span data-lens-lower>0</span></div><div class="catch-level-lens-reading"><strong data-lens-value>0</strong><small>mL</small></div>';
  quiz.querySelector('.overflow-catch-tray').append(catchLevelLens);

  const samples = {
    A: { mass: 714, volume: 37, image: 'assets/golden-wreath.webp', label: '皇冠樣本 A' },
    B: { mass: 680, volume: 44, image: 'assets/crown-sample-b.svg', label: '皇冠樣本 B' },
    C: { mass: 193, volume: 10, image: 'assets/pure-gold-block.svg', label: '純金對照塊' }
  };
  const sampleCards = [...quiz.querySelectorAll('[data-experiment-sample]')];
  const tools = [...quiz.querySelectorAll('[data-instrument]')];
  const feedback = quiz.querySelector('[data-experiment-feedback]');
  let selectedSample = null;
  const scaleSamples = new Set();
  const tankSamples = new Set();
  const removedTankSamples = new Set();
  const tankSampleVolumes = new Map();
  let collectedVolume = 0;
  let pendingReturnVolume = 0;
  let returnTimer = null;
  let returnInProgress = null;
  let spillTimer = null;
  let drag = null;

  function record(sample) {
    return quiz.querySelector(`[data-experiment-record="${sample}"]`);
  }

  function field(sample, name) {
    return record(sample).querySelector(`[data-entry="${name}"]`);
  }

  function sampleLabel(sample) {
    return samples[sample]?.label || `樣本 ${sample}`;
  }

  function refreshRemovedCrown() {
    removedCrownDisplay.innerHTML = [...removedTankSamples].map(sample => `<figure><img src="${samples[sample].image}" alt=""><figcaption>${sampleLabel(sample)} 已取出</figcaption></figure>`).join('');
    removedCrownDisplay.classList.toggle('is-visible', removedTankSamples.size > 0);
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

  function setWaterVisual(value) {
    const level = Math.min(100, Math.max(0, Number(value) || 0));
    const water = quiz.querySelector('[data-overflow-water]');
    const tray = water.parentElement;
    const scale = tray.querySelector('.overflow-catch-scale');
    const scaleBounds = scale.getBoundingClientRect();
    // Keep the collected water anchored to the inside floor of the tray.
    water.style.bottom = '3px';
    const waterHeight = scaleBounds.height * level / 100;
    water.style.height = `${waterHeight}px`;
    quiz.querySelector('[data-water-reading]').style.bottom = `${Math.max(3, waterHeight - 8)}px`;
    const lowerMark = Math.min(90, Math.floor(level / 10) * 10);
    const fraction = (level - lowerMark) / 10;
    catchLevelLens.querySelector('[data-lens-upper]').textContent = String(lowerMark + 10);
    catchLevelLens.querySelector('[data-lens-lower]').textContent = String(lowerMark);
    catchLevelLens.querySelector('[data-lens-line]').style.top = `${6 + (1 - fraction) * 22}px`;
    catchLevelLens.querySelector('[data-lens-value]').textContent = level % 1 === 0 ? String(level) : level.toFixed(1);
  }

  function setWaterReading(value) {
    setWaterVisual(value);
    const rounded = Number(value) % 1 === 0 ? Number(value).toFixed(0) : Number(value).toFixed(1);
    quiz.querySelector('[data-water-reading]').textContent = `${rounded} mL`;
  }

  function setTankWaterLevel(deficit) {
    const water = quiz.querySelector('.overflow-tank-water');
    const tank = quiz.querySelector('.overflow-tank');
    const tankDepthCm = 12;
    const surfaceAreaCm2 = 19 * 0.7;
    const volumeMl = Math.max(0, Number(deficit) || 0);
    const heightPx = volumeMl / surfaceAreaCm2 * (tank.getBoundingClientRect().height / tankDepthCm);
    water.style.top = `${heightPx}px`;
  }

  function waterLevelDropMm(volumeMl) {
    const surfaceAreaCm2 = 19 * 0.7;
    return volumeMl / surfaceAreaCm2 * 10;
  }

  function finishWaterReturn() {
    if (!returnInProgress) return;
    window.clearTimeout(returnTimer);
    const returned = returnInProgress.volume;
    collectedVolume = Math.max(0, collectedVolume - returned);
    pendingReturnVolume = Math.max(0, pendingReturnVolume - returned);
    returnInProgress = null;
    returnTimer = null;
    const instrument = quiz.querySelector('[data-instrument="cylinder"]');
    instrument.classList.remove('is-returning-water');
    instrument.classList.remove('is-water-lowered');
    refreshTank();
    quiz.querySelector('[data-water-status]').textContent = pendingReturnVolume > 0
      ? `水已倒回溢水槽；槽內仍有約 ${pendingReturnVolume.toFixed(1)} mL 的水位差。`
      : '接水盤的水已倒回溢水槽，水位恢復到槽口。';
  }

  function startWaterReturn() {
    const returned = Math.min(pendingReturnVolume, collectedVolume);
    if (returned <= 0) return;
    returnInProgress = { volume: returned, phase: 'settling' };
    const dropMm = waterLevelDropMm(returned);
    const instrument = quiz.querySelector('[data-instrument="cylinder"]');
    instrument.classList.add('is-water-lowered');
    quiz.querySelector('[data-water-status]').textContent = `物件已取出，水位先下降約 ${dropMm.toFixed(2)} mm；接水盤的水暫時留在盤中。`;
    // Keep the crown-out, lower-water state visible before the basin moves.
    returnTimer = window.setTimeout(beginWaterReturn, 1400);
  }

  function beginWaterReturn() {
    if (!returnInProgress) return;
    const returned = returnInProgress.volume;
    const instrument = quiz.querySelector('[data-instrument="cylinder"]');
    returnInProgress.phase = 'pouring';
    instrument.classList.remove('is-water-lowered');
    instrument.classList.remove('is-spilling');
    instrument.classList.add('is-returning-water');
    setWaterVisual(collectedVolume - returned);
    setTankWaterLevel(pendingReturnVolume - returned);
    quiz.querySelector('[data-water-status]').textContent = `接水盤中的水正倒回溢水槽（約 ${returned.toFixed(1)} mL）。`;
    returnTimer = window.setTimeout(finishWaterReturn, 1500);
  }

  function refreshScale() {
    const group = quiz.querySelector('[data-scale-rocks]');
    const totalMass = [...scaleSamples].reduce((sum, sample) => sum + sampleMass(sample), 0);
    const placed = [...scaleSamples];
    const positions = placed.length === 1 ? [50] : placed.length === 2 ? [32, 68] : [20, 50, 80];
    const width = placed.length === 3 ? 58 : placed.length === 2 ? 78 : 94;
    const height = placed.length === 3 ? 50 : placed.length === 2 ? 58 : 62;
    group.innerHTML = placed.map((sample, index) => `<img class="experiment-scale-rock crown-thumb" data-drag-sample="${sample}" data-sample="${sample}" src="${samples[sample].image}" alt="${sampleLabel(sample)}，可拖曳移動" style="left:${positions[index]}%;top:-${height}px;width:${width}px;height:${height}px;transform:translateX(-50%)">`).join('');
    quiz.querySelector('[data-scale-reading]').textContent = totalMass.toFixed(1);
    quiz.querySelector('[data-instrument="scale"]').setAttribute('aria-label', `電子秤，放有 ${scaleSamples.size} 件樣本，總質量 ${totalMass.toFixed(1)} 公克`);
  }

  function refreshTank(spill = false) {
    const group = quiz.querySelector('[data-cylinder-rocks]');
    const placed = [...tankSamples];
    const positions = placed.length === 1 ? [50] : placed.length === 2 ? [28, 72] : [18, 50, 82];
    const width = placed.length === 1 ? '60%' : placed.length === 2 ? '42%' : '32%';
    const height = placed.length === 1 ? '67px' : placed.length === 2 ? '62px' : '54px';
    group.innerHTML = placed.map((sample, index) => `<img class="experiment-cylinder-rock crown-thumb" data-drag-sample="${sample}" data-sample="${sample}" src="${samples[sample].image}" alt="${sampleLabel(sample)}，可拖曳移動" style="left:${positions[index]}%;bottom:5px;width:${width};height:${height};transform:translateX(-50%)">`).join('');
    setWaterReading(collectedVolume);
    setTankWaterLevel(pendingReturnVolume);
    const instrument = quiz.querySelector('[data-instrument="cylinder"]');
    instrument.classList.toggle('has-overflow', tankSamples.size > 0);
    if (spill) {
      instrument.classList.remove('is-spilling');
      window.clearTimeout(spillTimer);
      // Restart CSS flow when a sample displaces water over the rim.
      void instrument.offsetWidth;
      instrument.classList.add('is-spilling');
      spillTimer = window.setTimeout(() => instrument.classList.remove('is-spilling'), 1350);
    }
    instrument.setAttribute('aria-label', `溢流水槽與有刻度的接水盤，槽內有 ${tankSamples.size} 件樣本，接水盤有 ${collectedVolume.toFixed(1)} 毫升水`);
  }

  function chooseSample(sample) {
    selectedSample = sample;
    sampleCards.forEach(card => card.setAttribute('aria-pressed', String(card.dataset.experimentSample === sample)));
  }

  function placeSample(sample, instrument) {
    if (instrument === 'cylinder' && returnInProgress) finishWaterReturn();
    if (instrument === 'scale' && tankSamples.has(sample)) removeSample(sample, 'cylinder');
    if (instrument === 'cylinder' && scaleSamples.delete(sample)) refreshScale();
    if (removedTankSamples.delete(sample)) refreshRemovedCrown();
    chooseSample(sample);
    if (instrument === 'scale') {
      scaleSamples.add(sample);
      refreshScale();
    }
    if (instrument === 'cylinder') {
      if (!tankSamples.has(sample)) {
        const volume = sampleVolume(sample);
        tankSamples.add(sample);
        tankSampleVolumes.set(sample, volume);
        const refilled = Math.min(pendingReturnVolume, volume);
        pendingReturnVolume -= refilled;
        const overflowed = volume - refilled;
        collectedVolume += overflowed;
        refreshTank(volume > refilled);
        quiz.querySelector('[data-water-status]').textContent = overflowed > 0
          ? `樣本放入後，約 ${overflowed.toFixed(1)} mL 的水溢出並流入接水盤。`
          : '樣本放入後，水位回升；接水盤中的水量不變。';
      }
    }
  }

  function removeSample(sample, instrument) {
    if (instrument === 'scale' && scaleSamples.delete(sample)) refreshScale();
    if (instrument === 'cylinder' && tankSamples.has(sample)) {
      if (returnInProgress) finishWaterReturn();
      const volume = tankSampleVolumes.get(sample) ?? sampleVolume(sample);
      tankSamples.delete(sample);
      tankSampleVolumes.delete(sample);
      removedTankSamples.add(sample);
      refreshRemovedCrown();
      pendingReturnVolume += volume;
      const instrumentElement = quiz.querySelector('[data-instrument="cylinder"]');
      instrumentElement.classList.remove('is-spilling');
      window.clearTimeout(spillTimer);
      refreshTank();
      quiz.querySelector('[data-water-status]').textContent = `皇冠取出後，水位下降；接水盤中的水正倒回槽中。`;
      startWaterReturn();
    }
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
    if (tankSamples.has(sample)) {
      if (returnInProgress) finishWaterReturn();
      const currentSampleVolume = sampleVolume(sample);
      const previous = tankSampleVolumes.get(sample) ?? currentSampleVolume;
      const difference = currentSampleVolume - previous;
      tankSampleVolumes.set(sample, currentSampleVolume);
      if (difference > 0) {
        const refilled = Math.min(pendingReturnVolume, difference);
        pendingReturnVolume -= refilled;
        collectedVolume += difference - refilled;
      } else if (difference < 0) {
        pendingReturnVolume += Math.abs(difference);
      }
      refreshTank(difference > 0);
    }
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
    ghost.className = 'experiment-ghost crown-thumb';
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
    if (current.sourceInstrument && target?.dataset.instrument === current.sourceInstrument) return;
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
      const inTool = tool.dataset.instrument === 'scale' ? scaleSamples : tankSamples;
      const clickedSample = event.target.closest('[data-drag-sample]')?.dataset.dragSample;
      if (clickedSample) {
        if (selectedSample && !inTool.has(selectedSample)) {
          placeSample(selectedSample, tool.dataset.instrument);
          return;
        }
        if (inTool.has(clickedSample)) removeSample(clickedSample, tool.dataset.instrument);
        return;
      }
      if (!selectedSample) return;
      if (inTool.has(selectedSample)) removeSample(selectedSample, tool.dataset.instrument);
      else placeSample(selectedSample, tool.dataset.instrument);
    });
    tool.addEventListener('keydown', event => {
      if (selectedSample && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        const inTool = tool.dataset.instrument === 'scale' ? scaleSamples : tankSamples;
        if (inTool.has(selectedSample)) removeSample(selectedSample, tool.dataset.instrument);
        else placeSample(selectedSample, tool.dataset.instrument);
      }
    });
  });

  Object.keys(samples).forEach(sample => {
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
    const densities = ['A', 'B', 'C'].map(sample => {
      const value = record(sample).querySelector('[data-entry="density"]').dataset.value;
      return value === undefined ? null : Number(value);
    });
    if (densities.some(value => value === null)) {
      feedback.textContent = '請先填妥兩頂皇冠與純金對照塊的質量及排出水量。';
      feedback.dataset.result = 'incomplete';
      return;
    }
    if (!answer) {
      feedback.textContent = '請選出密度最接近純金對照塊的皇冠。';
      feedback.dataset.result = 'incomplete';
      return;
    }
    const differenceA = Math.abs(densities[0] - densities[2]);
    const differenceB = Math.abs(densities[1] - densities[2]);
    const correct = differenceA === differenceB ? null : differenceA < differenceB ? 'A' : 'B';
    if (answer === correct) {
      feedback.textContent = `判斷正確。純金對照塊的密度約為 ${densities[2].toFixed(2)} g/cm³；皇冠 A 為 ${densities[0].toFixed(2)} g/cm³，皇冠 B 為 ${densities[1].toFixed(2)} g/cm³。皇冠 ${correct} 的密度最接近純金對照塊。`;
      feedback.dataset.result = 'correct';
    } else if (correct === null) {
      feedback.textContent = `兩頂皇冠與純金對照塊的密度差距相同；請再檢查量測資料。`;
      feedback.dataset.result = 'incorrect';
    } else {
      feedback.textContent = `再比較一次：純金對照塊的密度約為 ${densities[2].toFixed(2)} g/cm³，皇冠 A 為 ${densities[0].toFixed(2)} g/cm³，皇冠 B 為 ${densities[1].toFixed(2)} g/cm³。較接近純金對照塊的是皇冠 ${correct}。`;
      feedback.dataset.result = 'incorrect';
    }
  });
}

mountDensityExperimentQuiz();
