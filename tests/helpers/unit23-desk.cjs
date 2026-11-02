const required=['marble','acid','flask','jar','tank','water','funnel','rig','plate','forceps'];
exports.desk=page=>{
 const f=page.locator('#gas-report-form'),scene=f.locator('.task-scene');
 const run=ms=>page.clock.runFor(ms);
 const assist=async()=>{await f.locator('.desk-assistance').evaluate(n=>n.open=true);};
 const click=async(a,v)=>{await assist();return f.locator(`[data-desk-action="${a}"]${v?`[data-value="${v}"]`:''}`).click();};
 async function select(){for(const id of required)await f.locator(`[data-desk-material=${id}]`).click();await click('begin');}
 async function use(tool,target,ms){await assist();await f.locator(`[data-desk-tool=${tool}]`).click();await f.locator(`[data-desk-object=${target==='funnel'?'flask':target}]`).click();if(ms)await run(ms);}
 async function focus(id){await assist();const tool=f.locator('[data-desk-tool][aria-pressed=true]');if(await tool.count())await tool.click();const obj=f.locator(`[data-desk-object=${id}]`);if(await obj.getAttribute('aria-pressed')!=='true')await obj.click();}
 async function action(a,v,ms=0){await focus(['rotate','relocate','uncover'].includes(a)?'jar':a==='outlet'?'outlet':'flask');await click(a,v);if(ms)await run(ms);}
 async function prepare(){await use('water','tank',1700);await use('water','jar',1700);await use('plate','jar',900);await action('rotate',null,1200);await action('relocate',null,1300);await action('uncover',null,750);}
 async function charge(){await use('forceps','marble',750);await use('forceps','flask',1450);await use('rig','flask',1550);await use('funnel','flask',1450);await use('acid','flask',1850);}
 async function collect(){await run(2800);await action('outlet','tank',950);await action('outlet','jar',1550);await run(7000);}
 async function seal(){await action('outlet','tank',1550);await use('plate','jar',900);await action('relocate',null,1300);await action('rotate',null,1200);await click('inspect');}
 return{f,scene,run,click,select,use,focus,action,prepare,charge,collect,seal};
};
