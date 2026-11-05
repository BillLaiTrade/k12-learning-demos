const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require('playwright');
async function setup(t){
 let base=process.env.LESSON_BASE_URL;
 if(!base){const s=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>s.kill());const port=await new Promise((r,j)=>{let out='';s.stdout.on('data',x=>{out+=x;const m=out.match(/port (\d+)/);if(m)r(m[1]);});s.on('error',j);});base='http://127.0.0.1:'+port+'/units/4/parts/4.3/';}
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>b.close());
 const p=await b.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.install();await p.goto(base);await p.waitForFunction(()=>document.querySelector('#exit-lab').dataset.state==='idle');await p.clock.pauseAt(new Date(await p.evaluate(()=>Date.now())+100));return{p,errors};
}
async function capture(p,sel,name){if(process.env.CART_LAYOUT_CAPTURE_DIR){await fs.mkdir(process.env.CART_LAYOUT_CAPTURE_DIR,{recursive:true});await p.locator(sel).screenshot({path:path.join(process.env.CART_LAYOUT_CAPTURE_DIR,name+'.png')});}}
const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;

test('4.3 compact cart explanations preserve full wheels, readable labels and separate state from reasoning',{timeout:180000},async t=>{
 const {p,errors}=await setup(t),rows=[];
 for(const [width,height]of[[1366,768],[1024,768],[1280,720],[1440,900]]){
  await p.setViewportSize({width,height});
  for(const id of ['normal','oblique']){
   const details=p.locator('#'+id+'-explanation'),button=p.locator('#'+id+'-cart-play');await details.locator('summary').click();await p.waitForTimeout(120);
   const layout=await details.evaluate(e=>{const box=n=>{const b=n.getBoundingClientRect();return{x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};return{scene:box(e.querySelector('svg')),copy:box(e.querySelector('.cart-analogy-copy')),status:box(e.querySelector('[role=status]')),button:box(e.querySelector('button')),clipped:[...e.querySelectorAll('p,button')].filter(n=>n.clientWidth&&n.scrollWidth>n.clientWidth+2).map(n=>n.className),columns:getComputedStyle(e.querySelector('.cart-analogy-grid')).gridTemplateColumns};});
   assert.ok(layout.copy.x>layout.scene.right);assert.ok(Math.abs(layout.copy.y-layout.scene.y)<6);assert.ok(Math.abs((layout.status.y+layout.status.height/2)-(layout.button.y+layout.button.height/2))<2);assert.deepEqual(layout.clipped,[]);assert.ok(layout.button.height>=44);rows.push({width,id,layout});
   await button.click();assert.equal(await button.textContent(),'示範中…');assert.equal(await button.isDisabled(),true);
   let old=0;
   for(const time of [0,100,200,350,1150,1950,3500]){
    await p.clock.runFor(time-old);old=time;
    const frame=await details.evaluate((e,id)=>{const box=n=>{const b=n.getBoundingClientRect();return{x:b.x,y:b.y,right:b.right,bottom:b.bottom};};const svg=e.querySelector('svg'),scale=Math.hypot(svg.getScreenCTM().a,svg.getScreenCTM().b),cart=e.querySelector('#'+id+'-cart');return{svg:box(svg),wheels:[...cart.querySelectorAll('g > rect:first-child')].map(box),labels:[...svg.querySelectorAll('text')].map(n=>({text:n.textContent,box:box(n),size:parseFloat(getComputedStyle(n).fontSize)*scale})),state:cart.dataset.state};},id);
    assert.equal(frame.wheels.length,2);
    for(const wheel of frame.wheels){assert.ok(wheel.x>=frame.svg.x+1&&wheel.right<=frame.svg.right-1,id+' wheel clipped horizontally');assert.ok(wheel.y>=frame.svg.y+1&&wheel.bottom<=frame.svg.bottom-1,id+' wheel clipped vertically at '+time);}
    for(const label of frame.labels){assert.ok(label.size>=11.8,id+' diagram text too small');assert.ok(label.box.x>=frame.svg.x&&label.box.right<=frame.svg.right&&label.box.y>=frame.svg.y&&label.box.bottom<=frame.svg.bottom,id+' text outside diagram');for(const wheel of frame.wheels)assert.equal(overlap(label.box,wheel),false,id+' text overlaps a wheel: '+label.text+' at '+time);}
    rows.push({width,id,time,frame});if(time===0&&[1366,1024].includes(width))await capture(p,'#'+id+'-explanation',width+'-'+id+'-initial');
   }
   assert.equal(await button.textContent(),'再看一次');await capture(p,'#'+id+'-explanation',width+'-'+id);await details.locator('summary').click();
  }
 }
 if(process.env.CART_LAYOUT_CAPTURE_DIR)await fs.writeFile(path.join(process.env.CART_LAYOUT_CAPTURE_DIR,'layout.json'),JSON.stringify(rows,null,2));assert.deepEqual(errors,[]);
});
