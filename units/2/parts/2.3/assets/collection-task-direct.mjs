import {jarPose,jarMouth,outletPose,clamp} from './collection-task-model.mjs?v=supplies-1';
export const TOOL_HOME={forceps:{x:485,y:305},water:{x:660,y:130},acid:{x:440,y:65},rig:{x:500,y:50},funnel:{x:535,y:100},plate:{x:605,y:-20},peroxide:{x:680,y:65},catalyst:{x:490,y:450}};
export function directPosition(s,id){
 if(s.dragging?.id===id)return s.dragging.position;
 if(id==='jar'){const p=jarPose(s);return{x:870+p.x,y:330+p.y};}
 if(id==='outlet'){const p=outletPose(s);return{x:p.x+260,y:p.y+10};}
 if(id==='plate'&&s.jarCovered)return jarMouth(s);
 return s.positions[id]||TOOL_HOME[id];
}
export function limitPosition(s,id,p){
 const q={x:clamp(p.x,65,1035),y:clamp(p.y,id==='forceps'?220:-25,id==='funnel'?270:590)};
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
const intent=(action,value,label,target)=>({action,value,label,target});
export function approach(s,id,p,origin){
 const has=id=>s.selected.includes(id),near=(x,y,r=75)=>Math.hypot(p.x-x,p.y-y)<r,mouth=jarMouth(s);
 if(id==='jar'){
  if(s.jarPlace>.5&&p.y<(origin?.y??330)-60)return intent('extract',null,'向上取出，保持封口並扶正','jar');
  if(s.jarPlace<.5&&has('tank')&&near(870,350,125))return intent('immerse',null,'保持蓋片，倒置後由上方放入水中','tank');
  return null;
 }
 if(id==='outlet'){
  if(has('jar')&&has('tank')&&near(870,465,65)&&s.outlet!=='jar')return intent('outlet','jar','從瓶口下方移入集氣瓶','jar');
  if(has('tank')&&p.x<790&&p.y>355&&s.outlet!=='tank')return intent('outlet','tank',s.outlet==='jar'?'先向下撤出，再移到瓶外水中':'放到瓶外水中排氣','outlet');
  if(p.y<335&&s.outlet!=='air')return intent('outlet','air','出口移到水面上方排氣','outlet');
  return null;
 }
 if(id==='forceps'){
  if(has('marble')&&near(520,555,90))return intent('target','marble',s.heldMarble?'將大理石放回盤中':'夾起一塊大理石','marble');
  if(has('flask')&&near(300,205,95))return intent('target','flask','從瓶口放入大理石','flask');
 }
 if(id==='water'){
  if(has('jar')&&near(mouth.x,mouth.y,100))return intent('target','jar','由集氣瓶口裝水','jar');
  if(has('tank')&&near(1000,355,110))return intent('target','tank','向水槽加水','tank');
 }
 if(id==='plate'&&s.jarCovered){if(Math.hypot(p.x-mouth.x,p.y-mouth.y)>65)return intent('uncover',null,'移開玻璃片','jar');return null;}
 if(id==='plate'&&has('jar')&&near(mouth.x,mouth.y,95))return intent('target','jar','將玻璃片貼合瓶口','jar');
 if(id==='rig'&&has('flask')&&near(300,205,100))return intent('target','flask','由瓶口上方裝入雙孔塞與導管','flask');
 if(id==='funnel'&&has('flask')&&near(300,100,100))return intent('target','flask','由上方插入薊頭漏斗','flask');
 if(id==='acid'&&has('flask')&&(near(274,65,90)||(!s.rig&&near(300,205,100))))return intent('target',s.funnel?'funnel':'flask',s.funnel?'從試藥瓶口倒入薊頭漏斗':'由開口錐形瓶加入稀鹽酸','flask');
 if(['peroxide','catalyst'].includes(id)&&has('flask')&&near(300,205,110))return intent('target','flask','試著將材料用於反應瓶','flask');
 return null;
}
export function parkPosition(s,id,target){
 const mouth=jarMouth(s);
 if(id==='forceps')return target==='marble'?{x:520,y:305}:{x:445,y:310};
 if(id==='water'||id==='acid')return target==='jar'?{x:715,y:90}:target==='tank'?{x:945,y:170}:{x:435,y:40};
 if(id==='plate')return{x:Math.min(1020,mouth.x+140),y:mouth.y-75};
 return TOOL_HOME[id];
}
