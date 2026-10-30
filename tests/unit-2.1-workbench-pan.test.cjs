const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');

test('2.1 workbench navigation reveals overflow without changing classification', { timeout: 90000 }, async t => {
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
  const controls = page.locator('#workbench-pan-controls');
  const viewport = page.locator('#workbench-viewport');
  const left = page.getByRole('button', { name: '向左查看', exact: true });
  const right = page.getByRole('button', { name: '向右查看', exact: true });
  const waitAt = edge => page.waitForFunction(edge => {
    const el = document.getElementById('workbench-viewport');
    const button = document.getElementById(`workbench-pan-${edge}`);
    return button.disabled && (edge === 'left' ? el.scrollLeft <= 1 : el.scrollWidth - el.clientWidth - el.scrollLeft <= 1);
  }, edge);
  const capture = async name => {
    if (!process.env.REVIEW_DIR) return;
    await fs.mkdir(process.env.REVIEW_DIR, { recursive: true });
    await page.locator('#unit-quiz').screenshot({ path: path.join(process.env.REVIEW_DIR, name + '.png') });
  };

  await t.test('full desktop view hides the controls', async () => {
    await page.waitForFunction(() => document.getElementById('workbench-pan-controls').hidden);
    assert.equal(await controls.isVisible(), false);
    assert.ok(await viewport.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    await capture('desktop-1440');
  });

  await t.test('laptop view supports mouse and keyboard navigation and native-scroll boundaries', async () => {
    await page.setViewportSize({ width: 1024, height: 1000 });
    await controls.waitFor({ state: 'visible' });
    await waitAt('left');
    assert.equal(await right.isEnabled(), true);
    assert.equal(await right.getAttribute('aria-controls'), 'workbench-viewport');
    await right.click();
    await waitAt('right');
    assert.equal(await left.isEnabled(), true);
    assert.ok(await page.locator('[data-sample="silver"]').evaluate(el => {
      const r = el.getBoundingClientRect(), v = document.getElementById('workbench-viewport').getBoundingClientRect();
      return r.left >= v.left && r.right <= v.right;
    }), 'the rightmost specimen is fully visible');
    assert.equal(await page.locator('#sort-progress').textContent(), '已分類 0 / 9 份樣本');
    await capture('laptop-1024-right');
    await left.focus();
    await left.press('Enter');
    await waitAt('left');
    await viewport.evaluate(el => { el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2; });
    await page.waitForFunction(() => !document.getElementById('workbench-pan-left').disabled && !document.getElementById('workbench-pan-right').disabled);
    assert.equal(await left.isEnabled(), true);
    assert.equal(await right.isEnabled(), true);
  });

  await t.test('panning preserves selection and supports click and drag classification', async () => {
    await right.click();
    await waitAt('right');
    await page.locator('[data-sample="air"]').click();
    await page.locator('#book-reader-close').click();
    await left.click();
    await waitAt('left');
    assert.equal(await page.locator('[data-sample="air"]').getAttribute('aria-pressed'), 'true');
    await right.click();
    await waitAt('right');
    await page.locator('[data-target="mixture"]').click();
    assert.match(await page.locator('#workbench-feedback').textContent(), /這是空氣.*多種氣體.*混合物/);
    await viewport.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    const from = await page.locator('[data-sample="silver"]').boundingBox();
    const to = await page.locator('[data-target="element"]').boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
    await page.mouse.up();
    assert.match(await page.locator('#workbench-feedback').textContent(), /這是銀錠.*屬於元素/);
    assert.equal(await page.locator('#sort-progress').textContent(), '已分類 2 / 9 份樣本');
    await page.locator('#reset-samples').click();
  });

  await t.test('controls update after resizing the container and hide when the scene fits again', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await controls.waitFor({ state: 'hidden' });
    await viewport.evaluate(el => { el.style.width = '520px'; });
    await controls.waitFor({ state: 'visible' });
    await right.click();
    await waitAt('right');
    await viewport.evaluate(el => { el.style.width = ''; });
    await controls.waitFor({ state: 'hidden' });
    assert.equal(await viewport.evaluate(el => el.scrollLeft), 0);
  });

  await t.test('narrow view allows multiple steps without overscrolling', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 1000 });
    await controls.waitFor({ state: 'visible' });
    await waitAt('left');
    await right.click();
    await page.waitForFunction(() => document.getElementById('workbench-viewport').scrollLeft > 0);
    assert.equal(await right.isEnabled(), true, 'one step does not skip the whole narrow viewport');
    for (let step = 0; step < 6 && await right.isEnabled(); step++) await right.click();
    await waitAt('right');
    for (let step = 0; step < 6 && await left.isEnabled(); step++) await left.click();
    await waitAt('left');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  });
  assert.deepEqual(errors, []);
});
