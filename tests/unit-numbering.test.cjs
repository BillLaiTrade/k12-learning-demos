const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

test('new unit numbers agree across home, overviews, and existing lesson URLs', { timeout: 120000 }, async t => {
  // Match the GitHub Pages project prefix, including root-relative asset URLs.
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '../..'), stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Server startup timed out')), 5000);
    server.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/port (\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited before startup: ${code}`)); });
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const base = process.env.NUMBERING_BASE_URL || `http://127.0.0.1:${port}/k12-learning-demos/`;
  const failures = [];
  page.on('response', response => {
    if (response.url().startsWith(base) && response.status() >= 400) failures.push(response.url());
  });
  const units = [
    ['1', '密度與測量', 'units/1/'],
    ['2', '物質、分離與水溶液', 'units/2/'],
    ['3', '波動與聲音', 'units/3/'],
    ['4', '光的反射、折射與成像', 'units/4/'],
    ['5', '溫度與熱', 'units/5/'],
    ['6', '探索物質的組成', 'units/6/']
  ];
  await t.test('homepage order, button numbers, and destination identities', async () => {
    await page.goto(base, { waitUntil: 'networkidle' });
    const cards = page.locator('.unit-card');
    assert.equal(await cards.count(), units.length);
    for (const [i, [number, title, href]] of units.entries()) {
      const card = cards.nth(i);
      assert.equal(await card.locator('.unit-number').innerText(), `單元 ${number}`);
      assert.equal(await card.locator('h2').innerText(), title);
      assert.equal(await card.locator('a').innerText(), `進入單元 ${number}`);
      assert.equal(await card.locator('a').getAttribute('href'), href);
    }
  });
  for (const [number, title, href] of units) {
    await t.test(`unit ${number}: overview uses the new number`, async () => {
      await page.goto(new URL(href, base).href, { waitUntil: 'networkidle' });
      assert.match(await page.locator('header').innerText(), new RegExp(`(?:學習單元|單元) ${number}(?!\\d)`));
      assert.match(await page.locator('h1').innerText(), new RegExp(title));
      for (const destination of await page.locator('a[href*="parts/"]').evaluateAll(nodes => nodes.map(node => node.href))) {
        assert.equal((await page.request.get(destination)).status(), 200, destination);
      }
    });
  }
  for (const [number, href] of [
    ['1.1', 'units/1/parts/1.1/'], ['1.2', 'units/1/parts/1.2/'],
    ['2.1', 'units/2/parts/2.1/'], ['2.2', 'units/2/parts/2.2/'],
    ['3.1', 'units/3/parts/3.1/'], ['3.2', 'units/3/parts/3.2/'],
    ['3.4', 'units/3/parts/3.4/'],
    ['4.1', 'units/4/parts/4.1/'], ['4.2', 'units/4/parts/4.2/']
  ]) {
    await t.test(`lesson ${number}: header and existing assets load`, async () => {
      await page.goto(new URL(href, base).href, { waitUntil: 'networkidle' });
      assert.match(await page.locator('header').first().innerText(), new RegExp(`(?:學習內容|學習單元|學習路徑) ${number.replace('.', '\\.')}\\b`));
      assert.ok((await page.locator('h1').innerText()).trim());
    });
  }
  assert.deepEqual(failures, [], 'lesson assets must remain available at existing URLs');
});
