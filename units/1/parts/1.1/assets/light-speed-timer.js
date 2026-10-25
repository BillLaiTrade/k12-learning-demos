const tapButton = document.querySelector('#light-speed-tap');

if (tapButton) {
  const timeOutput = document.querySelector('#light-time-output');
  const distanceOutput = document.querySelector('#light-distance');
  const lapOutput = document.querySelector('#earth-lap-result');
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
  let orbitAnimation = 0;

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
    cancelAnimationFrame(orbitAnimation);
    orbitLaps.replaceChildren();
    moveOrbitDot(100, 38, 0);
  };

  const drawOrbit = (laps) => {
    clearOrbit();
    const displayLaps = Math.round(laps * 10) / 10;
    const loopCount = Math.ceil(displayLaps);
    const paths = [];
    for (let index = 0; index < loopCount; index += 1) {
      const rx = 100 + index * 3.2;
      const ry = 38 + index * 1.2;
      const amount = Math.min(1, displayLaps - index);
      const path = document.createElementNS(SVG_NS, 'ellipse');
      path.setAttribute('class', 'light-speed-orbit-lap');
      path.setAttribute('cx', String(orbitCenter));
      path.setAttribute('cy', String(orbitCenter));
      path.setAttribute('rx', String(rx));
      path.setAttribute('ry', String(ry));
      orbitLaps.append(path);
      const length = path.getTotalLength();
      path.style.strokeDasharray = `0 ${length}`;
      paths.push({ path, length, amount, rx, ry });
    }

    const lapDuration = 850;
    const startedAt = performance.now();
    const animate = (now) => {
      const elapsedLaps = (now - startedAt) / lapDuration;
      let active = null;
      for (let index = 0; index < paths.length; index += 1) {
        const lap = paths[index];
        const progress = Math.min(lap.amount, Math.max(0, elapsedLaps - index));
        lap.path.style.strokeDasharray = `${progress * lap.length} ${lap.length}`;
        if (!active && progress < lap.amount) active = { ...lap, progress };
      }
      if (active) moveOrbitDot(active.rx, active.ry, active.progress);
      else if (paths.length) {
        const last = paths[paths.length - 1];
        moveOrbitDot(last.rx, last.ry, last.amount % 1);
      }
      if (elapsedLaps < paths.length) orbitAnimation = requestAnimationFrame(animate);
    };
    orbitAnimation = requestAnimationFrame(animate);
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
