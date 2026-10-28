const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const {expect}=require('playwright/test');
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const vector=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const unit=a=>{const length=Math.hypot(...a);return a.map(v=>v/length);};
const artifacts='/tmp/unit1-card3-comparison';
let model;

test('第三區光學：反射、瞳孔光束與真實對照熊等效',async t=>{
  model=await import(pathToFileURL(path.resolve(__dirname,'../units/1/parts/1.2/assets/mirror-comparison.mjs')));
  const {COMPARISON:s,comparisonRay,pupilBundle,comparisonCamera,project,quad,planePoint,VIEW_PLANES,clipNear}=model;
  await t.test('81 個瞳孔位置獨立核對三維反射向量及直達方向',()=>{
    near(s.mirrorX-s.source[0],s.image[0]-s.mirrorX);assert.deepEqual(s.image,[735,440,0]);
    for(let y=-2;y<=2;y+=.5)for(let z=-2;z<=2;z+=.5){
      const eye=s.eye.map((v,i)=>v+(i===1?y:i===2?z:0)),r=comparisonRay(eye);
      const incoming=unit(vector(r.hit,s.source)),reflected=[-incoming[0],incoming[1],incoming[2]],out=unit(vector(eye,r.hit)),direct=unit(vector(eye,s.image));
      reflected.forEach((v,i)=>near(v,out[i]));out.forEach((v,i)=>near(v,direct[i]));
      near(r.hit[0],540);assert.ok(r.hit[1]>=68&&r.hit[1]<=570&&Math.abs(r.hit[2])<170);
      const cosineIn=incoming[0],cosineOut=-out[0];near(cosineIn,cosineOut);
      // 展開鏡面後的總光程等於由對照物點直達同一瞳孔的距離。
      near(Math.hypot(...vector(r.hit,s.source))+Math.hypot(...vector(eye,r.hit)),Math.hypot(...vector(eye,s.image)));
      const bear=s.sideBear;for(let x=bear.x;x<=bear.x+bear.width;x+=2){const u=(x-r.hit[0])/(eye[0]-r.hit[0]);assert.ok(r.hit[1]+u*(eye[1]-r.hit[1])<bear.y);}
    }
    const bundle=pupilBundle();assert.equal(bundle.length,3);assert.notDeepEqual(bundle[0].eye,bundle[2].eye);assert.notDeepEqual(bundle[0].hit,bundle[2].hit);
  });
  await t.test('反射光與直達光從真實物點出發，虛像只作反向延長位置',()=>{
    for(const ray of pupilBundle()){
      assert.deepEqual(ray.reflected[0],s.source);assert.deepEqual(ray.direct[0],s.image);
      assert.deepEqual(ray.reflected.at(-1),ray.eye);assert.deepEqual(ray.direct.at(-1),ray.eye);
      assert.deepEqual(ray.extension,[ray.hit,s.image]);
      assert.notDeepEqual(ray.reflected[0],ray.eye);assert.notDeepEqual(ray.direct[0],ray.eye);
    }
  });
  await t.test('三維攝影機基底、鼻尖與反射點投影一致，紋理位置固定',()=>{
    const c=comparisonCamera();for(const axis of [c.forward,c.right,c.down])near(Math.hypot(...axis),1);near(dot(c.forward,c.right),0);near(dot(c.forward,c.down),0);near(dot(c.right,c.down),0);
    const target=project(c,s.image),hit=project(c,comparisonRay().hit);near(target[0],450);near(target[1],145);near(hit[0],target[0]);near(hit[1],target[1]);
    const plane=VIEW_PLANES.front;const nose=planePoint(plane,209/400,132/385);nose.forEach((v,i)=>near(v,s.image[i]));
    for(const p of Object.values(VIEW_PLANES))for(const q of quad(c,p))assert.ok(q.every(Number.isFinite)&&q[2]>0);
    assert.ok(project(c,[s.source[0],440,0])[0]<target[0],'前景實物因同一眼位產生橫向視差');
  });
  await t.test('桌面與紋理先做近裁切，不把相機後方的幾何反投影到上方',()=>{
    const c=comparisonCamera(),world=[[170,570,-2500],[1400,570,-2500],[1400,570,2500],[170,570,2500]],clipped=clipNear(c,world);
    assert.ok(clipped.length>=3);for(const p of clipped){const screen=project(c,p);assert.ok(screen.every(Number.isFinite));assert.ok(screen[2]>=5-1e-8);}
    const a=c.eye.map((v,i)=>v-c.forward[i]*10),b=c.eye.map((v,i)=>v+c.forward[i]*20);const segment=clipNear(c,[a,b],false);assert.equal(segment.length,2);near(project(c,segment[0])[2],5);near(project(c,segment[1])[2],20);
  });
});

test('第三區：撤鏡並放入對照熊的操作、畫面與教學說明',{timeout:180000},async t=>{
  fs.mkdirSync(artifacts,{recursive:true});
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{let output='';const timeout=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{output+=d;const m=output.match(/port (\d+)/);if(m){clearTimeout(timeout);resolve(m[1]);}});server.once('error',reject);});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});t.after(()=>browser.close());
  const errors=[],url=process.env.MIRROR_COMPARISON_URL||`http://127.0.0.1:${port}/units/1/parts/1.2/#card-03`;
  const page=await browser.newPage({viewport:{width:1440,height:1200}});
  function monitor(p){p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>errors.push(r.url()));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});}
  monitor(page);await page.goto(url,{waitUntil:'networkidle'});await page.locator('#reference-eye[data-ready=true]').waitFor();await page.locator('#trial-eye[data-ready=true]').waitFor();
  const section=page.locator('#card-03'),button=page.locator('#toggle-comparison-mirror'),reference=page.locator('#comparison-reference'),trial=page.locator('#comparison-trial');
  async function setMode(mode,p=page){if(await p.locator('#card-03').getAttribute('data-comparison-mode')!==mode)await p.locator('#toggle-comparison-mirror').click();}
  async function capture(name,p=page){await p.evaluate(()=>document.activeElement?.blur());const style=await p.addStyleTag({content:'.route{visibility:hidden!important}'});await p.locator('#card-03').screenshot({path:`${artifacts}/${name}.png`});await style.evaluate(e=>e.remove());}
  async function opticalDOM(p=page){return p.locator('#card-03').evaluate(section=>{
    const read=prefix=>{
      const svg=section.querySelector(`#${prefix}-side`),find=n=>svg.querySelector(`[data-side="${n}"]`);
      const points=path=>path.getAttribute('d').match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g).map(Number);
      const screen=(x,y)=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return[q.x,q.y];};
      const source=svg.dataset.source.split(',').map(Number),image=svg.dataset.image.split(',').map(Number);
      const box=name=>{const r=find(name).getBoundingClientRect();return[r.width,r.height];};
      return {mode:svg.dataset.mode,source,image,eye:svg.dataset.eye.split(',').map(Number),rays:[...find('rays').children].map(points),extensions:[...find('extensions').children].map(points),screen:[screen(...source),screen(540,source[1]),screen(...image)],shapes:[box('near-shape'),box('far-shape')],farTransform:find('far-shape').getAttribute('transform'),mirrorVisible:getComputedStyle(find('mirror')).display!=='none',auxiliaryCount:svg.querySelectorAll('[data-side=scatter],[data-side=other-reflections]').length};
    };return{reference:read('reference'),trial:read('trial')};
  });}
  async function verify(p=page){
    const data=await opticalDOM(p);assert.equal(data.reference.mode,'mirror');
    for(const item of Object.values(data)){
      assert.deepEqual(item.source,[345,440,0]);assert.deepEqual(item.image,[735,440,0]);assert.deepEqual(item.eye,[150,180,160]);assert.equal(item.farTransform,'translate(1080 0) scale(-1 1)');
      near(item.screen[1][0]-item.screen[0][0],item.screen[2][0]-item.screen[1][0],.01);near(item.screen[0][1],item.screen[2][1],.01);
      near(item.shapes[0][0],item.shapes[1][0],.01);near(item.shapes[0][1],item.shapes[1][1],.01);
      assert.equal(item.mirrorVisible,item.mode==='mirror');assert.equal(item.rays.length,item.mode==='mirror'?6:3);assert.equal(item.extensions.length,item.mode==='mirror'?3:0);
      assert.equal(item.auxiliaryCount,0);
    }
    const a=data.reference,b=data.trial;
    if(b.mode==='direct')for(let i=0;i<3;i++){
      const out=a.rays[i*2+1],direct=b.rays[i],ext=a.extensions[i];
      const slope=(v)=>(v[v.length-1]-v[1])/(v[v.length-2]-v[0]);near(slope(out),slope(direct));near(slope(out),slope(ext));assert.deepEqual(out.slice(-2),direct.slice(-2));assert.deepEqual(direct.slice(0,2),[735,440]);
    }
    const views=await p.locator('.comparison-eye').evaluateAll(nodes=>nodes.map(e=>({eye:e.dataset.eye,nose:e.dataset.nose,quad:e.dataset.farQuad,mode:e.dataset.mode})));
    assert.equal(views[0].eye,views[1].eye);assert.equal(views[0].nose,views[1].nose);assert.equal(views[0].quad,views[1].quad);assert.equal(views[1].mode,b.mode);
    return data;
  }
  async function raster(p=page){return p.locator('.comparison-eye').evaluateAll(nodes=>nodes.map(svg=>Object.fromEntries(['front','rear'].map(name=>{
    const canvas=svg.querySelector(`[data-view="${name}"]`),data=canvas.getContext('2d').getImageData(0,0,900,400).data;let h=2166136261,opaque=0;for(let i=0;i<data.length;i++){h=Math.imul(h^data[i],16777619);if(i%4===3&&data[i]>200)opaque++;}return[name,{hash:h>>>0,opaque}];
  }))));}
  await t.test('初始雙欄、同眼位、有鏡子基準與唯一主要操作',async()=>{
    await expect(section).toHaveAttribute('data-comparison-mode','mirror');await expect(reference).toHaveAttribute('data-mode','mirror');await expect(trial).toHaveAttribute('data-mode','mirror');
    await expect(button).toHaveText('撤鏡，放入對照熊');await expect(button).toHaveAttribute('aria-pressed','false');assert.equal(await section.locator('button').count(),1);
    assert.equal(await page.locator('#change-image-observer,#toggle-image-object,#image-observer').count(),0);await verify();await capture('initial');
  });
  await t.test('撤鏡同時放入對照熊：實線取代虛線、原熊與眼位固定',async()=>{
    const before=await opticalDOM();await button.click();await expect(section).toHaveAttribute('data-comparison-mode','direct');await expect(button).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#trial-side [data-side=mirror]')).toBeHidden();await expect(page.locator('#trial-side [data-side=mirror-tick]')).toBeVisible();
    await expect(page.locator('#trial-side [data-side=far-label]')).toHaveText('放入的真實對照熊');await expect(page.locator('#trial-side [data-side=far-shape]')).toHaveAttribute('opacity','1');
    await expect(page.locator('#trial-eye [data-view=mirror]')).toBeHidden();await expect(page.locator('#trial-eye [data-view=far]')).toHaveAttribute('clip-path','none');
    const after=await verify();assert.deepEqual(before.reference,after.reference);assert.deepEqual(before.trial.shapes,after.trial.shapes);await capture('compared');
  });
  await t.test('實際畫布像素一致、物體不移動，鏡框與背景允許改變',async()=>{
    const a=await raster();assert.deepEqual(a[0],a[1]);for(const object of Object.values(a[0]))assert.ok(object.opaque>1000);
    await setMode('mirror');const b=await raster();assert.deepEqual(a,b);await verify();
    await expect(page.locator('#trial-eye [data-view=mirror]')).toBeVisible();await expect(page.locator('#trial-eye [data-view=far]')).toHaveAttribute('clip-path','url(#trial-eye-clip)');
  });
  await t.test('移除散光示意及文字，聚焦反射光與直達光的比較',async()=>{
    await expect(section).not.toContainText('散光');await expect(section).not.toContainText('散向');await expect(section).not.toContainText('散開');assert.equal(await section.locator('[id$=gray-arrow],.comparison-other,[data-side=scatter],[data-side=other-reflections]').count(),0);await expect(section).toContainText('藍色虛線只標示光看起來的來向');
    await expect(section).toContainText('具有相同的入眼方向與發散情形');await expect(section).toContainText('鏡框與背景可以不同');
    await setMode('direct');await expect(page.locator('#comparison-status')).toContainText('另外放入真實對照熊');await expect(page.locator('#trial-side-desc')).toContainText('淡化只為突出對照熊');
    await setMode('mirror');await expect(page.locator('#comparison-status')).toContainText('對照熊已移開');
  });
  await t.test('三種寬度下固定座標切換30次，按鈕不跳動且基準不變',async()=>{
    for(const width of [1440,1024,768]){
      await page.setViewportSize({width,height:1200});await setMode('mirror');await button.scrollIntoViewIfNeeded();await page.waitForTimeout(100);const a=await button.boundingBox();
      const baseline=(await opticalDOM()).reference;
      for(let n=0;n<10;n++){
        await page.mouse.click(a.x+a.width/2,a.y+a.height/2);await expect(section).toHaveAttribute('data-comparison-mode',n%2===0?'direct':'mirror');
        const b=await button.boundingBox();near(a.x,b.x,.5);near(a.y,b.y,.5);near(a.width,b.width,.5);assert.deepEqual((await opticalDOM()).reference,baseline);
      }
    }
  });
  await t.test('鍵盤、快速連點與離頁無動畫殘留',async()=>{
    await setMode('mirror');await button.focus();await page.keyboard.press('Enter');await expect(section).toHaveAttribute('data-comparison-mode','direct');await page.keyboard.press('Space');await expect(section).toHaveAttribute('data-comparison-mode','mirror');
    await button.evaluate(e=>{for(let i=0;i<21;i++)e.click();});await expect(section).toHaveAttribute('data-comparison-mode','direct');await page.waitForTimeout(300);await verify();
    await button.evaluate(e=>{for(let i=0;i<21;i++)e.click();});await expect(section).toHaveAttribute('data-comparison-mode','mirror');await verify();
  });
  await t.test('320／390／650／768／1024／1440px：兩情境與觀察窗對齊、字與按鈕無溢出',async()=>{
    for(const width of [320,390,650,768,1024,1440]){
      await page.setViewportSize({width,height:1200});await setMode('direct');await verify();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      const a=await reference.boundingBox(),b=await trial.boundingBox();
      if(width>650){near(a.y,b.y,1);near(a.width,b.width,1);const x=await page.locator('#reference-eye').boundingBox(),y=await page.locator('#trial-eye').boundingBox();near(x.y,y.y,1);near(x.height,y.height,1);}else assert.ok(b.y>=a.y+a.height);
      const c=await button.boundingBox();assert.ok(c.height>=44&&c.width>=200);assert.equal(await button.evaluate(e=>e.scrollWidth<=e.clientWidth),true);
      if(width===390)await capture('mobile-compared');if(width===1440)await capture('desktop-compared');
    }
  });
  await t.test('手機真實觸控、減少動態與同座標來回切換',async()=>{
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});const mobile=await context.newPage();monitor(mobile);
    try{
      await mobile.goto(url,{waitUntil:'networkidle'});await mobile.locator('#trial-eye[data-ready=true]').waitFor();const target=mobile.locator('#toggle-comparison-mirror');await target.scrollIntoViewIfNeeded();const a=await target.boundingBox();
      await mobile.touchscreen.tap(a.x+a.width/2,a.y+a.height/2);await expect(mobile.locator('#card-03')).toHaveAttribute('data-comparison-mode','direct');await verify(mobile);
      const b=await target.boundingBox();near(a.y,b.y,.5);await mobile.touchscreen.tap(a.x+a.width/2,a.y+a.height/2);await expect(mobile.locator('#card-03')).toHaveAttribute('data-comparison-mode','mirror');
      await mobile.touchscreen.tap(a.x+a.width/2,a.y+a.height/2);await verify(mobile);const pixels=await raster(mobile);assert.deepEqual(pixels[0],pixels[1]);await capture('mobile-touch',mobile);
    }finally{await context.close();}
  });
  await t.test('素材載入途中切換，完成後保留最新情境',async()=>{
    const context=await browser.newContext({viewport:{width:1280,height:1000}});const delayed=await context.newPage();monitor(delayed);let release;const wait=new Promise(resolve=>release=resolve);
    await delayed.route('**/teddy-front.webp',async route=>{await wait;await route.continue();});
    try{
      await delayed.goto(url,{waitUntil:'domcontentloaded'});await delayed.locator('#toggle-comparison-mirror').click();await expect(delayed.locator('#card-03')).toHaveAttribute('data-comparison-mode','direct');release();
      await delayed.locator('#trial-eye[data-ready=true]').waitFor();await delayed.locator('#reference-eye[data-ready=true]').waitFor();await verify(delayed);await expect(delayed.locator('#trial-eye [data-view=mirror]')).toBeHidden();
    }finally{release();await context.close();}
  });
  await t.test('第四區量距保持獨立、圖形ID唯一、資源與離頁正常',async()=>{
    await page.locator('#object-distance').fill('20');await page.locator('#object-distance').dispatchEvent('input');await expect(page.locator('#image-distance-value')).toHaveText('20 cm');await verify();
    const duplicates=await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);});assert.deepEqual(duplicates,[]);
    await page.goto('about:blank');await page.waitForTimeout(100);assert.deepEqual(errors,[]);
  });
});
