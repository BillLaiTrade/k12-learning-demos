const tapButton = document.querySelector('#light-speed-tap');

if (tapButton) {
  const timeOutput = document.querySelector('#light-time-output');
  const distanceOutput = document.querySelector('#light-distance');
  const lapOutput = document.querySelector('#earth-lap-result');
  const feedback = document.querySelector('#light-speed-feedback');
  const orbitDot = document.querySelector('#light-speed-orbit-dot');
  const LIGHT_SPEED_KM_PER_SECOND = 300_000;
  const EARTH_EQUATOR_KM = 40_000;
  let phase = 'ready';
  let startTime = 0;

  const formatLaps = (laps) => {
    const rounded = Math.round(laps * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  };

  const showMeasurement = (seconds) => {
    const distanceKm = seconds * LIGHT_SPEED_KM_PER_SECOND;
    const laps = distanceKm / EARTH_EQUATOR_KM;
    timeOutput.textContent = `${seconds.toFixed(2)} 秒`;
    distanceOutput.textContent = `${Math.round(distanceKm).toLocaleString('zh-TW')} 公里`;
    lapOutput.textContent = `約繞地球 ${formatLaps(laps)} 圈`;
    orbitDot.style.transform = `rotate(-24deg) translateX(${Math.round((laps % 1) * 18)}px)`;
  };

  tapButton.addEventListener('click', (event) => {
    if (phase !== 'measuring') {
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
