import { createChallenge, checkEstimate } from './fireworks-model.mjs?v=3';
import { FireworkRenderer, FIREWORK_DURATION } from './fireworks-renderer.mjs?v=3';
import { FireworkAudio } from './fireworks-audio.mjs?v=2';
import { stopOnLeave } from './lesson-playback.mjs?v=2';

const root = document.querySelector('#unit-quiz.fireworks-quiz');
if (root) {
  const find = selector => root.querySelector(selector);
  const observe = find('#fireworks-observe'), observeText = observe.querySelector('span');
  const challengeButton = find('#fireworks-new'), canvas = find('canvas');
  const picture = find('.fireworks-scene>img'), caption = find('.fireworks-scene-caption');
  const timer = find('#fireworks-timer'), record = find('#fireworks-delay');
  const recordLabel = find('#fireworks-record-label'), progress = find('.fireworks-line');
  const lightEvent = find('#fireworks-light'), soundEvent = find('#fireworks-sound');
  const form = find('#fireworks-answer-form'), answer = find('#fireworks-answer');
  const check = find('#fireworks-check'), feedback = find('#fireworks-feedback');
  const status = find('#fireworks-status');
  const audio = new FireworkAudio(), renderer = new FireworkRenderer(canvas);
  const format = value => Number(value.toFixed(2)).toLocaleString('zh-TW', { maximumFractionDigits: 2 });
  let challenge, state = 'ready', request = 0, frame = 0, startAt = null, arrived = false;

  function setState(next) {
    state = next; root.dataset.state = next;
    const busy = next === 'preparing' || next === 'observing';
    observe.disabled = busy;
    observeText.textContent = next === 'preparing' ? '準備音效…'
      : next === 'observing' ? '觀察中…' : next === 'complete' ? '再觀察一次' : '觀察煙火';
    answer.disabled = next !== 'complete'; check.disabled = next !== 'complete';
  }

  function clearFeedback() {
    feedback.hidden = true; feedback.textContent = '';
    delete feedback.dataset.state; answer.removeAttribute('aria-invalid');
  }

  function resetObservation() {
    request++;
    cancelAnimationFrame(frame); frame = 0; audio.stop(); startAt = null; arrived = false;
    root.dataset.audio = 'idle'; root.dataset.elapsed = '0';
    delete root.dataset.delay;
    timer.textContent = '—'; record.textContent = '—';
    recordLabel.textContent = '亮光與聲音的時間差';
    progress.style.setProperty('--progress', '0%');
    progress.setAttribute('aria-valuenow', '0');
    lightEvent.dataset.reached = 'false'; soundEvent.dataset.reached = 'false';
    caption.textContent = ''; status.textContent = ''; delete status.dataset.error;
    renderer.draw(-1); clearFeedback(); setState('ready');
  }

  function newChallenge() {
    resetObservation();
    challenge = createChallenge({ previous: challenge });
    root.dataset.temperature = String(challenge.temperature);
    find('#fireworks-temperature').textContent = challenge.temperature + '°C';
    const fill = find('#fireworks-thermometer-fill'), height = 18 + challenge.temperature * .85;
    fill.setAttribute('y', String(62 - height)); fill.setAttribute('height', String(height));
    find('#fireworks-thermometer').setAttribute('aria-label', '現場氣溫 ' + challenge.temperature + ' 攝氏度');
    renderer.prepare(challenge.seed);
    answer.value = '';
  }

  function interrupt() {
    if (state !== 'preparing' && state !== 'observing') {
      cancelAnimationFrame(frame); frame = 0; audio.stop(); renderer.draw(-1);
      if (root.dataset.audio === 'playing') root.dataset.audio = 'stopped';
      return;
    }
    resetObservation();
    status.textContent = '觀察已中斷，請重新觀察同一發煙火。';
  }

  function drawFrame() {
    if (startAt === null) {
      // 先顯示亮光，再依同一輸出時鐘預約爆炸聲；音檔本身沒有等待空白。
      startAt = audio.now();
      audio.playAt(startAt + challenge.delay);
      setState('observing');
      root.dataset.audio = 'scheduled'; lightEvent.dataset.reached = 'true';
      caption.textContent = '煙火亮起了，留意聲音何時到達';
      recordLabel.textContent = '正在等待爆炸聲';
    }
    const elapsed = Math.max(0, audio.now() - startAt);
    root.dataset.elapsed = elapsed.toFixed(4);
    renderer.draw(elapsed);
    if (!arrived) {
      const shown = Math.min(challenge.delay, elapsed);
      timer.textContent = shown.toFixed(2); record.textContent = shown.toFixed(2);
      const percent = Math.min(100, elapsed / challenge.delay * 100);
      progress.style.setProperty('--progress', percent.toFixed(2) + '%');
      progress.setAttribute('aria-valuenow', String(Math.round(percent)));
      if (elapsed >= challenge.delay) {
        arrived = true; setState('complete');
        root.dataset.audio = 'playing'; root.dataset.delay = challenge.delay.toFixed(2);
        soundEvent.dataset.reached = 'true';
        timer.textContent = challenge.delay.toFixed(2); record.textContent = challenge.delay.toFixed(2);
        recordLabel.textContent = '亮光與聲音的時間差';
        caption.textContent = '聽到爆炸聲了';
        status.textContent = '已記下時間差，現在可以估算距離；再觀察一次會重播同一題。';
      }
    }
    if (elapsed < Math.max(FIREWORK_DURATION, challenge.delay + audio.buffer.duration)) {
      frame = requestAnimationFrame(drawFrame);
    } else {
      frame = 0; renderer.draw(-1); root.dataset.audio = 'ended';
    }
  }

  async function startObservation() {
    resetObservation();
    const activeRequest = request;
    setState('preparing');
    try {
      await Promise.all([audio.prepare(), picture.decode()]);
      if (activeRequest !== request) return;
      if (document.hidden) { interrupt(); return; }
      audio.context.onstatechange = () => {
        if (audio.context.state !== 'running' && (state === 'observing' || state === 'preparing')) interrupt();
      };
      frame = requestAnimationFrame(drawFrame);
    } catch {
      if (activeRequest !== request) return;
      resetObservation();
      status.dataset.error = 'true';
      status.textContent = '煙火或音效暫時無法載入，請點「觀察煙火」再試一次。';
    }
  }

  observe.addEventListener('click', startObservation);
  challengeButton.addEventListener('click', newChallenge);
  answer.addEventListener('input', clearFeedback);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state !== 'complete') return;
    const result = checkEstimate(answer.value.trim() ? Number(answer.value) : NaN, challenge);
    feedback.hidden = false; feedback.dataset.state = result;
    if (result === 'invalid') {
      answer.setAttribute('aria-invalid', 'true');
      feedback.textContent = '請輸入大於 0 的距離，以公尺作答。'; answer.focus();
    } else if (result === 'incorrect') {
      answer.setAttribute('aria-invalid', 'true');
      feedback.textContent = '再確認一次：先將氣溫代入聲速公式，再把算出的聲速乘以時間差，結果是公尺。';
    } else {
      answer.removeAttribute('aria-invalid');
      feedback.textContent = '估算正確！煙火距離約 ' + format(challenge.distance) + ' 公尺，約 '
        + (challenge.distance / 1000).toFixed(2) + ' 公里。這是爆炸點到觀察位置的直線距離。';
    }
  });
  stopOnLeave(root, interrupt);
  newChallenge();
}
