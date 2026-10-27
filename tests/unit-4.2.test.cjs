const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

test('4.2 evaporation is a continuous, controllable scene', { timeout: 100000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('HTTP server did not start')), 5000);
    server.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/port (\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    server.once('error', error => { clearTimeout(timer); reject(error); });
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
  page.on('requestfailed', request => failures.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  const url = `http://127.0.0.1:${port}/units/4/parts/4.2/`;
  await page.goto(url);
  await page.waitForFunction(() => document.querySelector('#evap-stage').dataset.ready === 'true', { timeout: 30000 });
  const state = () => page.locator('#evap-stage').evaluate(element => ({
    progress: Number(element.dataset.progress), water: Number(element.dataset.water),
    crystals: Number(element.dataset.crystals), step: Number(element.dataset.step)
  }));
  const scrub = value => page.locator('#evap-seek').evaluate((input, value) => {
    input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);

  await t.test('arbitrary times render distinct liquid levels while the equipment stays fixed', async () => {
    assert.equal(await page.locator('#evap-visual canvas').count(), 1);
    assert.equal(await page.locator('.evap-frame').count(), 0);
    const readouts = [];
    for (const value of [123, 456, 821, 1000]) {
      await scrub(value);
      const current = await state();
      assert.equal(current.progress, value / 1000);
      readouts.push(current);
    }
    assert.ok(readouts[0].water > readouts[1].water && readouts[1].water > readouts[2].water);
    assert.equal(readouts[0].crystals, 0);
    assert.ok(readouts[2].crystals > 0);
    assert.equal(readouts[3].water, 0);
    assert.equal(readouts[3].crystals, 1);
    await scrub(100);
    const first = await page.locator('#evap-visual').screenshot();
    const bounds = await page.locator('#evap-visual').boundingBox();
    const clip = { x: bounds.x + bounds.width * 0.78, y: bounds.y + bounds.height * 0.74, width: bounds.width * 0.16, height: bounds.height * 0.16 };
    const fixedFirst = await page.screenshot({ clip });
    await scrub(900);
    const second = await page.locator('#evap-visual').screenshot();
    const fixedSecond = await page.screenshot({ clip });
    assert.notDeepEqual(first, second, 'the actual rendered liquid/crystals must change');
    assert.deepEqual(fixedFirst, fixedSecond, 'the photographed knob and hotplate must not morph');
  });

  await t.test('continuous playback, pause and resume preserve the exact position', async () => {
    await scrub(100);
    await page.locator('#evap-play').click();
    const positions = [];
    for (let i = 0; i < 8; i++) { await page.waitForTimeout(150); positions.push((await state()).progress); }
    assert.ok(new Set(positions).size >= 6, 'playback must visit many intermediate positions');
    for (let i = 1; i < positions.length; i++) assert.ok(positions[i] >= positions[i - 1]);
    await page.locator('#evap-play').click();
    const paused = await state();
    await page.waitForTimeout(400);
    assert.deepEqual(await state(), paused);
    await page.locator('#evap-play').click();
    await page.waitForTimeout(500);
    assert.ok((await state()).progress > paused.progress);
    await scrub(500);
    await page.waitForTimeout(300);
    assert.equal((await state()).progress, 0.5, 'scrubbing must stop playback');
  });

  await t.test('chapter buttons, boundaries and keyboard seeking remain usable', async () => {
    for (const step of [1, 2, 3, 4]) {
      await page.locator(`[data-evap-step="${step}"]`).click();
      assert.equal((await state()).step, step);
      assert.equal(await page.locator('.evap-step[aria-pressed="true"]').count(), 1);
    }
    assert.equal(await page.locator('#evap-next').isDisabled(), true);
    await page.locator('#evap-prev').click(); assert.equal((await state()).step, 3);
    await page.locator('#evap-next').click(); assert.equal((await state()).progress, 1);
    await page.locator('[data-evap-step="1"]').click();
    assert.equal(await page.locator('#evap-prev').isDisabled(), true);
    await page.locator('#evap-seek').focus(); await page.keyboard.press('ArrowRight');
    assert.equal((await state()).progress, 0.001);
  });

  await t.test('one replay traverses evaporation and growth and finishes on dry salt', async () => {
    await page.locator('#evap-replay').click();
    await page.waitForFunction(() => Number(document.querySelector('#evap-stage').dataset.progress) > 0.63, { timeout: 20000 });
    const growing = await state();
    assert.equal(growing.step, 3);
    assert.ok(growing.water > 0 && growing.crystals > 0);
    await page.waitForFunction(() => Number(document.querySelector('#evap-stage').dataset.progress) === 1, { timeout: 15000 });
    assert.equal((await state()).water, 0);
    assert.equal((await state()).crystals, 1);
    assert.equal(await page.locator('#evap-play').getAttribute('aria-pressed'), 'false');
    await page.locator('#evap-replay').click();
    await page.locator('[data-evap-step="2"]').click();
    await page.waitForTimeout(400);
    assert.equal((await state()).progress, 0.34, 'chapter navigation must cancel an old replay');
    assert.deepEqual(failures, []);
  });

  await t.test('unavailable WebGL is reported without breaking the rest of the lesson', async () => {
    const unsupported = await browser.newPage();
    try {
      await unsupported.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          if (String(kind).startsWith('webgl')) return null;
          return original.call(this, kind, ...args);
        };
      });
      await unsupported.goto(url);
      await unsupported.waitForFunction(() => document.querySelector('#evap-stage').dataset.ready === 'error');
      assert.match(await unsupported.locator('#evap-caption').innerText(), /WebGL/);
      assert.equal(await unsupported.locator('#evap-play').isDisabled(), true);
      assert.equal(await unsupported.locator('#strip-start').isEnabled(), true);
    } finally { await unsupported.close(); }
  });
});
