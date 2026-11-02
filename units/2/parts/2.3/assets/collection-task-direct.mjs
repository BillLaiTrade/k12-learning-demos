import {jarPose,jarMouth,outletPose,clamp,rigPosition} from './collection-task-model.mjs?v=assembly-1';
import {contactRegions,contains} from './collection-task-contact.mjs?v=assembly-1';
export const TOOL_HOME={forceps:{x:485,y:305},water:{x:660,y:130},acid:{x:440,y:65},rig:{x:500,y:50},funnel:{x:535,y:550},plate:{x:605,y:-20},peroxide:{x:680,y:65},catalyst:{x:490,y:450}};
export function directPosition(s,id){
 if(s.dragging?.id===id)return s.dragging.position;
 if(id==='jar'){const p=jarPose(s);return{x:870+p.x,y:330+p.y};}
 if(id==='outlet'){const p=outletPose(s);return{x:p.x+260,y:p.y+10};}
 if(id==='rig')return rigPosition(s);
 if(id==='funnel'&&s.funnel){const q=rigPosition(s);return{x:q.x-26,y:q.y+350};}
 if(id==='plate'&&s.jarCovered)return jarMouth(s);
 return s.positions[id]||TOOL_HOME[id];
}
export function limitPosition(s,id,p){
 const q={x:clamp(p.x,65,1035),y:clamp(p.y,-25,590)};
 if(id==='funnel'){q.x=clamp(q.x,65,650);q.y=clamp(q.y,140,590);}
 if(id==='rig'&&s.rig){q.x=300;q.y=Math.min(205,q.y);}
 if(id==='outlet'){
  // 固定長度玻璃管：先退出瓶口下方，再能橫移。不得自由穿過瓶壁。
  q.x=clamp(q.x,620,1000);q.y=clamp(q.y,210,495);
  if(s.outlet==='jar'&&s.dragging?.position.y<459&&q.y<460)q.x=870;
  else if(q.x>795)q.y=Math.max(460,q.y);
  const dx=q.x-706,dy=q.y-285,d=Math.hypot(dx,dy);if(d>385){q.x=706+dx*385/d;q.y=285+dy*385/d;}
 }
 if(id==='jar'){q.x=clamp(q.x,700,960);q.y=clamp(q.y,70,375);}
 return q;
}
const intent=(action,value,label,target,region,extra={})=>({action,value,label,target,region,...extra});
export function approach(s,id,p,origin){
 const has=id=>s.selected.includes(id),r=contactRegions(s),mouth=jarMouth(s);
 const hit=(region,point=p)=>contains(region,point);
 const use=(value,label,target,region,extra)=>intent('target',value,label,target,region,extra);
 if(id==='jar'){
  if(s.jarPlace>.5&&p.y<(origin?.y??330)-60&&hit(r.extract,{x:p.x,y:p.y+102}))return intent('extract',null,s.outlet==='jar'?'先撤出導管，再取出集氣瓶':'向上取出，保持封口並扶正','jar',r.extract);
  if(s.jarPlace<.5&&has('tank')&&hit(r.immerse,{x:p.x,y:p.y+119}))return intent('immerse',null,'瓶底已到槽口：保持蓋片、倒置入水','tank',r.immerse);
  return null;
 }
 if(id==='outlet'){
  if(has('jar')&&has('tank')&&s.jarAngle>179&&s.jarPlace>.99&&hit(r.jar)&&p.y>=mouth.y&&s.outlet!=='jar')return intent('outlet','jar',s.jarCovered?'先移開玻璃片，再從下方移入':'由瓶口下方向上移入','jar',r.jar);
  if(has('tank')&&s.tankWater>0&&hit(r.tankWater)&&!(has('jar')&&s.jarPlace>.5&&p.x>mouth.x-80&&p.x<mouth.x+80)&&s.outlet!=='tank')return intent('outlet','tank',s.outlet==='jar'?'從瓶口下方撤管，移到瓶外水中':'管口已浸水：在瓶外排氣','outlet',r.tankWater);
  if(has('tank')&&hit(r.tankAir)&&s.outlet!=='air')return intent('outlet','air','管口已離水：向空氣排氣','outlet',r.tankAir);
  return null;
 }
 if(id==='forceps'){
  if(s.heldMarble&&has('marble')&&hit(r.bowl))return use('marble','將大理石放回盤中','marble',r.bowl);
  const index=s.heldMarble?(s.heldStoneId??s.flaskMarbles):r.stones.findIndex((q,i)=>!(s.flaskStoneIds||[]).includes(i)&&hit(q));
  if(has('marble')&&index>=0&&hit(r.stones[index]))return use('marble',s.heldMarble?'將大理石放回盤中':'鑷尖夾起這塊大理石','marble',r.stones[index],{stoneIndex:index});
  if(has('flask')&&hit(r.flask))return use('flask',s.rig?'瓶口已被塞子擋住：先移開塞子':!s.heldMarble?'先用鑷尖夾取大理石':'鑷尖由瓶口放入大理石','flask',r.flask);
 }
 if(id==='water'||id==='acid'||id==='peroxide'){
  // 瓶嘴對開口；裝好漏斗後只有漏斗口可加液，瓶身或塞子側面不觸發。
  const source=id==='peroxide'?{x:p.x,y:p.y-58}:p;
  const target=s.rig&&s.funnel?r.funnel:r.flask;
  if(has('flask')&&hit(target,source))return use(s.rig&&s.funnel?'funnel':'flask',s.rig&&!s.funnel?'瓶口被塞子擋住：先插入漏斗':id==='water'?'清水由開口倒入反應瓶':id==='acid'?'稀鹽酸由開口流入反應瓶':'嘗試加入雙氧水','flask',target);
  if(id==='water'){
   if(has('jar')&&s.jarAngle<1&&s.jarPlace<.01&&hit(r.jar))return use('jar',s.jarCovered?'瓶口已蓋住：先移開玻璃片':'瓶嘴對準集氣瓶口：加水','jar',r.jar);
   if(has('tank')&&hit(r.tank))return use('tank','瓶嘴對準槽口：加水','tank',r.tank,{pourAt:{x:p.x,y:p.y}});
  }
 }
 if(id==='plate'&&s.jarCovered){
  // 接觸面已移離瓶口才移開，不因在瓶口內微調就解除封口。
  if(Math.abs(p.x-mouth.x)>95||Math.abs(p.y-mouth.y)>35)return intent('uncover',null,'移開瓶口上的玻璃片','jar',r.jarSeal);
  return null;
 }
 if(id==='plate'&&has('jar')&&hit(r.jarSeal))return use('jar',s.outlet==='jar'?'先撤出導管，再蓋玻璃片':'玻璃片貼合瓶口','jar',r.jarSeal);
 // 塞子以下緣對瓶口；漏斗以細長管整段對空孔（p 是可見管尖）。
 if(id==='rig'&&s.rig){if(p.y<(origin?.y??205)-30)return intent('remove-rig',null,'向上拔出雙孔塞與整組器材','flask',r.flask);return null;}
 if(id==='rig'&&has('flask')&&hit(r.flask,{x:p.x,y:p.y+59}))return use('flask','塞子下緣已對準瓶口：裝入','flask',r.flask);
 if(id==='funnel'&&has('rig')&&!s.funnel){
  // 長管全部有效，排除上端球狀膨大部；以長管輪廓對空孔。
  const rig=rigPosition(s),q={x:clamp(rig.x-26,p.x-8,p.x+8),y:clamp(rig.y-7,p.y-345,p.y)};
  if(hit(r.stopper,q))return use(s.rig?'flask':'rig','細長管已對準空孔：插入漏斗',s.rig?'flask':'rig',r.stopper);
 }
 if(id==='catalyst'&&has('flask')&&hit(r.flask,{x:p.x+55,y:p.y-10}))return use('flask','由材料碟邊緣嘗試加入二氧化錳','flask',r.flask);
 return null;
}
export function parkPosition(s,id,target){
 const mouth=jarMouth(s);
 if(id==='forceps')return target==='marble'?{x:520,y:305}:{x:445,y:310};
 if(id==='water'||id==='acid')return target==='jar'?{x:715,y:90}:target==='tank'?{x:945,y:170}:{x:435,y:40};
 if(id==='plate')return{x:Math.min(1020,mouth.x+140),y:mouth.y-75};
 return TOOL_HOME[id];
}
