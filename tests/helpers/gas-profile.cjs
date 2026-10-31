const {test}=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),{chromium}=require('playwright');
module.exports=function profileTest({id,name,english,percent,rank,example,envName}){
 test(`2.3 ${english}: gas introduction first and compact life example`,{timeout:120000},async t=>{
  let server,url=process.env.GAS_PROFILE_URL||process.env[envName];
  if(!url){server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'../..')});t.after(()=>server.kill());const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server startup timeout')),5000);server.stdout.on('data',b=>{const m=String(b).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1])}});server.once('error',reject)});url=`http://127.0.0.1:${port}/units/2/parts/2.3/`;}
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--enable-unsafe-swiftshader'],...(process.env.GAS_PROFILE_URL||process.env[envName]?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url())});await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  const section=page.locator(`#s${id}`);await section.scrollIntoViewIfNeeded();await section.locator('img').evaluate(n=>n.decode());
  const artifacts=process.env.GAS_PROFILE_ARTIFACT_DIR||`/tmp/unit23-gas-profiles`;await fs.mkdir(artifacts,{recursive:true});
  await t.test('approved name, formula, approximate dry-air proportion and three qualified properties are readable',async()=>{
   assert.equal(await section.locator('h2').innerText(),name);assert.equal(await section.locator('.gas-profile-english').innerText(),english);assert.equal(await section.locator('.gas-profile-percent strong').innerText(),percent);
   assert.match(await section.locator('.gas-profile-abundance').innerText(),/約/);assert.match(await section.locator('.gas-profile-basis').innerText(),/全部乾燥空氣/);assert.equal(await section.locator('.gas-profile-rank').innerText(),rank);
   assert.deepEqual(await section.locator('.gas-profile-property h3').allTextContents(),['外觀','反應特性','燃燒特性']);assert.match(await section.innerText(),/一般條件下/);assert.match(await section.innerText(),/相對不易反應/);assert.match(await section.innerText(),/不可燃/);assert.match(await section.innerText(),/不支持\s*一般燃燒/);
   if(id===3){assert.equal(await section.locator('.gas-profile-symbol sub').innerText(),'2');assert.equal(await section.locator('.gas-profile-symbol').textContent(),'N2')}else assert.equal(await section.locator('.gas-profile-symbol').innerText(),'Ar');
  });
  await t.test('life example is below the introduction and carries a small photo with text',async()=>{
   assert.equal(await section.locator('.gas-profile-example h4').innerText(),example);assert.equal(await section.locator('img').count(),1);assert.ok((await section.locator('img').getAttribute('alt')).length>15);
   const r=await section.evaluate(el=>{const properties=el.querySelector('.gas-profile-properties').getBoundingClientRect(),life=el.querySelector('.gas-profile-life').getBoundingClientRect(),hero=el.querySelector('.gas-profile-hero').getBoundingClientRect(),photo=el.querySelector('img').getBoundingClientRect();return{ordered:life.top>=properties.bottom,introHeight:properties.bottom-hero.top,exampleHeight:life.height,photoWidth:photo.width,cardWidth:el.getBoundingClientRect().width}});
   assert.ok(r.ordered);assert.ok(r.introHeight>r.exampleHeight);assert.ok(r.photoWidth<r.cardWidth*.45);
   assert.equal(await section.locator('button,input,select,canvas,.nitrogen-compare,.argon-comparison').count(),0);
   assert.equal(await section.locator('.dialogue').count(),2);
   for(const character of ['xiaokui','grandpa']) assert.equal(await section.locator(`.dialogue.${character} .speaker`).count(),1);
   assert.ok(await section.locator('img').evaluate(n=>n.complete&&n.naturalWidth>0));
   const retired=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/\/(nitrogen|argon)\.mjs\?/.test(r.name)).map(r=>r.name));assert.deepEqual(retired,[]);
  });
  await t.test('seven widths share the unit format, fit all text and keep examples secondary',async()=>{
   const formatEvidence=[];
   for(const width of[1440,1280,1024,800,768,390,320]){await page.setViewportSize({width,height:1100});await section.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width} document overflow`);
    const formats=await section.evaluate(el=>{
     const reference=document.querySelector('#s2');
     const styles=(root)=>{
      const pick=(node,props,pseudo)=>{const c=getComputedStyle(node,pseudo);return Object.fromEntries(props.map(p=>[p,c[p]]))};
      return {card:pick(root,['backgroundColor','borderColor','borderRadius']),header:pick(root.querySelector('.lesson-head'),['display','padding','gap','borderBottomColor']),number:pick(root.querySelector('.lesson-number'),['width','height','borderRadius','backgroundColor','color','fontSize','fontFamily']),heading:pick(root.querySelector('h2'),['fontSize','fontFamily','color','lineHeight','letterSpacing']),body:pick(root.querySelector('.lesson-body'),['padding'])};
     };
     const avatars=[...el.querySelectorAll('.speaker')].map(n=>{const c=getComputedStyle(n,'::before');return{image:c.backgroundImage,width:c.width,height:c.height}});
     return{reference:styles(reference),profile:styles(el),avatars};
    });
    assert.deepEqual(formats.profile,formats.reference,`${width}: shared unit format`);
    for(const avatar of formats.avatars){assert.match(avatar.image,/dialogue-character-avatars/);assert.equal(avatar.width,'44px');assert.equal(avatar.height,'44px')}
    formatEvidence.push({width,...formats});
    const data=await section.evaluate(el=>{const bounds=el.getBoundingClientRect();return[...el.querySelectorAll('h2,.gas-profile-percent,.gas-profile-basis,.gas-profile-property,.gas-profile-example,.gas-profile-example-copy h4,.gas-profile-example-copy p')].map(n=>{const r=n.getBoundingClientRect();return{left:r.left-bounds.left,right:bounds.right-r.right,overflow:n.scrollWidth>n.clientWidth+1,text:n.textContent}})});for(const b of data){assert.ok(b.left>=-1&&b.right>=-1,`${width}: ${b.text}`);assert.equal(b.overflow,false,`${width}: clipped ${b.text}`)}
    const r=await section.evaluate(el=>({intro:el.querySelector('.gas-profile-properties').getBoundingClientRect().bottom-el.querySelector('.gas-profile-hero').getBoundingClientRect().top,example:el.querySelector('.gas-profile-life').getBoundingClientRect().height}));assert.ok(r.intro>r.example,`${width} introduction dominates`);
    if([1440,1024,390,320].includes(width))await section.screenshot({path:path.join(artifacts,`${english.toLowerCase()}-${width}.png`)});
   }
   await fs.writeFile(path.join(artifacts,`${english.toLowerCase()}-shared-format.json`),JSON.stringify(formatEvidence,null,2)+'\n');
  });
  await t.test('touch navigation reaches the gas profile and the existing final quiz',async()=>{
   const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});try{await p.goto(url,{waitUntil:'networkidle'});await p.locator(`.route a[href="#s${id}"]`).tap();await p.waitForFunction(id=>document.querySelector('.route a[aria-current]')?.getAttribute('href')===`#s${id}`,id);assert.equal(await p.locator(`#s${id} h2`).innerText(),name);await p.locator('.route a[href="#s7"]').tap();await p.waitForFunction(()=>document.querySelector('.route a[aria-current]')?.getAttribute('href')==='#s7');assert.equal(await p.locator('#gas-report-form').count(),1);}finally{await p.close()}
  });
  await t.test('no JavaScript retains the complete profile and example',async()=>{
   const p=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});try{await p.goto(url,{waitUntil:'networkidle'});const s=p.locator(`#s${id}`);await s.scrollIntoViewIfNeeded();await s.locator('img').evaluate(n=>n.decode());assert.equal(await s.locator('h2').innerText(),name);assert.equal(await s.locator('.gas-profile-property:visible').count(),3);assert.equal(await s.locator('.gas-profile-example:visible').count(),1);assert.equal(await s.locator('img').evaluate(n=>n.complete&&n.naturalWidth>0),true);}finally{await p.close()}
  });
  assert.deepEqual(errors,[]);
 });
};
