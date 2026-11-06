const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {chromium,expect}=require('playwright/test');

test('單一潛望鏡挑戰：找船、追蹤視線及重新調整',{timeout:120000},async t=>{
  let base=process.env.LESSON_BASE_URL;
  if(!base){
    const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
    const port=await new Promise((resolve,reject)=>{let out='';server.stdout.on('data',d=>{out+=d;const m=out.match(/port (\d+)/);if(m)resolve(m[1]);});server.once('error',reject);});base=`http://127.0.0.1:${port}/`;
  }
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
  for(const width of [1440,390]){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:true});
    await context.route(/\/assets\/(reflection-3d|laser-reflection|reversible-light|mirror-image|mirror-distance|curved-mirrors)\.js/,r=>r.fulfill({contentType:'application/javascript',body:''}));
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(new URL('units/4/parts/4.2/',base).href,{waitUntil:'load'});
    const quiz=page.locator('#unit-quiz'),check=page.locator('#periscope-check'),feedback=page.locator('#periscope-feedback');
    await expect(quiz).toHaveAttribute('data-ready','true',{timeout:60000});await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
    assert.equal(await quiz.locator('.periscope-steps,#periscope-next,#periscope-signal,#periscope-question-2,#periscope-signal-source').count(),0);
    await expect(quiz).toHaveAttribute('data-completed','false');
    await check.click();await expect(feedback).toHaveAttribute('data-state','try');await expect(quiz).toHaveAttribute('data-completed','false');
    await page.locator('#periscope-pulse').click();await expect(quiz).toHaveAttribute('data-pulse-status','running');
    await expect(page.locator('#periscope-light .light-line')).toBeVisible();
    for(const i of [0,1])await page.locator(`#periscope-mirror-${i}`).evaluate(el=>{el.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));for(let n=30;n<45;n+=.5)el.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));});
    await expect(quiz).toHaveAttribute('data-target','true');await check.click();
    await expect(quiz).toHaveAttribute('data-completed','true');await expect(feedback).toHaveAttribute('data-state','good');await expect(feedback).toContainText('光經過兩面鏡子反射');
    await page.locator('#periscope-mirror-0').press('ArrowRight');await expect(quiz).toHaveAttribute('data-completed','false');await expect(feedback).not.toHaveAttribute('data-state','good');
    if(width===390){
      const svg=page.locator('#periscope-scene');await svg.scrollIntoViewIfNeeded();
      const points=await svg.evaluate(el=>{const angle=45.5*Math.PI/180,end=65.5*Math.PI/180,m=el.getScreenCTM(),point=a=>{const p=new DOMPoint(565+60*Math.cos(a),190+60*Math.sin(a)).matrixTransform(m);return{x:p.x,y:p.y};};return[point(angle),point(end)];});
      const cdp=await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...points[0],id:1}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...points[1],id:1}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await expect.poll(async()=>Number(await page.locator('#periscope-mirror-0').getAttribute('aria-valuenow'))).toBeGreaterThan(46);
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
    if(process.env.PERISCOPE_CAPTURE_DIR)await quiz.screenshot({path:path.join(process.env.PERISCOPE_CAPTURE_DIR,`single-${width}.png`)});
    await context.close();
  }
});
