const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');

test('2.1 quiz feedback explains correct placement and guides retries', { timeout: 180000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'ignore']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(Error('server timeout')), 5000);
    server.stdout.on('data', bytes => {
      output += bytes;
      const match = output.match(/port (\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    server.once('error', reject);
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/units/2/parts/2.1/`);
  await page.addStyleTag({ content: 'html { scroll-behavior:auto!important; }' });
  const sample = key => page.locator(`[data-sample="${key}"]`);
  const feedback = page.locator('#workbench-feedback');
  const progress = page.locator('#sort-progress');
  const select = async key => {
    await sample(key).click();
    assert.equal(await page.locator('#book-reader').evaluate(el => el.open), true);
    await page.locator('#book-reader-close').click();
  };
  const place = category => page.locator(`[data-target="${category}"]`).click();
  const reset = () => page.locator('#reset-samples').click();
  const sugarHint = '比較各組粒子的組成，看看它們是否相同。再想想，樣本裡是一種物質，還是不同物質混在一起？';
  const cases = [
    { key: 'copper', category: 'element', name: '銅片', clue: /小粒子.*同一種類/ },
    { key: 'aluminum', category: 'element', name: '鋁塊', clue: /粒子組成.*幾種類型/ },
    { key: 'silver', category: 'element', name: '銀錠', clue: /小粒子.*同一種類/ },
    { key: 'sugar', category: 'compound', name: '糖晶', clue: /各組粒子的組成.*一種物質/ },
    { key: 'salt', category: 'compound', name: '食鹽', clue: /晶體.*排列.*比例是否固定/ },
    { key: 'chalk', category: 'compound', name: '純碳酸鈣粉末', clue: /每組小粒子.*種類與數量/ },
    { key: 'air', category: 'mixture', name: '空氣', clue: /不同氣體粒子.*不同種類的物質/ },
    { key: 'granite', category: 'mixture', name: '花崗岩', clue: /不同礦物.*不同成分/ },
    { key: 'alloy', category: 'mixture', name: '合金', clue: /兩種金屬小粒子.*混合排列/ }
  ];
  const reasons = {
    element: /只含.+這一種元素，屬於元素。/,
    compound: /由(?:不同|兩種)元素按固定比例結合而成，屬於化合物。/,
    mixture: /(?:含有多種氣體|由多種礦物混合而成|由不同金屬混合而成)，屬於混合物。/
  };

  await t.test('all nine specimens retain useful hints after either wrong placement and reselection', async () => {
    for (const item of cases) {
      for (const wrong of ['element', 'compound', 'mixture'].filter(category => category !== item.category)) {
        await reset();
        await select(item.key);
        await place(wrong);
        assert.equal(await feedback.getAttribute('data-kind'), 'wrong');
        const hint = await feedback.textContent();
        assert.match(hint, item.clue);
        assert.doesNotMatch(hint, /undefined|元素|化合物|混合物/);
        assert.ok(!hint.includes(item.name), 'wrong feedback does not reveal the specimen name');
        if (item.key === 'sugar') assert.equal(hint, '位置不符。' + sugarHint);
        assert.match(await sample(item.key).locator('.sample-tag').textContent(), /^樣本 \d$/);
        assert.equal(await progress.textContent(), '已分類 0 / 9 份樣本');
        await select(item.key);
        assert.equal(await feedback.textContent(), hint, 'reopening the manual preserves the retry hint');
        assert.equal(await feedback.getAttribute('data-kind'), 'wrong');
        await place(item.category);
        assert.equal(await feedback.getAttribute('data-kind'), 'correct');
        const correct = await feedback.textContent();
        assert.ok(!correct.includes(hint));
        assert.ok(correct.startsWith('分類正確。這是' + item.name + '，'));
        assert.match(correct, reasons[item.category]);
        assert.doesNotMatch(correct, /undefined/);
        if (item.key === 'sugar') assert.equal(correct, '分類正確。這是糖晶，由不同元素按固定比例結合而成，屬於化合物。');
        if (item.key === 'air') assert.equal(correct, '分類正確。這是空氣，含有多種氣體，屬於混合物。');
        await select(item.key);
        assert.equal(await feedback.textContent(), correct, 'reopening the manual preserves the explanation');
        assert.equal(await feedback.getAttribute('data-kind'), 'correct');
        assert.equal(await sample(item.key).locator('.sample-tag').textContent(), item.name);
        assert.equal(await progress.textContent(), '已分類 1 / 9 份樣本');
      }
    }
  });

  await t.test('dragging to a wrong cabinet shows the same hint and can be corrected', async () => {
    await reset();
    await page.locator('.workbench-viewport').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    const from = await sample('sugar').boundingBox();
    const to = await page.locator('[data-target="mixture"]').boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
    await page.mouse.up();
    assert.equal(await feedback.textContent(), '位置不符。' + sugarHint);
    assert.equal(await feedback.getAttribute('data-kind'), 'wrong');
    await place('compound');
    assert.equal(await feedback.getAttribute('data-kind'), 'correct');
    assert.equal(await progress.textContent(), '已分類 1 / 9 份樣本');
  });

  await t.test('correct completion, returning a specimen and reset clear retry feedback', async () => {
    await reset();
    for (const item of cases) { await select(item.key); await place(item.category); }
    assert.equal(await progress.textContent(), '已分類 9 / 9 份樣本');
    assert.match(await feedback.textContent(), /九份樣本都已完成分類/);
    assert.match(await feedback.textContent(), /^分類正確。這是合金，由不同金屬混合而成，屬於混合物。/);
    for (const width of [1440, 1024]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(await feedback.evaluate(el => el.scrollWidth <= el.clientWidth && document.documentElement.scrollWidth <= innerWidth));
    }
    await select('sugar');
    await page.locator('#return-sample').click();
    assert.equal(await progress.textContent(), '已分類 8 / 9 份樣本');
    assert.equal(await feedback.getAttribute('data-kind'), '');
    assert.match(await feedback.textContent(), /已放回桌面/);
    await reset();
    await select('sugar');
    assert.equal(await feedback.getAttribute('data-kind'), '');
    assert.ok(!(await feedback.textContent()).includes(sugarHint));
    assert.equal(await progress.textContent(), '已分類 0 / 9 份樣本');
  });

  for (const width of [1440, 1024]) {
    await t.test(`retry and correct feedback fit the ${width}px layout`, async () => {
      await page.setViewportSize({ width, height: 1000 });
      await reset();
      await select('salt');
      await place('mixture');
      assert.equal(await feedback.getAttribute('data-kind'), 'wrong');
      assert.ok(await feedback.evaluate(el => el.scrollWidth <= el.clientWidth && document.documentElement.scrollWidth <= innerWidth));
      if (process.env.REVIEW_DIR) {
        await fs.mkdir(process.env.REVIEW_DIR, { recursive: true });
        await page.locator('#unit-quiz').screenshot({ path: path.join(process.env.REVIEW_DIR, `${width}.png`) });
      }
      await place('compound');
      assert.equal(await feedback.getAttribute('data-kind'), 'correct');
      assert.match(await feedback.textContent(), /固定比例.*化合物/);
      assert.ok(await feedback.evaluate(el => el.scrollWidth <= el.clientWidth && document.documentElement.scrollWidth <= innerWidth));
      if (process.env.REVIEW_DIR) {
        await page.locator('#unit-quiz').screenshot({ path: path.join(process.env.REVIEW_DIR, `correct-${width}.png`) });
      }
    });
  }
  assert.deepEqual(errors, []);
});
