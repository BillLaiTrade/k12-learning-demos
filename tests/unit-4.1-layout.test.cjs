const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');
const {expect}=require('playwright/test');

const root=path.resolve(__dirname,'..');
const titles=['為什麼我們看得見東西？','今晚，哪些光讓小葵看得見？','光是怎麼前進的？','影子怎麼形成？','影子的大小如何改變？','光傳得有多快？'];
const sizes=[[1440,900],[1366,768],[1024,768],[768,1024],[390,844],[320,740]];

test('4.1：六區頂部標頭、滿寬內容及原有操作',{timeout:360000},async t=>{
 let base=process.env.LIGHT_LAYOUT_URL;
 if(!base){
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:root,stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{
   let output='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);
   server.stdout.on('data',data=>{output+=data;const m=output.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});
   server.on('error',reject);
  });
  base=`http://127.0.0.1:${port}/units/4/parts/4.1/`;
 }
 const remote=new URL(base).hostname!=='127.0.0.1';
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(remote&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}}:{})});
 t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
 const errors=[],failed=[],measurements=[];let mobileAnchor;
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push(r.url()));
 page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
 await page.goto(base,{waitUntil:'networkidle'});
 if(process.env.LIGHT_LAYOUT_CAPTURE_DIR)await fs.mkdir(process.env.LIGHT_LAYOUT_CAPTURE_DIR,{recursive:true});
 await t.test('原六區ID、導覽錨點、編號與主標題各出現一次',async()=>{
  const state=await page.evaluate(()=>({cards:[...document.querySelectorAll('.lesson-card')].map(c=>({id:c.id,title:c.querySelector('.lesson-head h2').textContent,headingCount:c.querySelectorAll('h2').length,number:c.querySelector('.lesson-number').textContent,subtitle:c.querySelector('.lesson-head p').textContent})),oldColumns:document.querySelectorAll('.card-side,.card-number').length,links:[...document.querySelectorAll('.route a')].map(a=>a.getAttribute('href')),ids:[...document.querySelectorAll('[id]')].map(n=>n.id)}));
  assert.equal(state.cards.length,6);assert.equal(state.oldColumns,0);
  state.cards.forEach((card,i)=>{assert.equal(card.id,`card-0${i+1}`);assert.equal(card.title,titles[i]);assert.equal(card.headingCount,1);assert.equal(card.number,`0${i+1}`);assert.ok(card.subtitle.trim());assert.equal(state.links.filter(h=>h===`#${card.id}`).length,1);});
  assert.ok(state.links.includes('#unit-booklet'));assert.equal(new Set(state.ids).size,state.ids.length);
 });
 for(const [width,height]of sizes)await t.test(`${width}×${height}：六區上下排列、內容滿寬、文字與操作不溢出`,async()=>{
  await page.setViewportSize({width,height});
  const cards=await page.locator('.lesson-card').evaluateAll(els=>els.map(el=>{
    const head=el.querySelector('.lesson-head'),body=el.querySelector('.lesson-body'),a=el.getBoundingClientRect(),b=head.getBoundingClientRect(),c=body.getBoundingClientRect();
    const overflow=[...el.querySelectorAll('h2,.lesson-head p,button,input,canvas,img')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.height&&(r.left<a.left-1||r.right>a.right+1||n.scrollWidth>n.clientWidth+2);}).map(n=>n.id||n.className||n.tagName);
    return{id:el.id,cardWidth:a.width,headWidth:b.width,bodyWidth:c.width,headX:b.left,bodyX:c.left,headBottom:b.bottom,bodyTop:c.top,headRightBorder:getComputedStyle(head).borderRightWidth,bodyLeftBorder:getComputedStyle(body).borderLeftWidth,overflow,pageWidth:document.documentElement.scrollWidth,viewport:innerWidth};
  }));
  for(const m of cards){
   assert.ok(m.headBottom<=m.bodyTop+1,JSON.stringify(m));
   assert.ok(Math.abs(m.headX-m.bodyX)<1&&Math.abs(m.headWidth-m.bodyWidth)<1,JSON.stringify(m));
   assert.ok(m.bodyWidth>=m.cardWidth-3,JSON.stringify(m));
   assert.equal(m.headRightBorder,'0px');assert.equal(m.bodyLeftBorder,'0px');
   assert.deepEqual(m.overflow,[],JSON.stringify(m));assert.ok(m.pageWidth<=m.viewport,JSON.stringify(m));
   measurements.push({width,height,...m});
   if(process.env.LIGHT_LAYOUT_CAPTURE_DIR&&[1440,390].includes(width)&&['card-01','card-06'].includes(m.id))await page.locator(`#${m.id}`).screenshot({path:path.join(process.env.LIGHT_LAYOUT_CAPTURE_DIR,`${m.id}-${width}.png`)});
  }
 });
 await t.test('編號與標頭間距比照2.2，外側導覽仍在卡片之外',async()=>{
  await page.setViewportSize({width:1440,height:900});
  const read=page=>page.locator('.lesson-head').first().evaluate(el=>{
   const h=getComputedStyle(el),n=getComputedStyle(el.querySelector('.lesson-number'));
   return{columns:h.gridTemplateColumns.split(' ')[0],gap:h.columnGap,padding:h.padding,numberWidth:n.width,numberHeight:n.height,numberBackground:n.backgroundColor};
  });
  const actual=await read(page),reference=await context.newPage();
  await reference.route('**/*',route=>route.request().resourceType()==='script'?route.fulfill({contentType:'text/javascript',body:''}):route.continue());
  await reference.goto(new URL('../../../2/parts/2.2/',base).href,{waitUntil:'domcontentloaded'});
  assert.deepEqual(actual,await read(reference));await reference.close();
  assert.equal(await page.locator('.lesson-card .route').count(),0);
  await page.locator('.route a[href="#card-06"]').click();await expect(page).toHaveURL(/#card-06$/);
  await page.setViewportSize({width:390,height:844});await page.locator('.route a[href="#card-03"]').click();
  await expect.poll(async()=>{
   mobileAnchor=await page.evaluate(()=>({headTop:document.querySelector('#card-03 .lesson-head').getBoundingClientRect().top,routeBottom:document.querySelector('.route').getBoundingClientRect().bottom}));
   return mobileAnchor.headTop>=mobileAnchor.routeBottom+2&&mobileAnchor.headTop<422;
  }).toBeTruthy();
  if(process.env.LIGHT_LAYOUT_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.LIGHT_LAYOUT_CAPTURE_DIR,'anchor-390.png')});
 });
 await t.test('桌機與觸控：燈光、遮擋球、影子大小、計時及小測仍可操作',async()=>{
  await page.close();
  for(const mobile of [false,true]){
   const c=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1366,height:768},isMobile:mobile,hasTouch:mobile}),p=await c.newPage();
   try{
    p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/assets/shadow-size-3d.js*',async route=>{
     const response=await route.fetch(),source=await response.text();assert.ok(source.includes('const minPosition = 0;'));
     await route.fulfill({response,body:source.replace('const minPosition = 0;','window.__shadowSizeLayoutTest={camera,sphere,blocker}; const minPosition = 0;')});
    });
    await p.goto(base,{waitUntil:'networkidle'});
    const click=selector=>mobile?p.locator(selector).tap():p.locator(selector).click();
    await click('#lamp-toggle');await expect(p.locator('#lamp-toggle')).toHaveAttribute('aria-pressed','false');await expect(p.locator('#night-feedback')).toContainText('關掉檯燈後');
    await click('#moonlight-toggle');await expect(p.locator('#moonlight-toggle')).toHaveAttribute('aria-pressed','false');
    await p.locator('#shadow-block-toggle').scrollIntoViewIfNeeded();await expect(p.locator('#shadow-block-toggle')).toBeEnabled({timeout:45000});
    await click('#shadow-block-toggle');await expect(p.locator('#shadow-block-toggle')).toHaveAttribute('aria-pressed','true');
    await click('#shadow-block-toggle');await expect(p.locator('#shadow-block-toggle')).toHaveAttribute('aria-pressed','false');
    await p.locator('#shadow-size-3d-scene').scrollIntoViewIfNeeded();await expect(p.locator('#shadow-size-view-reset')).toBeEnabled({timeout:45000});
    await p.waitForFunction(()=>!!window.__shadowSizeLayoutTest);
    await p.locator('#shadow-size-3d-scene').evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
    const points=await p.evaluate(()=>{
     const {camera,sphere,blocker}=window.__shadowSizeLayoutTest,r=document.querySelector('#shadow-size-3d-scene').getBoundingClientRect();
     camera.updateMatrixWorld(true);const a=sphere.getWorldPosition(sphere.position.clone()),b=a.clone();b.z+=.8;
     const pixel=v=>{v.project(camera);return{x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};};
     return{a:pixel(a),b:pixel(b),z:blocker.position.z};
    });
    if(mobile){
     const cdp=await c.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...points.a,id:1}]});
     for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:points.a.x+(points.b.x-points.a.x)*i/6,y:points.a.y+(points.b.y-points.a.y)*i/6,id:1}]});
     await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }else{await p.mouse.move(points.a.x,points.a.y);await p.mouse.down();await p.mouse.move(points.b.x,points.b.y,{steps:6});await p.mouse.up();}
    assert.ok(Math.abs(await p.evaluate(()=>window.__shadowSizeLayoutTest.blocker.position.z)-points.z)>.2,'球體沿導軌實際移動');await click('#shadow-size-view-reset');
    assert.equal(await p.locator('[data-scene-failed="true"]').count(),0);
    await click('#light-speed-tap');await p.waitForTimeout(120);await click('#light-speed-tap');await expect(p.locator('#light-speed-tap')).toHaveAttribute('data-phase','result');await expect(p.locator('#light-distance')).not.toHaveText('— 公里');
    await p.locator('#unit-booklet').scrollIntoViewIfNeeded();await expect(p.locator('#shadow-theatre-reset')).toBeEnabled({timeout:45000});await click('[data-prop-select="moon"]');await expect(p.locator('[data-prop-select="moon"]')).toHaveAttribute('aria-pressed','true');await click('#shadow-theatre-reset');
   }finally{await c.close();}
  }
 });
 await t.test('頁面沒有程式錯誤或載入失敗',()=>{assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);});
 if(process.env.LIGHT_LAYOUT_CAPTURE_DIR)await fs.writeFile(path.join(process.env.LIGHT_LAYOUT_CAPTURE_DIR,'layout.json'),JSON.stringify({base,measurements,mobileAnchor,errors,failed},null,2)+'\n');
});
