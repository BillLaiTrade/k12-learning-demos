const required=['marble','acid','flask','jar','tank','water','funnel','rig','plate','forceps'];
exports.direct=async(page,{touch=false}={})=>{
 const f=page.locator('#gas-report-form'),scene=f.locator('.task-scene'),scroll=f.locator('.desk-scroll'),cdp=touch?await page.context().newCDPSession(page):null;
 const run=ms=>page.clock.runFor(ms),tool=async id=>{const b=f.locator(`[data-desk-tool=${id}]`);if(await b.getAttribute('data-present')!=='true')await b.click();};
 async function select(){for(const id of ['flask','jar','tank','marble']){const b=f.locator(`[data-desk-material=${id}]`);if(await b.getAttribute('data-present')!=='true')await b[touch?'tap':'click']();}}
 const world=async p=>scene.evaluate((el,p)=>{const q=new DOMPoint(p.x,p.y).matrixTransform(el.getScreenCTM());return{x:q.x,y:q.y};},p);
 const send=async(kind,p)=>{if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:kind==='down'?'touchStart':kind==='up'?'touchEnd':kind==='cancel'?'touchCancel':'touchMove',touchPoints:['up','cancel'].includes(kind)?[]:[{x:p.x,y:p.y,radiusX:3,radiusY:3,force:1}]});else if(kind==='down'){await page.mouse.move(p.x,p.y);await page.mouse.down();}else if(kind==='move')await page.mouse.move(p.x,p.y);else if(kind==='up')await page.mouse.up();else await scene.dispatchEvent('pointercancel',{pointerId:1});};
 async function start(id){await scroll.scrollIntoViewIfNeeded();const el=scene.locator(`[data-desk-drag=${id}]`);if(touch){const r=await el.locator(`[data-desk-grip=${id}]`).boundingBox();if(r.width<44||r.height<44)throw new Error(id+' touch target is smaller than 44px');}const anchor=await el.evaluate(n=>({x:+n.dataset.anchorX,y:+n.dataset.anchorY}));const grip=await el.locator(`[data-desk-grip=${id}]`).evaluate(n=>{const r=n.getBBox(),p=new DOMPoint(r.x+r.width/2,r.y+r.height/2).matrixTransform(n.getScreenCTM());return{x:p.x,y:p.y};});
  const sr=await scroll.boundingBox(),wr=await world(anchor);await scroll.evaluate((n,dx)=>n.scrollLeft+=dx,grip.x-(sr.x+sr.width/2));const delta=await world(anchor),p={x:grip.x+delta.x-wr.x,y:grip.y+delta.y-wr.y};await send('down',p);return{id,anchor,p,offset:{x:p.x-delta.x,y:p.y-delta.y},last:p};
 }
 async function move(d,target,{dwell=0}={}){
  // Move across the actual scrollable desk using the same edge scrolling as a finger.
  for(let i=0;i<180;i++){
   const a=await world(target),r=await scroll.boundingBox(),want={x:a.x+d.offset.x,y:a.y+d.offset.y},p={x:Math.max(r.x+12,Math.min(r.x+r.width-12,want.x)),y:want.y};
   const near=Math.abs(p.x-want.x)<2;await send('move',p);d.last=p;if(near||await f.locator('[data-desk-hint]').isVisible())break;await run(48);
   if(i===179)throw new Error('edge scroll did not reach '+d.id+' '+JSON.stringify(target));
  }
  if(dwell)await run(dwell);
 }
 async function end(d,cancel=false){await send(cancel?'cancel':'up',d.last);}
 async function drag(id,target,{ms=0,dwell=0,cancel=false}={}){const d=await start(id);await move(d,target,{dwell});await end(d,cancel);if(ms)await run(ms);if(touch&&ms&&['water','acid','forceps','plate'].includes(id)){const r=await scroll.boundingBox(),grip=await scene.locator(`[data-desk-grip=${id}]`).boundingBox();if(!grip||grip.x+grip.width/2<r.x||grip.x+grip.width/2>r.x+r.width)throw new Error(id+' parked outside the visible mobile desk');}}
 async function prepare(){await tool('water');await drag('water',{x:1000,y:355},{ms:1700});await drag('water',{x:870,y:68},{ms:1700});await tool('plate');await drag('plate',{x:870,y:68},{ms:900});await drag('jar',{x:870,y:350},{ms:1900});await drag('plate',{x:1015,y:355},{ms:750});}
 async function charge(){await tool('forceps');await drag('forceps',{x:520,y:555},{ms:750});await drag('forceps',{x:300,y:220},{ms:1450});await tool('rig');await drag('rig',{x:300,y:205},{ms:1550});await tool('funnel');await drag('funnel',{x:300,y:100},{ms:1450});await tool('acid');await drag('acid',{x:274,y:65},{ms:1850});}
 async function collect(){await drag('outlet',{x:690,y:415},{ms:950});await run(2800);await drag('outlet',{x:870,y:465},{ms:1550});await run(7000);}
 async function seal(){await drag('outlet',{x:690,y:465},{ms:1550});await drag('plate',{x:870,y:432},{ms:900});await drag('jar',{x:870,y:210},{ms:1900});await f.locator('[data-desk-action=inspect]').click();}
 return{f,scene,scroll,run,tool,select,world,start,move,end,drag,prepare,charge,collect,seal};
};
