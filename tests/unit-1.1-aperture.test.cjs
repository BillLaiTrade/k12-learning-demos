const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const {expect}=require('playwright/test');
const root=path.resolve(__dirname,'..'),capture='/tmp/unit11-aperture-fix';
const make=values=>values.map((v,i)=>({x:[-2.35,0,2.35][i],height:v*.0062}));
let optics;
test('三孔板：直線光束與有限孔口的幾何計算',async t=>{
  optics=await import(pathToFileURL(path.join(root,'units/1/parts/1.1/assets/aperture-optics.mjs')));
  const {traceApertures:trace,circularStripFraction:strip,APERTURE_OPTICS:g}=optics;
  await t.test('全通、部分、全擋及既有高低高錯誤案例',()=>{
    assert.equal(trace(make([0,0,0])).power,1);assert.equal(trace(make([0,50,0])).power,0);
    assert.equal(trace(make([40,-40,40])).power,0);
    const partial=trace(make([0,29,0])).power;assert.ok(partial>.49&&partial<.51);
    for(const values of [[31,0,0],[0,-31,0],[0,0,31]])assert.ok(trace(make(values)).power>0);
    assert.equal(trace(make([31,-31,31])).power,0,'各片單獨仍有通光，合起來卻沒有共同直線');
    assert.equal(trace(make([0,5,0])).power,1,'孔口有寬度，中心略偏仍可完整容納光束');
    assert.ok(trace(make([0,40,0])).power>0&&trace(make([0,40,0])).power<.02,'微弱通光不以任意亮度門檻切成全擋');
  });
  await t.test('上游擋光後，下游接收與通過的光量均為零，按實際前後位置處理',()=>{
    for(const values of [[100,0,0],[0,100,0],[0,0,100]]){
      const r=trace(make(values));let previous=1;
      for(const stage of r.stages){assert.equal(stage.received,previous);assert.ok(stage.power<=previous);previous=stage.power;}
    }
    const p=make([100,0,0]);assert.deepEqual(trace([p[2],p[0],p[1]]).stages.map(s=>[s.received,s.power]),[[0,0],[1,0],[0,0]]);
  });
  await t.test('前後移動與板厚都影響孔口允許的光線；上下對稱及邊界正確',()=>{
    const a=trace([{x:-2.35,height:.20}]).power,b=trace([{x:2.35,height:.20}]).power;assert.ok(a<b);
    const x=-3.6,height=.185,t=(x-g.sourceX)/(g.screenX-g.sourceX);
    const thin=strip((height-g.halfHeight)/t,(height+g.halfHeight)/t);assert.ok(trace([{x,height}]).power<thin);
    for(const v of [0,10,20,29,31,40,50,100])assert.ok(Math.abs(trace(make([0,v,0])).power-trace(make([0,-v,0])).power)<1e-12);
    assert.equal(strip(g.screenRadius,g.screenRadius+1),0);assert.equal(strip(-1,1),1);
    assert.throws(()=>trace([{x:g.sourceX,height:0}]),RangeError);assert.throws(()=>trace([{x:0,height:NaN}]),RangeError);
  });
  await t.test('與獨立逐條射線穿過實際前後孔口的面積取樣一致',()=>{
    let seed=91;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32;};
    const cases=[make([0,0,0]),make([31,-31,31]),make([0,29,0])];
    for(let i=0;i<45;i++)cases.push([-2.35,0,2.35].map(x=>({x:x+(random()-.5)*.5,height:(random()-.5)*.48})));
    for(const plates of cases){let total=0,passed=0;const n=100;
      for(let iy=0;iy<n;iy++)for(let iz=0;iz<n;iz++){
        const y=((iy+.5)/n*2-1)*g.screenRadius,z=((iz+.5)/n*2-1)*g.screenRadius;if(y*y+z*z>g.screenRadius**2)continue;total++;
        let survives=true;
        for(const p of plates)for(const face of [-g.halfThickness,g.halfThickness]){
          const ratio=(p.x+face-g.sourceX)/(g.screenX-g.sourceX),atY=ratio*y-p.height,atZ=ratio*z;
          if(Math.abs(atY)>g.halfHeight||Math.abs(atZ)>g.halfWidth)survives=false;
        }
        if(survives)passed++;
      }
      assert.ok(Math.abs(trace(plates).power-passed/total)<.012,JSON.stringify(plates));
    }
  });
});
test('第三區實際器材、亮點、燈號與既有操作',{timeout:240000},async t=>{
  fs.mkdirSync(capture,{recursive:true});
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:root,stdio:['ignore','pipe','pipe']});t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{let s='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{s+=d;const m=s.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});t.after(()=>browser.close());
  const url=`http://127.0.0.1:${port}/units/1/parts/1.1/#card-03`,errors=[];
  async function open(context){const p=await context.newPage();p.on('pageerror',e=>{errors.push(e.message);console.error('Browser error:',e.message);});p.on('requestfailed',r=>errors.push(r.url()));p.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
    await p.route('**/assets/aperture-3d.js*',async route=>{const response=await route.fetch(),body=await response.text();assert.ok(body.includes('const updateExperiment = () => {'));
      await route.fulfill({response,body:body.replace('const updateExperiment = () => {','window.__apertureTest={plateStates,plates,spot,spotGlow,mats,camera,scene}; const updateExperiment = () => {')});});
    await p.bringToFront();await p.goto(url,{waitUntil:'networkidle'});await p.waitForFunction(()=>!!window.__apertureTest,null,{polling:100}).catch(e=>{throw Error('Aperture load failure: '+JSON.stringify({url:p.url(),errors})+' '+e.message);});return p;
  }
  const context=await browser.newContext({viewport:{width:1440,height:1050}}),p=await open(context),canvas=p.locator('#aperture-3d-scene');
  async function read(page=p){return page.evaluate(()=>{const a=window.__apertureTest;return {states:a.plateStates.map(s=>({...s})),power:a.mats.spot.opacity,visible:a.spot.visible,glowVisible:a.spotGlow.visible,
    indicators:[...document.querySelectorAll('[data-plate]')].map(e=>({on:e.classList.contains('is-transmitting'),label:e.getAttribute('aria-label')})),
    dimensions:a.plates.map(x=>x.plateBars.slice(0,4).map(b=>({size:b.geometry.parameters,position:b.position.toArray()}))),source:a.spot.position.toArray()};});}
  async function check(page=p){const actual=await read(page),expected=optics.traceApertures(actual.states);assert.ok(Math.abs(actual.power-expected.power)<1e-12);assert.equal(actual.visible,expected.power>0);assert.equal(actual.glowVisible,expected.power>0);
    assert.deepEqual(actual.indicators.map(i=>i.on),expected.stages.map(s=>s.power>0));for(const s of expected.stages)if(!s.received)assert.ok(actual.indicators[s.index].label.includes('沒有光到達'));
    assert.equal(await page.locator('#aperture-result').evaluate(e=>e.classList.contains('is-blocked')),expected.power===0);return actual;
  }
  async function set(values){for(let i=0;i<3;i++){await p.locator(`[data-plate="${i}"]`).click();await p.locator('#aperture-offset').fill(String(values[i]));await p.locator('#aperture-offset').dispatchEvent('input');}return check();}
  async function shot(name,page=p){const style=await page.addStyleTag({content:'.route{visibility:hidden!important}'});await page.locator('#card-03').screenshot({path:`${capture}/${name}.png`});await style.evaluate(e=>e.remove());}
  await t.test('原始中間板偏高為全擋；數學孔口與實際3D板片尺寸一致',async()=>{
    const a=await check();assert.equal(a.power,0);assert.deepEqual(a.indicators.map(i=>i.on),[true,false,false]);assert.deepEqual(a.source,[4.265,1.28,0]);
    for(const bars of a.dimensions){assert.equal(bars[0].size.width,.12);assert.ok(Math.abs(bars[0].position[1]-bars[0].size.height/2-.18)<1e-12);assert.ok(Math.abs(bars[3].position[2]-bars[3].size.depth/2-.21)<1e-12);}
  });
  await t.test('完整、部分、零通光及多板組合同步更新實際亮點與每片燈號',async()=>{
    for(const [name,values] of [['full',[0,0,0]],['partial',[0,29,0]],['old-bug',[40,-40,40]],['joint-block',[31,-31,31]],['dim',[0,40,0]],['first-block',[100,0,0]],['last-block',[0,0,100]],['finite-hole',[0,5,0]]]){
      const r=await set(values);if(['full','partial','old-bug','joint-block'].includes(name))await shot(name);
      if(name==='partial')assert.ok(r.power>.49&&r.power<.51);if(name==='dim')assert.ok(r.power>0&&r.power<.02);if(['old-bug','joint-block','first-block','last-block'].includes(name))assert.equal(r.power,0);
    }
    await expect(p.locator('#aperture-result')).toContainText('完整通過');await expect(p.locator('#aperture-result')).not.toContainText('排成一直線');
  });
  async function point(page,x,y){return page.locator('#aperture-3d-scene').evaluate((el,{x,y})=>{const a=window.__apertureTest,v=a.spot.position.clone().set(x,y,0).project(a.camera),r=el.getBoundingClientRect();return{x:r.x+(v.x+1)*r.width/2,y:r.y+(1-v.y)*r.height/2};},{x,y});}
  await t.test('實際拖曳改變孔板前後／上下位置；重設視角保留狀態，重設位置恢復初始',async()=>{
    await p.locator('#aperture-reset').click();await canvas.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(250);
    const a=await point(p,0,1.59),b=await point(p,.65,1.28);await p.mouse.move(a.x,a.y);await p.mouse.down();assert.equal(await canvas.evaluate(e=>e.hasPointerCapture(1)),true);
    await p.mouse.move(b.x,b.y,{steps:10});await p.mouse.up();const moved=await check();assert.ok(Math.abs(moved.states[1].x)>.2);assert.ok(Math.abs(moved.states[1].height-.31)>.1);
    await p.locator('#aperture-view-reset').click();assert.deepEqual((await check()).states,moved.states);
    await p.locator('#aperture-reset').click();assert.deepEqual((await check()).states,make([0,50,0]));
  });
  await t.test('鍵盤調高低、五種尺寸及既有版面正常',async()=>{
    await p.locator('#aperture-offset').focus();await p.keyboard.press('Home');await check();await p.keyboard.press('End');await check();
    await p.locator('#aperture-reset').click();for(const width of [320,390,768,1024,1440]){await p.setViewportSize({width,height:1050});await check();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(width===390)await shot('mobile');if(width===1440)await shot('desktop');}
    assert.equal(await p.locator('.lesson-card').count(),6);assert.equal(await p.locator('#card-03 input').count(),1);assert.equal(await p.locator('#card-03 button').count(),5);
  });
  await t.test('第二區開關、第六區計時與相鄰1.2入口回應回歸',async()=>{
    await p.bringToFront();await p.locator('#lamp-toggle').click();await expect(p.locator('#lamp-toggle')).toHaveAttribute('aria-pressed','false');await expect(p.locator('#night-feedback')).toContainText('關掉檯燈後');
    await p.locator('#light-speed-tap').click();await p.waitForTimeout(150);await p.locator('#light-speed-tap').click();await expect(p.locator('#light-speed-tap')).toHaveAttribute('data-phase','result');
    const response=await p.request.get(new URL('../1.2/',url).href);assert.equal(response.status(),200);assert.ok((await response.text()).includes('mirror-image.js'));assert.deepEqual(errors,[]);
  });
  await t.test('真實觸控拖曳與按鈕，縮減動態設定不改變通光結果',async()=>{
    await context.close();await browser.close();
    const mobileBrowser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const c=await mobileBrowser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),page=await open(c),el=page.locator('#aperture-3d-scene');
    try{await check(page);await el.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(250);const a=await point(page,0,1.59),b=await point(page,.4,1.28),cdp=await c.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x,y:a.y,id:1}]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/8,y:a.y+(b.y-a.y)*i/8,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      const moved=await check(page);assert.ok(Math.abs(moved.states[1].height-.31)>.1);await page.locator('#aperture-reset').tap();assert.equal((await check(page)).power,0);await shot('mobile-touch',page);
    }finally{await c.close();await mobileBrowser.close();}
  });

});
