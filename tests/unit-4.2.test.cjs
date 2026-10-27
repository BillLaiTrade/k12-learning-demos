const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

test('4.2 evaporation plays the chosen stage from its step or picture', { timeout: 150000 }, async t => {
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, hasTouch: true });
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
  page.on('requestfailed', request => failures.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) failures.push(response.status() + ' ' + response.url()); });
  const url = 'http://127.0.0.1:' + port + '/units/4/parts/4.2/';
  // Keep real DOM events and WebGL rendering. Control only the clock so a
  // short chapter cannot finish while software-GPU screenshots are captured.
  await page.clock.install({ time: new Date('2026-10-27T00:00:00Z') });
  await page.goto(url);
  await page.waitForFunction(() => document.querySelector('#evap-stage').dataset.ready === 'true', null, { timeout: 30000 });
  await page.clock.pauseAt(new Date('2026-10-27T00:01:00Z'));
  const state = () => page.locator('#evap-stage').evaluate(element => ({
    progress: Number(element.dataset.progress), water: Number(element.dataset.water),
    crystals: Number(element.dataset.crystals), step: Number(element.dataset.step),
    boiling: Number(element.dataset.boiling), bubbles: Number(element.dataset.bubbles),
    grains: Number(element.dataset.grains), ripple: Number(element.dataset.ripple),
    phase: element.dataset.phase, playing: element.dataset.playing === 'true'
  }));
  const button = number => page.locator('[data-evap-step="' + number + '"]');
  const picture = page.locator('#evap-visual');
  const advance = async milliseconds => {
    await page.clock.runFor(20); // Present the first frame of a new run.
    await page.clock.fastForward(milliseconds);
  };
  const stopped = async () => {
    await advance(3200);
    await page.waitForFunction(() => document.querySelector('#evap-stage').dataset.playing === 'false');
  };

  await t.test('observation lasts 1.5 seconds and the remaining stages last three', async () => {
    const timing = await page.evaluate(async () => {
      const { DURATION, CHECKPOINTS, evaporationState } = await import('./assets/evaporation-state.js?v=step-playback-1');
      return {
        duration: DURATION,
        starts: CHECKPOINTS.map(progress => progress * DURATION),
        steps: [0, 1.499, 1.5, 4.499, 4.5, 7.499, 7.5, 10.499, 10.5].map(seconds => evaporationState(seconds / DURATION).step),
        dry: [7.5, 9, 10.5].map(seconds => evaporationState(seconds / DURATION))
      };
    });
    assert.equal(timing.duration, 10.5);
    assert.deepEqual(timing.starts, [0, 1.5, 4.5, 7.5]);
    assert.deepEqual(timing.steps, [1, 1, 2, 2, 3, 3, 4, 4, 4]);
    timing.dry.forEach(state => {
      assert.equal(state.water, 0); assert.equal(state.crystals, 1); assert.equal(state.boiling, 0);
    });
  });

  await t.test('only the step buttons and the picture control playback', async () => {
    assert.equal(await page.locator('#evap-seek, #evap-play, #evap-prev, #evap-next, #evap-replay, #evap-progress, .evap-controls, .evap-timeline').count(), 0);
    assert.equal(await page.locator('#s2').getByRole('slider').count(), 0);
    assert.equal(await page.locator('#evap-visual canvas').count(), 1);
    assert.equal(await picture.getAttribute('type'), 'button');
    assert.match(await picture.getAttribute('aria-label'), /觀察鹽水/);
    const initial = await state();
    await page.waitForTimeout(300);
    assert.deepEqual(await state(), initial);
    assert.equal(initial.playing, false);
    assert.equal(initial.progress, 0);
    assert.equal(initial.bubbles, 0);
    assert.equal(initial.grains, 0);
  });

  await t.test('selecting evaporation immediately animates boiling while the apparatus stays fixed', async () => {
    await button(2).click();
    await advance(400);
    await page.waitForFunction(() => {
      const data = document.querySelector('#evap-stage').dataset;
      return data.playing === 'true' && Number(data.boiling) > 0.95;
    });
    const boiling = await state();
    assert.equal(boiling.step, 2);
    assert.ok(boiling.bubbles > 20 && boiling.ripple > 0.002);
    const first = await picture.screenshot();
    const bounds = await picture.boundingBox();
    const clip = { x: bounds.x + bounds.width * 0.78, y: bounds.y + bounds.height * 0.74, width: bounds.width * 0.16, height: bounds.height * 0.16 };
    const fixedFirst = await page.screenshot({ clip });
    await advance(180);
    const second = await picture.screenshot();
    const fixedSecond = await page.screenshot({ clip });
    assert.notDeepEqual(first, second, 'liquid and bubbles must actually move');
    assert.deepEqual(fixedFirst, fixedSecond, 'the photographed hotplate must stay fixed');
    await stopped();
    assert.equal((await state()).step, 2);
  });

  await t.test('each selected step stops at its own endpoint without selecting the next step', async () => {
    const endpoints = [1.5 / 10.5, 4.5 / 10.5, 7.5 / 10.5, 1];
    for (const number of [1, 2, 3, 4]) {
      await button(number).click();
      assert.equal((await state()).step, number);
      assert.equal((await state()).playing, true);
      await stopped();
      const final = await state();
      assert.equal(final.step, number);
      assert.ok(Math.abs(final.progress - endpoints[number - 1]) < 0.00001);
      assert.equal(await page.locator('.evap-step[aria-pressed="true"]').count(), 1);
      assert.equal(await button(number).getAttribute('aria-pressed'), 'true');
      await page.clock.fastForward(200);
      assert.deepEqual(await state(), final, 'completed stage must remain stopped');
    }
    assert.equal((await state()).water, 0);
    assert.equal((await state()).bubbles, 0);
    assert.equal((await state()).crystals, 1);
  });

  await t.test('clicking the picture replays the current step and switching steps cancels the old run', async () => {
    await button(3).click();
    await advance(1200);
    await page.waitForFunction(() => Number(document.querySelector('#evap-stage').dataset.progress) > 0.53);
    const growing = await state();
    assert.ok(growing.grains > 30 && growing.water > 0);
    await picture.click();
    const restarted = await state();
    assert.equal(restarted.step, 3);
    assert.equal(restarted.playing, true);
    assert.ok(restarted.progress < 0.50);
    await button(1).click();
    await stopped();
    assert.equal((await state()).step, 1);
    assert.ok((await state()).progress < 0.15);
    await picture.click();
    assert.equal((await state()).playing, true);
    assert.ok((await state()).progress < 0.04);
    for (const number of [2, 4, 2]) await button(number).click();
    await stopped();
    assert.equal((await state()).step, 2);
    assert.ok(Math.abs((await state()).progress - 4.5 / 10.5) < 0.00001);
  });

  await t.test('native picture and step buttons support keyboard and touch', async () => {
    await button(1).click();
    await stopped();
    await picture.focus();
    await page.keyboard.press('Enter');
    assert.equal((await state()).playing, true);
    assert.equal((await state()).step, 1);
    await stopped();
    await picture.focus();
    await page.keyboard.press('Space');
    assert.equal((await state()).playing, true);
    await button(2).focus();
    await page.keyboard.press('Enter');
    await advance(1000);
    await page.waitForFunction(() => Number(document.querySelector('#evap-stage').dataset.progress) > 0.23);
    await picture.tap();
    assert.equal((await state()).step, 2);
    assert.equal((await state()).playing, true);
    assert.ok((await state()).progress < 0.20);
    await stopped();
    assert.deepEqual(failures, []);
  });

  await t.test('unavailable WebGL disables only animation buttons and reports the error', async () => {
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
      assert.equal(await unsupported.locator('#evap-visual').isDisabled(), true);
      assert.equal(await unsupported.locator('.evap-step:disabled').count(), 4);
      assert.equal(await unsupported.locator('#strip-start').isEnabled(), true);
    } finally { await unsupported.close(); }
  });
});
