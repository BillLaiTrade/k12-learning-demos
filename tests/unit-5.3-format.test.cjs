const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs/promises');
const {chromium} = require('playwright');

test('5.3 共通格式、導覽連動與原有活動回歸', {timeout:180000}, async t => {
  const server = spawn('python3', ['-u','-m','http.server','0','--bind','127.0.0.1'], {cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});
  t.after(() => server.kill());
  const port = await new Promise((resolve,reject) => {
    const timer = setTimeout(() => reject(Error('server timeout')),5000);
    server.stdout.on('data',d => {const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});
    server.once('error',reject);
  });
  const remote = process.env.UNIT53_URL;
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox'],...(remote?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});
  t.after(() => browser.close());
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on('pageerror',e => errors.push(e.message));
  page.on('response',r => {if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  const url=remote || `http://127.0.0.1:${port}/units/5/parts/5.3/`;
  await page.goto(url,{waitUntil:'networkidle'});

  await t.test('靜態 HTML 的標題、摘要、分享圖及入口一致，不依賴 JS',async()=>{
    const html=await (await page.request.get(url)).text();
    const meta=name => html.match(new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)"`))?.[1];
    const title=html.match(/<title>(.*?)<\/title>/)[1];
    const h1=await page.locator('h1').textContent();
    assert.equal(title,`${h1}｜5.3 熱量與比熱`);
    for(const name of ['og:title','twitter:title'])assert.equal(meta(name),title);
    for(const name of ['og:description','twitter:description'])assert.equal(meta(name),meta('description'));
    const canonical='https://billlaitrade.github.io/k12-learning-demos/units/5/parts/5.3/';
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
    assert.equal(meta('og:url'),canonical);
    assert.equal(meta('og:image'),meta('twitter:image'));
    assert.equal(meta('og:image:alt'),await page.locator('.hero-art img').getAttribute('alt'));
    const image=await page.locator('.hero-art img').evaluate(async n=>{await n.decode();return {width:n.naturalWidth,height:n.naturalHeight};});
    assert.equal(Number(meta('og:image:width')),image.width);assert.equal(Number(meta('og:image:height')),image.height);
    assert.ok(meta('og:image').endsWith(await page.locator('.hero-art img').getAttribute('src')));
    const entry=await (await page.request.get(new URL('../../',url).href)).text();
    assert.ok(entry.includes(`<h3 class="part-title">${h1}</h3>`));
  });

  await t.test('六個導覽逐字對應正確區塊；標題更名即時連動',async()=>{
    const links=page.locator('.route a');assert.equal(await links.count(),6);
    for(let i=0;i<6;i++){
      const link=links.nth(i),hash=await link.getAttribute('href');
      assert.equal(await link.locator('span').textContent(),await page.locator(`${hash} h2`).textContent());
      await link.click();assert.equal(new URL(page.url()).hash,hash);
      const top=await page.locator(hash).evaluate(n=>n.getBoundingClientRect().top);assert.ok(top>=0&&top<160);
      await page.waitForFunction(hash=>document.querySelector(`.route a[href="${hash}"]`).getAttribute('aria-current')==='step',hash);
    }
    for(const id of ['title-02','quiz-title']){
      const heading=page.locator(`#${id}`),original=await heading.textContent();
      const target=await heading.evaluate(n=>n.closest('section').id);
      await heading.evaluate(n=>{n.textContent='更名連動檢查：只有這裡改文字';});
      await page.waitForFunction(target=>document.querySelector(`.route a[href="#${target}"] span`).textContent==='更名連動檢查：只有這裡改文字',target);
      await heading.evaluate((n,text)=>{n.textContent=text;},original);
      await page.waitForFunction(({target,original})=>document.querySelector(`.route a[href="#${target}"] span`).textContent===original,{target,original});
    }
  });

  await t.test('五區均為上標頭下內容；三種桌機與兩種窄版可完整閱讀',async()=>{
    const layouts=[];
    for(const [width,height] of [[1440,900],[1366,768],[1280,720],[390,844],[320,740]]){
      await page.setViewportSize({width,height});
      const layout=await page.evaluate(()=>{
        const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom};};
        return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,cards:[...document.querySelectorAll('.lesson-card')].map(n=>({header:rect(n.querySelector('.lesson-head')),body:rect(n.querySelector('.card-main')),titleClipped:n.querySelector('h2').scrollWidth>n.querySelector('h2').clientWidth})),navClipped:[...document.querySelectorAll('.route a span')].some(n=>n.scrollWidth>n.clientWidth)};
      });
      assert.equal(layout.overflow,false,`${width} page overflow`);assert.equal(layout.navClipped,false,`${width} nav clipping`);
      assert.equal(layout.cards.length,5);
      for(const c of layout.cards){assert.ok(c.body.y>=c.header.bottom-1);assert.ok(Math.abs(c.body.x-c.header.x)<1);assert.ok(Math.abs(c.body.w-c.header.w)<1);assert.equal(c.titleClipped,false);}
      layouts.push(layout);
    }
    await page.setViewportSize({width:1440,height:900});
    if(process.env.UNIT53_CAPTURE_DIR){await fs.mkdir(process.env.UNIT53_CAPTURE_DIR,{recursive:true});await fs.writeFile(path.join(process.env.UNIT53_CAPTURE_DIR,'layout.json'),JSON.stringify(layouts,null,2));await page.locator('#card-01').screenshot({path:path.join(process.env.UNIT53_CAPTURE_DIR,'card01.png')});await page.locator('#card-04').screenshot({path:path.join(process.env.UNIT53_CAPTURE_DIR,'card04.png')});await page.locator('h1').evaluate(n=>n.scrollIntoView({block:'center'}));await page.waitForFunction(()=>document.querySelector('.route a').getAttribute('aria-current')==='step');await page.screenshot({path:path.join(process.env.UNIT53_CAPTURE_DIR,'opening.png')});}
  });

  await t.test('第一區 100 g 水升溫、完成後介紹卡，重新觀察同步清除結果',async()=>{
    await page.clock.install();
    assert.equal(await page.locator('#calorie-conclusion').isHidden(),true);
    assert.equal(await page.locator('#calorie-pause').count(),0);
    await page.locator('#calorie-transfer').click();await page.clock.runFor(6500);
    assert.equal(await page.locator('#calorie-end').textContent(),'21.0');assert.equal(await page.locator('#calorie-rise').textContent(),'1.0');assert.equal(await page.locator('#calorie-heat').textContent(),'100');
    assert.equal(await page.locator('#calorie-meter').textContent(),'21.0');assert.equal(await page.locator('#calorie-conclusion').isVisible(),true);
    await page.locator('#calorie-transfer').click();assert.equal(await page.locator('#calorie-end').textContent(),'20.0');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    assert.equal(await page.locator('#calorie-conclusion').isHidden(),true);
  });

  await t.test('三組實驗可完成、記錄、改條件重來；生活應用可切換',async()=>{
    for(const [id,expected]of [['heat-lab',['30.0']],['mass-lab',['30.0','25.0']],['material-lab',['25.0','42.7']]]){
      const lab=page.locator(`#${id}`);await lab.locator('[data-play]').click();await page.clock.runFor(6500);
      assert.equal(await lab.getAttribute('data-phase'),'complete');assert.deepEqual(await lab.locator('[data-temperature]').allTextContents(),expected);
      await lab.locator('[data-record]').click();assert.equal(await lab.locator('[data-records] tr').count(),1);
      const setting=lab.locator('[data-setting]');
      if(id==='heat-lab')await setting.evaluate(n=>{n.value='2000';n.dispatchEvent(new Event('input',{bubbles:true}));});
      else await setting.selectOption(id==='mass-lab'?'300':'copper');
      assert.equal(await lab.getAttribute('data-phase'),'ready');assert.equal(await lab.locator('[data-records] tr').count(),1);
    }
    for(const key of ['bottle','coast','pan']){await page.locator(`[data-application="${key}"]`).click();assert.equal(await page.locator(`[data-application="${key}"]`).getAttribute('aria-pressed'),'true');assert.ok((await page.locator('#application-content').textContent()).length>40);}
  });

  await t.test('原有四題小測可核對與重答；無載入或程式錯誤',async()=>{
    for(const [name,value]of Object.entries({q1:'1000',q2:'double',q3:'a',q4:'controlled'}))await page.locator(`input[name="${name}"][value="${value}"]`).check();
    await page.locator('#heat-quiz button[type=submit]').click();assert.match(await page.locator('#quiz-result').textContent(),/4／4/);
    await page.locator('#heat-quiz button[type=reset]').click();assert.equal(await page.locator('#quiz-result').isHidden(),true);assert.equal(await page.locator('#heat-quiz input:checked').count(),0);
    assert.deepEqual(errors,[]);
  });
});
