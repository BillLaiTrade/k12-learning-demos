const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');

test('6.1 element lesson in a real browser', { timeout: 60000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('HTTP server did not start')), 5000);
    server.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/port (\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    server.once('error', reject);
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`HTTP server exited ${code}`)); });
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const failures = [];
  const watch = p => {
    p.on('pageerror', error => failures.push(error.message));
    p.on('requestfailed', request => failures.push(request.url()));
    p.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  };
  watch(page);
  const base = process.env.ELEMENTS_URL || `http://127.0.0.1:${port}/units/6/parts/6.1/`;
  await page.goto(base);
  const text = selector => page.locator(selector).innerText();
  const pressed = selector => page.locator(selector).getAttribute('aria-pressed');
  const captureDir = process.env.ELEMENTS_CAPTURE_DIR;
  if (captureDir) await fs.mkdir(captureDir, { recursive: true });
  async function capture(selector, name) {
    if (captureDir) await page.locator(selector).screenshot({ path: path.join(captureDir, `${name}.png`) });
  }

  await t.test('six approved topics, one assessment, shared characters and working anchors', async () => {
    assert.deepEqual(await page.locator('.lesson-card h2').allTextContents(), [
      '古人說的「元素」，和今天一樣嗎？', '金屬與非金屬有哪些典型性質？',
      '金屬和非金屬，有沒有例外？', '元素的名稱和符號，怎麼對起來？',
      '石墨和鑽石差這麼多，為什麼都和碳有關？', '怎樣向別人說清楚這份元素樣品資料？'
    ]);
    assert.equal(await page.locator('form').count(), 1);
    assert.equal(await page.locator('#s1 input,#s2 input,#s3 input,#s4 input,#s5 input').count(), 0);
    for (const href of await page.locator('.route a').evaluateAll(links => links.map(a => a.hash))) {
      assert.equal(await page.locator(href).count(), 1);
    }
    const avatar = await page.locator('.speaker').first().evaluate(node => getComputedStyle(node, '::before').backgroundImage);
    assert.match(avatar, /shared-assets\/characters\/dialogue-character-avatars.png/);
    assert.doesNotMatch(await text('body'), /CARD\s*0|Part|候選版|製作階段/);
    assert.equal(await page.locator('#review-submit').isEnabled(), true);
  });

  await t.test('history reveals cumulative evidence and preserves chronological distinction', async () => {
    assert.equal(await page.locator('[data-history-panel="1"]').isVisible(), false);
    await page.locator('[data-history="1"]').click();
    assert.equal(await page.locator('[data-history-panel="0"]').isVisible(), true);
    assert.equal(await page.locator('[data-history-panel="1"]').isVisible(), true);
    assert.equal(await page.locator('[data-history-panel="2"]').isVisible(), false);
    await page.locator('[data-history="2"]').click();
    for (const panel of await page.locator('[data-history-panel]').all()) assert.equal(await panel.isVisible(), true);
    assert.match(await text('#history-note'), /不要把這項水電解實驗歸給波以耳/);
    assert.match(await text('[data-history-panel="2"]'), /後來/);
    await page.locator('[data-history="0"]').click();
    assert.equal(await page.locator('[data-history-panel="1"]').isVisible(), false);
    await page.locator('[data-history="2"]').click();
    await capture('#s1', 'history-desktop');
  });

  await t.test('property controls change the comparison focus, keep samples and do not grade', async () => {
    const originalNames = await page.locator('#properties-table tbody th').allTextContents();
    assert.equal(originalNames.length, 5);
    for (const key of ['conductivity', 'ductility', 'uses', 'appearance']) {
      await page.locator(`[data-property="${key}"]`).click();
      assert.equal(await pressed(`[data-property="${key}"]`), 'true');
      assert.equal(await page.locator('#properties-table .active-column').count(), 6);
      assert.equal(await page.locator('#properties-table .active-column').evaluateAll(nodes => nodes.every(n => n.dataset.column === nodes[0].dataset.column)), true);
      assert.deepEqual(await page.locator('#properties-table tbody th').allTextContents(), originalNames);
      assert.ok((await text('#property-note')).length > 30);
    }
    await page.locator('[data-property="conductivity"]').click();
    assert.match(await text('#properties-table tr[data-sample="diamond"]'), /不易導電/);
    assert.match(await text('#property-note'), /下一段加入石墨/);
    await capture('#s2', 'properties-desktop');
  });

  await t.test('exceptions genuinely add independent data, support both counterexamples and reset', async () => {
    assert.equal(await page.locator('#exceptions-table tbody tr').count(), 5);
    await page.locator('[data-exception="graphite"]').click();
    assert.equal(await page.locator('#exceptions-table tbody tr').count(), 6);
    assert.deepEqual(await page.locator('#exceptions-table tr[data-sample="graphite"] td').allTextContents(), ['非金屬', '固體', '可導電']);
    await page.locator('[data-exception="mercury"]').click();
    assert.equal(await page.locator('#exceptions-table tbody tr').count(), 7);
    assert.deepEqual(await page.locator('#exceptions-table tr[data-sample="mercury"] td').allTextContents(), ['金屬', '液體', '可導電']);
    assert.match(await text('#exception-note'), /能導電就一定是金屬/);
    assert.match(await text('#exception-note'), /室溫下全部是固體/);
    await page.locator('[data-exception="graphite"]').click();
    assert.equal(await page.locator('#exceptions-table tr[data-sample="graphite"]').count(), 0);
    assert.equal(await page.locator('#exceptions-table tr[data-sample="mercury"]').count(), 1);
    await page.locator('#exceptions-reset').click();
    assert.equal(await page.locator('#exceptions-table tbody tr').count(), 5);
    assert.equal(await pressed('[data-exception="mercury"]'), 'false');
    assert.equal(await pressed('[data-property="conductivity"]'), 'true');
  });

  await t.test('all element names resolve to correct case, including mercury naming exception', async () => {
    const expected = { H: '氫', He: '氦', C: '碳', Ca: '鈣', Cu: '銅', Fe: '鐵', Al: '鋁', S: '硫', Hg: '汞' };
    assert.equal(await page.locator('[data-symbol]').count(), Object.keys(expected).length);
    for (const [symbol, name] of Object.entries(expected)) {
      await page.locator(`[data-symbol="${symbol}"]`).click();
      assert.equal(await text('#symbol-glyph'), symbol);
      assert.equal(await text('#symbol-name'), name);
      assert.equal(await page.locator('#symbol-glyph .symbol-lower').count(), symbol.length - 1);
      assert.match(await text('#symbol-writing'), /大寫/);
      if (symbol.length === 2) assert.match(await text('#symbol-writing'), /小寫/);
    }
    assert.match(await text('#symbol-clue'), /液態金屬/);
    await page.locator('[data-symbol="Al"]').click();
    assert.match(await text('#symbol-clue'), /小寫 l/);
    await capture('#s4', 'symbols-desktop');
  });

  await t.test('carbon observations preserve identity and explain samples without teaching atomic structure early', async () => {
    assert.deepEqual(await page.locator('.carbon-sample h3 span').allTextContents(), ['C', 'C']);
    await page.locator('[data-carbon="conductivity"]').click();
    assert.match(await text('#graphite-detail'), /可以導電/);
    assert.match(await text('#diamond-detail'), /不易導電/);
    await page.locator('[data-carbon="uses"]').click();
    assert.match(await text('#graphite-detail'), /黏土，不是純碳/);
    assert.match(await text('#diamond-detail'), /切割/);
    assert.deepEqual(await page.locator('.carbon-sample h3 span').allTextContents(), ['C', 'C']);
    await page.locator('[data-carbon="appearance"]').click();
    assert.match(await text('#graphite-detail'), /較軟/);
    assert.match(await text('#diamond-detail'), /堅硬/);
    assert.doesNotMatch(await text('#s5'), /層狀結構|四面體|共價鍵|鍵角/);
    await capture('#s5', 'carbon-desktop');
  });

  await t.test('one integrated assessment handles incomplete, incorrect and correct evidence', async () => {
    await page.locator('#review-submit').click();
    assert.match(await text('#review-feedback'), /尚未完成/);
    assert.equal(await page.locator('#review-feedback ul').count(), 0);
    await page.locator('#match-copper').selectOption('Fe');
    await page.locator('#match-iron').selectOption('Cu');
    await page.locator('[name=wire][value=color]').check();
    await page.locator('[name=wire][value=solid]').check();
    await page.locator('[name=claim][value=always]').check();
    await page.locator('#review-submit').click();
    assert.match(await text('#review-feedback'), /需要再核對/);
    assert.equal(await page.locator('#review-feedback').evaluate(n => n.classList.contains('success')), false);
    assert.match(await text('#review-feedback'), /石墨/);
    await page.locator('#match-copper').selectOption('Cu');
    assert.equal(await page.locator('#review-feedback').isVisible(), false);
    assert.match(await text('#review-edit-note'), /重新檢查/);
    await page.locator('#match-iron').selectOption('Fe');
    await page.locator('[name=wire][value=color]').uncheck();
    await page.locator('[name=wire][value=solid]').uncheck();
    await page.locator('[name=wire][value=conductivity]').check();
    await page.locator('[name=wire][value=ductility]').check();
    await page.locator('[name=claim][value=graphite]').check();
    await page.locator('#review-submit').click();
    assert.equal(await page.locator('#review-feedback').evaluate(n => n.classList.contains('success')), true);
    assert.match(await text('#review-feedback'), /兩項性質一起支持/);
    await page.locator('[name=wire][value=color]').check();
    assert.equal(await page.locator('#review-feedback').isVisible(), false);
    await page.locator('#review-submit').click();
    assert.equal(await page.locator('#review-feedback').evaluate(n => n.classList.contains('success')), false);
    await page.locator('[type=reset]').click();
    assert.equal(await page.locator('#match-copper').inputValue(), '');
    assert.equal(await page.locator('#match-iron').inputValue(), '');
    assert.equal(await page.locator('#review-form input:checked').count(), 0);
    assert.equal(await page.locator('#review-feedback').isVisible(), false);
    assert.equal(await text('#review-edit-note'), '');
  });

  await t.test('native controls work by keyboard and reduced motion', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('[data-property="ductility"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await pressed('[data-property="ductility"]'), 'true');
    await page.locator('[data-symbol="Cu"]').focus();
    await page.keyboard.press('Space');
    assert.equal(await text('#symbol-glyph'), 'Cu');
    await page.locator('[data-exception="mercury"]').focus();
    await page.keyboard.press('Enter');
    assert.match(await text('#exception-note'), /液態金屬/);
  });

  await t.test('desktop and narrow layouts contain their content and tables can scroll locally', async () => {
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `page overflow at ${width}`);
      for (const card of await page.locator('.lesson-card').all()) {
        const rect = await card.boundingBox();
        assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 1, `card outside viewport at ${width}`);
      }
      if (width === 390) {
        assert.equal(await page.locator('#s2 .table-wrap').evaluate(n => n.scrollWidth > n.clientWidth), true);
        await capture('#s2', 'properties-mobile');
        await capture('#s6', 'assessment-mobile');
      }
    }
  });

  await t.test('touch controls work on a narrow viewport', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const mobile = await context.newPage();
    watch(mobile);
    await mobile.goto(base);
    await mobile.locator('[data-history="2"]').tap();
    assert.equal(await mobile.locator('[data-history-panel="2"]').isVisible(), true);
    await mobile.locator('[data-exception="graphite"]').tap();
    assert.equal(await mobile.locator('#exceptions-table tr[data-sample="graphite"]').count(), 1);
    await mobile.locator('[data-symbol="He"]').tap();
    assert.equal(await mobile.locator('#symbol-glyph').innerText(), 'He');
    await context.close();
  });

  await t.test('unit and site navigation reach the lesson without dead future links', async () => {
    await page.goto(new URL('../../', base).href);
    const lesson = page.getByRole('link', { name: /6.1/ });
    await lesson.click();
    assert.match(page.url(), /\/units\/6\/parts\/6\.1\//);
    await page.goto(new URL('../../../../', base).href);
    await page.getByRole('link', { name: '進入單元 6', exact: true }).click();
    assert.match(page.url(), /\/units\/6\//);
    assert.equal(await page.locator('main a').count(), 1);
    assert.deepEqual(failures, []);
  });
});
