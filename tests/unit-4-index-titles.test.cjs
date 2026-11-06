const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),{chromium}=require('playwright');
const titles=['書頁不發光，我們為什麼看得見它？','光遇到表面會怎樣？','光進入不同介質會怎樣？','透鏡如何形成影像？','光怎麼變出五顏六色？'];
test('unit 4 entry headings follow content pages and retain usable static fallbacks',{timeout:45000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);});
 const base=`http://127.0.0.1:${port}/units/4/`,browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'});t.after(()=>browser.close());
 await t.test('current five headings stay consistent and loading the index does not run lesson assets',async()=>{
  const p=await browser.newPage(),requests=[];p.on('request',r=>requests.push(r.url()));try{
   await p.goto(base,{waitUntil:'networkidle'});assert.deepEqual(await p.locator('.part-card h2').allTextContents(),titles);
   assert.equal(requests.filter(u=>/\/parts\/4\.[1-5]\/index.html$/.test(u)).length,5);
   assert.equal(requests.some(u=>/\/parts\/4\.[1-5]\/assets\//.test(u)),false);
  }finally{await p.close();}
 });
 await t.test('a changed inner title updates automatically as text while original links and layout remain usable',async()=>{
  const p=await browser.newPage(),requests=[];p.on('request',r=>requests.push(r.url()));try{
   await p.route('**/parts/4.2/index.html',route=>route.fulfill({contentType:'text/html',body:'<h1><span>新標題</span>：光 &amp; 鏡面</h1><script>window.unwantedLessonScript=true</script><img src="/unwanted-lesson-image.png">'}));
   await p.goto(base,{waitUntil:'networkidle'});assert.equal(await p.locator('.part-card h2').nth(1).innerText(),'新標題：光 & 鏡面');
   assert.equal(await p.evaluate(()=>window.unwantedLessonScript),undefined);assert.equal(requests.some(u=>u.includes('unwanted-lesson-image')),false);
   assert.deepEqual(await p.locator('.part-card a').evaluateAll(ns=>ns.map(n=>n.getAttribute('href'))),[1,2,3,4,5].map(n=>`parts/4.${n}/index.html`));
   for(const width of [1366,390,320]){await p.setViewportSize({width,height:900});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await p.locator('.part-card h2').evaluateAll(ns=>ns.some(n=>n.scrollWidth>n.clientWidth+1)),false);}
  }finally{await p.close();}
 });
 await t.test('HTTP errors, offline requests and missing or empty headings keep each card readable',async()=>{
  const p=await browser.newPage();try{
   await p.route('**/parts/4.1/index.html',r=>r.fulfill({contentType:'text/html',body:'<h1>成功更新的標題</h1>'}));
   await p.route('**/parts/4.2/index.html',r=>r.fulfill({status:500,body:'error'}));
   await p.route('**/parts/4.3/index.html',r=>r.abort());
   await p.route('**/parts/4.4/index.html',r=>r.fulfill({contentType:'text/html',body:'<p>尚無標題</p>'}));
   await p.route('**/parts/4.5/index.html',r=>r.fulfill({contentType:'text/html',body:'<h1> </h1>'}));
   await p.goto(base,{waitUntil:'networkidle'});assert.deepEqual(await p.locator('.part-card h2').allTextContents(),['成功更新的標題',...titles.slice(1)]);assert.equal(await p.locator('.part-card a').count(),5);
  }finally{await p.close();}
 });
 await t.test('without JavaScript all five titles and destination links remain available',async()=>{
  const p=await browser.newPage({javaScriptEnabled:false});try{await p.goto(base);assert.deepEqual(await p.locator('.part-card h2').allTextContents(),titles);assert.equal(await p.locator('.part-card a').count(),5);}finally{await p.close();}
 });
});
