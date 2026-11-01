const{test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),{chromium}=require('playwright');
test('oxygen requested visual and physical corrections',{timeout:180000},async t=>{
 let server,url=process.env.OXYGEN_REVIEW_URL;
 if(!url){server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});t.after(()=>server.kill());const port=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',b=>{const m=String(b).match(/port (\d+)/);if(m){clearTimeout(timeout);resolve(m[1]);}});server.once('error',reject);});url=`http://127.0.0.1:${port}/units/2/parts/2.3/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.OXYGEN_REVIEW_URL?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});t.after(()=>page.close());
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('.oxygen-preparation').dataset.ready==='true');await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
 const root=page.locator('.oxygen-preparation'),active=()=>root.locator('.oxygen-step-panel:visible'),play=root.locator('[data-play]');
 const out=process.env.OXYGEN_REVIEW_ARTIFACT_DIR||'/tmp/unit23-requested-review';await fs.mkdir(out,{recursive:true});const records=[];
 async function choose(i){const tab=root.locator(`#oxygen-tab-${i}`);if(!await tab.isVisible())await root.locator('[data-step-menu]').click();await tab.click();}
 async function contact(){return root.locator('[data-setup-body=jar]').evaluate(jar=>{
  const plate=document.querySelector('[data-setup-body=plate]');
  const at=node=>{const m=node.transform.baseVal.consolidate().matrix;return{x:m.a*111.5+m.c*18+m.e,y:m.b*111.5+m.d*18+m.f};};
  const a=at(jar),b=at(plate);return{jar:a,plate:b,distance:Math.hypot(a.x-b.x,a.y-b.y)};
 });}
 async function finishCaption(){for(let i=0;i<3;i++){await active().locator('[data-scene-note]').evaluate(e=>e.getAnimations().forEach(a=>a.finish()));await page.waitForTimeout(20);}}
 async function shot(name){await finishCaption();await root.locator('.oxygen-stage-area').screenshot({path:path.join(out,name+'.png')});}
 await t.test('glass plate contacts the actual mouth through inversion, submersion, withdrawal and upright storage',async()=>{
  await choose(1);await page.clock.fastForward(10000);let elapsed=10000;
  for(const time of[10000,11000,11400,12400,13500,14800]){await page.clock.fastForward(time-elapsed);elapsed=time;const p=await contact();assert.ok(p.distance<.01,`${time}: ${p.distance}`);}
  await shot('covered-underwater-1440');await choose(7);elapsed=0;
  for(const time of[2200,2600,3300,4000,4900,5600,6500,7600,7800]){
   await page.clock.fastForward(time-elapsed);elapsed=time;const p=await contact();assert.ok(p.distance<.01,`storage ${time}: ${p.distance}`);records.push({time,mouth:p.jar,plate:p.plate});
   if(time>=4200&&time<=5600)assert.ok(p.jar.y<540,'turning only happens after the mouth leaves water');
  }
  const end=await active().getAttribute('data-storage-set-down');assert.equal(end,'1');assert.equal(await root.getAttribute('data-state'),'complete');
  const base=await root.locator('[data-setup-body=jar]').evaluate(e=>{const m=e.transform.baseVal.consolidate().matrix;return{x:m.a*111.5+m.c*414+m.e,y:m.b*111.5+m.d*414+m.f};});
  assert.ok(Math.abs(base.x-1190)<1&&Math.abs(base.y-849)<1,'upright jar must rest on the foreground table');await shot('stored-on-table-1440');
 });
 await t.test('flask liquid and manganese stay inside glass; black solid remains visible on desktop and phone',async()=>{
  for(const width of[1440,390]){
   await page.setViewportSize({width,height:1100});await choose(3);await page.clock.fastForward(2800);await play.click();
   const svg=active().locator('.oxygen-main-scene');await svg.scrollIntoViewIfNeeded();
   const points=await svg.evaluate(e=>{const m=e.getScreenCTM(),r=e.getBoundingClientRect();return[[190,750],[450,740],[450,765],[315,805],[315,770]].map(([x,y])=>({x:Math.round(m.a*x+m.c*y+m.e-r.x),y:Math.round(m.b*x+m.d*y+m.f-r.y)}));});
   const painted=await svg.screenshot();await root.locator('[data-shared-flask-liquid]').evaluate(e=>e.parentElement.style.visibility='hidden');const bare=await svg.screenshot();await root.locator('[data-shared-flask-liquid]').evaluate(e=>e.parentElement.style.visibility='');
   const samples=await page.evaluate(async({a,b,points})=>{async function read(data){const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d');x.drawImage(image,0,0);return points.map(p=>Array.from(x.getImageData(p.x,p.y,1,1).data));}return{painted:await read(a),bare:await read(b)};},{a:painted.toString('base64'),b:bare.toString('base64'),points});
   samples.painted.slice(0,4).forEach((p,i)=>assert.deepEqual(p,samples.bare[i],`${width}/${i}: contents must not paint outside the flask`));
   const solid=samples.painted[4];assert.ok(solid.slice(0,3).every(v=>v<110),`${width}: manganese should be visibly dark`);
   assert.ok(samples.bare[4].slice(0,3).reduce((a,b)=>a+b,0)-solid.slice(0,3).reduce((a,b)=>a+b,0)>80,`${width}: manganese must visibly change the bottle pixels`);
   await shot(`manganese-${width}`);
  }
 });
 await t.test('tube glass retains its diameter while lying on the desk, lifting and connecting',async()=>{
  for(const width of[1440,390,320]){
   await page.setViewportSize({width,height:1100});await choose(1);let at=0;
   for(const time of[0,2000,18000,18800,19600,20800]){
    await page.clock.fastForward(time-at);at=time;
    const size=await active().locator('.oxygen-main-scene').evaluate(svg=>{const p=document.querySelector('[data-shared-tube-path]'),m=p.parentElement.transform.baseVal.consolidate()?.matrix,screen=svg.getScreenCTM();return{diameter:parseFloat(getComputedStyle(p).strokeWidth)*screen.a,sx:m?.a??1,sy:m?.d??1};});
    assert.ok(size.diameter>=2&&size.diameter<=12,`${width}/${time}: visible glass diameter ${size.diameter}`);assert.equal(size.sx,size.sy,'the glass tube must not be flattened');
   }
  }
 });
 await t.test('background beside the flask and below the trough toggles pause and resume instead of opening equipment',async()=>{
  await page.setViewportSize({width:1440,height:1100});await choose(6);await page.clock.fastForward(1500);
  for(const[x,y]of[[195,340],[650,800],[1450,190]]){
   const svg=active().locator('.oxygen-main-scene');await svg.scrollIntoViewIfNeeded();const p=await svg.evaluate((e,{x,y})=>{const m=e.getScreenCTM();return{x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f};},{x,y});
   await page.mouse.click(p.x,p.y);assert.equal(await root.getAttribute('data-state'),'paused');assert.equal(await page.locator('#oxygen-equipment-dialog').isVisible(),false);
   const at=await root.getAttribute('data-elapsed');await page.clock.fastForward(500);assert.equal(await root.getAttribute('data-elapsed'),at);await page.mouse.click(p.x,p.y);assert.equal(await root.getAttribute('data-state'),'playing');
  }
 });
 await t.test('subtitles are prominent, stable and below both main picture and close-up; full collection states its supply condition',async()=>{
  for(const width of[1440,390,320]){
   await page.setViewportSize({width,height:1100});let height;
   for(const[stage,time]of[[1,7000],[3,1300],[6,5200],[7,7800]]){
    await choose(stage);await page.clock.fastForward(time);await finishCaption();
    const strip=active().locator('.oxygen-caption'),a=await strip.boundingBox(),b=await active().locator('.oxygen-drawing').boundingBox();
    assert.ok(a.y>=b.y+b.height-1,'subtitles must never overlap the pictures');assert.equal(await strip.locator('.oxygen-caption-label').innerText(),'畫面說明');
    if(height)assert.ok(Math.abs(a.height-height)<1.5,`${width}: subtitle block should not jump when words change`);height=a.height;
    if(stage===6)assert.match(await active().locator('[data-scene-note]').innerText(),/雙氧水足量/);
    if(stage===7){assert.match(await active().locator('[data-scene-note]').innerText(),/取出並轉正放到桌面/);if(width!==320)await shot(`storage-subtitles-${width}`);}
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  assert.match(await root.locator('.oxygen-model-note').innerText(),/濃度、用量與集氣瓶容量/);
 });
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'contact-measurements.json'),JSON.stringify(records,null,2)+'\n');
});
