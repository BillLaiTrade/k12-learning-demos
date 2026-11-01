const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');

test('4.3 shared lesson format keeps navigation and content usable',{timeout:90000},async t=>{
 let base=process.env.LESSON_BASE_URL;
 if(!base){
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});
  t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',data=>{output+=data;const match=output.match(/port (\d+)/);if(match){clearTimeout(timer);resolve(match[1]);}});server.on('error',reject);});
  base=`http://127.0.0.1:${port}/units/4/parts/4.3/`;
 }
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
 t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('requestfailed',r=>errors.push(r.url()));
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('#depth-scene circle'));
 await t.test('six numbered teaching sections and a separate quiz keep all existing anchors',async()=>{
  assert.equal(await page.locator('.lesson-card').count(),6);
  assert.equal(await page.locator('.lesson-head p').count(),6);
  assert.equal(await page.locator('.unit-quiz').count(),1);
  assert.equal(await page.locator('.unit-quiz .lesson-number').count(),0);
  assert.equal(await page.locator('.quiz-kicker').innerText(),'單元小測');
  assert.equal(await page.locator('form').count(),1);
  assert.equal(await page.locator('.dialogue .speaker').count(),14);
  for(let i=1;i<=7;i++)assert.equal(await page.locator(`#s${i}`).count(),1);
  assert.equal(await page.locator('#unit-quiz').count(),1);
  const image=page.locator('.hero-cover img');await image.evaluate(e=>e.decode());
  assert.equal(await image.evaluate(e=>e.naturalWidth>0),true);
  assert.equal(await page.locator('.brand-row .crumb').innerText(),'國二上・自然科學');
  const ids=await page.locator('[id]').evaluateAll(es=>es.map(e=>e.id));assert.equal(ids.length,new Set(ids).size);
  assert.equal(await page.locator('meta[property="og:image"]').count(),1);
 });
 await t.test('desktop sidebar follows each section and keeps the quiz out of the six-section count',async()=>{
  for(let i=1;i<=7;i++){
   await page.locator(`.route a[href="#s${i}"]`).click();
   await page.waitForFunction(i=>document.querySelector('.route a[aria-current="step"]')?.hash===`#s${i}`,i);
   const expected=i===7?'目前位置：單元小測':`目前位置：第 ${String(i).padStart(2,'0')}／06 個學習區塊`;
   assert.equal(await page.locator('#route-progress').innerText(),expected);
  }
 });
 await t.test('desktop, laptop and narrow screens retain unclipped headings and controls',async()=>{
  const captures=process.env.FORMAT_CAPTURE_DIR;
  if(captures)await fs.mkdir(captures,{recursive:true});
  for(const width of [1440,1366,1024,820,760,390,320]){
   await page.setViewportSize({width,height:width<760?844:1000});
   await page.waitForTimeout(100);
   for(const i of [1,3,6,7]){
    await page.evaluate(i=>{location.hash=`s${i}`;document.querySelector(`#s${i}`).scrollIntoView({block:'start',behavior:'instant'});},i);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.waitForTimeout(100);
    await page.waitForFunction(i=>document.querySelector('.route a[aria-current="step"]')?.hash===`#s${i}`,i);
    const sizes=await page.locator(`#s${i}`).evaluate(el=>{const r=el.getBoundingClientRect(),h=el.querySelector('h2').getBoundingClientRect(),nav=document.querySelector('.route').getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth,card:r.width,left:r.left,right:r.right,headingTop:h.top,headingRight:h.right,navBottom:nav.bottom,navPosition:getComputedStyle(document.querySelector('.route')).position,clipped:[...el.querySelectorAll('.lesson-head p,.quiz-subtitle,button,fieldset label')].some(n=>n.scrollWidth>n.clientWidth+1)};});
    assert.equal(sizes.overflow,false,`${width} page overflow at s${i}`);
    assert.ok(sizes.left>=0&&sizes.right<=width+1,`${width} section bounds at s${i}`);
    assert.equal(sizes.clipped,false,`${width} clipped text at s${i}`);
    assert.ok(sizes.headingRight<=sizes.right,`${width} heading bounds at s${i}`);
    if(width<=760){assert.equal(sizes.navPosition,'sticky');assert.ok(sizes.headingTop>=sizes.navBottom-1,`${width} heading hidden by route at s${i}: ${JSON.stringify(sizes)}`);}
    if(captures&&[1440,1024,390,320].includes(width))await page.screenshot({path:path.join(captures,`${width}-s${i}.png`)});
   }
   if(captures&&[1440,1024,390,320].includes(width)){
    await page.evaluate(()=>{history.replaceState(null,'',location.pathname);scrollTo({top:0,behavior:'instant'});});
    await page.screenshot({path:path.join(captures,`${width}-opening.png`)});
   }
  }
 });
 await t.test('quiz alias and original deep links arrive below the mobile route',async()=>{
  await page.setViewportSize({width:390,height:844});
  for(const hash of ['#unit-quiz','#s7','#s3']){
   await page.goto(base.replace(/#.*$/,'')+hash);
   await page.waitForFunction(()=>document.querySelector('#depth-scene circle'));
   await page.waitForLoadState('networkidle');
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.waitForFunction(hash=>document.querySelector('.route a[aria-current="step"]')?.hash===(hash==='#unit-quiz'?'#s7':hash),hash);
   const r=await page.evaluate(hash=>({heading:document.querySelector(hash==='#unit-quiz'?'#s7 h2':`${hash} h2`).getBoundingClientRect().top,nav:document.querySelector('.route').getBoundingClientRect().bottom}),hash);
   assert.ok(r.heading>=r.nav-1,`${hash} hidden by mobile navigation`);
  }
 });
 assert.deepEqual(errors,[]);
});
