const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require('playwright');
test('4.5 折射方向與分色圖：原生收合、窄版及原操作',{timeout:180000},async t=>{
 let base=process.env.COLOR_URL;
 if(!base){const root=path.resolve(__dirname,'..'),server=http.createServer(async(req,res)=>{try{let file=path.join(root,decodeURI(req.url.split('?')[0]));if((await fs.stat(file)).isDirectory())file+='/index.html';res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'text/html');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end('missing')}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());base=`http://127.0.0.1:${server.address().port}/units/4/parts/4.5/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.COLOR_URL?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'});context.setDefaultNavigationTimeout(90000);
 // Only the two affected prism labs need WebGL for this focused regression.
 await context.route('**/4.5/assets/{torch-studio,studio}.mjs*',r=>r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const capture=process.env.COLOR_CAPTURE_DIR||'/tmp/unit45-bends-local';await fs.mkdir(capture,{recursive:true});await page.goto(base,{waitUntil:'networkidle'});
 await t.test('收合預設與鍵盤操作不重設器材或光源',async()=>{
  const first=page.locator('.prism-refraction'),second=page.locator('.prism-dispersion');assert.equal(await first.evaluate(e=>e.open),false);assert.equal(await second.evaluate(e=>e.open),true);
  for(const i of[1,2]){await page.locator('#s'+i+' .lab').scrollIntoViewIfNeeded();await page.waitForFunction(i=>document.querySelector('#s'+i+' .lab').dataset.renderer==='three',i);}
  await page.locator('#s1 [data-prism=out]').click();await page.locator('#s2 [data-light=blue]').click();
  for(const detail of[first,second]){const before=await detail.evaluate(e=>e.open);await detail.locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await detail.evaluate(e=>e.open),!before);await detail.locator('summary').focus();await page.keyboard.press('Space');assert.equal(await detail.evaluate(e=>e.open),before);}
  assert.equal(await page.locator('#s1 [data-prism=out]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#s2 [data-light=blue]').getAttribute('aria-pressed'),'true');assert.match(await page.locator('#s2 [data-current-light]').innerText(),/藍光/);
 });
 const results=[];
 for(const [width,height]of[[1366,768],[820,900],[650,900],[390,844],[320,568]])await t.test(`${width}×${height} 圖文完整且不溢出`,async()=>{
  await page.setViewportSize({width,height});
  for(const i of[1,2]){const detail=page.locator('#s'+i+' .prism-explanation');await detail.evaluate(e=>e.open=true);const img=detail.locator('img');await img.scrollIntoViewIfNeeded();await img.evaluate(e=>e.decode());const info=await img.evaluate(e=>{const r=e.getBoundingClientRect(),s=e.closest('picture').querySelector('source'),mobile=matchMedia(s.media).matches;return{src:e.currentSrc,x:r.x,right:r.right,width:r.width,height:r.height,ratio:mobile?Number(s.width)/Number(s.height):Number(e.getAttribute('width'))/Number(e.getAttribute('height'))}});assert.ok(info.x>=-1&&info.right<=width+1);assert.ok(Math.abs(info.width/info.height-info.ratio)<.01);assert.equal(info.src.includes('-mobile.svg'),width<=650);results.push({width,height,section:i,...info});if(width===1366||width===320)await detail.locator('figure').screenshot({path:path.join(capture,`diagram-${i}-${width}.png`)});}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 });
 await t.test('四張 SVG 的文字不裁切，方向箭頭和分色註記可讀',async()=>{
  const svgPage=await context.newPage();
  for(const kind of['refraction','dispersion'])for(const mobile of[false,true]){await svgPage.goto(new URL(`assets/prism-${kind}-explanation${mobile?'-mobile':''}.svg?v=prism-directions-20261104`,base).href);await svgPage.evaluate(()=>document.fonts.ready);const data=await svgPage.evaluate(()=>{const svg=document.querySelector('svg'),v=svg.viewBox.baseVal;return{text:svg.textContent,bends:svg.querySelectorAll('[data-bend]').length,rays:[...svg.querySelectorAll('[data-light]')].map(e=>e.getAttribute('data-light')),outside:[...svg.querySelectorAll('text')].map(e=>({text:e.textContent,b:e.getBBox()})).filter(({b})=>b.x<0||b.y<0||b.x+b.width>v.width||b.y+b.height>v.height).map(e=>e.text)}});assert.deepEqual(data.outside,[]);if(kind==='refraction'){assert.equal(data.bends,2);assert.match(data.text,/出射：偏離法線/);}else{assert.deepEqual(data.rays,['red','green','blue']);assert.match(data.text,/色光分離放大示意，非實際角度/);}}
  await svgPage.close();assert.deepEqual(errors,[]);
 });
 await t.test('停用 JavaScript 仍可展開兩區並載入圖解',async()=>{
  const fallback=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),p=await fallback.newPage();await p.goto(base);for(const kind of['refraction','dispersion']){const detail=p.locator('.prism-'+kind);if(!await detail.evaluate(e=>e.open))await detail.locator('summary').click();const img=detail.locator('img');await img.scrollIntoViewIfNeeded();await img.evaluate(e=>e.decode());assert.equal(await img.evaluate(e=>e.complete&&e.naturalWidth>0),true);}await fallback.close();
 });
 await fs.writeFile(path.join(capture,'layout.json'),JSON.stringify(results,null,2));
});
