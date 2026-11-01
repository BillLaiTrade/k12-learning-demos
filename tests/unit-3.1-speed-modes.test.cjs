const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');

test('ideal parameters and fixed-speed rope modes', { timeout: 90000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Server timeout')), 5000);
    server.stdout.on('data', chunk => {
      const match = String(chunk).match(/port (\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(Error(`Server exited ${code}`)); });
  });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    ...(process.env.SPEED_MODES_URL ? { proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY } } : {})
  });
  t.after(() => browser.close());
  const url = process.env.SPEED_MODES_URL || `http://127.0.0.1:${port}/units/3/parts/3.1/`;
  const open = async (options = {}) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, ...options });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    return { page, errors };
  };
  const mode = (page, name) => page.locator(`[data-speed-mode="${name}"]`);
  const read = async page => ({
    f: parseFloat(await page.locator('#speed-frequency-value').innerText()),
    T: parseFloat(await page.locator('#speed-period-value').innerText()),
    wavelength: parseFloat(await page.locator('#speed-wavelength-value').innerText())
  });
  const fixed = async page => {
    const { f, T, wavelength } = await read(page);
    assert.ok(Math.abs(f * wavelength - 12) < .01, 'displayed frequency × wavelength approximates 12');
    assert.ok(Math.abs(f * T - 1) < .003, 'frequency and period are reciprocal');
    assert.match(await page.locator('#speed-equation-live').innerText(), /= 12 m\/s$/);
    assert.match(await page.locator('#speed-run-time').innerText(), /\/ 2.5 s$/);
    assert.equal(await page.locator('#speed-wave-path').evaluate(e => e.style.stroke), 'rgb(23, 107, 83)');
    assert.equal(await page.locator('#speed-wave-path').evaluate(e => getComputedStyle(e).stroke), 'rgb(23, 107, 83)');
  };

  await t.test('ideal mode retains independent wavelength, changing speed and color', async () => {
    const { page, errors } = await open();
    try {
      assert.equal(await mode(page, 'ideal').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#speed-ideal-note').isVisible(), true);
      const originalColor = await page.locator('#speed-wave-path').evaluate(e => e.style.stroke);
      await page.locator('#speed-frequency-up').click();
      assert.deepEqual(await read(page), { f: 2.5, T: .4, wavelength: 6 });
      assert.match(await page.locator('#speed-equation-live').innerText(), /= 15 m\/s$/);
      assert.notEqual(await page.locator('#speed-wave-path').evaluate(e => e.style.stroke), originalColor);
      await page.locator('#speed-wavelength-up').click();
      assert.deepEqual(await read(page), { f: 2.5, T: .4, wavelength: 7 });
      assert.match(await page.locator('#speed-equation-live').innerText(), /= 17.5 m\/s$/);
      assert.equal(await page.locator('.speed-color-legend').isVisible(), true);
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });

  await t.test('all three rope controls link reciprocally and keep green and 12 m/s', async () => {
    const { page, errors } = await open();
    try {
      await mode(page, 'rope').click();
      await fixed(page);
      assert.equal(await page.locator('#speed-ideal-note').isVisible(), false);
      assert.equal(await page.locator('#speed-rope-note').isVisible(), true);
      assert.equal(await page.locator('.speed-color-legend').isVisible(), false);
      await page.locator('#speed-frequency-up').click();
      assert.deepEqual(await read(page), { f: 2.5, T: .4, wavelength: 4.8 });
      await fixed(page);
      await page.locator('#speed-period-up').click();
      assert.deepEqual(await read(page), { f: 2.222, T: .45, wavelength: 5.4 });
      await fixed(page);
      await page.locator('#speed-wavelength-up').click();
      assert.deepEqual(await read(page), { f: 1.875, T: .533, wavelength: 6.4 });
      await fixed(page);
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });

  await t.test('rope endpoints clamp and disable the corresponding controls', async () => {
    const { page } = await open();
    try {
      await mode(page, 'rope').click();
      for (let i = 0; i < 2; i++) await page.locator('#speed-frequency-down').click();
      assert.deepEqual(await read(page), { f: 1, T: 1, wavelength: 12 });
      for (const id of ['frequency-down', 'period-up', 'wavelength-up']) assert.equal(await page.locator('#speed-' + id).isDisabled(), true);
      await fixed(page);
      for (let i = 0; i < 9; i++) await page.locator('#speed-wavelength-down').click();
      assert.deepEqual(await read(page), { f: 4, T: .25, wavelength: 3 });
      for (const id of ['frequency-up', 'period-down', 'wavelength-down']) assert.equal(await page.locator('#speed-' + id).isDisabled(), true);
      await fixed(page);
      await page.locator('#speed-period-up').click();
      await page.locator('#speed-wavelength-down').click();
      assert.deepEqual(await read(page), { f: 4, T: .25, wavelength: 3 });
      await fixed(page);
    } finally { await page.close(); }
  });

  await t.test('switching preserves separate parameters and cancels an active wave', async () => {
    const { page } = await open();
    try {
      await page.clock.install();
      await page.locator('#speed-wavelength-up').click();
      const ideal = await read(page);
      await mode(page, 'rope').click();
      assert.deepEqual(await read(page), { f: 2, T: .5, wavelength: 6 });
      await page.locator('#speed-frequency-up').click();
      const rope = await read(page);
      await page.locator('#speed-send-wave').click();
      assert.equal(await page.locator('#speed-frequency-up').isDisabled(), true);
      await mode(page, 'ideal').click();
      assert.deepEqual(await read(page), ideal);
      assert.equal(await page.locator('#speed-send-wave').innerText(), '讓波源振動一次');
      assert.equal(await page.locator('#speed-progress').getAttribute('aria-valuenow'), '0');
      assert.equal(await page.locator('#speed-source-marker').getAttribute('cy'), '90');
      await page.clock.runFor(1000);
      assert.equal(await page.locator('#speed-progress').getAttribute('aria-valuenow'), '0');
      assert.equal(await page.locator('#speed-frequency-up').isDisabled(), false);
      await mode(page, 'rope').click();
      assert.deepEqual(await read(page), rope);
      await fixed(page);
      assert.equal(await page.locator('#speed-progress').getAttribute('aria-valuenow'), '0');
    } finally { await page.close(); }
  });

  await t.test('rope propagation keeps the same arrival time after changing frequency', async () => {
    const { page } = await open();
    try {
      await page.clock.install();
      await mode(page, 'rope').click();
      for (const higher of [false, true]) {
        if (higher) await page.locator('#speed-frequency-up').click();
        await page.locator('#speed-send-wave').click();
        await page.clock.runFor(1000);
        const progress = Number(await page.locator('#speed-progress').getAttribute('aria-valuenow'));
        assert.ok(progress > 38 && progress < 41, 'front travels about 12 of 30 metres in one second');
        assert.ok(Number(await page.locator('#speed-source-marker').getAttribute('cy')) === 90, 'source finishes one vibration');
        await page.clock.runFor(2200);
        assert.equal(await page.locator('#speed-progress').getAttribute('aria-valuenow'), '100');
        assert.match(await page.locator('#speed-run-message').innerText(), /需時 2.5 秒/);
        assert.equal(await page.locator('#speed-send-wave').innerText(), '再產生一個完整波');
        await fixed(page);
      }
    } finally { await page.close(); }
  });

  await t.test('keyboard and mobile touch switch modes and adjust linked controls', async () => {
    for (const touch of [false, true]) {
      const { page, errors } = await open({ viewport: { width: touch ? 390 : 1440, height: 1000 }, hasTouch: touch, reducedMotion: 'reduce' });
      try {
        if (touch) { await mode(page, 'rope').tap(); await page.locator('#speed-frequency-up').tap(); }
        else { await mode(page, 'rope').focus(); await page.keyboard.press('Enter'); await page.locator('#speed-frequency-up').focus(); await page.keyboard.press('Space'); }
        assert.equal(await mode(page, 'rope').getAttribute('aria-pressed'), 'true');
        assert.deepEqual(await read(page), { f: 2.5, T: .4, wavelength: 4.8 });
        await fixed(page);
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    }
  });

  await t.test('both modes fit desktop and narrow screens', async () => {
    if (process.env.SPEED_MODES_CAPTURE_DIR) await fs.mkdir(process.env.SPEED_MODES_CAPTURE_DIR, { recursive: true });
    for (const width of [1440, 1024, 768, 390, 320]) {
      const { page } = await open({ viewport: { width, height: 1000 } });
      try {
        for (const name of ['ideal', 'rope']) {
          await mode(page, name).click();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
          for (const selector of ['.speed-mode-switch', '.speed-control-grid', '#speed-equation-live']) {
            const bounds = await page.locator(selector).boundingBox();
            assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
          }
          if (process.env.SPEED_MODES_CAPTURE_DIR && [1440, 390].includes(width)) {
            await page.locator('.speed-interactive').screenshot({ path: path.join(process.env.SPEED_MODES_CAPTURE_DIR, `${name}-${width}.png`) });
          }
        }
      } finally { await page.close(); }
    }
  });
});
