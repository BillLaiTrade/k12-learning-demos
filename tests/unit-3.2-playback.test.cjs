const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

test('3.2 switches activities without overlapping playback', { timeout: 90000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('server startup timed out')), 5000);
    server.stdout.on('data', bytes => {
      output += bytes;
      const match = output.match(/port (\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    server.once('error', reject);
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' });
  t.after(() => browser.close());
  const errors = [];
  const fresh = async (hash, viewport = { width: 1440, height: 1100 }) => {
    const page = await browser.newPage({ viewport });
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      const create = AudioContext.prototype.createBufferSource;
      AudioContext.prototype.createBufferSource = function (...args) {
        const source = create.apply(this, args), start = source.start.bind(source), stop = source.stop.bind(source);
        let playback;
        source.start = function (...args) {
          if (source.buffer?.duration === 6) {
            playback = { stopped: false }; window.lastBellPlayback = playback;
          }
          return start(...args);
        };
        source.stop = function (...args) { if (playback) playback.stopped = true; return stop(...args); };
        return source;
      };
    });
    await page.goto(`http://127.0.0.1:${port}/units/3/parts/3.2/#${hash}`, { waitUntil: 'networkidle' });
    return page;
  };
  const waitBell = page => page.waitForFunction(() => document.querySelector('#air-wave').dataset.state === 'playing');
  const waitElectricBell = page => page.waitForFunction(() => document.querySelector('#vacuum-lab').dataset.audio === 'playing');

  for (const width of [1024, 1280, 1440]) {
    await t.test(`navigation stops a ringing bell even with the old card partly visible at ${width}px`, async () => {
      const page = await fresh('card-02', { width, height: 1000 });
      try {
        await page.locator('#air-strike').click();
        await page.waitForFunction(() => Number(document.querySelector('#air-wave').dataset.elapsed) > 2.1);
        await page.locator('.route a[href="#card-03"]').click();
        assert.ok(await page.locator('#card-02').evaluate(n => n.getBoundingClientRect().bottom > 0));
        assert.equal(await page.evaluate(() => window.lastBellPlayback.stopped), true);
        assert.equal(await page.locator('#air-wave').getAttribute('data-state'), 'ready');
        await page.locator('#vacuum-power').click(); await waitElectricBell(page);
        assert.equal(await page.locator('#vacuum-audio').evaluate(n => n.paused), false);
        await page.locator('.route a[href="#card-02"]').click();
        assert.equal(await page.locator('#vacuum-audio').evaluate(n => n.paused), true);
        await page.waitForTimeout(150);
        assert.equal(await page.locator('#air-wave').getAttribute('data-state'), 'ready');
      } finally { await page.close(); }
    });
  }

  await t.test('keyboard interaction in another visible card cancels pending sound before starting the new source', async () => {
    const page = await fresh('card-02', { width: 1440, height: 1800 });
    try {
      await page.locator('#air-strike').click(); await waitBell(page);
      await page.locator('#vacuum-power').focus();
      assert.ok(await page.locator('#card-02').evaluate(n => n.getBoundingClientRect().bottom > 0));
      await page.keyboard.press('Space'); await waitElectricBell(page);
      assert.equal(await page.evaluate(() => window.lastBellPlayback.stopped), true);
      await page.locator('#sound-bell').focus(); await page.keyboard.press('Enter'); await waitBell(page);
      assert.equal(await page.locator('#vacuum-audio').evaluate(n => n.paused), true);
      assert.equal(await page.evaluate(() => window.lastBellPlayback.stopped), false);
    } finally { await page.close(); }
  });

  await t.test('sources in one activity remain independent while navigation to another activity pauses the old clock', async () => {
    const page = await fresh('card-04');
    try {
      await page.locator('#card-04 [data-group="air"] .source-hit').click(); await page.waitForTimeout(200);
      const before = Number(await page.locator('#card-04 [data-group="air"]').getAttribute('data-time'));
      await page.locator('#card-04 [data-group="water"] .source-hit').click(); await page.waitForTimeout(200);
      assert.ok(Number(await page.locator('#card-04 [data-group="air"]').getAttribute('data-time')) > before + .1);
      await page.locator('.route a[href="#card-05"]').click();
      assert.equal(await page.locator('#experiment-panel').getAttribute('data-phase'), 'paused');
      const paused = await page.locator('#experiment-panel').getAttribute('data-time');
      await page.locator('#temp-primary-action').click(); await page.waitForTimeout(250);
      assert.equal(await page.locator('#experiment-panel').getAttribute('data-time'), paused);
      assert.equal(await page.locator('#temp-experiment-panel').getAttribute('data-phase'), 'running');
      await page.locator('.route a[href="#card-04"]').click();
      assert.equal(await page.locator('#temp-experiment-panel').getAttribute('data-phase'), 'paused');
      assert.equal(await page.locator('#experiment-panel').getAttribute('data-phase'), 'paused');
    } finally { await page.close(); }
  });

  await t.test('hash navigation and return never resume old playback automatically', async () => {
    const page = await fresh('card-04');
    try {
      await page.locator('#primary-action').click(); await page.waitForTimeout(200);
      await page.evaluate(() => { location.hash = 'card-05'; });
      await page.waitForFunction(() => document.querySelector('#experiment-panel').dataset.phase === 'paused');
      const paused = await page.locator('#experiment-panel').getAttribute('data-time');
      await page.goBack(); await page.waitForTimeout(200);
      assert.equal(await page.locator('#experiment-panel').getAttribute('data-time'), paused);
      assert.equal(await page.locator('#experiment-panel').getAttribute('data-phase'), 'paused');
    } finally { await page.close(); }
  });

  await t.test('leaving the fireworks through navigation cancels the scheduled sound and allows replay', async () => {
    const page = await fresh('unit-quiz');
    try {
      await page.locator('#fireworks-observe').click();
      await page.waitForFunction(() => document.querySelector('#unit-quiz').dataset.state === 'observing');
      await page.locator('.route a[href="#card-05"]').click();
      assert.equal(await page.locator('#unit-quiz').getAttribute('data-state'), 'ready');
      assert.equal(await page.locator('#unit-quiz').getAttribute('data-audio'), 'idle');
      await page.locator('.route a[href="#unit-quiz"]').click(); await page.waitForTimeout(150);
      assert.equal(await page.locator('#unit-quiz').getAttribute('data-state'), 'ready');
      await page.locator('#fireworks-observe').click();
      await page.waitForFunction(() => document.querySelector('#unit-quiz').dataset.state === 'observing');
    } finally { await page.close(); }
  });
  assert.deepEqual(errors, []);
});
