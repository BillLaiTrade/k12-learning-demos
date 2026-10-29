const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

test('fireworks model: weather, random delay, displayed arithmetic and estimates', async () => {
  const url = pathToFileURL(path.resolve(__dirname, '../units/3/parts/3.2/assets/fireworks-model.mjs'));
  const { createChallenge, referenceSpeed, checkEstimate, seededRandom } = await import(url.href);
  const random = seededRandom(34789), temperatures = new Set(), delays = new Set();
  let previous = null;
  for (let index = 0; index < 2000; index++) {
    const q = createChallenge({ random, previous });
    assert.ok([0, 10, 20, 30].includes(q.temperature));
    assert.equal(q.speed, referenceSpeed(q.temperature));
    assert.ok(q.delay >= 2 && q.delay <= 6);
    assert.equal(q.delay, Number(q.delay.toFixed(2)));
    assert.equal(q.distance, Math.round(q.speed * q.delay * 100) / 100);
    assert.equal(checkEstimate(Math.round(q.distance), q), 'correct');
    assert.equal(checkEstimate(q.distance * .5, q), 'incorrect');
    if (previous) assert.notDeepEqual([q.temperature, q.delay], [previous.temperature, previous.delay]);
    temperatures.add(q.temperature); delays.add(q.delay); previous = q;
  }
  assert.equal(temperatures.size, 4); assert.ok(delays.size > 350);
  assert.equal(referenceSpeed(20), 343);
  const fixed = createChallenge({ random: () => .25 });
  assert.equal(fixed.delay, 3); assert.equal(fixed.temperature, 10); assert.equal(fixed.distance, 1011);
  assert.equal(createChallenge({ random: () => .25, previous: fixed }).delay, 3.01);
  assert.equal(createChallenge({ random: () => 0 }).delay, 2);
  assert.equal(createChallenge({ random: () => 1 }).delay, 6);
  for (const value of [0, -1, NaN, Infinity, undefined, '1011']) assert.equal(checkEstimate(value, fixed), 'invalid');
});

test('fireworks quiz: real audio clock, observation, replay, answers and reset', { timeout: 90000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Server did not start')), 5000);
    server.stdout.on('data', bytes => {
      output += bytes;
      const match = output.match(/port (\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    server.once('error', reject);
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });
  await page.addInitScript(() => {
    Math.random = () => .25;
    window.fwSignals = []; window.fwStates = [];
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function (...args) {
      const source = create.apply(this, args), context = this;
      const connect = source.connect.bind(source), start = source.start.bind(source), stop = source.stop.bind(source);
      let reading = null;
      source.connect = function (destination, ...rest) {
        if (source.buffer?.duration > 3.19 && source.buffer.duration < 3.21 && destination === context.destination) {
          const analyser = context.createAnalyser(); analyser.fftSize = 512;
          connect(analyser); analyser.connect(destination);
          reading = { context, analyser, when: null, peak: 0, firstSignal: null, stopped: false };
          window.fwSignals.push(reading);
          return destination;
        }
        return connect(destination, ...rest);
      };
      source.start = function (when, ...rest) {
        if (reading) {
          reading.when = when; reading.calledAt = performance.now();
          const values = new Float32Array(512);
          function sample() {
            if (reading.stopped) return;
            reading.analyser.getFloatTimeDomainData(values);
            const peak = Math.max(...values.map(Math.abs));
            reading.peak = Math.max(reading.peak, peak);
            if (peak > .005 && reading.firstSignal === null) reading.firstSignal = performance.now();
            if (context.currentTime < when + 3.3) requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
        }
        return start(when, ...rest);
      };
      source.stop = function (...rest) {
        if (reading) reading.stopped = true;
        return stop(...rest);
      };
      return source;
    };
    document.addEventListener('DOMContentLoaded', () => {
      const root = document.querySelector('#unit-quiz');
      new MutationObserver(() => {
        if (window.fwStates.at(-1)?.state !== root.dataset.state) {
          window.fwStates.push({ state: root.dataset.state, at: performance.now() });
        }
      }).observe(root, { attributes: true, attributeFilter: ['data-state'] });
    });
  });
  const base = 'http://127.0.0.1:' + port + '/units/3/parts/3.2/';
  await page.goto(base + '#unit-quiz', { waitUntil: 'networkidle' });
  const root = page.locator('#unit-quiz');
  const data = () => root.evaluate(element => ({ ...element.dataset }));

  await t.test('initial scene matches the compact mockup and has no autoplay or old questions', async () => {
    assert.equal((await data()).state, 'ready');
    assert.equal(await page.locator('#quiz-title').textContent(), '煙火離你多遠？');
    assert.equal(await page.locator('#fireworks-temperature').textContent(), '10°C');
    assert.equal(await page.locator('#fireworks-speed').count(), 0);
    assert.equal(await page.locator('#fireworks-timer').textContent(), '—');
    assert.equal(await page.locator('#fireworks-check').isDisabled(), true);
    assert.equal(await page.locator('#fireworks-answer').isDisabled(), true);
    assert.equal(await page.locator('#unit-quiz .quiz-question, #quiz-check, #quiz-reset').count(), 0);
    assert.equal(await page.evaluate(() => window.fwSignals.length), 0);
    assert.equal(await page.locator('.lesson-card').count(), 5);
    assert.ok((await page.locator('#fireworks-hint-calculation').textContent()).length > 0);
  });

  await t.test('real firework recording has prompt onset and audible, unclipped signal', async () => {
    const signal = await page.evaluate(async () => {
      const context = new OfflineAudioContext(2, 128, 48000);
      const bytes = await (await fetch('assets/firework-burst.wav?v=2')).arrayBuffer();
      const buffer = await context.decodeAudioData(bytes);
      let sum = 0, peak = 0, onset = 0, count = 0, crackleSum = 0, crackleCount = 0;
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const samples = buffer.getChannelData(channel);
        for (let i = 0; i < samples.length; i++) {
          const sample = samples[i]; sum += sample * sample; count++;
          peak = Math.max(peak, Math.abs(sample));
          if (i < buffer.sampleRate * .02) onset = Math.max(onset, Math.abs(sample));
          if (i >= buffer.sampleRate * .7 && i < buffer.sampleRate * 1.25) {
            crackleSum += sample * sample; crackleCount++;
          }
        }
      }
      return { duration: buffer.duration, rms: Math.sqrt(sum / count), peak, onset,
        crackleRms: Math.sqrt(crackleSum / crackleCount) };
    });
    assert.equal(signal.duration, 3.2);
    assert.ok(signal.rms > .025 && signal.peak > .3 && signal.peak < .96, JSON.stringify(signal));
    assert.ok(signal.onset > .1, 'the delayed audio must not contain more leading silence');
    assert.ok(signal.crackleRms > .04, 'real firework crackles must remain audible after the initial boom');
    t.diagnostic('decoded sound ' + JSON.stringify(signal));
  });

  await t.test('three displayed seconds take three real seconds and the audio waits for the arrival', async () => {
    await page.locator('#fireworks-observe').click();
    await page.waitForFunction(() => document.querySelector('#unit-quiz').dataset.state === 'observing');
    await page.waitForTimeout(1000);
    assert.equal((await data()).state, 'observing');
    assert.equal(await page.locator('#fireworks-sound').getAttribute('data-reached'), 'false');
    assert.equal(await page.locator('#fireworks-check').isDisabled(), true);
    assert.ok(Number(await page.locator('#fireworks-timer').textContent()) >= .9);
    assert.equal(await page.evaluate(() => window.fwSignals[0].firstSignal), null);
    const pixels = await page.locator('#unit-quiz canvas').evaluate(canvas => {
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let lit = 0; for (let i = 3; i < data.length; i += 4) if (data[i] > 40) lit++;
      return lit;
    });
    assert.ok(pixels > 1500, 'a substantial luminous burst and trails must be rendered');
    await page.waitForFunction(() => document.querySelector('#unit-quiz').dataset.state === 'complete');
    await page.waitForFunction(() => window.fwSignals[0].firstSignal !== null);
    const times = await page.evaluate(() => {
      const start = window.fwStates.find(record => record.state === 'observing').at;
      const finish = window.fwStates.find(record => record.state === 'complete').at;
      const audio = window.fwSignals[0];
      return { elapsed: (finish - start) / 1000, signalDelay: (audio.firstSignal - start) / 1000,
        peak: audio.peak, latency: audio.context.outputLatency || audio.context.baseLatency || 0 };
    });
    assert.ok(Math.abs(times.elapsed - 3) < .18, JSON.stringify(times));
    assert.ok(Math.abs(times.signalDelay + times.latency - 3) < .18, JSON.stringify(times));
    assert.ok(times.peak > .1);
    assert.equal(await page.locator('#fireworks-timer').textContent(), '3.00');
    assert.equal(await page.locator('#fireworks-delay').textContent(), '3.00');
    assert.equal(await page.locator('#fireworks-sound').getAttribute('data-reached'), 'true');
    assert.equal(await page.locator('#fireworks-check').isEnabled(), true);
    t.diagnostic('wall clock and audio ' + JSON.stringify(times));
  });

  await t.test('answer, rounding, keyboard, hint and feedback follow the displayed numbers', async () => {
    const answer = page.locator('#fireworks-answer'), submit = page.locator('#fireworks-check');
    await submit.click();
    assert.equal(await page.locator('#fireworks-feedback').getAttribute('data-state'), 'invalid');
    await answer.fill('-1'); await submit.click();
    assert.equal(await answer.getAttribute('aria-invalid'), 'true');
    await answer.fill('1'); await submit.click();
    assert.equal(await page.locator('#fireworks-feedback').getAttribute('data-state'), 'incorrect');
    await page.locator('#fireworks-hint summary').click();
    assert.match(await page.locator('#fireworks-hint-calculation').textContent(), /代入聲速公式.*3\.00/);
    await answer.fill('1011'); await answer.press('Enter');
    assert.equal(await page.locator('#fireworks-feedback').getAttribute('data-state'), 'correct');
    assert.match(await page.locator('#fireworks-feedback').textContent(), /1,011.*1\.01/);
    await answer.fill('1012'); assert.equal(await page.locator('#fireworks-feedback').isHidden(), true);
    await submit.click(); assert.equal(await page.locator('#fireworks-feedback').getAttribute('data-state'), 'correct');
  });

  await t.test('replay preserves the question, while a new challenge cancels pending sound and resets answers', async () => {
    const previous = await data();
    await page.locator('#fireworks-observe').click();
    await page.waitForFunction(() => document.querySelector('#unit-quiz').dataset.state === 'observing');
    assert.equal((await data()).temperature, previous.temperature);
    assert.equal(await page.locator('#fireworks-answer').inputValue(), '1012');
    assert.equal(await page.evaluate(() => window.fwSignals[1].when - window.fwSignals[0].when > 0), true);
    await page.locator('#fireworks-new').click();
    assert.equal((await data()).state, 'ready');
    assert.equal(await page.locator('#fireworks-answer').inputValue(), '');
    assert.equal(await page.locator('#fireworks-timer').textContent(), '—');
    assert.equal(await page.locator('#fireworks-hint').getAttribute('open'), null);
    assert.equal(await page.evaluate(() => window.fwSignals[1].stopped), true);
    await page.locator('#fireworks-observe').focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#unit-quiz').dataset.state === 'complete');
    assert.equal((await data()).delay, '3.01');
  });

  await t.test('background interruption stops the scheduled sound and leaves a replayable question', async () => {
    await page.locator('#fireworks-observe').click();
    await page.waitForFunction(() => document.querySelector('#unit-quiz').dataset.state === 'observing');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange')); delete document.hidden;
    });
    assert.equal((await data()).state, 'ready');
    assert.equal(await page.evaluate(() => window.fwSignals.at(-1).stopped), true);
    assert.match(await page.locator('#fireworks-status').textContent(), /中斷/);
  });

  await t.test('firework depth, fragments, falling trails and clearing are deterministic', async () => {
    const visual = await page.evaluate(async () => {
      const { FireworkRenderer, FIREWORK_DURATION } = await import('./assets/fireworks-renderer.mjs?v=2');
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:fixed;width:518px;height:324px;left:0;top:0';
      document.body.append(canvas);
      const renderer = new FireworkRenderer(canvas); renderer.prepare(34789);
      const pixels = time => {
        renderer.draw(time);
        const bytes = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let lit = 0, near = 0, hash = 2166136261;
        for (let i = 3; i < bytes.length; i += 4) {
          hash = Math.imul(hash ^ bytes[i], 16777619);
          if (bytes[i] > 30) { lit++; if (i / 4 / canvas.width > canvas.height * .81) near++; }
        }
        return { lit, near, hash: hash >>> 0 };
      };
      const before = pixels(-1), burst = pixels(.85), scatter = pixels(1.35), fallen = pixels(2.4);
      const replay = pixels(.85), after = pixels(FIREWORK_DURATION + .1);
      const parent = renderer.stars[0], first = renderer.position(parent, 0), later = renderer.position(parent, 1.5);
      const result = { before, burst, scatter, fallen, replay, after,
        velocityCount: new Set(renderer.stars.map(s => s.vx.toFixed(3))).size,
        lifeCount: new Set(renderer.stars.map(s => s.life.toFixed(1))).size,
        fragments: renderer.fragments.length, moved: Math.hypot(first.x - later.x, first.y - later.y) };
      renderer.resizeObserver.disconnect(); canvas.remove(); return result;
    });
    assert.equal(visual.before.lit, 0); assert.equal(visual.after.lit, 0);
    assert.ok(visual.burst.lit > 1000);
    assert.equal(visual.burst.hash, visual.replay.hash);
    assert.notEqual(visual.burst.hash, visual.scatter.hash);
    assert.notEqual(visual.scatter.hash, visual.fallen.hash);
    assert.equal(visual.scatter.near, 0, 'distant firework stars must not fall onto the foreground railing');
    assert.ok(visual.velocityCount > 90 && visual.lifeCount > 10 && visual.fragments > 100 && visual.moved > 10);
  });

  await t.test('desktop and laptop layout stays readable without horizontal overflow', async () => {
    for (const width of [1440, 1280, 1024]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const columns = await page.locator('.fireworks-body').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
      assert.equal(columns, 2);
    }
  });

  await t.test('minimum and maximum random delays also use real elapsed time', async () => {
    for (const [random, expected] of [[0, 2], [1, 6]]) {
      const boundary = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      await boundary.addInitScript(value => { Math.random = () => value; }, random);
      await boundary.goto(base + '#unit-quiz', { waitUntil: 'networkidle' });
      await boundary.evaluate(() => {
        window.observationTimes = {};
        const element = document.querySelector('#unit-quiz');
        new MutationObserver(() => {
          if (element.dataset.state === 'observing') window.observationTimes.start = performance.now();
          if (element.dataset.state === 'complete') window.observationTimes.end = performance.now();
        }).observe(element, { attributes: true, attributeFilter: ['data-state'] });
      });
      await boundary.locator('#fireworks-observe').click();
      await boundary.waitForFunction(() => document.querySelector('#unit-quiz').dataset.state === 'complete');
      const elapsed = await boundary.evaluate(() => (window.observationTimes.end - window.observationTimes.start) / 1000);
      assert.equal(await boundary.locator('#fireworks-delay').textContent(), expected.toFixed(2));
      assert.ok(Math.abs(elapsed - expected) < .18, 'expected ' + expected + ', observed ' + elapsed);
      t.diagnostic('boundary delay ' + expected + ' seconds: observed ' + elapsed);
      await boundary.close();
    }
  });

  await t.test('failed audio load provides a retry and never reports an observation as completed', async () => {
    const failed = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await failed.route('**/firework-burst.wav*', route => route.abort());
    await failed.goto(base + '#unit-quiz', { waitUntil: 'networkidle' });
    await failed.locator('#fireworks-observe').click();
    await failed.waitForFunction(() => document.querySelector('#fireworks-status').dataset.error === 'true');
    assert.equal(await failed.locator('#unit-quiz').getAttribute('data-state'), 'ready');
    assert.equal(await failed.locator('#fireworks-check').isDisabled(), true);
    assert.equal(await failed.locator('#fireworks-observe').isEnabled(), true);
    assert.equal(await failed.locator('#fireworks-sound').getAttribute('data-reached'), 'false');
    await failed.unroute('**/firework-burst.wav*');
    await failed.locator('#fireworks-observe').click();
    await failed.waitForFunction(() => document.querySelector('#unit-quiz').dataset.state === 'observing');
    assert.equal(await failed.locator('#fireworks-status').getAttribute('data-error'), null);
    await failed.locator('#fireworks-new').click();
    assert.equal(await failed.locator('#unit-quiz').getAttribute('data-state'), 'ready');
    await failed.close();
  });
  assert.deepEqual(errors, []);
});
