import {tankWaterRegion,inTankWater} from './collection-task-water.mjs';
import {VESSEL_CAPACITY,enterGas,exchangeWithAir,addLiquid,drainJar,liquidClean} from './collection-task-contents.mjs?v=b-decisions-20261104';
import {bodyOffset,bodyPoint} from './collection-task-layout.mjs?v=b-decisions-20261104';
// 操作與動畫共用同一份狀態；氣體只會由當下的導管出口進入瓶中。
export const DESK_MATERIALS=[
 ['marble','大理石','反應材料'],['acid','稀鹽酸','反應材料'],['flask','錐形瓶','容器'],['jar','集氣瓶','容器'],['tank','水槽','容器'],['water','清水','液體'],
 ['funnel','薊頭漏斗','加液工具'],['rig','雙孔塞與導管','連接工具'],['plate','薄玻璃片','封口工具'],['forceps','鑷子','取物工具'],['peroxide','雙氧水','反應材料'],['catalyst','二氧化錳','反應材料']
].map(([id,name,kind])=>({id,name,kind,required:!['peroxide','catalyst'].includes(id)}));
export const REQUIRED_MATERIALS=DESK_MATERIALS.filter(m=>m.required).map(m=>m.id);
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const ease=v=>{const t=clamp(v);return t*t*(3-2*t);};
export const mix=(a,b,p)=>a+(b-a)*p;
export function createDesk(){return{positions:{},autoParked:{},outletPosition:null,marbleRemaining:[1,1,1,1,1],flaskMarbleUsed:0,sampleExposure:'',dragging:null,phase:'operate',selected:[],tool:null,focus:null,tankWater:0,jarWater:0,jarAngle:0,jarPlace:0,jarCovered:false,sealedUnderwater:false,flaskMarbles:0,flaskStoneIds:[],heldStoneId:null,heldMarble:false,heldSolid:null,contents:{flask:{peroxide:0,peroxideUsed:0,catalyst:0},jar:{acid:0,acidUsed:0,peroxide:0,peroxideUsed:0,catalyst:0,stones:[],stonePositions:[],catalystPositions:[],contaminants:[]},tank:{acid:0,acidUsed:0,peroxide:0,peroxideUsed:0,catalyst:0,stones:[],stonePositions:[],catalystPositions:[],contaminants:[]}},otherVolume:0,acid:0,reactionUsed:0,escapedUnstoppered:0,uncoveredExtraction:false,unpurgedCollection:false,flaskWater:0,rig:false,funnel:false,outlet:'air',airRemaining:1,co2Volume:0,airVolume:0,sampleStarted:false,reactionAge:0,time:0,motion:null,feedback:'',feedbackKind:'hint',result:null,spilling:false};}
export const confirmedState=s=>s.dragging?{...s,dragging:null}:s;
export const heldMaterial=s=>s.heldSolid||(s.heldMarble?'marble':null);
export const usedMarbleIds=s=>[...s.marbleRemaining.flatMap((amount,i)=>amount<=.00001?[i]:[]),...(s.flaskStoneIds.length?s.flaskStoneIds:Array.from({length:s.flaskMarbles},(_,i)=>i)),...s.contents.jar.stones,...s.contents.tank.stones];
// 每塊石頭有有限的反應量；等比例縮小，並保留已消耗的身分，避免回到材料碟。
export const marbleFraction=(s,id)=>s.marbleRemaining[id]??1;
const settledStoneIds=(s,target)=>target==='flask'?(s.flaskStoneIds.length?s.flaskStoneIds:Array.from({length:s.flaskMarbles},(_,i)=>i)):s.contents[target].stones;
const stoneIds=(s,target)=>{const ids=settledStoneIds(s,target),m=s.motion;return target==='flask'&&m?.kind==='place-stone'&&m.elapsed/m.duration>=.6?[...new Set([...ids,m.index])]:ids;};
const marbleCapacity=(s,target)=>stoneIds(s,target).reduce((sum,id)=>sum+marbleFraction(s,id)*.4,0);
function consumeMarble(s,target,amount){
 const ids=stoneIds(s,target),capacity=marbleCapacity(s,target);if(!capacity)return;
 const ratio=Math.max(0,1-amount/capacity);for(const id of ids)s.marbleRemaining[id]=marbleFraction(s,id)*ratio;
 const remaining=settledStoneIds(s,target).filter(id=>marbleFraction(s,id)>.00001);
 if(target==='flask'){s.flaskMarbleUsed+=amount;s.flaskStoneIds=remaining;s.flaskMarbles=remaining.length;}
 else {const c=s.contents[target];c.stonePositions=c.stonePositions.filter((_,i)=>remaining.includes(ids[i]));c.stones=remaining;}
}
export const pureSample=s=>s.co2Volume>=.98&&s.airVolume<.01&&s.otherVolume<.01;
const jarClean=s=>{const c=s.contents.jar;return liquidClean(s,'jar');};
export const preservedSample=s=>pureSample(s)&&jarClean(s)&&s.jarCovered&&s.sealedUnderwater&&s.jarPlace<=.01&&s.jarAngle<=.01;
function refreshCompletion(s){if(s.phase==='complete'&&!preservedSample(s)){s.phase='operate';s.result=null;}}
export const liquidAmount=(s,target)=>target==='flask'?s.acid+s.flaskWater+s.contents.flask.peroxide:target==='jar'?s.jarWater:s.tankWater;
export function oxygenReacting(s,target='flask'){const c=s.contents[target];return c.catalyst>0&&c.peroxide-c.peroxideUsed>.00001&&liquidAmount(s,target)>.01;}
export function vesselReaction(s,target){if(target==='flask')return reacting(s)||oxygenReacting(s);const c=s.contents[target];return liquidAmount(s,target)>.01&&(c.stones.length>0&&c.acid-c.acidUsed>.00001||oxygenReacting(s,target));}
export function rigPosition(s){return s.dragging?.id==='rig'?s.dragging.position:s.rigLift|| (s.rig?bodyPoint(s,'flask',300,205):s.positions.rig||{x:500,y:50});}
export const flaskSurface=s=>580-80*Math.min(VESSEL_CAPACITY.flask,liquidAmount(s,'flask'));
export const waterSurface=s=>524-119*s.tankWater+bodyOffset(s,'tank').y;
export function jarPose(s){
 const m=s.motion;
 if(s.dragging?.id==='jar')return{x:s.dragging.position.x-870,y:s.dragging.position.y-330};
 if(['immerse','extract'].includes(m?.kind)){
  const p=clamp(m.elapsed/m.duration),start=m.startPose,tank=bodyOffset(s,'tank'),finish={x:tank.x,y:tank.y+(m.kind==='immerse'?0:-160)};
  if(p<.25)return{x:start.x,y:mix(start.y,-225,ease(p/.25))};
  if(p<.68)return{x:mix(start.x,finish.x,ease((p-.25)/.43)),y:-225};
  return{x:finish.x,y:mix(-225,finish.y,ease((p-.68)/.32))};
 }
 if(m?.kind==='relocate'){
  const p=m.elapsed/m.duration,a=m.startPose||{x:0,y:-160*(1-m.from)},b={x:0,y:-160*(1-m.to)};
  if(p<.3)return{x:a.x,y:mix(a.y,-260,ease(p/.3))};
  if(p<.7)return{x:mix(a.x,b.x,ease((p-.3)/.4)),y:-260};
  return{x:b.x,y:mix(-260,b.y,ease((p-.7)/.3))};
 }
 if(s.jarPlace>.99)return bodyOffset(s,'tank');
 const parked=s.positions.jar;return parked?{x:parked.x-870,y:parked.y-330}:{x:0,y:-160*(1-s.jarPlace)};
}
export function jarMouth(s){const a=s.jarAngle*Math.PI/180,p=jarPose(s);return{x:870+p.x+102*Math.sin(a),y:330+p.y-102*Math.cos(a)};}
export function mouthUnderwater(state){const s=confirmedState(state);return inTankWater(tankWaterRegion(s),jarMouth(s));}
export function reacting(s){
 const surface=flaskSurface(s);if(s.acid-(s.reactionUsed||0)<=.00001)return false;
 if(s.flaskMarbles>0&&surface<575)return true;
 if(s.motion?.kind!=='place-stone')return false;
 const p=s.motion.elapsed/s.motion.duration;if(p<.6)return false;
 const heights=[238,300,350,430,500,[555,555,548,525,520][s.flaskMarbles]],k=clamp((p-.6)/.23)*5,i=Math.min(4,Math.floor(k)),y=mix(heights[i],heights[i+1],ease(k-i));
 return y+18>surface;
}
export function liquidSeal(state){const s=confirmedState(state);return s.rig&&s.funnel&&!s.rigLift&&s.motion?.kind!=='remove-rig'&&flaskSurface(s)<555&&flaskSurface(s)>391;}
const airPose=s=>{const d=bodyOffset(s,'flask');return{x:430+d.x,y:260+d.y};};
const poses={air:{x:430,y:260},tank:{x:430,y:405},jar:{x:610,y:405}};
function tubePose(m,p){
 const from=m.startOutlet||poses[m.from],to=m.endOutlet||poses[m.to],safeY=Math.max(from.y,to.y)+45;
 if(m.from==='jar'||m.to==='jar'||from.x>535||to.x>535){
  // 先降到瓶口下方，再橫移，最後升入；玻璃不得穿過瓶壁。
  if(p<.3)return{x:from.x,y:mix(from.y,safeY,ease(p/.3))};
  if(p<.7)return{x:mix(from.x,to.x,ease((p-.3)/.4)),y:safeY};
  return{x:to.x,y:mix(safeY,to.y,ease((p-.7)/.3))};
 }
 return{x:mix(from.x,to.x,ease(p)),y:mix(from.y,to.y,ease(p))};
}
export function outletPose(s){if(s.dragging?.id==='outlet')return{x:s.dragging.position.x-260,y:s.dragging.position.y-10};if(s.motion?.kind==='outlet')return tubePose(s.motion,s.motion.elapsed/s.motion.duration);if(s.outlet==='jar'){const p=jarMouth(s);return{x:p.x-260,y:p.y-27};}return s.outletPosition||{...poses[s.outlet]};}
export function gasEntersJar(state){const s=confirmedState(state),o=outletPose(s),mouth=jarMouth(s);return !s.jarCovered&&s.jarAngle>179&&mouthUnderwater(s)&&o.x+260>mouth.x-55&&o.x+260<mouth.x+55&&o.y+10<mouth.y-4&&o.y+10>mouth.y-65;}
export function outletLocation(state){const s=confirmedState(state);if(gasEntersJar(s))return 'jar';const o=outletPose(s);return s.selected.includes('tank')&&inTankWater(tankWaterRegion(s),{x:o.x+260,y:o.y+10})?'water':'air';}
export function overflowPoint(s,target,{viaFunnel=false}={}){if(target==='jar')return jarMouth(s);if(target==='tank')return bodyPoint(s,'tank',1010,397);if(viaFunnel){const p=rigPosition(s);return{x:p.x-26,y:p.y-140};}return bodyPoint(s,'flask',340,212);}
export function liquidReceiver(s,from,point){const slots=[];if(from==='jar'&&s.jarPlace>.99&&s.selected.includes('tank'))return 'tank';if(from!=='jar'&&s.selected.includes('jar')&&!s.jarCovered&&s.jarAngle<1&&s.jarPlace<.01){const p=jarMouth(s);if(Math.abs(point.x-p.x)<65&&point.y<p.y)slots.push({id:'jar',y:p.y});}if(from!=='flask'&&s.selected.includes('flask')&&!s.rig){const p=bodyPoint(s,'flask',300,205);if(Math.abs(point.x-p.x)<43&&point.y<p.y)slots.push({id:'flask',y:p.y});}if(from!=='tank'&&s.selected.includes('tank')){const d=bodyOffset(s,'tank');if(point.x>597+d.x&&point.x<1050+d.x&&point.y<548+d.y)slots.push({id:'tank',y:377+d.y});}return slots.sort((a,b)=>a.y-b.y)[0]?.id||null;}

function tell(s,text,kind='hint'){s.feedback=text;s.feedbackKind=kind==='revise'?'error':kind;s.result=null;}
function move(s,kind,duration,extra={}){if(['pick-stone','place-stone','return-stone'].includes(kind))duration/=2;s.motion={kind,duration,elapsed:0,tool:s.tool,toolStart:s.tool&&s.positions[s.tool]?{...s.positions[s.tool]}:null,...extra};s.tool=null;s.focus=null;}
function exhausted(s){return s.acid>0&&(s.reactionUsed>=s.acid-.00001||s.flaskMarbles===0&&s.flaskMarbleUsed>.00001&&s.motion?.kind!=='place-stone');}
function remakeGas(s){
 const reuse=s.tankWater>.01&&liquidClean(s,'tank')?(s.tankWater<.8?'水槽中的清水可沿用，水位不足時補足即可。':'可沿用水槽中原有的清水。'):'';
 const assembly=!s.rig||!s.funnel?'請先裝好雙孔塞、薊頭漏斗與導管，再由漏斗補加稀鹽酸，重新產氣。':'可經漏斗補加稀鹽酸，重新產氣。';
 if(s.flaskMarbles===0&&s.flaskMarbleUsed>.00001){const newPortion=s.marbleRemaining.every(v=>v<=.00001);return '錐形瓶中的大理石已耗盡；只補稀鹽酸不會再產氣。'+(newPortion?'請收回空的大理石盤，再取用新的一份；':'請取用盤中剩餘的大理石；')+'移開塞子後加入，裝好器材再收集。'+(s.acid-s.reactionUsed>.00001?'瓶內仍有酸，加入石塊會立即反應，未塞緊前氣體會逸散。':'稀鹽酸也已耗盡，需再經漏斗補加。')+reuse;}
 if(s.flaskMarbles>0)return '稀鹽酸已耗盡，大理石仍有剩餘。'+assembly+reuse;
 return '請重新準備大理石與稀鹽酸，裝好器材後重新製氣。'+reuse;
}
function recoveryStep(s){
 if(exhausted(s))return remakeGas(s);
 if(!s.rig||!s.funnel)return '先裝好雙孔塞、薊頭漏斗與導管，再確認液封與產氣狀態。';
 if(!reacting(s))return s.flaskMarbles===0?'錐形瓶內缺少大理石，先移開塞子加入，再裝好器材。':'目前沒有新的二氧化碳，先由漏斗補加稀鹽酸恢復產氣。';
 if(!liquidSeal(s))return '先確認漏斗下端已浸入液面形成液封，導氣管入口留在液面上方。';
 if(s.jarPlace<.99)return s.jarCovered?'保持蓋片，把集氣瓶倒置移入水槽；瓶口在水下後，再移開玻璃片。':'先蓋好薄玻璃片，再把集氣瓶倒置移入水槽。';
 if(!mouthUnderwater(s))return '水位尚未淹過集氣瓶口；先向水槽補入清水。';
 if(s.jarCovered)return '瓶口已在水下，先移開薄玻璃片，才能重新通入氣體。';
 if(s.airRemaining>0)return s.outlet==='jar'?'先撤出導管，在集氣瓶外排除裝置內原有空氣。':'先等待瓶外排氣完成，再移入瓶口收集。';
 return s.outlet==='jar'?'繼續通入二氧化碳，置換混入的空氣；達到收集條件後會提示封存。':'從集氣瓶口下方移入導管，再通入二氧化碳置換混入的空氣。';
}
function sampleProblem(s){
 const recovered=pureSample(s)&&jarClean(s)&&(s.jarCovered&&s.sealedUnderwater||mouthUnderwater(s)&&s.motion?.kind!=='extract');
 if(recovered)return '';
 if(s.uncoveredExtraction&&(s.airVolume>=.01||!s.jarCovered||s.motion?.kind==='extract'))return (s.sampleExposure==='uncover'?'已移開封存氣體的玻璃片，氣體會與外界空氣混合。':'未在水下蓋好薄玻璃片就取出集氣瓶，氣體會逸散並混入空氣。')+'這瓶尚未達成本次二氧化碳集氣目標，請重新製作。'+recoveryStep(s);
 if(s.unpurgedCollection&&s.airVolume>.01)return '未先在集氣瓶外排除裝置內原有空氣，收集的氣體已混有空氣，尚未達成本次二氧化碳集氣目標。'+recoveryStep(s);
 return '';
}
function wrongMaterials(s){
 for(const target of ['flask','jar','tank']){
  const c=s.contents[target],name=target==='flask'?'錐形瓶':target==='jar'?'集氣瓶':'水槽';
  if(c.peroxide>0||c.catalyst>0||c.contaminants?.includes('peroxide')){const oxygen=oxygenReacting(s,target),ended=c.peroxide>0&&c.peroxideUsed>=c.peroxide-.00001;return name+'內使用了製氧材料，不能當作本次製備二氧化碳的藥品。'+(oxygen?'目前正在產生氧氣或混合氣體。':ended?'這份雙氧水已反應完，氣泡已停止。':'')+'請收回這個容器清空後重新配製，不要直接追加其他藥品。';}
  if(target!=='flask'&&(c.acid>0||c.stones.length||c.contaminants?.length))return (c.acid>0||c.contaminants?.includes('acid')?'稀鹽酸倒錯容器：'+name+'應裝清水，不應加入稀鹽酸。':name+'內放入了大理石；這不是由錐形瓶經導管集氣的做法。')+'請只收回受影響的容器清空，再重新準備。';
 }
 return '';
}
export function setupGuidance(state,{includeWater=true}={}){
 const s=confirmedState(state);
 const sample=sampleProblem(s);if(sample)return sample;
 // 已封存的合格樣本不因別處尚有多餘材料而失效。
 if(preservedSample(s))return '';
 const wrong=wrongMaterials(s);if(wrong)return wrong;
 if(exhausted(s))return (s.escapedUnstoppered>0?'反應開始時未裝好雙孔塞，二氧化碳已從瓶口逸散；':'')+'這份反應物已反應完，已沒有新的氣體可排出或收集。'+remakeGas(s);
 if(reacting(s)&&!s.rig)return '錐形瓶尚未裝上雙孔塞，二氧化碳正從瓶口逸散，無法由導管收集。請盡快裝好雙孔塞與漏斗。';
 if(s.selected.includes('flask')&&s.flaskMarbles===0&&(s.rig||s.acid>0)&&!s.motion)return '錐形瓶內還沒有大理石，無法產生二氧化碳。請先移開雙孔塞（若已裝上），用鑷子加入大理石，再裝好器材並加入稀鹽酸。';
 if(includeWater&&s.flaskWater>0&&!reacting(s))return '錐形瓶內已有清水；單加清水不會產生二氧化碳。清水不能代替稀鹽酸，也會稀釋後加入的酸。若已有大理石，可裝好器材後加入稀鹽酸，不必只因加水就清空。';
 return '';
}
export function currentGuidance(state){
 const s=confirmedState(state);
 if(s.rig&&s.funnel&&flaskSurface(s)<=391)return{text:'錐形瓶液位過高，已淹沒導氣管內端，無法正常導出氣體。請停止加液，收回錐形瓶清空後重新配製；水槽與已封存的樣本可保留。',kind:'error',source:'capacity'};
 if(s.overflow&&s.time-s.overflow.time<2500)return{text:(s.overflow.target==='flask'?'錐形瓶':s.overflow.target==='jar'?'集氣瓶':'水槽')+'已滿，液體正在溢出；請停止加液。已留在容器內的液體會保留。',kind:'error',source:'capacity'};
 const dirty=!(pureSample(s)&&jarClean(s))&&wrongMaterials(s);if(dirty)return{text:dirty,kind:'error'};
 const problem=sampleProblem(s);if(problem)return{text:problem,kind:'error'};
 if(pureSample(s)&&jarClean(s)){
  if(preservedSample(s))return{text:s.phase==='complete'?'本次檢查通過，二氧化碳已封存。仍可繼續操作；若移開玻璃片，將重新判斷保存狀態。':'氣體已封存並放回桌上，可以檢查成果。',kind:s.phase==='complete'?'correct':'hint'};
  if(s.outlet==='jar')return{text:'氣體已收集完成，請先撤出導管，再在水下蓋好薄玻璃片。',kind:'hint'};
  if(!s.jarCovered)return{text:'氣體已收集完成，請在水下蓋好薄玻璃片，再取出扶正。',kind:'hint'};
  if(!s.sealedUnderwater)return{text:'這瓶未在水下封口，請確認樣本是否已混入空氣，重新收集並在水下蓋片。',kind:'error'};
  return{text:'氣體已在水下蓋片封住，請保持蓋片、取出並扶正集氣瓶。',kind:'hint'};
 }
 const wrong=wrongMaterials(s);if(wrong)return{text:wrong,kind:'error'};
 if(s.outlet==='jar'&&s.jarWater<=.015&&s.co2Volume+s.otherVolume<=.01)return{text:'集氣瓶未先裝滿清水，瓶內仍有原本的空氣，目前尚未收集到二氧化碳。請先撤出導管，重新準備裝滿清水的集氣瓶，再收集氣體。'+(exhausted(s)?remakeGas(s):''),kind:'error'};
 if(exhausted(s))return{text:setupGuidance(s),kind:s.escapedUnstoppered>0?'error':'hint'};
 const setup=setupGuidance(s);if(setup)return{text:setup,kind:reacting(s)&&!s.rig?'error':'hint'};
 if(!s.rig)return null;
 if(!reacting(s))return{text:'目前沒有產生新的二氧化碳，移動導管不會開始集氣。請確認錐形瓶內有大理石與稀鹽酸。',kind:'hint'};
 if(!liquidSeal(s))return{text:'目前雖有反應，但裝置未形成液封，氣體正逸散；請確認雙孔塞、漏斗及液面位置。',kind:'error'};
 const dilution=s.flaskWater>0?'錐形瓶內另有清水，會稀釋酸，但不必因此清空；仍依實際收集成果判定。':'';
 if(s.outlet==='jar')return{text:(s.airVolume>.01?'集氣瓶內仍混有原本的空氣，尚未達成本次二氧化碳集氣目標。'+recoveryStep(s):s.otherVolume>.01?'瓶內混入其他氣體，請重新準備集氣瓶後再收集。':'正在收集二氧化碳，集氣瓶內水位下降。收集完成後，先撤管、在水下蓋片，再取出。')+dilution,kind:s.airVolume>.01||s.otherVolume>.01?'error':'hint'};
 if(s.airRemaining<=0)return{text:'裝置內原有的空氣已排出，現在排出的是二氧化碳。可將導管移入倒置集氣瓶的瓶口收集。'+dilution,kind:'hint'};
 return{text:'正在集氣瓶外排出裝置內原有的空氣；先等待排氣完成，再將導管移入瓶口。'+dilution,kind:'hint'};
}
export function deskObservation(state){
 const s=confirmedState(state);
 const f=deskFrame(s),ended=exhausted(s),oxygenEnded=s.contents.flask.peroxide>0&&s.contents.flask.peroxideUsed>=s.contents.flask.peroxide-.00001;
 if(f.oxygen)return '錐形瓶正在冒泡，產生的是氧氣或混合氣體。';
 if(vesselReaction(s,'jar')||vesselReaction(s,'tank'))return '集氣瓶或水槽內的材料正在反應冒泡。';
 if(f.reaction){if(s.rig&&s.funnel&&flaskSurface(s)<=391)return '錐形瓶有反應氣泡，但導氣管內端已浸在液體中，無法正常導出氣體。';if(!liquidSeal(s))return '錐形瓶有氣泡，氣體正從未密合的瓶口或漏斗逸出。';if(f.collecting)return s.jarWater>.015?'錐形瓶持續冒泡，集氣瓶內的水位正在下降。':'導管持續排氣，滿瓶後仍在置換瓶內氣體，成分會繼續改變。';return f.location==='water'?'導管出口在瓶外水中冒泡，集氣瓶水位不變。':'氣體正由導管出口排入空氣中。';}
 if(ended||oxygenEnded)return '這份反應物已耗盡，氣泡已停止。';
 if(preservedSample(s))return '集氣瓶已封口，氣體保存在瓶中。';
 return s.flaskWater>0?'錐形瓶內有清水，目前沒有反應氣泡。':'目前沒有反應氣泡。';
}
export function inspectDesk(s){
 if(preservedSample(s))return{correct:true,message:'完成！你利用排水集氣法收集二氧化碳，先撤管、在水下蓋片，再取出扶正。'};
 const live=currentGuidance(s);if(live?.kind==='error')return{correct:false,kind:'error',message:live.text};
 if(s.otherVolume>.01)return{correct:false,kind:'error',message:'瓶中混入了氧氣或其他氣體；請重新準備集氣瓶，再收集二氧化碳。'};
 if(!jarClean(s))return{correct:false,kind:'error',message:'集氣瓶內混入了不適合這次集氣的材料。請只收回集氣瓶清空，再取用重試。'};
 if(s.co2Volume<.98)return{correct:false,kind:s.airVolume>.01?'error':'revise',message:s.airVolume>.01?'瓶中混入了原有空氣。請重新準備集氣瓶，再收集已排除空氣的氣體。':exhausted(s)?currentGuidance(s).text:s.jarWater>.02?'瓶內還有水，尚未收集滿瓶氣體。請確認反應、液封及導管位置，繼續觀察水位。':setupGuidance(s)||'目前還沒有收集到一整瓶二氧化碳。請檢查反應、液封和出口位置。'};
 if(s.airVolume>.01)return{correct:false,kind:'error',message:'瓶中混入了原有空氣。請重新準備集氣瓶，再收集已排除空氣的氣體。'};
 if(!s.sealedUnderwater||!s.jarCovered)return{correct:false,message:'氣體已收集。請先撤出導管，在水下蓋好玻璃片。'};
 return{correct:false,message:'保持蓋片，將集氣瓶取出並扶正放在桌上。'};
}
// 收回容器時清空其內容；安裝在它上面的器材一併回材料區。
function returnMaterial(s,id){
 const removed=new Set([id]),withJar=id==='jar'||id==='tank'&&s.jarPlace>.01;
 if(withJar){removed.add('jar');if(s.jarCovered)removed.add('plate');s.jarWater=0;s.jarAngle=0;s.jarPlace=0;s.jarCovered=false;s.sealedUnderwater=false;s.co2Volume=0;s.airVolume=0;s.sampleStarted=false;s.otherVolume=0;s.uncoveredExtraction=false;s.sampleExposure='';s.unpurgedCollection=false;s.contents.jar={acid:0,acidUsed:0,peroxide:0,peroxideUsed:0,catalyst:0,stones:[],stonePositions:[],catalystPositions:[],contaminants:[]};}
 if(id==='tank'){s.tankWater=0;s.contents.tank={acid:0,acidUsed:0,peroxide:0,peroxideUsed:0,catalyst:0,stones:[],stonePositions:[],catalystPositions:[],contaminants:[]};}
 if(id==='flask'){
  if(s.rig){removed.add('rig');if(s.funnel)removed.add('funnel');}s.acid=0;s.reactionUsed=0;s.escapedUnstoppered=0;s.flaskWater=0;s.flaskMarbles=0;s.flaskStoneIds=[];s.flaskMarbleUsed=0;s.reactionAge=0;s.contents.flask={peroxide:0,peroxideUsed:0,catalyst:0};
 }
 if(removed.has('rig')){if(s.funnel)removed.add('funnel');s.rig=false;s.rigLift=null;s.outlet='air';s.outletPosition=null;s.airRemaining=1;}
 if(removed.has('funnel')){s.funnel=false;s.airRemaining=1;}
 if(removed.has('forceps')){s.heldMarble=false;s.heldSolid=null;s.heldStoneId=null;}
 if(removed.has('plate')){s.jarCovered=false;s.sealedUnderwater=false;}
 s.selected=s.selected.filter(x=>!removed.has(x));for(const x of removed)delete s.positions[x];
 if(removed.has(s.tool))s.tool=null;if(removed.has(s.focus))s.focus=null;s.result=null;
 const names=[...removed].map(x=>DESK_MATERIALS.find(m=>m.id===x).name).join('、');
 tell(s,`已收回${names}。${['jar','flask','tank'].includes(id)?'容器內的物質與收集紀錄已清空。':'已加入容器的液體與材料會保留。'}`);
}
function beginReturn(s,id){
 if((id==='jar'&&s.outlet==='jar')||(['tank','flask','rig'].includes(id)&&s.rig&&s.outlet!=='air')){
  const to=id==='jar'&&s.selected.includes('tank')?'tank':'air';
  move(s,'outlet',1450,{from:s.outlet,to,startOutlet:outletPose(s),returnAfter:id});tell(s,'先將導管從瓶口下方撤出，再收回器材。');return;
 }
 if(id==='plate'&&s.jarCovered){move(s,'uncover',650,{tool:'plate',toolStart:jarMouth(s),returnAfter:id});tell(s,'先移開瓶口的玻璃片，再收回材料區。');return;}
 if(id==='forceps'&&heldMaterial(s)==='catalyst'&&s.selected.includes('catalyst')){move(s,'return-solid',700,{solid:'catalyst',returnAfter:id});tell(s,'先把夾著的二氧化錳放回材料碟，再收回鑷子。');return;}
 if(id==='forceps'&&s.heldMarble&&s.selected.includes('marble')){move(s,'return-stone',700,{tool:'forceps',toolStart:s.positions.forceps&&{...s.positions.forceps},index:s.heldStoneId??s.flaskMarbles,returnAfter:id});tell(s,'先將夾著的大理石放回盤中，再收回鑷子。');return;}
 returnMaterial(s,id);
}
export function actDesk(s,action,value){const next=applyAction(s,action,value);refreshCompletion(next);return next;}
function applyAction(s,action,value){
 if(action==='reset')return createDesk();
 if(action==='inspect'){const r=inspectDesk(s);s.result=r.correct?'correct':'revise';s.feedback=r.message;s.feedbackKind=r.kind||s.result;if(r.correct)s.phase='complete';return s;}
 if(action==='stop'&&['water','acid','peroxide'].includes(s.motion?.kind)){const m=s.motion;move(s,'put-away',450,{pourKind:m.kind,target:m.target,viaFunnel:m.viaFunnel,stopAt:m.elapsed/m.duration});tell(s,'收起倒液工具，已倒入的液體會保留。');return s;}
 if(s.motion){tell(s,'請等手上的動作完成。');return s;}
 if(action==='take'){
  const item=DESK_MATERIALS.find(m=>m.id===value);if(!item)return s;
  if(s.selected.includes(value)){beginReturn(s,value);return s;}
  const isTool=!['flask','jar','tank','marble'].includes(value);
  if(heldMaterial(s)&&isTool&&value!=='forceps'){tell(s,'鑷子還夾著材料，先放入容器或放回原碟。');return s;}
  const freshMarble=value==='marble'&&s.marbleRemaining.every(v=>v<=.00001);if(freshMarble)s.marbleRemaining=[1,1,1,1,1];
  s.selected.push(value);
  s.tool=isTool?value:null;s.focus=isTool?null:value;
  tell(s,freshMarble?'已取用新的一份大理石，放到操作桌上。':`已將${item.name}放到操作桌上。`);return s;
 }
 if(['immerse','extract','rotate','relocate','uncover'].includes(action)&&!s.selected.includes('jar')){tell(s,'先從材料區取用集氣瓶。');return s;}
 if((action==='immerse'||action==='relocate'&&s.jarPlace<.5)&&!s.selected.includes('tank')){tell(s,'先從材料區取用水槽。');return s;}
 if(action==='immerse'||action==='extract'){
  if(s.outlet==='jar'){tell(s,'先撤出導管，再移動集氣瓶。','revise');return s;}
  const startPose=jarPose(s),startAngle=s.jarAngle;
  if(action==='extract'&&!s.jarCovered&&(s.co2Volume+s.otherVolume>.01)){s.uncoveredExtraction=true;s.sampleExposure='extraction';}
  move(s,action,1800,{startPose,startAngle});
  if(action==='extract'&&!s.jarCovered){tell(s,s.uncoveredExtraction?sampleProblem(s):s.jarWater>.01?'尚未收集氣體；未蓋片取出後清水會流出，需要重新準備集氣瓶。':'尚未收集氣體；這次取出不會造成二氧化碳樣本流失。',s.uncoveredExtraction?'error':'hint');return s;}
  tell(s,action==='immerse'?'保持蓋片，提起集氣瓶、倒置，再從上方放入水槽。':'保持封口向上取出，離水後扶正放回桌面。');return s;
 }
 if(action==='tool'){
  if(!DESK_MATERIALS.some(m=>m.id===value))return s;
  if(heldMaterial(s)&&value!=='forceps'){tell(s,'鑷子還夾著材料，先放入容器或放回原碟。');return s;}
  if(!s.selected.includes(value))s.selected.push(value);
  s.tool=s.tool===value?null:value;s.focus=null;tell(s,s.tool?`拿起${DESK_MATERIALS.find(m=>m.id===s.tool).name}，拖曳到要使用的位置，放開確認。`:'已放下工具。');return s;
 }
 if(action==='target'){
  const target=value==='funnel'?'flask':value==='outlet'?'rig':value;
  if(!s.selected.includes(target)){tell(s,'先從材料區取用'+(DESK_MATERIALS.find(m=>m.id===target)?.name||'器材')+'。');return s;}
  const tool=s.tool;
  if(tool==='catalyst'){tell(s,'雙氧水與二氧化錳用於前面的製氧；這次要用大理石與稀鹽酸製備二氧化碳。','revise');return s;}
  if(!tool){s.focus=s.focus===value?null:value;tell(s,value==='marble'?'用鑷子夾取大理石，再從瓶口放入。':value==='outlet'?'拖曳導管出口，移到瓶外水中或集氣瓶口。':'直接拖曳桌上的器材，移到操作位置後放開。');return s;}
  if(['water','acid','peroxide'].includes(tool)){
   if(!['jar','tank','flask','funnel'].includes(value)){tell(s,'將瓶口移到容器上方開口，再倒入液體。','revise');return s;}
   const target=value==='funnel'?'flask':value;
   if(target==='jar'&&(s.jarAngle>.01||s.jarPlace>.01||s.jarCovered)){tell(s,'先將集氣瓶移到桌面、扶正並移開玻璃片，再加液。','revise');return s;}
   if(target==='flask'&&s.rig&&!s.funnel){tell(s,'瓶口已被塞子擋住；先插入漏斗或移開塞子，再加液。','revise');return s;}
   if(target==='jar'&&s.outlet==='jar'){tell(s,'先將導管撤出集氣瓶。','revise');return s;}
   const field=target==='jar'?'jarWater':target==='tank'?'tankWater':'flaskWater',c=s.contents[target];
   const from=tool==='acid'&&target==='flask'?s.acid:tool==='peroxide'&&target==='flask'?c.peroxide:s[field];
   const to=target==='flask'&&tool!=='water'?from+1:1;
   move(s,tool,tool==='acid'?1750:1600,{target,from,to,contentFrom:tool==='water'?0:c[tool],viaFunnel:target==='flask'&&s.rig&&s.funnel});
   const container=target==='flask'?'錐形瓶':target==='jar'?'集氣瓶':'水槽';
   tell(s,tool==='peroxide'?`用錯藥品：雙氧水是製氧材料，不是本次製備二氧化碳所需的稀鹽酸。請從材料區收回${container}清空後重試。`:tool==='acid'&&target!=='flask'?`稀鹽酸倒錯容器：${container}應裝清水，不應加入稀鹽酸。請從材料區收回${container}，清空後再裝清水。`:tool==='acid'?s.rig&&s.funnel?'稀鹽酸由試藥瓶口流入漏斗，再沿長管進入錐形瓶。':'由試藥瓶口倒入開口的錐形瓶；此時生成的氣體會直接逸出。':target==='flask'?'清水加入錐形瓶不會自行產生二氧化碳，也不能代替稀鹽酸；會稀釋酸，但不必因此清空。請觀察是否已有大理石與稀鹽酸。':'清水由瓶口流入容器；可在倒滿前放下工具。',tool==='peroxide'||tool==='acid'&&target!=='flask'?'error':'hint');return s;
  }
  if(tool==='forceps'){
   const solid=heldMaterial(s);
   if(value==='catalyst'){
    if(solid&&solid!=='catalyst'){tell(s,'先放下鑷子夾著的大理石。');return s;}
    move(s,solid?'return-solid':'pick-solid',solid?700:650,{solid:'catalyst'});tell(s,solid?'將二氧化錳放回碟中。':'鑷尖夾取少量二氧化錳。');return s;
   }
   if(value==='marble'){
    if(solid&&solid!=='marble'){tell(s,'先放下鑷子夾著的二氧化錳。');return s;}
    if(s.heldMarble){move(s,'return-stone',700,{index:s.heldStoneId??s.flaskMarbles});tell(s,'將大理石放回盤中。');}
    else {const index=[0,1,2,3,4].find(i=>!usedMarbleIds(s).includes(i));if(index!==undefined){move(s,'pick-stone',650,{index});tell(s,'鑷子夾住一塊大理石，從盤中提起。');}else tell(s,'盤中的大理石已用完。');}return s;
   }
   if(['flask','jar','tank'].includes(value)){
    if(!solid){tell(s,'先用鑷子夾取大理石或二氧化錳。');return s;}
    if(value==='flask'&&s.rig){tell(s,'瓶口已被塞子擋住，先移開塞子與導管。','revise');return s;}
    if(value==='jar'&&(s.jarAngle>.01||s.jarPlace>.01||s.jarCovered)){tell(s,'先扶正集氣瓶並移開玻璃片，才能由瓶口放入材料。','revise');return s;}
    const correct=value==='flask'&&solid==='marble';
    move(s,correct?'place-stone':'drop-solid',1350,{target:value,solid,index:s.heldStoneId??0,tilt:correct&&liquidAmount(s,'flask')<.01});
    tell(s,correct?'鑷子從瓶口進入，讓大理石沿瓶內側滑下。':`${solid==='catalyst'?'用錯材料：二氧化錳是製氧用的材料，不是本次製備二氧化碳所需的大理石。':'放錯位置：大理石應放入錐形瓶，不是集氣瓶或水槽。'}請從材料區收回${value==='flask'?'錐形瓶':value==='jar'?'集氣瓶':'水槽'}，清空後重試。`,correct?'hint':'error');return s;
   }
  }
  if(tool==='rig'&&value==='flask'){
   if(s.rig){tell(s,'雙孔塞與導管已裝好。');return s;}move(s,'rig',1450);tell(s,'先抬高整組裝置，再由瓶口上方放下雙孔塞。');return s;
  }
  if(tool==='funnel'&&['flask','rig'].includes(value)){
   if(!s.selected.includes('rig')){tell(s,'先取用雙孔塞與導管。');return s;}
   if(s.funnel){tell(s,'薊頭漏斗已裝好。');return s;}move(s,'funnel',1350,{rigAnchor:{...rigPosition(s)}});tell(s,'由上方將漏斗長管插入另一個孔。');return s;
  }
  if(tool==='plate'&&value==='jar'){
   if(s.jarCovered){tell(s,'玻璃片已蓋在瓶口上。');return s;}
   if(gasEntersJar(s)||s.outlet==='jar'){tell(s,'導管還在瓶口內，請先撤管再蓋玻璃片。','revise');return s;}
   move(s,'cover',800,{underwater:mouthUnderwater(s)});tell(s,mouthUnderwater(s)?'玻璃片在水下貼合瓶口。':'將玻璃片蓋在瓶口上。');return s;
  }
  tell(s,'這件工具不適合用在這個位置，再選一次。','revise');return s;
 }
 s.tool=null;
 if(action==='uncover'){
  if(!s.jarCovered)return s;move(s,'uncover',650);tell(s,mouthUnderwater(s)?'在水下移開玻璃片，瓶口仍浸在水中。':'移開玻璃片；倒置時若瓶口未在水下，水會流出。');return s;
 }
 if(action==='rotate'){
  if(s.outlet==='jar'){tell(s,'先撤出導管，再轉動集氣瓶。','revise');return s;}
  move(s,'rotate',1100,{from:s.jarAngle,to:s.jarAngle>90?0:180});tell(s,s.jarCovered?'保持玻璃片貼合瓶口，連同集氣瓶一起轉動。':s.co2Volume>0?'未蓋片時轉動集氣瓶，氣體可能流失。':'轉動集氣瓶；注意未遮口的水可能流失。');return s;
 }
 if(action==='relocate'){
  if(s.outlet==='jar'){tell(s,'先撤出導管，再移動集氣瓶。','revise');return s;}
  if(s.jarPlace<.5&&s.jarAngle<179){tell(s,'先倒置集氣瓶，再將瓶口移入水槽。','revise');return s;}
  move(s,'relocate',1200,{startPose:jarPose(s),from:s.jarPlace,to:s.jarPlace>.5?0:1});tell(s,s.jarPlace>.5?(s.jarCovered?'將集氣瓶移到桌面，保持玻璃片貼合。':'未蓋片取出，瓶口離水後水與氣體會流失。'):'將倒置的集氣瓶移入水槽。');return s;
 }
 if(action==='outlet'){
  if(value!=='air'&&(!s.selected.includes('tank')||value==='jar'&&!s.selected.includes('jar'))){tell(s,'先從材料區取用水槽與集氣瓶，再調整出口位置。');return s;}
  if(!s.rig){tell(s,'先把雙孔塞與導管裝在錐形瓶上。');return s;}
  if(value==='jar'&&(!mouthUnderwater(s)||s.jarAngle<179||s.jarCovered)){tell(s,'瓶口要倒置、浸在水下並移開玻璃片，導管才能從下方進入。','revise');return s;}
  if(s.outlet===value){tell(s,'出口已在這個位置。');return s;}
  move(s,'outlet',value==='jar'||s.outlet==='jar'?1450:850,{from:s.outlet,to:value,startOutlet:outletPose(s),endOutlet:value==='jar'?{x:jarMouth(s).x-260,y:jarMouth(s).y-27}:value==='tank'?{x:poses.tank.x+bodyOffset(s,'tank').x,y:poses.tank.y+bodyOffset(s,'tank').y}:airPose(s)});tell(s,value==='jar'?'導管先從瓶口下方移入，再向上伸進瓶口。':value==='tank'?'出口移到瓶外水中，觀察排出的氣泡。':'出口移到水面上方，氣體直接排到空氣中。');return s;
 }
 if(action==='remove-rig'){
  if(s.outlet!=='air'){s.rigLift={...rigPosition(s)};move(s,'outlet',1450,{from:s.outlet,to:'air',startOutlet:outletPose(s),removeAfter:true});tell(s,'先將導管由瓶口下方撤出，再拔起整組裝置。');return s;}
  move(s,'remove-rig',1450,{hasFunnel:s.funnel,tool:'rig',toolStart:{...rigPosition(s)},endTool:{x:500,y:50}});tell(s,'向上提起塞子，再移開整組裝置。');return s;
 }
 return s;
}
function applyMotion(s,m){
 const p=clamp(m.elapsed/m.duration);
 if(['water','acid','peroxide'].includes(m.kind)){
  const target=m.target||'flask',q=clamp((p-.25)/.55),amount=Math.max(0,q-(m.transferred||0));addLiquid(s,target,m.kind,amount,{viaFunnel:m.viaFunnel,receiver:liquidReceiver(s,target,overflowPoint(s,target,m))});m.transferred=q;
 }
 if(m.kind==='drop-solid'&&!m.deposited&&p>=.83){const c=s.contents[m.target];if(m.solid==='marble')c.stones.push(m.index);else c.catalyst++;if(m.target==='tank'){const count=c.stonePositions.length,x=clamp((m.dropAt?.x??700+bodyOffset(s,'tank').x)-bodyOffset(s,'tank').x-60,630,850)+count*32,point={x,y:510+(x-650)*.05+(count%2)*6};c[m.solid==='marble'?'stonePositions':'catalystPositions'].push(point);}m.deposited=true;s.heldMarble=false;s.heldSolid=null;s.heldStoneId=null;}
 if(m.kind==='immerse'||m.kind==='extract'){
  const q=ease((p-.25)/.43);s.jarAngle=mix(m.startAngle,m.kind==='immerse'?180:0,q);
  s.jarPlace=m.kind==='immerse'?ease((p-.68)/.32):1-ease(p/.25);
 }
 if(m.kind==='rotate')s.jarAngle=mix(m.from,m.to,ease(p));
 if(m.kind==='relocate')s.jarPlace=mix(m.from,m.to,ease(p));
 if(p<1)return;
 if(['immerse','extract','relocate'].includes(m.kind))s.positions.jar=bodyPoint(s,'tank',870,330-160*(1-s.jarPlace));
 if(m.kind==='pick-stone'){s.heldMarble=true;s.heldSolid='marble';s.heldStoneId=m.index;}
 if(m.kind==='pick-solid'){s.heldSolid='catalyst';s.heldMarble=false;}
 if(['return-stone','return-solid'].includes(m.kind)){s.heldMarble=false;s.heldSolid=null;s.heldStoneId=null;}
 if(m.kind==='place-stone'){s.heldMarble=false;s.heldSolid=null;s.flaskStoneIds.push(m.index);s.heldStoneId=null;s.flaskMarbles++;}
 if(m.kind==='rig'){s.rig=true;s.outlet='air';s.outletPosition=airPose(s);s.airRemaining=1;}
 if(m.kind==='funnel')s.funnel=true;
 if(m.kind==='remove-rig'){s.rig=false;s.rigLift=null;s.outlet='air';s.outletPosition=null;s.airRemaining=1;}
 if(m.kind==='outlet'){s.outlet=m.to;s.outletPosition=m.endOutlet||{...poses[m.to]};}
 if(m.kind==='cover'){s.jarCovered=true;s.sealedUnderwater=m.underwater;}
 if(m.kind==='uncover'){if(!mouthUnderwater(s)&&s.co2Volume+s.otherVolume>.01){s.uncoveredExtraction=true;s.sampleExposure='uncover';}s.jarCovered=false;s.sealedUnderwater=false;}
 if(m.tool&&m.endTool)s.positions[m.tool]={...m.endTool};
 s.motion=null;
 if(m.returnAfter)returnMaterial(s,m.returnAfter);
 if(m.removeAfter)actDesk(s,'remove-rig');
 if(m.autoFill&&s.selected.includes('marble')&&['pick-stone','place-stone','drop-solid'].includes(m.kind)&&(m.kind==='pick-stone'||[0,1,2,3,4].some(i=>!usedMarbleIds(s).includes(i)))){
  const target=m.target||'flask',pick=m.kind!=='pick-stone',kind=pick?'pick-stone':target==='flask'?'place-stone':'drop-solid',index=pick?[0,1,2,3,4].find(i=>!usedMarbleIds(s).includes(i)):s.heldStoneId;
  move(s,kind,pick?650:1350,{tool:'forceps',toolStart:{...(s.positions.forceps||{x:445,y:310})},endTool:pick?bodyPoint(s,'marble',520,305):bodyPoint(s,target==='flask'?'flask':target==='tank'?'tank':'flask',445,310),index,autoFill:true,contact:true,target,solid:'marble',dropAt:m.dropAt});
  tell(s,'正在將剩餘大理石逐塊夾入'+(target==='flask'?'錐形瓶':target==='jar'?'集氣瓶':'水槽')+'。'+(target==='flask'?'':'放錯位置：本次大理石應放入錐形瓶，可重做實驗。'),target==='flask'?'hint':'error');
 }
}
export function advanceDesk(s,ms){
 const preview=s.dragging;s.dragging=null;try {
 let left=Math.max(0,ms);while(left>0){const dt=Math.min(32,left);left-=dt;s.time+=dt;
  if(s.motion){s.motion.elapsed=Math.min(s.motion.duration,s.motion.elapsed+dt);applyMotion(s,s.motion);}
  s.spilling=false;
  if(!s.jarCovered&&s.jarAngle>95&&!mouthUnderwater(s)&&s.jarWater>0){drainJar(s,dt/850,liquidReceiver(s,'jar',jarMouth(s)));s.spilling=true;}
  if(!s.jarCovered&&!mouthUnderwater(s)&&s.co2Volume+s.otherVolume>0)exchangeWithAir(s,dt/(s.jarAngle>95?1000:60000));
  for(const target of ['jar','tank']){const c=s.contents[target];if(liquidAmount(s,target)>.01&&c.stones.length&&c.acid>c.acidUsed){const amount=Math.min(c.acid-c.acidUsed,dt/24000,marbleCapacity(s,target));c.acidUsed+=amount;consumeMarble(s,target,amount);}if(oxygenReacting(s,target))c.peroxideUsed=Math.min(c.peroxide,c.peroxideUsed+dt/24000);}
  refreshCompletion(s);const co2=reacting(s),oxygen=oxygenReacting(s);if(!co2&&!oxygen)continue;s.reactionAge+=dt;
  if(co2){const amount=Math.min(s.acid-s.reactionUsed,dt/24000,marbleCapacity(s,'flask'));s.reactionUsed+=amount;consumeMarble(s,'flask',amount);}if(oxygen)s.contents.flask.peroxideUsed=Math.min(s.contents.flask.peroxide,s.contents.flask.peroxideUsed+dt/24000);
  if(co2&&!s.rig)s.escapedUnstoppered+=dt;
  if(co2&&s.reactionUsed>=s.acid-.00001&&s.escapedUnstoppered>0&&s.co2Volume<.98)tell(s,setupGuidance(s),'error');
  if(!liquidSeal(s))continue;
  const air=s.airRemaining>0;s.airRemaining=Math.max(0,s.airRemaining-dt/4500);
  if(gasEntersJar(s)){
   const kind=air?'airVolume':oxygen?'otherVolume':'co2Volume';enterGas(s,dt/6500,kind);
   if(air&&s.airVolume>.01&&!s.unpurgedCollection){s.unpurgedCollection=true;tell(s,setupGuidance(s),'error');}
  }
 }
 refreshCompletion(s);return s;
 }finally{s.dragging=preview;}
}
export function deskFrame(state){const s=confirmedState(state);const co2=reacting(s),oxygen=oxygenReacting(s),reaction=co2||oxygen;return{outlet:outletPose(s),location:outletLocation(s),reaction,oxygen,reactionStrength:reaction?clamp(Math.max(co2?s.acid-s.reactionUsed:0,oxygen?s.contents.flask.peroxide-s.contents.flask.peroxideUsed:0)*6):0,flow:reaction&&liquidSeal(s),collecting:reaction&&liquidSeal(s)&&gasEntersJar(s),motion:s.motion?.kind||'',progress:s.motion?clamp(s.motion.elapsed/s.motion.duration):0};}
export function taskHosePoints(a,b,length=420){
 const cubic=(a,c,d,b,t)=>{const u=1-t;return{x:u*u*u*a.x+3*u*u*t*c.x+3*u*t*t*d.x+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*c.y+3*u*t*t*d.y+t*t*t*b.y};};
 const points=r=>{const m={x:(a.x+b.x)/2+r,y:(a.y+b.y)/2+r};return Array.from({length:65},(_,i)=>{const t=i/64;return t<=.5?cubic(a,{x:a.x+r,y:a.y},{x:m.x+r/2,y:m.y-r},m,t*2):cubic(m,{x:m.x-r/2,y:m.y+r},{x:b.x,y:b.y-r},b,(t-.5)*2);});};
 const measure=ps=>ps.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-ps[i].x,p.y-ps[i].y),0);
 let lo=0,hi=length;for(let i=0;i<25;i++){const r=(lo+hi)/2;if(measure(points(r))<length)lo=r;else hi=r;}return points((lo+hi)/2);
}
