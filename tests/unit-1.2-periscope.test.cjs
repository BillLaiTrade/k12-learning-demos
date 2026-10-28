const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const {expect}=require('playwright/test');
const root=path.resolve(__dirname,'..');
const asset=path.join(root,'units/1/parts/1.2/assets');
const close=(a,b,e=1e-7)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);

test('潛望鏡有限鏡面、管壁與反向傳播',async t=>{
  const {OPTICS,mirror,traceRay,viewRay,exteriorSample,observe,returnSignal,traceSightline}=await import(pathToFileURL(path.join(asset,'periscope-optics.mjs')));
  const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);
  await t.test('36×36 組鏡面角度：反射分量、有限尺寸及閉合管道',()=>{
    let walls=0,outside=0;
    for(let a=30;a<=65;a++)for(let b=30;b<=65;b++) {
      const ray=viewRay(0,0,[a,b]);
      if(ray.kind==='blocked')walls++;else outside++;
      for(const hit of ray.hits){
        close(Math.hypot(...hit.incident),1);close(Math.hypot(...hit.reflected),1);
        close(dot(hit.incident,hit.normal),-dot(hit.reflected,hit.normal));
        const m=mirror(hit.index,[a,b][hit.index]);
        close(dot(hit.incident,m.tangent),dot(hit.reflected,m.tangent));
        assert.ok(Math.abs(dot(hit.point.map((n,i)=>n-m.center[i]),m.tangent))<=60+1e-7);
        assert.ok(Math.abs(hit.point[2])<=OPTICS.mirrorDepth+1e-7);
      }
      if(ray.kind==='outside'){const p=ray.points.at(-1);close(p[0],508);assert.ok(p[1]>=155-1e-7&&p[1]<=225+1e-7);assert.ok(ray.direction[0]<0);}
      // Every pre-exit point stays in the sealed vertical/horizontal channel.
      for(let i=1;i<ray.points.length;i++)for(let s=0;s<=10;s++){
        const p=ray.points[i-1].map((n,j)=>n+(ray.points[i][j]-n)*s/10),[x,y]=p;
        assert.ok((x>=508-1e-7&&x<=622+1e-7&&y>=128-1e-7&&y<=652+1e-7)||(x>=622-1e-7&&x<=765+1e-7&&y>=555-1e-7&&y<=625+1e-7));
      }
    }
    assert.ok(walls>0&&outside>0);
  });
  await t.test('船、海面、天空、完全與局部遮擋；離軸視線不穿透管壁',()=>{
    assert.equal(observe([45,45]).kind,'boat');assert.equal(observe([45,45]).target,true);
    assert.equal(observe([39,45]).kind,'sea');assert.equal(observe([51,45]).kind,'sky');
    assert.equal(observe([38,51]).kind,'blocked');assert.equal(observe([45,55]).kind,'blocked');
    const good=observe([45,45]);assert.ok(good.clear>0&&good.blocked>0);
    assert.equal(viewRay(0,0,[45,45]).kind,'outside');assert.equal(viewRay(20,0,[45,45]).kind,'blocked');
    close(exteriorSample(viewRay(0,0,[45,45])).y,190);
    assert.equal(returnSignal([45,45]).receiver,true);assert.equal(returnSignal([39,45]).receiver,false);
  });
  await t.test('1296 組角度的提示一律從眼睛出發，內部與觀察窗中央視線重合',()=>{
    for(let a=30;a<=65;a++)for(let b=30;b<=65;b++){
      const r=traceSightline([a,b]),v=traceRay(OPTICS.eye,[-1,0,0],[a,b]);
      assert.deepEqual(r.points[0],OPTICS.eye);assert.deepEqual(r.points.slice(0,v.points.length),v.points);assert.deepEqual(r.hits,v.hits);
      if(v.kind==='blocked'){assert.equal(r.points.length,v.points.length);assert.equal(r.destination,'wall');}
      if(v.kind==='outside'){
        const p=v.points.at(-1),e=r.points.at(-1),d=v.direction;
        close((e[0]-p[0])*d[1]-(e[1]-p[1])*d[0],0);
        assert.ok(e[0]>=-1e-7&&e[0]<=508+1e-7&&e[1]>=-1e-7&&e[1]<=250+1e-7);
        assert.ok(e[0]<p[0]);assert.equal(r.points.length,v.points.length+1);
      }
    }
    const blocked=traceSightline([38,51]);assert.deepEqual(blocked.hits.map(h=>h.index),[1]);assert.equal(blocked.destination,'wall');
    const good=traceSightline([45,45]);assert.deepEqual(good.hits.map(h=>h.index),[1,0]);assert.equal(good.destination,'boat');close(good.points.at(-1)[1],190);
    assert.equal(traceSightline([39,45]).destination,'sea');close(traceSightline([39,45]).points.at(-1)[1],250);
    assert.equal(traceSightline([51,45]).destination,'sky');
  });
  await t.test('整束提示只短暫亮起與淡出，沒有循環或移動光段',async()=>{
    const {FLASH_MS,STATIC_FLASH_MS,REST_MS,pulseOpacity}=await import(pathToFileURL(path.join(asset,'periscope-pulse.mjs')));
    assert.equal(FLASH_MS,950);assert.equal(STATIC_FLASH_MS,700);assert.ok(REST_MS>=1000);
    close(pulseOpacity(-1),0);close(pulseOpacity(0),0);close(pulseOpacity(80),1);close(pulseOpacity(650),1);
    assert.ok(pulseOpacity(800)>0&&pulseOpacity(800)<1);close(pulseOpacity(FLASH_MS),0);close(pulseOpacity(FLASH_MS+5000),0);
    for(let ms=0;ms<STATIC_FLASH_MS;ms++)close(pulseOpacity(ms,true),1);
    close(pulseOpacity(STATIC_FLASH_MS,true),0);close(pulseOpacity(9000,true),0);
  });
  await t.test('441 條不同入眼方向的視線，各自獨立反向反射後回到眼睛',()=>{
    let checked=0;
    for(let h=-5;h<=5;h+=.5)for(let v=-5;v<=5;v+=.5){
      const r=viewRay(h,v,[45,45]);if(r.kind!=='outside')continue;
      const end=r.points.at(-1),d=r.direction.map(n=>-n),start=end.map((n,i)=>n+d[i]*1e-4);
      const f=traceRay(start,d,[45,45]);assert.equal(f.kind,'eye');
      assert.deepEqual(f.hits.map(h=>h.index),[0,1]);
      f.hits.forEach((hit,i)=>hit.point.forEach((n,j)=>close(n,r.hits[1-i].point[j])));
      // The returning ray passes exactly through the original eye before exit.
      const a=f.points.at(-2),q=f.direction,dx=OPTICS.eye[0]-a[0];
      close(a[1]+dx/q[0]*q[1],OPTICS.eye[1]);close(a[2]+dx/q[0]*q[2],0);
      checked++;
    }
    assert.ok(checked>150);
  });
});

test('潛望鏡實際操作、畫面與三階段評量',{timeout:180000},async t=>{
  const server=spawn('python',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:root,stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(new Error('server timeout')),5000);server.stdout.on('data',d=>{out+=d;const m=out.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  const url=`http://127.0.0.1:${port}/units/1/parts/1.2/#unit-quiz`;
  await page.goto(url,{waitUntil:'networkidle'});const quiz=page.locator('#unit-quiz');await expect(quiz).toHaveAttribute('data-ready','true');
  const angles=async()=>JSON.parse('['+await quiz.getAttribute('data-angles')+']');
  async function setAngle(i,n){
    await page.locator(`#periscope-mirror-${i}`).evaluate((el,n)=>{el.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));for(let s=30;s<n-.01;s+=.5)el.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));},n);
    await expect.poll(async()=>(await angles())[i]).toBe(n);
  }
  async function settled(){await page.locator('#periscope-scene').evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await expect.poll(async()=>{const a=await page.locator('#periscope-scene').boundingBox();await page.waitForTimeout(100);const b=await page.locator('#periscope-scene').boundingBox();return Math.abs(a.y-b.y)<.5;}).toBe(true);}
  async function handlePoint(i,angle){return page.locator('#periscope-scene').evaluate((el,{i,angle})=>{const c=[565,i===0?190:590],a=angle*Math.PI/180,p=new DOMPoint(c[0]+60*Math.cos(a),c[1]+60*Math.sin(a)).matrixTransform(el.getScreenCTM());return{x:p.x,y:p.y};},{i,angle});}
  async function drag(i,angle){
    await settled();
    // 重新載入或重新排版後，等待實際畫面命中區與 SVG 幾何同步。
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const a=(await angles())[i],g=page.locator(`#periscope-mirror-${i}`);
    await expect.poll(async()=>{
      const p=await handlePoint(i,a);
      return page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.closest('.mirror-drag')?.id,p);
    }).toBe(`periscope-mirror-${i}`);
    const p=await handlePoint(i,a),q=await handlePoint(i,a+(angle-a)/.35);
    await page.mouse.move(p.x,p.y);await page.mouse.down();
    assert.equal(await g.evaluate(el=>el.hasPointerCapture(1)),true,'mouse must hit actual mirror');
    await page.mouse.move(q.x,q.y,{steps:12});await page.mouse.up();
    await expect.poll(async()=>Math.abs((await angles())[i]-angle)<.2).toBe(true);
  }
  async function firstPass(){await setAngle(0,45);await setAngle(1,45);await page.locator('#periscope-check').click();await expect(quiz).toHaveAttribute('data-completed','true,false,false');}

  await t.test('初始狀態、未作答、未對準不通關；沒有角度滑桿',async()=>{
    assert.deepEqual(await angles(),[38,51]);await expect(quiz).toHaveAttribute('data-view','blocked');
    assert.deepEqual(await page.locator('#periscope-scene text').allTextContents(),['鏡面一','鏡面二']);
    assert.equal(await page.locator('#periscope-scene title').count(),0);
    await expect(page.locator('#periscope-scene')).toHaveAttribute('aria-label','潛望鏡剖面與可旋轉平面鏡');
    assert.equal(await page.locator('#periscope-scene desc').count(),1);
    assert.equal(await quiz.locator('input[type=range]').count(),0);assert.equal(await page.locator('#periscope-toggle-path').count(),0);assert.equal(await page.locator('#periscope-pulse').getAttribute('aria-pressed'),null);await expect(page.locator('[data-stage="1"]')).toBeDisabled();
    await page.locator('#periscope-check').click();await expect(page.locator('#periscope-feedback')).toHaveAttribute('data-state','try');
    assert.equal(await page.locator('.route a[href="#unit-quiz"] .route-number').textContent(),'✦');assert.equal(await page.locator('#card-07').count(),1);
  });
  await t.test('兩片鏡子拖曳靈敏度為原本 35%，碰邊界可立即回調，穿過中心不跳動',async()=>{
    for(const i of [0,1]){
      const g=page.locator(`#periscope-mirror-${i}`);
      await setAngle(i,45);await settled();
      let p=await handlePoint(i,45),q=await handlePoint(i,65);
      await page.mouse.move(p.x,p.y);await page.mouse.down();
      assert.equal(await g.evaluate(el=>el.hasPointerCapture(1)),true);
      await page.mouse.move(q.x,q.y,{steps:12});await expect.poll(async()=>(await angles())[i]).toBe(52);
      await page.mouse.move(p.x,p.y,{steps:12});await expect.poll(async()=>(await angles())[i]).toBe(45);
      await page.mouse.up();
      for(const [initial,pointerEnd,limit,pointerBack,expected] of [[64,84,65,82,64.3],[31,11,30,13,30.7]]){
        await setAngle(i,initial);await settled();p=await handlePoint(i,initial);q=await handlePoint(i,pointerEnd);
        await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(q.x,q.y,{steps:12});
        await expect.poll(async()=>(await angles())[i]).toBe(limit);
        q=await handlePoint(i,pointerBack);await page.mouse.move(q.x,q.y,{steps:4});
        await expect.poll(async()=>(await angles())[i]).toBe(expected);await page.mouse.up();
      }
      await setAngle(i,45);await settled();p=await handlePoint(i,45);
      const center=await page.locator('#periscope-scene').evaluate((el,i)=>{const p=new DOMPoint(565,i===0?190:590).matrixTransform(el.getScreenCTM());return{x:p.x,y:p.y};},i);
      await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(center.x,center.y);
      q=await handlePoint(i,225);await page.mouse.move(q.x,q.y);assert.equal((await angles())[i],45);
      q=await handlePoint(i,245);await page.mouse.move(q.x,q.y,{steps:8});await expect.poll(async()=>(await angles())[i]).toBe(52);
      await page.mouse.up();await setAngle(i,45);
    }
  });
  await t.test('兩片鏡子實際拖曳；天空／海面連續改變，偏太多會被擋',async()=>{
    await drag(1,45);await drag(0,45);await expect(quiz).toHaveAttribute('data-target','true');
    await page.locator('#periscope-view').screenshot({path:'/tmp/periscope-review/view-boat.png'});
    const boat=await page.locator('#periscope-view').evaluate(c=>c.toDataURL());
    await drag(0,51);await expect(quiz).toHaveAttribute('data-view','sky');await page.locator('#periscope-view').screenshot({path:'/tmp/periscope-review/view-sky.png'});
    assert.notEqual(await page.locator('#periscope-view').evaluate(c=>c.toDataURL()),boat);
    await drag(0,39);await expect(quiz).toHaveAttribute('data-view','sea');await page.locator('#periscope-view').screenshot({path:'/tmp/periscope-review/view-sea.png'});
    await drag(1,55);await expect(quiz).toHaveAttribute('data-view','blocked');await page.locator('#periscope-view').screenshot({path:'/tmp/periscope-review/view-blocked.png'});
    await setAngle(1,45);await setAngle(0,45);
  });
  await t.test('觀察窗像素由獨立完整三維視線核對；暗邊確實來自遮擋',async()=>{
    for(const a of [[45,45],[51,45],[39,45],[45,55]]){
      await setAngle(0,a[0]);await setAngle(1,a[1]);
      const result=await page.evaluate(async()=>{
        const {viewRay,exteriorSample,OPTICS}=await import('./assets/periscope-optics.mjs');
        const img=new Image();img.src='./assets/periscope/submarine-scene.webp';await img.decode();
        const c=document.createElement('canvas');c.width=900;c.height=760;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,900,760);const texture=ctx.getImageData(0,0,900,760).data;
        const canvas=document.querySelector('#periscope-view'),n=canvas.width,pixels=canvas.getContext('2d').getImageData(0,0,n,n).data,angles=document.querySelector('#unit-quiz').dataset.angles.split(',').map(Number);
        let checked=0,blocked=0,maxError=0;
        for(const y of [25,60,100,120,160,200])for(const x of [25,60,100,120,160,200]){
          const nx=2*(x+.5)/n-1,ny=2*(y+.5)/n-1;if(nx*nx+ny*ny>.85)continue;
          const r=viewRay(nx*OPTICS.field,ny*OPTICS.field,angles),s=exteriorSample(r),k=(y*n+x)*4;
          if(!s){blocked++;if(pixels[k]>40||pixels[k+1]>45||pixels[k+2]>50)throw Error('blocked pixel shows exterior');continue;}
          let sx=Math.round(Math.max(0,Math.min(430,s.x))),sy=s.y;if(sy>250)sy=250+(sy-250)%22;sy=Math.round(Math.max(4,Math.min(275,sy)));const q=(sy*900+sx)*4,v=1-Math.max(0,Math.hypot(nx,ny)-.72)*.6;
          for(let channel=0;channel<3;channel++)maxError=Math.max(maxError,Math.abs(pixels[k+channel]-texture[q+channel]*[.94,.97,.98][channel]*v));checked++;
        }
        return {checked,blocked,maxError};
      });
      assert.ok(result.maxError<3,JSON.stringify({a,...result}));assert.ok(result.checked+result.blocked>15);
    }
  });
  await t.test('第一關只檢查實際對準：沒有順序題，角度不對不能通過，改動設計須重檢',async()=>{
    assert.equal(await page.locator('#periscope-question-0,.periscope-order,[data-chip],[data-slot],#periscope-clear-order').count(),0);
    await setAngle(0,45);await setAngle(1,55);await page.locator('#periscope-check').click();await expect(quiz).toHaveAttribute('data-completed','false,false,false');
    await setAngle(1,45);await page.locator('#periscope-check').click();await expect(quiz).toHaveAttribute('data-completed','true,false,false');
    await expect(page.locator('[data-stage="1"]')).toBeEnabled();
    await setAngle(0,46);await expect(quiz).toHaveAttribute('data-completed','false,false,false');await expect(page.locator('[data-stage="1"]')).toBeDisabled();await firstPass();
  });
  await t.test('修復任務只靠實際旋轉鏡片通關，沒有選擇題或延伸問題',async()=>{
    await page.locator('#periscope-pulse').click();await expect(quiz).toHaveAttribute('data-pulse-status','running');
    await page.locator('#periscope-next').click();await expect(quiz).toHaveAttribute('data-pulse-status','idle');await expect(page.locator('#periscope-light')).toBeEmpty();await expect(quiz).toHaveAttribute('data-phase','1');await expect(quiz).toHaveAttribute('data-view','sky');
    assert.equal(await page.locator('#periscope-question-1,[data-diagnosis],.periscope-next-lesson').count(),0);
    await expect(page.locator('#periscope-task-copy')).not.toContainText('判斷');
    await expect(page.locator('#periscope-feedback')).not.toContainText('判斷');
    await quiz.screenshot({path:'/tmp/periscope-review/repair-desktop.png'});
    await page.locator('#periscope-check').click();await expect(quiz).toHaveAttribute('data-completed','true,false,false');
    await drag(0,39);await page.locator('#periscope-check').click();await expect(quiz).toHaveAttribute('data-completed','true,false,false');
    await drag(0,45);await page.locator('#periscope-check').click();await expect(quiz).toHaveAttribute('data-completed','true,true,false');
    await drag(0,46);await expect(quiz).toHaveAttribute('data-completed','true,false,false');await expect(page.locator('[data-stage="2"]')).toBeDisabled();
    await drag(0,45);await page.locator('#periscope-check').click();await expect(quiz).toHaveAttribute('data-completed','true,true,false');
  });
  await t.test('反向訊號、原路重合、先預測後驗證；三階段完成',async()=>{
    await page.locator('#periscope-pulse').click();await expect(quiz).toHaveAttribute('data-pulse-status','running');
    await page.locator('#periscope-next').click();await expect(quiz).toHaveAttribute('data-pulse-status','idle');await expect(quiz).toHaveAttribute('data-phase','2');await expect(page.locator('#periscope-signal')).toBeDisabled();await expect(page.locator('#periscope-signal-source')).toBeVisible();await expect(page.locator('.periscope-footer #periscope-check')).toBeVisible();
    const before=await angles();await page.locator('#periscope-mirror-0').dispatchEvent('keydown',{key:'ArrowRight'});assert.deepEqual(await angles(),before);
    await page.locator('[data-prediction="inside"]').click();await page.locator('#periscope-signal').click();await page.locator('#periscope-check').click();await expect(quiz).toHaveAttribute('data-completed','true,true,false');
    await page.locator('[data-prediction="same"]').click();await page.locator('#periscope-check').click();await expect(quiz).toHaveAttribute('data-completed','true,true,false');
    await page.locator('#periscope-signal').click();
    await page.waitForTimeout(2200);await expect(page.locator('#periscope-light .light-line')).toHaveCount(1);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    await expect(page.locator('#periscope-light .light-line')).toHaveCount(1);
    const paths=await page.evaluate(()=>{const first=id=>document.querySelector(id+' .light-line').getAttribute('d');return{forward:first('#periscope-recorded'),back:first('#periscope-light')};});
    const points=d=>d.slice(1).split('L').map(s=>s.split(',').map(Number));assert.deepEqual(points(paths.forward),points(paths.back).reverse());
    await page.locator('#periscope-check').click();await expect(quiz).toHaveAttribute('data-completed','true,true,true');await expect(page.locator('#periscope-complete')).toBeVisible();
    await quiz.screenshot({path:'/tmp/periscope-review/completed-desktop.png'});
    assert.equal(await page.locator('#periscope-restart').count(),0);
    // 重新載入只用於隔離後續測試；產品不提供整份重來控制。
    await page.reload({waitUntil:'networkidle'});await expect(quiz).toHaveAttribute('data-ready','true');assert.deepEqual(await angles(),[38,51]);await expect(quiz).toHaveAttribute('data-phase','0');await expect(quiz).toHaveAttribute('data-completed','false,false,false');await expect(page.locator('[data-stage="1"]')).toBeDisabled();
  });
  await t.test('只保留畫面拖曳操作，沒有獨立微調列或按鈕',async()=>{
    assert.equal(await page.locator('#periscope-fine,[data-fine]').count(),0);
    await expect(page.locator('#periscope-drag-help')).toHaveText('抓住鏡片端點，直接拖曳旋轉。');
    await setAngle(0,45);await drag(0,47);await drag(0,45);
  });
  await t.test('五種實際角度：提示都從觀察口開始，錯誤時不跳接到船或上方鏡片',async()=>{
    const button=page.locator('#periscope-pulse');
    await expect(button.locator('.periscope-pulse-label')).toHaveText('追蹤目前視線');
    for(const [a,b] of [[38,51],[45,45],[39,45],[51,45],[45,55]]){
      await setAngle(0,a);await setAngle(1,b);await expect(button).toBeEnabled();await button.click();
      await expect.poll(async()=>Number(await page.locator('#periscope-light').getAttribute('data-opacity'))>.95).toBe(true);
      const d=await page.locator('#periscope-light .light-line').getAttribute('d'),points=d.slice(1).split('L').map(p=>p.split(',').map(Number));
      assert.deepEqual(points[0],[755,590]);assert.deepEqual(points[1],[565,590]);
      if(b!==45){assert.equal(points.length,3);assert.ok(points.at(-1)[1]>250);}
      if(a===39&&b===45)close(points.at(-1)[1],250);
      if(a===51&&b===45)close(points.at(-1)[0],0);
      await expect(quiz).toHaveAttribute('data-pulse-status','cooldown');await expect(page.locator('#periscope-light')).toBeEmpty();await expect(button).toBeEnabled();
    }
  });
  await t.test('整條實際光路短暫亮起再熄滅，沒有箭頭、移動光點或常駐路線',async()=>{
    await setAngle(0,45);await setAngle(1,45);
    const button=page.locator('#periscope-pulse');await expect(button).toBeEnabled();await button.click();
    await expect(quiz).toHaveAttribute('data-pulse-status','running');const id=await quiz.getAttribute('data-pulse-id');
    await expect(button).toBeDisabled();
    await button.evaluate(el=>{for(let i=0;i<10;i++)el.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
    assert.equal(await quiz.getAttribute('data-pulse-id'),id);
    await expect.poll(async()=>Number(await page.locator('#periscope-light').getAttribute('data-opacity'))>.95).toBe(true);
    const first=await page.locator('#periscope-light .light-line').getAttribute('d');
    const length=await page.locator('#periscope-light .light-line').evaluate(el=>el.getTotalLength());assert.ok(length>900);
    const expected=await page.evaluate(async()=>{const {traceSightline}=await import('./assets/periscope-optics.mjs?v=2');const r=traceSightline(document.querySelector('#unit-quiz').dataset.angles.split(',').map(Number));return 'M'+r.points.map(p=>p.slice(0,2).map(n=>n.toFixed(2)).join(',')).join('L');});
    assert.ok(first.startsWith('M755.00,590.00L'));assert.ok(first.endsWith('200.67,190.00'));
    assert.equal(first,expected);assert.equal(await page.locator('#periscope-light .light-arrow').count(),0);assert.equal(await page.locator('#periscope-light circle').count(),0);assert.equal(await page.locator('#periscope-block-marker').count(),0);
    await page.waitForTimeout(180);assert.equal(await page.locator('#periscope-light .light-line').getAttribute('d'),first);
    await expect(quiz).toHaveAttribute('data-pulse-status','cooldown');await expect(page.locator('#periscope-light')).toBeEmpty();await expect(page.locator('#periscope-normal')).toHaveCount(0);
    await expect(button).toBeDisabled();await expect(button).toBeEnabled();await expect(quiz).toHaveAttribute('data-pulse-status','idle');
  });
  await t.test('拖動或鏡片方向鍵操作立即收起提示光，後續重繪不留下舊路線',async()=>{
    const button=page.locator('#periscope-pulse');await button.click();await expect(quiz).toHaveAttribute('data-pulse-status','running');
    await drag(0,44);await expect(page.locator('#periscope-light')).toBeEmpty();await expect(quiz).toHaveAttribute('data-pulse-status','cooldown');
    await page.waitForTimeout(350);await expect(page.locator('#periscope-light')).toBeEmpty();
    await expect(button).toBeEnabled();await button.click();await page.locator('#periscope-mirror-0').press('ArrowRight');await expect(page.locator('#periscope-light')).toBeEmpty();
    await expect(button).toBeEnabled();
  });
  await t.test('移除額外提示與分關重設；視線追蹤撞壁仍有短暫光斑',async()=>{
    assert.equal(await page.locator('#periscope-hint,#periscope-hint-copy,#periscope-reset-stage,#periscope-normal,#periscope-restart').count(),0);
    const button=page.locator('#periscope-pulse');await expect(button).toBeEnabled();
    await expect(page.locator('.periscope-view #periscope-pulse')).toBeVisible();await expect(page.locator('#periscope-signal-controls')).toBeHidden();
    await setAngle(0,38);await setAngle(1,51);await button.click();
    await expect.poll(async()=>Number(await page.locator('#periscope-light').getAttribute('data-opacity'))>.95).toBe(true);await expect(page.locator('.periscope-wall-spot')).toBeVisible();
    const at=await page.locator('.periscope-wall-spot circle').last().evaluate(e=>[+e.getAttribute('cx'),+e.getAttribute('cy')]);
    const hit=await page.evaluate(async()=>{const {traceRay,OPTICS}=await import('./assets/periscope-optics.mjs?v=2');return traceRay(OPTICS.eye,[-1,0,0],document.querySelector('#unit-quiz').dataset.angles.split(',').map(Number)).points.at(-1).slice(0,2);});at.forEach((n,i)=>close(n,hit[i]));
    assert.equal(await page.locator('#periscope-light .light-arrow').count(),0);assert.equal(await page.locator('#periscope-block-marker').count(),0);
    await expect(quiz).toHaveAttribute('data-pulse-status','cooldown');await expect(page.locator('.periscope-wall-spot')).toHaveCount(0);await expect(button).toBeEnabled();
  });
  await t.test('減少動態以短暫靜態全光路呈現；換關取消舊淡出與計時器',async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});await setAngle(0,45);await setAngle(1,45);
    const button=page.locator('#periscope-pulse');await button.click();await expect(page.locator('#periscope-light')).toHaveAttribute('data-opacity','1');
    const d=await page.locator('#periscope-light .light-line').getAttribute('d');await page.waitForTimeout(150);assert.equal(await page.locator('#periscope-light .light-line').getAttribute('d'),d);
    await expect(quiz).toHaveAttribute('data-pulse-status','cooldown');await expect(page.locator('#periscope-light')).toBeEmpty();await expect(button).toBeEnabled();
    await page.emulateMedia({reducedMotion:'no-preference'});await firstPass();await button.click();await page.locator('#periscope-next').click();await expect(quiz).toHaveAttribute('data-pulse-status','idle');await expect(page.locator('#periscope-light')).toBeEmpty();
    await page.locator('[data-stage="0"]').click();await button.click();await page.waitForTimeout(250);await expect(quiz).toHaveAttribute('data-pulse-status','running');await expect(quiz).toHaveAttribute('data-pulse-status','cooldown');await expect(button).toBeEnabled();
  });
  await t.test('鍵盤邊界與取消拖曳不會留下卡住狀態',async()=>{
    await setAngle(0,30);await page.locator('#periscope-mirror-0').press('ArrowLeft');assert.equal((await angles())[0],30);await page.locator('#periscope-mirror-0').press('End');await expect.poll(async()=>(await angles())[0]).toBe(65);await page.locator('#periscope-mirror-0').press('ArrowRight');assert.equal((await angles())[0],65);
    await settled();const a=await handlePoint(0,65);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.locator('#periscope-mirror-0').dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();await drag(0,45);
  });
  await t.test('1440／1280／1024／768／390 px 版面、素材與鄰區操作',async()=>{
    await setAngle(0,45);await setAngle(1,45);await expect(page.locator('#periscope-light')).toBeEmpty();
    for(const width of [1440,1280,1024,768,390]){
      await page.setViewportSize({width,height:1000});await quiz.scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} overflow`);
      const scene=await page.locator('#periscope-scene').boundingBox(),panel=await page.locator('.periscope-view').boundingBox();
      const cutaway=await page.locator('.periscope-cutaway').boundingBox();
      assert.ok(scene.width>240&&panel.width>100);
      assert.ok(Math.abs(cutaway.height-scene.height)<=2.1,'scene must not stretch into empty background');
      const button=await page.locator('#periscope-pulse').boundingBox(),copy=await page.locator('#periscope-view-copy').boundingBox();
      assert.ok(button.x>=panel.x&&button.x+button.width<=panel.x+panel.width+1&&button.y>=copy.y+copy.height&&button.y+button.height<=panel.y+panel.height,`${width} button must be inside observation panel below copy`);
      assert.ok(button.height>=60&&button.height<=80&&button.width>=130);
      assert.equal(await page.locator('#periscope-pulse svg,.periscope-pulse-icon').count(),0);
      const check=await page.locator('#periscope-design-action #periscope-check').boundingBox();
      assert.ok(check.y>button.y+button.height&&check.x>=panel.x&&check.x+check.width<=panel.x+panel.width+1&&check.y+check.height<=panel.y+panel.height,`${width} check button must sit below trace inside observation panel`);
      assert.equal(await page.locator('.periscope-pulse-button').evaluate(e=>getComputedStyle(e).cursor),'pointer');
      const hide=await page.addStyleTag({content:'.route{visibility:hidden!important}'});
      if(width===1440)await quiz.screenshot({path:'/tmp/periscope-review/desktop.png'});
      if(width===390)await quiz.screenshot({path:'/tmp/periscope-review/mobile.png'});
      await hide.evaluate(el=>el.remove());
    }
    await page.setViewportSize({width:1440,height:1100});await page.locator('#reverse-toggle-a').click();await expect(page.locator('#card-06')).toHaveAttribute('data-light-a','on');
    await page.locator('#reverse-toggle-a').click();
  });
  await t.test('真實觸控拖曳完成第一關，沒有額外填答與頁面溢位',async()=>{
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});const p=await context.newPage();await p.goto(url,{waitUntil:'networkidle'});await expect(p.locator('#unit-quiz')).toHaveAttribute('data-ready','true');
    const scene=p.locator('#periscope-scene'),session=await context.newCDPSession(p);
    await scene.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await expect.poll(async()=>{const a=await scene.boundingBox();await p.waitForTimeout(100);const b=await scene.boundingBox();return Math.abs(a.y-b.y)<.5;}).toBe(true);
    const position=async(i,angle)=>scene.evaluate((el,{i,angle})=>{const a=angle*Math.PI/180,pt=new DOMPoint(565+60*Math.cos(a),(i===0?190:590)+60*Math.sin(a)).matrixTransform(el.getScreenCTM());return{x:pt.x,y:pt.y};},{i,angle});
    await p.locator('#periscope-pulse').tap();await expect(p.locator('#unit-quiz')).toHaveAttribute('data-pulse-status','running');await scene.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(150);
    const a=await position(0,38),b=await position(0,48);assert.equal(await p.evaluate(pt=>document.elementFromPoint(pt.x,pt.y)?.closest('.mirror-drag')?.id,a),'periscope-mirror-0');
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x,y:a.y,id:7}]});
    for(let j=1;j<=8;j++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*j/8,y:a.y+(b.y-a.y)*j/8,id:7}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect.poll(async()=>Number((await p.locator('#unit-quiz').getAttribute('data-angles')).split(',')[0])).toBe(41.5);
    await expect(p.locator('#periscope-light')).toBeEmpty();assert.equal(await p.locator('#periscope-question-0,[data-chip],[data-slot]').count(),0);
    for(const [i,from,to,id] of [[0,41.5,45,8],[1,51,45,9]]){
      const start=await position(i,from),end=await position(i,from+(to-from)/.35);
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start.x,y:start.y,id}]});
      for(let j=1;j<=8;j++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*j/8,y:start.y+(end.y-start.y)*j/8,id}]});
      await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }
    await expect(p.locator('#unit-quiz')).toHaveAttribute('data-angles','45,45');await p.locator('#periscope-check').tap();await expect(p.locator('#unit-quiz')).toHaveAttribute('data-completed','true,false,false');
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await context.close();
  });
  await t.test('離開頁面時先釋放 GPU 資源，再關閉繪圖器，不產生例外',async()=>{await page.goto('about:blank');await page.waitForTimeout(150);assert.deepEqual(errors,[]);});
  assert.deepEqual(errors,[]);
});
