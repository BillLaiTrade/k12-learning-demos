const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require('playwright');
test('4.4 十區基本版：真實操作、參考格式與跨尺寸導覽',{timeout:240000},async t=>{
 let base=process.env.LENS_URL;
 if(!base){const root=path.resolve(__dirname,'..'),server=http.createServer(async(req,res)=>{try{let file=path.join(root,decodeURI(req.url.split('?')[0]));if((await fs.stat(file)).isDirectory())file+='/index.html';const ext=path.extname(file);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[ext]||'text/html');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end('missing')}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());base=`http://127.0.0.1:${server.address().port}/units/4/parts/4.4/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.LENS_URL?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 const capture=process.env.LENS_CAPTURE_DIR||'/tmp/unit44-check';await fs.mkdir(capture,{recursive:true});
 await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelectorAll('[data-ready=true]').length===9);
 const lab=i=>page.locator('#lab'+i),result=i=>lab(i).locator('[data-result]');
 async function range(i,key,value){const input=lab(i).locator(`[data-input=${key}]`);await input.fill(String(value));await input.dispatchEvent('input');}
 async function shot(i,name){await page.locator(`.route a[href="#s${i}"]`).click();await page.screenshot({path:path.join(capture,name+'.png')});}
 await t.test('九教學區、一個獨立小測，標題和導覽一致且無重複ID',async()=>{
  assert.equal(await page.locator('.lesson-card').count(),9);assert.equal(await page.locator('.unit-quiz').count(),1);assert.equal(await page.locator('form').count(),1);assert.equal(await page.locator('.unit-quiz fieldset').count(),4);
  for(let i=1;i<=9;i++){assert.equal(await page.locator(`.route a[href="#s${i}"] span`).innerText(),await page.locator(`#s${i}-title`).innerText());assert.equal(await page.locator(`#s${i} .lesson-number`).innerText(),String(i).padStart(2,'0'));assert.equal(await page.locator(`#s${i} > .lesson-body .dialogue`).count(),3);}
  const ids=await page.locator('[id]').evaluateAll(es=>es.map(e=>e.id));assert.equal(ids.length,new Set(ids).size);
  assert.equal(await page.locator('.hero-cover img').evaluate(e=>e.complete&&e.naturalWidth===1672),true);
 });
 await t.test('立體小孔沒有拉霸，屏幕位置與光路可操作',async()=>{
  assert.equal(await lab(1).locator('input[type=range]').count(),0);await lab(1).locator('[data-pinhole-screen]').focus();await page.keyboard.press('End');assert.ok(Number(await lab(1).getAttribute('data-magnification'))>1);await lab(1).locator('[data-pinhole-rays]').click();await lab(1).locator('[data-pinhole-point=top]').click();assert.match(await lab(1).locator('[data-pinhole-status]').innerText(),/上端.*下方/);await lab(1).locator('[data-pinhole-reset]').click();assert.equal(await lab(1).getAttribute('data-screen-x'),'2.6000');await lab(1).locator('[data-pinhole-rays]').click();
 });
 await t.test('平行光會聚／發散及兩表面詳圖連動',async()=>{
  await lab(2).locator('[data-value=concave]').click();assert.match(await result(2).innerText(),/發散/);assert.equal(await lab(2).locator('.extension').count(),2);
  await lab(2).locator('summary').click();assert.equal(await lab(2).locator('[data-surface] svg').isVisible(),true);const original=await lab(2).locator('[data-surface] svg').innerHTML();await lab(2).locator('[data-value=convex]').click();assert.notEqual(await lab(2).locator('[data-surface] svg').innerHTML(),original);assert.match(await result(2).innerText(),/會聚/);await shot(2,'surfaces-desktop');
 });
 await t.test('調焦會實際縮小光斑；上端／下端光束不混成一點',async()=>{
  assert.match(await result(3).innerText(),/尚未對焦/);await range(3,'screen',145);assert.match(await result(3).innerText(),/已對焦.*縮小/);assert.equal(await lab(3).locator('[data-image] feGaussianBlur').getAttribute('stdDeviation'),'0');
  const paths=await lab(3).locator('.light-ray').evaluateAll(es=>es.map(e=>({d:e.getAttribute('d'),stroke:e.getAttribute('stroke')})));const ends=paths.filter((_,i)=>i%2===1).map(p=>Number(p.d.split(' ').at(-1)));assert.ok(ends.slice(0,3).every(y=>y>180));assert.ok(ends.slice(3).every(y=>y<180));
  await lab(3).locator('[data-action=reset]').click();assert.match(await result(3).innerText(),/尚未對焦/);
 });
 await t.test('物距變化不自動搬屏幕；只記錄清楚像並處理焦點邊界',async()=>{
  assert.equal(await lab(4).locator('[data-action=record]').isDisabled(),true);
  for(const [u,v]of[[320,145],[200,200],[150,300]]){await range(4,'object',u);assert.equal(await lab(4).locator('[data-input=screen]').inputValue(),u===320?'240':u===200?'145':'200');await range(4,'screen',v);await lab(4).locator('[data-action=record]').click();}
  assert.equal(await lab(4).locator('[data-records]>div').count(),3);assert.match(await lab(4).locator('[data-records]').innerText(),/縮小[\s\S]*等大[\s\S]*放大/);
  await range(4,'object',100);assert.match(await result(4).innerText(),/有限距離/);assert.equal(await lab(4).locator('[data-action=record]').isDisabled(),true);assert.equal(await lab(4).locator('[data-scene]').innerHTML().then(s=>/NaN|Infinity/.test(s)),false);await shot(4,'focus-boundary');await lab(4).locator('[data-action=reset]').click();assert.equal(await lab(4).locator('[data-records]>div').count(),0);
 });
 await t.test('放大鏡觀察與屏幕比較分開，虛線切換不改變像',async()=>{
  assert.match(await result(5).innerText(),/正立.*放大.*虛像/);assert.ok(await lab(5).locator('.extension').count()>0);await lab(5).locator('[data-toggle=extensions]').uncheck();assert.equal(await lab(5).locator('.extension').count(),0);
  await lab(5).locator('[data-value=screen]').click();await range(5,'screen',350);assert.match(await result(5).innerText(),/無法直接/);assert.match(await lab(5).locator('[data-image]').innerText(),/沒有清楚投影/);await lab(5).locator('[data-value=eye]').click();await range(5,'object',90);assert.match(await result(5).innerText(),/超出/);await shot(5,'magnifier');
 });
 await t.test('同位置換鏡片，讀值／像／單一選取狀態同步',async()=>{
  await range(6,'object',160);assert.match(await result(6).innerText(),/正立.*縮小.*虛像/);await lab(6).locator('[data-value=convex]').click();assert.match(await result(6).innerText(),/倒立.*放大.*實像/);assert.equal(await lab(6).locator('[data-input=object]').inputValue(),'160');await range(6,'object',100);assert.match(await result(6).innerText(),/有限距離/);await lab(6).locator('[data-action=reset]').click();assert.match(await result(6).innerText(),/縮小/);
 });
 await t.test('遠近切換保留視網膜，調節後恢復清楚像',async()=>{
  const before=await lab(7).locator('[data-scene]').innerHTML();await lab(7).locator('[data-value=near]').click();assert.match(await result(7).innerText(),/視網膜後/);await lab(7).locator('[data-action=accommodate]').click();assert.match(await result(7).innerText(),/清楚/);assert.match(await lab(7).locator('[data-adjust]').innerText(),/較厚/);assert.notEqual(await lab(7).locator('[data-scene]').innerHTML(),before);await shot(7,'near-accommodation');
 });
 await t.test('近視／遠視比較與兩段矯正光路，切模型撤除舊鏡片',async()=>{
  await lab(8).locator('[data-value=myopia]').click();assert.match(await result(8).innerText(),/視網膜前/);await lab(8).locator('[data-value=hyperopia]').click();assert.match(await result(8).innerText(),/視網膜後/);
  await lab(9).locator('[data-action=correct]').click();assert.match(await result(9).innerText(),/清楚/);await lab(9).locator('[data-value=hyperopia]').click();assert.equal(await lab(9).locator('[data-action=correct]').getAttribute('aria-pressed'),'false');assert.match(await result(9).innerText(),/視網膜後/);await lab(9).locator('[data-action=correct]').click();assert.match(await result(9).innerText(),/清楚/);await shot(9,'glasses-correction');
 });
 await t.test('顯微鏡的物鏡／目鏡／合看連動及第九區重設',async()=>{
  await page.locator('[data-value=eyepiece]').click();assert.match(await page.locator('#micro-result').innerText(),/目鏡焦距內/);assert.ok(await page.locator('#microscope-scene .extension').count()>0);await page.locator('[data-value=both][data-set=micro]').click();assert.match(await page.locator('#micro-result').innerText(),/接力/);await lab(9).locator('[data-action=reset]').click();assert.equal(await page.locator('[data-value=objective]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#microscope-scene .extension').count(),0);
 });
 await t.test('唯一小測：漏答、錯答回看、修改清除、全對與重填',async()=>{
  await page.locator('#quiz button[type=submit]').click();assert.match(await page.locator('#quiz-result').innerText(),/未作答/);for(let i=1;i<=4;i++)await page.locator(`[name=q${i}][value="0"]`).check();await page.locator('#quiz button[type=submit]').click();assert.equal(await page.locator('#quiz-result a').count(),3);for(const[i,v]of['1','0','2','1'].entries())await page.locator(`[name=q${i+1}][value="${v}"]`).check();assert.equal(await page.locator('#quiz-result').innerText(),'');await page.locator('#quiz button[type=submit]').click();assert.match(await page.locator('#quiz-result').innerText(),/四題都答對/);await shot(10,'quiz-correct');await page.locator('#quiz button[type=reset]').click();assert.equal(await page.locator('#quiz input:checked').count(),0);assert.equal(await page.locator('#quiz-result').innerText(),'');
 });
 await t.test('與 2.2 共用的排版數值及人物素材一致',async()=>{
  const style=async p=>p.evaluate(()=>{const r=s=>{const e=document.querySelector(s),c=getComputedStyle(e);return {padding:c.padding,gap:c.gap,fontSize:c.fontSize,borderRadius:c.borderRadius}};return{shell:document.querySelector('.shell').getBoundingClientRect().width,layout:r('.lesson-layout'),head:r('.lesson-head'),body:r('.lesson-body'),title:r('.lesson-head h2'),dialogue:r('.dialogue'),avatar:getComputedStyle(document.querySelector('.speaker'),'::before').backgroundImage.split('?')[0].split('/').at(-1)}});
  const ref=await context.newPage();await ref.goto(new URL('../../../2/parts/2.2/',base).href,{waitUntil:'domcontentloaded'});assert.deepEqual(await style(page),await style(ref));await ref.close();await page.bringToFront();
 });
 const measurements=[];
 for(const width of [1440,1366,1024,820,760,390,320])await t.test(`${width}px 十區標頭、滿寬內容、導覽與文字未遮擋`,async()=>{
  await page.setViewportSize({width,height:width<760?844:1000});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  for(let i=1;i<=10;i++){
   await page.locator(`.route a[href="#s${i}"]`).click();await page.waitForFunction(i=>document.querySelector('.route a[aria-current=step]')?.hash==='#s'+i,i);
   if(width<=760)await page.waitForFunction(i=>{const t=document.querySelector('#s'+i+' h2').getBoundingClientRect(),n=document.querySelector('.route').getBoundingClientRect();return t.top>=n.bottom-1},i);
   const data=await page.locator('#s'+i).evaluate(e=>{const c=e.getBoundingClientRect(),h=e.querySelector('.lesson-head,.quiz-head').getBoundingClientRect(),b=e.querySelector('.lesson-body,.quiz-body').getBoundingClientRect(),title=e.querySelector('h2').getBoundingClientRect(),nav=document.querySelector('.route').getBoundingClientRect();return{pageOverflow:document.documentElement.scrollWidth>innerWidth,left:c.left,right:c.right,headWidth:h.width,bodyWidth:b.width,headBottom:h.bottom,bodyTop:b.top,headingTop:title.top,navBottom:nav.bottom,clipped:[...e.querySelectorAll('h2,.lesson-head p,.quiz-subtitle,button,label')].filter(n=>n.scrollWidth>n.clientWidth+2).map(n=>n.textContent.trim()),active:document.querySelector('.route a[aria-current=step]')?.hash,progress:document.querySelector('#route-progress').textContent}});
   measurements.push({width,i,...data});assert.equal(data.pageOverflow,false);assert.ok(data.left>=0&&data.right<=width+1);assert.ok(Math.abs(data.headWidth-data.bodyWidth)<1);assert.ok(data.bodyTop>=data.headBottom);assert.deepEqual(data.clipped,[]);assert.equal(data.active,'#s'+i);if(width<=760)assert.ok(data.headingTop>=data.navBottom-1,`${width} s${i} hidden heading`);
  }
  if([1440,1024,390,320].includes(width))await shot(1,`s1-${width}`);
 });
 await fs.writeFile(path.join(capture,'layout.json'),JSON.stringify(measurements,null,2));
 await t.test('初始深連結、鍵盤及原生觸控都可操作',async()=>{
  await page.goto(base+'#s6');await page.waitForFunction(()=>document.querySelector('.route a[aria-current=step]')?.hash==='#s6');assert.match(await page.locator('#route-progress').innerText(),/06／09/);
  await page.locator('#lab6 [data-drag=object]').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#lab6 [data-input=object]').inputValue(),'40');await page.keyboard.press('End');assert.equal(await page.locator('#lab6 [data-input=object]').inputValue(),'350');
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const mp=await mobile.newPage();await mp.goto(base+'#s5');await mp.locator('#lab5 [data-value=screen]').tap();assert.match(await mp.locator('#lab5 [data-result]').innerText(),/無法直接/);await mp.locator('.route a[href="#s10"]').tap();await mp.waitForFunction(()=>document.querySelector('.route a[aria-current=step]')?.hash==='#s10');assert.equal(await mp.locator('#route-progress').innerText(),'目前位置：單元小測');await mp.screenshot({path:path.join(capture,'touch-quiz.png')});await mobile.close();
 });
 await t.test('十個導覽、屏幕鍵盤操作與虛像入眼光束',async()=>{
  await page.setViewportSize({width:1440,height:1000});await page.bringToFront();
  for(let i=1;i<=10;i++){await page.locator(`.route a[href="#s${i}"]`).click();await page.waitForFunction(i=>document.querySelector('.route a[aria-current=step]')?.hash==='#s'+i,i);}
  await page.locator('.route a[href="#s1"]').click();await lab(1).locator('[data-pinhole-reset]').click();await lab(1).locator('[data-pinhole-screen]').focus();await page.keyboard.press('ArrowRight');assert.ok(Number(await lab(1).getAttribute('data-screen-x'))>2.6);
  await lab(5).locator('[data-action=reset]').click();const ends=await lab(5).locator('.light-ray').evaluateAll(es=>es.filter((_,i)=>i%2===1).map(e=>e.getAttribute('d').match(/L([\d.-]+) ([\d.-]+)/).slice(1).map(Number)));assert.equal(ends.length,6);for(const[x,y]of ends){assert.equal(x,580);assert.ok(Math.abs(y-180)<=6.01);}
 });
 await t.test('素材、有效入口、內部連結及瀏覽器錯誤',async()=>{
  assert.equal(await page.locator('a[href^="#"]').evaluateAll(as=>as.filter(a=>!document.getElementById(a.hash.slice(1))).length),0);
  for(const link of ['../../','../4.3/']){const r=await context.request.get(new URL(link,base).href);assert.equal(r.status(),200)}
  const entry=await context.request.get(new URL('../../',base).href);assert.match(await entry.text(),/parts\/4\.4\/index.html/);assert.deepEqual(errors,[]);
 });
});
