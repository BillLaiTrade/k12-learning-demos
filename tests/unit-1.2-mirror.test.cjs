const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {expect}=require('playwright/test');

test('第三區：虛像常駐、雙視圖與反射光路',{timeout:180000},async t=>{
  fs.mkdirSync('/tmp/unit1-card3-review',{recursive:true});
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(new Error('Static server timeout')),5000);server.stdout.on('data',d=>{out+=d;const match=out.match(/port (\d+)/);if(match){clearTimeout(timer);resolve(match[1]);}});server.once('error',reject);});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),failures=[];
  page.on('pageerror',e=>failures.push(e.message));page.on('requestfailed',r=>failures.push(r.url()));page.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
  const url=`http://127.0.0.1:${port}/units/1/parts/1.2/#card-03`;
  await page.goto(url,{waitUntil:'networkidle'});
  const section=page.locator('#card-03'),toggle=page.locator('#toggle-image-object'),light=page.locator('#toggle-image-rays');
  const objects=['#image-side-object','#image-side-virtual','#image-front-object','#image-front-reflection'];
  const phase=value=>expect(section).toHaveAttribute('data-light-phase',value);
  async function restore(){if(await section.getAttribute('data-object-present')==='false')await toggle.click();if(await section.getAttribute('data-light-phase')!=='hidden')await light.click();await phase('hidden');}
  async function screenshot(name){const hide=await page.addStyleTag({content:'.route{visibility:hidden!important}'});await section.screenshot({path:`/tmp/unit1-card3-review/${name}.png`});await hide.evaluate(e=>e.remove());}

  await t.test('初始直接顯示實物、對稱虛像及正常鏡中像，只有兩個操作',async()=>{
    for(const selector of objects)await expect(page.locator(selector)).toBeVisible();
    await expect(page.locator('#image-side-rays')).toBeHidden();await expect(page.locator('#image-side-extensions')).toBeHidden();
    await expect(light).toHaveText('看光怎麼走');await expect(light).toHaveAttribute('aria-pressed','false');
    assert.deepEqual(await section.locator('.mirror-controls button').allTextContents(),['看光怎麼走','移除小熊']);
    assert.equal(await page.locator('#reset-image-activity').count(),0);
    await expect(page.locator('#image-object-point,#image-virtual-point,#image-front-point')).toHaveCount(3);
    await expect(page.locator('#image-final-explanation')).toBeVisible();
    await screenshot('desktop-initial');
  });
  await t.test('單次點擊依序顯示反射光及延長虛線；隱藏光路仍看得到虛像',async()=>{
    await light.click();await phase('reflection');await expect(page.locator('#image-side-rays')).toBeVisible();
    await expect(page.locator('#image-side-virtual')).toBeVisible();await expect(page.locator('#image-side-extensions')).toBeHidden();
    await phase('extended');await expect(page.locator('#image-side-extensions')).toBeVisible();
    await expect(light).toHaveAttribute('aria-pressed','true');await expect(light).toHaveText('隱藏光路');
    await screenshot('desktop-light');
    await light.click();await phase('hidden');await expect(page.locator('#image-side-rays')).toBeHidden();
    await expect(page.locator('#image-side-virtual')).toBeVisible();
  });
  await t.test('三種寬度、兩種光路狀態，共 30 次固定位置移除／放回',async()=>{
    for(const width of [1440,1280,768]){
      await page.setViewportSize({width,height:1100});
      for(const showLight of [false,true])for(let cycle=0;cycle<5;cycle++){
        await restore();if(showLight){await light.click();await phase('extended');}
        await toggle.scrollIntoViewIfNeeded();await page.waitForTimeout(150);
        const box=await toggle.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
        await page.mouse.click(x,y);await expect(section).toHaveAttribute('data-object-present','false');
        await expect(toggle).toHaveText('放回小熊');for(const selector of objects)await expect(page.locator(selector)).toBeHidden();
        await expect(light).toBeDisabled();await phase('hidden');
        const removed=await toggle.boundingBox();assert.ok(Math.abs(removed.y-box.y)<.5&&Math.abs(removed.x-box.x)<.5,'放回按鈕不可位移');
        await page.mouse.click(x,y);await expect(section).toHaveAttribute('data-object-present','true');
        for(const selector of objects)await expect(page.locator(selector)).toBeVisible();
        await expect(light).toBeEnabled();await phase('hidden');
      }
    }
  });
  await t.test('快速隱藏、揭示中移除／放回，不會有舊計時器或延後冒出的光線',async()=>{
    await restore();await light.click();await phase('reflection');await light.click();await page.waitForTimeout(800);
    await phase('hidden');await expect(page.locator('#image-side-extensions')).toBeHidden();
    await light.click();await phase('reflection');await toggle.click();await toggle.click();await page.waitForTimeout(800);
    await phase('hidden');for(const selector of objects)await expect(page.locator(selector)).toBeVisible();
    await expect(page.locator('#image-side-rays')).toBeHidden();await expect(page.locator('#image-side-extensions')).toBeHidden();
  });
  await t.test('反射角相等、眼睛與延長線共線，虛像幾何鏡射且標記同一物點',async()=>{
    const data=await page.locator('#image-side-view').evaluate(svg=>{
      const point=name=>svg.dataset[name].split(',').map(Number);
      const numbers=id=>document.getElementById(id).getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
      return{mirror:+svg.dataset.mirrorX,source:point('objectPoint'),image:point('imagePoint'),eye:point('eyePoint'),incoming:numbers('image-ray-a-in'),outgoing:numbers('image-ray-a-out'),extension:numbers('image-extension-a')};
    });
    const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
    close((data.source[0]+data.image[0])/2,data.mirror);close(data.source[1],data.image[1]);
    assert.deepEqual(data.incoming.slice(0,2),data.source);const hit=data.incoming.slice(-2);
    assert.deepEqual(data.outgoing.slice(0,2),hit);assert.deepEqual(data.outgoing.slice(-2),data.eye);
    assert.deepEqual(data.extension.slice(0,2),hit);assert.deepEqual(data.extension.slice(-2),data.image);
    close(hit[0],data.mirror);
    const incident=(hit[1]-data.source[1])/(hit[0]-data.source[0]),reflected=(data.eye[1]-hit[1])/(data.eye[0]-hit[0]),extended=(data.image[1]-hit[1])/(data.image[0]-hit[0]);
    close(incident,-reflected);close(reflected,extended);
    for(const selector of ['#image-ray-a-in','#image-ray-a-out'])await expect(page.locator(selector)).toHaveAttribute('marker-mid','url(#ray-arrow-side)');
    await expect(page.locator('#image-side-virtual image')).toHaveAttribute('transform','translate(1080 0) scale(-1 1)');
    await expect(page.locator('#image-side-virtual image')).toHaveAttribute('opacity','.55');
    for(const attr of ['x','y','width','height'])assert.equal(await page.locator('#image-side-object image').getAttribute(attr),await page.locator('#image-side-virtual image').getAttribute(attr));
    await expect(page.locator('#image-front-reflection image')).toHaveAttribute('href','assets/mirror/teddy-front.webp');
    assert.equal(await page.locator('#image-front-reflection image').getAttribute('opacity'),null);
    for(const [id,point] of [['image-object-point',data.source],['image-virtual-point',data.image]]){
      close(+await page.locator(`#${id}`).getAttribute('cx'),point[0]);close(+await page.locator(`#${id}`).getAttribute('cy'),point[1]);
    }
    await expect(page.locator('#image-observer-profile')).toHaveAttribute('href','assets/mirror/xiaokui-profile.webp');
  });
  await t.test('鍵盤可切換光路、移除並放回；焦點順序依主要操作在前',async()=>{
    await restore();await light.focus();await page.keyboard.press('Enter');await phase('extended');
    await page.keyboard.press('Space');await phase('hidden');await page.keyboard.press('Tab');await expect(toggle).toBeFocused();
    await page.keyboard.press('Enter');await expect(section).toHaveAttribute('data-object-present','false');
    await page.keyboard.press('Space');await expect(section).toHaveAttribute('data-object-present','true');await expect(page.locator('#image-side-virtual')).toBeVisible();
  });
  await t.test('1440／1280／1024／768／390 px：左主右輔、手機直排、控制不溢位',async()=>{
    for(const width of [1440,1280,1024,768,390]){
      await page.setViewportSize({width,height:1100});await restore();await section.scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      const left=await section.locator('.mirror-side-panel').boundingBox(),right=await section.locator('.mirror-front-panel').boundingBox();
      if(width>1050){assert.ok(left.width/right.width>1.85&&left.width/right.width<1.95);assert.ok(Math.abs(left.y-right.y)<1&&Math.abs(left.height-right.height)<1);}
      else assert.ok(right.y>=left.y+left.height);
      for(const button of [light,toggle]){const box=await button.boundingBox();assert.ok(box.width>=100&&box.height>=44);}
      if(width===390)await screenshot('mobile-initial');
    }
    await page.setViewportSize({width:1440,height:1100});
  });
  await t.test('手機真實觸控、減少動態直接顯示完整光路，放回時虛像立即恢復',async()=>{
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
    const mobile=await context.newPage();mobile.on('pageerror',e=>failures.push(e.message));
    try{
      await mobile.goto(url,{waitUntil:'networkidle'});await expect(mobile.locator('#image-side-virtual')).toBeVisible();
      await mobile.locator('#toggle-image-rays').tap();await expect(mobile.locator('#card-03')).toHaveAttribute('data-light-phase','extended');
      await expect(mobile.locator('#image-side-extensions')).toBeVisible();
      const target=mobile.locator('#toggle-image-object');await target.scrollIntoViewIfNeeded();await mobile.waitForTimeout(150);
      const box=await target.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
      await mobile.touchscreen.tap(x,y);for(const selector of objects)await expect(mobile.locator(selector)).toBeHidden();
      await mobile.touchscreen.tap(x,y);for(const selector of objects)await expect(mobile.locator(selector)).toBeVisible();
      await expect(mobile.locator('#image-side-rays')).toBeHidden();
      await mobile.locator('#toggle-image-rays').tap();await mobile.locator('#card-03').screenshot({path:'/tmp/unit1-card3-review/mobile-light.png'});
      assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }finally{await context.close();}
  });
  await t.test('相鄰物距活動獨立更新，第三區圖像狀態不受影響，沒有資源或程式例外',async()=>{
    await restore();await light.click();await phase('extended');
    await page.locator('#object-distance').fill('20');await page.locator('#object-distance').dispatchEvent('input');
    await expect(page.locator('#image-distance-value')).toHaveText('20 cm');await expect(page.locator('#image-side-virtual')).toBeVisible();await phase('extended');
    await page.goto('about:blank');await page.waitForTimeout(200);assert.deepEqual(failures,[]);
  });
});
