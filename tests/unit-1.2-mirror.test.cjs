const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const {expect}=require('playwright/test');
const close=(a,b,epsilon=1e-9)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);

test('平面鏡幾何：對稱、反射與不同觀察位置的同一像點',async t=>{
  const model=await import(pathToFileURL(path.resolve(__dirname,'../units/1/parts/1.2/assets/mirror-image-geometry.mjs')));
  const {MIRROR_SCENE:s,observation,mirrorPoint,spriteAt,incomingDirection,outgoingDirection}=model;
  await t.test('401 個觀察高度：物像等距、向量反射、共線、有限鏡面與物體遮擋',()=>{
    const bear=spriteAt(s.source,s.bearNose,s.bearSize);
    for(let y=s.eyeMin;y<=s.eyeMax;y+=.5){
      const ray=observation(y),incoming=incomingDirection(ray),outgoing=outgoingDirection(ray);
      assert.deepEqual(ray.source,[345,440]);assert.deepEqual(ray.image,[735,440]);
      close(s.mirrorX-ray.source[0],ray.image[0]-s.mirrorX);close(ray.source[1],ray.image[1]);
      close(incoming[0],-outgoing[0]);close(incoming[1],outgoing[1]);
      assert.ok(ray.visible&&ray.hit[1]>=s.mirrorTop&&ray.hit[1]<=s.mirrorBottom);
      const time=(ray.eye[0]-ray.hit[0])/outgoing[0];
      close(ray.hit[1]+outgoing[1]*time,ray.eye[1]);assert.ok(time>0);
      const extended=ray.image.map((n,i)=>n-ray.hit[i]);
      close(extended[0]*outgoing[1]-extended[1]*outgoing[0],0);
      // 入眼線在熊的整個圖框上方，不穿越實物小熊。
      for(let x=bear.x;x<=bear.x+bear.width;x+=2){const yAt=ray.hit[1]+(x-ray.hit[0])*outgoing[1]/outgoing[0];assert.ok(yAt<bear.y);}
    }
    const pose=spriteAt(s.source,s.bearNose,s.bearSize);close(pose.x+pose.width*s.bearNose[0],s.source[0]);close(pose.y+pose.height*s.bearNose[1],s.source[1]);
    for(const point of [[pose.x,pose.y],[pose.x+pose.width,pose.y],[pose.x,pose.y+pose.height],s.source])mirrorPoint(mirrorPoint(point)).forEach((n,i)=>close(n,point[i]));
  });
  await t.test('各組不同入眼方向獨立求交，延長線交於同一鼻尖像點',()=>{
    for(let y=90;y<=270;y+=10){
      const a=observation(y),b=observation(y+20),r=a.image.map((v,i)=>v-a.eye[i]),q=b.image.map((v,i)=>v-b.eye[i]);
      const cross=(u,v)=>u[0]*v[1]-u[1]*v[0],between=b.eye.map((v,i)=>v-a.eye[i]);
      const t=cross(between,q)/cross(r,q);const point=a.eye.map((v,i)=>v+t*r[i]);
      close(point[0],735);close(point[1],440);assert.ok(t>0);assert.notEqual(a.hit[1],b.hit[1]);
    }
  });
  await t.test('401 個眼位：右側針孔投影、鏡面交點、反射鼻尖與反算紋理逐列一致',async()=>{
    const {eyeCamera,eyeView,projectPoint,planeRow,EYE_PLANES}=await import(pathToFileURL(path.resolve(__dirname,'../units/1/parts/1.2/assets/mirror-eye-projection.mjs')));
    for(let y=90;y<=290;y+=.5){
      const camera=eyeCamera(y),view=eyeView(y),ray=observation(y);
      assert.deepEqual(camera.eye,[150,y,0]);assert.deepEqual(camera.target,[735,440,0]);
      // 獨立用世界向量旋轉／透視除法核對，非只檢查 renderer 的資料值。
      const angle=Math.atan2(440-y,585);
      const independent=([x,h,z=0])=>{const dx=x-150,dy=h-y,d=dx*Math.cos(angle)+dy*Math.sin(angle);return[200+320*z/d,310+320*(dy*Math.cos(angle)-dx*Math.sin(angle))/d];};
      for(const point of [[540,68,-180],[540,570,180],[735,440,0],...ray.outgoing.map(p=>[...p,0]).slice(0,1)]){
        const a=projectPoint(camera,point),b=independent(point);close(a[0],b[0]);close(a[1],b[1]);assert.ok(a[2]>0);
      }
      const hit=projectPoint(camera,[...ray.hit,0]);close(hit[0],view.nose[0]);close(hit[1],view.nose[1]);close(view.nose[0],200);close(view.nose[1],310);
      for(const plane of [EYE_PLANES.front,EYE_PLANES.rear])for(let v=0;v<=1;v+=.05){
        const p=projectPoint(camera,[plane.x,plane.top+v*plane.height,plane.left]),row=planeRow(camera,plane,p[1]);
        close(row.v,v);close(row.x,p[0]);close(row.width,320*plane.width/p[2]);
      }
    }
    assert.notDeepEqual(eyeView(108).frame,eyeView(270).frame);
    assert.notDeepEqual(eyeView(108).front,eyeView(270).front);
    assert.notDeepEqual(eyeView(108).rear,eyeView(270).rear);
  });
});

test('第三區：移動小葵、保留兩次光路與精確對稱',{timeout:180000},async t=>{
  fs.mkdirSync('/tmp/unit1-card3-observer',{recursive:true});
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(new Error('Static server timeout')),5000);server.stdout.on('data',d=>{out+=d;const m=out.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  const url=`http://127.0.0.1:${port}/units/1/parts/1.2/#card-03`;
  await page.goto(url,{waitUntil:'networkidle'});
  await page.locator('#image-front-view[data-ready=true]').waitFor();
  const section=page.locator('#card-03'),change=page.locator('#change-image-observer'),toggle=page.locator('#toggle-image-object'),person=page.locator('#image-observer');
  const objects=['#image-side-object','#image-side-virtual','#image-front-object','#image-front-reflection'];
  const eye=async()=>+await section.getAttribute('data-eye-y');
  async function changePose(){const next=(await eye())<190?270:108;await change.click();await expect.poll(eye).toBe(next);return next;}
  async function clearHistory(){if(await section.getAttribute('data-object-present')==='false')await toggle.click();await toggle.click();await toggle.click();await expect(section).toHaveAttribute('data-observation-count','1');}
  async function screenshot(name){await page.evaluate(()=>document.activeElement?.blur());const hidden=await page.addStyleTag({content:'.route{visibility:hidden!important}'});await section.screenshot({path:`/tmp/unit1-card3-observer/${name}.png`});await hidden.evaluate(e=>e.remove());}
  async function screenPoint(x,y){return page.locator('#image-side-view').evaluate((svg,p)=>{const q=new DOMPoint(p[0],p[1]).matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y};},[x,y]);}
  async function settle(){await page.locator('#image-side-view').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(200);}
  async function verifyGeometry(){
    const data=await page.locator('#image-side-view').evaluate(svg=>{
      const p=n=>svg.dataset[n].split(',').map(Number),path=id=>document.getElementById(id).getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
      const project=(x,y)=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return[q.x,q.y];};
      const source=p('objectPoint'),image=p('imagePoint'),mx=+svg.dataset.mirrorX;
      const sprite=document.querySelector('#image-bear-sprite');const box=id=>{const r=document.getElementById(id).getBoundingClientRect();return[r.width,r.height];};
      const result={source,image,mx,eye:p('eyePoint'),current:{in:path('image-ray-current-in'),out:path('image-ray-current-out'),ext:path('image-extension-current')},screen:[project(...source),project(mx,source[1]),project(...image)],boxes:[box('image-side-object-shape'),box('image-side-virtual-shape')],shape:[sprite.getAttribute('x'),sprite.getAttribute('y'),sprite.getAttribute('width'),sprite.getAttribute('height')]};
      if(document.querySelector('#card-03').dataset.observationCount==='2')result.record={in:path('image-ray-record-in'),out:path('image-ray-record-out'),ext:path('image-extension-record')};
      return result;
    });
    assert.deepEqual(data.source,[345,440]);assert.deepEqual(data.image,[735,440]);close(data.mx-data.source[0],data.image[0]-data.mx);
    close(data.screen[1][0]-data.screen[0][0],data.screen[2][0]-data.screen[1][0]);close(data.screen[0][1],data.screen[2][1]);
    close(data.boxes[0][0],data.boxes[1][0],.01);close(data.boxes[0][1],data.boxes[1][1],.01);
    for(const ray of [data.current,data.record].filter(Boolean)){
      assert.deepEqual(ray.in.slice(0,2),data.source);const hit=ray.in.slice(-2),e=ray.out.slice(-2);
      assert.deepEqual(ray.out.slice(0,2),hit);assert.deepEqual(ray.ext.slice(0,2),hit);assert.deepEqual(ray.ext.slice(-2),data.image);
      close(hit[0],data.mx);const a=(hit[1]-data.source[1])/(hit[0]-data.source[0]),b=(e[1]-hit[1])/(e[0]-hit[0]),c=(data.image[1]-hit[1])/(data.image[0]-hit[0]);close(a,-b);close(b,c);
    }
    await expect(page.locator('#image-side-object > use')).toHaveAttribute('href','#image-bear-sprite');await expect(page.locator('#image-side-virtual-shape')).toHaveAttribute('href','#image-bear-sprite');
    await expect(page.locator('#image-side-virtual-shape')).toHaveAttribute('transform','translate(1080 0) scale(-1 1)');
    await expect(page.locator('#image-front-view')).toHaveAttribute('data-eye-y',String(data.eye[1]));
    await expect(page.locator('#image-front-view')).toHaveAttribute('data-target','735,440,0');
    const projected=await page.locator('#image-front-view').evaluate(e=>({nose:e.dataset.nose,frame:JSON.parse(e.dataset.frame),path:document.querySelector('#image-eye-frame').getAttribute('d')}));
    const values=projected.nose.split(',').map(Number);close(values[0],200);close(values[1],310);
    assert.ok(projected.frame.every(p=>p.every(Number.isFinite)));assert.ok(projected.path.startsWith('M'+projected.frame[0].slice(0,2).join(',')));
    return data;
  }
  await t.test('初始物像共用圖形且等距，只有換位置與移除兩個按鈕',async()=>{
    for(const selector of objects)await expect(page.locator(selector)).toBeVisible();
    assert.deepEqual(await section.locator('.mirror-controls button').allTextContents(),['換個位置看看','移除小熊']);
    assert.equal(await page.locator('#toggle-image-rays,#reset-image-activity').count(),0);
    await expect(section).toHaveAttribute('data-observation-count','1');await expect(page.locator('#image-observer-record')).toBeHidden();
    await verifyGeometry();await screenshot('desktop-initial');
  });
  await t.test('換位置保留前次觀察，兩條延長線共同指向固定像點',async()=>{
    const initial=await verifyGeometry();await changePose();await expect(section).toHaveAttribute('data-observation-count','2');
    await expect(page.locator('#image-observer-record')).toBeVisible();await expect(page.locator('#image-record-label')).toContainText('紀錄');
    const changed=await verifyGeometry();assert.deepEqual(changed.image,initial.image);assert.notDeepEqual(changed.current.out,changed.record.out);
    await expect(page.locator('#image-point-callout')).toBeVisible();await screenshot('desktop-comparison');
    await changePose();await verifyGeometry();
  });
  await t.test('右側實際畫布隨眼位重繪，有限鏡面裁切、前後遮擋及移除恢復一致',async()=>{
    async function raster(){return page.evaluate(()=>{
      const read=id=>{const c=document.getElementById(id),pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let hash=2166136261,opaque=0;for(let i=0;i<pixels.length;i++){hash=Math.imul(hash^pixels[i],16777619);if(i%4===3&&pixels[i]>200)opaque++;}return{hash:hash>>>0,opaque};};
      return{front:read('image-eye-front'),rear:read('image-eye-rear'),frame:document.querySelector('#image-eye-frame').getAttribute('d')};
    });}
    await person.press('End');const high=await raster();await person.press('Home');const low=await raster();
    for(const k of ['front','rear']){assert.notEqual(high[k].hash,low[k].hash);assert.ok(high[k].opaque>1000&&low[k].opaque>1000);}
    assert.notEqual(high.frame,low.frame);
    const mask=await page.evaluate(()=>{
      const front=document.querySelector('#image-eye-front'),rear=document.querySelector('#image-eye-rear');
      const a=front.getContext('2d').getImageData(0,0,800,1400).data,b=rear.getContext('2d').getImageData(0,0,800,1400).data;let overlap=0;
      for(let i=3;i<a.length;i+=4)if(a[i]>180&&b[i]>180)overlap++;
      return {overlap,clip:document.querySelector('#image-front-reflection').parentElement.getAttribute('clip-path'),order:!!(document.querySelector('#image-front-reflection').compareDocumentPosition(document.querySelector('#image-front-object'))&Node.DOCUMENT_POSITION_FOLLOWING)};
    });
    assert.ok(mask.overlap>0,'最低眼位有實物遮住鏡中像的實際不透明像素');assert.equal(mask.clip,'url(#image-eye-clip)');assert.equal(mask.order,true);
    await screenshot('linked-lowest');await toggle.click();const removed=await raster();assert.equal(removed.front.opaque,0);assert.equal(removed.rear.opaque,0);
    await toggle.click();assert.deepEqual(await raster(),low);await verifyGeometry();
    await person.press('End');await screenshot('linked-highest');
    await changePose();await screenshot('linked-comparison');
    const frames=await page.evaluate(()=>new Promise(resolve=>{
      const samples=[],began=performance.now();document.querySelector('#change-image-observer').click();
      const frame=()=>{const s=document.querySelector('#card-03'),v=document.querySelector('#image-front-view');samples.push([s.dataset.eyeY,v.dataset.eyeY,document.querySelector('#image-eye-frame').getAttribute('d')]);
        if(performance.now()-began<550)requestAnimationFrame(frame);else resolve(samples);};requestAnimationFrame(frame);
    }));
    assert.ok(new Set(frames.map(f=>f[0])).size>2,'換位動畫有多個中間眼位');
    assert.ok(new Set(frames.map(f=>f[2])).size>2,'右側鏡框在動畫中逐格重算');
    assert.ok(frames.every(f=>f[0]===f[1]),'每個動畫畫格左右眼位一致');
    await verifyGeometry();
  });
  await t.test('真實滑鼠拖動、逐格光路更新、上下邊界立即回調與取消捕捉',async()=>{
    await settle();let y=await eye(),start=await screenPoint(150,y),end=await screenPoint(150,y+(260-y)/.7);
    await page.mouse.move(start.x,start.y);await page.mouse.down();assert.equal(await person.evaluate(e=>e.hasPointerCapture(1)),true);
    await page.mouse.move(end.x,end.y,{steps:15});await expect.poll(eye).toBeCloseTo(260,4);await verifyGeometry();
    end=await screenPoint(150,600);await page.mouse.move(end.x,end.y,{steps:8});await expect.poll(eye).toBe(290);
    end=await screenPoint(150,598);await page.mouse.move(end.x,end.y);await expect.poll(eye).toBeCloseTo(288.6,4);
    end=await screenPoint(150,50);await page.mouse.move(end.x,end.y,{steps:15});await expect.poll(eye).toBe(90);
    end=await screenPoint(150,52);await page.mouse.move(end.x,end.y);await expect.poll(eye).toBeCloseTo(91.4,4);await verifyGeometry();
    await person.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();assert.equal(await person.evaluate(e=>e.hasPointerCapture(1)),false);
  });
  await t.test('三種寬度、單次及兩次觀察，共 30 次固定座標移除／放回',async()=>{
    for(const width of [1440,1280,768]){
      await page.setViewportSize({width,height:1100});
      for(const comparison of [false,true])for(let cycle=0;cycle<5;cycle++){
        await clearHistory();if(comparison)await changePose();
        await toggle.scrollIntoViewIfNeeded();await page.waitForTimeout(150);const b=await toggle.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
        const before=await eye();await page.mouse.click(x,y);for(const selector of objects)await expect(page.locator(selector)).toBeHidden();await expect(change).toBeDisabled();
        const removed=await toggle.boundingBox();close(removed.y,b.y,.5);close(removed.x,b.x,.5);
        await page.mouse.click(x,y);for(const selector of objects)await expect(page.locator(selector)).toBeVisible();await expect(change).toBeEnabled();await expect(section).toHaveAttribute('data-observation-count','1');close(await eye(),before);
      }
    }
  });
  await t.test('動畫中移除、快速連點與鍵盤操作不留下舊動畫',async()=>{
    await change.click();await toggle.click();const y=await eye();await page.waitForTimeout(600);close(await eye(),y);await toggle.click();
    await change.click();await change.click();await expect.poll(async()=>[108,270].includes(await eye())).toBe(true);await verifyGeometry();
    await person.press('End');await expect.poll(eye).toBe(90);await person.press('ArrowUp');await expect.poll(eye).toBe(90);
    await person.press('ArrowDown');await expect.poll(eye).toBe(94);await person.press('Home');await expect.poll(eye).toBe(290);await person.press('ArrowDown');await expect.poll(eye).toBe(290);await person.press('Shift+ArrowUp');await expect.poll(eye).toBe(278);
    await expect(person).toHaveAttribute('aria-valuenow','6');await verifyGeometry();
  });
  await t.test('1440／1280／1024／768／390 px：左右比例、實際畫面等距與無溢位',async()=>{
    for(const width of [1440,1280,1024,768,390]){
      await page.setViewportSize({width,height:1100});await clearHistory();await changePose();await section.scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      const a=await section.locator('.mirror-side-panel').boundingBox(),b=await section.locator('.mirror-front-panel').boundingBox();
      if(width>1050){assert.ok(a.width/b.width>1.85&&a.width/b.width<1.95);close(a.y,b.y,1);close(a.height,b.height,1);}else assert.ok(b.y>=a.y+a.height);
      await verifyGeometry();for(const button of [change,toggle]){const box=await button.boundingBox();assert.ok(box.width>=100&&box.height>=44);}
      if(width===390)await screenshot('mobile-comparison');
    }
    await page.setViewportSize({width:1440,height:1100});
  });
  await t.test('手機真實觸控拖動與固定座標恢復；減少動態直接換位置',async()=>{
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
    const mobile=await context.newPage();mobile.on('pageerror',e=>errors.push(e.message));
    try{
      await mobile.goto(url,{waitUntil:'networkidle'});await mobile.locator('#change-image-observer').tap();await expect(mobile.locator('#card-03')).toHaveAttribute('data-eye-y','270');
      await mobile.locator('#image-front-view[data-ready=true]').waitFor();await expect(mobile.locator('#image-front-view')).toHaveAttribute('data-eye-y','270');
      const svg=mobile.locator('#image-side-view');await svg.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await mobile.waitForTimeout(200);
      const point=async y=>svg.evaluate((e,y)=>{const p=new DOMPoint(150,y).matrixTransform(e.getScreenCTM());return{x:p.x,y:p.y};},y);
      const start=await point(270),end=await point(270+(160-270)/.7),session=await context.newCDPSession(mobile);
      assert.equal(await mobile.evaluate(p=>document.elementFromPoint(p.x,p.y)?.closest('#image-observer')?.id,start),'image-observer');
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:7}]});
      for(let j=1;j<=12;j++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*j/12,y:start.y+(end.y-start.y)*j/12,id:7}]});
      await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect.poll(async()=>+await mobile.locator('#card-03').getAttribute('data-eye-y')).toBeCloseTo(160,3);
      await expect(mobile.locator('#card-03')).toHaveAttribute('data-recorded-y','270');await expect(mobile.locator('#image-side-virtual')).toBeVisible();
      assert.ok(Math.abs(+await mobile.locator('#image-front-view').getAttribute('data-eye-y')-160)<.001);
      const button=mobile.locator('#toggle-image-object');await button.scrollIntoViewIfNeeded();await mobile.waitForTimeout(150);const b=await button.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
      await mobile.touchscreen.tap(x,y);await expect(mobile.locator('#image-side-virtual')).toBeHidden();await mobile.touchscreen.tap(x,y);for(const selector of objects)await expect(mobile.locator(selector)).toBeVisible();
      await mobile.locator('#change-image-observer').tap();await mobile.locator('#card-03').screenshot({path:'/tmp/unit1-card3-observer/mobile-touch.png'});
      assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }finally{await context.close();}
  });
  await t.test('相鄰第四區保持獨立，所有素材及離頁無程式例外',async()=>{
    await changePose();const before=await verifyGeometry();await page.locator('#object-distance').fill('20');await page.locator('#object-distance').dispatchEvent('input');await expect(page.locator('#image-distance-value')).toHaveText('20 cm');
    assert.deepEqual((await verifyGeometry()).image,before.image);await page.goto('about:blank');await page.waitForTimeout(200);assert.deepEqual(errors,[]);
  });
});
