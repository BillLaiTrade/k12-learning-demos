const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { expect } = require('playwright/test');

test('4.2 fifth activity: approved three-step comparison, exact optics and interactions', { timeout: 120000 }, async t => {
  const root = path.resolve(__dirname, '..');
  const geometry = await import(pathToFileURL(path.join(root, 'units/4/parts/4.2/assets/curved-mirrors-geometry.mjs')));
  const { reflectionAt, mirrorOutline, OPTICS, imageExample, visibleRayEnd } = geometry;
  const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} must equal ${b}`);
  const modes = ['plane', 'concave', 'convex'];

  await t.test('normal is radial and perpendicular to the surface; both reflection angles agree', () => {
    for (const mode of modes) {
      for (const offset of [...OPTICS.offsets, OPTICS.reasonOffset]) {
        const ray = reflectionAt(mode, offset), { point: p, normal: n, direction: r, angle } = ray;
        near(Math.hypot(...n), 1); near(Math.hypot(...r), 1);
        assert.ok(r[0] < 0, 'Reflected light returns to the illuminated side');
        if (mode !== 'plane') {
          const cx = OPTICS.vertex + (mode === 'concave' ? -OPTICS.radius : OPTICS.radius);
          const radial = [p[0] - cx, p[1] - OPTICS.centerY];
          near(Math.hypot(...radial), OPTICS.radius);
          near(radial[0] * n[1] - radial[1] * n[0], 0);
        } else near(p[0], OPTICS.vertex);
        const a = reflectionAt(mode, offset - 0.0001).point;
        const b = reflectionAt(mode, offset + 0.0001).point;
        near((b[0] - a[0]) * n[0] + (b[1] - a[1]) * n[1], 0, 1e-7);
        const tangent = [-n[1], n[0]];
        near(r[0] * tangent[0] + r[1] * tangent[1], tangent[0]);
        near(r[0] * n[0] + r[1] * n[1], -n[0]);
        near(Math.acos(Math.min(1, r[0] * n[0] + r[1] * n[1])) * 180 / Math.PI, angle);
        const end = visibleRayEnd(ray);
        assert.ok(end[0] >= 20 - 1e-8 && end[1] >= 18 - 1e-8 && end[1] <= 202 + 1e-8);
        near((end[0] - p[0]) * r[1] - (end[1] - p[1]) * r[0], 0);
        if (mode === 'concave' && offset && OPTICS.offsets.includes(offset)) {
          const x = p[0] - offset / r[1] * r[0];
          assert.ok(Math.abs(x - (OPTICS.vertex - OPTICS.radius / 2)) < 2);
          assert.ok(x > end[0] && x < p[0], 'Ray continues beyond convergence');
        }
        if (mode === 'convex' && offset) assert.ok(Math.abs(end[1] - OPTICS.centerY) > Math.abs(offset));
      }
      const outline = mirrorOutline(mode);
      const vertex = outline.find(p => p[1] === OPTICS.centerY);
      // Odd aperture values sample odd offsets; the unsampled vertex remains exact.
      near((vertex || reflectionAt(mode, 0).point)[0], OPTICS.vertex);
    }
    assert.ok(reflectionAt('concave', OPTICS.reasonOffset).normal[1] > 0, 'Upper concave normal points left/down');
    assert.ok(reflectionAt('convex', OPTICS.reasonOffset).normal[1] < 0, 'Upper convex normal points left/up');
  });

  await t.test('toy appearance magnification follows the stated near/far mirror model', () => {
    for (const [mode, position, m] of [['plane', 'near', 1], ['concave', 'near', 1.5], ['concave', 'far', -0.5], ['convex', 'near', 2 / 3]]) {
      const model = imageExample(mode, position);
      near(model.magnification, m);
      if (mode !== 'plane') near(1 / model.objectDistance + 1 / model.imageDistance, mode === 'convex' ? -1 : 1);
      assert.equal(model.imageDistance > 0, m < 0);
    }
  });

  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Static server did not start')), 5000);
    server.stdout.on('data', chunk => { output += chunk; const m = output.match(/port (\d+)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
    server.once('error', reject);
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('requestfailed', request => failures.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
  const url = `http://127.0.0.1:${port}/units/4/parts/4.2/#card-05`;
  await page.goto(url, { waitUntil: 'networkidle' });
  const section = page.locator('#card-05');

  await t.test('all three stages and three mirror columns are visible together in the approved order', async () => {
    assert.deepEqual(await section.locator('.mirror-step-head h3').allTextContents(), ['1先看差異', '2再看原因', '3最後看成像']);
    await expect(section.locator('.mirror-step')).toHaveCount(3);
    for (const row of await section.locator('.mirror-columns').all()) {
      assert.deepEqual(await row.locator('.mirror-column-title').allTextContents(), ['平面鏡', '凹面鏡', '凸面鏡']);
    }
    assert.equal(await section.locator('#mirror-detail,.mirror-option,.mirror-appearance-grid,.mirror-uses').count(), 0);
    for (const mode of modes) {
      const paths = await section.locator(`[data-reason="${mode}"] .mirror-normal path`).getAttribute('d');
      const nums = paths.match(/-?\d+(?:\.\d+)?/g).map(Number);
      const { point: p, normal: n } = reflectionAt(mode, OPTICS.reasonOffset);
      near((nums[0] - p[0]) * n[1] - (nums[1] - p[1]) * n[0], 0, 0.001);
      near((nums[2] - p[0]) * n[1] - (nums[3] - p[1]) * n[0], 0, 0.001);
      for (const reason of [false, true]) {
        const svg = section.locator(`[data-${reason ? 'reason' : 'overview'}="${mode}"]`);
        for (const [i, offset] of (reason ? [OPTICS.reasonOffset] : OPTICS.offsets).entries()) {
          const d = await svg.locator('.mirror-out-path').nth(i).getAttribute('d');
          const actual = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
          const ray = reflectionAt(mode, offset);
          [...ray.point, ...visibleRayEnd(ray)].forEach((v, j) => near(v, actual[j], 0.0001));
        }
      }
    }
  });

  await t.test('normal switch affects all three diagrams together; pointer and keyboard restore it', async () => {
    const button = section.locator('#mirror-normal-toggle');
    const before = await section.locator('.mirror-out-path').evaluateAll(els => els.map(el => el.getAttribute('d')));
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    for (const normal of await section.locator('.mirror-normal').all()) await expect(normal).toHaveCSS('display', 'none');
    await expect(button).toBeFocused();
    await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    // A horizontal SVG group has a zero-height geometric box even when its stroke is visible.
    for (const normal of await section.locator('.mirror-normal').all()) {
      await expect(normal).toHaveCSS('display', 'inline');
      await expect(normal).toHaveAttribute('aria-hidden', 'false');
    }
    await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
    assert.deepEqual(await section.locator('.mirror-out-path').evaluateAll(els => els.map(el => el.getAttribute('d'))), before);
  });

  await t.test('bear moves near/far repeatedly; image orientation, condition and button agree', async () => {
    const button = section.locator('#mirror-bear-toggle');
    const unchanged = await section.locator('[data-appearance="plane"],[data-appearance="convex"]').evaluateAll(els => els.map(el => el.innerHTML));
    for (let i = 0; i < 4; i++) {
      await button.click();
      await expect(section).toHaveAttribute('data-concave-position', 'far');
      await expect(section.locator('#mirror-concave-condition')).toHaveText('小熊移到較遠處');
      await expect(section.locator('#mirror-concave-result')).toHaveText('倒立・縮小');
      await expect(section.locator('#mirror-concave-appearance .mirror-bear-image')).toHaveAttribute('transform', /rotate\(180/);
      await expect(button).toHaveText('把小熊移近 ←');
      await expect(button).toBeFocused();
      await page.keyboard.press(i % 2 ? 'Space' : 'Enter');
      await expect(section).toHaveAttribute('data-concave-position', 'near');
      await expect(section.locator('#mirror-concave-result')).toHaveText('正立・放大');
      assert.equal(await section.locator('#mirror-concave-appearance .mirror-bear-image').getAttribute('transform'), null);
    }
    assert.deepEqual(await section.locator('[data-appearance="plane"],[data-appearance="convex"]').evaluateAll(els => els.map(el => el.innerHTML)), unchanged);
    for (const mode of modes) {
      const scale = await section.locator(`[data-appearance="${mode}"]`).evaluate(el => ({
        object: Number(el.querySelector('.mirror-bear-object').getAttribute('width')),
        image: Number(el.querySelector('.mirror-bear-image').getAttribute('width')),
      }));
      near(scale.image / scale.object, imageExample(mode).magnification, 0.0001);
    }
  });

  await t.test('three-column alignment, shared section structure and no clipped text at eight widths', async () => {
    for (const width of [1440, 1280, 1024, 800, 780, 650, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}`);
      const columns = await section.locator('.mirror-columns').evaluateAll(rows => rows.map(row => [...row.children].map(el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, right: b.right }; })));
      for (const row of columns) {
        near(row[0].y, row[1].y, 1); near(row[1].y, row[2].y, 1);
        assert.ok(row[0].right < row[1].x && row[1].right < row[2].x);
        row.forEach((b, i) => near(b.x, columns[0][i].x, 1));
      }
      const wrappers = await page.locator('.lesson-card[id^="card-"]').evaluateAll(cards => cards.map(el => getComputedStyle(el).gridTemplateColumns));
      if (width > 780) wrappers.forEach(cols => assert.equal(cols, wrappers[0]));
      assert.deepEqual(await section.locator('.mirror-column-title,.mirror-result,.mirror-cause-chain strong,.mirror-step-head,.mirror-portrait-controls,.mirror-application').evaluateAll(els => els.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.className)), []);
    }
  });

  await t.test('touch, reduced motion, model notes and neighboring activities remain usable', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    const touch = await context.newPage();
    await touch.goto(url, { waitUntil: 'networkidle' });
    await touch.locator('#mirror-normal-toggle').tap();
    await expect(touch.locator('#card-05')).toHaveAttribute('data-normals', 'false');
    await touch.locator('#mirror-bear-toggle').tap();
    await expect(touch.locator('#mirror-concave-result')).toHaveText('倒立・縮小');
    await touch.locator('#mirror-bear-toggle').tap();
    await expect(touch.locator('#mirror-concave-result')).toHaveText('正立・放大');
    await context.close();
    await section.locator('summary').click();
    await expect(section.locator('.mirror-model-notes')).toHaveAttribute('open', '');
    await expect(section.locator('.mirror-model-notes')).toContainText('並非都縮小');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('#distance-side-object').focus(); await page.keyboard.press('Home');
    await expect(page.locator('#distance-side-object')).toHaveAttribute('aria-valuenow', '10');
    await page.keyboard.press('End');
    await expect(page.locator('#distance-side-object')).toHaveAttribute('aria-valuenow', '60');
    await page.locator('#reverse-toggle-b').click();
    await expect(page.locator('#reverse-toggle-b')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#reverse-state')).toContainText('B 藍光');
    assert.deepEqual(failures, []);
  });
});
