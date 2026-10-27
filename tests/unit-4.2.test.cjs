const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

test('4.2 evaporation is a continuous, controllable scene', { timeout: 150000 }, async t => {
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
  await page.waitForFunction(() => document.querySelector('#evap-stage').dataset.ready === 'true', null, { timeout: 30000 });
  const state = () => page.locator('#evap-stage').evaluate(element => ({
    progress: Number(element.dataset.progress), water: Number(element.dataset.water),
    crystals: Number(element.dataset.crystals), step: Number(element.dataset.step),
    boiling: Number(element.dataset.boiling), bubbles: Number(element.dataset.bubbles),
    grains: Number(element.dataset.grains), ripple: Number(element.dataset.ripple), phase: element.dataset.phase
  }));
  const scrub = value => page.locator('#evap-seek').evaluate((input, value) => {
    input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);

  await t.test('four chapters each occupy exactly three seconds', async () => {
    const timing = await page.evaluate(async () => {
      const { DURATION, CHECKPOINTS, evaporationState } = await import('./assets/evaporation-state.js?v=twelve-seconds-1');
      return {
        duration: DURATION,
        starts: CHECKPOINTS.map(progress => progress * DURATION),
        steps: [0, 2.999, 3, 5.999, 6, 8.999, 9, 11.999, 12].map(seconds => evaporationState(seconds / DURATION).step),
        dry: [9, 10.5, 12].map(seconds => evaporationState(seconds / DURATION))
      };
    });
    assert.equal(timing.duration, 12);
    assert.deepEqual(timing.starts, [0, 3, 6, 9]);
    assert.deepEqual(timing.steps, [1, 1, 2, 2, 3, 3, 4, 4, 4]);
    timing.dry.forEach(state => { assert.equal(state.water, 0); assert.equal(state.crystals, 1); assert.equal(state.boiling, 0); });
  });

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

  await t.test('heating produces rising bubbles and moving water before early crystal growth', async () => {
    await scrub(0);
    const warming = await state();
    assert.equal(warming.phase, 'warming');
    assert.equal(warming.bubbles, 0);
    assert.equal(warming.grains, 0);
    await scrub(200);
    const smallBubbles = await state();
    assert.equal(smallBubbles.phase, 'bubbles');
    assert.ok(smallBubbles.bubbles > 0);
    await scrub(280);
    const boiling = await state();
    assert.equal(boiling.phase, 'boiling');
    assert.ok(boiling.bubbles > 20 && boiling.bubbles > smallBubbles.bubbles);
    assert.ok(boiling.ripple > 0.002 && boiling.ripple > warming.ripple, 'boiling must deform the actual water mesh');
    const frameA = await page.locator('#evap-visual').screenshot();
    await scrub(285);
    const frameB = await page.locator('#evap-visual').screenshot();
    assert.notDeepEqual(frameA, frameB, 'closely spaced times must show changing bubbles and surface detail');
    await scrub(550);
    const earlyCrystals = await state();
    assert.equal(earlyCrystals.phase, 'crystallizing');
    assert.ok(earlyCrystals.grains > 30 && earlyCrystals.water > 0, 'visible crystals must appear by the middle of playback');
    await scrub(650);
    const growing = await state();
    assert.ok(growing.crystals > earlyCrystals.crystals && growing.grains >= earlyCrystals.grains);
    await scrub(720);
    const shallow = await state();
    assert.equal(shallow.phase, 'shallow');
    assert.ok(shallow.water < 0.1 && shallow.bubbles < boiling.bubbles);
    assert.ok(shallow.ripple < boiling.ripple);
    await scrub(1000);
    const dry = await state();
    assert.equal(dry.phase, 'dry');
    assert.equal(dry.bubbles, 0);
    assert.equal(dry.ripple, 0);
    assert.ok(dry.grains > earlyCrystals.grains);
    assert.match(await page.locator('#s2').innerText(), /未沸騰時也會蒸發/);
  });

  await t.test('chapter buttons, boundaries and keyboard seeking remain usable', async () => {
    for (const step of [1, 2, 3, 4]) {
      await page.locator(`[data-evap-step="${step}"]`).click();
      assert.equal((await state()).step, step);
      assert.equal(await page.locator('.evap-step[aria-pressed="true"]').count(), 1);
    }
    assert.equal(await page.locator('#evap-next').isDisabled(), true);
    await page.locator('#evap-prev').click(); assert.equal((await state()).step, 3);
    await page.locator('#evap-next').click(); assert.equal((await state()).progress, 0.75);
    assert.equal(await page.locator('#evap-next').isDisabled(), true);
    await page.locator('[data-evap-step="1"]').click();
    assert.equal(await page.locator('#evap-prev').isDisabled(), true);
    await page.locator('#evap-seek').focus(); await page.keyboard.press('ArrowRight');
    assert.equal((await state()).progress, 0.001);
  });

  await t.test('one replay traverses evaporation and growth and finishes on dry salt', async () => {
    await page.locator('#evap-replay').click();
    await page.waitForFunction(() => Number(document.querySelector('#evap-stage').dataset.progress) > 0.52, null, { timeout: 20000 });
    const growing = await state();
    assert.equal(growing.step, 3);
    assert.ok(growing.water > 0 && growing.crystals > 0);
    await page.waitForFunction(() => Number(document.querySelector('#evap-stage').dataset.progress) === 1, null, { timeout: 20000 });
    assert.equal((await state()).water, 0);
    assert.equal((await state()).crystals, 1);
    assert.equal(await page.locator('#evap-play').getAttribute('aria-pressed'), 'false');
    await page.locator('#evap-replay').click();
    await page.locator('[data-evap-step="2"]').click();
    await page.waitForTimeout(400);
    assert.equal((await state()).progress, 0.25, 'chapter navigation must cancel an old replay');
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
