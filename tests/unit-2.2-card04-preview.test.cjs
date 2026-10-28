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
    assert.deepEqual(groups.map(g => (1000 / g.speed).toFixed(3)), ['2.915', '0.676', '0.169']);
    assert.deepEqual(m.winners(groups), ['steel']);
  });
  await t.test('one kilometre and clamped travel positions use actual speed and elapsed seconds', () => {
    assert.equal(m.DISTANCE, 1000);
    assert.ok(Math.abs(m.reachedDistance(343,.3) - 102.9) < 1e-10);
    assert.equal(m.reachedDistance(1480,.3), 444);
    assert.equal(m.reachedDistance(5900,.3), 1000);
    assert.equal(m.reachedDistance(343,-1), 0);
    assert.equal(m.reachedDistance(343,100), 1000);
    assert.equal(m.reachedDistance(343,0), 0);
  });
  await t.test('temperature changes only the air speed, including a real tie at 20°C', () => {
    assert.equal(m.airSpeed(0), 331); assert.equal(m.airSpeed(20), 343); assert.equal(m.airSpeed(30), 349);
    assert.deepEqual(m.winners(m.conditions('temperature', 0)), ['reference']);
    assert.deepEqual(m.winners(m.conditions('temperature', 30)), ['adjustable']);
    assert.deepEqual(m.winners(m.conditions('temperature', 20)), ['reference', 'adjustable']);
    assert.ok(Math.abs((m.arrivalTime(343) - m.arrivalTime(349)) * 1000 - 6000000 / (343 * 349)) < 1e-12);
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
    assert.ok(Math.max(...values) > m.AMPLITUDE * .7 && Math.min(...values) < -m.AMPLITUDE * .7);
    assert.ok(values.every(v => Math.abs(v) <= m.AMPLITUDE));
    assert.equal(m.displacement(-.1), 0); assert.equal(m.displacement(m.PULSE_DURATION), 0);
  });
  await t.test('particles remain ordered, stay at fixed y and settle in every medium', () => {
    for (const group of m.conditions('material')) {
      const points = m.positions(group.kind), end = m.runEnd([group]);
      assert.equal(points[0].distance, 0); assert.equal(points.at(-1).distance, 1000);
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
  const particleXs = () => page.locator('.particle, .end-particle').evaluateAll(nodes => nodes.map(n => n.getAttribute('transform')));
  const setTemperature = async value => page.locator('#temperature').evaluate((n, v) => { n.value = String(v); n.dispatchEvent(new Event('input', { bubbles: true })); }, value);
  const realWait = ms => new Promise(resolve => setTimeout(resolve, ms));

  await t.test('initial scene uses the official characters, no orange tracking particle and no autoplay', async () => {
    await fresh();
    assert.equal((await data()).phase, 'idle'); assert.equal(await time(), 0);
    assert.equal(await page.locator('.medium-row').count(), 3);
    assert.equal(await page.locator('.particle').count(), 208);
    assert.equal(await page.locator('[name=prediction], .prediction, #prediction-feedback').count(), 0);
    assert.equal(await page.locator('#result').isHidden(), true);
    assert.equal(await page.evaluate(() => window.__audioContext), undefined);
    assert.equal(await page.locator('.speaker').first().evaluate(n => getComputedStyle(n, '::before').backgroundImage.includes('/shared-assets/characters/dialogue-character-avatars.png')), true);
    assert.equal(await page.locator('.particle').evaluateAll(nodes => nodes.every(n => Number(n.getAttribute('opacity')) === .64 && Math.abs(n.transform.baseVal.consolidate().matrix.e - Number(n.dataset.originX)) < .0001)), true);
    assert.equal(await page.locator('.particle [stroke-dasharray], .field path[stroke="#be773a"]').count(), 0);
    const before = await particleXs(); await page.clock.runFor(1000); assert.deepEqual(await particleXs(), before);
  });

  await t.test('material volumes and distinct molecules are embedded inside the animation', async () => {
    assert.equal(await page.locator('.specimen-button, .specimen-photo, #material-dialog').count(), 0);
    assert.equal(await page.locator('.field image, .zoom image').count(), 0);
    assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').some(r => r.name.includes('material-specimens.png'))), false);
    assert.deepEqual(await page.locator('.field .medium-scene').evaluateAll(nodes => nodes.map(n => n.dataset.material)), ['air','water','steel']);
    assert.equal(await page.locator('[data-group=air] .liquid-volume, [data-group=air] .steel-shell').count(), 0);
    for (const cls of ['liquid-volume','liquid-surface','water-side','glass-front','liquid-reflection']) assert.equal(await page.locator(`[data-group=water] .field .${cls}`).count(), 1);
    for (const cls of ['steel-shell','steel-top','steel-end','steel-cutaway']) assert.equal(await page.locator(`[data-group=steel] .field .${cls}`).count(), 1);
    assert.equal(await page.locator('.medium-interior > g .particle').count(), 208);
    assert.equal(await page.locator('.end-particle').evaluateAll(nodes => nodes.every(n => n.closest('.medium-scene') && n.parentElement.classList.contains('medium-interior'))), true);
    assert.equal(await page.locator('[data-group=air] .particle[data-species=nitrogen]').first().locator('.atom').count(), 2);
    assert.equal(await page.locator('[data-group=water] .particle').first().locator('.atom').count(), 3);
    assert.equal(await page.locator('[data-group=steel] .particle').first().locator('.atom').count(), 1);
    const waterAngle = await page.locator('[data-group=water] .particle').first().evaluate(group => {
      const h = [...group.querySelectorAll('[data-element=hydrogen]')].map(n => [Number(n.getAttribute('cx')), Number(n.getAttribute('cy'))]);
      return Math.acos((h[0][0] * h[1][0] + h[0][1] * h[1][1]) / Math.hypot(...h[0]) / Math.hypot(...h[1])) * 180 / Math.PI;
    });
    assert.ok(Math.abs(waterAngle - 104.5) < .0001);
    assert.ok(await page.locator('[data-group=steel] .elastic-link').count() > 120);
    assert.equal(await page.locator('.particle .atom').evaluateAll(nodes => nodes.every(n => n.getAttribute('fill').startsWith('url(#'))), true, 'visible atoms have material shading');
    assert.equal(await page.locator('#experiment-panel').evaluate(n => /預測|先猜|對錯/.test(n.textContent)), false);
  });

  await t.test('one compact panel gives the embedded scenes the main space and connects end observations', async () => {
    assert.equal(await page.locator('.comparison-board').count(), 1);
    const rows = await page.locator('.medium-row').evaluateAll(nodes => nodes.map(row => {
      const box = selector => { const b = row.querySelector(selector).getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, right: b.right, bottom: b.bottom }; };
      return { label: box('.medium-header'), field: box('.field'), end: box('.end-observation'), body: box('.row-body'), row: { y: row.getBoundingClientRect().y, bottom: row.getBoundingClientRect().bottom } };
    }));
    assert.ok(rows.at(-1).row.bottom - rows[0].row.y < 560, 'all three media fit in a compact comparison');
    for (const row of rows) {
      assert.ok(row.label.right < row.field.x, 'material label sits beside the model');
      assert.ok(row.field.width >= row.label.width * 4.5 && row.field.height >= 100, 'vibration is the main visual');
      assert.ok(Math.abs(row.field.right - row.end.x) < 1.1, 'end observation directly joins the field');
      assert.ok(Math.abs(row.end.bottom - row.body.bottom) < 1.1);
    }
    assert.equal(await page.locator('.end-connection').count(), 3);
    assert.equal(await page.locator('.end-observation .arrival-readout').count(), 3);
  });

  await t.test('vibration begins locally and steel reaches the end while water and air remain still there', async () => {
    await primary.click(); await page.clock.runFor(4000);
    assert.ok(await time() > .199 && await time() < .201);
    const readings = await page.locator('.arrival-readout output').allTextContents();
    assert.deepEqual(readings, ['—', '—', '0.169 秒']);
    for (const id of ['air', 'water']) assert.equal(await page.locator(`[data-group=${id}] .end-particle`).first().evaluate(n => n.transform.baseVal.consolidate().matrix.e), 75);
    assert.notEqual(await page.locator('[data-group=steel] .end-particle').first().evaluate(n => n.transform.baseVal.consolidate().matrix.e), 75);
    const reached = await page.locator('.medium-row').evaluateAll(rows => rows.map(row => row.querySelectorAll('.particle[data-reached=true]').length / row.querySelectorAll('.particle').length));
    const m = await model, current = await time();
    assert.deepEqual(reached, m.conditions('material').map(g => { const points = m.positions(g.kind); return points.filter(p => p.distance <= g.speed * current).length / points.length; }));
    assert.ok(reached[0] < reached[1] && reached[1] < reached[2] && reached[2] === 1);
    assert.match(await page.locator('#observation-caption').textContent(), /鋼已傳到/);
    const { start, end, endpoints } = await page.locator('[data-group=steel]').evaluate(row => {
      const link = row.querySelector('.elastic-link'), particles = row.querySelectorAll('.particle');
      return { start: link.getPointAtLength(0).x, end: link.getPointAtLength(link.getTotalLength()).x,
        endpoints: [Number(link.dataset.first), Number(link.dataset.second)].map(i => particles[i].transform.baseVal.consolidate().matrix.e) };
    });
    assert.ok(Math.abs(start - endpoints[0] - 3.8) < .002 && Math.abs(end - endpoints[1] + 3.8) < .002);

  });

  await t.test('distance markers, reached rails and readable metre values follow speed times time', async () => {
    const saved = await time(), m = await model;
    assert.ok(saved > .199 && saved < .201);
    const frontState = () => page.locator('.medium-row').evaluateAll(rows => rows.map(row => ({
      distance: Number(row.dataset.reachedDistance), speed: Number(row.dataset.speed),
      x: row.querySelector('.propagation-front').transform.baseVal.consolidate().matrix.e,
      visibility: row.querySelector('.propagation-front').getAttribute('visibility'),
      rail: row.querySelector('.distance-reached').getAttribute('d'),
      text: row.querySelector('.propagation-readout output').textContent
    })));
    const rows = await frontState();
    assert.ok(rows[0].distance < rows[1].distance && rows[1].distance < rows[2].distance);
    for (const row of rows) {
      const distance = Math.min(1000, row.speed * saved), x = m.START_X + distance / 1000 * (m.END_X - m.START_X);
      assert.ok(Math.abs(row.distance - distance) < .00011);
      assert.ok(Math.abs(row.x - x) < .00011);
      assert.equal(row.rail, `M${m.START_X} 125H${x.toFixed(4)}`);
      assert.equal(row.visibility, 'visible');
      assert.match(row.text, new RegExp(Math.floor(distance + 1e-8).toLocaleString('en-US') + ' 公尺'));
    }
    assert.match(rows[2].text, /已到終點/);
  });

  await t.test('pause, resume, exact stepping and a shared speed change keep one timeline', async () => {
    await primary.click(); const paused = await time(), snapshot = await particleXs();
    const markers = await page.locator('.propagation-front, .distance-reached').evaluateAll(nodes => nodes.map(n => [n.getAttribute('transform'),n.getAttribute('d')]));
    await page.clock.runFor(2000); assert.equal(await time(), paused); assert.deepEqual(await particleXs(), snapshot);
    assert.deepEqual(await page.locator('.propagation-front, .distance-reached').evaluateAll(nodes => nodes.map(n => [n.getAttribute('transform'),n.getAttribute('d')])), markers);
    await page.locator('#step-action').click(); assert.ok(Math.abs(await time() - paused - .02) < 1e-7);
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

  await t.test('teaching results retain actual times and rest positions without prediction or grading', async () => {
    await fresh();
    await page.locator('#slowdown').selectOption('20'); await primary.click(); await page.clock.fastForward(70000);
    assert.equal((await data()).phase, 'complete');
    assert.deepEqual(await page.locator('.arrival-readout output').allTextContents(), ['2.915 秒', '0.676 秒', '0.169 秒']);
    assert.equal(await page.locator('#result-rows tr').count(), 3);
    assert.match(await page.locator('#result-summary').textContent(), /鋼最先、水其次、空氣最後/);
    assert.equal(await page.locator('#result-title').textContent(), '觀察結果');
    assert.equal(await page.locator('.particle').evaluateAll(nodes => nodes.every(n => Math.abs(n.transform.baseVal.consolidate().matrix.e - Number(n.dataset.originX)) < .0001)), true);
    assert.equal(await page.locator('.end-particle').evaluateAll(nodes => nodes.every(n => n.transform.baseVal.consolidate().matrix.e === 75)), true);
    await page.locator('#step-action').click(); assert.equal((await data()).phase, 'paused'); assert.equal(await time(), .02);
    await page.locator('#reset-action').click(); assert.equal(await time(), 0); assert.equal(await page.locator('#result').isHidden(), true);
    assert.equal(await page.locator('[name=prediction]').count(), 0);
    assert.deepEqual(await page.locator('.propagation-readout output').allTextContents(), ['0 公尺','0 公尺','0 公尺']);
    assert.equal(await page.locator('.propagation-front').evaluateAll(nodes => nodes.every(n => n.getAttribute('visibility') === 'hidden')), true);
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
    for (const [temperature, expected] of [[30, /早約 0\.050 秒/], [0, /早約 0\.106 秒/], [20, /振動同時傳到/]]) {
      await setTemperature(temperature);
      await primary.click(); await page.clock.fastForward(70000);
      assert.equal((await data()).phase, 'complete');
      assert.match(await page.locator('#result-summary').textContent(), expected);
      assert.equal(await page.locator('#result-title').textContent(), '觀察結果');
      assert.equal(await page.locator('#result-rows tr').count(), 2);
      if (temperature === 20) assert.deepEqual(await page.locator('.arrival-readout output').allTextContents(), ['2.915 秒', '2.915 秒']);
    }
  });

  await t.test('changing conditions clears running results and a tie has identical live motion', async () => {
    await primary.click(); await page.clock.runFor(500);
    const pair = await page.locator('.medium-row').evaluateAll(rows => rows.map(row => [...row.querySelectorAll('.particle')].map(n => n.getAttribute('transform'))));
    assert.deepEqual(pair[0], pair[1]);
    await page.locator('#temperature-up').click();
    assert.equal((await data()).phase, 'idle'); assert.equal(await time(), 0);
    assert.equal(await page.locator('[name=prediction], .prediction, #prediction-feedback').count(), 0);
    assert.deepEqual(await page.locator('.arrival-readout output').allTextContents(), ['—', '—']);
    assert.equal(await page.locator('#result').isHidden(), true);
    await page.clock.runFor(1000); assert.equal(await time(), 0);
    await page.locator('#tab-temperature').focus(); await page.keyboard.press('Home');
    assert.equal((await data()).mode, 'material'); assert.equal(await page.locator('.medium-row').count(), 3);
    assert.equal(await page.locator('#temperature-settings').isHidden(), true);
  });

  await t.test('medium surface detail follows the same travel delay and stops on pause', async () => {
    await fresh(); await primary.click(); await page.clock.runFor(2000); await primary.click();
    const t0 = await time(), m = await model;
    const surfaces = await page.locator('.surface-sample').evaluateAll(nodes => nodes.map(n => ({
      x: n.transform.baseVal.consolidate().matrix.e, origin: Number(n.dataset.originX),
      distance: Number(n.dataset.distance), speed: Number(n.closest('.medium-row').dataset.speed)
    })));
    assert.equal(surfaces.length, 36);
    assert.ok(surfaces.some(p => Math.abs(p.x - p.origin) > .01));
    for (const p of surfaces) assert.ok(Math.abs(p.x - m.sample({ x:p.origin, distance:p.distance },p.speed,t0).x) < .00011);
    const before = await page.locator('.surface-sample').evaluateAll(nodes => nodes.map(n => n.getAttribute('transform')));
    await page.clock.runFor(1000);
    assert.deepEqual(await page.locator('.surface-sample').evaluateAll(nodes => nodes.map(n => n.getAttribute('transform'))), before);
    await page.locator('#reset-action').click();
    assert.equal(await page.locator('.surface-sample').evaluateAll(nodes => nodes.every(n => Math.abs(n.transform.baseVal.consolidate().matrix.e - Number(n.dataset.originX)) < .0001)), true);
  });

  await t.test('molecules stay within the material cross sections throughout the pulse', async () => {
    await fresh();
    await page.locator('#slowdown').selectOption('20'); await primary.click();
    for (let i = 0; i < 12; i++) {
      await page.clock.fastForward(5500);
      const escaped = await page.locator('.field .particle').evaluateAll(nodes => nodes.flatMap(n => {
        const interior = n.closest('.medium-interior'), id = interior.getAttribute('clip-path').slice(5,-1);
        const clip = document.getElementById(id).querySelector('rect');
        const x = Number(clip.getAttribute('x')), y = Number(clip.getAttribute('y'));
        const right = x + Number(clip.getAttribute('width')), bottom = y + Number(clip.getAttribute('height'));
        const b = n.getBBox(), transform = n.transform.baseVal.consolidate().matrix;
        const out = b.x + transform.e < x - .1 || b.x + b.width + transform.e > right + .1 || b.y + transform.f < y - .1 || b.y + b.height + transform.f > bottom + .1;
        return out ? [n.closest('.medium-row').dataset.group + ':' + n.dataset.originX + ':' + n.dataset.originY] : [];
      }));
      assert.deepEqual(escaped, []);
    }
  });

  await t.test('optional arrival cues use real audio nodes and stop when muted or paused', async () => {
    await fresh(); await page.locator('#arrival-sound').check();
    await page.waitForFunction(() => window.__audioContext?.state === 'running');
    assert.equal(await page.evaluate(() => window.__oscillators.length), 0);
    await page.locator('#slowdown').selectOption('20'); await primary.click(); await page.clock.runFor(3500);
    assert.equal(await page.evaluate(() => window.__oscillators.length), 1);
    assert.equal(await page.evaluate(() => window.__oscillators[0].frequency.value), 740);
    assert.equal(await page.evaluate(() => window.__oscillators[0].__started), true);
    await page.locator('#arrival-sound').uncheck(); await realWait(150); await page.clock.runFor(2000);
    assert.equal(await page.evaluate(() => window.__oscillators.length), 1);
    assert.equal(await page.evaluate(() => window.__oscillators[0].__ended), true);
    await page.locator('#arrival-sound').check();
    await page.locator('[data-group=steel] .source-hit').click(); await page.clock.runFor(3500);
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
        for (const selector of ['.medium-row', '.controls', '.model-information']) {
          for (const box of await mobile.locator(selector).evaluateAll(nodes => nodes.map(n => ({ x: n.getBoundingClientRect().x, right: n.getBoundingClientRect().right })))) {
            assert.ok(box.x >= main.x - 1 && box.right <= main.x + main.width + 1, 'all content stays in the main column');
          }
        }
        const selectors = ['button', '#slowdown', '.sound-option'];
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
