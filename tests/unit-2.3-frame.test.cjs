const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');

test('oxygen material-to-animation frame stays the same size and position',{timeout:120000},async t=>{
 let server,url=process.env.OXYGEN_FRAME_URL;
 if(!url){
  server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});
  t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('server timeout')),5000);
   server.stdout.on('data',b=>{const m=String(b).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});
   server.once('error',reject);
  });
  url=`http://127.0.0.1:${port}/units/2/parts/2.3/`;
 }
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.OXYGEN_FRAME_URL?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});
 t.after(()=>browser.close());
 const out=process.env.OXYGEN_FRAME_ARTIFACT_DIR||'/tmp/unit23-fixed-frame';await fs.mkdir(out,{recursive:true});
 const records=[];
 for(const width of[1440,1280,1024,800,768,390,320])await t.test(`${width}px: materials, full preparation, later operations and return`,async()=>{
  const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'});
  try{
   await page.clock.install();await page.goto(url,{waitUntil:'networkidle'});
   await page.waitForFunction(()=>document.querySelector('.oxygen-preparation').dataset.ready==='true');
   await page.evaluate(()=>document.fonts.ready);
   await page.locator('.oxygen-preparation .oxygen-stage-area').scrollIntoViewIfNeeded();
   await page.clock.runFor(300);await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
   const root=page.locator('.oxygen-preparation');
   async function select(i){const tab=root.locator(`#oxygen-tab-${i}`);if(!await tab.isVisible())await root.locator('[data-step-menu]').click();await tab.click();}
   async function measure(selector){return root.locator(selector).evaluate(e=>{
    const r=e.getBoundingClientRect(),stage=e.closest('.oxygen-stage-area').getBoundingClientRect(),m=e.getScreenCTM();
    return{width:r.width,height:r.height,x:r.x-stage.x,y:r.y-stage.y,scaleX:m.a,scaleY:m.d,offsetX:m.e-r.x,offsetY:m.f-r.y};
   });}
   const before=await measure('[data-shared-materials]');
   if([1440,390].includes(width))await root.locator('.oxygen-stage-area').screenshot({path:path.join(out,`materials-${width}.png`)});
   await root.locator('[data-play]').click();await root.locator('[data-play]').click();
   const frames=[];
   function sameFrame(frame,label){for(const key of['width','height','x','y'])assert.ok(Math.abs(frame[key]-before[key])<1.5,`${width}/${label}/${key}: ${before[key]} -> ${frame[key]}`);}
   let current=await measure('#oxygen-step-1 .oxygen-main-scene');frames.push(current);sameFrame(current,'start');
   for(const key of['scaleX','scaleY','offsetX','offsetY'])assert.ok(Math.abs(current[key]-before[key])<.01,`${width}: first frame must keep the material camera (${key})`);
   await root.locator('[data-play]').click();let elapsed=0;
   for(const time of[1200,2400,8500,11400,14800,20800]){
    await page.clock.fastForward(time-elapsed);elapsed=time;
    current=await measure('#oxygen-step-1 .oxygen-main-scene');frames.push(current);sameFrame(current,`preparation ${time}`);
   }
   if([1440,390].includes(width))await root.locator('.oxygen-stage-area').screenshot({path:path.join(out,`ready-${width}.png`)});
   for(let i=2;i<=7;i++){await select(i);current=await measure(`#oxygen-step-${i} .oxygen-main-scene`);sameFrame(current,`operation ${i}`);}
   await select(0);sameFrame(await measure('[data-shared-materials]'),'return');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   records.push({width,before,preparation:frames});
  }finally{await page.close();}
 });
 await fs.writeFile(path.join(out,'measurements.json'),JSON.stringify(records,null,2)+'\n');
});
