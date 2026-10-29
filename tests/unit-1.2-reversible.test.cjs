const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { expect } = require('playwright/test');

test('1.2 reversible light reuses the reflection laboratory', { timeout: 120000 }, async t => {
  const root = path.resolve(__dirname, '..');
  const asset = path.join(root, 'units/4/parts/4.2/assets');
  const { reciprocalPath, laserPath, MIRROR_FACE_X } = await import(pathToFileURL(path.join(asset, 'planar-reflection.mjs')));
  const close = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} should equal ${b}`);
  const vectorClose = (a, b) => a.forEach((n, i) => close(n, b[i]));
  const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
  const direction = (a, b) => { const v = b.map((n, i) => n - a[i]); const length = Math.hypot(...v); return v.map(n => n / length); };

  await t.test('independent reflection, front surface and reciprocal endpoint checks at every supported angle', () => {
    close(MIRROR_FACE_X, 1.9325);
    for (let angle = 20; angle <= 60; angle++) {
      const { forward: f, backward: r, error } = reciprocalPath(angle);
      vectorClose(f.source, r.end); vectorClose(f.hit, r.hit); vectorClose(f.end, r.source);
      assert.ok(error < 1e-12);
      for (const ray of [f, r]) {
        close(ray.hit[0], MIRROR_FACE_X); close(ray.hit[2], 0); close(ray.hit[1], 1.4);
        assert.ok(ray.source[0] < MIRROR_FACE_X && ray.end[0] < MIRROR_FACE_X);
        const incident = direction(ray.source, ray.hit), reflected = direction(ray.hit, ray.end);
        // Normal reverses; both tangent components remain unchanged.
        close(incident[0], -reflected[0]); close(incident[1], reflected[1]); close(incident[2], reflected[2]);
        close(Math.acos(incident[0]) * 180 / Math.PI, angle);
        close(Math.acos(-reflected[0]) * 180 / Math.PI, angle);
        close(Math.hypot(...ray.end.map((n, i) => n - ray.hit[i])), 7);
      }
      close(dot(direction(f.source, f.hit), direction(r.hit, r.end)), -1);
    }
    assert.throws(() => laserPath(90), /Grazing/);
    for (const name of ['laser-reflection.js', 'reversible-light.js']) {
      const source = fs.readFileSync(path.join(asset, name), 'utf8');
      assert.match(source, /createLaserBench.*from '\.\/laser-bench.js'/);
      assert.match(source, /from '\.\/planar-reflection.mjs'/);
    }
  });

  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    let output = ''; const timer = setTimeout(() => reject(new Error('Server did not start')), 5000);
    server.stdout.on('data', data => { output += data; const m = output.match(/port (\d+)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
    server.once('error', reject);
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => errors.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });
  // Inspect the actual Three.js meshes through a test-only module transform;
  // the published module exposes no global scene or testing API.
  await page.route('**/assets/reversible-light.js*', async route => {
    const response = await route.fetch();
    const source = await response.text();
    assert.ok(source.includes('bench = createLaserBench(canvas);'));
    await route.fulfill({ response, body: source.replace('bench = createLaserBench(canvas);', 'bench = createLaserBench(canvas); window.__testReverseBench = bench;') });
  });
  const url = `http://127.0.0.1:${port}/units/4/parts/4.2/#card-06`;
  await page.goto(url, { waitUntil: 'networkidle' });
  const section = page.locator('#card-06');
  const canvas = page.locator('#reverse-scene');
  const toggleA = page.locator('#reverse-toggle-a'), toggleB = page.locator('#reverse-toggle-b'), reset = page.locator('#reverse-reset');
  const setAngle = async n => {
    // Only the scene's keyboard/drag handlers adjust the angle; no range input.
    await canvas.evaluate((el, n) => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: n <= 40 ? 'Home' : 'End', bubbles: true }));
      for (let i = 0; i < (n <= 40 ? n - 20 : 60 - n); i++) el.dispatchEvent(new KeyboardEvent('keydown', { key: n <= 40 ? 'ArrowRight' : 'ArrowLeft', bubbles: true }));
    }, n);
  };

  async function dragEmitter(target, dx) {
    // Focus and the initial hash can still have a smooth scroll in flight.
    // Cancel it before capturing physical pointer coordinates (do not let
    // Playwright silently relocate the target after pointerdown).
    await target.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect.poll(async () => {
      const first = await target.boundingBox();
      await page.waitForTimeout(100);
      const second = await target.boundingBox();
      return Math.abs(first.y - second.y) < 0.5;
    }).toBe(true);
    const box = await target.boundingBox(), [x, y] = JSON.parse(await target.getAttribute(target === canvas ? 'data-emitter-a-screen' : 'data-emitter-screen'));
    await page.mouse.move(box.x + x, box.y + y); await page.mouse.down();
    assert.equal(await target.evaluate(el => el.hasPointerCapture(1)), true, 'Physical pointer must actually hit the emitter');
    await page.mouse.move(box.x + x + dx, box.y + y, { steps: 6 }); await page.mouse.up();
  }

  async function sourcePoint(key) {
    await canvas.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect.poll(async () => { const a = await canvas.boundingBox(); await page.waitForTimeout(100); const b = await canvas.boundingBox(); return Math.abs(a.y - b.y) < 0.5; }).toBe(true);
    const box = await canvas.boundingBox(), [x, y] = JSON.parse(await canvas.getAttribute(`data-emitter-${key}-screen`));
    return { x: box.x + x, y: box.y + y };
  }
  async function status(a, b) {
    await expect(section).toHaveAttribute('data-light-a', a ? 'on' : 'off');
    await expect(section).toHaveAttribute('data-light-b', b ? 'on' : 'off');
    await expect(toggleA).toHaveAttribute('aria-pressed', String(a));
    await expect(toggleB).toHaveAttribute('aria-pressed', String(b));
    const guides = await page.evaluate(() => {
      const b = window.__testReverseBench;
      return [b.incomingSector, b.reflectedSector, b.incomingArc, b.outgoingArc, b.scene.getObjectByName('reverse-hit-dot')].map(mesh => mesh.visible);
    });
    assert.deepEqual(guides, Array(5).fill(a || b), 'Angle sectors, arcs and hit light must follow actual illumination');
  }

  await t.test('section 02 keeps its actual drag and keyboard, with initial angle inherited', async () => {
    const original = page.locator('#laser-reflection-scene');
    await original.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
    await expect(page.locator('#law-angle-in')).toHaveText('21°');
    await expect(section).toHaveAttribute('data-reverse-angle', '21');
    await dragEmitter(original, 35);
    const changed = Number(await original.getAttribute('aria-valuenow'));
    assert.ok(changed > 21);
    await expect(section).toHaveAttribute('data-reverse-angle', String(Math.min(60, changed)));
    await status(false, false);
    await expect(section.locator('input[type=range]')).toHaveCount(0);
    await expect(page.locator('#reverse-angle-value')).toHaveText(`${Math.min(60, changed)}°`);
  });

  await t.test('angle sectors and arcs are absent before light, after off-state angle changes and after reset', async () => {
    const artifacts = '/tmp/unit1-card6-angle-guides'; fs.mkdirSync(artifacts, { recursive: true });
    await status(false, false);
    await setAngle(30); await status(false, false);
    await canvas.screenshot({ path: `${artifacts}/off.png` });
    await toggleA.click(); await status(true, false);
    await canvas.screenshot({ path: `${artifacts}/red.png` });
    await toggleA.click(); await toggleB.click(); await status(false, true);
    await canvas.screenshot({ path: `${artifacts}/blue.png` });
    await toggleA.click(); await status(true, true);
    await canvas.screenshot({ path: `${artifacts}/both.png` });
    await reset.click(); await status(false, false);
    await setAngle(50); await status(false, false);
    await canvas.screenshot({ path: `${artifacts}/off-adjusted.png` });
  });

  await t.test('actual device clicks independently traverse all four light states without a record step', async () => {
    for (const angle of [20, 40, 60]) {
      await reset.click(); await setAngle(angle);
      const a = await sourcePoint('a'), b = await sourcePoint('b');
      // Keep fixed screen coordinates during each cycle; no relocated buttons.
      for (let i = 0; i < 3; i++) {
        await page.mouse.click(a.x, a.y); await status(true, false);
        await page.mouse.click(b.x, b.y); await status(true, true);
        await expect(page.locator('#reverse-overlap')).toBeVisible();
        await page.mouse.click(a.x, a.y); await status(false, true);
        await expect(page.locator('#reverse-overlap')).toBeHidden();
        await page.mouse.click(b.x, b.y); await status(false, false);
      }
    }
  });

  await t.test('red, blue and simultaneous illumination all change the actual rendered scene', async () => {
    await reset.click(); await setAngle(30);
    const off = await canvas.screenshot();
    await toggleA.click(); const red = await canvas.screenshot();
    await toggleA.click(); await toggleB.click(); const blue = await canvas.screenshot();
    await toggleA.click(); const both = await canvas.screenshot();
    for (const [a, b] of [[off, red], [off, blue], [red, blue], [red, both], [blue, both]]) assert.ok(!a.equals(b));
    const pixels = async buffer => page.evaluate(async bytes => {
      const image = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
      const surface = document.createElement('canvas'); surface.width = image.width; surface.height = image.height;
      const ctx = surface.getContext('2d'); ctx.drawImage(image, 0, 0);
      // Exclude the colored status labels near the emitters: inspect the rays.
      const data = ctx.getImageData(0, Math.floor(image.height / 3), image.width, Math.floor(image.height * 2 / 3)).data;
      let red = 0, blue = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 130 && data[i] > data[i + 1] * 1.7 && data[i] > data[i + 2] * 1.7) red++;
        if (data[i + 2] > 150 && data[i + 2] > data[i] * 1.7 && data[i + 2] > data[i + 1] * 1.4) blue++;
      }
      image.close(); return { red, blue };
    }, [...buffer]);
    const r = await pixels(red), b = await pixels(blue), overlap = await pixels(both);
    assert.ok(overlap.blue > r.blue + 300, 'The blue beam must stay visible when red is also on');
    assert.ok(overlap.red > b.red + 300, 'The red beam must stay visible when blue is also on');
    const model = JSON.parse(await section.getAttribute('data-reverse-model'));
    vectorClose(model.forward.source, model.backward.end); vectorClose(model.forward.hit, model.backward.hit);
    const source = fs.readFileSync(path.join(asset, 'reversible-light.js'), 'utf8');
    assert.match(source, /a: '#ed2924', b: '#205df5'/);
    await status(true, true);
    await reset.click(); await status(false, false);
  });

  await t.test('dragging A changes angle without toggling either source; pointer cancellation and background clicks are inert', async () => {
    await setAngle(30); await toggleA.click(); await toggleB.click();
    await dragEmitter(canvas, 30);
    const draggedAngle = Number(await section.getAttribute('data-reverse-angle'));
    assert.ok(draggedAngle > 30);
    await expect(page.locator('#reverse-angle-value')).toHaveText(`${draggedAngle}°`);
    await status(true, true);
    const point = await sourcePoint('a');
    await page.mouse.move(point.x, point.y); await page.mouse.down();
    await canvas.dispatchEvent('pointercancel', { pointerId: 1 }); await page.mouse.up();
    await status(true, true);
    const box = await canvas.boundingBox(); await page.mouse.click(box.x + 8, box.y + box.height - 12);
    await status(true, true);
    await setAngle(50);
    const before = await section.getAttribute('data-reverse-model');
    await page.locator('#laser-reflection-scene').focus(); await page.keyboard.press('Home');
    assert.equal(await section.getAttribute('data-reverse-model'), before);
    await reset.click(); await status(false, false);
  });

  await t.test('keyboard switches, live angle controls and reset reflect the independent state', async () => {
    await toggleA.focus(); await page.keyboard.press('Enter'); await status(true, false);
    await toggleB.focus(); await page.keyboard.press('Space'); await status(true, true);
    await canvas.focus(); await page.keyboard.press('a'); await status(false, true);
    await page.keyboard.press('b'); await status(false, false);
    await page.keyboard.press('Home'); await expect(section).toHaveAttribute('data-reverse-angle', '20');
    await page.keyboard.press('End'); await expect(section).toHaveAttribute('data-reverse-angle', '60');
    await page.locator('.reverse-reason summary').click();
    await expect(page.locator('#reverse-reason-angles')).toContainText('60°');
  });

  await t.test('independent controls and device labels fit five widths', async () => {
    for (const width of [1440, 1280, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 1050 });
      for (const angle of [20, 60]) {
        await setAngle(angle);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        const bounds = await page.locator('.reverse-stage').boundingBox();
        for (const selector of ['#reverse-label-a', '#reverse-label-b', '#reverse-label-m']) {
          const box = await page.locator(selector).boundingBox();
          assert.ok(box.x >= bounds.x && box.x + box.width <= bounds.x + bounds.width + 1);
          assert.ok(box.y >= bounds.y && box.y + box.height <= bounds.y + bounds.height + 1);
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 1050 });
  });

  await t.test('real touch taps toggle the devices; fallback diagram and native switches remain usable', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    const touch = await context.newPage(); await touch.goto(url, { waitUntil: 'networkidle' });
    const scene = touch.locator('#reverse-scene');
    await scene.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await touch.waitForTimeout(150);
    const box = await scene.boundingBox();
    const a = JSON.parse(await scene.getAttribute('data-emitter-a-screen'));
    const b = JSON.parse(await scene.getAttribute('data-emitter-b-screen'));
    for (const [p, key, value] of [[a, 'a', 'on'], [b, 'b', 'on'], [a, 'a', 'off'], [b, 'b', 'off']]) {
      await touch.touchscreen.tap(box.x + p[0], box.y + p[1]);
      await expect(touch.locator('#card-06')).toHaveAttribute(`data-light-${key}`, value);
    }
    const touchAngle = Number(await touch.locator('#card-06').getAttribute('data-reverse-angle'));
    const cdp = await context.newCDPSession(touch);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + a[0], y: box.y + a[1], id: 1 }] });
    for (let step = 1; step <= 5; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + a[0] + step * 6, y: box.y + a[1], id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.ok(Number(await touch.locator('#card-06').getAttribute('data-reverse-angle')) > touchAngle);
    await expect(touch.locator('#card-06')).toHaveAttribute('data-light-a', 'off');
    await expect(touch.locator('#card-06')).toHaveAttribute('data-light-b', 'off');
    await context.close();
    const fallback = await browser.newContext();
    await fallback.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return this.id === 'reverse-scene' && kind.startsWith('webgl') ? null : getContext.call(this, kind, ...args); };
    });
    const alt = await fallback.newPage(); await alt.goto(url, { waitUntil: 'networkidle' });
    await expect(alt.locator('#reverse-fallback')).toBeVisible();
    await alt.locator('[data-source="a"]').click(); await alt.locator('[data-source="b"]').click();
    await expect(alt.locator('#card-06')).toHaveAttribute('data-light-a', 'on');
    await expect(alt.locator('#card-06')).toHaveAttribute('data-light-b', 'on');
    await expect(alt.locator('[data-ray="a"]')).toHaveAttribute('stroke', '#ed2924');
    await expect(alt.locator('[data-ray="b"]')).toHaveAttribute('stroke', '#205df5');
    await alt.locator('#reverse-reset').click(); await expect(alt.locator('[data-ray]')).toHaveCount(0);
    await fallback.close();
    assert.deepEqual(errors, []);
  });
});
