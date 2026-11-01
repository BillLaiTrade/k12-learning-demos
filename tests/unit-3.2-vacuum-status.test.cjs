const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');

test('3.2 bell-jar announcements follow the actual air direction', { timeout: 90000 }, async t => {
  let url = process.env.VACUUM_STATUS_URL;
  if (!url) {
    const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
      cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'ignore']
    });
    t.after(() => server.kill());
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('server timeout')), 5000);
      server.stdout.on('data', bytes => {
        const match = String(bytes).match(/port (\d+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
      server.once('error', reject);
    });
    url = `http://127.0.0.1:${port}/units/3/parts/3.2/#card-03`;
  }
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    ...(process.env.VACUUM_STATUS_URL ? { proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY } } : {})
  });
  t.after(() => browser.close());
  const out = process.env.VACUUM_STATUS_ARTIFACT_DIR || '/tmp/unit32-vacuum-status';
  await fs.mkdir(out, { recursive: true });
  const snapshots = [];
  async function open(options = {}, fault = false) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, ...options });
    t.after(() => page.close());
    page.setDefaultTimeout(10000);
    await page.clock.install();
    if (fault) await page.route('**/electric-bell-loop.wav*', route => route.abort('failed'));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.locator('#vacuum-lab[data-audio="off"]').waitFor({ state: 'attached' });
    return page;
  }
  const status = page => page.locator('#vacuum-status').textContent();
  const air = page => page.locator('#vacuum-lab').evaluate(node => Number(node.dataset.air));
  async function snapshot(page, name) {
    snapshots.push({ name, text: await status(page), air: await air(page) });
  }

  await t.test('stopping and reversing mid-range follows measured air, then inlet closes and stabilizes', async () => {
    const p = await open();
    await p.locator('#vacuum-power').click();
    await p.waitForFunction(() => document.querySelector('#vacuum-lab').dataset.audio === 'playing');
    await p.locator('#vacuum-extract').click();
    await p.clock.runFor(3500);
    const low = await air(p);
    assert.ok(low > .3 && low < .65);
    assert.match(await status(p), /抽氣中，罩內空氣逐漸減少.*鈴聲逐漸變弱/);
    await snapshot(p, 'pumping');
    await p.locator('#vacuum-extract').click();
    const stopped = await air(p);
    await p.clock.runFor(500);
    assert.equal(await air(p), stopped);
    assert.match(await status(p), /空氣量保持不變（較少）.*聽到的鈴聲較弱/);
    assert.doesNotMatch(await status(p), /逐漸/);
    await snapshot(p, 'pump-stopped');
    await p.locator('#vacuum-admit').click();
    await p.clock.runFor(300);
    assert.ok(await air(p) > stopped);
    assert.match(await status(p), /進氣中，罩內空氣逐漸增加.*鈴聲逐漸變清楚/);
    assert.doesNotMatch(await status(p), /減少|變弱/);
    await snapshot(p, 'admitting');
    await p.locator('#vacuum-admit').click();
    const closed = await air(p);
    await p.clock.runFor(300);
    assert.equal(await air(p), closed);
    assert.match(await status(p), /空氣量保持不變/);
    assert.doesNotMatch(await status(p), /逐漸/);
    await p.locator('#vacuum-extract').click();
    await p.clock.runFor(400);
    assert.ok(await air(p) < closed);
    assert.match(await status(p), /逐漸減少.*鈴聲逐漸變弱/);
    await p.locator('#vacuum-admit').click();
    await p.clock.runFor(5000);
    assert.equal(await air(p), 1);
    assert.match(await status(p), /空氣量保持不變（充足）.*聽到的鈴聲清楚/);
    assert.doesNotMatch(await status(p), /逐漸/);
    await snapshot(p, 'full');
    await p.close();
  });

  await t.test('the lower limit stops announcing a decrease even while the pump remains on', async () => {
    const p = await open();
    await p.locator('#vacuum-power').click();
    await p.waitForFunction(() => document.querySelector('#vacuum-lab').dataset.audio === 'playing');
    await p.locator('#vacuum-extract').click();
    await p.clock.runFor(7000);
    assert.equal(await air(p), .02);
    assert.equal(await p.locator('#vacuum-lab').getAttribute('data-mode'), 'pump');
    assert.match(await status(p), /接近真空，罩內空氣量保持不變（接近真空）.*幾乎聽不見/);
    assert.doesNotMatch(await status(p), /逐漸/);
    await snapshot(p, 'pump-at-lower-limit');
    await p.locator('#vacuum-extract').click();
    assert.doesNotMatch(await status(p), /逐漸/);
    await p.close();
  });

  await t.test('touch and keyboard with power off describe air without claiming any bell sound', async () => {
    const p = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
    await p.locator('#vacuum-pump').tap();
    await p.clock.runFor(3500);
    assert.match(await status(p), /空氣逐漸減少.*電鈴已關閉/);
    assert.doesNotMatch(await status(p), /聽到的|鈴聲逐漸/);
    await p.locator('#vacuum-extract').focus();
    await p.keyboard.press('Space');
    const saved = await air(p);
    await p.clock.runFor(400);
    assert.equal(await air(p), saved);
    assert.match(await status(p), /空氣量保持不變/);
    await p.locator('#vacuum-admit').focus();
    await p.keyboard.press('Enter');
    await p.clock.runFor(300);
    assert.ok(await air(p) > saved);
    assert.match(await status(p), /空氣逐漸增加.*電鈴已關閉/);
    assert.doesNotMatch(await status(p), /減少|聽到的|鈴聲逐漸/);
    assert.equal(await p.locator('#vacuum-status').getAttribute('aria-live'), 'polite');
    assert.equal(await p.locator('#vacuum-status').evaluate(node => node.clientWidth), 1);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await snapshot(p, 'touch-keyboard-off');
    await p.locator('#card-03').screenshot({ path: path.join(out, 'off-390.png') });
    await p.close();
  });

  await t.test('audio errors remain the priority while the air direction changes', async () => {
    const p = await open({}, true);
    await p.locator('#vacuum-power').click();
    await p.waitForFunction(() => document.querySelector('#vacuum-lab').dataset.audio === 'error');
    const error = '電鈴聲暫時無法播放，請再開啟一次電鈴。';
    await p.locator('#vacuum-extract').click();
    await p.clock.runFor(3500);
    assert.equal(await status(p), error);
    await p.locator('#vacuum-admit').click();
    await p.clock.runFor(500);
    assert.equal(await status(p), error);
    assert.ok(await p.locator('#vacuum-status').evaluate(node => node.classList.contains('vacuum-status-error')));
    await snapshot(p, 'audio-error-priority');
    await p.close();
  });
  await fs.writeFile(path.join(out, 'announcements.json'), JSON.stringify(snapshots, null, 2));
});
