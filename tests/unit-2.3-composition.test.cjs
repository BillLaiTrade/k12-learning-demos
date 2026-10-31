const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

test('2.3 composition: proportions, classification and optional emphasis', { timeout: 180000 }, async t => {
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
  const artifacts = path.resolve(process.env.AIR_COMPOSITION_ARTIFACT_DIR || 'docs/reviews/unit-2.3-composition-click');
  mkdirSync(artifacts, { recursive: true });

  await t.test('all proportions and both classes are visible before any action', async () => {
    assert.equal(await section.locator('.air-share').count(), 100);
    assert.match(await section.locator('#air-highlight-status').textContent(), /78%/);
    assert.equal(await section.locator('[data-gas-profile]:visible').getAttribute('data-gas-profile'), 'nitrogen');
    assert.equal(await section.locator('[data-air-gas]').count(), 4);
    assert.equal(await section.locator('[data-air-gas=all], .air-show-all').count(), 0);
    for (const [gas, count] of [['nitrogen', 78], ['oxygen', 21], ['minor', 1]]) {
      assert.equal(await section.locator(`.air-share[data-component="${gas}"]`).count(), count);
      if (gas !== 'minor') assert.equal(await section.locator(`[data-air-gas="${gas}"]`).isVisible(), true);
    }
    for (const selector of ['.permanent', '.variable', '.air-basis-note']) assert.equal(await section.locator(selector).isVisible(), true);
    assert.match(await section.locator('[data-air-gas="argon"]').innerText(), /氬氣[\s\S]*0\.93%/);
    assert.match(await section.locator('[data-air-gas="other"]').innerText(), /其餘氣體[\s\S]*少量/);
    assert.doesNotMatch(await section.locator('[data-air-gas="other"]').innerText(), /1%/);
    assert.match(await section.locator('.air-other-detail').textContent(), /0\.93%/);
    assert.match(await section.locator('.air-other-detail').textContent(), /沒有改變比例/);
    assert.deepEqual(await section.locator('.permanent li').allTextContents(), ['氮氣', '氧氣', '氬氣', '等']);
    assert.deepEqual(await section.locator('.variable li').allTextContents(), ['二氧化碳', '水蒸氣', '臭氧', '等']);
    assert.match(await section.locator('.air-basis-note').innerText(), /不表示不會發生反應/);
    assert.match(await section.locator('.air-basis-note').innerText(), /仍然包含二氧化碳/);
    assert.equal(await section.locator('.air-other-detail').isVisible(), false);
    assert.equal(await section.locator('.air-zoom-link').isVisible(), false);
    assert.equal(await section.locator('[data-air-gas=argon]').getAttribute('aria-expanded'), 'false');
    assert.equal(await section.locator('details, input, select').count(), 0);
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
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#s2 .air-share[data-component=minor]')).opacity === '1');
    assert.equal(await section.locator('.air-share[data-component="minor"]').first().evaluate(el => getComputedStyle(el).opacity), '1');
    await section.locator('.air-composition-panel').click({ position: { x: 8, y: 8 } });
    assert.equal(await section.getAttribute('data-emphasis'), 'all');
    await section.locator('[data-air-gas="nitrogen"]').hover();
    assert.equal(await section.getAttribute('data-emphasis'), 'nitrogen');
    await section.locator('h2').hover();
    assert.equal(await section.getAttribute('data-emphasis'), 'all');
    for (const gas of ['nitrogen', 'oxygen', 'argon', 'other']) assert.equal(await section.locator(`[data-air-gas="${gas}"] strong`).isVisible(), true);
    assert.equal(await section.locator('.air-other-detail').isVisible(), false);
    assert.equal(await section.locator('.variable').isVisible(), true);
  });

  await t.test('local inset opens only on a minor-component selection and closes without losing the chart', async () => {
    for (const view of ['proportion', 'mixed']) {
      await section.locator('.air-composition-panel').click({ position: { x: 8, y: 8 } });
      await section.locator(`[data-air-view="${view}"]`).click();
      await section.locator('[data-air-gas=argon]').hover();
      assert.equal(await section.locator('.air-other-detail').isVisible(), false, 'hover alone does not expand');
      await section.locator('h2').hover();
      await section.locator('[data-air-gas=other]').focus();
      assert.equal(await section.locator('.air-other-detail').isVisible(), false, 'focus alone does not expand');
      await section.locator('.air-share[data-component=minor]').click();
      assert.equal(await section.locator('.air-other-detail').isVisible(), true);
      assert.equal(await section.locator('[data-component=minor]').getAttribute('aria-expanded'), 'true');
      await section.locator('.air-other-detail h3').click();
      assert.equal(await section.locator('.air-other-detail').isVisible(), true, 'reading inside does not dismiss');
      for (const gas of ['nitrogen', 'oxygen']) {
        await section.locator(`[data-air-gas="${gas}"]`).click();
        assert.equal(await section.locator('.air-other-detail').isVisible(), false);
        await section.locator('[data-air-gas=argon]').click();
        assert.equal(await section.locator('.air-other-detail').isVisible(), true);
      }
      await section.locator('[data-air-gas=other]').click();
      const next = view === 'mixed' ? 'proportion' : 'mixed';
      await section.locator(`[data-air-view="${next}"]`).click();
      assert.equal(await section.locator('.air-other-detail').isVisible(), true, 'layout switch preserves selection and inset');
      await page.keyboard.press('Escape');
      assert.equal(await section.locator('.air-other-detail').isVisible(), false);
      assert.equal(await section.locator('[data-air-gas=argon]').getAttribute('aria-expanded'), 'false');
      for (const gas of ['nitrogen', 'oxygen', 'argon', 'other']) assert.equal(await section.locator(`[data-air-gas="${gas}"] strong`).isVisible(), true);
    }
    await section.locator('[data-air-view=proportion]').click(); await page.waitForTimeout(450);
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
    assert.equal(await section.locator('.air-zoom-link').isVisible(), false);
    await section.locator('.air-composition-panel').click({ position: { x: 8, y: 8 } });
    assert.equal(await section.getAttribute('data-emphasis'), 'all');
    assert.equal(await section.getAttribute('data-arrangement'), 'mixed', 'clicking blank preserves layout');
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
    await section.locator('.air-composition-panel').click({ position: { x: 8, y: 8 } });
  });

  await t.test('argon and other select different parts of the enlarged minor share', async () => {
    const opacity = gas => section.locator(`[data-zoom="${gas}"]`).evaluate(el => getComputedStyle(el).opacity);
    for (const view of ['proportion', 'mixed']) {
      await section.locator(`[data-air-view="${view}"]`).click();
      for (const gas of ['argon', 'other']) {
        await section.locator(`[data-air-gas="${gas}"]`).click();
        await page.waitForTimeout(450);
        assert.equal(await section.locator('.air-other-detail').isVisible(), true);
        assert.equal(await section.locator('.air-zoom-link').isVisible(), true);
        assert.ok((await section.locator('.air-zoom-link path').getAttribute('d')).startsWith('M '));
        assert.equal(await opacity(gas), '1');
        assert.equal(await opacity(gas === 'argon' ? 'other' : 'argon'), '0.2');
        assert.equal(await section.locator('.air-share[data-component=minor]').evaluate(el => getComputedStyle(el).opacity), '1');
        assert.match(await section.locator('.air-share[data-component=minor]').evaluate(el => getComputedStyle(el).outlineStyle), /solid/);
        await section.screenshot({ path: path.join(artifacts, `${view}-${gas}.webp`), type: 'webp', quality: 85 });
      }
      await section.locator('.air-composition-panel').click({ position: { x: 8, y: 8 } }); await page.waitForTimeout(200);
      assert.equal(await opacity('argon'), '1'); assert.equal(await opacity('other'), '1');
    }
    await section.locator('[data-air-view=proportion]').click(); await page.waitForTimeout(450);
  });

  await t.test('clicking shares in both layouts synchronizes legend, explanation and inset', async () => {
    const pressed = () => section.locator('[data-air-gas][aria-pressed=true]').evaluateAll(nodes => nodes.map(n => n.dataset.airGas));
    const fill = gas => section.locator(`.air-share[data-component="${gas}"]`).first().evaluate(el => getComputedStyle(el).backgroundColor);
    const originalFills = [await fill('nitrogen'), await fill('oxygen')];
    for (const view of ['proportion', 'mixed']) {
      await section.locator(`[data-air-view="${view}"]`).click(); await page.waitForTimeout(450);
      for (const [gas, legend] of [['nitrogen', ['nitrogen']], ['oxygen', ['oxygen']], ['minor', ['argon', 'other']]]) {
        const share = section.locator(`.air-share[data-component="${gas}"]`).last();
        const before = await share.boundingBox();
        await share.click(); await page.waitForTimeout(200);
        assert.equal(await section.getAttribute('data-emphasis'), gas);
        assert.equal(await section.locator('.air-other-detail').isVisible(), gas === 'minor');
        assert.deepEqual(await pressed(), legend);
        assert.equal(await share.getAttribute('aria-pressed'), 'true');
        const after = await share.boundingBox();
        assert.ok(Math.abs(before.x - after.x) < 1, 'click and hover do not move a mixed tile');
        assert.deepEqual([await fill('nitrogen'), await fill('oxygen')], originalFills, 'native button hover/pressed styles preserve gas colors');
        if (gas === 'minor') {
          assert.match(await page.locator('#air-highlight-status').innerText(), /合併氬氣.*合計約1%.*0\.93%/);
          for (const part of ['argon', 'other']) assert.equal(await section.locator(`[data-zoom="${part}"]`).evaluate(el => getComputedStyle(el).opacity), '1');
        }
      }
      await section.screenshot({ path: path.join(artifacts, `${view}-clicked-minor.webp`), type: 'webp', quality: 85 });
      await section.locator('[data-air-gas=argon]').click();
      assert.deepEqual(await pressed(), ['argon']);
      await section.locator('.air-composition-panel').click({ position: { x: 8, y: 8 } });
      assert.deepEqual(await pressed(), []);
      assert.equal(await section.locator('.air-share[aria-pressed=true]').count(), 0);
    }
    await section.locator('[data-air-view=proportion]').click(); await page.waitForTimeout(450);
  });

  await t.test('the chart is one Tab stop with spatial arrow navigation and native selection', async () => {
    const grid = section.locator('.air-share-grid');
    for (const view of ['proportion', 'mixed']) {
      await section.locator(`[data-air-view="${view}"]`).click(); await page.waitForTimeout(450);
      const oxygen = grid.locator('[data-component=oxygen]').last(); await oxygen.click();
      assert.equal(await grid.locator('[tabindex="0"]').count(), 1);
      const before = await oxygen.boundingBox();
      await page.keyboard.press('ArrowLeft');
      const focused = grid.locator('button:focus'); const after = await focused.boundingBox();
      assert.ok(after.x < before.x && Math.abs(after.y - before.y) < 1, 'left arrow follows visible positions in each layout');
      const gas = await focused.getAttribute('data-component');
      await page.keyboard.press('Space');
      assert.equal(await section.getAttribute('data-emphasis'), gas);
      assert.equal(await focused.getAttribute('aria-pressed'), 'true');
      await page.keyboard.press('Tab');
      assert.equal(await section.locator('[data-air-gas=nitrogen]').evaluate(el => el === document.activeElement), true, 'Tab exits chart instead of visiting 100 tiles');
    }
    await section.locator('.air-composition-panel').click({ position: { x: 8, y: 8 } });
    await section.locator('[data-air-view=proportion]').click(); await page.waitForTimeout(450);
  });

  await t.test('clicking beside the diagram dismisses all selections while preserving layout', async () => {
    for (const view of ['proportion', 'mixed']) {
      await section.locator(`[data-air-view="${view}"]`).click(); await page.waitForTimeout(450);
      for (const [selector, gas] of [
        ['.air-share[data-component=nitrogen]', 'nitrogen'],
        ['.air-share[data-component=oxygen]', 'oxygen'],
        ['.air-share[data-component=minor]', 'minor'],
        ['[data-air-gas=argon] strong', 'argon'],
        ['[data-air-gas=other] strong', 'other']
      ]) {
        await section.locator(selector).last().click();
        assert.equal(await section.getAttribute('data-emphasis'), gas, 'selection survives the same click bubbling to document');
        if (view === 'proportion' && gas === 'nitrogen') await section.screenshot({ path: path.join(artifacts, 'before-dismiss.webp'), type: 'webp', quality: 85 });
        await section.locator('.air-composition-panel').click({ position: { x: 8, y: 8 } });
        await page.waitForTimeout(200);
        assert.equal(await section.getAttribute('data-emphasis'), 'all');
        assert.equal(await section.locator('.air-other-detail').isVisible(), false);
        assert.equal(await section.getAttribute('data-arrangement'), view);
        assert.equal(await section.locator('#air-highlight-status').textContent(), '', 'dismiss does not restore the removed ranking sentence');
        assert.deepEqual(await section.locator('[data-air-gas][aria-pressed=true]').evaluateAll(nodes => nodes.map(n => n.dataset.airGas)), []);
        assert.equal(await section.locator('.air-share[aria-pressed=true]').count(), 0);
        for (const piece of await section.locator('.air-share, .air-zoom-piece').all()) assert.equal(await piece.evaluate(el => getComputedStyle(el).opacity), '1');
      }
      await section.locator('[data-air-gas=oxygen]').click();
      await section.locator('h2').click();
      assert.equal(await section.getAttribute('data-emphasis'), 'all', 'click outside panel also dismisses');
      await section.screenshot({ path: path.join(artifacts, `${view}-after-dismiss.webp`), type: 'webp', quality: 85 });
    }
    await section.locator('[data-air-view=proportion]').click(); await page.waitForTimeout(450);
  });

  await t.test('desktop and mobile keep the optional inset next to its source without overflow', async () => {
    for (const width of [1440, 1024, 800, 390, 320]) {
      await page.setViewportSize({ width, height: width < 760 ? 844 : 1000 });
      await section.locator('.air-composition-panel').click({ position: { x: 8, y: 8 } });
      await section.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
      assert.equal(await section.locator('.air-other-detail').isVisible(), false);
      if ([1440, 1024, 390].includes(width)) await section.screenshot({ path: path.join(artifacts, `composition-${width}.webp`), type: 'webp', quality: 82 });
      await section.locator('[data-air-gas=argon]').click();
      const boxes = await section.evaluate(root => ['.air-share-grid', '.air-legend', '.air-other-detail', '.permanent', '.variable'].map(selector => { const r = root.querySelector(selector).getBoundingClientRect(); return { x: r.x, right: r.right, width: r.width, y: r.y, bottom: r.bottom }; }));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}: no overflow`);
      assert.ok(boxes.every(box => box.width > 0 && box.x >= 0 && box.right <= width + 1), `${width}: all open panels fit`);
      assert.ok(boxes[2].y >= boxes[0].bottom && boxes[2].y - boxes[0].bottom < 25, `${width}: inset directly below chart`);
      if (width <= 390) assert.ok(boxes[1].y >= boxes[2].bottom, 'mobile: inset before legend');
      if (width === 1440) assert.ok(boxes[1].x > boxes[0].right, 'desktop: legend remains beside chart');
      await section.locator('[data-air-view=mixed]').click(); await page.waitForTimeout(450);
      const fits = await section.locator('.air-share-grid').evaluate(el => { const r = el.getBoundingClientRect(); return [...el.children].every(c => { const b = c.getBoundingClientRect(); return b.left >= r.left - 1 && b.right <= r.right + 1 && b.top >= r.top - 1 && b.bottom <= r.bottom + 1; }); });
      assert.equal(fits, true, `${width}: mixed shares fit chart`);
      await section.locator('[data-air-view=proportion]').click(); await page.waitForTimeout(450);
      if ([1440, 1024, 390].includes(width)) await section.screenshot({ path: path.join(artifacts, `expanded-${width}.webp`), type: 'webp', quality: 85 });
      await section.locator('.air-composition-panel').click({ position: { x: 8, y: 8 } });
    }
  });

  await t.test('minor choices are explicit and reading or dismissing chart emphasis retains knowledge', async () => {
    await section.locator('.air-share[data-component=minor]').click();
    assert.equal(await section.locator('[data-gas-profile]:visible').getAttribute('data-gas-profile'),'minor');
    assert.equal(await section.locator('.gas-profile:visible').count(),0,'combined share is not assigned to argon');
    await section.locator('[data-knowledge-gas=argon]').click();
    assert.equal(await section.locator('[data-gas-profile]:visible').getAttribute('data-gas-profile'),'argon');
    assert.equal(await section.locator('[data-air-gas=argon]').evaluate(n=>n===document.activeElement),true,'focus leaves the hidden chooser');
    await section.locator('#air-profile-argon h4').click();
    assert.equal(await section.getAttribute('data-emphasis'),'argon');
    await section.locator('.air-composition-panel').click({position:{x:8,y:8}});
    assert.equal(await section.getAttribute('data-emphasis'),'all');
    assert.equal(await section.locator('[data-gas-profile]:visible').getAttribute('data-gas-profile'),'argon');
    await section.locator('[data-air-gas=other]').click();
    assert.equal(await section.locator('[data-gas-profile]:visible').getAttribute('data-gas-profile'),'other');
    assert.match(await section.locator('#air-profile-other').innerText(),/不能.*全部當成二氧化碳/);
    assert.equal(await section.locator('#air-profile-other img').count(),0,'other remains a composition note');
  });

  await t.test('static content remains complete without JavaScript', async () => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const staticPage = await context.newPage(); await staticPage.goto(url, { waitUntil: 'networkidle' });
    assert.equal(await staticPage.locator('#s2 .air-share').count(), 100);
    for (const selector of ['.air-share-grid', '.air-legend', '.permanent', '.variable', '.air-basis-note']) assert.equal(await staticPage.locator('#s2 ' + selector).isVisible(), true);
    assert.equal(await staticPage.locator('#s2 [data-air-view]:disabled').count(), 2);
    assert.equal(await staticPage.locator('#s2 .air-other-detail').isVisible(), false);
    assert.match(await staticPage.locator('#s2 [data-air-gas=argon]').innerText(), /0\.93%/);
    assert.equal(await staticPage.locator('#s2 .air-share:disabled').count(), 100);
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
    await touch.locator('#s2 .air-composition-panel').tap({ position: { x: 8, y: 8 } });
    assert.equal(await touch.locator('#s2').getAttribute('data-emphasis'), 'all');
    assert.equal(await touch.locator('#s2').getAttribute('data-arrangement'), 'mixed');
    for (const view of ['proportion', 'mixed']) {
      await touch.locator(`[data-air-view="${view}"]`).tap();
      for (const gas of ['nitrogen', 'oxygen', 'minor']) {
        await touch.locator(`#s2 .air-share[data-component="${gas}"]`).last().tap();
        assert.equal(await touch.locator('#s2').getAttribute('data-emphasis'), gas);
        assert.equal(await touch.locator('#s2 .air-other-detail').isVisible(), gas === 'minor');
        await touch.locator('#s2 .air-composition-panel').tap({ position: { x: 8, y: 8 } });
        assert.equal(await touch.locator('#s2').getAttribute('data-emphasis'), 'all');
        assert.equal(await touch.locator('#s2').getAttribute('data-arrangement'), view);
        assert.equal(await touch.locator('#s2 .air-other-detail').isVisible(), false);
      }
    }
    await touch.close();
  });
  assert.deepEqual(failures, [], 'no broken assets or page errors');
});
