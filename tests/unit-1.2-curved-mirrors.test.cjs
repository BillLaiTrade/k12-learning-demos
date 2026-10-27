const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { expect } = require('playwright/test');

test('1.2 three mirrors: scientific relationships, interaction and layout', { timeout: 90000 }, async t => {
  const root = path.resolve(__dirname, '..');
  const geometry = await import(pathToFileURL(path.join(root, 'units/1/parts/1.2/assets/curved-mirrors-geometry.mjs')));
  const { reflectionAt, mirrorOutline, OPTICS, imageExample } = geometry;
  const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} must equal ${b}`);

  await t.test('surface normals and exact reflection agree at all three positions', () => {
    for (const mode of ['plane', 'concave', 'convex']) {
      for (const offset of OPTICS.offsets) {
        const { point: p, normal: n, direction: r, end, angle } = reflectionAt(mode, offset);
        near(Math.hypot(...n), 1); near(Math.hypot(...r), 1);
        near(p[1], OPTICS.centerY + offset);
        assert.ok(r[0] < 0 && end[0] < p[0], 'Light must stay in front of the mirror');
        // Independent surface check: normals must point to/from the circle center.
        if (mode !== 'plane') {
          const cx = OPTICS.vertex + (mode === 'concave' ? -OPTICS.radius : OPTICS.radius);
          const radial = [p[0] - cx, p[1] - OPTICS.centerY];
          near(Math.hypot(...radial), OPTICS.radius);
          near(radial[0] * n[1] - radial[1] * n[0], 0);
        } else near(p[0], OPTICS.vertex);
        // Tangential component is preserved; the normal component reverses.
        const tangent = [-n[1], n[0]];
        near(r[0] * tangent[0] + r[1] * tangent[1], tangent[0]);
        near(r[0] * n[0] + r[1] * n[1], -n[0]);
        near(Math.acos(Math.min(1, r[0] * n[0] + r[1] * n[1])) * 180 / Math.PI, angle);
        near((end[0] - p[0]) * r[1] - (end[1] - p[1]) * r[0], 0);
        if (offset && mode === 'concave') {
          const axisTime = -offset / r[1], x = p[0] + axisTime * r[0];
          assert.ok(x > end[0] && x < p[0], 'Rays must continue beyond convergence');
          assert.ok(Math.abs(x - (OPTICS.vertex - OPTICS.radius / 2)) < 2, 'Near-axis convergence is near f=R/2');
        }
        if (offset && mode === 'convex') assert.ok(Math.abs(end[1] - OPTICS.centerY) > Math.abs(offset));
        if (mode === 'plane') near(end[1], p[1]);
      }
      const outline = mirrorOutline(mode);
      const vertex = outline.find(p => Math.abs(p[1] - OPTICS.centerY) < 1e-9);
      near(vertex[0], OPTICS.vertex);
      if (mode === 'concave') assert.ok(outline[0][0] < vertex[0]);
      if (mode === 'convex') assert.ok(outline[0][0] > vertex[0]);
    }
  });

  await t.test('appearance examples obey the stated object-position conditions', () => {
    const examples = [['plane', 'near', 1, 'virtual'], ['concave', 'near', 2, 'virtual'], ['concave', 'far', -0.5, 'real'], ['convex', 'near', 0.4, 'virtual']];
    for (const [mode, position, m, kind] of examples) {
      const model = imageExample(mode, position);
      near(model.magnification, m);
      assert.equal(model.imageDistance > 0 ? 'real' : 'virtual', kind);
      if (mode === 'concave') assert.ok(position === 'near' ? model.objectDistance < 1 : model.objectDistance > 2);
      if (mode !== 'plane') near(1 / model.objectDistance + 1 / model.imageDistance, mode === 'convex' ? -1 : 1);
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
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('requestfailed', request => failures.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
  const url = `http://127.0.0.1:${port}/units/1/parts/1.2/#card-05`;
  await page.goto(url, { waitUntil: 'networkidle' });
  const section = page.locator('#card-05');

  await t.test('all three comparisons persist while every mirror and ray point is explored', async () => {
    for (const mode of ['plane', 'convex', 'concave']) {
      const choice = page.locator(`[data-mirror="${mode}"]`);
      await choice.click();
      await expect(choice).toHaveAttribute('aria-expanded', 'true');
      await expect(section).toHaveAttribute('data-mirror-mode', mode);
      await expect(page.locator('#mirror-detail-title')).toContainText(geometry.MIRRORS[mode].name);
      for (let index = 0; index < 3; index++) {
        // Click the ACTUAL diagram target, not only its backup position control.
        await page.locator(`[data-hit="${index}"]`).click();
        await expect(section).toHaveAttribute('data-mirror-point', String(index));
        await expect(page.locator(`button[data-mirror-point="${index}"]`).filter({ hasText: /上方|中央|下方/ })).toHaveAttribute('aria-pressed', 'true');
        const expected = reflectionAt(mode, OPTICS.offsets[index]);
        await expect(page.locator('#mirror-angle-readout')).toContainText(expected.angle.toFixed(1));
        const endpoint = await page.locator('#mirror-detail-svg .mirror-out-path').nth(index).getAttribute('d');
        const nums = endpoint.match(/-?\d+(?:\.\d+)?/g).map(Number);
        [...expected.point, ...expected.end].forEach((n, i) => near(nums[i], n, 0.0001));
        for (const key of ['plane', 'concave', 'convex']) await expect(page.locator(`[data-mirror="${key}"]`)).toBeVisible();
      }
    }
  });

  await t.test('collapse, reopen, keyboard activation and repeated transitions recover correctly', async () => {
    await page.locator('[data-mirror="concave"]').click();
    for (let cycle = 0; cycle < 4; cycle++) {
      await page.locator('#mirror-detail-close').click();
      await expect(page.locator('#mirror-detail')).toBeHidden();
      await expect(page.locator('[data-mirror="concave"]')).toBeFocused();
      await page.keyboard.press(cycle % 2 ? 'Space' : 'Enter');
      await expect(page.locator('#mirror-detail')).toBeVisible();
      await page.locator('button[data-mirror-point="1"]').filter({ hasText: '中央' }).click();
      await expect(page.locator('#mirror-point-explanation')).toContainText('0°');
      await page.locator('[data-hit="2"]').focus(); await page.keyboard.press('Enter');
      await expect(section).toHaveAttribute('data-mirror-point', '2');
      await expect(page.locator('[data-hit="2"]')).toBeFocused();
      await page.locator('[data-hit="0"]').focus(); await page.keyboard.press('Space');
      await expect(section).toHaveAttribute('data-mirror-point', '0');
    }
  });

  await t.test('approved layout hierarchy, ordering, geometry and assets remain readable at five widths', async () => {
    for (const width of [1440, 1280, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const mode of ['plane', 'concave', 'convex']) {
        await page.locator(`[data-mirror="${mode}"]`).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}/${mode}`);
      }
      const boxes = await page.locator('.mirror-option').evaluateAll(els => els.map(el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, right: b.right }; }));
      near(boxes[0].y, boxes[1].y, 1); near(boxes[1].y, boxes[2].y, 1);
      assert.ok(boxes[0].right < boxes[1].x && boxes[1].right < boxes[2].x, 'Three diagrams share one row without overlap');
      assert.deepEqual(await page.locator('.mirror-appearance h4').allTextContents(), ['平面鏡', '凹面鏡', '凸面鏡']);
      assert.deepEqual(await page.locator('.mirror-use h4').allTextContents(), ['平面鏡：穿衣鏡', '凹面鏡：化妝鏡', '凸面鏡：路口鏡']);
      assert.ok(await section.locator('.mirror-concave-examples').isVisible());
      const objectScales = await section.locator('[data-appearance] svg').evaluateAll(els => els.map(el => el.getScreenCTM().d));
      objectScales.forEach(scale => near(scale, objectScales[0], 0.001));
      if (width > 1100) {
        const left = await section.locator('.card-side').boundingBox();
        const main = await section.locator('.card-main').boundingBox();
        assert.ok(left.x + left.width < main.x);
        const plot = await page.locator('.mirror-detail-figure').boundingBox();
        const copy = await page.locator('.mirror-detail-copy').boundingBox();
        assert.ok(plot.x + plot.width < copy.x, 'Selected explanation is beside large diagram');
      }
      // No text box may extend outside its component even at the narrow width.
      assert.deepEqual(await section.locator('.mirror-option,.mirror-appearance,.mirror-use,.mirror-detail-copy').evaluateAll(els => els.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.className)), []);
    }
    for (const image of await section.locator('.mirror-use img').all()) {
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveJSProperty('complete', true);
      assert.ok(await image.evaluate(img => img.naturalWidth >= 480));
    }
  });

  await t.test('touch, reduced-motion and adjacent activities work without script or HTTP errors', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    const touch = await context.newPage();
    await touch.goto(url, { waitUntil: 'networkidle' });
    await touch.locator('[data-mirror="plane"]').tap();
    await expect(touch.locator('#mirror-detail-title')).toContainText('平面鏡');
    await touch.locator('[data-hit="1"]').tap();
    await expect(touch.locator('#mirror-angle-readout')).toContainText('0.0');
    await touch.locator('#mirror-detail-close').tap();
    await touch.locator('[data-mirror="convex"]').tap();
    await expect(touch.locator('#mirror-detail')).toBeVisible();
    await context.close();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('#reverse-ray').click();
    await expect(page.locator('#reverse-state')).toContainText('方向已反轉');
    await page.locator('#object-distance').fill('20');
    await page.locator('#object-distance').dispatchEvent('input');
    await expect(page.locator('#image-distance-value')).toHaveText('20 cm');
    assert.deepEqual(failures, []);
  });
});
