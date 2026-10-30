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
  const artifacts = path.resolve(process.env.AIR_COMPOSITION_ARTIFACT_DIR || 'docs/reviews/unit-2.3-composition-explore');
  mkdirSync(artifacts, { recursive: true });

  await t.test('all proportions and both classes are visible before any action', async () => {
    assert.equal(await section.locator('.air-share').count(), 100);
    for (const [gas, count] of [['nitrogen', 78], ['oxygen', 21], ['minor', 1]]) {
      assert.equal(await section.locator(`.air-share[data-component="${gas}"]`).count(), count);
      if (gas !== 'minor') assert.equal(await section.locator(`[data-air-gas="${gas}"]`).isVisible(), true);
    }
    for (const selector of ['.air-other-detail', '.permanent', '.variable', '.air-basis-note']) assert.equal(await section.locator(selector).isVisible(), true);
    assert.match(await section.locator('[data-air-gas="argon"]').innerText(), /氬氣[\s\S]*0\.93%/);
    assert.match(await section.locator('[data-air-gas="other"]').innerText(), /其餘氣體[\s\S]*少量/);
    assert.doesNotMatch(await section.locator('[data-air-gas="other"]').innerText(), /1%/);
    assert.match(await section.locator('.air-other-detail').innerText(), /0\.93%/);
    assert.match(await section.locator('.air-other-detail').innerText(), /沒有改變比例/);
    assert.deepEqual(await section.locator('.permanent li').allTextContents(), ['氮氣', '氧氣', '氬氣', '等']);
    assert.deepEqual(await section.locator('.variable li').allTextContents(), ['二氧化碳', '水蒸氣', '臭氧', '等']);
    assert.match(await section.locator('.air-basis-note').innerText(), /不表示不會發生反應/);
    assert.match(await section.locator('.air-basis-note').innerText(), /仍然包含二氧化碳/);
    assert.equal(await section.locator('[hidden], details, input, select').count(), 0);
    assert.equal(await section.locator('[data-air-view=proportion]').getAttribute('aria-pressed'), 'true');
    assert.equal(await section.locator('.air-zoom-piece').count(), 2);
    assert.equal(await section.locator('[data-air-gas]:disabled, [data-air-view]:disabled').count(), 0);
  });

  await t.test('mouse, keyboard and hover emphasis never hide teaching content', async () => {
    await section.locator('[data-air-gas="oxygen"]').click();
    assert.equal(await section.getAttribute('data-emphasis'), 'oxygen');
    assert.match(await page.locator('#air-highlight-status').innerText(), /21%/);
    assert.equal(await section.locator('.air-share[data-component="nitrogen"]').first().evaluate(el => getComputedStyle(el).display), 'block');
    await section.locator('[data-air-gas="other"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await section.getAttribute('data-emphasis'), 'other');
    assert.match(await page.locator('#air-highlight-status').innerText(), /不再包含已單獨列出的氬氣/);
    await section.locator('[data-air-gas="argon"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await section.getAttribute('data-emphasis'), 'argon');
    assert.match(await page.locator('#air-highlight-status').innerText(), /0\.93%/);
    assert.equal(await section.locator('.air-share[data-component="minor"]').first().evaluate(el => getComputedStyle(el).opacity), '1');
    await section.locator('[data-air-gas="all"]').click();
    assert.equal(await section.getAttribute('data-emphasis'), 'all');
    await section.locator('[data-air-gas="nitrogen"]').hover();
    assert.equal(await section.getAttribute('data-emphasis'), 'nitrogen');
    await section.locator('h2').hover();
    assert.equal(await section.getAttribute('data-emphasis'), 'all');
    for (const gas of ['nitrogen', 'oxygen', 'argon', 'other']) assert.equal(await section.locator(`[data-air-gas="${gas}"] strong`).isVisible(), true);
    assert.equal(await section.locator('.air-other-detail').isVisible(), true);
    assert.equal(await section.locator('.variable').isVisible(), true);
  });

  await t.test('both arrangements preserve all shares, selection and a visible connector', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const positions = () => section.locator('.air-share').evaluateAll(nodes => { const grid = nodes[0].parentElement.getBoundingClientRect(); return nodes.map(el => { const r = el.getBoundingClientRect(); return [r.x - grid.x, r.y - grid.y]; }); });
    const initial = await positions();
    await section.locator('[data-air-gas=oxygen]').click();
    await section.locator('[data-air-view=mixed]').click();
    await page.waitForTimeout(450);
    assert.equal(await section.getAttribute('data-arrangement'), 'mixed');
    assert.equal(await section.getAttribute('data-emphasis'), 'oxygen');
    assert.equal(await section.locator('[data-air-gas=oxygen]').getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('#air-highlight-status').innerText(), /21%.*排列改變，比例不變/);
    const mixed = await positions();
    assert.notDeepEqual(mixed, initial);
    assert.equal(new Set(mixed.map(p => p.join(','))).size, 100, 'each share occupies a distinct position');
    assert.ok(mixed.every(p => initial.some(q => Math.abs(p[0] - q[0]) < 1 && Math.abs(p[1] - q[1]) < 1)), 'same 100 positions, allowing subpixel rounding');
    assert.equal(await section.locator('.air-share[data-component=nitrogen]').count(), 78);
    assert.equal(await section.locator('.air-share[data-component=oxygen]').count(), 21);
    assert.equal(await section.locator('.air-share[data-component=minor]').count(), 1);
    assert.ok((await section.locator('.air-zoom-link path').getAttribute('d')).startsWith('M '));
    await section.locator('[data-air-gas=all]').click();
    assert.equal(await section.getAttribute('data-emphasis'), 'all');
    assert.equal(await section.getAttribute('data-arrangement'), 'mixed', 'show all preserves layout');
    assert.equal(await section.locator('[data-air-view=mixed]').getAttribute('aria-pressed'), 'true');
    await section.screenshot({ path: path.join(artifacts, 'mixed-all.webp'), type: 'webp', quality: 85 });
    await section.locator('[data-air-gas=nitrogen]').click();
    await section.screenshot({ path: path.join(artifacts, 'mixed-nitrogen.webp'), type: 'webp', quality: 85 });
    await section.locator('[data-air-view=proportion]').focus(); await page.keyboard.press('Space');
    await page.waitForTimeout(450);
    assert.ok((await positions()).every((p, i) => Math.abs(p[0] - initial[i][0]) < 1 && Math.abs(p[1] - initial[i][1]) < 1), 'original order is restored');
    assert.equal(await section.getAttribute('data-emphasis'), 'nitrogen');
    await section.locator('[data-air-gas=oxygen]').click();
    await section.screenshot({ path: path.join(artifacts, 'proportion-oxygen.webp'), type: 'webp', quality: 85 });
    await section.locator('[data-air-gas=all]').click();
  });

  await t.test('argon and other select different parts of the enlarged minor share', async () => {
    const opacity = gas => section.locator(`[data-zoom="${gas}"]`).evaluate(el => getComputedStyle(el).opacity);
    for (const view of ['proportion', 'mixed']) {
      await section.locator(`[data-air-view="${view}"]`).click();
      for (const gas of ['argon', 'other']) {
        await section.locator(`[data-air-gas="${gas}"]`).click();
        await page.waitForTimeout(450);
        assert.equal(await opacity(gas), '1');
        assert.equal(await opacity(gas === 'argon' ? 'other' : 'argon'), '0.2');
        assert.equal(await section.locator('.air-share[data-component=minor]').evaluate(el => getComputedStyle(el).opacity), '1');
        assert.match(await section.locator('.air-share[data-component=minor]').evaluate(el => getComputedStyle(el).outlineStyle), /solid/);
        await section.screenshot({ path: path.join(artifacts, `${view}-${gas}.webp`), type: 'webp', quality: 85 });
      }
      await section.locator('[data-air-gas=all]').click(); await page.waitForTimeout(200);
      assert.equal(await opacity('argon'), '1'); assert.equal(await opacity('other'), '1');
    }
    await section.locator('[data-air-view=proportion]').click(); await page.waitForTimeout(450);
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
      await section.locator('[data-air-view=mixed]').click(); await page.waitForTimeout(450);
      const fits = await section.locator('.air-share-grid').evaluate(el => { const r = el.getBoundingClientRect(); return [...el.children].every(c => { const b = c.getBoundingClientRect(); return b.left >= r.left - 1 && b.right <= r.right + 1 && b.top >= r.top - 1 && b.bottom <= r.bottom + 1; }); });
      assert.equal(fits, true, `${width}: mixed shares fit chart`);
      await section.locator('[data-air-view=proportion]').click(); await page.waitForTimeout(450);
      if ([1440, 1024, 390].includes(width)) await section.screenshot({ path: path.join(artifacts, `composition-${width}.webp`), type: 'webp', quality: 82 });
    }
  });

  await t.test('static content remains complete without JavaScript', async () => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const staticPage = await context.newPage(); await staticPage.goto(url, { waitUntil: 'networkidle' });
    assert.equal(await staticPage.locator('#s2 .air-share').count(), 100);
    for (const selector of ['.air-share-grid', '.air-legend', '.air-other-detail', '.permanent', '.variable', '.air-basis-note']) assert.equal(await staticPage.locator('#s2 ' + selector).isVisible(), true);
    assert.equal(await staticPage.locator('#s2 [data-air-view]:disabled').count(), 2);
    assert.equal(await staticPage.locator('#s2 .air-zoom-bar').isVisible(), true);
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
    await touch.locator('#s2 [data-air-view=mixed]').tap();
    assert.equal(await touch.locator('#s2').getAttribute('data-emphasis'), 'other');
    assert.equal(await touch.locator('#s2').getAttribute('data-arrangement'), 'mixed');
    await touch.locator('#s2 [data-air-gas="all"]').tap();
    assert.equal(await touch.locator('#s2').getAttribute('data-emphasis'), 'all');
    assert.equal(await touch.locator('#s2').getAttribute('data-arrangement'), 'mixed');
    await touch.close();
  });
  assert.deepEqual(failures, [], 'no broken assets or page errors');
});
