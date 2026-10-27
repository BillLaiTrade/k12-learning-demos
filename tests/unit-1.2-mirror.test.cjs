const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');
const { expect } = require('playwright/test');

test('1.2 plane mirror observation and restoration', { timeout: 90000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Static server did not start')), 5000);
    server.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/port (\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    server.once('error', error => { clearTimeout(timer); reject(error); });
  });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('requestfailed', request => failures.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
  await page.goto(`http://127.0.0.1:${port}/units/1/parts/1.2/#card-03`, { waitUntil: 'networkidle' });
  const section = page.locator('#card-03');
  const toggle = page.locator('#toggle-image-object');
  const next = page.locator('#toggle-image-rays');
  const reset = page.locator('#reset-image-activity');
  const virtual = page.locator('#image-side-virtual');
  const objects = ['#image-side-object', '#image-front-object', '#image-front-reflection'];

  await t.test('observations reveal the actual light path before the inferred image', async () => {
    await expect(virtual).toBeHidden();
    await expect(page.locator('#image-side-rays')).toBeHidden();
    await expect(page.locator('#image-front-reflection')).toBeVisible();
    await next.click();
    await expect(page.locator('#image-side-rays')).toBeVisible();
    await expect(page.locator('#image-mirror-guides')).toBeVisible();
    await expect(virtual).toBeHidden();
    await expect(page.locator('#image-side-extensions')).toBeHidden();
    await next.click();
    await expect(virtual).toBeVisible();
    await expect(page.locator('#image-side-extensions')).toBeVisible();
    await expect(page.locator('#image-final-explanation')).toBeVisible();
    await next.click();
    await expect(virtual).toBeHidden();
  });

  await t.test('fixed pointer coordinates remove and restore repeatedly in every observation step', async () => {
    for (const width of [1440, 1280, 768]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const step of [0, 1, 2]) {
        await reset.click();
        for (let i = 0; i < step; i++) await next.click();
        await toggle.scrollIntoViewIfNeeded();
        // Settle scrolling once. Do not ask Playwright to relocate the button
        // after removal: that hid the original 36px layout-shift regression.
        await page.waitForTimeout(150);
        const box = await toggle.boundingBox();
        const x = box.x + box.width / 2, y = box.y + box.height / 2;
        for (let cycle = 0; cycle < 5; cycle++) {
          await page.mouse.click(x, y);
          await expect(section).toHaveAttribute('data-object-present', 'false');
          await expect(toggle).toHaveText('放回小熊');
          for (const selector of objects) await expect(page.locator(selector)).toBeHidden();
          await expect(next).toBeDisabled();
          const removedBox = await toggle.boundingBox();
          assert.ok(Math.abs(removedBox.y - box.y) < 0.5, 'Restoration target must not move');
          await page.mouse.click(x, y);
          await expect(section).toHaveAttribute('data-object-present', 'true');
          for (const selector of objects) await expect(page.locator(selector)).toBeVisible();
          await expect(next).toBeEnabled();
          await expect(virtual).toBeHidden();
          // Set up the same step again before testing the next remove/restore.
          for (let i = 0; i < step; i++) await next.click();
        }
      }
    }
  });

  await t.test('keyboard operation and reset recover the complete object state', async () => {
    await reset.click();
    await toggle.focus(); await page.keyboard.press('Enter');
    await expect(section).toHaveAttribute('data-object-present', 'false');
    await page.keyboard.press('Space');
    await expect(section).toHaveAttribute('data-object-present', 'true');
    await next.focus(); await page.keyboard.press('Enter');
    await expect(section).toHaveAttribute('data-image-step', '1');
    await toggle.click(); await reset.click();
    await expect(section).toHaveAttribute('data-image-step', '0');
    for (const selector of objects) await expect(page.locator(selector)).toBeVisible();
    await expect(next).toBeEnabled();
  });

  await t.test('two reflected rays enter the observer and extend to the mirrored source point', async () => {
    const data = await page.locator('#image-side-view').evaluate(svg => {
      const paths = ['image-ray-a-in', 'image-ray-a-out', 'image-ray-b-in', 'image-ray-b-out', 'image-extension-a', 'image-extension-b'];
      return {
        mirror: Number(svg.dataset.mirrorX),
        source: svg.dataset.objectPoint.split(',').map(Number),
        image: svg.dataset.imagePoint.split(',').map(Number),
        paths: Object.fromEntries(paths.map(id => [id,
          document.getElementById(id).getAttribute('d').match(/-?[\d]+(?:\.[\d]+)?/g).map(Number)])),
      };
    });
    assert.equal((data.source[0] + data.image[0]) / 2, data.mirror);
    assert.equal(data.source[1], data.image[1]);
    const eyePoints = [];
    for (const key of ['a', 'b']) {
      const incoming = data.paths[`image-ray-${key}-in`];
      const outgoing = data.paths[`image-ray-${key}-out`];
      const extension = data.paths[`image-extension-${key}`];
      assert.deepEqual(incoming.slice(0, 2), data.source);
      const hit = incoming.slice(-2), eye = outgoing.slice(-2);
      assert.deepEqual(hit, outgoing.slice(0, 2));
      assert.deepEqual(hit, extension.slice(0, 2));
      assert.deepEqual(extension.slice(-2), data.image);
      assert.equal(hit[0], data.mirror);
      const incidentSlope = (hit[1] - data.source[1]) / (hit[0] - data.source[0]);
      const reflectedSlope = (eye[1] - hit[1]) / (eye[0] - hit[0]);
      const apparentSlope = (data.image[1] - hit[1]) / (data.image[0] - hit[0]);
      assert.ok(Math.abs(incidentSlope + reflectedSlope) < 1e-10);
      assert.ok(Math.abs(reflectedSlope - apparentSlope) < 1e-10);
      // The eye is within the visible side-profile face, not a floating icon.
      assert.equal(eye[0], 133);
      assert.ok(eye[1] >= 124 && eye[1] <= 134);
      eyePoints.push(eye);
    }
    assert.notDeepEqual(eyePoints[0], eyePoints[1]);
    await expect(page.locator('#image-side-object image')).toHaveAttribute('href', 'assets/mirror/teddy-side.webp');
    await expect(page.locator('#image-side-virtual image')).toHaveAttribute('transform', 'translate(700 0) scale(-1 1)');
    await expect(page.locator('#image-observer-profile')).toHaveAttribute('href', 'assets/mirror/xiaokui-profile.webp');
  });

  await t.test('touch restores at the same position and reduced motion retains explicit steps', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    try {
      const mobile = await context.newPage();
      await mobile.goto(page.url(), { waitUntil: 'networkidle' });
      const target = mobile.locator('#toggle-image-object');
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      await mobile.touchscreen.tap(x, y);
      await expect(mobile.locator('#image-front-object')).toBeHidden();
      await mobile.touchscreen.tap(x, y);
      await expect(mobile.locator('#image-front-object')).toBeVisible();
      await mobile.locator('#toggle-image-rays').click();
      await expect(mobile.locator('#image-side-rays')).toBeVisible();
      await expect(mobile.locator('#image-side-virtual')).toBeHidden();
      assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    } finally {
      await context.close();
    }
  });

  await t.test('neighboring distance activity remains independent and assets load', async () => {
    await reset.click(); await next.click(); await next.click();
    await page.locator('#object-distance').fill('20');
    await page.locator('#object-distance').dispatchEvent('input');
    await expect(page.locator('#image-distance-value')).toHaveText('20 cm');
    await expect(virtual).toBeVisible();
    assert.deepEqual(failures, []);
  });
});
