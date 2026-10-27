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
    await page.clock.runFor(40);
  };
  const stop = () => page.locator('#ruler-stop').click();

  await t.test('pointer pluck bends only the free segment and can be stopped', async () => {
    await hit.scrollIntoViewIfNeeded();
    const fixed = await page.locator('[clip-path="url(#ruler-fixed-region)"]').innerHTML();
    await pluck();
    assert.notEqual(await shape(), rest);
    assert.equal(await page.locator('#ruler-stop').isDisabled(), false);
    assert.equal(await hit.evaluate(node => getComputedStyle(node).outlineStyle), 'none');
    assert.equal(await hit.evaluate(node => getComputedStyle(node).webkitTapHighlightColor), 'rgba(0, 0, 0, 0)');
    assert.equal(await page.locator('[clip-path="url(#ruler-fixed-region)"]').innerHTML(), fixed);
    const transforms = await page.locator('#ruler-moving-blade > g').evaluateAll(nodes => nodes.map(n => {
      const matrix = n.transform.baseVal.consolidate().matrix;
      return [matrix.b, matrix.f];
    }));
    assert.notDeepEqual(transforms[0], transforms.at(-1));
    await stop();
    assert.equal(await shape(), rest);
    assert.equal(await hit.evaluate(node => getComputedStyle(node).outlineStyle), 'none');
    await page.clock.runFor(1500);
    assert.equal(await shape(), rest);
  });

  await t.test('repeated plucks, keyboard, fallback button and natural decay', async () => {
    await pluck(); await pluck();
    await page.clock.runFor(1400);
    assert.equal(await shape(), rest);
    assert.equal(await page.locator('#ruler-start').isDisabled(), false);
    for (const key of ['Enter', 'Space']) {
      await hit.focus(); await page.keyboard.press(key); await page.clock.runFor(40);
      assert.notEqual(await shape(), rest);
      assert.equal(await hit.evaluate(node => getComputedStyle(node).outlineStyle), 'none');
      await stop();
    }
    await page.locator('#ruler-start').click(); await page.clock.runFor(40);
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
    await mobile.waitForFunction(() => !document.querySelector('#ruler-stop').disabled);
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
