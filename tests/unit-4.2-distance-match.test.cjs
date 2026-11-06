const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {expect}=require('playwright/test');

test('4.2 圖中距離與算式同步，情境獨立並支援觸控和鍵盤',{timeout:120000},async t=>{
  let base=process.env.LESSON_BASE_URL;
  if(!base){
    const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
    const port=await new Promise((resolve,reject)=>{let s='';server.stdout.on('data',d=>{s+=d;const m=s.match(/port (\d+)/);if(m)resolve(m[1]);});server.once('error',reject);});base=`http://127.0.0.1:${port}/`;
  }
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true,reducedMotion:'reduce'});
  await context.route(/\/assets\/(reflection-3d|laser-reflection|reversible-light|periscope|mirror-distance|curved-mirrors)\.js/,r=>r.fulfill({contentType:'application/javascript',body:''}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('units/4/parts/4.2/',base).href,{waitUntil:'load'});
  await expect(page.locator('#reference-eye')).toHaveAttribute('data-ready','true');
  await expect(page.locator('#trial-eye')).toHaveAttribute('data-ready','true');
  await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
  const capture=process.env.DISTANCE_CAPTURE_DIR;if(capture)fs.mkdirSync(capture,{recursive:true});
  const selected=async(prefix,distance)=>{
    const panel=page.locator(`#comparison-${prefix}`);
    const controls=panel.locator('.comparison-path-term,.comparison-path-total,[data-side^="distance-"]');
    const states=await controls.evaluateAll(es=>es.map(e=>({match:e.dataset.match,pressed:e.getAttribute('aria-pressed')})));
    assert.ok(states.length>=4);
    for(const s of states)assert.equal(s.pressed,String(s.match===distance));
    if(distance==='2'||distance==='3'){
      const term=panel.locator(`.comparison-path-term[data-distance="${distance}"]`);
      await expect(term).toHaveAttribute('id',`${prefix}-distance-${distance}`);
      await expect(term).toHaveCSS('border-top-color',distance==='2'?'rgb(152, 73, 20)':'rgb(36, 95, 131)');
    }
  };
  const geometry=()=>page.locator('.comparison-side').evaluateAll(es=>es.map(e=>[e.dataset.distances,...[...e.querySelectorAll('[data-side=rays] path,[data-side=extensions] path')].map(p=>p.getAttribute('d'))]));
  const before=await geometry();
  for(const width of [1440,1024,390,320]){
    await page.setViewportSize({width,height:1000});await page.screenshot({clip:{x:0,y:0,width:1,height:1}});
    await page.locator('#reference-side [data-side=distance-incoming]').click();await selected('reference','2');
    await page.locator('#reference-side [data-side=distance-three]').click();await selected('reference','3');
    const extension=page.locator('#reference-side [data-side=distance-two]');
    await extension.focus();await extension.press('Enter');await selected('reference','extension');
    await expect(extension).not.toHaveAttribute('aria-controls');
    const direct=page.locator('#trial-side [data-side=distance-three]');
    if(width<=390)await direct.tap();else await direct.click();
    await selected('trial','3');await selected('reference','extension');
    await page.locator('#trial-side [data-side=distance-two]').focus();
    await page.locator('#trial-side [data-side=distance-two]').press('Space');await selected('trial','2');
    await page.locator('#reference-distance-3').click();await selected('reference','3');await selected('trial','2');
    await page.locator('#comparison-reference .comparison-path-caption').click();await selected('reference',null);await selected('trial',null);
    await page.locator('#reference-distance-2').click();await selected('reference','2');
    await page.mouse.click(3,3);await selected('reference',null);await selected('trial',null);
    const upperTotal=page.locator('#comparison-reference .comparison-path-total'),lowerTotal=page.locator('#comparison-trial .comparison-path-total');
    if(width<=390)await upperTotal.tap();else await upperTotal.click();
    await selected('reference','total');await selected('trial',null);
    await expect(page.locator('#reference-side [data-side=total-highlight]')).toHaveAttribute('visibility','visible');
    await expect(page.locator('#reference-side [data-side=total-highlight]')).toHaveAttribute('d','M345,440L540,336L247.5,180');
    await lowerTotal.focus();await lowerTotal.press('Space');await selected('trial','total');
    await expect(page.locator('#trial-side [data-side=total-highlight]')).toHaveAttribute('visibility','visible');
    await expect(page.locator('#trial-side [data-side=total-highlight]')).toHaveAttribute('d','M735,440L247.5,180');
    await expect(page.locator('#reference-side [data-side=total-highlight]')).toHaveAttribute('stroke','#ffca46');
    if(capture&&width===1440)await page.locator('#card-04').screenshot({path:path.join(capture,'1440-total-paths.png')});
    if(width<=390)await page.touchscreen.tap(3,3);else await page.mouse.click(3,3);
    await selected('reference',null);await selected('trial',null);
    for(const overlay of await page.locator('[data-side=total-highlight]').all())await expect(overlay).toHaveAttribute('visibility','hidden');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(await geometry(),before,'互動不得改變光路幾何或距離');
    if(capture&&[1440,390].includes(width))await page.locator('#comparison-reference').screenshot({path:path.join(capture,`${width}-distance-match.png`)});
  }
  assert.deepEqual(errors,[]);
});
