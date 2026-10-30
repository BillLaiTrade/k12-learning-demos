const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');

test('2.3 nitrogen packaging: approved comparison, replay and content boundaries', { timeout: 180000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: path.resolve(__dirname, '../..'), stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    let out = ''; const timer = setTimeout(() => reject(Error('Server timeout')), 5000);
    server.stdout.on('data', b => { out += b; const m = out.match(/port (\d+)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
    server.once('error', reject);
  });
  const url = process.env.NITROGEN_URL || `http://127.0.0.1:${port}/k12-learning-demos/units/2/parts/2.3/`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'], ...(process.env.NITROGEN_URL ? { proxy: { server: process.env.HTTPS_PROXY } } : {}) });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => errors.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) errors.push(r.url()); });
  await page.clock.install(); await page.goto(url, { waitUntil: 'networkidle' });
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 100)));
  const section = page.locator('#s3'), panel = section.locator('.nitrogen-compare'), button = section.locator('.nitrogen-replay');
  const state = () => panel.getAttribute('data-nitrogen-state');
  const phase = () => panel.getAttribute('data-nitrogen-phase');
  const width = () => section.locator('#nitrogen-oxygen-fill').evaluate(el => parseFloat(el.style.width));
  const artifacts = path.resolve(process.env.NITROGEN_ARTIFACT_DIR || '/tmp/unit23-nitrogen'); mkdirSync(artifacts, { recursive: true });
  const screenshot = name => section.screenshot({ path: path.join(artifacts, name + '.webp'), type: 'webp', quality: 85 });
  await t.test('both comparison results and properties are visible before interaction', async () => {
    assert.equal(await button.isEnabled(), true);
    assert.equal(await state(), 'complete'); assert.equal(await phase(), 'sealed');
    assert.equal(await section.locator('.nitrogen-example').count(), 2);
    assert.match(await section.locator('.nitrogen-control').innerText(), /氧氣約21%/);
    assert.match(await section.locator('.nitrogen-treated').innerText(), /氧氣較少[\s\S]*以氮氣為主/);
    assert.doesNotMatch(await section.locator('.nitrogen-treated').innerText(), /\d+(?:\.\d+)?%/);
    assert.equal(await section.locator('.nitrogen-preservation-note').count(), 0);
    assert.doesNotMatch(await section.innerText(), /保存效果仍與密封/);
    assert.equal(await section.locator('.nitrogen-facts>div').count(), 3);
    assert.match(await section.innerText(), /無色、無臭/); assert.match(await section.innerText(), /一般條件下[\s\S]*相對不易反應/);
    assert.match(await section.innerText(), /不支持一般燃燒/);
    assert.equal(await section.locator('.dialogue').count(), 4);
    assert.equal(await page.locator('form').count(), 1, 'no extra quiz');
    assert.equal(await section.locator('.nitrogen-pack-open').evaluate(el => getComputedStyle(el).opacity), '0');
    await screenshot('default-desktop');
  });
  await t.test('direct replay shows mixed-air exit, declining oxygen and resealing with a fixed reference', async () => {
    await button.scrollIntoViewIfNeeded();
    const control = createHash('sha256').update(await section.locator('.nitrogen-control').screenshot()).digest('hex');
    await button.click(); assert.equal(await phase(), 'air'); assert.equal(await width(), 21);
    await page.clock.runFor(1600);
    assert.equal(await phase(), 'flushing'); assert.equal(await state(), 'playing');
    assert.ok(await width() < 21 && await width() > 6);
    assert.equal(await section.locator('.nitrogen-flow').evaluate(el => getComputedStyle(el).opacity), '1');
    assert.equal(await section.locator('.nitrogen-out-label').innerText(), '原有空氣排出');
    await screenshot('flushing-desktop');
    assert.equal(createHash('sha256').update(await section.locator('.nitrogen-control').screenshot()).digest('hex'), control, 'left image and readout remain unchanged');
    await page.clock.runFor(3000); assert.equal(await phase(), 'sealing');
    await screenshot('sealing-desktop');
    await page.clock.runFor(1000); assert.equal(await state(), 'complete'); assert.equal(await phase(), 'sealed');
    assert.match(await section.locator('#nitrogen-oxygen-note').innerText(), /比例因製程而異/);
    const finalWidth = await width(); await page.clock.runFor(8000); assert.equal(await width(), finalWidth, 'no running animation after completion');
  });
  await t.test('repeated clicks replace playback instead of stacking timelines', async () => {
    await button.click(); await page.clock.runFor(3000); const later = await width();
    await button.click(); assert.equal(await phase(), 'air'); assert.equal(await width(), 21);
    await page.clock.runFor(1500); assert.ok(await width() > later);
    await page.clock.runFor(5000); assert.equal(await state(), 'complete');
  });
  await t.test('escape, background and leaving the scene pause without automatic resumption', async () => {
    await button.focus(); await page.keyboard.press('Space'); await page.clock.runFor(1700);
    await page.keyboard.press('Escape'); assert.equal(await state(), 'paused');
    const pausedWidth = await width(); await page.clock.runFor(3000); assert.equal(await width(), pausedWidth);
    await page.keyboard.press('Enter'); assert.equal(await state(), 'playing'); await page.clock.runFor(400);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal(await state(), 'paused');
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal(await state(), 'paused');
    await button.click(); await page.clock.runFor(200);
    await page.locator('#s5').scrollIntoViewIfNeeded(); await page.clock.runFor(100);
    await page.waitForFunction(() => document.querySelector('.nitrogen-compare').dataset.nitrogenState === 'paused');
    await button.scrollIntoViewIfNeeded(); await page.clock.runFor(100); assert.equal(await state(), 'paused');
    await button.click(); await page.clock.runFor(6000); assert.equal(await state(), 'complete');
  });
  await t.test('all elements stay inside the content column at seven widths, in both replay states', async () => {
    for (const screenWidth of [1440, 1280, 1024, 800, 768, 390, 320]) {
      await page.setViewportSize({ width: screenWidth, height: 1000 });
      await section.locator('h2').click();
      await button.scrollIntoViewIfNeeded();
      for (const playing of [false, true]) {
        if (playing) { await button.click(); await page.clock.runFor(1600); }
        const boxes = await section.evaluate(root => {
          const boundary = root.querySelector('.lesson-body').getBoundingClientRect();
          const nodes = root.querySelectorAll('h2,.dialogue,.nitrogen-compare,.nitrogen-example,.nitrogen-pack-view,.nitrogen-readout,.nitrogen-properties,.nitrogen-facts>div,.nitrogen-flow-label');
          return { boundary: { left: boundary.left, right: boundary.right, width: boundary.width }, children: [...nodes].map(el => { const r = el.getBoundingClientRect(); return { className: el.className, left: r.left, right: r.right, width: r.width }; }) };
        });
        assert.ok(boxes.children.every(b => b.width > 0 && b.left >= boxes.boundary.left - 1 && b.right <= boxes.boundary.right + 1), `${screenWidth}: content stays in its column`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${screenWidth}: no page overflow`);
        const pair = await section.locator('.nitrogen-example').evaluateAll(nodes => nodes.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, bottom: r.bottom, right: r.right }; }));
        if (boxes.boundary.width <= 460) assert.ok(pair[1].y >= pair[0].bottom, 'narrow container stacks both bags');
        else assert.ok(pair[1].x >= pair[0].right, 'wide container compares side by side');
        if ([1440,1024,390].includes(screenWidth)) await screenshot(`${playing ? 'flushing' : 'default'}-${screenWidth}`);
        if (playing) await page.clock.runFor(5000);
      }
    }
  });
  await t.test('mobile touch and reduced motion retain default knowledge and direct replay', async () => {
    const touch = await browser.newPage({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    await touch.clock.install(); await touch.goto(url, { waitUntil: 'networkidle' });
    await touch.locator('.nitrogen-replay').tap(); await touch.clock.runFor(1700);
    assert.equal(await touch.locator('.nitrogen-compare').getAttribute('data-nitrogen-phase'), 'flushing');
    await touch.locator('.nitrogen-replay').tap(); assert.equal(await touch.locator('.nitrogen-compare').getAttribute('data-nitrogen-phase'), 'air');
    await touch.emulateMedia({ reducedMotion: 'reduce' }); await touch.clock.runFor(100);
    assert.equal(await touch.locator('.nitrogen-compare').getAttribute('data-nitrogen-state'), 'playing');
    await touch.locator('.nitrogen-replay').tap();
    assert.equal(await touch.locator('.nitrogen-compare').getAttribute('data-nitrogen-phase'), 'air');
    await touch.clock.runFor(1500);
    assert.equal(await touch.locator('.nitrogen-compare').getAttribute('data-nitrogen-phase'), 'flushing');
    const still = await touch.locator('#nitrogen-oxygen-fill').evaluate(el => el.style.width);
    await touch.clock.runFor(1000);
    assert.equal(await touch.locator('#nitrogen-oxygen-fill').evaluate(el => el.style.width), still, 'reduced motion keeps a still image per stage');
    assert.equal(await touch.locator('.nitrogen-flow>path').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    await touch.clock.runFor(4000);
    assert.equal(await touch.locator('.nitrogen-compare').getAttribute('data-nitrogen-state'), 'complete');
    await touch.close();
  });
  await t.test('initial reduced motion and unavailable Image.decode still allow a visible replay', async () => {
    const reducedPage = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
    await reducedPage.clock.install();
    await reducedPage.addInitScript(() => { HTMLImageElement.prototype.decode = () => Promise.reject(new Error('decode unavailable')); });
    await reducedPage.goto(url, { waitUntil: 'networkidle' });
    const replay = reducedPage.locator('.nitrogen-replay');
    assert.equal(await replay.isEnabled(), true, 'image decode does not disable playback');
    await replay.click();
    assert.equal(await reducedPage.locator('.nitrogen-compare').getAttribute('data-nitrogen-phase'), 'air');
    assert.match(await reducedPage.locator('#nitrogen-oxygen-heading').innerText(), /21%/);
    await reducedPage.clock.runFor(1600);
    assert.equal(await reducedPage.locator('.nitrogen-compare').getAttribute('data-nitrogen-phase'), 'flushing');
    assert.equal(await reducedPage.locator('.nitrogen-pack-open').evaluate(el => getComputedStyle(el).opacity), '1');
    await reducedPage.locator('#s3').screenshot({ path: path.join(artifacts, 'reduced-motion-flushing.webp'), type: 'webp', quality: 85 });
    await reducedPage.clock.runFor(5000);
    assert.equal(await reducedPage.locator('.nitrogen-compare').getAttribute('data-nitrogen-phase'), 'sealed');
    await reducedPage.close();
  });
  await t.test('static no-JavaScript presentation keeps both bags, comparison and properties', async () => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
    const staticPage = await context.newPage(); await staticPage.goto(url, { waitUntil: 'networkidle' });
    assert.equal(await staticPage.locator('#s3 .nitrogen-example').count(), 2);
    for (const selector of ['.nitrogen-control', '.nitrogen-treated', '.nitrogen-facts']) assert.equal(await staticPage.locator('#s3 ' + selector).isVisible(), true);
    assert.equal(await staticPage.locator('.nitrogen-replay').isDisabled(), true);
    assert.equal(await staticPage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await context.close();
  });
  assert.deepEqual(errors, [], 'no script or asset failures');
});
