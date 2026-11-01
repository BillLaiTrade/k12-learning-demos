const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');
const notice = '音效已中斷，請關閉再開啟電鈴。';

test('3.2 bell-jar audio interruptions clear stale readings and recover through the power switch', { timeout: 120000 }, async t => {
  let url = process.env.VACUUM_INTERRUPTION_URL;
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
    ...(process.env.VACUUM_INTERRUPTION_URL ? { proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY } } : {})
  });
  t.after(() => browser.close());
  const out = process.env.VACUUM_INTERRUPTION_ARTIFACT_DIR || '/tmp/unit32-vacuum-interruption';
  await fs.mkdir(out, { recursive: true });
  const records = [];
  async function open(options = {}) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, ...options });
    t.after(() => page.close());
    page.setDefaultTimeout(10000);
    await page.addInitScript(() => {
      const createGain = AudioContext.prototype.createGain;
      AudioContext.prototype.createGain = function (...args) {
        window.bellContext = this;
        return createGain.apply(this, args);
      };
      window.bellSourceCount = 0;
      const createSource = AudioContext.prototype.createMediaElementSource;
      AudioContext.prototype.createMediaElementSource = function (...args) {
        window.bellSourceCount++;
        return createSource.apply(this, args);
      };
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...args) {
        const started = play.apply(this, args);
        if (this.id !== 'vacuum-audio' || !window.holdBellStart) return started;
        return Promise.all([started, new Promise(resolve => { window.releaseBellStart = resolve; })]);
      };
    });
    await page.clock.install();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('#vacuum-lab[data-audio="off"]').waitFor({ state: 'attached' });
    return page;
  }
  const air = page => page.locator('#vacuum-lab').getAttribute('data-air');
  const play = page => page.waitForFunction(() => document.querySelector('#vacuum-lab').dataset.audio === 'playing');
  const meter = page => page.waitForFunction(() => document.querySelector('#vacuum-db-value').hasAttribute('data-value'));
  async function checkInterrupted(page, name) {
    await page.waitForFunction(() => document.querySelector('#vacuum-lab').dataset.audio === 'interrupted');
    assert.equal(await page.locator('#vacuum-status').textContent(), notice);
    assert.ok(await page.locator('#vacuum-status').evaluate(node => node.clientWidth > 1 && getComputedStyle(node).clipPath === 'none'));
    assert.equal(await page.locator('#vacuum-db-value').textContent(), '—');
    assert.equal(await page.locator('#vacuum-db-value').getAttribute('data-value'), null);
    assert.equal(await page.locator('#vacuum-led-digits').getAttribute('data-reading'), '—');
    assert.equal(await page.locator('#vacuum-power').getAttribute('aria-checked'), 'true');
    assert.ok(await page.locator('#vacuum-audio').evaluate(node => node.paused));
    records.push({ name, air: await air(page), notice: await page.locator('#vacuum-status').textContent() });
  }

  await t.test('suspended output clears the meter, preserves the apparatus, and requires an explicit restart', async () => {
    const p = await open();
    await p.locator('#vacuum-power').click(); await play(p); await meter(p);
    await p.locator('#vacuum-extract').click(); await p.clock.runFor(3000);
    await p.locator('#vacuum-extract').click();
    const saved = await air(p), needle = await p.locator('#vacuum-needle').getAttribute('transform');
    let reloads = 0; p.on('request', request => { if (request.url().includes('electric-bell-loop.wav')) reloads++; });
    await p.evaluate(() => window.bellContext.suspend());
    await checkInterrupted(p, 'suspended');
    const hammer = await p.locator('#vacuum-hammer').getAttribute('transform');
    await p.clock.runFor(137);
    assert.notEqual(await p.locator('#vacuum-hammer').getAttribute('transform'), hammer);
    assert.equal(await air(p), saved);
    assert.equal(await p.locator('#vacuum-needle').getAttribute('transform'), needle);
    await p.locator('#card-03').screenshot({ path: path.join(out, 'interrupted-1440.png') });
    await p.evaluate(() => window.bellContext.resume());
    await p.clock.runFor(250); await checkInterrupted(p, 'system-resumed-without-autoplay');
    await p.locator('#vacuum-power').click();
    assert.equal(await p.locator('#vacuum-lab').getAttribute('data-power'), 'off');
    await p.locator('#vacuum-power').click(); await play(p); await meter(p);
    assert.equal(await air(p), saved);
    assert.equal(await p.locator('#vacuum-needle').getAttribute('transform'), needle);
    assert.notEqual(await p.locator('#vacuum-status').textContent(), notice);
    assert.equal(await p.evaluate(() => window.bellSourceCount), 1);
    assert.equal(reloads, 0, 'context recovery must not reload a healthy recording');
    await p.locator('#card-03').screenshot({ path: path.join(out, 'recovered-1440.png') });
    await p.close();
  });

  await t.test('air controls keep working during interruption and the notice remains until recovery', async () => {
    const p = await open();
    await p.locator('#vacuum-power').click(); await play(p);
    await p.locator('#vacuum-extract').click(); await p.clock.runFor(2500);
    await p.evaluate(() => window.bellContext.suspend()); await checkInterrupted(p, 'pumping-interrupted');
    const before = Number(await air(p)); await p.clock.runFor(700);
    assert.ok(Number(await air(p)) < before);
    assert.equal(await p.locator('#vacuum-lab').getAttribute('data-mode'), 'pump');
    await p.locator('#vacuum-admit').click();
    const low = Number(await air(p)); await p.clock.runFor(400);
    assert.ok(Number(await air(p)) > low);
    await checkInterrupted(p, 'admitting-interrupted');
    await p.locator('#vacuum-admit').click();
    const saved = await air(p);
    await p.locator('#vacuum-power').click();
    await p.locator('#vacuum-power').click(); await play(p); await meter(p);
    assert.equal(await air(p), saved);
    assert.equal(await p.locator('#vacuum-lab').getAttribute('data-mode'), 'idle');
    await p.close();
  });

  await t.test('interruption before the start promise settles cannot report normal playback', async () => {
    const p = await open();
    await p.evaluate(() => { window.holdBellStart = true; });
    await p.locator('#vacuum-power').click();
    await p.waitForFunction(() => window.releaseBellStart && window.bellContext.state === 'running');
    assert.equal(await p.locator('#vacuum-lab').getAttribute('data-audio'), 'starting');
    await p.evaluate(async () => { await window.bellContext.suspend(); window.releaseBellStart(); });
    await checkInterrupted(p, 'interrupted-during-start');
    await p.evaluate(() => { window.holdBellStart = false; });
    await p.locator('#vacuum-power').click();
    await p.locator('#vacuum-power').click(); await play(p);
    assert.notEqual(await p.locator('#vacuum-status').textContent(), notice);
    await p.close();
  });

  await t.test('390px touch and keyboard recover; switching off or leaving prevents false interruptions and autoplay', async () => {
    const p = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
    await p.locator('#vacuum-power').tap(); await play(p); await meter(p);
    await p.evaluate(() => window.bellContext.suspend()); await checkInterrupted(p, 'touch-interrupted');
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.locator('#card-03').screenshot({ path: path.join(out, 'interrupted-390.png') });
    await p.locator('#vacuum-power').focus(); await p.keyboard.press('Space'); await p.keyboard.press('Enter');
    await play(p); await meter(p);
    await p.locator('#vacuum-power').tap();
    await p.evaluate(() => window.bellContext.suspend());
    assert.equal(await p.locator('#vacuum-lab').getAttribute('data-audio'), 'off');
    assert.notEqual(await p.locator('#vacuum-status').textContent(), notice);
    await p.locator('#vacuum-power').tap(); await play(p);
    await p.evaluate(() => window.bellContext.suspend()); await checkInterrupted(p, 'before-navigation');
    await p.locator('.route a[href="#card-04"]').click();
    assert.equal(await p.locator('#vacuum-lab').getAttribute('data-power'), 'off');
    await p.evaluate(() => window.bellContext.resume());
    await p.locator('.route a[href="#card-03"]').click();
    assert.equal(await p.locator('#vacuum-lab').getAttribute('data-audio'), 'off');
    assert.ok(await p.locator('#vacuum-audio').evaluate(node => node.paused));
    await p.close();
  });
  await fs.writeFile(path.join(out, 'interruptions.json'), JSON.stringify(records, null, 2));
});
