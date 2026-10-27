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
  const asset = path.join(root, 'units/1/parts/1.2/assets');
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
  const url = `http://127.0.0.1:${port}/units/1/parts/1.2/#card-06`;
  await page.goto(url, { waitUntil: 'networkidle' });
  const section = page.locator('#card-06');
  const canvas = page.locator('#reverse-scene');
  const record = page.locator('#reverse-record'), emit = page.locator('#reverse-ray'), reset = page.locator('#reverse-reset');
  const setAngle = async n => { await page.locator('#reverse-angle').fill(String(n)); await page.locator('#reverse-angle').dispatchEvent('input'); };

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
    const box = await target.boundingBox(), [x, y] = JSON.parse(await target.getAttribute('data-emitter-screen'));
    await page.mouse.move(box.x + x, box.y + y); await page.mouse.down();
    if (await target.getAttribute('aria-disabled') !== 'true') assert.equal(await target.evaluate(el => el.hasPointerCapture(1)), true, 'Physical pointer must actually hit the emitter');
    await page.mouse.move(box.x + x + dx, box.y + y, { steps: 6 }); await page.mouse.up();
  }

  await t.test('section 02 retains keyboard, actual emitter drag and inherited angle', async () => {
    const original = page.locator('#laser-reflection-scene');
    await original.focus(); await page.keyboard.press('Home');
    await expect(page.locator('#lab-angle-in')).toHaveText('20°');
    await expect(page.locator('#lab-angle-out')).toHaveText('20°');
    await expect(section).toHaveAttribute('data-reverse-angle', '20');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#law-angle-in')).toHaveText('21°');
    await dragEmitter(original, 35);
    const changed = Number(await original.getAttribute('aria-valuenow'));
    assert.ok(changed > 21, 'Dragging the physical housing must alter the original angle');
    await expect(section).toHaveAttribute('data-reverse-angle', String(Math.min(60, changed)));
    await original.focus(); await page.keyboard.press('End');
    await expect(page.locator('#lab-angle-in')).toHaveText('90°');
    await expect(section).toHaveAttribute('data-reverse-angle', '60');
  });

  await t.test('new experiment drag works; recording locks geometry against all input routes', async () => {
    await reset.click(); await setAngle(30);
    await expect(emit).toBeDisabled();
    await dragEmitter(canvas, 30);
    assert.ok(Number(await section.getAttribute('data-reverse-angle')) > 30);
    await setAngle(40); await record.click();
    const locked = await section.getAttribute('data-reverse-model');
    await expect(page.locator('#reverse-angle')).toBeDisabled();
    await expect(emit).toBeEnabled();
    await canvas.focus(); await page.keyboard.press('ArrowRight');
    await dragEmitter(canvas, -30);
    await page.locator('#laser-reflection-scene').focus(); await page.keyboard.press('Home');
    assert.equal(await section.getAttribute('data-reverse-model'), locked);
    await expect(section).toHaveAttribute('data-reverse-angle', '40');
    await expect(page.locator('#reverse-lock-note')).toContainText('已鎖定 40°');
  });

  await t.test('reverse beam traces progressively, then overlays its retained path at three angles', async () => {
    for (const angle of [20, 40, 60]) {
      await reset.click(); await setAngle(angle); await record.click();
      const before = await canvas.screenshot();
      await emit.click();
      await expect(section).toHaveAttribute('data-reverse-state', 'tracing');
      await page.waitForFunction(() => { const p = Number(document.querySelector('#card-06').dataset.reverseProgress); return p > 0.05 && p < 1; });
      const intermediate = Number(await section.getAttribute('data-reverse-progress'));
      assert.ok(intermediate > 0 && intermediate < 1);
      await expect(section).toHaveAttribute('data-reverse-state', 'complete', { timeout: 10000 });
      const model = JSON.parse(await section.getAttribute('data-reverse-model'));
      vectorClose(model.forward.source, model.backward.end);
      vectorClose(model.forward.hit, model.backward.hit);
      vectorClose(model.forward.end, model.backward.source);
      const after = await canvas.screenshot();
      assert.ok(!before.equals(after), 'Visible blue trace must change the actual rendered scene');
      await expect(page.locator('#reverse-overlap')).toBeVisible();
      await expect(page.locator('#reverse-route-back')).toHaveText('B → M → A');
      await expect(page.locator('#reverse-status-a')).toHaveText('現在接收');
      await expect(page.locator('#reverse-status-b')).toHaveText('正在發光');
    }
  });

  await t.test('reset during tracing cancels stale completion; replay and keyboard controls recover', async () => {
    await emit.click();
    await expect(section).toHaveAttribute('data-reverse-state', 'tracing');
    await page.locator('#reverse-setup').click();
    await page.waitForTimeout(2000);
    await expect(section).toHaveAttribute('data-reverse-state', 'setup');
    await expect(page.locator('#reverse-overlap')).toBeHidden();
    await expect(emit).toBeDisabled();
    await canvas.focus(); await page.keyboard.press('Home');
    await expect(section).toHaveAttribute('data-reverse-angle', '20');
    await page.keyboard.press('End'); await expect(section).toHaveAttribute('data-reverse-angle', '60');
    await page.keyboard.press('ArrowLeft'); await expect(section).toHaveAttribute('data-reverse-angle', '59');
    await record.focus(); await page.keyboard.press('Enter');
    await emit.focus(); await page.keyboard.press('Space');
    await expect(section).toHaveAttribute('data-reverse-state', 'complete', { timeout: 10000 });
    await emit.click(); await expect(section).toHaveAttribute('data-reverse-state', 'complete', { timeout: 10000 });
    await page.locator('.reverse-reason summary').click();
    await expect(page.locator('#reverse-reason-angles')).toContainText('59°');
  });

  await t.test('approved layout and labels fit at desktop, intermediate and narrow widths', async () => {
    for (const width of [1440, 1280, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 1050 });
      for (const angle of [20, 30, 60]) {
        await reset.click(); await setAngle(angle); await record.click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        const bounds = await page.locator('.reverse-stage').boundingBox();
        for (const selector of ['#reverse-label-a', '#reverse-label-b', '#reverse-label-m']) {
          const box = await page.locator(selector).boundingBox();
          assert.ok(box.x >= bounds.x && box.x + box.width <= bounds.x + bounds.width + 1, `${selector} outside width ${width}/${angle}`);
          assert.ok(box.y >= bounds.y && box.y + box.height <= bounds.y + bounds.height + 1, `${selector} outside height ${width}/${angle}`);
        }
        const boxes = await page.locator('.reverse-step').evaluateAll(els => els.map(el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right }; }));
        close(boxes[0].y, boxes[1].y, 1); close(boxes[1].y, boxes[2].y, 1);
        assert.ok(boxes[0].right < boxes[1].x && boxes[1].right < boxes[2].x);
      }
    }
    await page.setViewportSize({ width: 1440, height: 1050 });
  });

  await t.test('touch/reduced motion and unavailable WebGL keep a usable independent activity', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    const touch = await context.newPage();
    await touch.goto(url, { waitUntil: 'networkidle' });
    await touch.locator('#reverse-record').tap(); await touch.locator('#reverse-ray').tap();
    await expect(touch.locator('#card-06')).toHaveAttribute('data-reverse-state', 'complete');
    await touch.locator('#reverse-reset').tap();
    await expect(touch.locator('#reverse-ray')).toBeDisabled();
    await context.close();
    const fallback = await browser.newContext({ reducedMotion: 'reduce' });
    await fallback.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
        if (this.id === 'reverse-scene' && kind.startsWith('webgl')) return null;
        return getContext.call(this, kind, ...args);
      };
    });
    const alt = await fallback.newPage(); await alt.goto(url, { waitUntil: 'networkidle' });
    await expect(alt.locator('#reverse-fallback')).toBeVisible();
    await expect(alt.locator('#reverse-scene')).toBeHidden();
    await alt.locator('#reverse-record').click(); await alt.locator('#reverse-ray').click();
    await expect(alt.locator('#card-06')).toHaveAttribute('data-reverse-state', 'complete');
    assert.ok(await alt.locator('#reverse-fallback-svg path').count() >= 5);
    await fallback.close();
    assert.deepEqual(errors, []);
  });
});
