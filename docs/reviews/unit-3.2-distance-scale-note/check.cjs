const { chromium } = require(require.resolve('playwright', { paths: [process.cwd()] }));
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const remote = process.env.SCALE_NOTE_URL;
  const server = remote ? null : spawn('python3', ['-m', 'http.server', '8734', '--bind', '127.0.0.1']);
  let browser;
  const target = remote || 'http://127.0.0.1:8734/units/3/parts/3.2/';
  const label = remote ? 'public' : 'local';
  try {
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    assert.equal((await page.goto(target)).status(), 200);
    await page.locator('#models .medium-row').first().waitFor();
    await page.locator('#temp-models .medium-row').first().waitFor();
    const note = '器材圖為示意，不按實際距離比例繪製。';
    const results = [];
    for (const width of [1440, 1280, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const id of ['card-04', 'card-05']) {
        const section = page.locator('#' + id);
        await section.scrollIntoViewIfNeeded();
        const text = section.getByText(note, { exact: true });
        assert.equal(await text.count(), 1);
        assert.ok(await text.isVisible());
        const box = await text.boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= width + .5);
        assert.equal(await text.evaluate(element => element.scrollWidth > element.clientWidth + 1), false);
        if ([1440, 390].includes(width)) await section.screenshot({ path: `/tmp/unit32-scale-note/${label}-${id}-${width}.png` });
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      results.push({ width, notesVisible: 2, noHorizontalOverflow: true });
    }
    for (const prefix of ['', 'temp-']) {
      await page.locator('#' + prefix + 'primary-action').click();
      await page.waitForTimeout(180);
      assert.equal(await page.locator('#' + prefix + 'experiment-panel').getAttribute('data-phase'), 'running');
      await page.locator('#' + prefix + 'primary-action').click();
      assert.equal(await page.locator('#' + prefix + 'experiment-panel').getAttribute('data-phase'), 'paused');
      await page.locator('#' + prefix + 'reset-action').click();
      assert.equal(await page.locator('#' + prefix + 'experiment-panel').getAttribute('data-phase'), 'idle');
    }
    assert.deepEqual(errors, []);
    const result = { target, results, controls: 'play/pause/reset passed for both labs', pageErrors: errors };
    fs.writeFileSync(`/tmp/unit32-scale-note/${label}-checks.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } finally {
    if (browser) await browser.close();
    server?.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
