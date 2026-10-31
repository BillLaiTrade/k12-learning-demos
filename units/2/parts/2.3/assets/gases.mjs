import { evaluateGasReport } from './air-report.mjs?v=properties-7';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const players = [...document.querySelectorAll('[data-replay]:not(.oxygen-preparation)')].map(panel => {
  const steps = [...panel.querySelectorAll('[data-stage]')];
  const play = panel.querySelector('[data-play]'), pause = panel.querySelector('[data-pause]'), reset = panel.querySelector('[data-reset]'), status = panel.querySelector('.sequence-status');
  let timer = null, index = -1, state = 'overview';
  const stop = () => { if (timer !== null) clearTimeout(timer); timer = null; };
  const render = () => {
    panel.dataset.state = state; panel.dataset.stage = index;
    steps.forEach((step, i) => step.classList.toggle('is-current', i === index));
    play.disabled = state === 'playing'; pause.disabled = state !== 'playing'; reset.disabled = state === 'overview';
    play.textContent = state === 'paused' ? '繼續重播' : '重播過程';
    status.textContent = state === 'overview' ? '材料、產氣、收集與蓋好瓶口四個階段。' : (state === 'paused' ? '已暫停：' : state === 'complete' ? '重播完成：' : '') + steps[index].querySelector('.step-label').textContent;
  };
  const tick = () => {
    if (state !== 'playing') return;
    if (index < steps.length - 1) { index++; render(); timer = setTimeout(tick, 1300); }
    else { timer = null; state = 'complete'; render(); }
  };
  const pausePlayback = () => { if (state === 'playing') { stop(); state = 'paused'; render(); } };
  play.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('air-experiment-play',{detail:'co2'}));
    stop();
    if (reduced.matches) { index = steps.length - 1; state = 'complete'; render(); return; }
    if (state !== 'paused') index = 0;
    state = 'playing'; render(); timer = setTimeout(tick, 1300);
  });
  pause.addEventListener('click', pausePlayback);
  reset.addEventListener('click', () => { stop(); index = -1; state = 'overview'; render(); });
  const observer = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) pausePlayback(); });
  observer.observe(panel);
  render();
  return { pausePlayback };
});
document.addEventListener('visibilitychange', () => { if (document.hidden) players.forEach(p => p.pausePlayback()); });
reduced.addEventListener('change', () => { if (reduced.matches) players.forEach(p => p.pausePlayback()); });

const form = document.querySelector('#gas-report-form'), feedback = document.querySelector('#gas-report-feedback');
const clearFeedback = () => { feedback.hidden = true; feedback.replaceChildren(); feedback.removeAttribute('data-result'); };
form.addEventListener('input', clearFeedback);
form.addEventListener('change', clearFeedback);
form.addEventListener('reset', clearFeedback);
form.addEventListener('submit', event => {
  event.preventDefault();
  const result = evaluateGasReport(Object.fromEntries(new FormData(form)));
  feedback.replaceChildren(); feedback.hidden = false;
  feedback.dataset.result = result.correct ? 'correct' : 'revise';
  const heading = document.createElement('strong');
  heading.textContent = result.correct ? '這份氣體紀錄的說明，都能和提供的資料對上。' : result.missing.length ? '還有說明未完成，請補上後再檢查。' : '有些說明需要再對照觀察資料。';
  feedback.append(heading);
  if (result.missing.length) {
    const p = document.createElement('p'); p.textContent = '尚未完成：' + result.missing.map(r => r.label).join('、') + '。'; feedback.append(p);
  }
  if (result.corrections.length) {
    const list = document.createElement('ul');
    for (const rule of result.corrections) {
      const item = document.createElement('li'); item.append(rule.label + '：' + rule.hint + ' ');
      const link = document.createElement('a'); link.href = '#' + rule.target; link.textContent = '回看觀察'; item.append(link); list.append(item);
    }
    feedback.append(list);
  }
});

document.addEventListener('air-experiment-play',event=>{if(event.detail!=='co2')players.forEach(p=>p.pausePlayback());});
