import {TASK_STEPS,INITIAL_ORDER,evaluateCollectionPlan,collectionFrame,firstPlanIssue} from './collection-task-model.mjs?v=transfer-1';
import {createCollectionScene} from './collection-task-scene.mjs?v=transfer-1';
const form=document.querySelector('#gas-report-form'),section=form.closest('section'),svg=form.querySelector('.task-scene');
const scene=createCollectionScene(svg),caption=form.querySelector('[data-task-caption]'),play=form.querySelector('[data-task-play]'),feedback=form.querySelector('#gas-report-feedback');
const tabs=[...form.querySelectorAll('[data-task-tab]')],panels=[...form.querySelectorAll('[data-task-panel]')],orderList=form.querySelector('.task-order'),announcement=form.querySelector('[data-task-announcement]');
let pane=0,state='ready',raf=0,index=-1,elapsed=0,started=0,plan=null,result=null,blocked=null;
const readPlan=()=>({materials:[...form.querySelectorAll('[name=materials]:checked')].map(n=>n.value),fill:form.elements.fill.value,position:form.elements.position.value,outlet:form.elements.outlet.value,order:[...orderList.children].map(n=>n.dataset.taskStep)});
const step=()=>TASK_STEPS.find(s=>s.id===plan?.order[index]);
function cancel(){cancelAnimationFrame(raf);raf=0;}
function hideFeedback(){feedback.hidden=true;feedback.replaceChildren();feedback.removeAttribute('data-result');}
function choosePane(i,focus=false){pane=i;tabs.forEach((tab,j)=>{tab.setAttribute('aria-selected',String(i===j));tab.tabIndex=i===j?0:-1;});panels.forEach((p,j)=>p.hidden=i!==j);if(focus)tabs[i].focus();}
function syncOrder(){[...orderList.children].forEach((li,i)=>{li.querySelector('.task-order-number').textContent=String(i+1).padStart(2,'0');li.querySelector('[data-move="-1"]').disabled=i===0;li.querySelector('[data-move="1"]').disabled=i===5;});}
function paint(){
 const current=plan||readPlan(),f=collectionFrame(current,index,elapsed);scene.render(f,current,elapsed);
 form.dataset.state=state;form.dataset.step=f.step;form.dataset.elapsed=elapsed.toFixed(2);form.dataset.order=current.order.join(',');
 const labels={prepare:'先把集氣瓶裝滿水，遮口倒置，瓶口移入水面下。',react:'大理石先加入，再加稀鹽酸，塞緊已接好導管的塞子。',purge:'導管出口先留在瓶外，排除裝置原有的空氣。',collect:'將出口由瓶口下方移入，氣體進入瓶中，水逐漸排出。',withdraw:'先讓出口退出瓶口，再移到水面上方，保持管路暢通。',cover:'在水下蓋好玻璃片，再連同集氣瓶一起取出。'};
 caption.textContent=index<0?'先選材料，再安排集氣裝置。':state==='revise'?blocked.message:state==='complete'?'你已用排水集氣法完成二氧化碳的收集與封存。':(state==='paused'?'已暫停：':'')+labels[f.step];
 play.textContent=state==='playing'?'暫停':state==='paused'?'繼續':state==='complete'?'重新播放我的流程':'播放並檢查';
 const p=readPlan();tabs[0].dataset.done=String(p.materials.length>0);tabs[1].dataset.done=String(!!(p.fill&&p.position&&p.outlet));
 [...orderList.children].forEach(li=>{li.classList.toggle('is-playing',li.dataset.taskStep===f.step&&index>=0);li.classList.toggle('is-error',state==='revise'&&li.dataset.taskStep===blocked?.step);});
}
function showFeedback(evaluation){
 feedback.replaceChildren();feedback.hidden=false;feedback.dataset.result=evaluation.correct?'correct':'revise';
 const strong=document.createElement('strong');strong.className=evaluation.correct?'task-correct':'task-error';strong.textContent=evaluation.correct?'這個安排能完成二氧化碳的排水集氣。':evaluation.missing.length?'還有安排未完成。':'這個安排需要再調整。';feedback.append(strong);
 const list=document.createElement('ul');for(const issue of [...evaluation.missing,...evaluation.issues]){const li=document.createElement('li');li.append(issue.message+' ');const a=document.createElement('a');a.href='#'+issue.target;a.textContent='回看示範';li.append(a);list.append(li);}if(list.children.length)feedback.append(list);
 if(evaluation.correct){const p=document.createElement('p');p.textContent='你把二氧化碳的製氣材料，配上前面學過的排水集氣法。部分氣體會溶於水，這不表示完全不能收集。';feedback.append(p);}
}
function pause(){if(state!=='playing')return;elapsed=Math.min(step().duration,performance.now()-started);cancel();state='paused';paint();}
function tick(now){
 if(state!=='playing')return;
 const duration=step().duration;elapsed=Math.min(duration,now-started);
 if(blocked?.step===step().id&&elapsed>=500){elapsed=0;state='revise';cancel();paint();showFeedback(result);return;}
 paint();if(elapsed>=duration){if(index===plan.order.length-1){state='complete';cancel();paint();showFeedback(result);return;}index++;elapsed=0;started=now;paint();}
 raf=requestAnimationFrame(tick);
}
function resume(){document.dispatchEvent(new CustomEvent('air-experiment-play',{detail:'collection-task'}));state='playing';started=performance.now()-elapsed;paint();raf=requestAnimationFrame(tick);}
function start(){
 const candidate=readPlan(),evaluation=evaluateCollectionPlan(candidate);hideFeedback();cancel();
 if(!evaluation.complete){state='ready';index=-1;plan=null;paint();showFeedback(evaluation);const field=evaluation.missing[0].field;choosePane(field==='materials'?0:field==='order'?2:1);(field==='materials'?form.querySelector('[name=materials]'):form.querySelector(`[name="${field}"]`))?.focus();return;}
 plan=structuredClone(candidate);result=evaluation;blocked=firstPlanIssue(plan);index=0;elapsed=0;choosePane(2);resume();svg.scrollIntoView({behavior:'instant',block:'center'});
}
form.addEventListener('submit',event=>{event.preventDefault();if(state==='playing')pause();else if(state==='paused')resume();else start();});
form.addEventListener('change',()=>{cancel();state='ready';index=-1;elapsed=0;plan=null;result=null;blocked=null;hideFeedback();paint();});
function reset(){cancel();state='ready';index=-1;elapsed=0;plan=null;result=null;blocked=null;INITIAL_ORDER.forEach(id=>orderList.append(form.querySelector(`[data-task-step="${id}"]`)));syncOrder();choosePane(0);hideFeedback();paint();}
form.addEventListener('reset',()=>queueMicrotask(reset));
tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>choosePane(i));tab.addEventListener('keydown',event=>{let j;if(event.key==='ArrowRight')j=(i+1)%3;if(event.key==='ArrowLeft')j=(i+2)%3;if(event.key==='Home')j=0;if(event.key==='End')j=2;if(j!==undefined){event.preventDefault();choosePane(j,true);}});});
form.querySelectorAll('[data-task-next]').forEach(b=>b.addEventListener('click',()=>choosePane(Number(b.dataset.taskNext),true)));
orderList.addEventListener('click',event=>{const button=event.target.closest('[data-move]');if(!button)return;const li=button.closest('li'),direction=Number(button.dataset.move),neighbor=direction<0?li.previousElementSibling:li.nextElementSibling;if(!neighbor)return;if(direction<0)orderList.insertBefore(li,neighbor);else orderList.insertBefore(neighbor,li);cancel();state='ready';index=-1;elapsed=0;plan=null;result=null;blocked=null;hideFeedback();syncOrder();paint();announcement.textContent=`${li.querySelector('.task-order-label').textContent}已移至第${[...orderList.children].indexOf(li)+1}步。`;if(button.disabled)li.querySelector(`[data-move="${-direction}"]`).focus();else button.focus();});
let gesture=null;
svg.addEventListener('pointerdown',event=>{if(event.isPrimary&&event.button===0)gesture={x:event.clientX,y:event.clientY,scroll:scrollY,cancelled:false};},{passive:true});
svg.addEventListener('pointermove',event=>{if(gesture&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>10)gesture.cancelled=true;},{passive:true});
svg.addEventListener('pointercancel',()=>gesture=null);
svg.addEventListener('click',()=>{const g=gesture;gesture=null;if(g&&(g.cancelled||Math.abs(scrollY-g.scroll)>2))return;if(state==='playing')pause();else if(state==='paused')resume();});
section.addEventListener('keydown',event=>{if(event.key==='Escape')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('pagehide',pause);
document.addEventListener('air-experiment-play',event=>{if(event.detail!=='collection-task')pause();});
new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pause();}).observe(svg);
syncOrder();choosePane(0);paint();play.disabled=false;form.dataset.ready='true';
