const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require('playwright');
test('4.4 十區整合版：獨立透鏡、共用成像台及跨尺寸導覽',{timeout:480000},async t=>{
 let base=process.env.LENS_URL;
 if(!base){const root=path.resolve(__dirname,'..'),server=http.createServer(async(req,res)=>{try{let file=path.join(root,decodeURI(req.url.split('?')[0]));if((await fs.stat(file)).isDirectory())file+='/index.html';const ext=path.extname(file);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[ext]||'text/html');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end('missing')}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());base=`http://127.0.0.1:${server.address().port}/units/4/parts/4.4/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.LENS_URL?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 context.setDefaultNavigationTimeout(process.env.LENS_URL?90000:30000);
 const capture=process.env.LENS_CAPTURE_DIR||'/tmp/unit44-check';await fs.mkdir(capture,{recursive:true});
 await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelectorAll('[data-ready=true]').length===9);
 async function closeWorkspace(){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.evaluate(()=>{const d=document.querySelector('#imaging-workspace-dialog');if(d?.open)d.close();});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
 t.afterEach(closeWorkspace);
 const scenario=(name,fn)=>t.test(name,{skip:process.env.LENS_ONLY_RECHECK==='1'&&!/^(與 2.2|初始深連結)/.test(name)},fn);
 const lab=i=>page.locator('#lab'+i),result=i=>lab(i).locator('[data-result]');
 async function range(i,key,value){const input=lab(i).locator(`[data-input=${key}]`);await input.fill(String(value));await input.dispatchEvent('input');}
 async function shot(i,name){await closeWorkspace();await page.locator(`.route a[href="#s${i}"]`).click();await page.screenshot({path:path.join(capture,name+'.png')});}
 await scenario('九教學區、一個獨立小測，標題和導覽一致且無重複ID',async()=>{
  assert.equal(await page.locator('.lesson-card').count(),9);assert.equal(await page.locator('.unit-quiz').count(),1);assert.equal(await page.locator('form').count(),1);assert.equal(await page.locator('.unit-quiz fieldset').count(),4);
  for(let i=1;i<=9;i++){assert.equal(await page.locator(`.route a[href="#s${i}"] span`).innerText(),await page.locator(`#s${i}-title`).innerText());assert.equal(await page.locator(`#s${i} .lesson-number`).innerText(),String(i).padStart(2,'0'));assert.equal(await page.locator(`#s${i} > .lesson-body .dialogue`).count(),3);}
  const ids=await page.locator('[id]').evaluateAll(es=>es.map(e=>e.id));assert.equal(ids.length,new Set(ids).size);
  assert.equal(await page.locator('.hero-cover img').evaluate(e=>e.complete&&e.naturalWidth===1672),true);
 });
 await scenario('立體小孔沒有拉霸，屏幕位置與光路可操作',async()=>{
  assert.equal(await lab(1).locator('input[type=range]').count(),0);await lab(1).locator('[data-pinhole-screen]').focus();await page.keyboard.press('End');assert.ok(Number(await lab(1).getAttribute('data-magnification'))>1);await lab(1).locator('[data-pinhole-rays]').click();await lab(1).locator('[data-pinhole-point=top]').click();assert.match(await lab(1).locator('[data-pinhole-status]').innerText(),/上端.*下方/);assert.equal(await lab(1).locator('[data-pinhole-reset],[data-pinhole-home]').count(),0);await lab(1).locator('[data-pinhole-rays]').click();
 });
 await scenario('凸／凹透鏡分區，光路與同片鏡片兩次折射近看可操作',async()=>{
  const convex=lab(2),concave=page.locator('#concave-rays');assert.equal(await page.locator('#s2 [data-value=concave]').count(),0);assert.equal(await page.locator('#s5 [data-value=convex]').count(),0);
  for(const [root,kind]of [[convex,'convex'],[concave,'concave']]){assert.match(await root.locator('[data-result]').innerText(),kind==='convex'?/會聚/:/發散/);const lens=root.locator('[data-lens-boundary]'),a=Number(await lens.getAttribute('data-center-thickness')),b=Number(await lens.getAttribute('data-edge-thickness'));assert.ok(kind==='convex'?a>b:a<b);await root.locator('[data-parallel-close]').click();assert.equal(await root.getAttribute('data-view'),'surface');const contrast=await root.locator('[data-parallel-close]').evaluate(e=>{const s=getComputedStyle(e),lum=c=>c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0),a=lum(s.color),b=lum(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)});assert.ok(contrast>=4.5);assert.equal(await root.locator('[data-interface]').count(),2);await root.screenshot({path:path.join(capture,kind+'-surface.png')});await root.locator('[data-parallel-close]').click();await root.locator('[data-parallel-rays]').click();assert.equal(await root.locator('[data-ray-part]').count(),0);await root.locator('[data-parallel-rays]').click();}
  assert.equal(await concave.locator('[data-virtual-extension]').count(),0);await concave.locator('[data-parallel-extensions]').click();assert.equal(await concave.locator('[data-virtual-extension]').count(),2);await shot(5,'concave-parallel');await shot(2,'convex-parallel');
 });
 await scenario('立體成像台載入即對焦，圖卡與屏幕皆可直接操作且沒有模式切換',async()=>{
  assert.equal(await page.locator('#lab3').count(),0);assert.equal(await lab(4).locator('[data-imaging-mode]').count(),0);assert.equal(await lab(4).locator('[data-imaging-device=object]').isDisabled(),false);assert.equal(await lab(4).locator('[data-imaging-record]').count(),0);assert.equal(await lab(4).locator('[data-imaging-keypoint]').count(),6);assert.equal(await lab(4).locator('input[type=range]').count(),0);
  assert.match(await result(4).innerText(),/已對焦/);assert.equal(await lab(4).getAttribute('data-screen'),'145.5');await lab(4).locator('[data-imaging-device=screen]').focus();await page.keyboard.press('Home');assert.equal(await lab(4).getAttribute('data-screen'),'50');assert.equal(await lab(4).getAttribute('data-rays'),'true');await lab(4).locator('[data-imaging-point=top]').click();assert.match(await result(4).innerText(),/上端.*下方/);await shot(3,'focus-stage');
 });
 await scenario('物距變化不搬屏幕，兩把尺保持可用，觀察重點同步對焦',async()=>{
  assert.equal(await lab(4).locator('[data-imaging-expand]').count(),0);assert.equal(await page.locator('#s3 #lab4').count(),1);
  assert.equal(await lab(4).locator('[data-imaging-device=object]').isDisabled(),false);assert.equal(await lab(4).locator('[data-imaging-record]').count(),0);
  await lab(4).locator('[data-imaging-ruler-track=object] [data-imaging-ruler-mark="200"]').click();assert.equal(await lab(4).getAttribute('data-object'),'200');assert.equal(await lab(4).getAttribute('data-screen'),'50');assert.equal(await lab(4).getAttribute('data-object'),'200');await lab(4).locator('[data-imaging-device=object]').focus();await page.keyboard.press('Home');assert.match(await result(4).innerText(),/正立.*放大.*屏幕接不到/);assert.equal(await lab(4).locator('[data-imaging-record]').count(),0);await lab(4).locator('[data-imaging-keypoint=double] button').click();assert.equal(await lab(4).getAttribute('data-object'),'200');assert.equal(await lab(4).getAttribute('data-screen'),'200');assert.match(await result(4).innerText(),/已對焦.*等大/);await shot(3,'focus-boundary');
 });
 await scenario('放大鏡固定眼睛視角與立體器材同步，屏幕比較保留物距',async()=>{
  assert.match(await result(5).innerText(),/正立.*放大.*虛像/);assert.equal(await lab(5).locator('input[type=range]').count(),1);const size=await lab(5).getAttribute('data-image-scale');await lab(5).locator('[data-mag-extensions]').click();assert.equal(await lab(5).getAttribute('data-extensions'),'true');assert.equal(await lab(5).getAttribute('data-image-scale'),size);await lab(5).locator('[data-mag-rays]').click();assert.equal(await lab(5).getAttribute('data-extensions'),'false');
  await lab(5).locator('[data-mag-screen]').click();assert.match(await result(5).innerText(),/無法直接/);assert.match(await lab(5).locator('[data-mag-eye-badge]').innerText(),/擋住/);await lab(5).locator('[data-mag-screen]').click();await lab(5).locator('[data-mag-device=object]').focus();await page.keyboard.press('End');assert.equal(await lab(5).getAttribute('data-object'),'200');assert.notEqual(await lab(5).getAttribute('data-image-scale'),size);await shot(4,'magnifier');
 });
 await scenario('同位置換鏡片，讀值／像／單一選取狀態同步',async()=>{
  await range(6,'object',160);assert.match(await result(6).innerText(),/正立.*縮小.*虛像/);await lab(6).locator('[data-value=convex]').click();assert.match(await result(6).innerText(),/倒立.*放大.*實像/);assert.equal(await lab(6).locator('[data-input=object]').inputValue(),'160');await range(6,'object',100);assert.match(await result(6).innerText(),/有限距離/);await lab(6).locator('[data-action=reset]').click();assert.match(await result(6).innerText(),/縮小/);
 });
 await scenario('遠近切換保留視網膜，調節後恢復清楚像',async()=>{
  const before=await lab(7).locator('[data-scene]').innerHTML();await lab(7).locator('[data-value=near]').click();assert.match(await result(7).innerText(),/視網膜後/);await lab(7).locator('[data-action=accommodate]').click();assert.match(await result(7).innerText(),/清楚/);assert.match(await lab(7).locator('[data-adjust]').innerText(),/較厚/);assert.notEqual(await lab(7).locator('[data-scene]').innerHTML(),before);await shot(7,'near-accommodation');
 });
 await scenario('近視／遠視與眼鏡矯正共用同一眼睛，切模型撤除舊鏡片',async()=>{
  assert.equal(await page.locator('#lab9').count(),0);assert.equal(await lab(8).locator('[data-action=correct]').isDisabled(),true);
  const retina=()=>lab(8).locator('[data-scene]').evaluate(e=>[...e.querySelectorAll('path')].find(p=>p.getAttribute('stroke-width')==='7')?.getAttribute('d'));const fixed=await retina();
  await lab(8).locator('[data-value=myopia]').click();assert.match(await result(8).innerText(),/視網膜前/);await lab(8).locator('[data-action=correct]').click();assert.match(await result(8).innerText(),/清楚/);assert.match(await lab(8).locator('[data-scene]').innerHTML(),/凹透鏡矯正/);
  await lab(8).locator('[data-value=hyperopia]').click();assert.equal(await lab(8).locator('[data-action=correct]').getAttribute('aria-pressed'),'false');assert.match(await result(8).innerText(),/視網膜後/);await lab(8).locator('[data-action=correct]').click();assert.match(await result(8).innerText(),/清楚/);assert.match(await lab(8).locator('[data-scene]').innerHTML(),/凸透鏡矯正/);assert.equal(await retina(),fixed);await shot(8,'glasses-correction');
  await lab(8).locator('[data-value=normal]').click();assert.equal(await lab(8).locator('[data-action=correct]').isDisabled(),true);assert.equal(await lab(8).locator('[data-action=correct]').getAttribute('aria-pressed'),'false');assert.match(await result(8).innerText(),/清楚/);
 });
 await scenario('顯微鏡獨立成區，物鏡／目鏡／合看與自身重設連動',async()=>{
  await page.locator('[data-value=eyepiece]').click();assert.match(await page.locator('#micro-result').innerText(),/目鏡焦距內/);assert.ok(await page.locator('#microscope-scene .extension').count()>0);await page.locator('[data-value=both][data-set=micro]').click();assert.match(await page.locator('#micro-result').innerText(),/接力/);await page.locator('[data-micro-reset]').click();assert.equal(await page.locator('#s9 [data-action=correct]').count(),0);assert.equal(await page.locator('[data-value=objective]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#microscope-scene .extension').count(),0);
 });
 await scenario('唯一小測：漏答、錯答回看、修改清除、全對與重填',async()=>{
  await page.locator('#quiz button[type=submit]').click();assert.match(await page.locator('#quiz-result').innerText(),/未作答/);for(let i=1;i<=4;i++)await page.locator(`[name=q${i}][value="0"]`).check();await page.locator('#quiz button[type=submit]').click();assert.equal(await page.locator('#quiz-result a').count(),3);assert.deepEqual(await page.locator('#quiz-result a').evaluateAll(es=>es.map(e=>e.getAttribute('href'))),['#s1','#s4','#s8']);for(const[i,v]of['1','0','2','1'].entries())await page.locator(`[name=q${i+1}][value="${v}"]`).check();assert.equal(await page.locator('#quiz-result').innerText(),'');await page.locator('#quiz button[type=submit]').click();assert.match(await page.locator('#quiz-result').innerText(),/四題都答對/);await shot(10,'quiz-correct');await page.locator('#quiz button[type=reset]').click();assert.equal(await page.locator('#quiz input:checked').count(),0);assert.equal(await page.locator('#quiz-result').innerText(),'');
 });
 await scenario('與 2.2 共用的排版數值及人物素材一致',async()=>{
  const style=async p=>p.evaluate(()=>{const r=s=>{const e=document.querySelector(s),c=getComputedStyle(e);return {padding:c.padding,gap:c.gap,fontSize:c.fontSize,borderRadius:c.borderRadius}};return{shell:document.querySelector('.shell').getBoundingClientRect().width,layout:r('.lesson-layout'),head:r('.lesson-head'),body:r('.lesson-body'),title:r('.lesson-head h2'),dialogue:r('.dialogue'),avatar:getComputedStyle(document.querySelector('.speaker'),'::before').backgroundImage.split('?')[0].split('/').at(-1)}});
  const refContext=await browser.newContext({viewport:page.viewportSize(),javaScriptEnabled:false}),ref=await refContext.newPage();await ref.goto(new URL('../../../2/parts/2.2/',base).href,{waitUntil:'domcontentloaded'});assert.deepEqual(await style(page),await style(ref));await refContext.close();await page.bringToFront();
 });
 const measurements=[];
 for(const width of [1440,1366,1024,820,760,390,320])await scenario(`${width}px 十區標頭、滿寬內容、導覽與文字未遮擋`,async()=>{
  await page.setViewportSize({width,height:width<760?844:1000});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  for(let i=1;i<=10;i++){
   await page.locator(`.route a[href="#s${i}"]`).click();await page.waitForFunction(i=>document.querySelector('.route a[aria-current=step]')?.hash==='#s'+i,i);if(i===3)await closeWorkspace();
   if(width<=760)await page.waitForFunction(i=>{const t=document.querySelector('#s'+i+' h2').getBoundingClientRect(),n=document.querySelector('.route').getBoundingClientRect();return t.top>=n.bottom-1},i);
   const data=await page.locator('#s'+i).evaluate(e=>{const c=e.getBoundingClientRect(),h=e.querySelector('.lesson-head,.quiz-head').getBoundingClientRect(),b=e.querySelector('.lesson-body,.quiz-body').getBoundingClientRect(),title=e.querySelector('h2').getBoundingClientRect(),nav=document.querySelector('.route').getBoundingClientRect();return{pageOverflow:document.documentElement.scrollWidth>innerWidth,left:c.left,right:c.right,headWidth:h.width,bodyWidth:b.width,headBottom:h.bottom,bodyTop:b.top,headingTop:title.top,navBottom:nav.bottom,clipped:[...e.querySelectorAll('h2,.lesson-head p,.quiz-subtitle,button,label')].filter(n=>n.scrollWidth>n.clientWidth+2).map(n=>n.textContent.trim()),active:document.querySelector('.route a[aria-current=step]')?.hash,progress:document.querySelector('#route-progress').textContent}});
   if([2,5].includes(i)){const fit=await page.locator(`#s${i} ${i===2?'.convex-stage':'.parallel-stage'}`).evaluate(e=>({width:e.clientWidth,content:e.scrollWidth,svg:e.querySelector('canvas,svg').getBoundingClientRect().width}));assert.equal(fit.content,fit.width);assert.ok(fit.svg<=fit.width+1);}
   measurements.push({width,i,...data});assert.equal(data.pageOverflow,false);assert.ok(data.left>=0&&data.right<=width+1);assert.ok(Math.abs(data.headWidth-data.bodyWidth)<1);assert.ok(data.bodyTop>=data.headBottom);assert.deepEqual(data.clipped,[]);assert.equal(data.active,'#s'+i);if(width<=760)assert.ok(data.headingTop>=data.navBottom-1,`${width} s${i} hidden heading`);
  }
  if([1440,1024,390,320].includes(width))await shot(1,`s1-${width}`);
 });
 await fs.writeFile(path.join(capture,'layout.json'),JSON.stringify(measurements,null,2));
 await scenario('初始深連結、鍵盤及原生觸控都可操作',async()=>{
  await page.goto(base+'#s6');await page.waitForFunction(()=>document.querySelector('.route a[aria-current=step]')?.hash==='#s6');assert.match(await page.locator('#route-progress').innerText(),/06／09/);
  await page.locator('#lab6 [data-drag=object]').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#lab6 [data-input=object]').inputValue(),'40');await page.keyboard.press('End');assert.equal(await page.locator('#lab6 [data-input=object]').inputValue(),'350');
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const mp=await mobile.newPage();await mp.goto(base+'#s5');await mp.locator('#concave-rays [data-parallel-close]').tap();assert.equal(await mp.locator('#concave-rays').getAttribute('data-view'),'surface');await mp.locator('#concave-rays').screenshot({path:path.join(capture,'concave-surface-390.png')});await mp.locator('#concave-rays [data-parallel-close]').tap();await mp.goto(base+'#s4');await mp.locator('#lab5 [data-mag-screen]').tap();assert.match(await mp.locator('#lab5 [data-result]').innerText(),/無法直接/);await mp.locator('.route a[href="#s10"]').tap();await mp.waitForFunction(()=>document.querySelector('.route a[aria-current=step]')?.hash==='#s10');assert.equal(await mp.locator('#route-progress').innerText(),'目前位置：單元小測');await mp.screenshot({path:path.join(capture,'touch-quiz.png')});await mobile.close();
 });
 await scenario('十個導覽、屏幕鍵盤操作與虛像入眼光束',async()=>{
  await page.setViewportSize({width:1440,height:1000});await page.bringToFront();
  for(let i=1;i<=10;i++){await page.locator(`.route a[href="#s${i}"]`).click();await page.waitForFunction(i=>document.querySelector('.route a[aria-current=step]')?.hash==='#s'+i,i);if(i===3)await closeWorkspace();}
  await page.locator('.route a[href="#s1"]').click();await lab(1).locator('[data-pinhole-screen]').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');assert.ok(Number(await lab(1).getAttribute('data-screen-x'))>1.4);
  const before=await lab(5).getAttribute('data-image-scale');await lab(5).locator('#magnifier-canvas').focus();await page.keyboard.press('ArrowLeft');assert.equal(await lab(5).getAttribute('data-image-scale'),before);assert.equal(await lab(5).locator('[data-mag-eye]').isVisible(),true);
 });
 await scenario('素材、有效入口、內部連結及瀏覽器錯誤',async()=>{
  assert.equal(await page.locator('a[href^="#"]').evaluateAll(as=>as.filter(a=>!document.getElementById(a.hash.slice(1))).length),0);
  for(const link of ['../../','../4.3/']){const r=await context.request.get(new URL(link,base).href);assert.equal(r.status(),200)}
  const entry=await context.request.get(new URL('../../',base).href);assert.match(await entry.text(),/parts\/4\.4\/index.html/);assert.deepEqual(errors,[]);
 });
});
