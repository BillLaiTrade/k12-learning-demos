const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

test('formula highlights can be dismissed without blocking formula choices', { timeout: 60000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timed out')), 5000);
    server.stdout.on('data', chunk => {
      const match = String(chunk).match(/port (\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
  });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    ...(process.env.FORMULA_URL ? { proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY } } : {})
  });
  t.after(() => browser.close());
  const url = process.env.FORMULA_URL || `http://127.0.0.1:${port}/units/3/parts/3.1/`;

  for (const touch of [false, true]) await t.test(touch ? 'mobile touch' : 'desktop mouse and keyboard', async () => {
    const page = await browser.newPage({ viewport: { width: touch ? 390 : 1440, height: 1000 }, hasTouch: touch });
    try {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      const panel = page.locator('#speed-formula-panel');
      const choices = panel.locator('[data-formula-focus]');
      const activate = locator => touch ? locator.tap() : locator.click();
      const assertState = async key => {
        for (const choice of await choices.all()) {
          assert.equal(await choice.getAttribute('aria-pressed'), String(key !== null && await choice.getAttribute('data-formula-focus') === key));
        }
        const actual = await panel.locator('.is-formula-related').evaluateAll(nodes => nodes.map(node => node.id).sort());
        const expected = key === null ? [] : [`speed-explanation-${key}`, `speed-map-${key}`, 'speed-map-wavelength'].sort();
        assert.deepEqual(actual, expected);
      };
      const blank = async () => {
        await panel.scrollIntoViewIfNeeded();
        // The panel's left padding is outside every formula button.
        if (touch) await panel.tap({ position: { x: 6, y: 6 } });
        else await panel.click({ position: { x: 6, y: 6 } });
      };
      await assertState(null);
      for (const key of ['frequency', 'period']) {
        await activate(panel.locator(`.speed-formula-choice[data-formula-focus="${key}"]`));
        await assertState(key);
        await blank();
        await assertState(null);
      }
      // Nested fraction text must select the button rather than immediately dismiss it.
      await activate(page.locator('#speed-chinese-period .frequency-meaning-fraction > span').first());
      await assertState('period');
      await activate(page.locator('#speed-chinese-frequency'));
      await assertState('frequency');
      await activate(page.locator('#speed-chinese-frequency'));
      await assertState(null);
      await activate(page.locator('#speed-chinese-period'));
      await activate(page.locator('#card-07 h2'));
      await assertState(null);
      if (!touch) {
        const button = panel.locator('.speed-formula-choice[data-formula-focus="frequency"]');
        await button.focus();
        await page.keyboard.press('Enter');
        await assertState('frequency');
        await page.keyboard.press('Space');
        await assertState(null);
      }
      // Dismissing on another control must not cancel that control's normal action.
      await activate(page.locator('#speed-chinese-frequency'));
      await activate(page.locator('#speed-frequency-up'));
      await assertState(null);
      assert.match(await page.locator('#speed-equation-live').innerText(), /2\.5 Hz × 6 m = 15 m\/s/);
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
});
