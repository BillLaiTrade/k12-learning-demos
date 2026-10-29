const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

test('3.2 sound travels through air while particles stay near their origins', { timeout: 90000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server did not start')), 5000);
    server.stdout.on('data', chunk => { const match = String(chunk).match(/port (\d+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
    server.once('error', reject);
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => errors.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) errors.push(r.url()); });
  const observePlayback = () => {
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function (...args) {
      const source = create.apply(this, args), context = this;
      const start = source.start.bind(source), stop = source.stop.bind(source);
      let playback;
      source.start = (when, offset = 0) => {
        if (source.buffer?.duration === 6) {
          playback = { context, source, when, offset, stopped: false };
          window.bellPlayback = playback;
        }
        return start(when, offset);
      };
      source.stop = (...args) => { if (playback) playback.stopped = true; return stop(...args); };
      return source;
    };
  };
  await page.addInitScript(observePlayback);
  const url = `http://127.0.0.1:${port}/units/3/parts/3.2/`;
  await page.goto(url, { waitUntil: 'networkidle' });
  const strike = page.locator('#air-strike');
  const scene = page.locator('#air-wave');
  const positions = () => page.locator('#air-particles circle').evaluateAll(nodes => nodes.map(n => Number(n.getAttribute('cx'))));
  const state = () => scene.getAttribute('data-state');
  const elapsed = async () => Number(await scene.getAttribute('data-elapsed'));
  const drum = () => page.locator('#sound-eardrum').getAttribute('transform');
  const still = await positions(), silentDrum = await drum();

  const waitForBell = () => page.waitForFunction(() => {
    const playback = window.bellPlayback;
    return playback && !playback.stopped && playback.context.currentTime >= playback.when + .06;
  });
  await t.test('actual bell recording is audible with headroom and no autoplay or volume slider', async () => {
    const signal = await page.locator('#bell-audio').evaluate(async audio => {
      const context = new OfflineAudioContext(2, 128, 48000);
      const buffer = await context.decodeAudioData(await (await fetch(audio.currentSrc || audio.src)).arrayBuffer());
      let energy = 0, peak = 0, count = 0;
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) for (const sample of buffer.getChannelData(ch)) {
        energy += sample * sample; peak = Math.max(peak, Math.abs(sample)); count++;
      }
      return { rms: Math.sqrt(energy / count), peak, duration: buffer.duration, volume: audio.volume, paused: audio.paused, muted: audio.muted };
    });
    assert.ok(signal.rms > .025);
    assert.ok(signal.peak > .2 && signal.peak < .95);
    assert.ok(signal.duration > 5.5 && signal.duration < 6.5);
    assert.equal(signal.volume, 1); assert.equal(signal.paused, true); assert.equal(signal.muted, false);
    assert.equal(await page.locator('#card-02 input[type="range"]').count(), 0);
  });

  await t.test('starts at rest and the disturbance reaches nearby particles before distant ones', async () => {
    assert.equal(await state(), 'ready');
    await page.waitForTimeout(1000);
    assert.deepEqual(await positions(), still);
    await strike.click(); await page.waitForTimeout(500);
    const current = await positions();
    assert.notEqual(current[0], still[0]);
    assert.equal(current[21], still[21]);
    assert.equal(current[42], still[42]);
    assert.equal(await drum(), silentDrum);
    await page.waitForTimeout(1000);
    assert.notEqual((await positions())[21], still[21]);
    assert.equal((await positions())[42], still[42]);
    assert.equal(await drum(), silentDrum);
  });

  await t.test('direct bell and button strikes restart one animation without stacking', async () => {
    assert.equal(await page.locator('#air-play, #air-replay').count(), 0);
    assert.equal(await page.locator('.sound-controls button').count(), 1);
    assert.equal(await strike.textContent(), '敲擊鐘');
    for (const target of [page.locator('#sound-bell'), strike, page.locator('#sound-bell')]) {
      await target.click();
      await page.waitForFunction(() => document.querySelector('#air-wave').dataset.state === 'playing');
      await page.waitForTimeout(100);
      assert.ok(await page.evaluate(() => window.bellPlayback.offset === 0 && window.bellPlayback.when - window.bellPlayback.context.currentTime > 1.7));
      assert.equal(await state(), 'playing');
      assert.ok(await elapsed() < .15);
      assert.equal((await positions())[42], still[42]);
      assert.equal(await drum(), silentDrum);
    }
    await page.waitForTimeout(1000);
    assert.ok(await elapsed() > 1 && await elapsed() < 1.2, 'rapid strikes must not stack animation frames');
  });

  await t.test('a strike launches compression right while particles oscillate locally', async () => {
    await page.locator('#air-strike').click();
    await page.waitForTimeout(650);
    const a = Number(await page.locator('#sound-dense-label').evaluate(n => n.transform.baseVal.consolidate().matrix.e));
    await page.waitForTimeout(200);
    const b = Number(await page.locator('#sound-dense-label').evaluate(n => n.transform.baseVal.consolidate().matrix.e));
    assert.ok(b > a + 50 && b < a + 80, 'a dense band should advance, rather than remain attached to one particle');
    const seen = [];
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(120);
      const current = await positions();
      current.forEach((x, j) => assert.ok(Math.abs(x - still[j]) <= 22.01, 'no particle may drift with the wave'));
      for (let row = 0; row < 3; row++) for (let col = 1; col < 43; col++) {
        assert.ok(current[row * 43 + col] > current[row * 43 + col - 1], 'particles must retain their order');
      }
      seen.push(current[21] - still[21]);
    }
    assert.ok(Math.min(...seen) < -5 && Math.max(...seen) > 5, 'highlighted particle should return in both directions');
    const row = (await positions()).slice(0, 43);
    const gaps = row.slice(1).map((x, i) => x - row[i]);
    assert.ok(Math.max(...gaps) / Math.min(...gaps) > 1.5, 'dense and sparse regions should remain distinct as the recording decays');
  });

  await t.test('labels follow the same bands and fade once without jumping back or reappearing', async () => {
    await strike.click();
    await page.evaluate(() => {
      window.bandFrames = [];
      const scene = document.querySelector('#air-wave');
      const read = id => {
        const node = document.getElementById(id);
        return { x: node.transform.baseVal.consolidate().matrix.e, opacity: Number(node.getAttribute('opacity')), visible: node.getAttribute('visibility') === 'visible' };
      };
      window.bandObserver = new MutationObserver(() => {
        window.bandFrames.push({
          dense: read('sound-dense-label'), sparse: read('sound-sparse-label'),
          mobileDense: read('sound-mobile-dense'), mobileSparse: read('sound-mobile-sparse')
        });
      });
      window.bandObserver.observe(scene, { subtree: true, attributes: true });
    });
    await page.waitForFunction(() => document.querySelector('#air-wave').dataset.state === 'ended');
    const frames = await page.evaluate(() => { window.bandObserver.disconnect(); return window.bandFrames; });
    assert.ok(frames.length > 100);
    for (const key of ['dense', 'sparse']) {
      let lastX = -Infinity, hasAppeared = false, hasLeft = false, lastOpacity = 1;
      for (const frame of frames) {
        const band = frame[key];
        assert.ok(band.x >= lastX - .001, `${key} must never jump left, including after the old wrap boundaries`);
        lastX = band.x;
        assert.deepEqual(frame[key === 'dense' ? 'mobileDense' : 'mobileSparse'], band, 'mobile labels must share position, fade and visibility');
        if (band.visible) {
          assert.equal(hasLeft, false, 'a label must not reappear on a different band');
          hasAppeared = true;
          assert.ok(band.opacity <= lastOpacity + .0001);
          lastOpacity = band.opacity;
        } else if (hasAppeared) hasLeft = true;
      }
      assert.ok(hasAppeared && hasLeft);
      assert.ok(frames.some(f => f[key].visible && f[key].opacity > 0 && f[key].opacity < 1), 'label should fade gradually before disappearing');
      assert.equal(frames.at(-1)[key].visible, false);
      assert.equal(frames.at(-1)[key].opacity, 0);
    }
    await strike.click(); await page.waitForTimeout(1100);
    for (const id of ['sound-dense-label', 'sound-sparse-label']) {
      assert.equal(await page.locator('#' + id).getAttribute('visibility'), 'visible');
      assert.equal(Number(await page.locator('#' + id).getAttribute('opacity')), 1, 'new strike must reset fading');
    }
  });

  await t.test('ear responds only after arrival; completion and keyboard restart leave no stale animation', async () => {
    await page.locator('#air-strike').click(); await page.waitForTimeout(1750);
    assert.equal(await drum(), silentDrum);
    await page.waitForTimeout(400);
    assert.notEqual(await drum(), silentDrum);
    await page.waitForFunction(() => document.querySelector('#air-wave').dataset.state === 'ended');
    assert.equal(await state(), 'ended');
    assert.deepEqual(await positions(), still);
    assert.equal(await drum(), silentDrum);
    const time = await elapsed();
    await page.waitForTimeout(1000); assert.equal(await elapsed(), time);
    const bell = page.locator('#sound-bell');
    await bell.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    assert.equal(await state(), 'playing'); assert.ok(await elapsed() < .4);
    await page.keyboard.press('Space'); await page.waitForTimeout(100);
    assert.ok(await elapsed() < .2);
    await strike.click();
  });

  await t.test('bell playback advances, restarts from zero, and ends without looping', async () => {
    await strike.click(); await waitForBell();
    const before = await page.evaluate(() => window.bellPlayback.context.currentTime - window.bellPlayback.when);
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.ok(await page.evaluate(() => window.bellPlayback.context.currentTime - window.bellPlayback.when) > before);
    await page.locator('#sound-bell').click();
    await page.waitForFunction(() => document.querySelector('#air-wave').dataset.audio === 'scheduled');
    assert.equal(await page.evaluate(() => window.bellPlayback.offset), 0);
    await page.waitForFunction(() => document.querySelector('#air-wave').dataset.state === 'ended', null, { timeout: 10000 });
    assert.equal(await page.evaluate(() => window.bellPlayback.source.loop), false);
  });

  await t.test('touch controls, enlarged mobile observation, small screens and reduced motion', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    const mobile = await context.newPage();
    await mobile.addInitScript(observePlayback);
    await mobile.goto(url, { waitUntil: 'networkidle' });
    assert.equal(await mobile.locator('#air-wave').getAttribute('data-state'), 'ready');
    assert.ok(await mobile.locator('.sound-mobile-zoom').isVisible());
    await mobile.locator('#sound-bell').tap(); await mobile.waitForTimeout(1500);
    assert.equal(await mobile.locator('#air-wave').getAttribute('data-state'), 'playing');
    await mobile.waitForFunction(() => window.bellPlayback && window.bellPlayback.context.currentTime >= window.bellPlayback.when + .06);
    await mobile.waitForTimeout(90);
    const fading = Number(await mobile.locator('#sound-mobile-dense').getAttribute('opacity'));
    assert.ok(fading > 0 && fading < 1);
    await mobile.waitForTimeout(1000);
    for (const id of ['sound-mobile-dense', 'sound-mobile-sparse']) assert.equal(await mobile.locator('#' + id).getAttribute('visibility'), 'hidden');
    await mobile.locator('#air-strike').tap(); await mobile.waitForTimeout(100);
    assert.ok(Number(await mobile.locator('#air-wave').getAttribute('data-elapsed')) < .2);
    await mobile.waitForFunction(() => window.bellPlayback && window.bellPlayback.context.currentTime >= window.bellPlayback.when + .06);
    for (const width of [390, 320, 768]) {
      await mobile.setViewportSize({ width, height: 844 });
      assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    await context.close();
  });
  assert.deepEqual(errors, []);
});
