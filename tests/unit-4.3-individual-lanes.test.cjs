const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require('playwright');
const configs=[
 {id:'speed',prefix:'race',attribute:'race',duration:[10000/3,40000/9,5000],selector:'.race-lane',key:'material',scene:'.race-table',clock:'.race-clock',other:'#s3',point:(w,h,i)=>[w*.18,h*[.2275,.4332,.6504][i]]},
 {id:'normal',prefix:'normal',attribute:'normal',duration:[5000,17500/3,6250],selector:'.normal-lane',key:'medium',scene:'.normal-table',clock:'.normal-clock',other:'#s1',point:(w,h,i)=>[w*[350/1536,.5,1184/1536][i],h*.23]}
];
async function setup(t){
 let base=process.env.LESSON_BASE_URL;
 if(!base){const s=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>s.kill());const port=await new Promise((r,j)=>{let out='';s.stdout.on('data',x=>{out+=x;const m=out.match(/port (\d+)/);if(m)r(m[1]);});s.on('error',j);});base='http://127.0.0.1:'+port+'/units/4/parts/4.3/';}
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>b.close());
 const p=await b.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.install();await p.goto(base);await p.waitForFunction(()=>['speed','normal'].every(id=>document.querySelector('#'+id+'-lab').dataset.state==='idle'));await p.clock.pauseAt(new Date(await p.evaluate(()=>Date.now())+100));return{p,errors,b,base};
}
for(const c of configs)test('4.3 '+c.id+' apparatus supports genuinely independent launch and timing',{timeout:180000},async t=>{
 const {p,errors,b,base}=await setup(t),lab=p.locator('#'+c.id+'-lab'),lamp=key=>p.locator(`[data-${c.attribute}-source="${key}"]`),run=ms=>p.clock.runFor(ms),rows=[];
 const lanes=()=>p.locator(c.selector).evaluateAll(es=>es.map(e=>({time:Number(e.dataset.elapsedMs),state:e.dataset.state,arrived:e.dataset.arrived==='true'})));
 const check=(actual,expected)=>actual.forEach((v,i)=>assert.ok(Math.abs(v.time-expected[i])<30,JSON.stringify({actual,expected})));
 const start=p.locator('#'+c.prefix+'-start'),pause=p.locator('#'+c.prefix+'-pause');
 await t.test('staggered launches have separate elapsed times and unstarted lanes stay dark',async()=>{
  await lamp('water').click();assert.equal(await lab.getAttribute('data-mode'),'individual');await run(1000);
  check(await lanes(),[0,1000,0]);assert.equal((await lanes())[0].state,'idle');assert.equal(await lab.locator(c.clock).isVisible(),false);
  await lamp('air').click();await run(1000);check(await lanes(),[1000,2000,0]);
  await lamp('glass').click();await run(500);check(await lanes(),[1500,2500,500]);
  const text=await lab.innerText();assert.doesNotMatch(text,/同步前進中|三束光在空氣中同步|空氣先到/);
  if(c.id==='normal')assert.equal(await p.locator('.normal-steps').count(),0);
  const reading=await p.locator(c.id==='speed'?'[data-arrival=water] strong':'[data-medium=water] .normal-arrival-time').textContent();assert.ok(Math.abs(parseFloat(reading)-2.5)<.03,reading);
 });
 await t.test('a single-lane replay preserves the other clocks, global pause excludes idle time',async()=>{
  const before=await lanes();await lamp('water').click();const now=await lanes();assert.equal(now[1].time,0);assert.ok(now[0].time>=before[0].time&&now[0].time-before[0].time<30);assert.ok(now[2].time>=before[2].time&&now[2].time-before[2].time<30);
  await run(300);await pause.click();const saved=await lanes();await run(900);assert.deepEqual(await lanes(),saved);await pause.click();await run(500);check(await lanes(),saved.map(l=>Math.min(c.duration[saved.indexOf(l)],l.time+500)));
  await run(8000);assert.equal(await lab.getAttribute('data-state'),'complete');check(await lanes(),c.duration);assert.deepEqual((await lanes()).map(l=>l.arrived),[true,true,true]);
 });
 await t.test('synchronous mode resets all clocks and retains its one-time comparison stop',async()=>{
  await start.click();assert.equal(await lab.getAttribute('data-mode'),'together');check(await lanes(),[0,0,0]);assert.equal(await lab.locator(c.clock).isVisible(),true);
  await run(c.id==='normal'?5200:5100);
  if(c.id==='normal'){assert.equal(await lab.getAttribute('data-pause-reason'),'comparison');check(await lanes(),[5000,5000,5000]);await pause.click();await run(1500);}
  assert.equal(await lab.getAttribute('data-state'),'complete');
  await start.click();await run(1000);await lamp('glass').click();check(await lanes(),[1000,1000,0]);await run(7000);assert.equal(await lab.getAttribute('data-state'),'complete');
 });
 await t.test('automatic pause preserves clocks and scroll, manual pauses remain manual',async()=>{
  await lamp('air').click();await run(300);await pause.click();const air=(await lanes())[0].time;
  await lamp('water').click();await run(300);const water=(await lanes())[1].time;
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await run(1000);check(await lanes(),[air,water,c.duration[2]]);
  await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await run(200);const after=await lanes();assert.equal(after[0].state,'paused');assert.equal(after[0].time,air);assert.ok(after[1].time>water);
  await p.locator(c.other).evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForTimeout(150);await run(100);const saved=await lanes();await run(1000);assert.deepEqual(await lanes(),saved);
  await p.locator(c.scene).evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-10,behavior:'instant'}));await p.waitForTimeout(150);const y=await p.evaluate(()=>scrollY);await run(200);assert.equal(await p.evaluate(()=>scrollY),y);assert.equal((await lanes())[0].time,air);assert.ok((await lanes())[1].time>saved[1].time);
  await pause.click();
 });
 await t.test('all three physical lamp positions work at four desktop sizes without covering labels',async()=>{
  for(const [width,height]of[[1366,768],[1024,768],[1280,720],[1440,900]]){
   await p.setViewportSize({width,height});
   for(const [i,key]of ['air','water','glass'].entries()){
    const button=lamp(key);await button.scrollIntoViewIfNeeded();
    const box=await p.locator(c.scene).boundingBox(),[dx,dy]=c.point(box.width,box.height,i),x=box.x+dx,y=box.y+dy;
    const hit=await p.evaluate(([x,y])=>document.elementFromPoint(x,y)?.dataset,[x,y]);assert.equal(hit[c.attribute+'Source'],key);
    const bounds=await button.boundingBox();assert.ok(bounds.width>=44&&bounds.height>=44);
    if(c.id==='normal'){
     const label=await p.locator('.normal-name.'+key).boundingBox();assert.ok(bounds.y>=label.y+label.height-1,JSON.stringify({width,key,bounds,label}));
     const badge=await p.locator('#normal-state').boundingBox();assert.ok(badge.y+badge.height<=label.y,'independent-state badge overlaps apparatus names');
    }
    await p.mouse.click(x,y);assert.equal((await lanes())[i].time,0);await run(250);assert.ok((await lanes())[i].time>200);
    await button.focus();await p.keyboard.press(i%2?'Enter':'Space');assert.equal((await lanes())[i].time,0);await run(200);rows.push({width,key,lanes:await lanes()});
   }
   if(process.env.INDIVIDUAL_CAPTURE_DIR){await fs.mkdir(process.env.INDIVIDUAL_CAPTURE_DIR,{recursive:true});await p.locator(c.scene).screenshot({path:path.join(process.env.INDIVIDUAL_CAPTURE_DIR,width+'-'+c.id+'.png')});}
  }
 });
 await t.test('image errors disable every lamp and successful retry enables them',async()=>{
  const q=await b.newPage();const image=c.id==='speed'?'light-speed-bench.png':'normal-incidence-half-air-bench.png';await q.route('**/'+image+'*',r=>r.abort());await q.goto(base);await q.waitForFunction(id=>document.querySelector('#'+id+'-lab').dataset.state==='error',c.id);
  for(const key of ['air','water','glass'])assert.equal(await q.locator(`[data-${c.attribute}-source="${key}"]`).isDisabled(),true);
  await q.unroute('**/'+image+'*');await q.locator('#'+c.prefix+'-retry').click();await q.waitForFunction(id=>document.querySelector('#'+id+'-lab').dataset.state==='idle',c.id);assert.equal(await q.locator(`[data-${c.attribute}-source="air"]`).isEnabled(),true);await q.close();
 });
 if(process.env.INDIVIDUAL_CAPTURE_DIR)await fs.writeFile(path.join(process.env.INDIVIDUAL_CAPTURE_DIR,c.id+'-measurements.json'),JSON.stringify(rows,null,2));assert.deepEqual(errors,[]);
});
