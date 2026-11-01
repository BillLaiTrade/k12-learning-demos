const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');

const rulerError = '聲音暫時無法播放，請重新點擊尺面。';
const bellError = '電鈴聲暫時無法播放，請再開啟一次電鈴。';

test('3.2 audio retry reloads failed media without resetting the experiment', { timeout: 120000 }, async t => {
  let url = process.env.AUDIO_RETRY_URL;
  if (!url) {
    const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
      cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'ignore']
    });
    t.after(() => server.kill());
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('server timeout')), 5000);
      server.stdout.on('data', b => {
        const match = String(b).match(/port (\d+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
      server.once('error', reject);
    });
    url = `http://127.0.0.1:${port}/units/3/parts/3.2/`;
  }
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    ...(process.env.AUDIO_RETRY_URL ? { proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY } } : {})
  });
  t.after(() => browser.close());
  const out = process.env.AUDIO_RETRY_ARTIFACT_DIR || '/tmp/unit32-audio-retry';
  await fs.mkdir(out, { recursive: true });
  async function open(options = {}) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, ...options });
    page.setDefaultTimeout(10000);
    await page.addInitScript(() => {
      window.retrySourceCount = 0;
      const source = AudioContext.prototype.createMediaElementSource;
      AudioContext.prototype.createMediaElementSource = function (...args) {
        window.retrySourceCount++; return source.apply(this, args);
      };
      const gain = AudioContext.prototype.createGain;
      AudioContext.prototype.createGain = function (...args) {
        const node = gain.apply(this, args); window.retryGain = node; return node;
      };
    });
    t.after(() => page.close());
    return page;
  }
  async function fault(page, pattern) {
    const state = { allowed: false, requests: 0, delay: 0 };
    await page.route(pattern, async route => {
      state.requests++;
      if (!state.allowed) return route.abort('failed');
      if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
      await route.continue();
    });
    return state;
  }
  async function visit(page) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('#vacuum-lab').dataset.audio === 'off' && document.querySelector('#ruler-strip-79'));
  }
  const waitRulerError = page => page.waitForFunction(() => document.querySelector('#ruler-status').textContent.includes('暫時無法播放'));
  const waitBellError = page => page.waitForFunction(() => document.querySelector('#vacuum-lab').dataset.audio === 'error');
  const waitBellPlaying = page => page.waitForFunction(() => document.querySelector('#vacuum-lab').dataset.audio === 'playing');

  await t.test('a failed native ruler resource reloads on retry and keeps its error while loading', async () => {
    const p = await open(), network = await fault(p, '**/metal-ruler-twang.wav*');
    await visit(p);
    await p.locator('#ruler-start').click(); await waitRulerError(p);
    assert.ok(await p.locator('#ruler-audio').evaluate(a => a.error !== null));
    await p.waitForTimeout(1400);
    const before = network.requests;
    network.allowed = true; network.delay = 600;
    await p.locator('#ruler-start').click(); await p.waitForTimeout(100);
    assert.equal(await p.locator('#ruler-status').textContent(), rulerError);
    await p.locator('#card-01').screenshot({ path: path.join(out, 'ruler-retry-loading.png') });
    await p.waitForFunction(() => document.querySelector('#ruler-status').textContent.startsWith('鋼尺正在振動'));
    assert.ok(network.requests > before, 'retry must issue a fresh resource request');
    assert.equal(await p.locator('#ruler-audio').evaluate(a => !a.error && !a.paused), true);
    await p.locator('#ruler-stop').click();
    assert.equal(await p.locator('#ruler-status').textContent(), '已按住鋼尺，振動和聲音停止。');
    await p.locator('#card-01').screenshot({ path: path.join(out, 'ruler-recovered.png') });
    await p.close();
  });

  await t.test('bell retry retains air, mode and its audio graph, then restores actual samples', async () => {
    const p = await open(), network = await fault(p, '**/electric-bell-loop.wav*');
    await visit(p);
    await p.locator('#vacuum-extract').click(); await p.waitForTimeout(1400);
    await p.locator('#vacuum-extract').click();
    const air = await p.locator('#vacuum-lab').getAttribute('data-air');
    const needle = await p.locator('#vacuum-needle').getAttribute('transform');
    assert.ok(Number(air) < .85 && Number(air) > .5);
    await p.locator('#vacuum-power').click(); await waitBellError(p);
    assert.ok(await p.locator('#vacuum-audio').evaluate(a => a.error !== null));
    const before = network.requests;
    network.allowed = true; network.delay = 600;
    await p.locator('#vacuum-power').click(); await p.waitForTimeout(100);
    assert.equal(await p.locator('#vacuum-status').textContent(), bellError);
    assert.equal(await p.locator('#vacuum-status').evaluate(n => n.classList.contains('vacuum-status-error')), true);
    await p.locator('#card-03').screenshot({ path: path.join(out, 'bell-retry-loading.png') });
    await waitBellPlaying(p);
    assert.ok(network.requests > before);
    assert.equal(await p.locator('#vacuum-lab').getAttribute('data-air'), air);
    assert.equal(await p.locator('#vacuum-lab').getAttribute('data-mode'), 'idle');
    assert.equal(await p.locator('#vacuum-needle').getAttribute('transform'), needle);
    assert.equal(await p.evaluate(() => window.retrySourceCount), 1);
    await p.waitForFunction(() => document.querySelector('#vacuum-db-value').hasAttribute('data-value'));
    const expectedGain = .012 + .988 * Number(air) ** 1.7;
    assert.ok(Math.abs(await p.evaluate(() => window.retryGain.gain.value) - expectedGain) < .01);
    assert.equal(await p.locator('#vacuum-audio').evaluate(a => !a.error && !a.paused && a.loop && a.currentTime > 0), true);
    assert.equal(await p.locator('#vacuum-status').evaluate(n => n.classList.contains('vacuum-status-error')), false);
    await p.locator('#card-03').screenshot({ path: path.join(out, 'bell-recovered.png') });
    // A reload must also preserve a running pump, rather than resetting the apparatus.
    network.allowed = false;
    await p.locator('#vacuum-power').click();
    await p.locator('#vacuum-audio').evaluate(a => a.load());
    await p.waitForFunction(() => document.querySelector('#vacuum-audio').error !== null);
    await p.locator('#vacuum-power').click(); await waitBellError(p);
    await p.locator('#vacuum-extract').click();
    const pumpingAir = Number(await p.locator('#vacuum-lab').getAttribute('data-air'));
    network.allowed = true; network.delay = 100;
    await p.locator('#vacuum-power').click(); await waitBellPlaying(p);
    assert.equal(await p.locator('#vacuum-lab').getAttribute('data-mode'), 'pump');
    assert.ok(Number(await p.locator('#vacuum-lab').getAttribute('data-air')) <= pumpingAir);
    assert.equal(await p.evaluate(() => window.retrySourceCount), 1);
    await p.close();
  });

  await t.test('repeated failures keep both retry messages and request the media again', async () => {
    const p = await open();
    const ruler = await fault(p, '**/metal-ruler-twang.wav*'), bell = await fault(p, '**/electric-bell-loop.wav*');
    await visit(p);
    await p.locator('#ruler-start').click(); await waitRulerError(p); await p.waitForTimeout(1400);
    const rulerBefore = ruler.requests;
    await p.locator('#ruler-start').click(); await waitRulerError(p); await p.waitForTimeout(1400);
    assert.ok(ruler.requests > rulerBefore);
    assert.equal(await p.locator('#ruler-status').textContent(), rulerError);
    await p.locator('#vacuum-power').click(); await waitBellError(p);
    const bellBefore = bell.requests;
    await p.locator('#vacuum-power').click(); await waitBellError(p);
    assert.ok(bell.requests > bellBefore);
    assert.equal(await p.locator('#vacuum-status').textContent(), bellError);
    await p.close();
  });

  await t.test('stopping or leaving a pending retry prevents late playback and error clearing', async () => {
    const p = await open();
    const ruler = await fault(p, '**/metal-ruler-twang.wav*'), bell = await fault(p, '**/electric-bell-loop.wav*');
    await visit(p);
    await p.locator('#ruler-start').click(); await waitRulerError(p); await p.waitForTimeout(1400);
    ruler.allowed = true; ruler.delay = 800;
    await p.locator('#ruler-start').click(); await p.locator('#ruler-stop').click();
    await p.waitForTimeout(1000);
    assert.equal(await p.locator('#ruler-status').textContent(), rulerError);
    assert.equal(await p.locator('#ruler-audio').evaluate(a => a.paused), true);
    await p.locator('#vacuum-power').click(); await waitBellError(p);
    bell.allowed = true; bell.delay = 800;
    await p.locator('#vacuum-power').click();
    await p.locator('.route a[href="#card-02"]').click(); await p.waitForTimeout(1100);
    assert.equal(await p.locator('#vacuum-lab').getAttribute('data-power'), 'off');
    assert.equal(await p.locator('#vacuum-audio').evaluate(a => a.paused), true);
    assert.equal(await p.locator('#vacuum-status').textContent(), bellError);
    await p.locator('.route a[href="#card-03"]').click();
    assert.equal(await p.locator('#vacuum-audio').evaluate(a => a.paused), true);
    await p.close();
  });

  await t.test('390px touch and keyboard retries recover without overflow under reduced motion', async () => {
    const p = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    const ruler = await fault(p, '**/metal-ruler-twang.wav*'), bell = await fault(p, '**/electric-bell-loop.wav*');
    await visit(p);
    await p.locator('#ruler-pluck').tap(); await waitRulerError(p); await p.waitForTimeout(1400);
    ruler.allowed = true;
    await p.locator('#ruler-pluck').focus(); await p.keyboard.press('Space');
    await p.waitForFunction(() => document.querySelector('#ruler-status').textContent.startsWith('鋼尺正在振動'));
    await p.locator('#ruler-stop').tap();
    await p.locator('#vacuum-power').tap(); await waitBellError(p);
    bell.allowed = true;
    await p.locator('#vacuum-power').focus(); await p.keyboard.press('Enter'); await waitBellPlaying(p);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await p.locator('#vacuum-audio').evaluate(a => !a.error && !a.paused), true);
    // Capture the visible phone viewport without resizing it for a tall element.
    await p.screenshot({ path: path.join(out, 'touch-keyboard-recovered-390.png') });
    assert.equal(await p.locator('#vacuum-audio').evaluate(a => !a.paused), true);
    await p.close();
  });
});
