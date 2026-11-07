import {heating,ballDiameter,ballPasses,PHASES,waterVolume,waterDensity,gasVolume,thermometer,REACTIONS,QUIZ,grade} from './thermal-model.mjs';
import {solidScene,bottleScene,gasScene,waterException,chemicalScene} from './thermal-art.mjs';
import {HEATING_STEPS,heatingStep,observedHeatChart,observedHeatScene,heatObservation} from './heating-observation.mjs?v=readability-20261107';
import {COMPARISON,phaseComparison,comparisonScene,extensionScene} from './phase-comparison.mjs?v=finite-baths-20261107';
const $=id=>document.getElementById(id),write=(id,s)=>$(id).textContent=s;
const pressed=(selector,value,key)=>document.querySelectorAll(selector).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[key]===String(value))));
// Each animated experiment owns its state. Interruptions preserve data but never auto-resume.
const animations=new Map();
function stop(id){const a=animations.get(id);if(a){cancelAnimationFrame(a.frame);animations.delete(id);a.end(false);}}
function run(id,duration,step,end){
 stop(id);const start=performance.now();const a={frame:0,end};animations.set(id,a);
 const frame=now=>{if(!animations.has(id))return;const p=Math.min(1,(now-start)/duration);step(p);if(p<1)a.frame=requestAnimationFrame(frame);else{animations.delete(id);end(true);}};a.frame=requestAnimationFrame(frame);
}
let energy=0,heatApparatus=null;
function renderHeat(){
 const state=heating(energy),playing=animations.has('heat-lab'),step=heatingStep(energy),complete=energy>=HEATING_STEPS[2].end;
 const observation=heatObservation(energy,playing);
 $('heat-fallback').innerHTML=observedHeatScene(energy,playing);
 $('heat-reference').hidden=energy<HEATING_STEPS[1].end;
 if(heatApparatus)heatApparatus.update(state,playing,energy);
 $('heat-chart').innerHTML=observedHeatChart(energy);
 write('heat-temp',state.temperature.toFixed(1)+'°C');
 $('heat-scene').setAttribute('aria-label',`冰水加熱器材；樣品溫度${state.temperature.toFixed(1)}攝氏度；${observation.caption}`);
 Object.assign($('heat-lab').dataset,{phase:energy===0?'準備觀察':state.phase,energy:String(energy),playing:String(playing),complete:String(complete)});
 for(let i=0;i<3;i++){
  const el=$('heat-step-'+i),done=energy>=HEATING_STEPS[i].end;
  el.dataset.done=String(done);if(i===step&&!complete)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
  const start=i?HEATING_STEPS[i-1].end:0;
  el.querySelector('small').textContent=done?'已完成':i===step?(playing?'觀察中':energy===start?(i?'待開始':'待觀察'):'已暫停'):'尚未觀察';
  el.querySelector('.heat-step-number').textContent=done?'✓':String(i+1);
 }
 write('heat-caption',observation.caption);
 if($('heat-note').textContent!==observation.note)write('heat-note',observation.note);
 $('heat-discovery').hidden=!observation.discovery;write('heat-discovery-text',observation.discovery);
 $('heat-play').querySelector('[aria-hidden]').textContent=playing?'Ⅱ':'▶';
 write('heat-play-label',playing?'暫停加熱':complete?'觀察完成':energy>0?'繼續加熱':'開始加熱');$('heat-play').disabled=complete;
}
$('heat-play').onclick=()=>{
 if(animations.has('heat-lab')){stop('heat-lab');return;}
 const initial=energy,index=heatingStep(energy),target=HEATING_STEPS[index],start=index?HEATING_STEPS[index-1].end:0;
 if(initial>=HEATING_STEPS[2].end)return;
 run('heat-lab',target.duration*(target.end-initial)/(target.end-start),p=>{energy=p===1?target.end:initial+(target.end-initial)*p;renderHeat();},renderHeat);renderHeat();
};
$('heat-reset').onclick=()=>{stop('heat-lab');energy=0;renderHeat();};
// The apparatus is optional: an unavailable WebGL context cannot block the
// curve, controls or any other section of this lesson.
import('./heating-apparatus.mjs?v=readability-20261107').then(({createHeatingApparatus})=>{try{heatApparatus=createHeatingApparatus($('heat-scene'));renderHeat();}catch{ $('heat-scene').classList.remove('has-3d'); }}).catch(()=>{});
let comparisonProgress=0,comparisonRevealed=false;
const comparisonApparatus={};
function renderComparison(){
 const states=phaseComparison(comparisonProgress),playing=animations.has('comparison-lab');
 Object.assign($('comparison-lab').dataset,{progress:String(comparisonProgress),playing:String(playing),revealed:String(comparisonRevealed)});
 for(const key of ['warm','cold']){
  const state=states[key];$('comparison-'+key+'-fallback').innerHTML=comparisonScene(key,state,comparisonRevealed);
  if(comparisonApparatus[key])comparisonApparatus[key].update(state);
  write('comparison-'+key+'-bath',state.bathTemperature.toFixed(1)+'°C');
  $('comparison-'+key+'-ice').style.width=state.ice+'%';
  $('comparison-'+key+'-ice').parentElement.setAttribute('role','img');$('comparison-'+key+'-ice').parentElement.setAttribute('aria-label',`起初冰量50g，目前約${state.ice.toFixed(1)}g；長條同尺度示意`);
  write('comparison-'+key+'-caption',comparisonProgress===0?'冰、水共存，準備觀察':key==='warm'?'冰量減少，暖水降溫':'冰量增加，鹽水升溫');
  $('comparison-'+key+'-scene').setAttribute('aria-label',`杯內冰水約0攝氏度，${key==='warm'?'暖水浴':'預冷鹽水'}目前${state.bathTemperature.toFixed(1)}攝氏度`);
  $('comparison-'+key+'-arrow').hidden=!comparisonRevealed;$('comparison-'+key+'-direction').hidden=!comparisonRevealed;
 }
 $('comparison-explanation').hidden=!comparisonRevealed;$('comparison-reveal').setAttribute('aria-expanded',String(comparisonRevealed));$('comparison-reveal').disabled=playing||comparisonProgress===0;
 write('comparison-reveal',comparisonRevealed?'收起熱傳方向':'顯示熱傳方向');
 $('comparison-play').querySelector('[aria-hidden]').textContent=playing?'Ⅱ':'▶';
 write('comparison-play-label',playing?'暫停比較':comparisonProgress>=1?'再次比較':comparisonProgress>0?'繼續比較':'開始比較');
 const note=playing?'比較冰量與兩處溫度，也可以隨時暫停觀察。':comparisonProgress===0?'先觀察冰量與杯內外溫度；暫停或看完比較後，可顯示熱傳方向。':comparisonProgress>=1?'比較已完成。可按「顯示熱傳方向」，對照觀察結果與解釋。':'比較已暫停。可顯示熱傳方向，或繼續觀察。';
 if($('comparison-note').textContent!==note)write('comparison-note',note);
}
$('comparison-play').onclick=()=>{
 if(animations.has('comparison-lab')){stop('comparison-lab');return;}
 if(comparisonProgress>=1)comparisonProgress=0;
 comparisonRevealed=false;const initial=comparisonProgress;
 run('comparison-lab',COMPARISON.duration*(1-initial),p=>{comparisonProgress=initial+(1-initial)*p;renderComparison();},renderComparison);renderComparison();
};
$('comparison-reset').onclick=()=>{stop('comparison-lab');comparisonProgress=0;comparisonRevealed=false;renderComparison();};
$('comparison-reveal').onclick=()=>{if(comparisonProgress===0||animations.has('comparison-lab'))return;comparisonRevealed=!comparisonRevealed;renderComparison();};
import('./phase-apparatus.mjs?v=finite-baths-20261107').then(({createPhaseApparatus})=>{for(const key of ['warm','cold'])try{comparisonApparatus[key]=createPhaseApparatus($('comparison-'+key+'-scene'),key);}catch{ $('comparison-'+key+'-scene').classList.remove('has-phase-3d'); }renderComparison();}).catch(()=>{});
let mode='evaporate',phaseProgress=0;
function renderPhase(){const s=PHASES[mode];$('phase-scene').innerHTML=extensionScene(mode,phaseProgress);write('phase-sample',s.sample);write('phase-condition',s.environment);write('phase-before',s.before);write('phase-after',s.after);write('phase-temp',s.temperature);pressed('[data-phase]',mode,'phase');write('phase-play',animations.has('phase-lab')?'停止觀察':phaseProgress>=1?'再次觀察':phaseProgress>0?'繼續觀察':'開始觀察');write('phase-note',phaseProgress>0?s.explanation:'準備觀察'+s.name+'；先認清研究對象，再看能量方向。');$('phase-lab').dataset.mode=mode;}
for(const b of document.querySelectorAll('[data-phase]'))b.onclick=()=>{stop('phase-lab');mode=b.dataset.phase;phaseProgress=0;renderPhase();};
$('phase-play').onclick=()=>{if(animations.has('phase-lab')){stop('phase-lab');return;}if(phaseProgress>=1)phaseProgress=0;const initial=phaseProgress;run('phase-lab',5000*(1-initial),p=>{phaseProgress=initial+(1-initial)*p;renderPhase();},renderPhase);renderPhase();};
$('phase-reset').onclick=()=>{stop('phase-lab');phaseProgress=0;renderPhase();};
let ballTemp=20,attempt=null,ballBath=null;
function renderSolid(){const running=animations.has('solid-lab');$('solid-scene').innerHTML=solidScene(ballTemp,attempt,'solid',ballBath);write('solid-temp',Math.round(ballTemp)+'°C');write('solid-diameter',ballDiameter(ballTemp).toFixed(3)+' mm');$('solid-test').disabled=running;$('solid-lab').dataset.passes=String(ballPasses(ballTemp));}
function setBallTemp(target){stop('solid-lab');attempt=null;ballBath=target;const initial=ballTemp;run('solid-lab',2400,p=>{ballTemp=initial+(target-initial)*p;renderSolid();},done=>{renderSolid();write('solid-note',done?'調溫完成。取出銅球，試試看能否通過室溫環。':'調溫已暫停，返回後可重新選擇水浴。');});write('solid-note','銅球正在調溫，環仍保持20°C。調溫過程為加速示意。');renderSolid();}
$('solid-heat').onclick=()=>setBallTemp(80);$('solid-cool').onclick=()=>setBallTemp(20);$('solid-test').onclick=()=>{attempt=true;ballBath=null;renderSolid();write('solid-note',ballPasses(ballTemp)?'銅球比孔洞小，能通過；比較相同球在不同溫度下的結果。':'銅球略大於孔洞，停在環上。放回20°C水浴冷卻後再試。');};
$('solid-reset').onclick=()=>{stop('solid-lab');ballTemp=20;attempt=null;ballBath=null;renderSolid();write('solid-note','恢復20°C銅球。先試通過，再比較加熱與冷卻。');};
let expandMode='liquid',expandTemp=20,expandIce=false,thermoTemp=20,thermoDetail=false,thermoVisited=false;
const expansionTemps=()=>expandMode==='exception'?[0,4,20,'ice']:[20,60];
function renderExpandControls(){const values=expansionTemps();$('expand-controls').innerHTML=values.map(t=>`<button type="button" data-temperature="${t}" aria-pressed="${t==='ice'?expandIce:!expandIce&&expandTemp===t}">${t==='ice'?'同質量的冰':t+'°C'}</button>`).join('');for(const b of $('expand-controls').querySelectorAll('button'))b.onclick=()=>{expandIce=b.dataset.temperature==='ice';if(!expandIce)expandTemp=Number(b.dataset.temperature);renderExpand();};}
function renderExpand(){const liquid=expandMode==='liquid',gas=expandMode==='gas';pressed('[data-expand]',expandMode,'expand');$('expand-lab').dataset.mode=expandMode;
 $('expand-scene').innerHTML=liquid?bottleScene(expandTemp,false,'expand'):gas?gasScene(expandTemp):waterException(expandTemp,expandIce);
 write('expand-kind',liquid?'固定水量':gas?'固定空氣量':'水的特殊性質');write('expand-condition',liquid?'100 g 水・不蒸發・開口細管瓶':gas?'氣密可動活塞・近似固定外壓':'固定100 g・液態與結冰分開比較');
 write('expand-temp',expandIce?'0°C（冰）':expandTemp+'°C');const v=gas?gasVolume(expandTemp):expandIce?109:waterVolume(expandTemp);write('expand-volume',v.toFixed(2)+' mL');write('expand-state',gas?'空氣':expandIce?'冰':'液態水');
 write('expand-hint',liquid?'比較20°C與60°C的細管液面；圖中液面高度差放大。':gas?'比較同一份空氣的體積，活塞可以移動，沒有加入或移出空氣。':'比較液態水0°C、4°C、20°C，再另外看同質量的冰；液面差為放大示意。');
 write('expand-note',liquid?(expandTemp===20?'固定水量，在20°C開始比較。':'水在20～60°C受熱膨脹，液面升高；玻璃也會膨脹，下一區再分解。'):gas?(expandTemp===20?'20°C的固定量空氣，體積參考值100 mL。':'空氣從20°C升至60°C，在近似定壓下膨脹，粒子數沒有增加。'):expandIce?'水結冰後體積增加；這是狀態變化，和液態水0～4°C的反常脹縮不同。':`液態水在${expandTemp}°C，密度約${(waterDensity(expandTemp)/1000).toFixed(5)} g/mL。約4°C時密度最大。`);
 if(liquid&&!thermoVisited){thermoTemp=expandTemp;renderThermo();}renderExpandControls();
}
for(const b of document.querySelectorAll('[data-expand]'))b.onclick=()=>{expandMode=b.dataset.expand;expandTemp=expandMode==='exception'?0:20;expandIce=false;renderExpand();};
function renderThermo(){const s=thermometer(thermoTemp);$('thermo-scene').innerHTML=bottleScene(thermoTemp,thermoDetail,'thermo');pressed('[data-thermo]',thermoTemp,'thermo');for(const key of ['water','glass','extra']){write('thermo-'+key,s[key].toFixed(2)+' mL');$('bar-'+key).style.width=Math.max(0,s[key]/1.6*100)+'%';}write('thermo-detail',thermoDetail?'收起剖面':'展開剖面');$('thermo-detail').setAttribute('aria-expanded',String(thermoDetail));write('thermo-note',thermoTemp===20?'在20°C基準狀態，三種增量都為零。':`水增加約${s.water.toFixed(2)} mL，容器容量增加約${s.glass.toFixed(2)} mL；餘量約${s.extra.toFixed(2)} mL進入細管。`);}
for(const b of document.querySelectorAll('[data-thermo]'))b.onclick=()=>{thermoVisited=true;thermoTemp=Number(b.dataset.thermo);renderThermo();};$('thermo-detail').onclick=()=>{thermoVisited=true;thermoDetail=!thermoDetail;renderThermo();};
let chemMode='dehydrate',chemProgress=0;
function renderChem(){const s=REACTIONS[chemMode];$('chem-scene').innerHTML=chemicalScene(chemMode,chemProgress);write('chem-before',s.before);write('chem-after',s.after);write('chem-evidence',s.evidence);write('chem-note',chemProgress>0?s.result:'準備觀察'+s.title+'；這是已確認物質身分的反應示意。');pressed('[data-chem]',chemMode,'chem');write('chem-play',animations.has('chem-lab')?'停止觀察':chemProgress>=1?'再次觀察':chemProgress>0?'繼續觀察':'開始觀察');$('chem-lab').dataset.mode=chemMode;}
for(const b of document.querySelectorAll('[data-chem]'))b.onclick=()=>{stop('chem-lab');chemMode=b.dataset.chem;chemProgress=0;renderChem();};
$('chem-play').onclick=()=>{if(animations.has('chem-lab')){stop('chem-lab');return;}if(chemProgress>=1)chemProgress=0;const initial=chemProgress;run('chem-lab',5000*(1-initial),p=>{chemProgress=initial+(1-initial)*p;renderChem();},renderChem);renderChem();};
$('chem-reset').onclick=()=>{stop('chem-lab');chemProgress=0;renderChem();};
// One end-of-lesson assessment; answers persist between observation points.
let quizIndex=0,answers=Array(QUIZ.length).fill(null);
function clearQuizResult(){$('quiz-feedback').hidden=true;$('quiz-result').hidden=true;}
function renderQuiz(){const q=QUIZ[quizIndex];write('quiz-progress',`觀察點 ${quizIndex+1}／${QUIZ.length}・已記錄 ${answers.filter(a=>a!==null).length} 個解釋`);$('quiz-evidence').innerHTML=`<h3 tabindex="-1" id="quiz-observation-title">${q.title}</h3><p>${q.evidence}</p>`;$('quiz-options').innerHTML='<legend>哪個解釋符合觀察？</legend>'+q.options.map((o,i)=>`<label class="quiz-option"><input type="radio" name="quiz-answer" value="${i}" ${answers[quizIndex]===i?'checked':''}><span>${o}</span></label>`).join('');$('quiz-prev').disabled=quizIndex===0;write('quiz-next',quizIndex===QUIZ.length-1?'核對觀察':'下一個觀察點');$('quiz-options').onchange=e=>{answers[quizIndex]=Number(e.target.value);clearQuizResult();write('quiz-progress',`觀察點 ${quizIndex+1}／${QUIZ.length}・已記錄 ${answers.filter(a=>a!==null).length} 個解釋`);};}
$('quiz-prev').onclick=()=>{if(quizIndex>0)quizIndex--;clearQuizResult();renderQuiz();$('quiz-observation-title').focus({preventScroll:true});};
$('quiz-next').onclick=()=>{clearQuizResult();if(answers[quizIndex]===null){write('quiz-feedback','請先依觀察證據選一個解釋，再往下。');$('quiz-feedback').hidden=false;document.querySelector('#quiz-options input').focus();return;}if(quizIndex<QUIZ.length-1){quizIndex++;renderQuiz();$('quiz-observation-title').focus({preventScroll:true});return;}
 const results=grade(answers);const missing=results.findIndex(r=>!r.complete);if(missing>=0){quizIndex=missing;renderQuiz();write('quiz-feedback','這個觀察點尚未完成，請補上解釋。');$('quiz-feedback').hidden=false;return;}
 const correct=results.filter(r=>r.correct).length;write('quiz-result-note',correct===QUIZ.length?'你已能用不同觀察證據解釋這些變化。也回頭想想，每次研究的是哪個對象。':'有些解釋需要再比較。請對照下方理由，再回到相關學習區重新觀察。');$('quiz-review').innerHTML=QUIZ.map((q,i)=>`<li><strong>${q.title}：${results[i].correct?'解釋符合證據':'再想一想'}</strong><p>你選擇：${q.options[answers[i]]}</p><p>${q.reason}</p></li>`).join('');$('quiz-result').hidden=false;$('quiz-result-title').focus();};
$('quiz-reset').onclick=()=>{quizIndex=0;answers.fill(null);clearQuizResult();renderQuiz();};
// Navigation has a single source of heading text; background experiments pause.
for(const link of document.querySelectorAll('.route a')){const sec=document.querySelector(link.hash),h=sec.querySelector('h2');const sync=()=>{link.querySelector('span').textContent=link.classList.contains('quiz-nav')?'單元小測':h.textContent.trim();if(link.classList.contains('quiz-nav'))link.setAttribute('aria-label','單元小測：'+h.textContent.trim());};sync();new MutationObserver(sync).observe(h,{subtree:true,characterData:true,childList:true});}
const navLinks=[...document.querySelectorAll('.route a')];
const visibility=new IntersectionObserver(entries=>{for(const e of entries)if(!e.isIntersecting){for(const id of animations.keys())if(e.target.contains($(id)))stop(id);}}, {threshold:0});for(const sec of document.querySelectorAll('.lesson-card'))visibility.observe(sec);
let scrollFrame=0;const updateRoute=()=>{let current=navLinks[0];for(const a of navLinks)if(document.querySelector(a.hash).getBoundingClientRect().top<innerHeight*.45)current=a;for(const a of navLinks){if(a===current)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');}scrollFrame=0;};addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateRoute);},{passive:true});
const stopAll=()=>{for(const id of [...animations.keys()])stop(id);};document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAll();});addEventListener('pagehide',stopAll);
for(const el of document.querySelectorAll('[data-control]'))el.disabled=false;
renderHeat();renderComparison();renderPhase();renderSolid();renderExpand();renderThermo();renderChem();renderQuiz();updateRoute();$('loading-note').hidden=true;
