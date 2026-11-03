const {spawn}=require('node:child_process');
const path=require('node:path');
const {chromium}=require('playwright');
exports.setup=async(t,options={})=>{
 let base=process.env.LESSON_BASE_URL;
 if(!base){const s=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'../..'),stdio:['ignore','pipe','ignore']});t.after(()=>s.kill());const port=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);s.stdout.on('data',b=>{out+=b;const m=out.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});});base=`http://127.0.0.1:${port}/units/4/parts/4.3/`;}
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce',...options}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
 await page.clock.install();await page.goto(base);await page.waitForFunction(()=>['oblique','exit'].every(p=>document.querySelector(`#${p}-lab`)?.dataset.state==='idle'));await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+100));
 const select=async(prefix,key)=>{await page.locator(`#${prefix}-medium-toggle [data-lab-medium=${key}]`).click();await page.waitForFunction(([p,k])=>document.querySelector(`#${p}-lab`).dataset.medium===k&&['idle','preview'].includes(document.querySelector(`#${p}-lab`).dataset.state),[prefix,key]);};
 return{page,browser,base,errors,select};
};
