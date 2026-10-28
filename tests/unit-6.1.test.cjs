const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');
const { createHash } = require('node:crypto');

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

  await t.test('asset versions match content and avoid the legacy unversioned fire script', async () => {
    const assetURLs = await page.locator('link[rel=stylesheet],script[src]').evaluateAll(nodes => nodes.map(node => node.href || node.src));
    assert.equal(assetURLs.length, 5);
    for (const assetURL of assetURLs) {
      const url = new URL(assetURL);
      const filename = path.basename(url.pathname);
      const bytes = await fs.readFile(path.resolve(__dirname, '../units/6/parts/6.1/assets', filename));
      assert.equal(url.searchParams.get('v'), createHash('sha256').update(bytes).digest('hex').slice(0, 12), filename);
    }
    const context = await browser.newContext();
    try {
      let legacyRequests = 0;
      await context.route('**/assets/classical-inquiry.js*', async route => {
        if (!new URL(route.request().url()).search) {
          legacyRequests++;
          await route.fulfill({ contentType: 'text/javascript', body: 'window.ClassicalInquiry={render(){document.querySelector("#inquiry-diagram").textContent="銀白色鎂帶"}};' });
        } else await route.continue();
      });
      const revisited = await context.newPage();
      await revisited.goto(base);
      await revisited.locator('[data-classical=fire]').click();
      assert.match(await revisited.locator('#inquiry-instruction').innerText(), /熟悉的蠟燭/);
      assert.equal(await revisited.locator('#inquiry-controls button').count(), 0);
      assert.doesNotMatch(await revisited.locator('#inquiry-diagram').innerText(), /鎂帶|氧化鎂/);
      assert.equal(legacyRequests, 0);
    } finally { await context.close(); }
  });

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

  await t.test('four complete aligned pairs are visible before clicking; details never replace results', async () => {
    const rows = page.locator('[data-classical]');
    assert.equal(await rows.count(), 4);
    assert.equal(await page.locator('#classical-detail').isVisible(), false);
    const expected = ['日常泥土通常是混合物','水是化合物','日常空氣是混合物','火焰是燃燒的現象'];
    assert.deepEqual(await page.locator('.modern-cell strong').allTextContents(), expected);
    const initial = await rows.allTextContents();
    await capture('#s1', 'comparison-initial-desktop');
    for (const key of ['earth','fire','air','water','earth','water']) {
      await page.locator(`[data-classical="${key}"]`).click();
      assert.equal(await page.locator('#classical-detail').isVisible(), true);
      assert.equal(await page.locator('[data-classical][aria-expanded=true]').count(), 1);
      assert.deepEqual(await rows.allTextContents(), initial);
      for (const row of await rows.all()) assert.equal(await row.isVisible(), true);
      assert.equal(await page.locator('.water-record').count(), key === 'water' ? 2 : 0);
    }
    assert.match(await text('#inquiry-feedback'), /已確認的氫與氧/);
    assert.match(await text('#inquiry-diagram-note'), /未表示氣體體積比例/);
    await capture('#s1', 'comparison-water-desktop');
    await page.locator('#inquiry-research summary').click();
    assert.match(await text('#history-scope'), /並不是波以耳/);
    await page.locator('#classical-close').click();
    assert.equal(await page.locator('#classical-detail').isVisible(), false);
    assert.equal(await page.locator('[data-classical][aria-expanded=true]').count(), 0);
    assert.equal(await page.locator('[data-classical=water]').evaluate(n => n === document.activeElement), true);
    assert.deepEqual(await rows.allTextContents(), initial);
  });

  await t.test('each classical item has its own past, evidence and modern explanation', async () => {
    const expected = {
      earth: ['土', /道庫恰耶夫/, /礦物、有機物/, /混合物/],
      water: ['水', /卡文迪西/, /拉瓦節與拉普拉斯/, /化合物/],
      air: ['氣', /布萊克/, /普利斯特里/, /混合物/],
      fire: ['火', /拉瓦節/, /質量增加/, /燃燒/]
    };
    const explanations = new Set();
    const original = await page.locator('[data-classical]').allTextContents();
    for (const [key, [name, first, second, conclusion]] of Object.entries(expected)) {
      await page.locator(`[data-classical="${key}"]`).click();
      assert.equal(await text('#classical-history-title'), `${name}的觀念發展脈絡`);
      assert.equal(await page.locator('.inquiry-stage').count(), 3);
      await page.locator('#inquiry-research summary').click();
      assert.equal(await page.locator('[data-stage=past]').isVisible(), true);
      assert.equal(await page.locator('[data-stage=evidence]').isVisible(), true);
      assert.equal(await page.locator('[data-stage=modern]').isVisible(), true);
      assert.match(await text('#history-evidence-text'), first);
      assert.match((await text('#history-evidence-text')) + (await text('#history-observation')), second);
      assert.match(await text('#history-modern-title'), conclusion);
      assert.ok((await text('#history-past-text')).length > 30);
      assert.ok((await text('#history-scope')).length > 30);
      assert.ok(await page.locator('#history-sources a').count() >= 2);
      explanations.add(await text('#history-evidence-text'));
      assert.deepEqual(await page.locator('[data-classical]').allTextContents(), original);
      await page.locator('#inquiry-research summary').click();
      await capture('#classical-detail', `history-${key}-desktop`);
    }
    assert.equal(explanations.size, 4);
    assert.equal(await page.locator('#s1 .visual-inquiry').count(), 1);
    await page.setViewportSize({width:390,height:1000});
    await page.locator('[data-classical=air]').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    const panels = await page.locator('.inquiry-stage').all();
    for (let i=1;i<panels.length;i++) {
      const a=await panels[i-1].boundingBox(), b=await panels[i].boundingBox();
      assert.ok(b.y >= a.y + a.height);
    }
    await capture('#classical-detail', 'history-air-mobile');
    await page.locator('#classical-close').click();
    await page.setViewportSize({width:1440,height:1000});
  });

  await t.test('visual evidence responds to exploration while keeping main results visible', async () => {
    await page.locator('[data-classical=earth]').click();
    assert.equal(await page.locator('#inquiry-research').getAttribute('open'), null);
    assert.equal(await page.locator('.soil-target').count(), 4);
    assert.equal(await page.locator('.soil-observer image').evaluate(n => n.href.baseVal.endsWith('soil-composition.png')), true);
    for (const value of ['mineral','organic','water','air']) {
      await page.locator(`button[data-observation="${value}"]`).click();
      assert.equal(await page.locator('.soil-target.focused').getAttribute('data-observe'), value);
      assert.equal(await page.locator(`button[data-observation="${value}"]`).getAttribute('aria-pressed'), 'true');
    }
    assert.match(await text('#inquiry-feedback'), /未被水填滿的孔隙/);
    await page.locator('[data-observe=mineral]').focus(); await page.keyboard.press('Enter');
    assert.match(await text('#inquiry-feedback'), /岩石風化/);
    await page.locator('[data-classical=water]').click();
    assert.match(await text('.water-record[data-focus=formation]'), /冷卻後，容器壁出現水滴/);
    assert.match(await text('.water-record[data-focus=decomposition]'), /兩側收集的氣體，分別是氫與氧/);
    assert.match(await page.locator('.water-record[data-focus=decomposition] svg').getAttribute('aria-label'), /負極收集氫氣、正極收集氧氣/);
    for (const value of ['formation','decomposition']) {
      await page.locator(`button[data-observation="${value}"]`).click();
      assert.equal(await page.locator('.water-record.focused').getAttribute('data-focus'), value);
      for (const record of await page.locator('.water-record').all()) assert.equal(await record.isVisible(), true);
    }
    await page.locator('[data-classical=air]').click();
    await page.waitForFunction(() => [...document.querySelectorAll('#visual-inquiry img')].every(img => img.complete && img.naturalWidth > 1000));
    assert.equal(await page.locator('.gas-record img').count(), 3);
    assert.match(await text('#inquiry-diagram-note'), /氣體均無色/);
    for (const value of ['oxygen','carbon','ordinary']) {
      await page.locator(`button[data-observation="${value}"]`).click();
      assert.equal(await page.locator('.gas-record.focused').getAttribute('data-focus'), value);
      assert.equal(await page.locator('.gas-record').count(), 3);
    }
    assert.match(await page.locator('.air-composition').textContent(), /氮.*氧.*其他氣體/);
    await page.locator('button[data-observation=carbon]').click();
    assert.match(await text('#inquiry-feedback'), /不足以證明空氣是混合物/);
    await page.locator('[data-classical=fire]').click();
    assert.match(await text('#inquiry-title'), /火.*燃燒時的現象/);
    await page.waitForFunction(() => [...document.querySelectorAll('#visual-inquiry img')].every(img => img.complete && img.naturalWidth > 1000));
    assert.equal(await page.locator('.fire-sequence img').count(), 2);
    assert.match(await text('.fire-burning'), /火焰發光、放熱/);
    assert.match(await text('.fire-after'), /水蒸氣、二氧化碳/);
    assert.match(await text('.fire-findings'), /火焰是燃燒時的現象/);
    assert.match(await text('.candle-reaction'), /蠟.*氧氣.*充分燃燒/s);
    assert.equal(await page.locator('#inquiry-controls button').count(), 0);
    assert.equal(await page.locator('#inquiry-controls').isVisible(), false);
    assert.equal(await page.locator('#inquiry-feedback').isVisible(), false);
    assert.match(await text('#inquiry-diagram-note'), /蠟融化本身不是燃燒/);
    assert.doesNotMatch(await text('#visual-inquiry'), /鎂帶|氧化鎂/);
    await page.locator('[data-classical=earth]').click();
    assert.equal(await page.locator('#inquiry-controls').isVisible(), true);
    assert.equal(await page.locator('#inquiry-feedback').isVisible(), true);
    assert.equal(await page.locator('#visual-inquiry').getAttribute('data-observation'), 'water');
    assert.equal(await page.locator('.water-record').count(), 0);
    await page.locator('#classical-close').click();
  });

  await t.test('comparison pairs share a row at every width, and details appear below all pairs', async () => {
    for (const width of [1440,1280,1024,768,390,320]) {
      await page.setViewportSize({width,height:1000});
      const rects = [];
      for (const row of await page.locator('[data-classical]').all()) {
        const left = await row.locator('.ancient-cell').boundingBox();
        const right = await row.locator('.modern-cell').boundingBox();
        assert.ok(left.x + left.width <= right.x, `left/right at ${width}`);
        assert.ok(Math.abs(left.y - right.y) < 1, `paired y at ${width}`);
        assert.ok(Math.abs(left.height - right.height) < 1, `paired height at ${width}`);
        rects.push(await row.boundingBox());
      }
      for (let i=1;i<rects.length;i++) assert.ok(rects[i].y >= rects[i-1].y + rects[i-1].height - 1);
      await page.locator('[data-classical=water]').click();
      const detail = await page.locator('#classical-detail').boundingBox();
      assert.ok(detail.y > rects[3].y + rects[3].height);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      if (width === 390) {
        await capture('#s1', 'comparison-water-mobile');
        await capture('.water-investigation', 'water-apparatus-mobile');
      }
      await page.locator('[data-classical=air]').click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      for (const image of await page.locator('.gas-picture').all()) {
        const rect = await image.boundingBox();
        assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 1);
      }
      await page.locator('[data-classical=fire]').click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      if (width === 390) await capture('#classical-detail', 'history-fire-mobile');
      await page.locator('#classical-close').click();
    }
    await page.setViewportSize({width:1440,height:1000});
  });

  await t.test('reference format has matching numbered routes and a separate unit assessment', async () => {
    assert.deepEqual(await page.locator('.lesson-head .num').allTextContents(), ['01','02','03','04','05']);
    for (let n = 1; n <= 5; n++) {
      const link = page.locator(`.route a[href="#s${n}"]`);
      assert.equal(await link.locator('span').innerText(), await text(`#title-${n}`));
      assert.equal(await link.locator('b').innerText(), String(n).padStart(2, '0'));
      await link.click();
      await page.waitForFunction(id => document.querySelector(`.route a[href="#${id}"]`).getAttribute('aria-current') === 'step', `s${n}`);
      const header = await page.locator(`#s${n} .lesson-head`).boundingBox();
      const body = await page.locator(`#s${n} .lesson-body`).boundingBox();
      assert.ok(body.y >= header.y + header.height - 1);
    }
    assert.equal(await text('.quiz-nav span'), '單元小測');
    assert.equal(await text('.quiz-kicker'), '單元小測');
    await page.locator('.quiz-nav').click();
    await page.waitForFunction(() => document.querySelector('.quiz-nav').getAttribute('aria-current') === 'step');
    assert.notEqual(await page.locator('.quiz-head').evaluate(n => getComputedStyle(n).backgroundColor), await page.locator('.lesson-head').first().evaluate(n => getComputedStyle(n).backgroundColor));
    await capture('#s6', 'quiz-format-desktop');
    await page.locator('.route a[href="#s1"]').click();
    if (captureDir) await page.screenshot({ path: path.join(captureDir, 'route-format-desktop.png') });
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
    await page.locator('[data-classical=fire]').focus();
    await page.keyboard.press('Enter');
    assert.match(await text('#classical-detail-title'), /火/);
    await page.locator('#classical-close').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.locator('#classical-detail').isVisible(), false);
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
    await mobile.locator('[data-classical=water]').tap();
    assert.equal(await mobile.locator('#classical-detail').isVisible(), true);
    assert.equal(await mobile.locator('[data-classical]').count(), 4);
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
