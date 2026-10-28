const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const repo=path.resolve(__dirname,'..');
const moduleURL=pathToFileURL(path.join(repo,'units/5/parts/5.1/assets/water-lab-state.mjs')).href;

test('temperature model preserves physical teaching constraints',async()=>{
  const m=await import(moduleURL);
  let s=m.initialState();
  assert.equal(m.isMoving(s),false);
  s=m.toggleHeat(s);
  for(let i=0;i<1000;i++)s=m.advance(s,.1);
  assert.equal(s.water,m.MAX_TEMPERATURE);assert.equal(s.probe,m.MAX_TEMPERATURE);assert.equal(s.heating,false);
  assert.equal(s.atUpperLimit,true);
  s=m.addIce(s);assert.equal(s.heating,false);
  assert.equal(s.iceRemaining,20);
  const locked=m.toggleHeat(s);assert.equal(locked.heating,false);
  const coolingStart=s.water;
  for(let i=0;i<80;i++)s=m.advance(s,.1);
  assert.ok(s.iceRemaining>11.9);assert.ok(s.water<coolingStart);
  for(let i=0;i<130;i++)s=m.advance(s,.1);
  assert.equal(s.iceRemaining,0);
  for(let cycle=0;cycle<10;cycle++){
    s=m.addIce(s);
    for(let i=0;i<230;i++){s=m.advance(s,.1);assert.ok(s.water>=m.MIN_TEMPERATURE);assert.ok(s.probe>=m.MIN_TEMPERATURE);}
  }
  assert.equal(s.water,m.MIN_TEMPERATURE);assert.equal(m.addIce(s).iceRemaining,0);
  assert.ok(Number.isFinite(s.probe));assert.equal(s.probe,s.water);
  const initial=m.initialState();assert.equal(initial.water,22);assert.equal(initial.probe,22);assert.equal(initial.iceRemaining,0);
  let slowCooling=m.addIce(initial);
  for(let frame=0;frame<60;frame++)slowCooling=m.advance(slowCooling,1/60);
  assert.ok(slowCooling.probe>slowCooling.water,'gentle cooling preserves the thermometer response lag at 60 fps');
});

test('water lab functional and visual checks in Chromium',{timeout:150000},async t=>{
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:repo,stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Server startup timed out')),5000);server.once('error',reject);server.stdout.on('data',c=>{output+=c;const m=output.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1])}})});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
  const url=process.env.WATER_LAB_URL||`http://127.0.0.1:${port}/units/5/parts/5.1/index.html`;
  await page.goto(url);
  const ice=page.locator('#water-lab-add-ice'),heat=page.locator('#water-lab-heat'),reset=page.locator('#water-lab-reset');
  const state=()=>page.locator('#water-lab').evaluate(n=>({water:Number(n.dataset.water),probe:Number(n.dataset.probe),ice:Number(n.dataset.ice),heating:n.dataset.heating==='true'}));
  const sync=async()=>{
    const snapshot=await page.evaluate(()=>{
      const meniscusY=id=>{
        const [,edge,control]=document.getElementById(id).getAttribute('d').match(/^M\S+ ([0-9.]+)Q\S+ ([0-9.]+)/);
        return (Number(edge)+Number(control))/2;
      };
      return {
      probe:Number(document.getElementById('water-lab').dataset.probe),
      main:meniscusY('water-lab-liquid'),
      zoom:meniscusY('water-lab-zoom-fluid'),
      source:Number(document.getElementById('water-lab-source').getAttribute('cy'))
    }});
    assert.ok(Math.abs((545-snapshot.main)/300-(300-snapshot.zoom)/260)<.000001);
    assert.ok(Math.abs(snapshot.main-(545-snapshot.probe*5))<.001);
    assert.equal(snapshot.source,snapshot.main);
  };
  await t.test('matches approved composition and starts with safe fixed apparatus',async()=>{
    await page.locator('#card-02 .water-lab-art img').evaluate(n=>n.decode());
    assert.equal((await state()).probe,22);assert.equal((await state()).heating,false);
    const sequence=await page.locator('#card-02 .card-main').evaluate(n=>[...n.children].map(c=>c.className));
    assert.deepEqual(sequence,['dialogue dialogue--xiaokui','dialogue','water-lab','dialogue dialogue--xiaokui','dialogue']);
    assert.equal(await page.locator('#card-02 .water-lab-lens h3').textContent(),'液面局部放大');
    assert.equal(await ice.textContent(),'加入冰塊');assert.equal(await heat.textContent(),'加熱水');
    assert.equal(await page.locator('#water-lab-ice').isVisible(),false);
    await sync();
  });
  await t.test('both thermometer views have calibrated one-degree marks and numbered Celsius scales',async()=>{
    for(const id of ['water-lab-scale','water-lab-zoom-scale']){
      const marks=await page.locator(`#${id} line`).evaluateAll(nodes=>nodes.map(n=>({
        degree:Number(n.dataset.degree),interval:n.dataset.interval,
        y:Number(n.getAttribute('y1')),length:Math.abs(Number(n.getAttribute('x2'))-Number(n.getAttribute('x1')))
      })));
      assert.equal(marks.length,61);
      assert.deepEqual(marks.map(n=>n.degree),Array.from({length:61},(_,degree)=>degree));
      assert.equal(marks.filter(n=>n.interval==='major').length,7);
      assert.equal(marks.filter(n=>n.interval==='middle').length,6);
      assert.ok(marks[0].length>marks[5].length&&marks[5].length>marks[1].length);
      const spacing=marks[0].y-marks[1].y;
      for(let i=1;i<marks.length;i++)assert.ok(Math.abs(marks[i-1].y-marks[i].y-spacing)<.000001);
      const labels=await page.locator(`#${id} text`).evaluateAll(nodes=>nodes.map(n=>({degree:Number(n.dataset.degree),text:n.textContent,y:Number(n.getAttribute('y'))})));
      assert.deepEqual(labels.map(n=>n.text),['0','10','20','30','40','50','60']);
      for(const label of labels)assert.equal(label.y,marks[label.degree].y);
      const containment=await page.locator(`#${id}`).evaluate(group=>{
        const body=document.getElementById(group.id==='water-lab-scale'?'water-lab-body':'water-lab-zoom-body').getBBox();
        return [...group.children].every(n=>{
          const b=n.getBBox();
          return b.x>=body.x&&b.x+b.width<=body.x+body.width&&b.y>=body.y&&b.y+b.height<=body.y+body.height;
        });
      });
      assert.ok(containment,`${id} marks and numbers are engraved within the glass body`);
    }
    assert.equal(await page.locator('#water-lab-scale-unit').textContent(),'°C');
    assert.equal(await page.locator('#water-lab-zoom-unit').textContent(),'°C');
    const main22=Number(await page.locator('#water-lab-scale line[data-degree="22"]').getAttribute('y1'));
    assert.ok(Math.abs(main22-Number(await page.locator('#water-lab-source').getAttribute('cy')))<.000001);
    await sync();
  });
  await t.test('ice falls, floats, cools water and lowers both liquid views',async()=>{
    await page.clock.install();
    const start=await state();await ice.click();
    assert.equal(await heat.isDisabled(),true);assert.equal(await ice.isDisabled(),true);
    await page.clock.runFor(400);
    const a=await page.locator('#water-lab-cube-a').getAttribute('transform');
    assert.equal(await page.locator('#water-lab-ice').isVisible(),true);
    await page.clock.runFor(600);
    assert.notEqual(await page.locator('#water-lab-cube-a').getAttribute('transform'),a);
    const now=await state();assert.ok(now.water<start.water);assert.ok(now.probe<start.probe);assert.ok(now.probe>now.water);
    assert.equal(now.heating,false);await sync();
    assert.match(await page.locator('#water-lab-feedback').textContent(),/液柱下降/);
    await page.clock.runFor(6500);
    const floating=await state();assert.ok(floating.ice>12);assert.ok(floating.water<now.water);
    const cube=await page.locator('#water-lab-cube-a').getAttribute('transform');
    assert.match(cube,/scale\(1\)$/,'ice stays full size for the observation period');
    const centerY=Number(cube.match(/translate\(448,([0-9.]+)/)[1]);
    assert.ok(centerY>=499&&centerY<=501,'floating ice center stays below the water plane');
    const immersion=await page.locator('#water-lab-cube-a').evaluate(n=>{
      const box=n.getBBox(),matrix=n.transform.baseVal.consolidate().matrix;
      const corners=[[box.x,box.y],[box.x+box.width,box.y],[box.x,box.y+box.height],[box.x+box.width,box.y+box.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(matrix).y);
      const top=Math.min(...corners),bottom=Math.max(...corners),waterline=475;
      return {top,bottom,submerged:(bottom-waterline)/(bottom-top)};
    });
    assert.ok(immersion.top<475&&immersion.bottom>475&&immersion.submerged>.8,'only a small cap protrudes above the water');
    await page.clock.runFor(6500);
    assert.equal(await page.locator('#water-lab-ice').isVisible(),true);
    const size=Number((await page.locator('#water-lab-cube-a').getAttribute('transform')).match(/scale\(([0-9.]+)/)[1]);
    assert.ok(size>.35&&size<.7,'ice melts gradually after floating');await sync();
    await page.clock.runFor(7500);
    assert.equal((await state()).ice,0);
    assert.equal(await page.locator('#water-lab-ice').isVisible(),false);assert.equal(await heat.isDisabled(),false);
    await page.clock.resume();
  });
  await t.test('heater warms water continuously and can stop independently of the probe lag',async()=>{
    const start=await state();await heat.click();
    assert.equal(await heat.getAttribute('aria-pressed'),'true');assert.match(await heat.textContent(),/停止/);
    await page.waitForTimeout(1100);const middle=await state();
    await page.waitForTimeout(500);const end=await state();
    assert.ok(middle.water>start.water);assert.ok(end.water>middle.water);assert.ok(end.probe>middle.probe);assert.ok(end.probe<end.water);
    assert.equal(await page.locator('#water-lab-heat-glow').getAttribute('opacity'),'.24');await sync();
    await heat.click();const stopped=await state();await page.waitForTimeout(500);
    assert.equal((await state()).water,stopped.water);assert.equal((await state()).heating,false);
    assert.equal(await page.locator('#water-lab-heat-glow').getAttribute('opacity'),'0');
  });
  await t.test('ice stops the heater and reset clears all animation and state',async()=>{
    await heat.click();assert.equal((await state()).heating,true);await ice.click();
    assert.equal((await state()).heating,false);assert.equal(await heat.isDisabled(),true);
    await reset.click();await page.waitForTimeout(350);
    assert.deepEqual(await state(),{water:22,probe:22,ice:0,heating:false});
    assert.equal(await page.locator('#water-lab-ice').isVisible(),false);
    assert.equal(await heat.getAttribute('aria-pressed'),'false');assert.equal(await heat.isDisabled(),false);await sync();
    await heat.click();await page.waitForTimeout(200);await reset.click();await page.waitForTimeout(200);
    assert.equal((await state()).water,22);assert.equal((await state()).probe,22);
  });
  await t.test('keyboard and reduced motion preferences keep all operations usable',async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await ice.focus();await page.keyboard.press('Enter');assert.ok((await state()).ice>0);
    await reset.focus();await page.keyboard.press('Space');assert.equal((await state()).ice,0);
    await heat.focus();await page.keyboard.press('Enter');assert.equal((await state()).heating,true);
    await page.keyboard.press('Enter');assert.equal((await state()).heating,false);await reset.click();
  });
  await t.test('repeated controls remain bounded at both temperature limits',async()=>{
    await heat.click();await page.clock.runFor(14000);
    assert.equal((await state()).water,60);assert.equal((await state()).heating,false);
    assert.equal(await heat.isDisabled(),true);await sync();
    await reset.click();
    for(let i=0;i<3;i++){await ice.click();await page.clock.runFor(23000);}
    assert.equal((await state()).water,5);assert.equal((await state()).probe,5);
    assert.equal(await ice.isDisabled(),true);assert.equal(await heat.isDisabled(),false);await sync();
    await reset.click();await page.clock.resume();
  });
  await t.test('desktop and narrow layouts retain controls, annotations and insets without overlap',async()=>{
    for(const width of [1440,1280,1024,768,390]){
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow at ${width}`);
      for(const button of [ice,heat,reset])assert.equal(await button.isVisible(),true);
      // A viewport change can move the document between two protocol reads.
      // Measure both rectangles in the same settled frame, preserving the same
      // no-overlap assertion against the actual responsive layout.
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const {lens,status}=await page.evaluate(()=>{
        const a=document.querySelector('.water-lab-lens').getBoundingClientRect();
        const b=document.querySelector('.water-lab-heater-status').getBoundingClientRect();
        return {lens:{y:a.y,height:a.height},status:{y:b.y,height:b.height}};
      });
      assert.ok(lens.y+lens.height<=status.y+1,`inset overlaps status at ${width}`);
    }
    assert.deepEqual(errors,[]);
  });
  if(process.env.WATER_LAB_CAPTURE_DIR){
    const dir=process.env.WATER_LAB_CAPTURE_DIR;await fs.mkdir(dir,{recursive:true});
    await page.setViewportSize({width:1440,height:1200});await reset.click();
    await page.locator('#card-02').screenshot({path:path.join(dir,'desktop-initial.png')});
    await ice.click();await page.waitForTimeout(900);
    await page.locator('#card-02').screenshot({path:path.join(dir,'desktop-cooling.png')});
    await reset.click();await heat.click();await page.waitForTimeout(1600);
    await page.locator('#card-02').screenshot({path:path.join(dir,'desktop-heating.png')});await reset.click();
    await page.setViewportSize({width:390,height:900});
    await page.locator('#card-02').screenshot({path:path.join(dir,'mobile.png')});
  }
});
