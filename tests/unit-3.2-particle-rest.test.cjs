const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

test('3.2 particles stay still until the tuning fork is struck', { timeout: 60000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'ignore']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('server timeout')), 5000);
    server.stdout.on('data', bytes => { const m = String(bytes).match(/port (\d+)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
    server.once('error', reject);
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' });
  t.after(() => browser.close());
  for (const reducedMotion of ['no-preference', 'reduce']) {
    await t.test(`idle, strike, pause and reset with ${reducedMotion}`, async () => {
      const context = await browser.newContext({ reducedMotion, viewport: { width: 1440, height: 1100 } });
      try {
        const page = await context.newPage(); await page.bringToFront();
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.goto(`http://127.0.0.1:${port}/units/3/parts/3.2/#card-04`, { waitUntil: 'domcontentloaded' });
        const lab = page.locator('#card-04 [data-sound-speed-lab]');
        await lab.locator('#models').scrollIntoViewIfNeeded();
        const snapshot = () => lab.locator('.particle').evaluateAll(nodes => nodes.map(n => n.getAttribute('transform')));
        const atRest = () => lab.locator('.particle').evaluateAll(nodes => nodes.every(n => {
          const m = n.transform.baseVal.consolidate().matrix;
          return Math.abs(m.e-Number(n.dataset.originX)) < .0001 && Math.abs(m.f-Number(n.dataset.originY)) < .0001;
        }));
        assert.equal(await lab.locator('.particle-micro-motion').count(), 0);
        assert.equal(await lab.locator('.particle').evaluateAll(nodes => nodes.every(n => n.getAnimations({subtree:true}).length === 0)), true);
        assert.equal(await atRest(), true);
        const idle = await snapshot(); await page.waitForTimeout(600); assert.deepEqual(await snapshot(), idle);
        assert.equal(await lab.locator('#experiment-panel').getAttribute('data-time'), '0.00000000');
        await lab.locator('#primary-action').click(); await page.waitForTimeout(1100);
        for (const kind of ['air','water','steel']) {
          assert.ok(await lab.locator(`[data-group=${kind}] .particle`).evaluateAll(nodes => nodes.some(n => Math.abs(n.transform.baseVal.consolidate().matrix.e-Number(n.dataset.originX)) > .1)), `${kind} still responds to the sound wave`);
        }
        const time = Number(await lab.locator('#experiment-panel').getAttribute('data-time'));
        assert.ok(time > 1 && time < 1.9, String(time));
        await lab.locator('#primary-action').click(); const paused = await snapshot();
        await page.waitForTimeout(300); assert.deepEqual(await snapshot(), paused);
        await lab.locator('#reset-action').click(); assert.equal(await atRest(), true);
        const reset = await snapshot(); await page.waitForTimeout(500); assert.deepEqual(await snapshot(), reset);
        for (const width of [1024,1280,1440,1920]) {
          await page.setViewportSize({width,height:1100});
          assert.equal(await atRest(), true);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        }
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    });
  }
});
