// 共用回歸流程改用真實器材拖曳；不依賴已移除的輔助選單。
const {direct}=require('./unit23-direct.cjs');
exports.desk=page=>{
 const f=page.locator('#gas-report-form'),scene=f.locator('.task-scene');
 const get=()=>direct(page),run=ms=>page.clock.runFor(ms);
 const click=(a,v)=>f.locator(`[data-desk-action="${a}"]${v?`[data-value="${v}"]`:''}`).click();
 async function use(tool,target,ms=0){const d=await get();await d.tool(tool);const p=tool==='forceps'?target==='marble'?{x:520,y:555}:{x:300,y:195}:tool==='rig'?{x:300,y:140}:tool==='funnel'?{x:274,y:190}:tool==='acid'?{x:274,y:65}:target==='tank'?{x:1000,y:355}:tool==='plate'&&+(await scene.getAttribute('data-angle'))>90?{x:870,y:432}:{x:870,y:68};await d.drag(tool,p,{ms});}
 async function action(a,v,ms=0){if(a!=='outlet')throw Error('已移除輔助操作，請使用真實器材拖曳：'+a);await(await get()).drag('outlet',v==='jar'?{x:870,y:465}:v==='tank'?{x:690,y:415}:{x:690,y:300},{ms});}
 const delegate=name=>async(...args)=>(await get())[name](...args);
 return{f,scene,run,click,use,action,clear:delegate('clear'),select:delegate('select'),prepare:delegate('prepare'),charge:delegate('charge'),collect:delegate('collect'),seal:delegate('seal')};
};
