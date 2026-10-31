import { LIMITS, INITIAL, ACTION_MS, WATER_ADD_MS, POUR_DELAY, POUR_RATE, massValue, concentrationState, format, sugarActionState, waterAdditionState } from './concentration-state.js?v=water-motion-2';
import { TOOL, renderMix } from './concentration-renderer.js?v=water-motion-2';
const $=id=>document.getElementById(id);
const lab=$('mix-lab'),canvas=$('mix-canvas'),ctx=canvas.getContext('2d');
const pitcher=$('mix-pitcher'),cup=$('mix-water-cup'),reset=$('mix-reset'),status=$('mix-status');
let state={...INITIAL},ready=false,animation=null,queue=[],raf=null,gesture=null,ignoreClick=false,dialogKind=null,lastKey='';
const massButtons=[...document.querySelectorAll('[data-mass-kind]')];
const massActions=[...massButtons.map(button=>({button,kind:button.dataset.massKind,delta:Number(button.dataset.massDelta)})),{button:pitcher,kind:'water',delta:1}];
const images={},reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const roleButtons=[...document.querySelectorAll('#s5 [data-mass-role]')];
const formulaParts=[...document.querySelectorAll('#mass-percent-formula [data-formula-part]')];
function selectFormulaRole(selected){
  roleButtons.forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.massRole===selected)));
  formulaParts.forEach(part=>part.classList.toggle('is-highlighted',part.dataset.formulaPart===selected));
}
roleButtons.forEach(button=>button.addEventListener('click',()=>{
  const selected=button.getAttribute('aria-pressed')==='true'?'':button.dataset.massRole;
  selectFormulaRole(selected);
  if(selected){
    const formula=$('mass-percent-formula'),rect=formula.getBoundingClientRect();
    if(rect.top<0||rect.bottom>innerHeight)formula.scrollIntoView({block:'nearest',behavior:reduceMotion?'instant':'smooth'});
  }
}));
document.addEventListener('click',event=>{
  if(!roleButtons.some(button=>button.contains(event.target)))selectFormulaRole('');
});
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function boundaryMessage(){
  const edges=[];
  for(const kind of ['sugar','water']){
    const [min,max]=LIMITS[kind],side=state[kind]<=min?'下限':state[kind]>=max?'上限':'';
    if(side)edges.push({name:kind==='sugar'?'糖量':'水量',side,value:state[kind]});
  }
  if(!edges.length)return '';
  if(edges.length===1){const edge=edges[0];return `本次配方的${edge.name}已達${edge.side}：${format(edge.value,1)} 克。`;}
  return `本次配方已達邊界：${edges.map(edge=>`${edge.name}${edge.side} ${format(edge.value,1)} 克`).join('、')}。`;
}
function announce(s){
  const notice=boundaryMessage(),message=notice||s;
  status.classList.toggle('boundary',!!notice);
  if(status.textContent!==message)status.textContent=message;
}
function values(){return concentrationState(state.sugar,state.water,state.ppm);}
function update(){
  for(const {button,kind,delta} of massActions){
    const limited=delta>0?state[kind]>=LIMITS[kind][1]:state[kind]<=LIMITS[kind][0];
    // Keep pointer capture until the held pitcher is released so it can return smoothly.
    const captured=button===pitcher&&gesture?.kind==='water';
    button.disabled=!ready||(limited&&!captured);
    button.setAttribute('aria-disabled',String(!ready||limited));
  }
  const v=values(),key=[state.sugar,state.water,state.ppm].join('/');
  if(key!==lastKey){
    // Integer tenths of a gram identify rounding to three decimal places exactly.
    const sugarTenths=Math.round(v.sugar*10),totalTenths=Math.round(v.total*10);
    const approximate=(sugarTenths*100*1000)%totalTenths!==0;
    const fields={
      'sugar-read':`${v.sugar.toFixed(1)} g`,'water-read':`${v.water.toFixed(1)} g`,
      sugar:`糖 ${format(v.sugar,1)} 克`,water:`水 ${format(v.water,1)} 克`,total:`${v.sugar?'糖水':'水'} ${format(v.total,1)} 克`,
      'formula-sugar':`${format(v.sugar,1)} 克`,'formula-total':`${format(v.total,1)} 克`,'percent-sign':approximate?'≈':'＝',percent:`${format(v.percent)}%`,
      'sugar-share':`糖占 ${format(v.percent)}%`,'water-share':`水占 ${format(100-v.percent)}%`,
    };
    for(const node of document.querySelectorAll('[data-mix]'))node.textContent=fields[node.dataset.mix];
    document.querySelector('[data-mix="percent-sign"]').setAttribute('aria-label',approximate?'約等於':'等於');
    $('mix-bar-fill').style.width=`${v.percent}%`;$('mix-bar').setAttribute('aria-label',`糖占質量${format(v.percent)}%，水占${format(100-v.percent)}%`);
    lab.dataset.sugar=String(v.sugar);lab.dataset.water=String(v.water);lab.dataset.total=String(v.total);lab.dataset.percent=String(v.percent);
    if(boundaryMessage()||status.classList.contains('boundary'))announce('');
    lastKey=key;
  }

}
function paint(now=performance.now()){
  update();lab.dataset.activity=gesture?.moved?'dragging':animation?animation.hold?'pouring-water':animation.kind==='sugar'?'scooping':animation.delta<0?'removing-water':'pouring-water':'idle';
  const lifted=animation?.kind==='water'&&animation.delta<0&&(now-animation.start)/animation.duration>.03&&(now-animation.start)/animation.duration<.97;
  lab.dataset.cupLifted=String(!!lifted);
  document.querySelector('[data-mix="water-read"]').textContent=lifted?'—':`${state.water.toFixed(1)} g`;
  if(!ready)return;
  const poses=renderMix(ctx,images,values(),animation,gesture?.moved?gesture:null,now);
  for(const [kind,button] of [['water',pitcher],['beaker',cup]]){
    const p=poses[kind];button.style.left=`${(p.x-p.w/2)/1536*100}%`;button.style.top=`${(p.y-p.h/2)/1024*100}%`;button.style.width=`${p.w/1536*100}%`;button.style.height=`${p.h/1024*100}%`;button.style.transform=`rotate(${p.angle}rad)`;
  }
}
function setMass(kind,value){const n=massValue(kind,value);if(n===null)return false;state[kind]=n;update();return true;}
function schedule(){if(raf===null)raf=requestAnimationFrame(frame);}
function clearActions(){if(raf!==null)cancelAnimationFrame(raf);raf=null;animation=null;queue=[];gesture=null;}
function startNext(now){
  if(animation||!queue.length)return;
  const action=queue.shift(),startMass=state[action.kind],target=clamp(startMass+action.delta,...LIMITS[action.kind]);
  if(target===startMass){startNext(now);return;}
  const addingWater=action.kind==='water'&&action.delta>0;
  animation={...action,start:now,startMass,target,duration:addingWater?WATER_ADD_MS:reduceMotion?1800:ACTION_MS[action.kind]};
}
function returnPitcher(now){
  if(!animation||animation.returnOnly)return;
  const lead=clamp((now-animation.start)/POUR_DELAY,0,1),fromStrength=lead*lead*(3-2*lead);
  animation={kind:'water',delta:1,start:now,startMass:state.water,target:state.water,duration:800,returnOnly:true,fromStrength};
}
function frame(now){
  raf=null;
  if(gesture?.kind==='water'&&!gesture.moved&&!gesture.capped&&now-gesture.start>=220){
    if(!animation?.hold)animation={kind:'water',delta:1,hold:true,start:gesture.start,startMass:state.water,duration:WATER_ADD_MS};
    const amount=clamp(animation.startMass+Math.max(0,now-animation.start-POUR_DELAY)/1000*POUR_RATE,...LIMITS.water);
    setMass('water',amount);gesture.held=true;
    if(amount>=LIMITS.water[1]){gesture.capped=true;returnPitcher(now);announce('已量得水150克，停止倒水。');}
  }
  if(animation&&!animation.hold){
    const p=clamp((now-animation.start)/animation.duration,0,1);
    const flow=animation.kind==='water'?(animation.delta>0?waterAdditionState(p).transfer:clamp((p-.25)/.55,0,1)):sugarActionState(p,animation.delta).transfer;
    setMass(animation.kind,animation.startMass+(animation.target-animation.startMass)*flow);
    if(p>=1){const kind=animation.kind;setMass(kind,animation.target);animation=null;announce(`${kind==='sugar'?'糖':'水'}已量得 ${format(state[kind],1)} 克，濃度 ${format(values().percent)}%。`);}
  }
  startNext(now);paint(now);
  if(animation||queue.length||gesture?.kind==='water'&&!gesture.moved&&!gesture.capped)schedule();
}
function act(kind,delta){
  if(!ready)return;
  if((delta>0&&state[kind]>=LIMITS[kind][1])||(delta<0&&state[kind]<=LIMITS[kind][0])){announce('');return;}
  if(animation?.hold){animation=null;gesture=null;}
  if(queue.length<20)queue.push({kind,delta});startNext(performance.now());paint();schedule();
}
function point(event){const r=lab.getBoundingClientRect();return{x:(event.clientX-r.left)/r.width*1536,y:(event.clientY-r.top)/r.height*1024};}
function wireTool(button,kind){
  button.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;ignoreClick=false;
    // Let queued spoonfuls finish visibly instead of jumping to their targets.
    if(animation||queue.length)return;
    clearActions();const p=point(event);gesture={kind,id:event.pointerId,start:performance.now(),px:p.x,py:p.y,x:TOOL[kind].x,y:TOOL[kind].y,moved:false,held:false,startWater:state.water};button.setPointerCapture(event.pointerId);
    if(kind==='water')schedule();
  });
  button.addEventListener('pointermove',event=>{
    if(!gesture||event.pointerId!==gesture.id)return;
    const p=point(event),dx=p.x-gesture.px,dy=p.y-gesture.py;
    const r=lab.getBoundingClientRect();
    if(Math.hypot(dx,dy)*r.width/1536>7)gesture.moved=true;
    if(gesture.moved){animation=null;gesture.x=clamp(TOOL[kind].x+dx,170,1380);gesture.y=clamp(TOOL[kind].y+dy,150,800);paint();}
  });
  button.addEventListener('pointerup',event=>{
    if(!gesture||gesture.id!==event.pointerId)return;
    const g=gesture,p=point(event);gesture=null;
    if(g.moved){
      ignoreClick=true;
      if(p.x>830&&p.x<1130&&p.y>270&&p.y<590)act('water',1);
    }else if(g.held){
      ignoreClick=true;
      const now=performance.now();
      if(state.water===g.startWater&&animation?.hold){
        // Continue the existing lift when a short hold ends before water flows.
        const lead=clamp((now-animation.start)/POUR_DELAY,0,1),duration=WATER_ADD_MS;
        animation={kind:'water',delta:1,start:now-lead*.24*duration,startMass:state.water,target:clamp(state.water+1,...LIMITS.water),duration};
      }else{
        returnPitcher(now);announce(`水已量得 ${format(state.water,1)} 克，濃度 ${format(values().percent)}%。`);
      }
      schedule();
    }
    paint();
  });
  const cancel=()=>{if(gesture?.kind===kind){gesture=null;animation=null;ignoreClick=true;paint();}};
  button.addEventListener('pointercancel',cancel);button.addEventListener('lostpointercapture',cancel);
  button.addEventListener('click',event=>{if(ignoreClick&&event.detail>0){ignoreClick=false;return;}ignoreClick=false;act(kind,1);});
  button.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();act(kind,event.key==='ArrowUp'?1:-1);}});
}
massButtons.forEach(button=>button.addEventListener('click',()=>act(button.dataset.massKind,Number(button.dataset.massDelta))));
wireTool(pitcher,'water');
const dialog=$('mass-dialog'),input=$('mass-input');
function openMass(kind){
  clearActions();paint();dialogKind=kind;const [min,max]=LIMITS[kind];
  $('mass-dialog-title').textContent=`設定${kind==='sugar'?'糖':'水'}的質量`;input.value=state[kind];input.min=min;input.max=max;$('mass-range').textContent=`${min}–${max} 克，最小調整 0.1 克`;$('mass-error').textContent='';dialog.showModal();input.select();
}
$('mix-sugar-input').addEventListener('click',()=>openMass('sugar'));$('mix-water-input').addEventListener('click',()=>openMass('water'));
$('mass-cancel').addEventListener('click',()=>dialog.close());
$('mass-form').addEventListener('submit',event=>{
  event.preventDefault();const n=massValue(dialogKind,input.value);
  if(n===null||!input.validity.valid){$('mass-error').textContent=`請輸入 ${LIMITS[dialogKind][0]}–${LIMITS[dialogKind][1]} 克，最多一位小數。`;input.focus();return;}
  clearActions();setMass(dialogKind,n);paint();announce(`已設定${dialogKind==='sugar'?'糖':'水'} ${format(n,1)} 克。`);dialog.close();
});
reset.addEventListener('click',()=>{clearActions();ignoreClick=true;state={...INITIAL};lastKey='';paint();announce('已重新配製：糖5克、水95克。');});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){ignoreClick=true;clearActions();paint();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){ignoreClick=true;clearActions();paint();}});
function load(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error(src));img.src=new URL(src,import.meta.url).href;});}
update();
Promise.all([load('./concentration-workbench-empty.webp'),load('./concentration-tools.webp'),load('./concentration-beaker.webp')]).then(([background,tools,beaker])=>{
  images.background=background;images.tools=tools;images.beaker=beaker;ready=true;lab.dataset.ready='true';[pitcher,reset,...massButtons,$('mix-sugar-input'),$('mix-water-input')].forEach(b=>b.disabled=false);paint();
}).catch(()=>{ready=false;[pitcher,reset,...massButtons,$('mix-sugar-input'),$('mix-water-input')].forEach(b=>b.disabled=true);lab.dataset.ready='error';status.classList.add('error');status.textContent='無法載入配製場景，請重新整理頁面。下方 ppm 仍可操作。';});
