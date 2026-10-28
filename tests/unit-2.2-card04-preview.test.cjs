const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const model = import(pathToFileURL(path.resolve(__dirname, '../previews/unit-2.2-card04/model.mjs')).href);

test('sound comparison uses one signal and physical travel delays', async t => {
  const m = await model;
  await t.test('the same distance produces the material arrival times and ranking', () => {
    const groups = m.conditions('material');
    assert.deepEqual(groups.map(g => g.speed), [343, 1480, 5900]);
    assert.deepEqual(groups.map(g => (100000 / g.speed).toFixed(1)), ['291.5', '67.6', '16.9']);
    assert.deepEqual(m.winners(groups), ['steel']);
  });
  await t.test('temperature changes only the air speed, including a real tie at 20°C', () => {
    assert.equal(m.airSpeed(0), 331); assert.equal(m.airSpeed(20), 343); assert.equal(m.airSpeed(30), 349);
    assert.deepEqual(m.winners(m.conditions('temperature', 0)), ['reference']);
    assert.deepEqual(m.winners(m.conditions('temperature', 30)), ['adjustable']);
    assert.deepEqual(m.winners(m.conditions('temperature', 20)), ['reference', 'adjustable']);
    assert.ok(Math.abs((m.arrivalTime(343) - m.arrivalTime(349)) * 1000 - 600000 / (343 * 349)) < 1e-12);
  });
  await t.test('every medium uses the same frequency, bounded local motion and exact rest', () => {
    for (const speed of [331, 343, 349, 1480, 5900]) {
      const point = { x: 200, y: 70, distance: 40 };
      assert.equal(m.sample(point, speed, 40 / speed - .0001).x, point.x);
      for (const age of [.007, .021, .047, .095]) {
        const sampled = m.sample(point, speed, 40 / speed + age);
        assert.ok(Math.abs(sampled.x - point.x - m.displacement(age)) < 1e-10);
        assert.equal(sampled.y, point.y);
      }
      assert.equal(m.sample(point, speed, 40 / speed + m.PULSE_DURATION + .01).x, point.x);
    }
    const values = Array.from({ length: 1601 }, (_, i) => m.displacement(i / 10000));
    assert.ok(Math.max(...values) > 4 && Math.min(...values) < -4);
    assert.ok(values.every(v => Math.abs(v) <= m.AMPLITUDE));
    assert.equal(m.displacement(-.1), 0); assert.equal(m.displacement(m.PULSE_DURATION), 0);
  });
  await t.test('particles remain ordered, stay at fixed y and settle in every medium', () => {
    for (const group of m.conditions('material')) {
      const points = m.positions(group.kind), end = m.runEnd([group]);
      assert.equal(points[0].distance, 0); assert.equal(points.at(-1).distance, 100);
      for (let step = 0; step <= 300; step++) {
        const time = end * step / 300;
        const samples = points.map(p => m.sample(p, group.speed, time));
        for (let i = 0; i < points.length; i++) {
          assert.equal(samples[i].y, points[i].y);
          assert.ok(Math.abs(samples[i].x - points[i].x) <= m.AMPLITUDE + 1e-8);
          if (i && points[i].row === points[i - 1].row) assert.ok(samples[i].x > samples[i - 1].x, 'no particles cross');
        }
      }
      assert.ok(points.every(p => m.sample(p, group.speed, end).x === p.x));
    }
  });
});

test('complete fourth-card preview works as one consistent experiment', { timeout: 180000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server startup timed out')), 5000);
    server.stdout.on('data', data => { const match = String(data).match(/port (\d+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
    server.once('error', reject);
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1500 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => errors.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.addInitScript(() => {
    const Original = window.AudioContext;
    window.__oscillators = [];
    window.AudioContext = class extends Original {
      constructor(...args) { super(...args); window.__audioContext = this; }
      createOscillator() {
        const node = super.createOscillator(); window.__oscillators.push(node);
        const start = node.start.bind(node); node.start = (...args) => { node.__started = true; start(...args); };
        node.addEventListener('ended', () => { node.__ended = true; });
        return node;
      }
    };
  });
  await page.clock.install({ time: new Date('2026-10-28T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-28T00:00:01Z'));
  const url = `http://127.0.0.1:${port}/previews/unit-2.2-card04/`;
  const fresh = () => page.goto(url, { waitUntil: 'networkidle' });
  const data = () => page.locator('#experiment-panel').evaluate(n => ({ ...n.dataset }));
  const time = async () => Number((await data()).time);
  const primary = page.locator('#primary-action');
  const particleXs = () => page.locator('.particle, .end-particle').evaluateAll(nodes => nodes.map(n => n.getAttribute('cx')));
  const setTemperature = async value => page.locator('#temperature').evaluate((n, v) => { n.value = String(v); n.dispatchEvent(new Event('input', { bubbles: true })); }, value);
  const realWait = ms => new Promise(resolve => setTimeout(resolve, ms));

  await t.test('initial scene uses the official characters, no orange tracking particle and no autoplay', async () => {
    await fresh();
    assert.equal((await data()).phase, 'idle'); assert.equal(await time(), 0);
    assert.equal(await page.locator('.medium-row').count(), 3);
    assert.equal(await page.locator('.particle').count(), 592);
    assert.equal(await page.locator('[name=prediction]:checked').count(), 0);
    assert.equal(await page.locator('#result').isHidden(), true);
    assert.equal(await page.evaluate(() => window.__audioContext), undefined);
    assert.equal(await page.locator('.speaker').first().evaluate(n => getComputedStyle(n, '::before').backgroundImage.includes('/shared-assets/characters/dialogue-character-avatars.png')), true);
    assert.equal(await page.locator('.particle').evaluateAll(nodes => nodes.every(n => n.getAttribute('fill') === '#d2dcd5' && n.getAttribute('cx') === Number(n.dataset.originX).toFixed(4))), true);
    assert.equal(await page.locator('.field [stroke-dasharray], .field path[stroke="#be773a"]').count(), 0);
    const before = await particleXs(); await page.clock.runFor(1000); assert.deepEqual(await particleXs(), before);
  });

  await t.test('vibration begins locally and steel reaches the end while water and air remain still there', async () => {
    await primary.click(); await page.clock.runFor(1000);
    assert.ok(await time() > .019 && await time() < .021);
    const readings = await page.locator('.arrival-readout output').allTextContents();
    assert.deepEqual(readings, ['—', '—', '16.9 毫秒']);
    for (const id of ['air', 'water']) assert.equal(await page.locator(`[data-group=${id}] .end-particle`).first().getAttribute('cx'), '75.0000');
    assert.notEqual(await page.locator('[data-group=steel] .end-particle').first().getAttribute('cx'), '75.0000');
    const reached = await page.locator('.medium-row').evaluateAll(rows => rows.map(row => row.querySelectorAll('.particle[data-reached=true]').length / row.querySelectorAll('.particle').length));
    assert.ok(reached[0] < .1 && reached[1] > .25 && reached[1] < .35 && reached[2] === 1);
    assert.match(await page.locator('#observation-caption').textContent(), /鋼已傳到/);
    const { link, endpoints } = await page.locator('[data-group=steel]').evaluate(row => {
      const line = row.querySelector('line');
      return { link: { x1: Number(line.getAttribute('x1')), x2: Number(line.getAttribute('x2')) }, endpoints: [...row.querySelectorAll('.particle')].slice(0, 2).map(n => Number(n.getAttribute('cx'))) };
    });
    assert.ok(Math.abs(link.x1 - endpoints[0]) < .0001 && Math.abs(link.x2 - endpoints[1]) < .0001);
  });

  await t.test('pause, resume, exact stepping and a shared speed change keep one timeline', async () => {
    await primary.click(); const paused = await time(), snapshot = await particleXs();
    await page.clock.runFor(2000); assert.equal(await time(), paused); assert.deepEqual(await particleXs(), snapshot);
    await page.locator('#step-action').click(); assert.ok(Math.abs(await time() - paused - .002) < 1e-7);
    assert.equal((await data()).phase, 'paused');
    await primary.click(); await page.clock.runFor(1000); const resumed = await time(); assert.ok(resumed > paused + .02);
    await page.locator('#slowdown').selectOption('20'); const changed = await time();
    assert.ok(changed - resumed < .002);
    await page.clock.runFor(1000); assert.ok(Math.abs(await time() - changed - .05) < .001);
  });

  await t.test('source clicks and keyboard restart all groups without overlapping animations', async () => {
    await page.locator('[data-group=water] .source-hit').click(); await page.clock.runFor(1000);
    assert.ok(await time() > .049 && await time() < .051);
    await page.locator('[data-group=air] .source-hit').focus(); await page.keyboard.press('Enter'); await page.clock.runFor(1000);
    assert.ok(await time() > .049 && await time() < .051);
    await page.locator('[data-group=steel] .source-hit').click();
    await page.locator('[data-group=steel] .source-hit').click(); await page.clock.runFor(1000);
    assert.ok(await time() > .049 && await time() < .051);
  });

  await t.test('complete results retain the actual times, feedback and rest positions', async () => {
    await fresh(); await page.locator('[name=prediction][value=water]').check();
    await page.locator('#slowdown').selectOption('20'); await primary.click(); await page.clock.runFor(10000);
    assert.equal((await data()).phase, 'complete');
    assert.deepEqual(await page.locator('.arrival-readout output').allTextContents(), ['291.5 毫秒', '67.6 毫秒', '16.9 毫秒']);
    assert.equal(await page.locator('#result-rows tr').count(), 3);
    assert.match(await page.locator('#result-summary').textContent(), /鋼最先、水其次、空氣最後/);
    assert.equal(await page.locator('#result-title').textContent(), '一起比較這次的結果');
    assert.equal(await page.locator('.particle').evaluateAll(nodes => nodes.every(n => Math.abs(Number(n.getAttribute('cx')) - Number(n.dataset.originX)) < .0001)), true);
    assert.equal(await page.locator('.end-particle').evaluateAll(nodes => nodes.every(n => Number(n.getAttribute('cx')) === 75)), true);
    await page.locator('[name=prediction][value=steel]').check(); assert.equal(await page.locator('#result-title').textContent(), '預測符合觀察');
    await page.locator('#step-action').click(); assert.equal((await data()).phase, 'paused'); assert.equal(await time(), .002);
    await page.locator('#reset-action').click(); assert.equal(await time(), 0); assert.equal(await page.locator('#result').isHidden(), true);
    assert.equal(await page.locator('[name=prediction][value=steel]').isChecked(), true);
  });

  await t.test('temperature controls are synchronized, bounded and use identical air layouts', async () => {
    await page.locator('#tab-material').focus(); await page.keyboard.press('ArrowRight');
    assert.equal((await data()).mode, 'temperature'); assert.equal(await page.locator('.medium-row').count(), 2);
    assert.equal(await page.locator('#tab-temperature').getAttribute('aria-selected'), 'true');
    const layouts = await page.locator('.medium-row').evaluateAll(rows => rows.map(row => [...row.querySelectorAll('.particle')].map(n => [n.dataset.originX, n.dataset.originY])));
    assert.deepEqual(layouts[0], layouts[1]);
    await page.locator('#temperature').focus(); await page.keyboard.press('Home');
    assert.equal(await page.locator('#temperature-value').textContent(), '0°C');
    assert.equal(await page.locator('[data-group=adjustable]').getAttribute('data-speed'), '331');
    await page.locator('#temperature-down').click(); assert.equal(await page.locator('#temperature').inputValue(), '0');
    await page.locator('#temperature-up').click(); assert.equal(await page.locator('#temperature-value').textContent(), '1°C');
    await page.locator('#temperature').focus(); await page.keyboard.press('End');
    await page.locator('#temperature-up').click(); assert.equal(await page.locator('#temperature').inputValue(), '30');
    assert.equal(await page.locator('[data-group=reference]').getAttribute('data-speed'), '343');
    assert.equal(await page.locator('[data-group=adjustable]').getAttribute('data-speed'), '349');
  });

  await t.test('warmer, colder and equal-temperature experiments produce correct outcomes', async () => {
    await page.locator('#slowdown').selectOption('20');
    for (const [temperature, prediction, expected] of [[30, 'adjustable', /早約 5\.0 毫秒/], [0, 'reference', /早約 10\.6 毫秒/], [20, 'same', /振動同時傳到/]]) {
      await setTemperature(temperature); await page.locator(`[name=prediction][value=${prediction}]`).check();
      await primary.click(); await page.clock.runFor(11000);
      assert.equal((await data()).phase, 'complete');
      assert.match(await page.locator('#result-summary').textContent(), expected);
      assert.equal(await page.locator('#result-title').textContent(), '預測符合觀察');
      assert.equal(await page.locator('#result-rows tr').count(), 2);
      if (temperature === 20) assert.deepEqual(await page.locator('.arrival-readout output').allTextContents(), ['291.5 毫秒', '291.5 毫秒']);
    }
  });

  await t.test('changing conditions clears running results and a tie has identical live motion', async () => {
    await primary.click(); await page.clock.runFor(500);
    const pair = await page.locator('.medium-row').evaluateAll(rows => rows.map(row => [...row.querySelectorAll('.particle')].map(n => n.getAttribute('cx'))));
    assert.deepEqual(pair[0], pair[1]);
    await page.locator('#temperature-up').click();
    assert.equal((await data()).phase, 'idle'); assert.equal(await time(), 0);
    assert.equal(await page.locator('[name=prediction]:checked').count(), 0);
    assert.deepEqual(await page.locator('.arrival-readout output').allTextContents(), ['—', '—']);
    assert.equal(await page.locator('#result').isHidden(), true);
    await page.clock.runFor(1000); assert.equal(await time(), 0);
    await page.locator('#tab-temperature').focus(); await page.keyboard.press('Home');
    assert.equal((await data()).mode, 'material'); assert.equal(await page.locator('.medium-row').count(), 3);
    assert.equal(await page.locator('#temperature-settings').isHidden(), true);
  });

  await t.test('optional arrival cues use real audio nodes and stop when muted or paused', async () => {
    await fresh(); await page.locator('#arrival-sound').check();
    await page.waitForFunction(() => window.__audioContext?.state === 'running');
    assert.equal(await page.evaluate(() => window.__oscillators.length), 0);
    await page.locator('#slowdown').selectOption('20'); await primary.click(); await page.clock.runFor(500);
    assert.equal(await page.evaluate(() => window.__oscillators.length), 1);
    assert.equal(await page.evaluate(() => window.__oscillators[0].frequency.value), 740);
    assert.equal(await page.evaluate(() => window.__oscillators[0].__started), true);
    await page.locator('#arrival-sound').uncheck(); await realWait(150); await page.clock.runFor(2000);
    assert.equal(await page.evaluate(() => window.__oscillators.length), 1);
    assert.equal(await page.evaluate(() => window.__oscillators[0].__ended), true);
    await page.locator('#arrival-sound').check();
    await page.locator('[data-group=steel] .source-hit').click(); await page.clock.runFor(500);
    assert.equal(await page.evaluate(() => window.__oscillators.length), 2);
    await primary.click(); await realWait(150); assert.equal(await page.evaluate(() => window.__oscillators[1].__ended), true);
    assert.equal(await page.locator('#audio-error').isHidden(), true);
  });

  await t.test('backgrounding pauses at the same model time and never resumes automatically', async () => {
    await fresh(); await primary.click(); await page.clock.runFor(2000);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal((await data()).phase, 'paused'); const saved = await time();
    await page.clock.runFor(2000); assert.equal(await time(), saved);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.clock.runFor(1000); assert.equal(await time(), saved);
    await primary.click(); await page.clock.runFor(1000); assert.ok(await time() > saved);
  });

  await t.test('touch, both modes and seven viewport widths keep the layout usable', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const mobile = await context.newPage();
    await mobile.clock.install({ time: new Date('2026-10-28T00:00:00Z') });
    await mobile.clock.pauseAt(new Date('2026-10-28T00:00:01Z'));
    await mobile.goto(url, { waitUntil: 'networkidle' });
    await mobile.locator('[data-group=steel] .source-hit').tap(); await mobile.clock.runFor(1000);
    assert.equal(await mobile.locator('#experiment-panel').getAttribute('data-phase'), 'running');
    const comparison = await mobile.locator('#models').boundingBox();
    assert.ok(comparison.y >= -1 && comparison.y + comparison.height <= 845, 'starting brings all three rows into view together');
    await mobile.locator('#primary-action').tap();
    await mobile.locator('#tab-temperature').tap();
    const range = await mobile.locator('#temperature').boundingBox();
    await mobile.touchscreen.tap(range.x + range.width * .4, range.y + range.height / 2);
    const temperature = Number(await mobile.locator('#temperature').inputValue());
    assert.ok(temperature >= 0 && temperature < 30);
    assert.equal(await mobile.locator('#temperature-value').textContent(), `${temperature}°C`);
    for (const mode of ['material', 'temperature']) {
      await mobile.locator(`#tab-${mode}`).tap();
      for (const width of [320, 390, 640, 768, 850, 1024, 1440]) {
        await mobile.setViewportSize({ width, height: 844 });
        assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${mode} must fit ${width}px`);
        const main = await mobile.locator('.card-main').boundingBox();
        for (const selector of ['.medium-row', '.controls', '.model-information', '#prediction-options']) {
          for (const box of await mobile.locator(selector).evaluateAll(nodes => nodes.map(n => ({ x: n.getBoundingClientRect().x, right: n.getBoundingClientRect().right })))) {
            assert.ok(box.x >= main.x - 1 && box.right <= main.x + main.width + 1, 'all content stays in the main column');
          }
        }
        const selectors = ['button', '.prediction-option', '#slowdown', '.sound-option'];
        if (mode === 'temperature') selectors.push('#temperature');
        for (const selector of selectors) for (const box of await mobile.locator(selector).evaluateAll(nodes => nodes.filter(n => n.getClientRects().length).map(n => n.getBoundingClientRect()).map(b => ({ width: b.width, height: b.height })))) {
          assert.ok(box.width >= 43.9 && box.height >= 43.9, `${selector} has a full touch target at ${width}px`);
        }
      }
    }
    await context.close();
  });
  assert.deepEqual(errors, []);
});
