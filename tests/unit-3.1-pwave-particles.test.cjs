const {test}=require('node:test');const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const path=require('node:path');const {chromium}=require('playwright');
test('P-wave compression is visible without particle crossover or overlap',async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',chunk=>{const m=String(chunk).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject)});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});t.after(()=>browser.close());
 for(const width of [1440,1024,390])await t.test(`${width}px: ordered and readable compression`,async()=>{
  const page=await browser.newPage({viewport:{width,height:900}});try{
   await page.goto(`http://127.0.0.1:${port}/units/3/parts/3.1/#unit-quiz`);
   const dots=await page.locator('#field-p-wave-particles circle').evaluateAll(ns=>ns.map(n=>({x:+n.getAttribute('cx'),y:+n.getAttribute('cy'),r:+n.getAttribute('r')})));assert.equal(dots.length,252);
   for(let row=0;row<4;row++){
    const line=dots.slice(row*63,(row+1)*63),gaps=line.slice(1).map((p,i)=>p.x-line[i].x);assert.ok(gaps.every((gap,i)=>gap>=line[i].r+line[i+1].r),'adjacent particles do not cross or overlap');
    assert.ok(Math.max(...gaps)/Math.min(...gaps)>2.5,'compression and rarefaction remain distinguishable');
    const center=(line[30].x+line[31].x+line[32].x)/3;assert.ok(Math.abs(center-230)<1,'middle compression stays aligned with 5 km');
   }
   assert.match(await page.locator('.signal-row-p').getAttribute('data-wavelength-km'),/^5$/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   if(process.env.PWAVE_CAPTURE_DIR)await page.locator('.signal-row-p').screenshot({path:path.join(process.env.PWAVE_CAPTURE_DIR,`pwave-${width}.png`)});
   if(width===1440){for(const [id,value] of [['field-p-frequency','1.22'],['field-p-wavelength','5'],['field-s-period','0.84'],['field-s-wavelength','3']])await page.locator('#'+id).fill(value);await page.locator('#field-submit').click();assert.equal(await page.locator('#field-feedback').getAttribute('data-state'),'good');assert.equal(await page.locator('#field-p-result').innerText(),'19.67 秒');assert.equal(await page.locator('#field-s-result').innerText(),'33.6 秒');}
  }finally{await page.close()}
 });
});
