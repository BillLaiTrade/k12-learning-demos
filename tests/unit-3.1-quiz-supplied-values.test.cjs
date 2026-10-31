const {test}=require('node:test');const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const path=require('node:path');const {chromium}=require('playwright');
test('quiz requires exact provided frequency and period',async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',chunk=>{const m=String(chunk).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject)});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});t.after(()=>browser.close());
 for(const width of [1440,390])await t.test(`${width}px: explicit values, rejections and reciprocal inputs`,async()=>{
  const page=await browser.newPage({viewport:{width,height:900}});try{
   await page.goto(`http://127.0.0.1:${port}/units/3/parts/3.1/#unit-quiz`);
   const fill=async(id,value)=>page.locator('#'+id).fill(value),submit=async()=>page.locator('#field-submit').click(),state=()=>page.locator('#field-feedback').getAttribute('data-state');
   await fill('field-p-frequency','1.22');assert.equal(await page.locator('#field-p-period').inputValue(),'0.82');await fill('field-p-wavelength','5');await fill('field-s-period','0.84');assert.equal(await page.locator('#field-s-frequency').inputValue(),'1.19');await fill('field-s-wavelength','3');await submit();assert.equal(await state(),'good');assert.equal(await page.locator('#field-p-result').innerText(),'19.67 秒');assert.equal(await page.locator('#field-s-result').innerText(),'33.6 秒');
   for(const value of ['4.9','5.1']){await fill('field-p-wavelength',value);await submit();assert.equal(await state(),'try');assert.equal(await page.locator('#field-p-wavelength').getAttribute('aria-invalid'),'true');assert.match(await page.locator('#field-feedback').innerText(),/P 波波長/);}
   await fill('field-p-wavelength','5.0');
   for(const value of ['2.9','3.1']){await fill('field-s-wavelength',value);await submit();assert.equal(await state(),'try');assert.equal(await page.locator('#field-s-wavelength').getAttribute('aria-invalid'),'true');assert.match(await page.locator('#field-feedback').innerText(),/S 波波長/);}
   await fill('field-s-wavelength','3.0');await submit();assert.equal(await state(),'good','equivalent decimal notation is accepted');
   await fill('field-p-frequency','1.23');await submit();assert.equal(await state(),'try');assert.equal(await page.locator('#field-p-frequency').getAttribute('aria-invalid'),'true');assert.match(await page.locator('#field-feedback').innerText(),/頻率與週期須與標示一致/);assert.equal(await page.locator('#field-results').isVisible(),false);
   await fill('field-p-frequency','1.22');await fill('field-s-period','0.85');await submit();assert.equal(await state(),'try');assert.equal(await page.locator('#field-s-period').getAttribute('aria-invalid'),'true');
   await fill('field-s-period','0.84');await fill('field-p-frequency','1.2200001');await submit();assert.equal(await state(),'try','directly entered value must equal the displayed value');
   await fill('field-p-period','0.82');await fill('field-s-frequency','1.19');assert.equal(await page.locator('#field-p-frequency').inputValue(),'1.22');assert.equal(await page.locator('#field-s-period').inputValue(),'0.84');await submit();assert.equal(await state(),'good','rounded reciprocal inputs remain usable');assert.equal(await page.locator('#field-p-result').innerText(),'19.67 秒');assert.equal(await page.locator('#field-s-result').innerText(),'33.6 秒');assert.match(await page.locator('#field-calculation').innerText(),/1.22 Hz × 5 km/);assert.match(await page.locator('#field-calculation').innerText(),/3 km ÷ 0.84 s/);
   await fill('field-p-period','0.83');await submit();assert.equal(await state(),'try','a reciprocal that converts to a different displayed given value is rejected');
   await fill('field-p-period','0.8196721');await fill('field-s-frequency','1.190476');await submit();assert.equal(await state(),'good','precise reciprocal inputs allow conversion rounding');
   await fill('field-p-frequency','1.23');await submit();assert.equal(await state(),'try','editing frequency after reciprocal entry must still reject 1.23');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  }finally{await page.close()}
 });
});
