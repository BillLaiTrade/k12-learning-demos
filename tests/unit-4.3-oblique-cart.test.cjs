const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {setup} = require('./helpers/unit43.cjs');
const captures = process.env.CART_CAPTURE_DIR;
test('4.3 oblique cart demonstrates staggered slowing and turning', {timeout:150000}, async t => {
  const {page:p,browser,base,errors} = await setup(t);
  const details=p.locator('#oblique-explanation'), button=p.locator('#oblique-cart-play');
  const pose=()=>p.locator('#oblique-cart').evaluate(e=>Object.fromEntries(Object.entries(e.dataset).map(([k,v])=>[k,['state','pauseReason'].includes(k)?v:Number(v)])));
  if(captures)await fs.mkdir(captures,{recursive:true});
  await t.test('rigid axle turns only while one wheel is slower, then keeps the new direction',async()=>{
    await details.locator('summary').click();await p.clock.runFor(50);
    assert.equal((await pose()).state,'idle'); // reduced motion waits for an explicit play
    await button.click();const initial=await pose();
    await p.clock.runFor(350);const first=await pose();assert.ok(first.x>initial.x&&first.y>initial.y);assert.equal(first.angle,initial.angle);
    await p.clock.runFor(800);const middle=await pose();assert.ok(middle.leftY>=160&&middle.rightY<160);assert.ok(middle.angle<initial.angle);assert.match(await p.locator('#oblique-cart-status').innerText(),/左輪先進入/);
    if(captures)await details.screenshot({path:path.join(captures,'1440-turning.png')});
    await p.clock.runFor(800);const both=await pose();assert.ok(both.rightY>=160);assert.ok(both.angle<middle.angle);
    await p.clock.runFor(400);const later=await pose();assert.equal(later.angle,both.angle);
    assert.ok(Math.abs(Math.hypot(later.x-both.x,later.y-both.y)/.4-55)<2);
    assert.ok(Math.abs(Math.sin(both.angle)/Math.sin(initial.angle)-.55)<.005);
    await p.clock.runFor(3000);assert.equal((await pose()).state,'complete');assert.match(await button.innerText(),/再看一次/);assert.match(await details.innerText(),/不代表光受到摩擦/);
    if(captures)await details.screenshot({path:path.join(captures,'1440-complete.png')});
  });
  await t.test('replay, folding, leaving the viewport and hidden document stop without an empty loop',async()=>{
    await button.click();await p.clock.runFor(500);await details.locator('summary').click();await p.clock.runFor(30);const folded=await pose();await p.clock.runFor(800);assert.deepEqual(await pose(),folded);assert.equal(folded.state,'paused');
    await details.locator('summary').click();await p.clock.runFor(30);await button.click();await p.clock.runFor(300);assert.ok((await pose()).y>folded.y);
    await p.locator('#s1').scrollIntoViewIfNeeded();await p.clock.runFor(100);await p.waitForFunction(()=>document.querySelector('#oblique-cart').dataset.state==='paused',{},{polling:50});const offscreen=await pose();assert.equal(offscreen.state,'paused');await p.clock.runFor(600);assert.deepEqual(await pose(),offscreen);
    await p.locator('#oblique-explanation .oblique-cart-scene').scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('#oblique-cart').dataset.state==='running');await p.clock.runFor(200);await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});const hidden=await pose();await p.clock.runFor(500);assert.deepEqual(await pose(),hidden);assert.equal(hidden.state,'paused');
    await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await details.locator('summary').click();
  });
  await t.test('normal motion opens automatically; reduced motion remains explicit and keyboard accessible',async()=>{
    const q=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});await q.clock.install();await q.goto(base);await q.waitForFunction(()=>document.querySelector('#oblique-lab').dataset.state==='idle');await q.clock.pauseAt(new Date(await q.evaluate(()=>Date.now())+100));await q.locator('#oblique-explanation summary').scrollIntoViewIfNeeded();await q.clock.runFor(80);await q.locator('#oblique-explanation summary').focus();await q.keyboard.press('Enter');await q.waitForFunction(()=>document.querySelector('#oblique-cart').dataset.state==='running');await q.clock.runFor(650);assert.ok(Number(await q.locator('#oblique-cart').getAttribute('data-y'))>67);await q.close();
    await details.locator('summary').focus();await p.keyboard.press('Enter');await p.clock.runFor(50);const paused=await pose();await p.clock.runFor(400);assert.deepEqual(await pose(),paused);await button.scrollIntoViewIfNeeded();await p.clock.runFor(50);await button.focus();await p.keyboard.press('Enter');await p.clock.runFor(250);assert.equal((await pose()).state,'running');await details.locator('summary').click();await p.clock.runFor(30);
  });
  await t.test('seven widths and native phone touch keep the scene, copy and replay control readable',async()=>{
    const measures=[];
    await details.locator('summary').click();await p.clock.runFor(30);
    for(const width of [1440,1024,820,760,600,390,320]){
      await p.setViewportSize({width,height:844});await p.clock.runFor(50);await details.scrollIntoViewIfNeeded();
      const m=await details.evaluate(e=>{const svg=e.querySelector('.oblique-cart-scene svg'),b=svg.getBoundingClientRect();return {width:innerWidth,pageOverflow:document.documentElement.scrollWidth>innerWidth+1,scene:{x:b.x,right:b.right},clipped:[...e.querySelectorAll('button,p')].some(n=>n.scrollWidth>n.clientWidth+1)};});assert.equal(m.pageOverflow,false);assert.equal(m.clipped,false);assert.ok(m.scene.x>=0&&m.scene.right<=width);measures.push(m);
      if(captures&&[390,320].includes(width))await details.screenshot({path:path.join(captures,`${width}-explanation.png`)});
    }
    if(captures)await fs.writeFile(path.join(captures,'widths.json'),JSON.stringify(measures,null,2));
    const q=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await q.clock.install();await q.goto(base);await q.waitForFunction(()=>document.querySelector('#oblique-lab').dataset.state==='idle');await q.clock.pauseAt(new Date(await q.evaluate(()=>Date.now())+100));await q.locator('#oblique-explanation summary').tap();await q.clock.runFor(50);assert.equal(await q.locator('#oblique-cart').getAttribute('data-state'),'idle');await q.locator('#oblique-cart-play').tap();await q.clock.runFor(4000);assert.equal(await q.locator('#oblique-cart').getAttribute('data-state'),'complete');await q.close();
  });
  await t.test('the second-section straight cart and optical experiment retain their independent behavior',async()=>{
    await details.locator('summary').click();await p.locator('#normal-explanation summary').click();await p.clock.runFor(30);await p.locator('#normal-cart-play').click();await p.clock.runFor(3000);assert.match(await p.locator('#normal-cart').getAttribute('transform'),/^translate\(0 /);assert.match(await p.locator('#normal-cart-status').innerText(),/仍直直前進/);
    await p.locator('#oblique-start').click();await p.clock.runFor(2200);assert.equal(await p.locator('#oblique-lab').getAttribute('data-state'),'complete');assert.equal(await p.locator('#oblique-finding').isVisible(),true);
  });
  assert.deepEqual(errors,[]);
});
