const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

test('4.2 共用卡片與頁寬逐項對照現行4.1',{timeout:180000},async t=>{
  const root=path.resolve(__dirname,'..');
  let base=process.env.LESSON_BASE_URL;
  if(!base){
    const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:root,stdio:['ignore','pipe','ignore']});
    t.after(()=>server.kill());
    const port=await new Promise((resolve,reject)=>{let s='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{s+=d;const m=s.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
    base=`http://127.0.0.1:${port}/`;
  }
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
  t.after(()=>browser.close());
  const context=await browser.newContext({javaScriptEnabled:false,reducedMotion:'reduce'});
  const reference=await context.newPage(),page=await context.newPage();
  const failed=[];
  for(const p of [reference,page]){p.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});p.on('requestfailed',r=>failed.push(r.url()));}
  await reference.goto(new URL('units/4/parts/4.1/',base).href,{waitUntil:'load'});
  await page.goto(new URL('units/4/parts/4.2/',base).href,{waitUntil:'load'});
  const capture=process.env.STYLE_CAPTURE_DIR;
  if(capture)fs.mkdirSync(capture,{recursive:true});
  const measurements=[];
  const resize=async width=>{
    for(const p of [reference,page]){
      await p.setViewportSize({width,height:900});
      // Commit a frame in both tabs before comparing responsive styles.
      // Background tabs can otherwise retain the preceding viewport's styles.
      await p.bringToFront();
      await p.screenshot({clip:{x:0,y:0,width:1,height:1}});
    }
  };
  const styles=async(p,selector,properties,pseudo=null)=>p.locator(selector).first().evaluate((e,{properties,pseudo})=>{const s=getComputedStyle(e,pseudo);return Object.fromEntries(properties.map(k=>[k,s[k]]));},{properties,pseudo});
  const cardProperties=['backgroundColor','borderColor','borderWidth','borderStyle','borderRadius','boxShadow','color','lineHeight','padding'];
  const headProperties=['display','padding','columnGap','rowGap','alignItems','borderBottom'];
  const titleProperties=['fontSize','lineHeight','margin','fontWeight','color','letterSpacing','overflowWrap'];
  const numberProperties=['width','height','backgroundColor','color','fontSize','fontWeight','lineHeight','borderRadius','borderWidth','letterSpacing'];
  const subtitleProperties=['fontSize','lineHeight','margin','color','fontWeight','whiteSpace'];
  const avatarProperties=['width','height','borderWidth','borderRadius','boxShadow','backgroundSize'];
  for(const width of [1440,1366,1100,1024,900,781,780,768,761,760,700,650,390,320])await t.test(`${width}px：頁寬、六區卡片、標頭、編號、副標及頭像與4.1一致`,async()=>{
    await resize(width);
    const expected={card:await styles(reference,'.lesson-card',cardProperties),head:await styles(reference,'.lesson-head',headProperties),title:await styles(reference,'.lesson-head h2',titleProperties),number:await styles(reference,'.lesson-number',numberProperties),subtitle:await styles(reference,'.lesson-head p',subtitleProperties),body:await styles(reference,'.lesson-body',['padding']),avatar:await styles(reference,'.lesson-card .speaker',avatarProperties,'::before')};
    const shell=await styles(reference,'.shell',['width']),layout=await styles(reference,'.lesson-layout',['gridTemplateColumns','gap']),list=await styles(reference,'.cards',['gap']);
    assert.deepEqual(await styles(page,'.shell',['width']),shell);
    assert.deepEqual(await styles(page,'.lesson-layout',['gridTemplateColumns','gap']),layout);
    assert.deepEqual(await styles(page,'.lesson-list',['gap']),list);
    for(let i=1;i<=6;i++){
      const id=`card-0${i}`,s='#'+id;
      assert.deepEqual(await styles(page,s,cardProperties),expected.card,`${id} card`);
      assert.deepEqual(await styles(page,s+' .card-heading',headProperties),expected.head,`${id} head`);
      assert.deepEqual(await styles(page,s+' .card-heading h2',titleProperties),expected.title,`${id} title`);
      assert.deepEqual(await styles(page,s+' .card-number',numberProperties),expected.number,`${id} number`);
      assert.deepEqual(await styles(page,s+' .card-subtitle',subtitleProperties),expected.subtitle,`${id} subtitle`);
      assert.deepEqual(await styles(page,s+' > .card-main',['padding']),expected.body,`${id} body`);
      if(await page.locator(s+' .speaker').count())assert.deepEqual(await styles(page,s+' .speaker',avatarProperties,'::before'),expected.avatar,`${id} avatar`);
      const geometry=await page.locator(s).evaluate(e=>{const c=e.getBoundingClientRect(),h=e.querySelector('.card-heading').getBoundingClientRect(),b=e.querySelector('.card-main').getBoundingClientRect();return{card:[c.left,c.right,c.width],head:[h.left,h.width,h.bottom],body:[b.left,b.width,b.top],overflow:[...e.querySelectorAll('.card-heading h2,.card-subtitle')].some(n=>n.scrollWidth>n.clientWidth+1)};});
      assert.ok(Math.abs(geometry.head[0]-geometry.body[0])<1&&Math.abs(geometry.head[1]-geometry.body[1])<1);
      assert.ok(geometry.head[1]>=geometry.card[2]-3);
      assert.ok(geometry.head[2]<=geometry.body[2]+1);
      assert.equal(geometry.overflow,false);
      measurements.push({width,id,...geometry});
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'整頁無水平溢出');
    if(capture&&[1440,390].includes(width))for(const id of ['card-01','card-03','card-05','unit-quiz']){await page.locator('#'+id+' h2').first().evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:path.join(capture,`${id}-${width}.png`)});}
  });
  await t.test('小測外框、標頭、留白及頭像對齊4.1，保留獨立任務結構',async()=>{
    for(const width of [1440,760,390,320]){
      await resize(width);
      assert.deepEqual(await styles(page,'#unit-quiz',cardProperties),await styles(reference,'.unit-booklet',cardProperties));
      assert.deepEqual(await styles(page,'.periscope-heading',['padding','gap','alignItems','borderBottom','backgroundImage','lineHeight']),await styles(reference,'.booklet-heading',['padding','gap','alignItems','borderBottom','backgroundImage','lineHeight']));
      assert.deepEqual(await styles(page,'.periscope-heading h2',titleProperties),await styles(reference,'.booklet-heading h2',titleProperties));
      assert.deepEqual(await styles(page,'.quiz-icon',numberProperties),await styles(reference,'.booklet-mark',numberProperties));
      assert.deepEqual(await styles(page,'.periscope-heading small',['fontSize','color','margin','fontWeight','letterSpacing']),await styles(reference,'.booklet-kicker',['fontSize','color','margin','fontWeight','letterSpacing']));
      assert.deepEqual(await styles(page,'.periscope-heading p',['fontSize','color','margin','fontWeight']),await styles(reference,'.booklet-heading p:last-child',['fontSize','color','margin','fontWeight']));
      assert.deepEqual(await styles(page,'.periscope-body',['padding']),await styles(reference,'.booklet-body',['padding']));
      assert.deepEqual(await styles(page,'.periscope-body .speaker',avatarProperties,'::before'),await styles(reference,'.booklet-body .speaker',avatarProperties,'::before'));
    }
    assert.equal(await page.locator('#unit-quiz [role=tab]').count(),3);
    assert.equal(await page.locator('#periscope-scene,#periscope-view,#periscope-check').count(),3);
  });
  await t.test('窄版導覽跳至各區後，標題不被固定導覽遮住',async()=>{
    await page.setViewportSize({width:390,height:844});
    for(const id of ['card-01','card-03','card-06','unit-quiz']){
      await page.locator(`.route a[href="#${id}"]`).click();
      const r=await page.evaluate(id=>({routeBottom:document.querySelector('.route').getBoundingClientRect().bottom,titleTop:document.querySelector('#'+id+' h2').getBoundingClientRect().top}),id);
      assert.ok(r.titleTop>=r.routeBottom,JSON.stringify({id,...r}));
    }
  });
  await t.test('七個導覽目標、唯一ID、圖片及樣式資源保持可用',async()=>{
    const ids=await page.locator('[id]').evaluateAll(es=>es.map(e=>e.id));assert.equal(ids.length,new Set(ids).size);
    assert.deepEqual(await page.locator('.route a').evaluateAll(es=>es.map(e=>e.hash)),['#card-01','#card-02','#card-03','#card-04','#card-05','#card-06','#unit-quiz']);
    assert.deepEqual(failed,[]);
  });
  if(capture)fs.writeFileSync(path.join(capture,'layout.json'),JSON.stringify(measurements,null,2));
});
