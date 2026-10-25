const tapButton = document.querySelector('#light-speed-tap');

if (tapButton) {
  const timeOutput = document.querySelector('#light-time-output');
  const distanceOutput = document.querySelector('#light-distance');
  const lapOutput = document.querySelector('#earth-lap-result');
  const lapDetail = document.querySelector('#earth-lap-detail');
  const feedback = document.querySelector('#light-speed-feedback');
  const orbitDot = document.querySelector('#light-speed-orbit-dot');
  const orbitLaps = document.querySelector('#light-speed-orbit-laps');
  const LIGHT_SPEED_KM_PER_SECOND = 300_000;
  const EARTH_EQUATOR_KM = 40_000;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const orbitCenter = 125;
  const orbitRotation = -24 * Math.PI / 180;
  let phase = 'ready';
  let startTime = 0;

  const formatLaps = (laps) => {
    const rounded = Math.round(laps * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  };

  const moveOrbitDot = (rx, ry, progress) => {
    const angle = progress * Math.PI * 2;
    const x = rx * Math.cos(angle);
    const y = ry * Math.sin(angle);
    const rotatedX = orbitCenter + x * Math.cos(orbitRotation) - y * Math.sin(orbitRotation);
    const rotatedY = orbitCenter + x * Math.sin(orbitRotation) + y * Math.cos(orbitRotation);
    orbitDot.style.left = `${rotatedX / 250 * 100}%`;
    orbitDot.style.top = `${rotatedY / 250 * 100}%`;
  };

  const clearOrbit = () => {
    orbitLaps.replaceChildren();
    moveOrbitDot(64, 21, 0);
    lapDetail.hidden = true;
  };

  const drawOrbit = (laps) => {
    clearOrbit();
    const displayLaps = Math.round(laps * 10) / 10;
    const wholeLaps = Math.floor(displayLaps);
    const partialLap = Math.round((displayLaps - wholeLaps) * 10) / 10;
    const ringCount = Math.ceil(displayLaps);
    const ringSpacing = ringCount > 1 ? Math.min(16, 59 / (ringCount - 1)) : 8;
    const verticalSpacing = ringSpacing * 0.4;
    const addOrbitPath = (rx, ry, partial = false) => {
      const path = document.createElementNS(SVG_NS, 'ellipse');
      path.setAttribute('class', `light-speed-orbit-lap${partial ? ' is-partial' : ''}`);
      path.setAttribute('cx', String(orbitCenter));
      path.setAttribute('cy', String(orbitCenter));
      path.setAttribute('rx', String(rx));
      path.setAttribute('ry', String(ry));
      orbitLaps.append(path);
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length} ${length}`;
      return path;
    };
    for (let index = 0; index < wholeLaps; index += 1) {
      addOrbitPath(64 + index * ringSpacing, 21 + index * verticalSpacing);
    }
    let finalRx = wholeLaps > 0 ? 64 + (wholeLaps - 1) * ringSpacing : 64;
    let finalRy = wholeLaps > 0 ? 21 + (wholeLaps - 1) * verticalSpacing : 21;
    if (partialLap > 0) {
      finalRx = 64 + wholeLaps * ringSpacing;
      finalRy = 21 + wholeLaps * verticalSpacing;
      const partialPath = addOrbitPath(finalRx, finalRy, true);
      const length = partialPath.getTotalLength();
      partialPath.style.strokeDasharray = `${partialLap * length} ${length}`;
    }
    moveOrbitDot(finalRx, finalRy, partialLap);
    lapDetail.textContent = wholeLaps === 0
      ? `未滿 1 圈・已走 ${formatLaps(partialLap)} 圈`
      : partialLap > 0
        ? `${wholeLaps} 圈完整＋再走 ${formatLaps(partialLap)} 圈`
        : `完成 ${wholeLaps} 圈`;
    lapDetail.hidden = false;
  };

  const showMeasurement = (seconds) => {
    const distanceKm = seconds * LIGHT_SPEED_KM_PER_SECOND;
    const laps = distanceKm / EARTH_EQUATOR_KM;
    timeOutput.textContent = `${seconds.toFixed(2)} 秒`;
    distanceOutput.textContent = `${Math.round(distanceKm).toLocaleString('zh-TW')} 公里`;
    lapOutput.textContent = `約繞地球 ${formatLaps(laps)} 圈`;
    drawOrbit(laps);
  };

  tapButton.addEventListener('click', (event) => {
    if (phase !== 'measuring') {
      clearOrbit();
      startTime = event.timeStamp;
      phase = 'measuring';
      tapButton.dataset.phase = phase;
      tapButton.textContent = '再點一下停止';
      feedback.textContent = '計時中，再點一次停止。';
      feedback.dataset.state = 'running';
      return;
    }

    const elapsed = Math.max(0.01, (event.timeStamp - startTime) / 1000);
    const displayedSeconds = Math.max(0.01, Math.round(elapsed * 100) / 100);
    phase = 'result';
    tapButton.dataset.phase = phase;
    tapButton.textContent = '再測一次';
    showMeasurement(displayedSeconds);
    feedback.textContent = `約 ${displayedSeconds.toFixed(2)} 秒；光已走過 ${Math.round(displayedSeconds * LIGHT_SPEED_KM_PER_SECOND).toLocaleString('zh-TW')} 公里。`;
    feedback.dataset.state = 'complete';
  });
}
