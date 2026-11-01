const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');

test('one-wavelength rope starts at equilibrium before a vibration', { timeout: 90000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Server timeout')), 5000);
    server.stdout.on('data', chunk => {
      const m = String(chunk).match(/port (\d+)/);
      if (m) { clearTimeout(timer); resolve(m[1]); }
    });
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(Error(`Server exited ${code}`)); });
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    ...(process.env.CYCLE_WAVE_URL ? { proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY } } : {}) });
  t.after(() => browser.close());
  const url = process.env.CYCLE_WAVE_URL || `http://127.0.0.1:${port}/units/3/parts/3.1/`;
  const samples = page => page.locator('#cycle-wave-path').evaluate(e => {
    const length = e.getTotalLength();
    return { length, color: getComputedStyle(e).stroke,
      points: Array.from({ length: 121 }, (_, i) => { const p = e.getPointAtLength(length * i / 120); return { x: p.x, y: p.y }; }) };
  });
  const flat = async page => {
    const rope = await samples(page);
    assert.ok(Math.abs(rope.length - 510) < .1, 'full rope remains visible');
    assert.equal(rope.color, 'rgb(23, 107, 83)');
    assert.ok(rope.points.every(p => Math.abs(p.y - 170) < .01), 'entire rope rests at equilibrium');
    assert.equal(await page.locator('#cycle-wave-length-annotation').getAttribute('visibility'), 'hidden');
    assert.ok(Math.abs(Number(await page.locator('#cycle-source-marker').getAttribute('cy')) - 170) < .01);
  };

  await t.test('static HTML shows the green equilibrium rope without JavaScript', async () => {
    const page = await browser.newPage({ javaScriptEnabled: false });
    try { await page.goto(url); await flat(page); } finally { await page.close(); }
  });

  for (const touch of [false, true]) await t.test(touch ? 'mobile touch and reduced motion' : 'desktop playback and keyboard replay', async () => {
    const page = await browser.newPage({ viewport: { width: touch ? 390 : 1440, height: 1000 }, hasTouch: touch, reducedMotion: touch ? 'reduce' : 'no-preference' });
    try {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const start = new Date('2026-11-01T00:00:00Z');
      await page.clock.install({ time: start });
      await page.clock.pauseAt(new Date(start.getTime() + 1000));
      await page.goto(url);
      await flat(page);
      const before = await page.locator('#cycle-wave-path').getAttribute('d');
      await page.clock.fastForward(10000);
      assert.equal(await page.locator('#cycle-wave-path').getAttribute('d'), before, 'idle rope does not animate');
      assert.equal(await page.locator('#card-05 .is-active, #card-05 .is-complete').count(), 0);
      if (process.env.CYCLE_CAPTURE_DIR) {
        await fs.mkdir(process.env.CYCLE_CAPTURE_DIR, { recursive: true });
        await page.locator('.cycle-wave-figure').screenshot({ path: path.join(process.env.CYCLE_CAPTURE_DIR, `idle-${touch ? 390 : 1440}.png`) });
      }
      const button = page.locator('#cycle-wave-replay');
      if (touch) await button.tap(); else await button.click();
      await flat(page);
      await page.clock.runFor(820);
      const moving = await samples(page);
      assert.ok(Number(await page.locator('#cycle-source-marker').getAttribute('cy')) < 116, 'source moves upwards after playback');
      assert.ok(moving.points.some(p => p.y < 150));
      assert.ok(moving.points.filter(p => p.x > 240).every(p => Math.abs(p.y - 170) < .01), 'undisturbed rope ahead stays flat');
      assert.ok(Math.abs(moving.points.at(-1).x - 600) < .01);
      assert.equal(await button.isDisabled(), true);
      await page.clock.runFor(800);
      assert.ok(Number(await page.locator('#cycle-source-marker').getAttribute('cy')) > 168, 'source returns through equilibrium');
      await page.clock.runFor(800);
      assert.ok(Number(await page.locator('#cycle-source-marker').getAttribute('cy')) > 224, 'source reaches the lower amplitude');
      await page.clock.runFor(850);
      const complete = await samples(page);
      assert.ok(Math.min(...complete.points.map(p => p.y)) < 116);
      assert.ok(Math.max(...complete.points.map(p => p.y)) > 224);
      assert.equal(await page.locator('#cycle-wave-length-annotation').getAttribute('visibility'), 'visible');
      assert.equal(await page.locator('#card-05 .is-complete').count(), 4);
      assert.equal(await page.locator('#card-05 .is-active').count(), 0);
      assert.equal(await button.isDisabled(), false);
      if (touch) await button.tap(); else { await button.focus(); await page.keyboard.press('Enter'); }
      await flat(page);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
});
