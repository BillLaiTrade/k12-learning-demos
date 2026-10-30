const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

test('2.3 composition: proportions, classification and optional emphasis', { timeout: 120000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: path.resolve(__dirname, '../..'), stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    let output = ''; const timer = setTimeout(() => reject(Error('Server startup timeout')), 5000);
    server.stdout.on('data', chunk => { output += chunk; const match = output.match(/port (\d+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
    server.once('error', reject);
  });
  const publicURL = process.env.AIR_COMPOSITION_URL;
  const url = publicURL || `http://127.0.0.1:${port}/k12-learning-demos/units/2/parts/2.3/`;
  const launch = { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] };
  if (publicURL) launch.proxy = { server: process.env.HTTPS_PROXY };
  const browser = await chromium.launch(launch); t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const failures = [];
  page.on('pageerror', e => failures.push(e.message));
  page.on('requestfailed', r => failures.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) failures.push(r.url()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  const section = page.locator('#s2');
  const artifacts = path.resolve(process.env.AIR_COMPOSITION_ARTIFACT_DIR || 'docs/reviews/unit-2.3-composition');
  mkdirSync(artifacts, { recursive: true });

  await t.test('all proportions and both classes are visible before any action', async () => {
    assert.equal(await section.locator('.air-share').count(), 100);
    for (const [gas, count] of [['nitrogen', 78], ['oxygen', 21], ['other', 1]]) {
      assert.equal(await section.locator(`.air-share[data-component="${gas}"]`).count(), count);
      assert.equal(await section.locator(`[data-air-gas="${gas}"]`).isVisible(), true);
    }
    for (const selector of ['.air-other-detail', '.permanent', '.variable', '.air-basis-note']) assert.equal(await section.locator(selector).isVisible(), true);
    assert.match(await section.locator('.air-other-detail').innerText(), /0\.93%/);
    assert.match(await section.locator('.air-other-detail').innerText(), /沒有改變比例/);
    assert.deepEqual(await section.locator('.permanent li').allTextContents(), ['氮氣', '氧氣', '氬氣', '等']);
    assert.deepEqual(await section.locator('.variable li').allTextContents(), ['二氧化碳', '水蒸氣', '臭氧', '等']);
    assert.match(await section.locator('.permanent').innerText(), /不表示不會發生反應/);
    assert.match(await section.locator('.air-basis-note').innerText(), /仍然包含二氧化碳/);
    assert.equal(await section.locator('[hidden], details, input, select').count(), 0);
  });

  await t.test('mouse, keyboard and hover emphasis never hide teaching content', async () => {
    await section.locator('[data-air-gas="oxygen"]').click();
    assert.equal(await section.getAttribute('data-emphasis'), 'oxygen');
    assert.match(await page.locator('#air-highlight-status').innerText(), /21%/);
    assert.equal(await section.locator('.air-share[data-component="nitrogen"]').first().evaluate(el => getComputedStyle(el).display), 'block');
    await section.locator('[data-air-gas="other"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await section.getAttribute('data-emphasis'), 'other');
    assert.match(await page.locator('#air-highlight-status').innerText(), /不是只有一種/);
    await section.locator('[data-air-gas="all"]').click();
    assert.equal(await section.getAttribute('data-emphasis'), 'all');
    await section.locator('[data-air-gas="nitrogen"]').hover();
    assert.equal(await section.getAttribute('data-emphasis'), 'nitrogen');
    await section.locator('h2').hover();
    assert.equal(await section.getAttribute('data-emphasis'), 'all');
    for (const gas of ['nitrogen', 'oxygen', 'other']) assert.equal(await section.locator(`[data-air-gas="${gas}"] strong`).isVisible(), true);
    assert.equal(await section.locator('.air-other-detail').isVisible(), true);
    assert.equal(await section.locator('.variable').isVisible(), true);
  });

  await t.test('desktop, laptop and narrow screens preserve order without overflow', async () => {
    for (const width of [1440, 1024, 800, 390, 320]) {
      await page.setViewportSize({ width, height: width < 760 ? 844 : 1000 });
      await section.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}: no document overflow`);
      const boxes = await section.locator('.air-share-grid, .air-legend, .air-other-detail, .permanent, .variable').evaluateAll(nodes => nodes.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, right: r.right, width: r.width, y: r.y }; }));
      assert.ok(boxes.every(box => box.width > 0 && box.x >= 0 && box.right <= width + 1), `${width}: panels fit`);
      assert.ok(boxes[2].y > boxes[0].y && boxes[3].y > boxes[2].y, `${width}: composition before detail before types`);
      if (width <= 390) assert.ok(boxes[4].y > boxes[3].y, 'narrow types stack in reading order');
      if ([1440, 1024, 390].includes(width)) await section.screenshot({ path: path.join(artifacts, `composition-${width}.webp`), type: 'webp', quality: 82 });
    }
  });

  await t.test('static content remains complete without JavaScript', async () => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const staticPage = await context.newPage(); await staticPage.goto(url, { waitUntil: 'networkidle' });
    assert.equal(await staticPage.locator('#s2 .air-share').count(), 100);
    for (const selector of ['.air-share-grid', '.air-legend', '.air-other-detail', '.permanent', '.variable', '.air-basis-note']) assert.equal(await staticPage.locator('#s2 ' + selector).isVisible(), true);
    await context.close();
  });

  await t.test('touch, reduced motion and route anchor stay usable', async () => {
    const touch = await browser.newPage({ hasTouch: true, isMobile: true, reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
    await touch.goto(url, { waitUntil: 'networkidle' });
    await touch.locator('.route a[href="#s2"]').tap();
    await touch.waitForFunction(() => document.querySelector('.route a[aria-current]')?.getAttribute('href') === '#s2');
    await touch.locator('#s2 [data-air-gas="other"]').tap();
    assert.equal(await touch.locator('#s2').getAttribute('data-emphasis'), 'other');
    assert.equal(await touch.locator('#s2 .air-share').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    await touch.locator('#s2 [data-air-gas="all"]').tap();
    assert.equal(await touch.locator('#s2').getAttribute('data-emphasis'), 'all');
    await touch.close();
  });
  assert.deepEqual(failures, [], 'no broken assets or page errors');
});
