// A plan is checked by physical prerequisites, not by one memorised ordering.
export const TASK_STEPS=Object.freeze([
 {id:'prepare',label:'裝滿水，倒置於水槽中',duration:3000},
 {id:'react',label:'加入反應物，接好裝置',duration:3600},
 {id:'purge',label:'先在瓶外排出原有空氣',duration:2400},
 {id:'collect',label:'移入瓶口，排水收集',duration:6500},
 {id:'withdraw',label:'先移開導管出口',duration:1800},
 {id:'cover',label:'在水下蓋片，再取出',duration:3000}
]);
export const INITIAL_ORDER=Object.freeze(['collect','react','prepare','cover','purge','withdraw']);
const valid={fill:['full','half','empty'],position:['submerged','upright','above'],outlet:['jar','tank','air']};
const requires={prepare:[],react:[],purge:['react'],collect:['prepare','purge'],withdraw:['collect'],cover:['withdraw']};
export function evaluateCollectionPlan(plan={}){
 const materials=Array.isArray(plan.materials)?plan.materials:[],order=Array.isArray(plan.order)?plan.order:[];
 const missing=[],issues=[];
 const issue=(field,message,target,step)=>issues.push({field,message,target,step});
 if(!materials.length)missing.push({field:'materials',message:'先選擇製備二氧化碳的材料。',target:'s4'});
 else if(materials.length!==2||!materials.includes('marble')||!materials.includes('acid'))issue('materials',materials.length===2&&materials.includes('peroxide')&&materials.includes('catalyst')?'雙氧水與二氧化錳是前面製備氧氣的組合；這次要製備二氧化碳。':'請回看第四區，找出製備二氧化碳的兩種反應物。','s4','react');
 for(const key of Object.keys(valid))if(!valid[key].includes(plan[key]))missing.push({field:key,message:{fill:'還沒安排瓶內的水量。',position:'還沒安排集氣瓶的位置。',outlet:'還沒安排正式收集時的導管出口。'}[key],target:'s3'});
 if(valid.fill.includes(plan.fill)&&plan.fill!=='full')issue('fill','集氣瓶先裝滿水，才能減少瓶內原有空氣。','s3','prepare');
 if(valid.position.includes(plan.position)&&plan.position!=='submerged')issue('position','排水集氣時，集氣瓶要倒置，瓶口保持在水面下。','s3','prepare');
 if(valid.outlet.includes(plan.outlet)&&plan.outlet!=='jar')issue('outlet','正式收集時，出口須移入倒置集氣瓶的瓶口內；留在瓶外無法把氣體送進瓶中。','s3','collect');
 const orderValid=order.length===TASK_STEPS.length&&new Set(order).size===TASK_STEPS.length&&order.every(id=>TASK_STEPS.some(s=>s.id===id));
 if(!orderValid)missing.push({field:'order',message:'需要安排六個不同的操作步驟。',target:'s3'});
 else {const seen=new Set();for(const id of order){for(const dep of requires[id])if(!seen.has(dep))issue('order',{react:'先加入反應物產氣，才有氣體可排出。',prepare:'先準備裝滿水、倒置在水下的集氣瓶，再收集。',purge:'先在瓶外排除裝置原有空氣，再開始收集。',collect:'先完成收集，再移開導管。',withdraw:'先移開導管出口，再在水下蓋片，避免堵住仍在產氣的出口。'}[dep],'s3',id);seen.add(id);}}
 return {complete:missing.length===0,correct:missing.length===0&&issues.length===0,missing,issues};
}
const unit=x=>Math.max(0,Math.min(1,x)),ease=x=>{const t=unit(x);return t*t*(3-2*t);};
export function collectionFrame(plan={},index=-1,elapsed=0){
 const ids=plan.order||[],step=TASK_STEPS.find(s=>s.id===ids[index]),p=step?unit(elapsed/step.duration):0,done=new Set(ids.slice(0,Math.max(0,index)));
 const progress=id=>done.has(id)?1:step?.id===id?ease(p):0;
 const idle=index<0,prepared=progress('prepare'),reaction=progress('react'),collected=done.has('collect')?1:step?.id==='collect'?ease((p-.55)/.45):0,withdraw=progress('withdraw'),cover=progress('cover');
 const selection=plan.position==='submerged'?180:plan.position==='above'?180:0;
 const angle=idle?selection:selection*ease((prepared-.25)/.5),immersion=idle?(plan.position==='submerged'?1:0):ease((prepared-.65)/.23)*(plan.position==='submerged'?1:0);
 const chosenFill={full:1,half:.5,empty:0}[plan.fill]??0;
 const water=chosenFill*(idle?1:ease(prepared/.25))*(1-collected);
 // The collecting glass is one rigid U-shaped piece. Only its pose changes.
 const collectX={jar:610,tank:430,air:430}[plan.outlet]??430,collectY=plan.outlet==='air'?260:405;
 let tubeX=idle?collectX:430,tubeY=idle?collectY:405;
 if(!idle){
  if(done.has('collect')){tubeX=collectX;tubeY=collectY;}
  if(step?.id==='collect'){tubeY=405+50*ease(p/.15)-50*ease((p-.4)/.15);tubeX=430+(collectX-430)*ease((p-.15)/.25);if(plan.outlet==='air')tubeY=260;}
  if(step?.id==='withdraw'){tubeY=collectY+50*ease(p/.25);tubeX=collectX+(430-collectX)*ease((p-.25)/.35);tubeY+=(260-tubeY)*ease((p-.6)/.4);}
  if(done.has('withdraw')){tubeX=430;tubeY=260;}
 }
 return {step:step?.id||'plan',progress:p,prepared,reaction,purging:step?.id==='purge',collecting:step?.id==='collect',collected,withdraw,cover,
  angle,immersion,preparationCover:idle?0:step?.id==='prepare'?ease((prepared-.17)/.08):0,uncover:idle?0:step?.id==='prepare'?ease((prepared-.9)/.1):1,water,tubeX,tubeY,lift:ease((cover-.55)/.45),sealed:ease(cover/.5),idle};
}
export function firstPlanIssue(plan){const r=evaluateCollectionPlan(plan);if(!r.complete)return null;for(const id of plan.order){const issue=r.issues.find(v=>v.step===id);if(issue)return issue;}return null;}
// A rounded slack loop prevents a long flexible hose folding into a sharp
// hairpin when its two rigid connectors are close together. Arc length stays fixed.
export function taskHosePoints(a,b,length=420){
 const cubic=(a,c,d,b,t)=>{const u=1-t;return{x:u*u*u*a.x+3*u*u*t*c.x+3*u*t*t*d.x+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*c.y+3*u*t*t*d.y+t*t*t*b.y};};
 const points=r=>{const m={x:(a.x+b.x)/2+r,y:(a.y+b.y)/2+r};return Array.from({length:65},(_,i)=>{const t=i/64;return t<=.5?cubic(a,{x:a.x+r,y:a.y},{x:m.x+r/2,y:m.y-r},m,t*2):cubic(m,{x:m.x-r/2,y:m.y+r},{x:b.x,y:b.y+r},b,(t-.5)*2);});};
 const measure=ps=>ps.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-ps[i].x,p.y-ps[i].y),0);
 let lo=0,hi=length;for(let i=0;i<25;i++){const r=(lo+hi)/2;if(measure(points(r))<length)lo=r;else hi=r;}return points((lo+hi)/2);
}
