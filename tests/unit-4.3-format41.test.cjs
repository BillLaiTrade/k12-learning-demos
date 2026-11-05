const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
const comparisons=[
 ['body','body',['fontFamily','fontSize','lineHeight','color','backgroundColor']],
 ['.shell','.shell',['width']],['.masthead','.masthead',['paddingTop','paddingBottom']],
 ['.brand-row','.brand-row',['fontSize','fontWeight','gap']],['.crumb','.crumb',['fontSize','fontWeight','color']],
 ['.lesson-footer','footer',['padding','fontSize','color','borderTopColor','width']],
 ['.hero-layout','.hero-layout',['columnGap','paddingTop','paddingBottom']],
 ['.eyebrow','.eyebrow',['fontFamily','fontSize','fontWeight','letterSpacing','color']],
 ['.hero h1','.hero h1',['fontFamily','fontSize','lineHeight','letterSpacing','marginTop','marginBottom']],
 ['.hero-copy','.hero p',['fontSize','lineHeight','color','marginTop','marginBottom']],
 ['.hero-cover','.hero-art',['borderRadius','boxShadow','borderTopColor']],
 ['.section-top h2','.section-top h2',['fontSize','fontWeight','lineHeight']],
 ['.route','.route',['top','paddingRight','maxHeight']],['.route-label','.route-label',['fontSize','color','marginBottom']],
 ['.route-inner a:not(.quiz-nav)','.route a:not(.booklet-route-link)',['fontSize','lineHeight','padding','borderRadius']],
 ['.route-inner a b','.route b',['fontSize','fontWeight','color']],
 ['.lesson-card','.lesson-card',['borderRadius','borderTopColor','backgroundColor','boxShadow','lineHeight']],
 ['.lesson-head','.lesson-head',['padding','gap','borderBottomColor']],
 ['.lesson-number','.lesson-number',['width','height','borderRadius','fontSize','fontWeight','color','backgroundColor']],
 ['.lesson-head h2','.lesson-head h2',['fontSize','lineHeight','fontWeight','margin']],
 ['.lesson-head p','.lesson-head p',['fontSize','lineHeight','color','marginTop']],
 ['.lesson-body','.lesson-body',['padding']],['.dialogue','.dialogue',['fontFamily','fontSize','lineHeight','padding','gap','borderRadius','backgroundColor']],
 ['.dialogue .speaker::before','.dialogue .speaker::before',['width','height','borderRadius','borderTopWidth','backgroundSize']],
 ['.unit-quiz','.unit-booklet',['borderRadius','borderTopColor','backgroundColor','boxShadow','lineHeight']],
 ['.quiz-head','.booklet-heading',['padding','gap','borderBottomColor','backgroundImage','lineHeight']],
 ['.quiz-head h2','.booklet-heading h2',['fontFamily','fontSize','lineHeight','letterSpacing','color']],
 ['.quiz-subtitle','.booklet-heading p:last-child',['fontSize','marginTop','color']],
 ['.quiz-mark','.booklet-mark',['width','height','borderRadius','fontSize','fontWeight','color','backgroundColor']],
 ['.quiz-body','.booklet-body',['padding']],
 ['.quiz-nav','.booklet-route-link',['marginTop','paddingTop','color']],
 ['.quiz-nav b','.booklet-route-link b',['width','height','borderRadius','color','backgroundColor']],
 ['#race-pause','.aperture-scene-action',['minHeight','padding','borderRadius','fontSize','fontFamily']],
 ['#normal-pause','.aperture-scene-action',['minHeight','padding','borderRadius','fontSize','fontFamily']],
 ['#oblique-start','.aperture-scene-action',['minHeight','padding','borderRadius','fontSize','fontFamily']],
 ['#depth-fill','.aperture-scene-action',['minHeight','padding','borderRadius','fontSize','fontFamily']],
 ['#rank-play','.aperture-scene-action',['minHeight','padding','borderRadius','fontSize','fontFamily']],
];
function selector(s){const a=s.split('::');return{base:a[0],pseudo:a[1]?'::'+a[1]:null};}
async function styles(p,s,props){const q=selector(s);return p.locator(q.base).first().evaluate((e,{pseudo,props})=>{const c=getComputedStyle(e,pseudo);return Object.fromEntries(props.map(k=>[k,c[k]]));},{pseudo:q.pseudo,props});}
test('4.3 format matches 4.1 while the original experiments remain usable',{timeout:180000},async t=>{
 let base=process.env.LESSON_BASE_URL;if(!base){const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());const port=await new Promise(r=>server.stdout.on('data',d=>{const m=d.toString().match(/port (\d+)/);if(m)r(m[1]);}));base=`http://127.0.0.1:${port}/units/4/parts/4.3/`;}
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),ref=await browser.newPage({viewport:{width:1440,height:900}});await ref.route('**/*',r=>r.request().resourceType()==='script'?r.abort():r.continue());const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});await Promise.all([p.goto(base),ref.goto(new URL('../4.1/',base).href)]);await p.locator('.hero-cover img').evaluate(e=>e.decode());await p.waitForFunction(()=>document.querySelector('#return-lab').dataset.state==='ready');const data=[];if(process.env.FORMAT41_CAPTURE_DIR)await fs.mkdir(process.env.FORMAT41_CAPTURE_DIR,{recursive:true});
 await t.test('four desktop/laptop viewports share computed typography, spacing, cards and controls',async()=>{
  for(const[width,height]of[[1440,900],[1366,768],[1280,720],[1024,768]]){await Promise.all([p.setViewportSize({width,height}),ref.setViewportSize({width,height})]);for(const[a,b,props]of comparisons){assert.deepEqual(await styles(p,a,props),await styles(ref,b,props),`${width} ${a} differs from 4.1 ${b}`);}
   const m=await p.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,header:document.querySelector('h1').textContent,sections:[...document.querySelectorAll('.lesson-card,.unit-quiz')].map(el=>{const r=el.getBoundingClientRect();return{id:el.id,width:r.width,bad:[...el.querySelectorAll('.lesson-head h2,.lesson-head p,.quiz-head h2,.quiz-subtitle,.dialogue p')].some(n=>n.scrollWidth>n.clientWidth+1)};})}));assert.equal(m.overflow,false);assert.ok(m.sections.every(s=>!s.bad));assert.equal(m.sections.length,7);assert.equal(m.header,'光進入水中，會發生什麼變化？');data.push(m);
   if(process.env.FORMAT41_CAPTURE_DIR){await fs.mkdir(process.env.FORMAT41_CAPTURE_DIR,{recursive:true});await p.locator('.masthead').screenshot({path:path.join(process.env.FORMAT41_CAPTURE_DIR,`${width}-header.png`)});for(const id of['s1','s3','s5','s6','s7'])await p.locator('#'+id).screenshot({path:path.join(process.env.FORMAT41_CAPTURE_DIR,`${width}-${id}.png`)});}
  }
 });
 await t.test('reading progress and existing anchor links follow all six sections and the quiz',async()=>{
  await p.setViewportSize({width:1366,height:768});for(let i=1;i<=7;i++){await p.locator(`.route a[href="#s${i}"]`).click();await p.waitForFunction(i=>document.querySelector('.route a[aria-current="step"]')?.hash===`#s${i}`,i);assert.equal(await p.locator('#lesson-progress').getAttribute('max'),'6');assert.equal(await p.locator('#lesson-progress').evaluate(e=>e.value),Math.min(6,i));assert.equal(await p.locator('#route-progress').count(),0);}
 });
 await t.test('shared buttons preserve primary/secondary states, focus and source controls',async()=>{
  const green='rgb(23, 107, 83)';for(const id of['race-start','normal-start','oblique-start','exit-start','depth-fill','rank-play','rank-check']){const v=await p.locator('#'+id).evaluate(e=>({bg:getComputedStyle(e).backgroundColor,r:getComputedStyle(e).borderRadius}));assert.equal(v.bg,green,id);assert.equal(v.r,'13px',id);}
  await p.locator('#s3').scrollIntoViewIfNeeded();await p.keyboard.press('Tab');await p.locator('#oblique-start').focus();const outline=await p.locator('#oblique-start').evaluate(e=>({color:getComputedStyle(e).outlineColor,width:getComputedStyle(e).outlineWidth}));assert.equal(outline.color,'rgb(199, 142, 49)');assert.equal(outline.width,'3px');
  assert.deepEqual(errors,[]);
 });
 if(process.env.FORMAT41_CAPTURE_DIR)await fs.writeFile(path.join(process.env.FORMAT41_CAPTURE_DIR,'layout.json'),JSON.stringify({data,comparisons:comparisons.length,errors},null,2));
});
