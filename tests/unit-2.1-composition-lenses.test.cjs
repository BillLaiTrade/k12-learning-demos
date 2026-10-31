const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {chromium}=require('playwright');

test('composition lenses show water, air and soil without changing the cards',async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',chunk=>{const m=String(chunk).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject)});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});t.after(()=>browser.close());
 for(const width of [1440,1024,768,390])await t.test(`${width}px: three accurate models fit in unchanged cards`,async()=>{
  const page=await browser.newPage({viewport:{width,height:900}});try{
   await page.goto(`http://127.0.0.1:${port}/units/2/parts/2.1/#s8`);const cards=page.locator('.composition-sample-card');assert.equal(await cards.count(),3);
   assert.deepEqual(await cards.locator('h3').allTextContents(),['純水','空氣','土壤']);
   assert.match(await page.locator('#s8 .dialogue').nth(1).innerText(),/純水只含水這一種物質/);
   assert.match(await page.locator('#s9 .particle-card--compound .particle-caption').innerText(),/純水只含水這一種物質；水由氫、氧兩種元素組成/);
   assert.doesNotMatch(await page.locator('body').innerText(),/蒸餾水|蒸馏水/);
   assert.deepEqual(await cards.locator('.composition-result').allTextContents(),['一種物質純物質','多種氣體混合物','多種成分混合物']);
   assert.equal(await cards.nth(0).locator('.composition-water-group').count(),6);
   for(const group of await cards.nth(0).locator('.composition-water-group').all()){
    assert.equal(await group.locator('circle.oxygen').count(),1);assert.equal(await group.locator('circle.hydrogen').count(),2);
    const coords=await group.locator('circle').evaluateAll(ns=>ns.map(n=>[+n.getAttribute('cx'),+n.getAttribute('cy')]));const [[ox,oy],[x1,y1],[x2,y2]]=coords;
    const a=[x1-ox,y1-oy],b=[x2-ox,y2-oy],angle=Math.acos((a[0]*b[0]+a[1]*b[1])/(Math.hypot(...a)*Math.hypot(...b)))*180/Math.PI;assert.ok(angle>100&&angle<110,`water angle ${angle}`);
   }
   assert.equal(await cards.nth(1).locator('.composition-air-nitrogen').count(),16);assert.equal(await cards.nth(1).locator('.composition-air-oxygen').count(),4);assert.equal(await cards.nth(1).locator('.composition-air-other').count(),1);
   const soil=cards.nth(2).locator('.composition-lens img');await soil.evaluate(n=>n.decode());assert.equal(await soil.evaluate(n=>n.naturalWidth),378);
   assert.match(await cards.nth(2).locator('.composition-sample-visual').getAttribute('aria-label'),/AI生成/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   for(const lens of await cards.locator('.composition-lens').all()){const rect=await lens.boundingBox();assert.ok(rect.width>70&&Math.abs(rect.width-rect.height)<1)}
   if(process.env.COMPOSITION_CAPTURE_DIR)await page.locator('.composition-sample-grid').screenshot({path:path.join(process.env.COMPOSITION_CAPTURE_DIR,`composition-${width}.png`)});
  }finally{await page.close()}
 });
});
