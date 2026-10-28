const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

test('vacuum jar: manipulate air while the bell keeps working', { timeout: 60000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server did not start')), 5000);
    server.stdout.on('data', b => { const m = String(b).match(/port (\d+)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
    server.once('error', reject);
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => errors.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) errors.push(r.url()); });
  await page.addInitScript(() => {
    const original = AudioContext.prototype.createGain;
    AudioContext.prototype.createGain = function (...args) {
      const node = original.apply(this, args); window.testGain = node; window.testContext = this; return node;
    };
  });
  await page.clock.install();
  const url = `http://127.0.0.1:${port}/units/2/parts/2.2/`;
  await page.goto(url, { waitUntil: 'networkidle' });
  const lab = page.locator('#vacuum-lab');
  const data = () => lab.evaluate(n => ({ ...n.dataset }));
  const power = page.locator('#vacuum-power');
  const pump = page.locator('#vacuum-extract');
  const inlet = page.locator('#vacuum-admit');
  const air = async () => Number((await data()).air);
  const hammer = () => page.locator('#vacuum-hammer').getAttribute('transform');
  const waitAudio = () => page.waitForFunction(() => document.querySelector('#vacuum-lab').dataset.audio === 'playing');
  const realWait = ms => new Promise(r => setTimeout(r, ms));
  let fullDb = null, lowDb = null;
  const meter = async () => {
    await realWait(650); await page.clock.runFor(100);
    const value = await page.locator('#vacuum-db-value').getAttribute('data-value');
    assert.notEqual(value, null, 'meter must receive actual audio samples');
    return Number(value);
  };
  const visibleParticles = () => page.locator('#vacuum-particles circle').evaluateAll(nodes => nodes.filter(n => Number(n.getAttribute('opacity')) > .2).map(n => ({ x: Number(n.getAttribute('cx')), y: Number(n.getAttribute('cy')) })));
  const uniform = particles => {
    assert.ok(particles.some(p => p.y < 310) && particles.some(p => p.y > 500), 'remaining air must occupy top and bottom of the jar');
    assert.ok(particles.some(p => p.x < 450) && particles.some(p => p.x > 610), 'remaining air must occupy both sides');
  };

  await t.test('full jar begins silent with no autoplay and a valid sustained recording', async () => {
    assert.equal(await air(), 1); assert.equal((await data()).power, 'off');
    assert.equal(await page.locator('.vacuum-evidence, .vacuum-bars, .vacuum-power-light').count(), 0);
    assert.equal(await page.locator('#vacuum-db-value').textContent(), '—');
    assert.equal(await page.locator('#vacuum-audio').evaluate(a => a.paused && a.volume === 1 && a.loop), true);
    assert.equal(await inlet.isDisabled(), true);
    assert.equal(await page.locator('#card-03 input[type="range"]').count(), 0);
    const original = await hammer(); await page.clock.runFor(500); assert.equal(await hammer(), original);
    const signal = await page.locator('#vacuum-audio').evaluate(async audio => {
      const context = new OfflineAudioContext(2, 128, 48000);
      const b = await context.decodeAudioData(await (await fetch(audio.currentSrc || audio.src)).arrayBuffer());
      let sum = 0, count = 0, peak = 0;
      for (let c = 0; c < b.numberOfChannels; c++) for (const v of b.getChannelData(c)) { sum += v * v; count++; peak = Math.max(peak, Math.abs(v)); }
      return { duration: b.duration, rms: Math.sqrt(sum / count), peak };
    });
    assert.ok(signal.duration > 2.8 && signal.duration < 3);
    assert.ok(signal.rms > .05 && signal.peak > .2 && signal.peak < .95);
    assert.equal((await visibleParticles()).length, 84); uniform(await visibleParticles());
  });

  await t.test('power starts actual audio and a visible hammer without changing the air', async () => {
    await power.click(); await waitAudio(); await page.clock.runFor(80);
    const a = await hammer(); await page.clock.runFor(70); assert.notEqual(await hammer(), a);
    assert.equal(await air(), 1); assert.equal((await data()).power, 'on');
    assert.equal(await page.evaluate(() => window.testContext.state), 'running');
    assert.ok(await page.evaluate(() => window.testGain.gain.value) > .95);
    const before = await page.locator('#vacuum-audio').evaluate(a => a.currentTime);
    await realWait(180); assert.ok(await page.locator('#vacuum-audio').evaluate(a => a.currentTime) > before);
    fullDb = await meter(); assert.ok(fullDb > 64 && fullDb < 77);
    await page.locator('#vacuum-audio').evaluate(a => { window.playEvents = 0; a.addEventListener('play', () => window.playEvents++); });
  });

  await t.test('pump picture and button share controls; stop preserves pressure while the source keeps moving', async () => {
    await page.locator('#vacuum-pump').click(); await page.clock.runFor(2900);
    assert.equal((await data()).mode, 'pump'); assert.ok(await air() > .45 && await air() < .56);
    assert.equal(await pump.getAttribute('aria-pressed'), 'true');
    assert.equal((await data()).power, 'on');
    uniform(await visibleParticles()); assert.ok((await visibleParticles()).length < 55);
    await pump.click(); const stopped = await air(), gauge = await page.locator('#vacuum-needle').getAttribute('transform');
    const a = await hammer(); await page.clock.runFor(137);
    assert.notEqual(await hammer(), a); await page.clock.runFor(1000);
    assert.equal(await air(), stopped); assert.equal(await page.locator('#vacuum-needle').getAttribute('transform'), gauge);
    assert.equal(await page.locator('#vacuum-audio').evaluate(a => a.paused), false);
    await realWait(250); assert.ok(await page.evaluate(() => window.testGain.gain.value) < .5);
    assert.ok(await meter() < fullDb - 5, 'partial evacuation must lower the displayed measured audio level');
  });

  await t.test('near vacuum attenuates the real audio, retains source motion and bounds the controls', async () => {
    await pump.click(); await page.clock.runFor(6000);
    assert.ok(Math.abs(await air() - .02) < .00001); assert.equal((await data()).mode, 'idle');
    assert.equal(await pump.isDisabled(), true); assert.equal(await page.locator('#vacuum-pump').isDisabled(), true);
    assert.equal(await page.locator('#vacuum-air-label').textContent(), '接近真空');
    assert.equal((await data()).power, 'on');
    uniform(await visibleParticles()); assert.ok((await visibleParticles()).length <= 6);
    const a = await hammer(); await page.clock.runFor(107); assert.notEqual(await hammer(), a);
    await realWait(250);
    assert.ok(await page.evaluate(() => window.testGain.gain.value) < .04, 'actual audio gain must drop, not just the label');
    assert.equal(await page.locator('#vacuum-audio').evaluate(a => a.volume === 1 && !a.paused), true);
    await page.clock.runFor(1000); assert.equal(await air(), .02);
    lowDb = await meter();
    const expectedDrop = -20 * Math.log10(await page.evaluate(() => window.testGain.gain.value));
    assert.ok(Math.abs(fullDb - lowDb - expectedDrop) < 5, 'readout must reflect post-gain RMS in decibels');
    assert.ok(lowDb > 25 && lowDb < 43);
  });

  await t.test('inlet picture restores air and audio; changing direction cancels the previous action', async () => {
    await page.locator('#vacuum-valve').click(); await page.clock.runFor(1800);
    assert.equal((await data()).mode, 'inlet'); const rising = await air(); assert.ok(rising > .4 && rising < .5);
    await pump.click(); await page.clock.runFor(500); assert.equal((await data()).mode, 'pump'); assert.ok(await air() < rising);
    await inlet.click(); await page.clock.runFor(5000);
    assert.equal(await air(), 1); assert.equal((await data()).mode, 'idle');
    assert.equal(await inlet.isDisabled(), true); assert.equal(await page.locator('#vacuum-valve').isDisabled(), true);
    assert.equal((await visibleParticles()).length, 84);
    assert.ok(await meter() > lowDb + 25, 'admitting air must restore the measured sound level');
    await realWait(250); assert.ok(await page.evaluate(() => window.testGain.gain.value) > .95);
    assert.equal(await page.evaluate(() => window.playEvents), 0, 'pumping must not restart or repitch the sound');
  });

  await t.test('meter observes the audio signal independently of the air state and clears on silence', async () => {
    assert.equal(await air(), 1); assert.equal((await data()).power, 'on');
    await page.locator('#vacuum-audio').evaluate(a => a.pause());
    await realWait(350); await page.clock.runFor(100);
    assert.equal(await page.locator('#vacuum-db-value').textContent(), '—', 'silent input must not keep a fabricated 70 dB reading');
    assert.equal(await page.locator('#vacuum-db-value').getAttribute('data-value'), null);
    assert.equal(await air(), 1); assert.equal((await data()).power, 'on');
    await page.locator('#vacuum-audio').evaluate(a => a.play());
    assert.ok(await meter() > 64);
    await power.click();
    assert.equal(await page.locator('#vacuum-db-value').textContent(), '—');
    assert.equal(await page.locator('#vacuum-db-bar').evaluate(n => n.style.width), '0%');
    await power.click(); await waitAudio();
  });

  await t.test('switch, keyboard and rapid toggles stop audio and preserve the chosen air amount', async () => {
    await power.click(); assert.equal(await page.locator('#vacuum-audio').evaluate(a => a.paused), true);
    await pump.focus(); await page.keyboard.press('Space'); await page.clock.runFor(2000);
    await page.keyboard.press('Space'); const amount = await air(); assert.ok(amount > .6 && amount < .75);
    await page.clock.runFor(1000); assert.equal(await air(), amount);
    await power.focus(); await page.keyboard.press('Enter'); await waitAudio();
    assert.equal(await air(), amount);
    await power.click(); await power.click(); await power.click(); await realWait(100);
    assert.equal((await data()).power, 'off'); assert.equal((await data()).audio, 'off');
    assert.equal(await page.locator('#vacuum-audio').evaluate(a => a.paused && a.currentTime === 0), true);
    const off = await hammer(); await page.clock.runFor(500); assert.equal(await hammer(), off);
  });

  await t.test('leaving the experiment stops ringing and pumping without resetting air or autoplaying on return', async () => {
    await power.click(); await waitAudio(); await pump.click(); await page.clock.runFor(700);
    await page.locator('#card-01').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('#vacuum-lab').dataset.power === 'off');
    assert.equal((await data()).mode, 'idle');
    assert.equal(await page.locator('#vacuum-audio').evaluate(a => a.paused && a.currentTime === 0), true);
    const saved = await air();
    await power.scrollIntoViewIfNeeded(); await page.clock.runFor(1000);
    assert.equal(await air(), saved); assert.equal((await data()).power, 'off');
  });

  await t.test('touch targets, full apparatus, qualitative readings and layout work at narrow widths', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    const mobile = await context.newPage(); await mobile.clock.install();
    await mobile.goto(url, { waitUntil: 'networkidle' });
    assert.equal(await mobile.locator('#vacuum-audio').evaluate(a => a.paused), true);
    await mobile.locator('#vacuum-power').tap();
    await mobile.waitForFunction(() => document.querySelector('#vacuum-lab').dataset.audio === 'playing');
    await mobile.locator('#vacuum-pump').tap(); await mobile.clock.runFor(3300);
    assert.ok(Number(await mobile.locator('#vacuum-lab').getAttribute('data-air')) < .55);
    await mobile.locator('#vacuum-valve').tap(); await mobile.clock.runFor(5000);
    assert.equal(await mobile.locator('#vacuum-lab').getAttribute('data-air'), '1.00000');
    await mobile.waitForFunction(() => document.querySelector('#vacuum-db-value').hasAttribute('data-value'), null, { polling: 50 });
    for (const width of [320, 390, 768, 1024]) {
      await mobile.setViewportSize({ width, height: 844 });
      assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      for (const id of ['vacuum-power', 'vacuum-extract', 'vacuum-admit', 'vacuum-pump', 'vacuum-valve']) {
        const b = await mobile.locator('#' + id).boundingBox(); assert.ok(b.width >= 44 && b.height >= 44);
      }
      assert.equal(await mobile.locator('.vacuum-photo').evaluate(n => Math.abs(n.getBoundingClientRect().width / n.getBoundingClientRect().height - n.naturalWidth / n.naturalHeight) < .01), true, 'the dome must not be cropped');
      const meterBox = await mobile.locator('.vacuum-spl-meter').boundingBox();
      const photoBox = await mobile.locator('.vacuum-photo').boundingBox();
      assert.ok(meterBox.x > photoBox.x + photoBox.width * .42 && meterBox.x + meterBox.width <= photoBox.x + photoBox.width);
      assert.equal(await mobile.locator('.vacuum-meter-screen').evaluate(n => n.scrollWidth <= n.clientWidth && n.scrollHeight <= n.clientHeight), true, 'LCD readout must fit its screen');
      assert.equal(await mobile.locator('#vacuum-air-label').evaluate(n => n.scrollWidth <= n.clientWidth), true, 'air label must fit');
    }
    await mobile.locator('#vacuum-power').tap(); assert.equal(await mobile.locator('#vacuum-audio').evaluate(a => a.paused), true);
    await context.close();
  });
  assert.deepEqual(errors, []);
});
