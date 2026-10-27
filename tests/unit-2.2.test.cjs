const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

test('2.2 ruler can be plucked directly', { timeout: 30000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Server did not start')), 5000);
    server.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/port (\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    server.once('error', error => { clearTimeout(timer); reject(error); });
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('requestfailed', request => failures.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
  await page.clock.install();
  await page.goto(`http://127.0.0.1:${port}/units/2/parts/2.2/`, { waitUntil: 'networkidle' });
  const hit = page.locator('#ruler-pluck');
  const shape = () => hit.getAttribute('d');
  const rest = await shape();
  const waitForSound = () => page.waitForFunction(() => {
    const audio = document.querySelector('#ruler-audio');
    return !audio.paused && audio.readyState >= 3 && document.querySelector('#ruler-status').textContent.startsWith('鋼尺正在振動');
  });
  // Convert a point on the photographed ruler to viewport pixels: this checks
  // actual hit testing, rather than dispatching synthetic events to a selector.
  const pointOnRuler = () => hit.evaluate(node => {
    const bounds = node.getBBox();
    const p = new DOMPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    const point = p.matrixTransform(node.getScreenCTM());
    return { x: point.x, y: point.y };
  });
  const pluck = async () => {
    const { x, y } = await pointOnRuler();
    assert.equal(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id, { x, y }), 'ruler-pluck');
    await page.mouse.click(x, y);
    await waitForSound();
    await page.clock.runFor(40);
  };
  const stop = () => page.locator('#ruler-stop').click();

  await t.test('recording is audible without clipping, defaults to full volume and is adjustable', async () => {
    const signal = await page.evaluate(async () => {
      const audio = document.querySelector('#ruler-audio');
      const bytes = await (await fetch(audio.currentSrc || audio.src)).arrayBuffer();
      const context = new OfflineAudioContext(2, 128, 48000);
      const buffer = await context.decodeAudioData(bytes);
      let energy = 0, peak = 0, count = 0;
      for (let c = 0; c < buffer.numberOfChannels; c++) for (const sample of buffer.getChannelData(c)) {
        energy += sample * sample; peak = Math.max(peak, Math.abs(sample)); count++;
      }
      return { rms: Math.sqrt(energy / count), peak, duration: buffer.duration, volume: audio.volume, paused: audio.paused };
    });
    assert.ok(signal.rms > .08, 'recording should not be near-silent');
    assert.ok(signal.peak > .5 && signal.peak < .95, 'recording should be strong with headroom below clipping');
    assert.ok(signal.duration > 2 && signal.duration < 3);
    assert.equal(signal.volume, 1); assert.equal(signal.paused, true);
    await page.locator('#ruler-volume').evaluate(input => { input.value = '35'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal(await page.locator('#ruler-audio').evaluate(audio => audio.volume), .35);
    assert.equal(await page.locator('#ruler-volume-value').textContent(), '35%');
    await page.locator('#ruler-volume').evaluate(input => { input.value = '100'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  });

  await t.test('ruler long edges are parallel with no rest deformation at the clamp', async () => {
    const edges = await page.evaluate(async () => {
      const image = new Image();
      image.src = document.querySelector('#ruler-photo').getAttribute('href');
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      return [.45, .55, .65, .75, .85].map(fraction => {
        const x = Math.round(canvas.width * fraction), ys = [];
        for (let y = 0; y < canvas.height; y++) if (pixels[(y * canvas.width + x) * 4 + 3] > 220) ys.push(y);
        return [ys[0], ys.at(-1)];
      });
    });
    assert.ok(edges.every(([top, bottom]) => Number.isFinite(top) && bottom > top));
    for (const index of [0, 1]) {
      const ys = edges.map(edge => edge[index]);
      assert.ok(Math.max(...ys) - Math.min(...ys) <= 6, 'photographed long edges should be parallel to the front table edge');
    }
    assert.equal(await page.locator('#ruler-assembly').evaluate(node => {
      const m = node.transform.baseVal.consolidate().matrix;
      return Math.abs(m.a - m.d) < 1e-9 && Math.abs(m.b + m.c) < 1e-9;
    }), true, 'position, uniformly scale and rotate the entire assembly without skewing it');
    const screenSlopes = await page.locator('#ruler-face').evaluate(node => {
      const matrix = node.getScreenCTM();
      return [190, 250].map(y => {
        const a = new DOMPoint(450, y).matrixTransform(matrix);
        const b = new DOMPoint(850, y).matrixTransform(matrix);
        return (b.y - a.y) / (b.x - a.x);
      });
    });
    assert.ok(screenSlopes.every(slope => Math.abs(slope + Math.tan(Math.PI / 180)) < 1e-6));
    assert.ok(Math.abs(screenSlopes[0] - screenSlopes[1]) < 1e-9, 'both long edges follow the same front table edge direction');
    assert.equal(await page.locator('#ruler-moving-blade > g').evaluateAll(nodes => nodes.every(node => { const m = node.transform.baseVal.consolidate().matrix; return m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1 && m.e === 0 && m.f === 0; })), true);
  });

  await t.test('pointer pluck bends only the free segment and can be stopped', async () => {
    await hit.scrollIntoViewIfNeeded();
    const fixed = await page.locator('[clip-path="url(#ruler-fixed-region)"]').innerHTML();
    await pluck();
    assert.notEqual(await shape(), rest);
    assert.equal(await page.locator('#ruler-stop').isDisabled(), false);
    const soundTime = await page.locator('#ruler-audio').evaluate(audio => audio.currentTime);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.ok(await page.locator('#ruler-audio').evaluate(audio => audio.currentTime) > soundTime, 'recording playback should advance');
    await page.locator('#ruler-volume').evaluate(input => { input.value = '50'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal(await page.locator('#ruler-audio').evaluate(audio => audio.volume === .5 && !audio.paused), true);
    await page.locator('#ruler-volume').evaluate(input => { input.value = '100'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal(await hit.evaluate(node => getComputedStyle(node).outlineStyle), 'none');
    assert.equal(await hit.evaluate(node => getComputedStyle(node).webkitTapHighlightColor), 'rgba(0, 0, 0, 0)');
    assert.equal(await page.locator('[clip-path="url(#ruler-fixed-region)"]').innerHTML(), fixed);
    const transforms = await page.locator('#ruler-moving-blade > g').evaluateAll(nodes => nodes.map(n => {
      const matrix = n.transform.baseVal.consolidate().matrix;
      return [matrix.b, matrix.f];
    }));
    assert.notDeepEqual(transforms[0], transforms.at(-1));
    await stop();
    assert.equal(await page.locator('#ruler-audio').evaluate(audio => audio.paused && audio.currentTime === 0), true);
    assert.equal(await shape(), rest);
    assert.equal(await page.locator('#ruler-moving-blade > g').evaluateAll(nodes => nodes.every(node => { const m = node.transform.baseVal.consolidate().matrix; return m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1 && m.e === 0 && m.f === 0; })), true);
    assert.equal(await hit.evaluate(node => getComputedStyle(node).outlineStyle), 'none');
    await page.clock.runFor(1500);
    assert.equal(await shape(), rest);
  });

  await t.test('repeated plucks, keyboard, fallback button and natural decay', async () => {
    await pluck(); await pluck();
    await page.clock.runFor(1400);
    await page.waitForFunction(() => document.querySelector('#ruler-audio').ended, null, { timeout: 5000, polling: 50 });
    assert.equal(await shape(), rest);
    assert.equal(await page.locator('#ruler-start').isDisabled(), false);
    for (const key of ['Enter', 'Space']) {
      await hit.focus(); await page.keyboard.press(key); await waitForSound(); await page.clock.runFor(40);
      assert.notEqual(await shape(), rest);
      assert.equal(await hit.evaluate(node => getComputedStyle(node).outlineStyle), 'none');
      await stop();
    }
    await page.locator('#ruler-start').click(); await waitForSound(); await page.clock.runFor(40);
    assert.notEqual(await shape(), rest); await stop();
  });

  await t.test('touch pluck on a narrow screen and inactive background', async () => {
    const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const mobile = await touch.newPage();
    await mobile.goto(page.url(), { waitUntil: 'networkidle' });
    const target = mobile.locator('#ruler-pluck'); await target.scrollIntoViewIfNeeded();
    const p = await target.evaluate(node => {
      const bounds = node.getBBox();
      const point = new DOMPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2).matrixTransform(node.getScreenCTM());
      return { x: point.x, y: point.y };
    });
    await mobile.touchscreen.tap(p.x, p.y);
    await mobile.waitForFunction(() => !document.querySelector('#ruler-audio').paused);
    assert.equal(await target.evaluate(node => getComputedStyle(node).outlineStyle), 'none');
    assert.equal(await target.evaluate(node => getComputedStyle(node).webkitTapHighlightColor), 'rgba(0, 0, 0, 0)');
    await mobile.locator('#ruler-stop').click();
    await mobile.locator('#ruler-demo').click({ position: { x: 10, y: 10 } });
    assert.equal(await mobile.locator('#ruler-stop').isDisabled(), true);
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await touch.close();
  });
  assert.deepEqual(failures, []);
});
