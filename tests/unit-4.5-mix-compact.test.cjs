const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require('playwright');
test('4.5第三區：視窗高度、同畫面操作與等比例白幕',{timeout:180000},async t=>{
 let base=process.env.COLOR_URL;
 if(!base){const root=path.resolve(__dirname,'..'),server=http.createServer(async(req,res)=>{try{let file=path.join(root,decodeURI(req.url.split('?')[0]));if((await fs.stat(file)).isDirectory())file+='/index.html';res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'text/html');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end('missing')}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());base=`http://127.0.0.1:${server.address().port}/units/4/parts/4.5/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox'],...(process.env.COLOR_URL?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'}),capture=process.env.COLOR_CAPTURE_DIR||'/tmp/unit45-mix-compact';await fs.mkdir(capture,{recursive:true});
 // The same-size model images isolate CSS layout. Real 3D is covered by the full lesson suite.
 await page.route('**/4.5/assets/{studio,prism-studio,torch-studio}.mjs*',r=>r.abort());
 page.setDefaultTimeout(5000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'#s3');await page.waitForFunction(()=>document.querySelector('#s3 [data-lab]').dataset.ready==='true');await page.evaluate(()=>document.fonts.ready);
 const lab=page.locator('#s3 [data-lab]'),metrics=[];
 const configs=[[1440,900],[1366,768],[1440,650],[1024,768],[1024,650],[820,768],[768,1024],[390,844],[320,700],[390,667],[320,568],[390,480],[844,390]];
 for(const [width,height]of configs)await t.test(`${width}×${height}白幕、三燈及六按鈕同畫面可操作`,async()=>{
  await page.setViewportSize({width,height});await page.locator('.route a[href="#s3"]').click();
  const initial=await page.locator('#s3').evaluate(e=>{const r=e.getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:r.height}});
  if((width>=700&&height>=650)||(width===390&&height===844))assert.ok(initial.bottom<=height-2,`whole card exceeds viewport: ${JSON.stringify(initial)}`);
  await lab.evaluate(e=>{const nav=document.querySelector('.route'),navSpace=getComputedStyle(nav).top==='0px'?nav.getBoundingClientRect().bottom:0;window.scrollBy(0,e.getBoundingClientRect().top-navSpace-8)});
  const before=await page.evaluate(()=>scrollY),measure=await lab.evaluate(e=>{
   const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};
   const screen=e.querySelector('[data-mix]'),r=screen.getBoundingClientRect(),frame=e.querySelector('.mix-screen').getBoundingClientRect();
   return{lab:rect(e),screen:rect(screen),torches:[...e.querySelectorAll('[data-torch]')].map(rect),buttons:[...e.querySelectorAll('[data-torch],[data-preset]')].filter(n=>n.tagName==='BUTTON').map(rect),ratio:r.width/r.height,screenInside:r.x>=frame.x&&r.right<=frame.right&&r.y>=frame.y&&r.bottom<=frame.bottom,deck:rect(e.querySelector('.mix-torch-deck')),controls:rect(e.querySelector('.lab-controls')),overflow:document.documentElement.scrollWidth>innerWidth,internalScroll:[...e.querySelectorAll('*')].some(n=>['auto','scroll'].includes(getComputedStyle(n).overflowY)&&n.scrollHeight>n.clientHeight+1)};
  });
  assert.equal(measure.overflow,false);assert.ok(measure.controls.y>=measure.deck.bottom,'quick comparisons must be below the scene');assert.ok(measure.deck.height<=70,'compact flashlight deck');assert.equal(measure.internalScroll,false);assert.equal(measure.screenInside,true);assert.ok(Math.abs(measure.ratio-1000/560)<.005);assert.ok(measure.screen.height>=70);
  for(const box of[measure.screen,...measure.torches,...measure.buttons]){assert.ok(box.y>=0);assert.ok(box.bottom<=height-2,`operation clipped: ${JSON.stringify(box)}`);}for(const box of measure.torches)assert.ok(box.width>=44&&box.height>=44);
  for(const b of await lab.locator('button[data-torch],button[data-preset]').all()){await b.click();assert.ok(Math.abs(await page.evaluate(()=>scrollY)-before)<1,'clicking requires page scroll');}
  const torch=lab.locator('[data-torch=red]'),box=await torch.boundingBox(),previous=JSON.parse(await lab.getAttribute('data-spots'))[0].x;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+16,box.y+box.height/2-12,{steps:4});await page.mouse.up();assert.ok(JSON.parse(await lab.getAttribute('data-spots'))[0].x>previous);assert.ok(Math.abs(await page.evaluate(()=>scrollY)-before)<1,'dragging requires page scroll');
  // Restore switches and default arrangement for the next viewport.
  for(const key of['red','green','blue']){const b=lab.locator(`[data-torch=${key}]`);if(await b.getAttribute('aria-pressed')==='false')await b.click();}await lab.locator('[data-preset=pairs]').click();
  metrics.push({width,height,initial,...measure});if([[1366,768],[1440,650],[390,844],[320,700],[844,390]].some(([w,h])=>w===width&&h===height)){await page.locator('.route a[href="#s3"]').click();await page.screenshot({path:path.join(capture,`compact-${width}x${height}.png`)});}
 });
 await t.test('模型說明展開正常閱讀，沒有固定卡片高度裁掉內容',async()=>{
  await page.setViewportSize({width:1366,height:768});const details=page.locator('#s3 details'),before=await page.locator('#s3').evaluate(e=>e.getBoundingClientRect().height);await details.evaluate(e=>e.open=true);assert.ok(await page.locator('#s3').evaluate(e=>e.getBoundingClientRect().height)>before+100);assert.match(await details.innerText(),/CIE/);await details.evaluate(e=>e.open=false);assert.deepEqual(errors,[]);
 });
 await fs.writeFile(path.join(capture,'compact-layout.json'),JSON.stringify(metrics,null,2));
});
