const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
test('2.3 complete page: six teaching sections and one evidence-based quiz', { timeout: 180000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: path.resolve(__dirname, '../..'), stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    let output = ''; const timer = setTimeout(() => reject(Error('Server startup timeout')), 5000);
    server.stdout.on('data', b => { output += b; const m = output.match(/port (\d+)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
    server.once('error', reject);
  });
  const url = process.env.AIR_FULL_URL || `http://127.0.0.1:${port}/k12-learning-demos/units/2/parts/2.3/`;
  const launch = { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] };
  if (process.env.AIR_FULL_URL) launch.proxy = { server: process.env.HTTPS_PROXY };
  const browser = await chromium.launch(launch); t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => errors.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) errors.push(r.url()); });
  await page.clock.install(); await page.goto(url, { waitUntil: 'networkidle' });
  const artifacts = path.resolve(process.env.AIR_FULL_ARTIFACT_DIR || 'docs/reviews/unit-2.3-complete'); mkdirSync(artifacts, { recursive: true });
  const fields = { composition: 'mixture', sample_a: 'oxygen', sample_b: 'co2', fuel: 'wood', evidence: 'limewater', uses: 'stable' };
  const answer = async (name, value) => {
    const control = page.locator(`#gas-report-form [name="${name}"]`).first();
    if (await control.evaluate(el => el.tagName === 'SELECT')) await control.selectOption(value);
    else await page.locator(`#gas-report-form [name="${name}"][value="${value}"]`).check();
  };
  await t.test('all seven sections and routes exist, with natural dialogue and no retired experiment', async () => {
    assert.deepEqual(await page.locator('section.lesson').evaluateAll(nodes => nodes.map(n => n.id)), ['s1','s2','s3','s4','s5','s6','s7']);
    assert.equal(await page.locator('form').count(), 1);
    assert.equal(await page.locator('.route a.quiz-nav').getAttribute('href'), '#s7');
    for (let i = 1; i <= 6; i++) {
      assert.equal(await page.locator(`#s${i} .dialogue.xiaokui`).first().isVisible(), true);
      assert.equal(await page.locator(`#s${i} .dialogue.grandpa`).first().isVisible(), true);
    }
    const text = await page.locator('main').innerText();
    assert.doesNotMatch(text, /鋼絲絨|AQI|150 mL|100\.0|濕度計算/);
    assert.doesNotMatch(await page.locator('#s3').innerText(), /保存效果仍與密封/);
    assert.match(await page.locator('#s4').innerText(), /二氧化錳不是氧氣來源/);
    assert.match(await page.locator('#s5').innerText(), /相對不易反應/);
    assert.match(await page.locator('#s6').innerText(), /不能說它絕對不能用排水法/);
  });
  await t.test('default cup comparisons remain after preview and reset', async () => {
    for (const id of ['cup-before-scene', 'cup-after-scene']) assert.equal(await page.locator('#' + id + ' svg').count(), 1);
    assert.match(await page.locator('#cup-before-scene svg').getAttribute('aria-label'), /保持乾燥/);
    assert.match(await page.locator('#cup-after-scene svg').getAttribute('aria-label'), /已沾水/);
    await page.locator('[data-cup-preview="after"]').click();
    assert.equal(await page.locator('#cup-scene').getAttribute('data-preview'), 'after');
    await page.locator('#cup-reset').click();
    assert.equal(await page.locator('#cup-comparison').isVisible(), true);
    assert.equal(await page.locator('#cup-conclusion').isVisible(), true);
    assert.equal(await page.locator('#cup-scene').getAttribute('data-wet'), 'false');
  });
  await t.test('both preparations replay, pause, resume and reset without hiding results', async () => {
    for (const gas of ['oxygen','co2']) {
      const panel = page.locator(`[data-replay="${gas}"]`); await panel.scrollIntoViewIfNeeded();
      assert.equal(await panel.locator('.sequence-step').count(), 4);
      await panel.locator('[data-play]').click(); await page.clock.runFor(1400);
      assert.equal(await panel.getAttribute('data-stage'), '1');
      await panel.locator('[data-pause]').click(); const stage = await panel.getAttribute('data-stage');
      await page.clock.runFor(3000); assert.equal(await panel.getAttribute('data-stage'), stage);
      await panel.locator('[data-play]').click(); await page.clock.runFor(5000);
      assert.equal(await panel.getAttribute('data-state'), 'complete');
      assert.equal(await panel.locator('.sequence-step:visible').count(), 4);
      await panel.locator('[data-reset]').click(); assert.equal(await panel.getAttribute('data-stage'), '-1');
      assert.equal(await panel.locator('.sequence-step:visible').count(), 4);
    }
    assert.equal(await page.locator('#s4 .observation-grid figure').count(), 4);
    assert.equal(await page.locator('#s6 .observation-grid figure').count(), 6);
  });
  await t.test('leaving a replay pauses it and returning does not autoplay', async () => {
    const panel = page.locator('[data-replay="oxygen"]'); await panel.scrollIntoViewIfNeeded();
    await panel.locator('[data-play]').click();
    await page.locator('#s2').evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('[data-replay="oxygen"]').dataset.state === 'paused');
    assert.equal(await panel.getAttribute('data-state'), 'paused');
    const stage = await panel.getAttribute('data-stage');
    await panel.scrollIntoViewIfNeeded(); await page.clock.runFor(2000);
    assert.equal(await panel.getAttribute('data-stage'), stage);
    await panel.locator('[data-reset]').click();
  });
  await t.test('single quiz gives missing, misconception, revised and correct feedback; reset is local', async () => {
    const feedback = page.locator('#gas-report-feedback');
    await page.locator('#gas-report-form button[type="submit"]').click();
    assert.match(await feedback.innerText(), /尚未完成/);
    for (const [name, value] of Object.entries(fields)) await answer(name, value);
    await answer('fuel', 'oxygen');
    assert.equal(await feedback.isVisible(), false);
    await page.locator('#gas-report-form button[type="submit"]').click();
    assert.match(await feedback.innerText(), /氧氣助燃/);
    assert.equal(await feedback.locator('a').getAttribute('href'), '#s4');
    await answer('fuel', 'wood'); assert.equal(await feedback.isVisible(), false);
    await page.locator('#gas-report-form button[type="submit"]').click();
    assert.equal(await feedback.getAttribute('data-result'), 'correct');
    await page.locator('#gas-report-form button[type="reset"]').click();
    assert.equal(await feedback.isVisible(), false);
    assert.equal(await page.locator('#gas-report-form input:checked').count(), 0);
    assert.equal(await page.locator('#gas-report-form select[name="sample_a"]').inputValue(), '');
    assert.equal(await page.locator('#cup-comparison').isVisible(), true);
  });
  await t.test('seven widths keep full-width teaching bodies below their headers without overflow', async () => {
    for (const width of [1440,1280,1024,800,768,390,320]) {
      await page.setViewportSize({ width, height: width < 760 ? 844 : 1000 });
      for (let i = 1; i <= 7; i++) {
        await page.locator('#s'+i).evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
        await page.clock.runFor(20);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}: s${i} overflow`);
      }
      const layouts = await page.locator('.lesson:not(.unit-quiz)').evaluateAll(nodes => nodes.map(el => {
        const card = el.getBoundingClientRect(), body = el.querySelector('.lesson-body').getBoundingClientRect();
        const head = el.querySelector('.lesson-head').getBoundingClientRect();
        return { id:el.id, left:body.left-card.left, right:card.right-body.right, gap:body.top-head.bottom, headerTitle:!!el.querySelector('.lesson-head h2') };
      }));
      assert.equal(layouts.length, 6);
      for (const layout of layouts) {
        assert.ok(layout.headerTitle && layout.gap >= -1, `${width}: ${layout.id} title stays above content`);
        assert.ok(layout.left <= 2 && layout.right <= 2, `${width}: ${layout.id} body spans card width without a side gutter`);
      }
      const boxes = await page.locator('.gas-feature svg, .sequence-grid, .observation-grid, #gas-report-form').evaluateAll(nodes => nodes.map(el => { const r = el.getBoundingClientRect(); return {left:r.left,right:r.right,width:r.width}; }));
      assert.ok(boxes.every(r => r.width > 0 && r.left >= -1 && r.right <= width+1), `${width}: diagrams fit`);
      await page.evaluate(() => document.activeElement?.blur());
      if ([1440,390].includes(width)) for (const i of [1,3,4,5,6,7]) {
        await page.locator('#s'+i).screenshot({ path: path.join(artifacts, `section-${i}-${width}.webp`), type:'webp', quality:82 });
      }
    }
  });
  await t.test('all teaching evidence is available without JavaScript', async () => {
    const context = await browser.newContext({ javaScriptEnabled:false, viewport:{width:390,height:844} });
    const staticPage = await context.newPage(); await staticPage.goto(url, {waitUntil:'networkidle'});
    for (const selector of ['#cup-before-scene svg','#cup-after-scene svg','#s2 .air-share-grid','#s3 .nitrogen-facts','#s4 .sequence-grid','#s4 .gas-observations','#s5 .gas-feature','#s6 .sequence-grid','#s6 .gas-observations','#s7 .quiz-source']) assert.equal(await staticPage.locator(selector).first().isVisible(),true,selector);
    assert.equal(await staticPage.locator('.sequence-step').count(),8);
    await context.close();
  });
  await t.test('touch, reduced motion, keyboard selects and last-section anchor work', async () => {
    const touch = await browser.newPage({ viewport:{width:390,height:844}, hasTouch:true, isMobile:true, reducedMotion:'reduce' });
    await touch.goto(url,{waitUntil:'networkidle'});
    await touch.locator('[data-replay="oxygen"] [data-play]').tap();
    assert.equal(await touch.locator('[data-replay="oxygen"]').getAttribute('data-state'),'complete');
    assert.equal(await touch.locator('[data-replay="oxygen"] .sequence-step:visible').count(),4);
    await touch.locator('.route a[href="#s7"]').tap();
    await touch.waitForFunction(() => document.querySelector('.route a[aria-current]')?.getAttribute('href') === '#s7');
    await touch.locator('#gas-report-form select[name="sample_a"]').focus();
    await touch.keyboard.press('o'); await touch.locator('#gas-report-form select[name="sample_a"]').selectOption('oxygen');
    assert.equal(await touch.locator('#gas-report-form select[name="sample_a"]').inputValue(),'oxygen');
    await touch.close();
  });
  assert.deepEqual(errors,[],'no page errors or broken resources');
});
