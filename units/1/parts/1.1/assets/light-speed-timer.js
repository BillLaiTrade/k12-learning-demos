const tapButton = document.querySelector('#light-speed-tap');

if (tapButton) {
  const timeOutput = document.querySelector('#light-time-output');
  const distanceOutput = document.querySelector('#light-distance');
  const lapOutput = document.querySelector('#earth-lap-result');
  const lapDetail = document.querySelector('#earth-lap-detail');
  const lapCounter = document.querySelector('#earth-lap-counter');
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
    lapCounter.replaceChildren();
    moveOrbitDot(100, 38, 0);
    lapDetail.hidden = true;
  };

  const drawOrbit = (laps) => {
    clearOrbit();
    const displayLaps = Math.round(laps * 10) / 10;
    const wholeLaps = Math.floor(displayLaps);
    const partialLap = Math.round((displayLaps - wholeLaps) * 10) / 10;
    const addOrbitPath = (partial = false) => {
      const path = document.createElementNS(SVG_NS, 'ellipse');
      path.setAttribute('class', `light-speed-orbit-lap${partial ? ' is-partial' : ''}`);
      path.setAttribute('cx', String(orbitCenter));
      path.setAttribute('cy', String(orbitCenter));
      path.setAttribute('rx', '100');
      path.setAttribute('ry', '38');
      orbitLaps.append(path);
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length} ${length}`;
      return path;
    };
    if (wholeLaps > 0) addOrbitPath();
    if (partialLap > 0) {
      const partialPath = addOrbitPath(true);
      const length = partialPath.getTotalLength();
      partialPath.style.strokeDasharray = `${partialLap * length} ${length}`;
    }
    moveOrbitDot(100, 38, partialLap);
    const loopCount = wholeLaps + (partialLap > 0 ? 1 : 0);
    for (let index = 0; index < loopCount; index += 1) {
      const amount = index < wholeLaps ? 1 : partialLap;
      const item = document.createElement('span');
      item.style.setProperty('--lap-progress', String(amount * 100));
      const number = document.createElement('b');
      number.textContent = String(index + 1);
      item.append(number);
      lapCounter.append(item);
    }
    lapCounter.setAttribute('aria-label', wholeLaps === 0
      ? `未滿一圈，已走 ${formatLaps(partialLap)} 圈`
      : partialLap > 0
        ? `${wholeLaps} 圈完整，再走 ${formatLaps(partialLap)} 圈`
        : `完成 ${wholeLaps} 圈`);
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
