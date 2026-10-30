import { LIMITS, INITIAL, ACTION_MS, POUR_DELAY, POUR_RATE, massValue, concentrationState, format, sugarActionState } from './concentration-state.js?v=sugar-motion-1';
import { TOOL, renderMix } from './concentration-renderer.js?v=sugar-motion-1';
const $=id=>document.getElementById(id);
const lab=$('mix-lab'),canvas=$('mix-canvas'),ctx=canvas.getContext('2d');
const spoon=$('mix-spoon'),pitcher=$('mix-pitcher'),cup=$('mix-water-cup'),reset=$('mix-reset'),status=$('mix-status');
let state={...INITIAL},ready=false,animation=null,queue=[],raf=null,gesture=null,ignoreClick=false,dialogKind=null,lastKey='';
const massButtons=[...document.querySelectorAll('[data-mass-kind]')];
const images={},reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function announce(s){status.textContent=s;}
function values(){return concentrationState(state.sugar,state.water,state.ppm);}
function update(){
  for(const button of massButtons){const kind=button.dataset.massKind,delta=Number(button.dataset.massDelta);button.disabled=!ready||(delta>0?state[kind]>=LIMITS[kind][1]:state[kind]<=LIMITS[kind][0]);}
  const v=values(),key=[state.sugar,state.water,state.ppm].join('/');
  if(key!==lastKey){
    const fields={
      'sugar-read':`${v.sugar.toFixed(1)} g`,'water-read':`${v.water.toFixed(1)} g`,
      sugar:`糖 ${format(v.sugar,1)} 克`,water:`水 ${format(v.water,1)} 克`,total:`${v.sugar?'糖水':'水'} ${format(v.total,1)} 克`,
      'formula-sugar':`${format(v.sugar,1)} 克`,'formula-total':`${format(v.total,1)} 克`,percent:`${format(v.percent)}%`,
      'sugar-share':`糖占 ${format(v.percent)}%`,'water-share':`水占 ${format(100-v.percent)}%`,
      meaning:`每 100 克這樣的${v.sugar?'糖水':'水'}，含有 ${format(v.percent)} 克糖。比例條表示質量組成。`,
    };
    for(const node of document.querySelectorAll('[data-mix]'))node.textContent=fields[node.dataset.mix];
    $('mix-bar-fill').style.width=`${v.percent}%`;$('mix-bar').setAttribute('aria-label',`糖占質量${format(v.percent)}%，水占${format(100-v.percent)}%`);
    lab.dataset.sugar=String(v.sugar);lab.dataset.water=String(v.water);lab.dataset.total=String(v.total);lab.dataset.percent=String(v.percent);
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
  for(const [kind,button] of [['sugar',spoon],['water',pitcher],['beaker',cup]]){
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
  animation={...action,start:now,startMass,target,duration:reduceMotion?(action.kind==='sugar'?1800:80):ACTION_MS[action.kind]};
}
function frame(now){
  raf=null;
  if(gesture?.kind==='water'&&!gesture.moved&&!gesture.capped&&now-gesture.start>=220){
    if(!animation?.hold)animation={kind:'water',delta:1,hold:true,start:gesture.start,startMass:state.water,duration:ACTION_MS.water};
    const amount=clamp(animation.startMass+Math.max(0,now-animation.start-POUR_DELAY)/1000*POUR_RATE,...LIMITS.water);
    setMass('water',amount);gesture.held=true;
    if(amount>=LIMITS.water[1]){gesture.capped=true;animation=null;announce('已量得水150克，停止倒水。');}
  }
  if(animation&&!animation.hold){
    const p=clamp((now-animation.start)/animation.duration,0,1);
    const flow=animation.kind==='water'?clamp((p-.25)/.55,0,1):sugarActionState(p,animation.delta).transfer;
    setMass(animation.kind,animation.startMass+(animation.target-animation.startMass)*flow);
    if(p>=1){const kind=animation.kind;setMass(kind,animation.target);animation=null;announce(`${kind==='sugar'?'糖':'水'}已量得 ${format(state[kind],1)} 克，濃度 ${format(values().percent)}%。`);}
  }
  startNext(now);paint(now);
  if(animation||queue.length||gesture?.kind==='water'&&!gesture.moved&&!gesture.capped)schedule();
}
function act(kind,delta){
  if(!ready)return;
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
      if(kind==='sugar'&&p.x>330&&p.x<740&&p.y>450&&p.y<660)act('sugar',1);
      else if(kind==='sugar'&&p.x<300&&p.y>450&&p.y<760)act('sugar',-1);
      else if(kind==='water'&&p.x>830&&p.x<1130&&p.y>270&&p.y<590)act('water',1);
    }else if(g.held){ignoreClick=true;animation=null;if(state.water===g.startWater)act('water',1);else announce(`水已量得 ${format(state.water,1)} 克，濃度 ${format(values().percent)}%。`);}
    paint();
  });
  const cancel=()=>{if(gesture?.kind===kind){gesture=null;animation=null;ignoreClick=true;paint();}};
  button.addEventListener('pointercancel',cancel);button.addEventListener('lostpointercapture',cancel);
  button.addEventListener('click',event=>{if(ignoreClick&&event.detail>0){ignoreClick=false;return;}ignoreClick=false;act(kind,1);});
  button.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();act(kind,event.key==='ArrowUp'?1:-1);}});
}
massButtons.forEach(button=>button.addEventListener('click',()=>act(button.dataset.massKind,Number(button.dataset.massDelta))));
wireTool(spoon,'sugar');wireTool(pitcher,'water');
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
  images.background=background;images.tools=tools;images.beaker=beaker;ready=true;lab.dataset.ready='true';[spoon,pitcher,reset,...massButtons,$('mix-sugar-input'),$('mix-water-input')].forEach(b=>b.disabled=false);paint();
}).catch(()=>{ready=false;[spoon,pitcher,reset,...massButtons,$('mix-sugar-input'),$('mix-water-input')].forEach(b=>b.disabled=true);lab.dataset.ready='error';status.classList.add('error');status.textContent='無法載入配製場景，請重新整理頁面。下方 ppm 仍可操作。';});
