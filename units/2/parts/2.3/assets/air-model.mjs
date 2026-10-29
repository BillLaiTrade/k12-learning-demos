export const clamp = (n, low, high) => Math.max(low, Math.min(high, Number(n) || 0));
export const freshExperiment = () => ({ phase: 'ready', before: null, after: null, progress: 0, alignment: 0, wait: 0, paused: false, preview: null });

// Calibrated free gas volume; all apparatus views use this same geometry.
export function gasGeometry(progress, alignment = 0, control = false) {
  const fraction = control ? 0 : clamp(progress, 0, 1);
  const reference = 100 - 21 * fraction;
  const top = 20.4 - 4.2 * fraction * clamp(alignment, 0, 1);
  let low = 0, high = 4.2;
  for (let i = 0; i < 55; i++) {
    const y = (low + high) / 2;
    const volume = 5 * (top - y) - 2;
    if ((1 - y / 1033) * volume > reference) low = y;
    else high = y;
  }
  const water = (low + high) / 2;
  return { top, water, mouth: top - 24, volume: 5 * (top - water) - 2, reference };
}

export function act(state, action, value) {
  const s = { ...state };
  switch (action) {
    case 'reset': return freshExperiment();
    case 'before': if (s.phase === 'ready') { s.before = 100; s.phase = 'prepared'; } break;
    case 'start': if (s.before !== null && ['prepared', 'running'].includes(s.phase)) { s.phase = 'running'; s.paused = false; s.preview = null; } break;
    case 'pause': if (['running', 'waiting', 'aligning'].includes(s.phase)) s.paused = !s.paused; break;
    case 'wait': if (s.phase === 'settled' && s.preview === null) { s.phase = 'waiting'; s.wait = 0; s.paused = false; } break;
    case 'align': if (s.phase === 'stable' && s.preview === null) { s.phase = 'aligning'; s.paused = false; } break;
    case 'after': if (s.phase === 'aligned' && s.preview === null) { s.after = 79; s.phase = 'recorded'; } break;
    case 'live': s.preview = null; break;
    case 'scrub':
      if (s.before === null) break;
      if (s.after !== null) { s.preview = clamp(value, 0, 1); break; }
      s.progress = clamp(value, 0, 1); s.alignment = 0; s.wait = 0;
      s.phase = s.progress === 1 ? 'settled' : 'running'; s.paused = true; s.preview = null;
      break;
  }
  return s;
}

export function advance(state, seconds) {
  const s = { ...state };
  if (s.paused || s.preview !== null) return s;
  const dt = clamp(seconds, 0, 60);
  if (s.phase === 'running') {
    s.progress = Math.min(1, s.progress + dt / 12);
    if (s.progress >= 1) { s.phase = 'settled'; s.paused = false; }
  } else if (s.phase === 'waiting') {
    s.wait = Math.min(1, s.wait + dt / 3);
    if (s.wait >= 1) s.phase = 'stable';
  } else if (s.phase === 'aligning') {
    s.alignment = Math.min(1, s.alignment + dt / 1.2);
    if (s.alignment >= 1) s.phase = 'aligned';
  }
  return s;
}

export function airComposition(waterPercent = 0, dryOnly = false) {
  const water = dryOnly ? 0 : clamp(waterPercent, 0, 4);
  const dry = (100 - water) / 100;
  return { nitrogen: 78 * dry, oxygen: 21 * dry, other: dry, water };
}

export { cupGeometry } from './cup-lab-model.mjs';

export function checkReport({ loss, percent, composition, fuel }) {
  const missing = loss === '' || percent === '' || !composition || !fuel;
  if (missing) return { result: 'incomplete', messages: ['請填妥減少量、比例與兩項結論，再檢查紀錄。'] };
  const messages = [];
  if (!Number.isFinite(Number(loss)) || Math.abs(Number(loss) - 30) > .001) messages.push('先比較兩次體積：150 − 120 = 30 mL。');
  if (!Number.isFinite(Number(percent)) || Math.abs(Number(percent) - 20) > .001) messages.push('用減少的 30 mL 除以開始的 150 mL，得到 20%，約五分之一。');
  if (composition !== 'mixture') messages.push('氮氣最多，但剩餘氣體還含其他成分；不能直接當成純氮氣。');
  if (fuel !== 'wood') messages.push('燃燒的是木條，氧氣幫助燃燒。');
  return { result: messages.length ? 'revise' : 'correct', messages: messages.length ? messages : ['這組氣體減少約五分之一；查閱資料可知氮氣最多；燃燒的是木條，氧氣助燃。空氣包含不同氣體。'] };
}
