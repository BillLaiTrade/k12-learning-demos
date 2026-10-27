const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

// Requires Python 3 and Playwright. No npm installation or application server build.
test('5.1 temperature lesson in a real browser', { timeout: 45000 }, async t => {
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
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`HTTP server exited ${code}`)); });
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('requestfailed', request => failures.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  const base = `http://127.0.0.1:${port}`;
  await page.goto(`${base}/units/5/parts/5.1/index.html`);
  const text = selector => page.locator(selector).textContent();
  const order = () => page.locator('#measure-sequence li').evaluateAll(items => items.map(item => item.dataset.step));
  const inputTemperature = value => page.locator('#thermo-control').evaluate((input, value) => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, String(value));

  await t.test('loads the complete lesson, images, and navigation', async () => {
    assert.equal(await page.locator('.lesson-card').count(), 5);
    assert.equal(await page.locator('.quiz').count(), 1);
    assert.equal(await page.locator('#card-04 input[type=number]').count(), 0);
    assert.equal(await page.locator('.hero-art img').evaluate(image => image.complete && image.naturalWidth > 0), true);
    assert.equal(await page.locator('.lesson-layout').evaluate(node => getComputedStyle(node).display), 'grid');
    for (const href of await page.locator('.route a').evaluateAll(items => items.map(item => item.getAttribute('href')))) {
      assert.equal(await page.locator(href).count(), 1);
    }
    assert.equal(await page.locator('.speaker').first().evaluate(node => getComputedStyle(node, '::before').backgroundImage.includes('dialogue-character-avatars')), true);
  });

  await t.test('measures only after immersion and stabilization, compares view without changing liquid', async () => {
    assert.equal(await page.locator('#measurement-save').isDisabled(), true);
    await page.locator('#measurement-insert').click();
    assert.equal(await page.locator('#measurement-save').isDisabled(), true);
    await page.waitForFunction(() => document.getElementById('measurement-note').textContent.startsWith('液柱已穩定'));
    const liquid = await page.locator('#measurement-liquid').getAttribute('y');
    for (const eye of ['-1','1','0']) {
      await page.locator(`[data-eye="${eye}"]`).click();
      assert.equal(await page.locator('#measurement-liquid').getAttribute('y'), liquid);
      assert.equal(await page.locator('#measurement-save').isDisabled(), eye !== '0');
      const hit = Number(await page.locator('#sight-hit').getAttribute('cy'));
      if (eye === '-1') assert.ok(hit < Number(liquid));
      if (eye === '1') assert.ok(hit > Number(liquid));
      if (eye === '0') assert.equal(hit, Number(liquid));
    }
    await page.locator('#measurement-save').click();
    assert.match(await text('#measurement-record'), /37.5°C/);
    assert.equal(await page.locator('#measurement-lens line').count(), 10);
    await page.locator('#measurement-reset').click();
    assert.equal(await page.locator('#measurement-record').isVisible(), false);
    assert.equal(await page.locator('#measurement-save').isDisabled(), true);
    await page.locator('#measurement-insert').click();
    await page.locator('#measurement-reset').click();
    await page.waitForTimeout(1900);
    assert.match(await text('#measurement-note'), /杯外/);
    const svg=await page.locator('#measurement-diagram').boundingBox();
    const toPoint=(x,y)=>({x:svg.x+x*svg.width/640,y:svg.y+y*svg.height/480});
    const start=toPoint(445,260),end=toPoint(235,100);
    await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:12});await page.mouse.up();
    await page.waitForFunction(() => document.getElementById('measurement-note').textContent.startsWith('液柱已穩定'));
    assert.equal(await page.locator('#measurement-save').isDisabled(), false);
    await page.locator('#measurement-instrument').click();
    assert.equal(await page.locator('#measurement-save').isDisabled(), false);
    await page.locator('#measurement-reset').click();
  });

  await t.test('observation guides track whole and half degrees, including boundaries', async () => {
    await page.locator('#thermo-guide').click();
    for (const value of [0, 37.5, 100]) {
      await inputTemperature(value);
      assert.match(await text('#thermo-detail'), new RegExp(`${value}°C`));
      const guideY = await page.locator('#observation-thermometer path').getAttribute('d');
      assert.equal(guideY, `M25 ${355 - value * 3.2}H205`);
      const liquidY = await page.locator('#observation-thermometer rect').nth(1).getAttribute('y');
      assert.equal(Number(liquidY), 355 - value * 3.2);
    }
    await page.locator('#thermo-guide').click();
    assert.equal(await page.locator('#thermo-detail').isVisible(), false);
    assert.equal(await page.locator('#observation-thermometer path').count(), 0);
  });

  await t.test('incomplete and incorrect measurement records receive specific feedback', async () => {
    await page.locator('#quiz-check').click();
    assert.match(await text('#quiz-result'), /尚未完整/);
    assert.match(await text('#principle-feedback'), /請選擇/);
    assert.match(await text('#reading-feedback'), /請輸入/);
    await page.locator('input[name=principle][value=water]').check();
    await page.locator('#quiz-reading').fill('10');
    await page.locator('#quiz-check').click();
    assert.match(await text('#quiz-result'), /0 \/ 3/);
    assert.match(await text('#principle-feedback'), /杯水沒有流進/);
    assert.match(await text('#reading-feedback'), /42.5°C/);
    assert.equal(await page.locator('#quiz-thermometer path').count(), 1);
    await page.locator('#quiz-reading').fill('101');
    assert.equal(await page.locator('#quiz-result').isVisible(), false);
    assert.equal(await page.locator('#quiz-thermometer path').count(), 0);
    await page.locator('#quiz-check').click();
    assert.match(await text('#reading-feedback'), /0 到 100/);
  });

  await t.test('requires a correct procedure and principle as well as a real scale reading', async () => {
    for (const [index, step] of ['immerse', 'wait', 'level', 'read'].entries()) {
      while ((await order()).indexOf(step) > index) {
        await page.locator(`[data-step="${step}"] [data-move=up]`).click();
      }
    }
    assert.deepEqual(await order(), ['immerse', 'wait', 'level', 'read']);
    await page.locator('input[name=principle][value=volume]').check();
    await page.locator('#quiz-reading').fill('42.5');
    await page.locator('#quiz-check').click();
    assert.match(await text('#quiz-result'), /三項紀錄都完成/);
    assert.match(await text('#sequence-feedback'), /程序正確/);
    for (const [value, accepted] of [['42.2', true], ['42.8', true], ['42.1', false], ['42.9', false]]) {
      await page.locator('#quiz-reading').fill(value);
      await page.locator('#quiz-check').click();
      assert.equal((await text('#reading-feedback')).startsWith('估讀合理'), accepted);
    }
  });

  await t.test('reset restores every quiz task without changing teaching controls', async () => {
    await inputTemperature(20);
    await page.locator('#quiz-reset').click();
    assert.deepEqual(await order(), ['read', 'immerse', 'level', 'wait']);
    assert.equal(await page.locator('input[name=principle]:checked').count(), 0);
    assert.equal(await page.locator('#quiz-reading').inputValue(), '');
    assert.equal(await page.locator('#quiz-result').isVisible(), false);
    assert.equal(await page.locator('#quiz-thermometer path').count(), 0);
    assert.equal(await text('#sequence-feedback'), '');
    assert.equal(await text('#principle-feedback'), '');
    assert.equal(await text('#reading-feedback'), '');
    assert.equal(await page.locator('#thermo-control').inputValue(), '20');
  });

  await t.test('supports keyboard sorting, controls and reduced motion', async () => {
    await page.locator('[data-step=immerse] [data-move=up]').focus();
    await page.keyboard.press('Enter');
    assert.equal((await order())[0], 'immerse');
    assert.equal(await page.locator('[data-step=immerse] [data-move=down]').evaluate(node => node === document.activeElement), true);
    await page.keyboard.press('Space');
    assert.equal((await order())[1], 'immerse');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('#measurement-instrument').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.getElementById('measurement-note').textContent.startsWith('液柱已穩定'));
    assert.equal(Number(await page.locator('#measurement-liquid').getAttribute('y')), 223.75);
    await page.locator('#measurement-instrument').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.locator('#measurement-save').isDisabled(), true);
  });

  await t.test('fits desktop and narrow windows and links back to the unit', async () => {
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, `horizontal overflow at ${width}px`);
    }
    await page.locator('.end-link').click();
    assert.equal(new URL(page.url()).pathname, '/units/5/index.html');
    await page.getByRole('link', { name: '課綱與出版社對照' }).click();
    await page.getByRole('link', { name: '開啟 5.1：溫度計如何量出冷熱？' }).click();
    assert.equal(new URL(page.url()).pathname, '/units/5/parts/5.1/index.html');
    assert.deepEqual(failures, []);
  });
});
