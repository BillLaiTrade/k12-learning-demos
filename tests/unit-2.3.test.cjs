const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { existsSync, mkdirSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

test('2.3: eight-section learning flow and independent controls work in browser', { timeout: 180000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: path.resolve(__dirname, '../..'), stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    let output = ''; const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    server.stdout.on('data', b => { output += b; const m = output.match(/port (\d+)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
    server.once('error', e => { clearTimeout(timer); reject(e); });
    server.once('exit', c => { clearTimeout(timer); reject(new Error('Server exited: ' + c)); });
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const failures = [];
  page.on('pageerror', e => failures.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failures.push(r.url()); });
  page.on('requestfailed', r => failures.push(r.url()));
  await page.clock.install();
  const base = process.env.AIR_BASE_URL || `http://127.0.0.1:${port}/k12-learning-demos/`;
  await page.goto(base + 'units/2/parts/2.3/', { waitUntil: 'networkidle' });
  const artifacts = process.env.AIR_ARTIFACT_DIR ? path.resolve(process.env.AIR_ARTIFACT_DIR) : path.resolve(__dirname, '../docs/reviews/unit-2.3-initial'); mkdirSync(artifacts, { recursive: true });
  const captureCup = async name => {
    await page.evaluate(() => { document.activeElement?.blur(); const el = document.querySelector('#s1'); window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top, behavior: 'instant' }); });
    await page.locator('#s1').screenshot({ path: path.join(artifacts, name) });
  };
  const pointOnCup = (x, y, target = page) => target.evaluate(({ x, y }) => {
    const el = document.querySelector('#cup-scene .cup-glass'), matrix = el.getScreenCTM();
    if (!matrix) throw new Error('Cup is not rendered');
    const p = new DOMPoint(x, y).matrixTransform(matrix); return { x: p.x, y: p.y };
  }, { x, y });
  const rotateRim = async delta => {
    await page.clock.runFor(100);
    await page.locator('#cup-scene').scrollIntoViewIfNeeded();
    const center = await pointOnCup(0, 0), rim = await pointOnCup(0, 90);
    const radius = Math.hypot(rim.x - center.x, rim.y - center.y), start = Math.atan2(rim.y - center.y, rim.x - center.x);
    await page.mouse.move(rim.x, rim.y); await page.mouse.down();
    assert.equal(await page.locator('#cup-scene').getAttribute('data-drag-mode'), 'rotate', 'rim receives rotation gesture');
    for (let i = 1; i <= 8; i++) { const a = start - delta * Math.PI / 180 * i / 8; await page.mouse.move(center.x + Math.cos(a) * radius, center.y + Math.sin(a) * radius); }
    await page.mouse.up();
  };
  const phase = () => page.locator('html').getAttribute('data-phase');
  const volume = () => page.locator('#reaction-scene').getAttribute('data-volume').then(Number);

  await t.test('eight matching anchors, shared avatars, and unit entry', async () => {
    assert.equal(await page.locator('.lesson').count(), 8);
    assert.equal(await page.locator('.route a').count(), 8);
    assert.match(await page.title(), /2\.3/);
    assert.equal(await page.locator('#s8 form').count(), 1);
    assert.equal(await page.locator('#s1 .avatar').first().evaluate(el => getComputedStyle(el).backgroundImage.includes('shared-assets/characters')), true);
    const overview = await page.request.get(base + 'units/2/');
    assert.match(await overview.text(), /href="parts\/2\.3\/index.html"/);
    await page.screenshot({ path: path.join(artifacts, 'desktop.png') });
  });

  await t.test('seven teaching sections follow 1.1 side titles and main headings across screen sizes', async () => {
    for (const width of [1440, 1024, 820, 760, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.clock.runFor(100);
      const layout = await page.evaluate(() => [...document.querySelectorAll('.lesson:not(.unit-quiz)')].map(el => {
        const side = el.querySelector(':scope > .lesson-side');
        const main = el.querySelector(':scope > .lesson-body');
        const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; };
        return { id: el.id, side: box(side), main: box(main), title: side.querySelector('h3').textContent,
          number: side.querySelector('.lesson-number').textContent, role: !!side.querySelector('.lesson-role').textContent,
          mainHeading: main.firstElementChild.tagName, fontSmall: parseFloat(getComputedStyle(side.querySelector('h3')).fontSize),
          fontLarge: parseFloat(getComputedStyle(main.querySelector('h2')).fontSize),
          line: getComputedStyle(side)[innerWidth > 760 ? 'borderRightWidth' : 'borderBottomWidth'] };
      }));
      assert.equal(layout.length, 7);
      layout.forEach((el, i) => {
        assert.equal(el.number, String(i + 1).padStart(2, '0'));
        assert.ok(el.title && el.role);
        assert.equal(el.mainHeading, 'H2');
        assert.ok(el.fontLarge > el.fontSmall, `${width} ${el.id}: title hierarchy`);
        assert.equal(el.line, '1px');
        if (width > 760) {
          assert.ok(el.side.right < el.main.x, `${width} ${el.id}: left / right columns`);
          assert.ok(Math.abs(el.side.y - el.main.y) < 1, `${width} ${el.id}: aligned tops`);
        } else {
          assert.ok(el.side.bottom < el.main.y, `${width} ${el.id}: stacked columns`);
        }
      });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}: no horizontal overflow`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.clock.runFor(100);
    await captureCup('columns-desktop.png');
  });

  await t.test('cup first drag stays vertical until release; dragging the rim then rotates both ways', async () => {
    await page.locator('#cup-reset').click(); await page.locator('#cup-scene').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#s1 .cup-callout, #s1 .cup-parts, #cup-hint').count(), 0);
    assert.equal(await page.locator('#cup-scene image[href*="cup-paper"]').getAttribute('width'), '64');
    const rim = await pointOnCup(0, 90), centerBefore = await pointOnCup(0, 0);
    const scale = await page.locator('#cup-scene svg').evaluate(el => { const m = el.getScreenCTM(); return Math.hypot(m.c, m.d) * 24; });
    await page.mouse.move(rim.x, rim.y); await page.mouse.down();
    await page.mouse.move(rim.x + 60, rim.y + 13 * scale, { steps: 12 });
    assert.equal(Number(await page.locator('#cup-scene').getAttribute('data-angle')), 0);
    assert.equal(await page.locator('#cup-scene').getAttribute('data-rotation-unlocked'), 'false');
    await page.mouse.up();
    assert.ok(Math.abs(Number(await page.locator('#cup-scene').getAttribute('data-depth')) - 12) < .05);
    assert.equal(await page.locator('#cup-scene').getAttribute('data-rotation-unlocked'), 'true');
    assert.equal(await page.locator('#cup-scene').getAttribute('data-wet'), 'false');
    assert.ok(Math.abs((await pointOnCup(0, 0)).x - centerBefore.x) < 1);
    const depth = Number(await page.locator('#cup-scene').getAttribute('data-depth'));
    await rotateRim(70);
    assert.ok(Math.abs(Number(await page.locator('#cup-scene').getAttribute('data-angle')) - 70) < 1);
    assert.equal(Number(await page.locator('#cup-scene').getAttribute('data-depth')), depth);
    await rotateRim(-110);
    assert.ok(Math.abs(Number(await page.locator('#cup-scene').getAttribute('data-angle')) + 40) < 1, 'reverse rim drag: ' + await page.locator('#cup-scene').getAttribute('data-angle'));
    await page.locator('#cup-reset').click();
    assert.equal(await page.locator('#cup-scene').getAttribute('data-rotation-unlocked'), 'false');
  });

  await t.test('guided cup immersion, pause, tilt and comparison follow the approved proposal', async () => {
    await page.locator('#cup-reset').click();
    assert.equal(await page.locator('#cup-comparison').isVisible(), false);
    await page.locator('#cup-action').click(); await page.clock.runFor(2100);
    assert.equal(await page.locator('#cup-scene').getAttribute('data-submerged'), 'true');
    assert.equal(await page.locator('#cup-scene').getAttribute('data-paper-below'), 'true');
    assert.equal(await page.locator('#cup-scene').getAttribute('data-wet'), 'false');
    assert.equal(await page.locator('#cup-scene').getAttribute('data-within-tank'), 'true');
    await captureCup('cup-immersed.png');
    await page.locator('#cup-action').click(); await page.clock.runFor(650);
    await page.locator('#cup-action').click();
    const angle = await page.locator('#cup-scene').getAttribute('data-angle');
    await page.clock.runFor(500); assert.equal(await page.locator('#cup-scene').getAttribute('data-angle'), angle);
    await page.locator('#cup-action').click(); await page.clock.runFor(3700);
    assert.equal(await page.locator('#cup-scene').getAttribute('data-wet'), 'true');
    assert.equal(Number(await page.locator('#cup-scene').getAttribute('data-escaped')), 1);
    assert.equal(await page.locator('#cup-comparison').isVisible(), true);
    assert.equal(await page.locator('#cup-conclusion').isVisible(), true);
    await captureCup('cup-complete.png');
    await page.locator('[data-cup-preview="before"]').click();
    assert.match(await page.locator('#cup-status').innerText(), /回看直立入水/);
    assert.equal(await page.locator('#cup-scene').getAttribute('data-wet'), 'true', 'preview does not dry the current paper');
    await captureCup('cup-mock-comparison.png');
    await page.locator('#cup-action').click(); await page.locator('#cup-action').click(); await page.clock.runFor(3500);
    assert.match(await page.locator('#cup-status').innerText(), /不會自動補回/);
  });

  await t.test('cup detail, manual controls, keyboard, drag and fresh paper work', async () => {
    await page.locator('#cup-reset').click();
    assert.equal(await page.locator('#cup-scene').getAttribute('data-depth'), '-1');
    assert.equal(await page.locator('#cup-comparison').isVisible(), false);
    await page.locator('.cup-free summary').click();
    await page.locator('#cup-depth').fill('12'); await page.locator('#cup-angle').fill('40');
    await page.locator('#cup-zoom-toggle').click(); assert.equal(await page.locator('#cup-zoom').isVisible(), true);
    assert.equal(await page.locator('#cup-zoom svg').count(), 1);
    assert.equal(await page.locator('#s1 [data-cup-hint]').count(), 0);
    await page.locator('#cup-scene').focus(); await page.keyboard.press('ArrowRight');
    assert.equal(Number(await page.locator('#cup-scene').getAttribute('data-angle')), 45);
    await rotateRim(25);
    assert.ok(Math.abs(Number(await page.locator('#cup-scene').getAttribute('data-angle')) - 70) < 1);
    await page.locator('#cup-reset').click();
    assert.equal(await page.locator('#cup-scene').getAttribute('data-wet'), 'false');
    assert.equal(await page.locator('#cup-zoom').isVisible(), false);
    assert.equal(await page.locator('#cup-conclusion').isVisible(), false);
  });

  await t.test('initial record gates reaction; pause retains state', async () => {
    assert.equal(await page.locator('#experiment-start').isDisabled(), true);
    await page.locator('#setup-scene [data-tool-target="scale"]').click();
    assert.match(await page.locator('#tool-copy').innerText(), /不是容器容量或水量/);
    await page.locator('button[data-tool="wool"]').click();
    await page.locator('#record-before').click(); assert.equal(await phase(), 'prepared');
    await page.locator('#experiment-start').click();
    await page.clock.runFor(3000);
    assert.ok(await volume() < 100 && await volume() > 79);
    await page.locator('#experiment-pause').click(); const saved = await volume();
    await page.clock.runFor(1000); assert.equal(await volume(), saved);
    assert.equal(await page.locator('#record-after').isDisabled(), true);
    await page.locator('#experiment-pause').click(); await page.clock.runFor(10000);
    assert.equal(await phase(), 'settled'); assert.equal((await volume()).toFixed(1), '79.3');
  });

  await t.test('waiting and water-level alignment are required before final recording', async () => {
    assert.equal(await page.locator('#experiment-align').isDisabled(), true);
    await page.locator('#experiment-wait').click(); await page.clock.runFor(3200);
    assert.equal(await phase(), 'stable');
    await page.locator('#experiment-align').click(); await page.clock.runFor(1400);
    assert.equal(await phase(), 'aligned'); assert.equal((await volume()).toFixed(1), '79.0');
    assert.ok(Math.abs(Number(await page.locator('#reaction-scene').getAttribute('data-water'))) < 1e-7);
    await page.locator('#record-after').click(); assert.equal(await phase(), 'recorded');
    await page.locator('#show-control').check();
    assert.equal(Number(await page.locator('#control-scene').getAttribute('data-volume')).toFixed(1), '100.0');
    assert.match(await page.locator('[data-record="after"]').first().innerText(), /79\.0/);
    await page.locator('#show-ratio').click(); assert.match(await page.locator('#ratio-result').innerText(), /21%/);
    await page.locator('#experiment-time').fill('0');
    assert.equal((await volume()).toFixed(1), '100.0');
    assert.match(await page.locator('[data-record="after"]').first().innerText(), /79\.0/);
    await page.locator('#experiment-live').click();
    await page.locator('#show-control').uncheck(); await page.locator('#s3').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(artifacts, 'experiment.png') });
  });

  await t.test('composition selection, splint samples and humid/dry basis', async () => {
    assert.equal(await page.locator('.tile.nitrogen').count(), 78);
    assert.equal(await page.locator('.tile.oxygen').count(), 21);
    assert.equal(await page.locator('.tile.other').count(), 1);
    await page.locator('[data-gas="other"]').click(); assert.equal(await page.locator('.tile:not(.dim)').count(), 1);
    await page.locator('[data-gas="all"]').click(); assert.equal(await page.locator('.tile.dim').count(), 0);
    await page.locator('#splint-in').click(); assert.equal(await page.locator('#splint-scene').getAttribute('data-burning'), 'true');
    await page.locator('button[data-sample="nitrogen"]').click();
    assert.equal(await page.locator('#splint-scene').getAttribute('data-burning'), 'false');
    await page.locator('#splint-in').click(); assert.match(await page.locator('#splint-status').innerText(), /不能唯一鑑定/);
    await page.locator('[data-water="2"]').click();
    const sum = await page.locator('#humidity-chart [data-value]').evaluateAll(nodes => nodes.reduce((s, n) => s + Number(n.dataset.value), 0));
    assert.ok(Math.abs(sum - 100) < 1e-8);
    assert.match(await page.locator('#humidity-values').innerText(), /76\.44/);
    await page.locator('#dry-only').check(); assert.match(await page.locator('#humidity-values').innerText(), /78%/);
  });

  await t.test('one integrated report has actionable feedback and independent reset', async () => {
    await page.locator('#report-form button[type="submit"]').click();
    assert.equal(await page.locator('#report-feedback').getAttribute('data-result'), 'incomplete');
    await page.locator('[name="loss"]').fill('30'); await page.locator('[name="percent"]').fill('25');
    await page.locator('[value="mixture"]').check(); await page.locator('[value="wood"]').check();
    await page.locator('#report-form button[type="submit"]').click();
    assert.equal(await page.locator('#report-feedback').getAttribute('data-result'), 'revise');
    assert.match(await page.locator('#report-feedback').innerText(), /150/);
    await page.locator('[name="percent"]').fill('20'); assert.equal(await page.locator('#report-feedback').isVisible(), false);
    await page.locator('#report-form button[type="submit"]').click();
    assert.equal(await page.locator('#report-feedback').getAttribute('data-result'), 'correct');
    await page.locator('#report-form button[type="reset"]').click();
    assert.equal(await page.locator('[name="loss"]').inputValue(), '');
    assert.match(await page.locator('[data-record="after"]').first().innerText(), /79\.0/);
    await page.locator('#experiment-reset').click(); assert.equal(await phase(), 'ready');
    assert.equal(await page.locator('#ratio-result').isVisible(), false);
    assert.match(await page.locator('[data-record="after"]').first().innerText(), /尚未記錄/);
  });

  await t.test('narrow viewport, keyboard focus, and reduced motion stay usable', async () => {
    await page.evaluate(() => document.activeElement?.blur());
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.runFor(300);
    await page.evaluate(() => document.querySelector('#s7').scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.clock.runFor(100);
    assert.equal(await page.locator('.route a[aria-current]').getAttribute('href'), '#s7');
    for (let i = 1; i <= 8; i++) {
      await page.evaluate(n => document.querySelector('#s' + n).scrollIntoView({ behavior: 'instant', block: 'start' }), i);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'section ' + i);
    }
    await page.evaluate(() => document.querySelector('#s7').scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.screenshot({ path: path.join(artifacts, 'mobile.png') });
    const reduced = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 }, hasTouch: true });
    await reduced.goto(base + 'units/2/parts/2.3/', { waitUntil: 'networkidle' });
    await reduced.locator('#cup-action').click(); await reduced.locator('#cup-action').click();
    assert.equal(await reduced.locator('#cup-comparison').isVisible(), true);
    assert.equal(await reduced.locator('#cup-scene').getAttribute('data-wet'), 'true');
    await reduced.locator('#cup-zoom-toggle').click(); assert.equal(await reduced.locator('#cup-zoom').isVisible(), true);
    assert.equal(await reduced.locator('#s1 [data-cup-hint]').count(), 0);
    assert.equal(await reduced.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await reduced.locator('#cup-zoom-toggle').click();
    await reduced.locator('[data-cup-preview="before"]').click();
    await reduced.evaluate(() => { document.activeElement?.blur(); const el = document.querySelector('#s1'); window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top, behavior: 'instant' }); });
    await reduced.locator('#s1').screenshot({ path: path.join(artifacts, 'cup-mobile.png') });
    await reduced.locator('#cup-reset').click(); await reduced.locator('#cup-scene').scrollIntoViewIfNeeded();
    const touch = await reduced.context().newCDPSession(reduced);
    const rim = await pointOnCup(0, 90, reduced);
    const pixels = await reduced.locator('#cup-scene svg').evaluate(el => { const m = el.getScreenCTM(); return Math.hypot(m.c, m.d) * 24; });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rim.x, y: rim.y }] });
    for (let i = 1; i <= 8; i++) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: rim.x + i * 2, y: rim.y + 13 * pixels * i / 8 }] });
    assert.equal(Number(await reduced.locator('#cup-scene').getAttribute('data-angle')), 0);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal(await reduced.locator('#cup-scene').getAttribute('data-rotation-unlocked'), 'true');
    const center = await pointOnCup(0, 0, reduced), end = await pointOnCup(0, 90, reduced), radius = Math.hypot(end.x - center.x, end.y - center.y), start = Math.atan2(end.y - center.y, end.x - center.x);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: end.x, y: end.y }] });
    for (let i = 1; i <= 8; i++) { const a = start - 80 * Math.PI / 180 * i / 8; await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) }] }); }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.ok(Math.abs(Number(await reduced.locator('#cup-scene').getAttribute('data-angle')) - 80) < 1);
    assert.equal(await reduced.locator('#cup-scene').getAttribute('data-wet'), 'true');
    await touch.detach();
    await reduced.locator('#record-before').click(); await reduced.locator('#experiment-start').click();
    assert.equal(await reduced.locator('html').getAttribute('data-phase'), 'settled');
    await reduced.locator('#experiment-wait').click(); await reduced.locator('#experiment-align').click(); await reduced.locator('#record-after').click();
    assert.match(await reduced.locator('[data-record="after"]').first().innerText(), /79\.0/);
    await reduced.close();
  });
  assert.deepEqual(failures, [], 'no broken resources or browser errors');
});
