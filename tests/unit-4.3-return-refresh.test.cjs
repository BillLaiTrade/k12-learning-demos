const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {setup}=require('./helpers/unit43.cjs');
const sizes=[[1920,900],[1920,720],[1440,900],[1440,650],[1366,600],[1280,720],[1024,600],[820,720],[820,600],[760,720],[600,800],[390,844],[390,667],[320,568],[812,375],[700,390]];
test('4.3 fifth-section apparatus follows the shared visual style with live main-scene side angles',{timeout:180000},async t=>{
 const {page:p,errors}=await setup(t),root=p.locator('#return-lab');
 await p.waitForFunction(()=>document.querySelector('#return-lab').dataset.state==='ready');
 const capture=process.env.RETURN_REFRESH_CAPTURE_DIR;if(capture)await fs.mkdir(capture,{recursive:true});
 const select=async key=>{await p.locator(`#return-medium-toggle [data-lab-medium=${key}]`).click();await p.waitForFunction(k=>document.querySelector('#return-lab').dataset.medium===k&&document.querySelector('#return-lab').dataset.state==='ready',key);};
 const align=async()=>{await p.evaluate(()=>{const r=document.querySelector('#return-viewport').getBoundingClientRect(),route=document.querySelector('.route'),top=innerWidth<=760?route.getBoundingClientRect().height+8:8;scrollTo({top:scrollY+r.top-top,behavior:'instant'});});await p.clock.runFor(50);};
 await t.test('cropped media, inset choices, luminous layers and opposing arrows use the actual reciprocal path',async()=>{
  await p.locator('#return-toggle-a').click();await p.locator('#return-toggle-b').click();
  assert.equal(await p.locator('#return-scene .return-upper-texture').getAttribute('viewBox'),'250 310 750 220');assert.equal(await p.locator('#return-scene .return-lower-texture').getAttribute('viewBox'),'250 610 750 220');
  const info=await root.evaluate(r=>({background:getComputedStyle(r.querySelector('#return-background')).display,switchShadow:getComputedStyle(r.querySelector('#return-medium-toggle')).boxShadow,paths:[...r.querySelectorAll('.return-light')].map(g=>({main:g.querySelector('.return-beam').getAttribute('d'),halo:g.querySelector('.return-beam-halo').getAttribute('d'),core:g.querySelector('.return-beam-core').getAttribute('d'),directions:g.querySelectorAll('.return-direction').length})),speeds:[...r.querySelectorAll('#return-scene .return-medium-speed')].map(e=>e.textContent)}));
  assert.equal(info.background,'none');assert.match(info.switchShadow,/inset/);assert.deepEqual(info.speeds,['光速較快','光速較慢']);for(const v of info.paths){assert.equal(v.main,v.halo);assert.equal(v.main,v.core);assert.equal(v.directions,2);}
  assert.equal(await p.locator('#return-angle').getAttribute('max'),'35');assert.equal(await root.locator('.return-source').count(),2);
 });
 const measurements=[];
 for(const[width,height]of sizes)await t.test(`${width} × ${height} keeps the scene and controls together`,async()=>{
  await p.setViewportSize({width,height});await p.clock.runFor(100);await p.waitForTimeout(150);
  for(const medium of ['water','glass'])for(const angle of [0,35]){
   await select(medium);await p.locator('#return-angle').fill(String(angle));await align();
   const m=await root.evaluate(r=>{const rect=e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};},scene=r.querySelector('#return-scene'),stage=rect(r.querySelector('.return-table')),deck=rect(r.querySelector('.return-control-deck')),switchBox=rect(r.querySelector('#return-medium-toggle')),matrix=scene.getScreenCTM(),route=document.querySelector('.route');return{stage,deck,switchBox,route:innerWidth<=760?route.getBoundingClientRect().bottom:0,overflow:document.documentElement.scrollWidth>innerWidth+1,innerScroll:r.querySelector('.return-table').scrollHeight>r.querySelector('.return-table').clientHeight+1,matrix:[matrix.a,matrix.d],controls:[...r.querySelectorAll('.return-control-deck button,.return-control-deck input,#return-medium-toggle button')].map(rect),sources:[...r.querySelectorAll('#return-devices .return-source-hit')].map(rect),labels:[...scene.querySelectorAll('text')].map(e=>({box:rect(e),size:parseFloat(getComputedStyle(e).fontSize)*matrix.a})),clipped:[...r.querySelectorAll('.return-control-deck button,.return-control-deck label,.return-finding')].some(e=>e.scrollWidth>e.clientWidth+1)};});
   const tag=`${width}x${height} ${medium} ${angle}`;assert.equal(m.overflow,false,tag);assert.equal(m.innerScroll,false,tag);assert.equal(m.clipped,false,tag);assert.ok(m.stage.y>=m.route&&m.deck.bottom<=height+.5,JSON.stringify({tag,m}));assert.ok(Math.abs(m.matrix[0]-m.matrix[1])<1e-8);
   for(const b of m.controls)assert.ok(b.x>=0&&b.right<=width+.5&&b.y>=m.route&&b.bottom<=height+.5,`${tag} control`);
   for(const b of m.sources){assert.ok(b.width>=44&&b.height>=44,`${tag} target`);assert.ok(b.x>=m.stage.x-1&&b.right<=m.stage.right+1&&b.y>=m.stage.y-1&&b.bottom<=m.stage.bottom+1,JSON.stringify({tag,target:b,stage:m.stage}));assert.ok(b.right<=m.switchBox.x||b.x>=m.switchBox.right||b.bottom<=m.switchBox.y||b.y>=m.switchBox.bottom,JSON.stringify({tag,source:b,switch:m.switchBox}));}
   for(const l of m.labels){assert.ok(l.box.x>=m.stage.x-1&&l.box.right<=m.stage.right+1&&l.box.y>=m.stage.y-1&&l.box.bottom<=m.stage.bottom+1,JSON.stringify({tag,label:l,stage:m.stage}));assert.ok(l.size>=11.9,`${tag} label size`);}
   const overlaps=(a,b)=>Math.min(a.right,b.right)>Math.max(a.x,b.x)+.5&&Math.min(a.bottom,b.bottom)>Math.max(a.y,b.y)+.5;
   for(const [i,l]of m.labels.entries()){assert.equal(overlaps(l.box,m.switchBox),false,JSON.stringify({tag,label:l,selector:m.switchBox}));for(const other of m.labels.slice(i+1))assert.equal(overlaps(l.box,other.box),false,JSON.stringify({tag,label:l,other}));}
   measurements.push({width,height,medium,angle,...m});
  }
  if(capture&&[1440,390,320,812].includes(width))await p.screenshot({path:path.join(capture,`${width}x${height}-both.png`)});
 });
 await t.test('side labels are always neutral and visible in the main scene whenever either lamp is on',async()=>{
  assert.equal(await p.locator('#return-magnify,#return-detail,#return-zoom,#return-close').count(),0);
  for(const medium of ['water','glass']){
   await select(medium);
   for(const combo of [[true,false],[false,true],[true,true],[false,false]]){
    for(const [i,key]of ['a','b'].entries())if((await root.getAttribute(`data-light-${key}`)==='true')!==combo[i])await p.locator(`#return-toggle-${key}`).click();
    assert.equal(await p.locator('#return-scene .return-angle-marks').getAttribute('visibility'),combo.some(Boolean)?'visible':'hidden');
    assert.equal(await p.locator('.return-upper-label .return-angle-name').textContent(),'空氣側');assert.equal(await p.locator('.return-lower-label .return-angle-name').textContent(),`${medium==='water'?'水':'玻璃'}側`);
   }
  }
 });
 await t.test('focus, switching, keyboard adjustment and reset do not move a fitted apparatus',async()=>{
  for(const[width,height]of [[1440,650],[390,667],[320,568],[700,390]]){
   await p.setViewportSize({width,height});await p.clock.runFor(100);await p.waitForTimeout(150);await align();await p.waitForTimeout(100);const y=await p.evaluate(()=>scrollY);
   await p.locator('#return-devices [data-source=a]').focus();await p.keyboard.press('Home');await p.keyboard.press('ArrowUp');await p.locator('#return-toggle-a').click();await p.locator('#return-reset').click();await p.clock.runFor(100);const now=await p.evaluate(()=>scrollY);assert.ok(Math.abs(now-y)<1.5,JSON.stringify({width,height,before:y,after:now,stage:await p.locator('#return-viewport').boundingBox(),deck:await p.locator('.return-control-deck').boundingBox()}));assert.equal(await root.getAttribute('data-light-a'),'false');assert.equal(await root.getAttribute('data-light-b'),'false');assert.equal(await p.locator('#return-angle').inputValue(),'30');
  }
 });
 if(capture)await fs.writeFile(path.join(capture,'measurements.json'),JSON.stringify(measurements,null,2));assert.deepEqual(errors,[]);
});
