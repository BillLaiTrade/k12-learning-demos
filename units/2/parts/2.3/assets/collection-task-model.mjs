// 操作與動畫共用同一份狀態；氣體只會由當下的導管出口進入瓶中。
export const DESK_MATERIALS=[
 ['marble','大理石','反應材料'],['acid','稀鹽酸','反應材料'],['flask','錐形瓶','容器'],['jar','集氣瓶','容器'],['tank','水槽','容器'],['water','清水','液體'],
 ['funnel','薊頭漏斗','加液工具'],['rig','雙孔塞與導管','連接工具'],['plate','薄玻璃片','封口工具'],['forceps','鑷子','取物工具'],['peroxide','雙氧水','反應材料'],['catalyst','二氧化錳','反應材料']
].map(([id,name,kind])=>({id,name,kind,required:!['peroxide','catalyst'].includes(id)}));
export const REQUIRED_MATERIALS=DESK_MATERIALS.filter(m=>m.required).map(m=>m.id);
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const ease=v=>{const t=clamp(v);return t*t*(3-2*t);};
export const mix=(a,b,p)=>a+(b-a)*p;
export function createDesk(){return{positions:{},dragging:null,phase:'operate',selected:[],tool:null,focus:null,tankWater:0,jarWater:0,jarAngle:0,jarPlace:0,jarCovered:false,sealedUnderwater:false,flaskMarbles:0,heldMarble:false,acid:0,flaskWater:0,rig:false,funnel:false,outlet:'air',airRemaining:1,co2Volume:0,airVolume:0,sampleStarted:false,reactionAge:0,time:0,motion:null,feedback:'從材料區點選要用的物品，放到桌上直接操作。',feedbackKind:'hint',result:null,spilling:false};}
export const flaskSurface=s=>580-80*Math.min(2,s.acid+s.flaskWater);
export const waterSurface=s=>524-119*s.tankWater;
export function jarPose(s){
 const m=s.motion;
 if(s.dragging?.id==='jar')return{x:s.dragging.position.x-870,y:s.dragging.position.y-330};
 if(['immerse','extract'].includes(m?.kind)){
  const p=clamp(m.elapsed/m.duration),start=m.startPose,finish={x:0,y:m.kind==='immerse'?0:-160};
  if(p<.25)return{x:start.x,y:mix(start.y,-225,ease(p/.25))};
  if(p<.68)return{x:mix(start.x,finish.x,ease((p-.25)/.43)),y:-225};
  return{x:finish.x,y:mix(-225,finish.y,ease((p-.68)/.32))};
 }
 if(m?.kind==='relocate'){
  const p=m.elapsed/m.duration,a={x:0,y:-160*(1-m.from)},b={x:0,y:-160*(1-m.to)};
  if(p<.3)return{x:a.x,y:mix(a.y,-260,ease(p/.3))};
  if(p<.7)return{x:mix(a.x,b.x,ease((p-.3)/.4)),y:-260};
  return{x:b.x,y:mix(-260,b.y,ease((p-.7)/.3))};
 }
 return{x:0,y:-160*(1-s.jarPlace)};
}
export function jarMouth(s){const a=s.jarAngle*Math.PI/180,p=jarPose(s);return{x:870+p.x+102*Math.sin(a),y:330+p.y-102*Math.cos(a)};}
export const mouthUnderwater=s=>s.jarPlace>.99&&jarMouth(s).y>waterSurface(s)+3;
export function reacting(s){
 const surface=flaskSurface(s);if(s.acid<=0)return false;
 if(s.flaskMarbles>0&&surface<575)return true;
 if(s.motion?.kind!=='place-stone')return false;
 const p=s.motion.elapsed/s.motion.duration;if(p<.6)return false;
 const heights=[238,300,350,430,500,[555,555,548,525,520][s.motion.index]],k=clamp((p-.6)/.23)*5,i=Math.min(4,Math.floor(k)),y=mix(heights[i],heights[i+1],ease(k-i));
 return y+18>surface;
}
export const liquidSeal=s=>s.rig&&s.funnel&&s.motion?.kind!=='remove-rig'&&flaskSurface(s)<555;
const poses={air:{x:430,y:260},tank:{x:430,y:405},jar:{x:610,y:405}};
function tubePose(m,p){
 const from=m.startOutlet||poses[m.from],to=poses[m.to];
 if(m.from==='jar'||m.to==='jar'){
  // 先降到瓶口下方，再橫移，最後升入；玻璃不得穿過瓶壁。
  if(p<.3)return{x:from.x,y:mix(from.y,450,ease(p/.3))};
  if(p<.7)return{x:mix(from.x,to.x,ease((p-.3)/.4)),y:450};
  return{x:to.x,y:mix(450,to.y,ease((p-.7)/.3))};
 }
 return{x:mix(from.x,to.x,ease(p)),y:mix(from.y,to.y,ease(p))};
}
export function outletPose(s){if(s.dragging?.id==='outlet')return{x:s.dragging.position.x-260,y:s.dragging.position.y-10};return s.motion?.kind==='outlet'?tubePose(s.motion,s.motion.elapsed/s.motion.duration):poses[s.outlet];}
export function gasEntersJar(s){const o=outletPose(s),mouth=jarMouth(s);return !s.jarCovered&&s.jarAngle>179&&mouthUnderwater(s)&&o.x+260>mouth.x-55&&o.x+260<mouth.x+55&&o.y+10<mouth.y-4&&o.y+10>mouth.y-65;}
function tell(s,text,kind='hint'){s.feedback=text;s.feedbackKind=kind;s.result=null;}
function move(s,kind,duration,extra={}){s.motion={kind,duration,elapsed:0,tool:s.tool,toolStart:s.tool&&s.positions[s.tool]?{...s.positions[s.tool]}:null,...extra};s.tool=null;s.focus=null;}
export function inspectDesk(s){
 if(s.phase==='complete')return{correct:true,message:'你已收集並封存一瓶二氧化碳。'};
 if(s.co2Volume<.98)return{correct:false,message:s.airVolume>.01?'瓶中混入了原有空氣。可重新裝滿水、倒置，再收集已排除空氣的氣體。':s.jarWater>.02?'瓶內還有水，繼續觀察導管位置和水位變化。':'目前還沒有收集到一整瓶二氧化碳。檢查反應、液封和出口位置。'};
 if(s.airVolume>.01)return{correct:false,message:'瓶中混入了原有空氣。重新裝滿水後，再收集已排除空氣的氣體。'};
 if(!s.sealedUnderwater||!s.jarCovered)return{correct:false,message:'氣體已收集。請先撤出導管，在水下蓋好玻璃片。'};
 if(s.jarPlace>.01||s.jarAngle>.01)return{correct:false,message:'保持蓋片，將集氣瓶取出並扶正放在桌上。'};
 return{correct:true,message:'完成！你利用排水集氣法收集二氧化碳，先撤管、在水下蓋片，再取出扶正。'};
}
// 收回容器時清空其內容；安裝在它上面的器材一併回材料區。
function returnMaterial(s,id){
 const removed=new Set([id]),withJar=id==='jar'||id==='tank'&&s.jarPlace>.01;
 if(withJar){removed.add('jar');if(s.jarCovered)removed.add('plate');s.jarWater=0;s.jarAngle=0;s.jarPlace=0;s.jarCovered=false;s.sealedUnderwater=false;s.co2Volume=0;s.airVolume=0;s.sampleStarted=false;}
 if(id==='tank')s.tankWater=0;
 if(id==='flask'){
  if(s.rig)removed.add('rig');if(s.funnel)removed.add('funnel');s.acid=0;s.flaskWater=0;s.flaskMarbles=0;s.reactionAge=0;
 }
 if(removed.has('rig')){if(s.funnel)removed.add('funnel');s.rig=false;s.outlet='air';s.airRemaining=1;}
 if(removed.has('funnel')){s.funnel=false;s.airRemaining=1;}
 if(removed.has('forceps'))s.heldMarble=false;
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
 if(id==='forceps'&&s.heldMarble&&s.selected.includes('marble')){move(s,'return-stone',700,{tool:'forceps',toolStart:s.positions.forceps&&{...s.positions.forceps},returnAfter:id});tell(s,'先將夾著的大理石放回盤中，再收回鑷子。');return;}
 returnMaterial(s,id);
}
export function actDesk(s,action,value){
 if(action==='reset')return createDesk();
 if(action==='take'&&s.phase==='complete'){s.phase='operate';s.result=null;}
 if(s.phase!=='operate')return s;
 if(action==='inspect'){const r=inspectDesk(s);s.result=r.correct?'correct':'revise';s.feedback=r.message;s.feedbackKind=s.result;if(r.correct)s.phase='complete';return s;}
 if(action==='stop'&&['water','acid'].includes(s.motion?.kind)){const m=s.motion;move(s,'put-away',450,{pourKind:m.kind,target:m.target,viaFunnel:m.viaFunnel,stopAt:m.elapsed/m.duration});tell(s,'收起倒液工具，已倒入的液體會保留。');return s;}
 if(s.motion){tell(s,'請等手上的動作完成。');return s;}
 if(action==='take'){
  const item=DESK_MATERIALS.find(m=>m.id===value);if(!item)return s;
  if(s.selected.includes(value)){beginReturn(s,value);return s;}
  const isTool=!['flask','jar','tank','marble'].includes(value);
  if(s.heldMarble&&isTool&&value!=='forceps'){tell(s,'鑷子還夾著一塊大理石，先放進瓶口或放回盤中。');return s;}
  s.selected.push(value);
  s.tool=isTool?value:null;s.focus=isTool?null:value;
  tell(s,`已將${item.name}放到操作桌上。`);return s;
 }
 if(['immerse','extract','rotate','relocate','uncover'].includes(action)&&!s.selected.includes('jar')){tell(s,'先從材料區取用集氣瓶。');return s;}
 if((action==='immerse'||action==='relocate'&&s.jarPlace<.5)&&!s.selected.includes('tank')){tell(s,'先從材料區取用水槽。');return s;}
 if(action==='immerse'||action==='extract'){
  if(s.outlet==='jar'){tell(s,'先撤出導管，再移動集氣瓶。','revise');return s;}
  const startPose=jarPose(s),startAngle=s.jarAngle;
  move(s,action,1800,{startPose,startAngle});
  tell(s,action==='immerse'?'保持蓋片，提起集氣瓶、倒置，再從上方放入水槽。':'保持封口向上取出，離水後扶正放回桌面。');return s;
 }
 if(action==='tool'){
  if(!DESK_MATERIALS.some(m=>m.id===value))return s;
  if(s.heldMarble&&value!=='forceps'){tell(s,'鑷子還夾著一塊大理石，先放進瓶口或放回盤中。');return s;}
  if(!s.selected.includes(value))s.selected.push(value);
  s.tool=s.tool===value?null:value;s.focus=null;tell(s,s.tool?`拿起${DESK_MATERIALS.find(m=>m.id===s.tool).name}，點選要使用的位置。`:'已放下工具。');return s;
 }
 if(action==='target'){
  const target=value==='funnel'?'flask':value==='outlet'?'rig':value;
  if(!s.selected.includes(target)){tell(s,'先從材料區取用'+(DESK_MATERIALS.find(m=>m.id===target)?.name||'器材')+'。');return s;}
  const tool=s.tool;
  if(['peroxide','catalyst'].includes(tool)){tell(s,'雙氧水與二氧化錳用於前面的製氧；這次要用大理石與稀鹽酸製備二氧化碳。','revise');return s;}
  if(!tool){s.focus=s.focus===value?null:value;tell(s,value==='marble'?'用鑷子夾取大理石，再從瓶口放入。':value==='outlet'?'可直接拖動出口，也可使用下方的位置按鈕。':'選擇器材下方的操作。');return s;}
  if(tool==='water'){
   if(value==='jar'&&(s.jarAngle>.01||s.jarPlace>.01||s.jarCovered)){tell(s,'先將集氣瓶移到桌面、扶正並移開玻璃片，再裝水。','revise');return s;}
   if(!['jar','tank','flask','funnel'].includes(value)){tell(s,'這壺清水可以倒入桌上的容器。','revise');return s;}
   if(['flask','funnel'].includes(value)&&s.rig&&!s.funnel){tell(s,'瓶口已被塞子擋住；先插入漏斗或移開塞子，再加水。','revise');return s;}
   if(value==='jar'&&s.outlet==='jar'){tell(s,'先將導管撤出集氣瓶。','revise');return s;}
   if(value==='jar'){s.co2Volume=0;s.airVolume=0;s.sampleStarted=false;s.sealedUnderwater=false;}
   const target=value==='funnel'?'flask':value;move(s,'water',1600,{target,from:s[target==='jar'?'jarWater':target==='flask'?'flaskWater':'tankWater'],viaFunnel:target==='flask'&&s.funnel});tell(s,target==='flask'?'清水由瓶口加入反應瓶；單加清水不會產生二氧化碳。':'清水由壺嘴流入容器；可在倒滿前放下工具。');return s;
  }
  if(tool==='forceps'){
   if(value==='marble'){
    if(s.heldMarble){move(s,'return-stone',700);tell(s,'將大理石放回盤中。');}
    else if(s.flaskMarbles<5){move(s,'pick-stone',650,{index:s.flaskMarbles});tell(s,'鑷子夾住一塊大理石，從盤中提起。');}
    else tell(s,'盤中的大理石已用完。');return s;
   }
   if(value==='flask'){
    if(!s.heldMarble){tell(s,'先用鑷子夾取盤中的一塊大理石。');return s;}
    if(s.rig){tell(s,'瓶口已被塞子擋住，先移開塞子與導管。','revise');return s;}
    move(s,'place-stone',1350,{index:s.flaskMarbles,tilt:s.acid<.01});tell(s,'鑷子從瓶口進入，讓大理石沿瓶內側滑下。');return s;
   }
  }
  if(tool==='rig'&&value==='flask'){
   if(s.rig){tell(s,'雙孔塞與導管已裝好。');return s;}move(s,'rig',1450);tell(s,'先抬高整組裝置，再由瓶口上方放下雙孔塞。');return s;
  }
  if(tool==='funnel'&&value==='flask'){
   if(!s.rig){tell(s,'先裝雙孔塞與導管，漏斗才有支撐的位置。');return s;}
   if(s.funnel){tell(s,'薊頭漏斗已裝好。');return s;}move(s,'funnel',1350);tell(s,'由上方將漏斗長管插入另一個孔。');return s;
  }
  if(tool==='acid'&&['flask','funnel'].includes(value)){
   if(s.rig&&!s.funnel){tell(s,'塞子已裝好，先插入薊頭漏斗，再由漏斗口加液。','revise');return s;}
   move(s,'acid',1750,{from:s.acid,viaFunnel:s.funnel});tell(s,s.funnel?'稀鹽酸由試藥瓶口流入漏斗，再沿長管進入錐形瓶。':'由試藥瓶口倒入開口的錐形瓶；此時生成的氣體會直接逸出。');return s;
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
  move(s,'relocate',1200,{from:s.jarPlace,to:s.jarPlace>.5?0:1});tell(s,s.jarPlace>.5?(s.jarCovered?'將集氣瓶移到桌面，保持玻璃片貼合。':'未蓋片取出，瓶口離水後水與氣體會流失。'):'將倒置的集氣瓶移入水槽。');return s;
 }
 if(action==='outlet'){
  if(value!=='air'&&(!s.selected.includes('tank')||value==='jar'&&!s.selected.includes('jar'))){tell(s,'先從材料區取用水槽與集氣瓶，再調整出口位置。');return s;}
  if(!s.rig){tell(s,'先把雙孔塞與導管裝在錐形瓶上。');return s;}
  if(value==='jar'&&(!mouthUnderwater(s)||s.jarAngle<179||s.jarCovered)){tell(s,'瓶口要倒置、浸在水下並移開玻璃片，導管才能從下方進入。','revise');return s;}
  if(s.outlet===value){tell(s,'出口已在這個位置。');return s;}
  move(s,'outlet',value==='jar'||s.outlet==='jar'?1450:850,{from:s.outlet,to:value,startOutlet:outletPose(s)});tell(s,value==='jar'?'導管先從瓶口下方移入，再向上伸進瓶口。':value==='tank'?'出口移到瓶外水中，觀察排出的氣泡。':'出口移到水面上方，氣體直接排到空氣中。');return s;
 }
 if(action==='remove-rig'){
  if(s.outlet!=='air'){tell(s,'先將導管出口移到水面上方，再移開整組裝置。');return s;}
  move(s,'remove-rig',1450,{hasFunnel:s.funnel});tell(s,'向上提起塞子，再移開整組裝置。');return s;
 }
 return s;
}
function applyMotion(s,m){
 const p=clamp(m.elapsed/m.duration);
 if(m.kind==='water'){const field=m.target==='jar'?'jarWater':m.target==='flask'?'flaskWater':'tankWater';s[field]=mix(m.from,1,clamp((p-.25)/.55));}
 if(m.kind==='acid')s.acid=mix(m.from,1,clamp((p-.25)/.55));
 if(m.kind==='immerse'||m.kind==='extract'){
  const q=ease((p-.25)/.43);s.jarAngle=mix(m.startAngle,m.kind==='immerse'?180:0,q);
  s.jarPlace=m.kind==='immerse'?ease((p-.68)/.32):1-ease(p/.25);
 }
 if(m.kind==='rotate')s.jarAngle=mix(m.from,m.to,ease(p));
 if(m.kind==='relocate')s.jarPlace=mix(m.from,m.to,ease(p));
 if(p<1)return;
 if(m.kind==='pick-stone')s.heldMarble=true;
 if(m.kind==='return-stone')s.heldMarble=false;
 if(m.kind==='place-stone'){s.heldMarble=false;s.flaskMarbles++;}
 if(m.kind==='rig'){s.rig=true;s.outlet='air';s.airRemaining=1;}
 if(m.kind==='funnel')s.funnel=true;
 if(m.kind==='remove-rig'){s.rig=false;s.funnel=false;s.airRemaining=1;}
 if(m.kind==='outlet')s.outlet=m.to;
 if(m.kind==='cover'){s.jarCovered=true;s.sealedUnderwater=m.underwater;}
 if(m.kind==='uncover'){s.jarCovered=false;s.sealedUnderwater=false;}
 if(m.tool&&m.endTool)s.positions[m.tool]={...m.endTool};
 s.motion=null;
 if(m.returnAfter)returnMaterial(s,m.returnAfter);
}
export function advanceDesk(s,ms){
 if(s.phase!=='operate')return s;
 let left=Math.max(0,ms);while(left>0){const dt=Math.min(32,left);left-=dt;s.time+=dt;
  if(s.motion){s.motion.elapsed=Math.min(s.motion.duration,s.motion.elapsed+dt);applyMotion(s,s.motion);}
  s.spilling=false;
  if(!s.jarCovered&&s.jarAngle>95&&!mouthUnderwater(s)&&s.jarWater>0){s.jarWater=Math.max(0,s.jarWater-dt/850);s.spilling=true;}
  if(!s.jarCovered&&!mouthUnderwater(s)&&s.co2Volume>0){
   // CO2 比空氣密：開口朝下會流失，朝上則保留在下方、較慢與空氣混合。
   const loss=Math.min(s.co2Volume,dt/(s.jarAngle>95?1000:60000));s.co2Volume-=loss;s.airVolume=clamp(s.airVolume+loss);
  }
  if(!reacting(s))continue;s.reactionAge+=dt;
  if(!liquidSeal(s))continue;
  const air=s.airRemaining>0;s.airRemaining=Math.max(0,s.airRemaining-dt/2400);
  if(gasEntersJar(s)){
   if(!s.sampleStarted){s.airVolume=1-s.jarWater;s.co2Volume=0;s.sampleStarted=true;}
   const incoming=Math.min(s.jarWater,dt/6500);s.jarWater=clamp(s.jarWater-incoming);
   if(air)s.airVolume=clamp(s.airVolume+incoming);else s.co2Volume=clamp(s.co2Volume+incoming);
  }
 }
 return s;
}
export function deskFrame(s){return{outlet:outletPose(s),reaction:reacting(s),flow:reacting(s)&&liquidSeal(s),collecting:reacting(s)&&liquidSeal(s)&&gasEntersJar(s),motion:s.motion?.kind||'',progress:s.motion?clamp(s.motion.elapsed/s.motion.duration):0};}
export function taskHosePoints(a,b,length=420){
 const cubic=(a,c,d,b,t)=>{const u=1-t;return{x:u*u*u*a.x+3*u*u*t*c.x+3*u*t*t*d.x+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*c.y+3*u*t*t*d.y+t*t*t*b.y};};
 const points=r=>{const m={x:(a.x+b.x)/2+r,y:(a.y+b.y)/2+r};return Array.from({length:65},(_,i)=>{const t=i/64;return t<=.5?cubic(a,{x:a.x+r,y:a.y},{x:m.x+r/2,y:m.y-r},m,t*2):cubic(m,{x:m.x-r/2,y:m.y+r},{x:b.x,y:b.y-r},b,(t-.5)*2);});};
 const measure=ps=>ps.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-ps[i].x,p.y-ps[i].y),0);
 let lo=0,hi=length;for(let i=0;i<25;i++){const r=(lo+hi)/2;if(measure(points(r))<length)lo=r;else hi=r;}return points((lo+hi)/2);
}
