const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {expect}=require('playwright/test');

test('4.2 完整頁面、主要活動與資源失敗恢復',{timeout:300000},async t=>{
  let base=process.env.LESSON_BASE_URL;
  if(!base){
    const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});
    t.after(()=>server.kill());
    const port=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',data=>{output+=data;const match=output.match(/port (\d+)/);if(match){clearTimeout(timer);resolve(match[1]);}});server.on('error',reject);});
    base=`http://127.0.0.1:${port}/`;
  }
  const url=new URL('units/4/parts/4.2/',base).href;
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
  t.after(()=>browser.close());
  const captureDir=process.env.COMPLETION_CAPTURE_DIR||'/tmp/unit42-completion';fs.mkdirSync(captureDir,{recursive:true});
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  t.after(()=>context.close());
  // Only expose actual mesh projections in this test response, so a native mouse
  // click has to hit the visible flashlight rather than invoke its handler.
  await context.route('**/assets/reflection-3d.js*',async route=>{
    const response=await route.fetch(),source=await response.text(),anchor="  canvas.addEventListener('pointerdown', (event) => {";
    assert.ok(source.includes(anchor));
    await route.fulfill({response,body:source.replace(anchor,`  window.__reflectionLampPoints=()=>lamps.map(lamp=>{const p=lamp.position.clone().project(camera),r=canvas.getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};});\n${anchor}`)});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(url,{waitUntil:'commit'});await expect(page.locator('#unit-quiz')).toHaveAttribute('data-ready','true',{timeout:60000});
  await expect(page.locator('#laser-reflection-scene')).toHaveAttribute('data-ready','true',{timeout:60000});

  await t.test('入口、無JS靜態分享資訊與核可開場圖一致',async()=>{
    const plain=await browser.newContext({javaScriptEnabled:false}),p=await plain.newPage();
    try{
      await p.goto(new URL('units/4/',base).href);
      await p.locator('a[href^="parts/4.2/"]').click();await expect(p.locator('h1')).toHaveText('光遇到表面會怎樣？');
      const title='光遇到表面會怎樣？｜4.2 光的反射與面鏡';await expect(p).toHaveTitle(title);
      for(const selector of ['meta[property="og:title"]','meta[name="twitter:title"]'])await expect(p.locator(selector)).toHaveAttribute('content',title);
      const description=await p.locator('meta[name="description"]').getAttribute('content');
      for(const selector of ['meta[property="og:description"]','meta[name="twitter:description"]'])await expect(p.locator(selector)).toHaveAttribute('content',description);
      const canonical='https://billlaitrade.github.io/k12-learning-demos/units/4/parts/4.2/';
      await expect(p.locator('link[rel="canonical"]')).toHaveAttribute('href',canonical);await expect(p.locator('meta[property="og:url"]')).toHaveAttribute('content',canonical);
      const image=p.locator('.hero img');await image.evaluate(e=>e.decode());
      assert.deepEqual(await image.evaluate(e=>[e.naturalWidth,e.naturalHeight]),[1671,941]);
      await expect(p.locator('meta[property="og:image"]')).toHaveAttribute('content',canonical+'assets/optics-lab-opening-teddy.png');
      await expect(p.locator('meta[name="twitter:image"]')).toHaveAttribute('content',canonical+'assets/optics-lab-opening-teddy.png');
      await expect(p.locator('meta[property="og:image:width"]')).toHaveAttribute('content','1671');await expect(p.locator('meta[property="og:image:height"]')).toHaveAttribute('content','941');
      assert.ok((await p.locator('meta[property="og:image:alt"]').getAttribute('content')).includes('小葵與阿公'));
      await expect(p.locator('#unit-quiz noscript p')).toContainText('需要 JavaScript');
    }finally{await plain.close();}
  });

  await t.test('六區與唯一小測、三種桌機筆電尺寸的路線及標頭可用',async()=>{
    const ids=await page.locator('[id]').evaluateAll(es=>es.map(e=>e.id));assert.equal(ids.length,new Set(ids).size);
    const targets=['card-01','card-02','card-03','card-04','card-05','card-06','unit-quiz'];
    assert.deepEqual(await page.locator('.lesson-list > section').evaluateAll(es=>es.map(e=>e.id)),targets);
    assert.deepEqual(await page.locator('.route a').evaluateAll(es=>es.map(e=>e.hash.slice(1))),targets);
    const expectedTitles=['同一束光照到不同表面，反射方向一樣嗎？','光的反射，有什麼規律？','從另一端照回，光路會重合嗎？','為什麼鏡前的熊，看起來在鏡後？','物體移近鏡子，像的位置怎麼變？','鏡面形狀不同，反射光和像會怎麼變？'];
    assert.deepEqual(await page.locator('.lesson-card:not(#unit-quiz) .card-heading h2').allTextContents(),expectedTitles);
    assert.deepEqual(await page.locator('.route a:not(.quiz-nav) > span:last-child').allTextContents(),expectedTitles);
    assert.deepEqual(await page.locator('.card-number').allTextContents(),['01','02','03','04','05','06']);
    assert.deepEqual(await page.locator('.route a:not(.quiz-nav) .route-number').allTextContents(),['01','02','03','04','05','06']);
    const measurements=[];
    for(const [width,height] of [[1440,900],[1366,768],[1280,720]]){
      await page.setViewportSize({width,height});
      for(const id of targets){
        await page.locator(`.route a[href="#${id}"]`).click();await expect(page).toHaveURL(new RegExp(`#${id}$`));
        await page.locator(`#${id}`).evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
        await expect(page.locator('.route a[aria-current=step]')).toHaveAttribute('href',`#${id}`);
        await expect(page.locator('#lesson-progress')).toHaveJSProperty('value',targets.indexOf(id)+1);
        const layout=await page.locator(`#${id}`).evaluate(e=>{const r=e.getBoundingClientRect(),h=e.querySelector('h2').getBoundingClientRect(),main=e.querySelector('.card-main,.periscope-body')||e.children[1];return{id:e.id,left:r.left,right:r.right,headingTop:h.top,headingRight:h.right,bodyTop:main.getBoundingClientRect().top,headingBottom:h.bottom,overflow:document.documentElement.scrollWidth>innerWidth,clipped:[...e.querySelectorAll('h2,.card-subtitle,button')].filter(n=>n.getClientRects().length&&!n.closest('[hidden]')).filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.id||n.textContent.trim())};});
        assert.equal(layout.overflow,false);assert.ok(layout.left>=0&&layout.right<=width+1);assert.ok(layout.headingTop>=-1&&layout.headingRight<=layout.right);assert.ok(layout.bodyTop>=layout.headingBottom,JSON.stringify({width,...layout}));assert.deepEqual(layout.clipped,[],`${width} ${id}`);
        measurements.push({width,height,...layout});
        if(width===1440){const style=await page.addStyleTag({content:'.route{visibility:hidden!important}'});await page.locator(`#${id}`).screenshot({path:path.join(captureDir,`${width}-${id}.png`)});await style.evaluate(e=>e.remove());}
      }
      await page.locator('#unit-quiz').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
      await expect(page.locator('.route a[aria-current=step]')).toHaveAttribute('href','#unit-quiz');
      await page.screenshot({path:path.join(captureDir,`${width}-quiz-viewport.png`)});
    }
    fs.writeFileSync(path.join(captureDir,'layout.json'),JSON.stringify(measurements,null,2));
    await page.setViewportSize({width:1440,height:900});
  });

  await t.test('第二區調角承接新第三區，後續成像、物距與曲面鏡仍可操作',async()=>{
    const laser=page.locator('#laser-reflection-scene'),reverse=page.locator('#card-03');
    await laser.press('Home');await laser.press('ArrowRight');
    await expect(reverse).toHaveAttribute('data-reverse-angle','21');
    await page.locator('.route a[href="#card-03"]').click();
    await page.locator('#reverse-toggle-a').click();await page.locator('#reverse-toggle-b').click();
    await expect(reverse).toHaveAttribute('data-light-a','on');await expect(reverse).toHaveAttribute('data-light-b','on');await expect(page.locator('#reverse-overlap')).toBeVisible();
    await page.locator('#reverse-scene').press('End');await expect(reverse).toHaveAttribute('data-reverse-angle','60');
    await expect(laser).toHaveAttribute('aria-valuenow','21');
    await page.locator('#reverse-reset').click();await expect(reverse).toHaveAttribute('data-light-a','off');await expect(reverse).toHaveAttribute('data-light-b','off');
    await expect(page.locator('#card-04 #reference-eye')).toHaveAttribute('data-ready','true');
    await expect(page.locator('#card-05 #distance-side-object')).toHaveAttribute('aria-valuenow','40');
    await page.locator('#mirror-bear-toggle').click();await expect(page.locator('#card-06')).toHaveAttribute('data-concave-position','far');
    await page.locator('#mirror-bear-toggle').click();await expect(page.locator('#card-06')).toHaveAttribute('data-concave-position','near');
    await page.locator('#mirror-normal-toggle').click();await expect(page.locator('#card-06')).toHaveAttribute('data-normals','false');
    await page.locator('#mirror-normal-toggle').click();
  });

  await t.test('第一區實際點燈、獨立開關、改變觀看方向與取消拖曳',async()=>{
    const mirror=page.locator('#reflection-fire-mirror'),paper=page.locator('#reflection-fire-paper'),canvas=page.locator('#reflection-3d-scene');
    await canvas.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
    const off=await canvas.screenshot();
    const points=await page.evaluate(()=>window.__reflectionLampPoints());await page.mouse.click(points[0].x,points[0].y);
    await expect(mirror).toHaveAttribute('aria-pressed','true');await expect(paper).toHaveAttribute('aria-pressed','false');
    assert.equal(off.equals(await canvas.screenshot()),false,'visible mirror illumination changes');
    await paper.click();await expect(paper).toHaveAttribute('aria-pressed','true');await mirror.click();await expect(mirror).toHaveAttribute('aria-pressed','false');await expect(paper).toHaveAttribute('aria-pressed','true');
    await canvas.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));const a=await canvas.screenshot(),r=await canvas.boundingBox();
    await page.mouse.move(r.x+r.width*.5,r.y+r.height*.5);await page.mouse.down();await page.mouse.move(r.x+r.width*.58,r.y+r.height*.53,{steps:6});await page.mouse.up();
    assert.equal(a.equals(await canvas.screenshot()),false,'camera rotation changes the actual scene');
    await expect(paper).toHaveAttribute('aria-pressed','true');await expect(mirror).toHaveAttribute('aria-pressed','false');
    await page.mouse.down();await canvas.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();await expect(canvas).not.toHaveClass(/is-dragging/);
    await paper.click();await expect(paper).toHaveAttribute('aria-pressed','false');
  });

  await t.test('第五區滑鼠拖動、10至60公分邊界、刻度及正面觀察同步',async()=>{
    const bear=page.locator('#distance-side-object');await bear.focus();await bear.press('Home');
    for(const [key,expected] of [['ArrowRight',10],['End',60],['ArrowLeft',60],['Home',10],['Shift+ArrowLeft',20]]){
      await bear.press(key);await expect(bear).toHaveAttribute('aria-valuenow',String(expected));
      await expect(page.locator('#distance-object-measure-label')).toHaveText(`物距 ${expected} cm`);await expect(page.locator('#distance-image-measure-label')).toHaveText(`像距 ${expected} cm`);
    }
    await page.locator('#distance-side-view').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
    const a=await bear.evaluate(e=>{const p=new DOMPoint(182,180).matrixTransform(e.getScreenCTM());return{x:p.x,y:p.y,scale:e.getScreenCTM().a};});
    await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(a.x-10*4*a.scale,a.y,{steps:6});await page.mouse.up();
    await expect(bear).toHaveAttribute('aria-valuenow','30');await expect(page.locator('#distance-front-status')).toHaveText('物體離鏡面 30 cm｜虛像在鏡後 30 cm');
    const ticks=await page.locator('#distance-side-view').evaluate(()=>['object','image'].map(n=>+document.querySelector(`#distance-ruler-${n}-marker`).getAttribute('x1')));assert.equal(310-ticks[0],ticks[1]-310);
    await page.mouse.move(a.x-10*4*a.scale,a.y);await page.mouse.down();await bear.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();await bear.press('End');await expect(bear).toHaveAttribute('aria-valuenow','60');
    await expect(page.locator('#card-05')).not.toHaveClass(/is-distance-dragging/);
  });

  await t.test('WebGL不可用時清楚提示，第四五六區與潛望鏡仍可使用',async()=>{
    const c=await browser.newContext();
    await c.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
    const p=await c.newPage(),failures=[];p.on('pageerror',e=>failures.push(e.message));
    try{
      await p.goto(url);await expect(p.locator('#reflection-fallback')).toBeVisible();await expect(p.locator('#reflection-fire-mirror')).toBeDisabled();
      await expect(p.locator('#laser-reflection-scene')).toHaveAttribute('data-ready','error');await expect(p.locator('#laser-reflection-scene')).toBeHidden();await expect(p.locator('#angle-observation')).toContainText('無法呈現 3D');
      await expect(p.locator('#reverse-fallback')).toBeVisible();await p.locator('#reverse-toggle-a').click();await expect(p.locator('#card-03')).toHaveAttribute('data-light-a','on');
      await expect(p.locator('#reference-eye')).toHaveAttribute('data-ready','true');await p.locator('#distance-side-object').press('Home');await expect(p.locator('#distance-side-object')).toHaveAttribute('aria-valuenow','10');
      await p.locator('#mirror-bear-toggle').click();await expect(p.locator('#card-06')).toHaveAttribute('data-concave-position','far');
      await expect(p.locator('#unit-quiz')).toHaveAttribute('data-ready','true');await expect(p.locator('#periscope-check')).toBeEnabled();assert.deepEqual(failures,[]);
    }finally{await c.close();}
  });

  await t.test('潛望鏡素材延遲、失敗與重新載入，不把未就緒畫面判定成功',async()=>{
    const c=await browser.newContext(),p=await c.newPage();let release;const pending=new Promise(resolve=>release=resolve);
    const pattern='**/periscope/submarine-scene.webp*';await p.route(pattern,async route=>{await pending;await route.continue();});
    try{
      await p.goto(url+'#unit-quiz',{waitUntil:'domcontentloaded'});await expect(p.locator('#unit-quiz')).toHaveAttribute('data-ready','loading');
      await expect(p.locator('#periscope-view-state')).toContainText('正在準備');await expect(p.locator('#periscope-check')).toBeDisabled();await expect(p.locator('#periscope-pulse')).toBeDisabled();
      release();await expect(p.locator('#unit-quiz')).toHaveAttribute('data-ready','true');await expect(p.locator('#periscope-check')).toBeEnabled();
      await p.unroute(pattern);await p.route(pattern,route=>route.abort());await p.reload();await expect(p.locator('#unit-quiz')).toHaveAttribute('data-ready','error');
      await expect(p.locator('#periscope-view-state')).toContainText('未載入');await expect(p.locator('#periscope-feedback')).toContainText('重新整理');await expect(p.locator('#periscope-check')).toBeDisabled();
      await p.locator('#periscope-check').dispatchEvent('click');await expect(p.locator('#unit-quiz')).toHaveAttribute('data-completed','false,false,false');
      await p.unroute(pattern);await p.reload();await expect(p.locator('#unit-quiz')).toHaveAttribute('data-ready','true');await expect(p.locator('#periscope-check')).toBeEnabled();
    }finally{release();await c.close();}
  });
  assert.deepEqual(errors,[],'normal full-page requests and scripts');
});
