const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {chromium}=require('playwright');

test('element and compound models show iron crystal and balanced bent water groups',async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',chunk=>{const m=String(chunk).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});t.after(()=>browser.close());
 for(const width of [1440,1024,768,390])await t.test(`${width}px: accurate models and responsive layout`,async()=>{
  const page=await browser.newPage({viewport:{width,height:900}});try{
   await page.goto(`http://127.0.0.1:${port}/units/2/parts/2.1/#s9`);await page.locator('#s9').scrollIntoViewIfNeeded();
   assert.equal(await page.locator('.iron-crystal circle').count(),9);
   const ironBox=await page.locator('.iron-crystal').boundingBox();assert.ok(ironBox.width>=80,`iron model width ${ironBox.width}`);assert.ok(ironBox.height>=100,`iron model height ${ironBox.height}`);
   const center=await page.locator('.iron-crystal circle').last().evaluate(n=>[+n.getAttribute('cx'),+n.getAttribute('cy')]);assert.deepEqual(center,[94,59]);
   assert.equal(await page.locator('#compound-example .water-unit').count(),4);
   for(const group of await page.locator('#compound-example .water-unit').all()){
    assert.equal(await group.locator('.particle-ball--oxygen').count(),1);assert.equal(await group.locator('.particle-ball--hydrogen').count(),2);
    const positions=await group.locator('.particle-ball').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}}));
    const [o,h1,h2]=positions;assert.ok(h1.x<o.x&&h2.x>o.x&&h1.y>o.y&&h2.y>o.y,'water models are bent with oxygen in the center');
    const a=[h1.x-o.x,h1.y-o.y],b=[h2.x-o.x,h2.y-o.y],angle=Math.acos((a[0]*b[0]+a[1]*b[1])/(Math.hypot(...a)*Math.hypot(...b)))*180/Math.PI;assert.ok(angle>95&&angle<115,`angle ${angle}`);
   }
   const reaction=page.locator('.decomposition-water-scene');assert.equal(await reaction.locator('.decomposition-reactants .particle-ball--hydrogen').count(),4);assert.equal(await reaction.locator('.decomposition-reactants .particle-ball--oxygen').count(),2);assert.equal(await reaction.locator('.decomposition-products .particle-ball--hydrogen').count(),4);assert.equal(await reaction.locator('.decomposition-products .particle-ball--oxygen').count(),2);
   assert.match(await reaction.innerText(),/氫氣/);assert.match(await reaction.innerText(),/氧氣/);assert.match(await page.locator('#s9 .particle-color-note').innerText(),/模型/);
   const summary=page.locator('.matter-summary');assert.equal(await summary.locator('.matter-iron-crystal circle').count(),9);assert.equal(await summary.locator('.water-unit').count(),4);
   for(const group of await summary.locator('.water-unit').all()){
    const pos=await group.locator('.particle-ball').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}}));const [o,h1,h2]=pos;
    assert.ok(h1.x<o.x&&h2.x>o.x&&h1.y>o.y&&h2.y>o.y,'summary water models use the same bent shape');
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   if(process.env.MODEL_CAPTURE_DIR){await page.locator('.pure-particle-comparison').screenshot({path:path.join(process.env.MODEL_CAPTURE_DIR,`models-${width}.png`)});await summary.screenshot({path:path.join(process.env.MODEL_CAPTURE_DIR,`summary-${width}.png`)});}
  }finally{await page.close()}
 });
});
