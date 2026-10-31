const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');
module.exports=function profileTest({gas,name,english,formula,percent,rank,example}){
 test(`2.3 ${english}: knowledge selected inside composition`,{timeout:180000},async t=>{
  let server,url=process.env.GAS_PROFILE_URL;
  if(!url){
   server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'../..')});
   t.after(()=>server.kill());
   const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server startup timeout')),5000);server.stdout.on('data',b=>{const m=String(b).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1])}});server.once('error',reject)});
   url=`http://127.0.0.1:${port}/units/2/parts/2.3/`;
  }
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--enable-unsafe-swiftshader'],...(process.env.GAS_PROFILE_URL?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});
  t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url())});
  await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  const section=page.locator('#s2'),knowledge=section.locator('#air-gas-knowledge'),profile=knowledge.locator(`[data-gas-profile=${gas}]`),legend=section.locator(`[data-air-gas=${gas}]`);
  const artifacts=process.env.GAS_PROFILE_ARTIFACT_DIR||'/tmp/unit23-composition-knowledge';await fs.mkdir(artifacts,{recursive:true});
  await t.test('default nitrogen and explicit selection show one complete scientific introduction',async()=>{
   assert.equal(await knowledge.getAttribute('data-knowledge-current'),'nitrogen');
   assert.equal(await knowledge.locator('[data-gas-profile]:visible').count(),1);
   await legend.click();assert.equal(await knowledge.getAttribute('data-knowledge-current'),gas);
   assert.equal(await profile.locator('h4').innerText(),name);
   assert.equal(await profile.locator('.gas-profile-english').innerText(),english);
   assert.equal(await profile.locator('.gas-profile-symbol').textContent(),formula);
   assert.equal(await profile.locator('.gas-profile-percent strong').innerText(),percent);
   assert.match(await profile.locator('.gas-profile-percent').innerText(),/約/);
   assert.match(await profile.locator('.gas-profile-basis').innerText(),/全部乾燥空氣/);
   assert.equal(await profile.locator('.gas-profile-rank').innerText(),rank);
   const text=(await profile.innerText()).replace(/\s+/g,'');assert.match(text,/無色、無臭/);
   if(gas==='oxygen'){
    assert.deepEqual(await profile.locator('.gas-profile-property h5').allTextContents(),['外觀','溶水性','燃燒特性']);
    assert.match(text,/不易溶於水/);assert.match(text,/本身不可燃，支持一般燃燒/);assert.doesNotMatch(text,/不支持一般燃燒/);
   }else{
    assert.deepEqual(await profile.locator('.gas-profile-property h5').allTextContents(),['外觀','反應特性','燃燒特性']);
    assert.match(text,/一般條件下，相對不易反應/);assert.match(text,/不可燃，不支持一般燃燒/);
   }
   if(gas!=='argon')assert.equal(await profile.locator('.gas-profile-symbol sub').innerText(),'2');
  });
  await t.test('chart, legend, keyboard confirmation and arrangements select the same knowledge without hover switching',async()=>{
   const other=gas==='oxygen'?'nitrogen':'oxygen';
   await section.locator(`[data-air-gas=${other}]`).hover();assert.equal(await knowledge.getAttribute('data-knowledge-current'),gas);
   await section.locator(`[data-air-gas=${other}]`).focus();assert.equal(await knowledge.getAttribute('data-knowledge-current'),gas);
   await page.keyboard.press('Enter');assert.equal(await knowledge.getAttribute('data-knowledge-current'),other);
   await legend.focus();await page.keyboard.press('Space');assert.equal(await knowledge.getAttribute('data-knowledge-current'),gas);
   for(const view of ['mixed','proportion']){
    await section.locator(`[data-air-view=${view}]`).click();assert.equal(await knowledge.getAttribute('data-knowledge-current'),gas);
    await page.waitForTimeout(450);
    if(gas!=='argon')await section.locator(`.air-share[data-component=${gas}]`).last().click();
    else{await section.locator('.air-share[data-component=minor]').click();assert.equal(await knowledge.getAttribute('data-knowledge-current'),'minor');await section.locator('[data-knowledge-gas=argon]').click()}
    assert.equal(await knowledge.getAttribute('data-knowledge-current'),gas);
    await profile.locator('h4').click();assert.equal(await knowledge.getAttribute('data-knowledge-current'),gas);
    await section.locator('.air-composition-panel').click({position:{x:8,y:8}});assert.equal(await knowledge.getAttribute('data-knowledge-current'),gas);
   }
  });
  await t.test('small life photo follows the introduction and existing lesson format stays intact',async()=>{
   await profile.scrollIntoViewIfNeeded();await profile.locator('img').evaluate(n=>n.decode());
   assert.equal(await profile.locator('.gas-profile-example h6').innerText(),example);
   assert.equal(await profile.locator('img').count(),1);assert.ok((await profile.locator('img').getAttribute('alt')).length>15);
   assert.equal(await profile.locator('img').evaluate(n=>n.complete&&n.naturalWidth>0),true);
   const r=await profile.evaluate(el=>{const props=el.querySelector('.gas-profile-properties').getBoundingClientRect(),life=el.querySelector('.gas-profile-life').getBoundingClientRect(),hero=el.querySelector('.gas-profile-hero').getBoundingClientRect(),photo=el.querySelector('img').getBoundingClientRect();return{ordered:life.top>=props.bottom,intro:props.bottom-hero.top,example:life.height,photo:photo.width,width:el.getBoundingClientRect().width}});
   assert.ok(r.ordered&&r.intro>r.example);assert.ok(r.photo<r.width*.45);
   assert.equal(await profile.locator('button,input,canvas,.dialogue').count(),0);
   for(const who of ['xiaokui','grandpa'])assert.equal(await section.locator(`.dialogue.${who} .speaker`).evaluate(n=>getComputedStyle(n,'::before').backgroundImage.includes('dialogue-character-avatars')),true);
   const retired=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/\/(nitrogen|argon)\.mjs\?/.test(r.name)).map(r=>r.name));assert.deepEqual(retired,[]);
  });
  await t.test('seven widths keep chart, knowledge, classification and all copy inside the shared content column',async()=>{
   await legend.click();
   for(const width of[1440,1280,1024,800,768,390,320]){
    await page.setViewportSize({width,height:1100});await profile.scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width} document overflow`);
    const boxes=await section.evaluate(el=>{const b=el.querySelector('.lesson-body').getBoundingClientRect();return[...el.querySelectorAll('.air-share-grid,.air-legend,.air-classification,[data-gas-profile]:not([hidden]),[data-gas-profile]:not([hidden]) h4,[data-gas-profile]:not([hidden]) .gas-profile-percent,[data-gas-profile]:not([hidden]) .gas-profile-property,[data-gas-profile]:not([hidden]) h6,[data-gas-profile]:not([hidden]) .gas-profile-example-copy p')].map(n=>{const r=n.getBoundingClientRect();return{left:r.left-b.left,right:b.right-r.right,overflow:n.scrollWidth>n.clientWidth+1,text:n.textContent}})});
    for(const b of boxes){assert.ok(b.left>=-1&&b.right>=-1,`${width} column bounds: ${b.text}`);assert.equal(b.overflow,false,`${width} clipped: ${b.text}`)}
    await page.mouse.move(0,0);await page.evaluate(()=>document.activeElement?.blur());
    if([1440,1024,390,320].includes(width))await profile.screenshot({path:path.join(artifacts,`${gas}-${width}.png`)});
    if([1440,390].includes(width))await section.screenshot({path:path.join(artifacts,`composition-${gas}-${width}.png`)});
   }
  });
  await t.test('touch selection and renamed experimental and quiz routes work with reduced motion',async()=>{
   const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
   try{
    await p.goto(url,{waitUntil:'networkidle'});await p.locator('.route a[href="#s2"]').tap();
    await p.locator(`#s2 [data-air-gas=${gas}]`).tap();assert.equal(await p.locator('#air-gas-knowledge').getAttribute('data-knowledge-current'),gas);
    for(const [id,expected] of [['s3','雙氧水'],['s4','大理石'],['s5','氣體介紹']]){
     await p.locator(`.route a[href="#${id}"]`).tap();await p.waitForFunction(id=>document.querySelector('.route a[aria-current]')?.getAttribute('href')===`#${id}`,id);
     assert.match(await p.locator(`#${id} h2`).innerText(),new RegExp(expected));
    }
   }finally{await p.close()}
  });
  await t.test('without JavaScript all three introductions remain readable inside section two',async()=>{
   const p=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
   try{
    await p.goto(url,{waitUntil:'networkidle'});assert.equal(await p.locator('#s2 .gas-profile:visible').count(),3);
    const article=p.locator(`#air-profile-${gas}`);await article.scrollIntoViewIfNeeded();await article.locator('img').evaluate(n=>n.decode());
    assert.equal(await article.locator('.gas-profile-property:visible').count(),3);assert.equal(await article.locator('img').evaluate(n=>n.complete&&n.naturalWidth>0),true);
    assert.equal(await p.locator('.air-knowledge-hint').isVisible(),false);assert.equal(await p.locator('.air-knowledge-choices').isVisible(),false);
    assert.equal(await p.locator('section.lesson').count(),5);
   }finally{await p.close()}
  });
  assert.deepEqual(errors,[]);
 });
};
