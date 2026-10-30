// A slowed teaching timeline, not the flight time over the illustrated tabletop.
export const REFLECTION_DURATION = 4.6;
export const REFLECTION_RETURN_TIME = 4.4;
export function reflectionFrame(progress) {
  const time = Math.max(0, Math.min(1, progress)) * REFLECTION_DURATION;
  if (time < 2) return {stage: 'outbound', step: 1, x: 245 + 520 * time / 2, time};
  if (time < 2.3) return {stage: 'surface', step: 2, x: 765, time};
  if (time < REFLECTION_RETURN_TIME) return {stage: 'returning', step: 3, x: 765 - 365 * (time - 2.3) / 2.1, time};
  return {stage: 'received', step: 3, x: 400, time};
}
export function renderReflection(progress) {
  const root = document.getElementById('reflection'), frame = reflectionFrame(progress), ready = root.dataset.phase === 'ready';
  const stage = ready ? 'ready' : frame.stage;
  root.dataset.stage = stage;
  const waves = document.getElementById('reflection-waves');
  const returning = frame.stage === 'returning', color = returning ? '#f8b349' : '#81c8cb';
  let paths = '';
  if (!ready && ['outbound', 'returning', 'surface'].includes(stage)) {
    for (let i = 0; i < 4; i++) {
      const x = frame.x + (returning ? 1 : -1) * i * 48;
      if (x < 225 || x > 775) continue;
      const size = 48 + i * 12, bend = returning ? -31 : 31;
      const d = `M${x} ${330-size} Q${x+bend} 330 ${x} ${330+size}`;
      paths += `<path d="${d}" stroke="${color}" stroke-width="10" opacity=".3" fill="none" filter="url(#reflection-glow)"/><path d="${d}" stroke="${color}" stroke-width="4" opacity="${.94-i*.14}" stroke-linecap="round" fill="none"/>`;
    }
  }
  waves.innerHTML = paths;
  // Only the cone shades pulse; the desk, receiver and reflector stay still.
  const cone = !ready && frame.time < .18 ? Math.sin(Math.PI * frame.time / .18) ** 2 * .3 : 0;
  document.getElementById('reflection-cone').innerHTML = `<ellipse cx="199" cy="329" rx="31" ry="54" fill="#ffd485" opacity="${cone}"/>`;
  const received = !ready && stage === 'received';
  document.getElementById('reflection-receiver-light').innerHTML = received ? '<circle cx="373" cy="366" r="12" fill="#f8b349" opacity=".5" filter="url(#reflection-glow)"/><circle cx="373" cy="366" r="5" fill="#ffe5a8" stroke="#bc7420" stroke-width="1.5"/>' : '';
  const direction = document.getElementById('reflection-direction');
  direction.textContent = ready || stage === 'received' ? '' : returning ? '← 反射傳回' : stage === 'surface' ? '到達板面' : '發出短音 →';
  direction.dataset.direction = returning ? 'returning' : 'outbound';
  document.querySelectorAll('[data-reflection-step]').forEach(el => {
    const current = !ready && Number(el.dataset.reflectionStep) === frame.step;
    if (current) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
  });
  const messages = {ready:'點喇叭，觀察一次發聲如何返回。',outbound:'喇叭發出一次短音，聲音正在傳向反射板。',surface:'聲音到達板面，一部分將反射回來。',returning:'聲音到達板面後，一部分反射回來。',received:'接收器收到同一次發聲的反射聲。'};
  const reading = document.getElementById('reflection-reading');
  if (reading.textContent !== messages[stage]) reading.textContent = messages[stage];
}
