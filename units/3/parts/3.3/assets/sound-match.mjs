import {loadTimbreClip,timbreBuffer} from './timbre-model.mjs?v=1';
import {MATCH_TONES,MATCH_LEVELS,createMatchDeck,MATCH_NAMES,matchClip,matchWavePath,compareMatch} from './sound-match-model.mjs?v=3';

export function createSoundMatch(root,{onChange}){
 const find=s=>root.querySelector(s);
 const mine=find('#quiz-choice'),targetPlot=find('[data-match-target]'),feedback=find('#quiz-feedback'),result=find('[data-match-result]');
 const deck=createMatchDeck();let question=deck.next(),answer,revision=0,heardTarget=false,heardChoice=false;
 const target=()=>question;
 const settings=key=>({...(key==='quiz-base'?target():answer)});
 async function prepare(key){
  const selected=settings(key),clip=await loadTimbreClip(selected.tone);
  return matchClip(clip,selected);
 }
 function conceal(){
  root.querySelector('.play-state').classList.add('visually-hidden');result.hidden=true;targetPlot.setAttribute('hidden','');find('[data-match-legend]').hidden=true;
  feedback.hidden=true;delete feedback.dataset.state;root.dataset.revealed='false';
 }
 async function renderWave(){
  const ticket=++revision;root.dataset.waveReady='false';mine.querySelector('.signal').setAttribute('d','');
  const load=find('[data-match-load]');load.hidden=false;load.textContent='正在準備波形…';
  try{
   const clip=await prepare('quiz-choice');if(ticket!==revision)return;
   mine.querySelector('.signal').setAttribute('d',matchWavePath(clip));
   mine.dataset.frequency=String(answer.frequency);mine.dataset.amplitude=String(answer.amplitude);mine.dataset.tone=answer.tone;
   mine.setAttribute('aria-label',`我的聲音波形：頻率${answer.frequency}Hz，相對增益${answer.amplitude.toFixed(2)}，波形${MATCH_TONES.indexOf(answer.tone)+1}，顯示10毫秒訊號`);
   root.dataset.waveReady='true';load.hidden=true;
  }catch{if(ticket!==revision)return;load.textContent='波形暫時無法載入，按「聽我的聲音」重試。';}
 }
 function update(){
  onChange();heardChoice=false;conceal();root.dataset.matchState='answering';
  for(const key of ['frequency','amplitude']){
   const levels=MATCH_LEVELS[key],position=levels.indexOf(answer[key]),output=find('#answer-'+key);
   output.textContent=key==='frequency'?`${answer[key]} Hz`:answer[key].toFixed(1);output.dataset.value=String(answer[key]);
   root.querySelector(`[data-match-step="${key}"][data-direction="-1"]`).disabled=position===0;
   root.querySelector(`[data-match-step="${key}"][data-direction="1"]`).disabled=position===levels.length-1;
  }
  find('[data-match-switch]').setAttribute('aria-label',`換一種波形，目前波形${MATCH_TONES.indexOf(answer.tone)+1}，共3種`);
  renderWave();
 }
 function startQuestion(){
  root.dataset.matchState='answering';
  onChange();heardTarget=false;heardChoice=false;answer={...target().start};
  const picture=document.querySelector(`#card-05 [data-timbre="${target().tone}"] .timbre-picture`);
  find('[data-match-picture]').replaceChildren(...[...picture.childNodes].map(n=>n.cloneNode(true)));
  find('[data-match-picture]').setAttribute('aria-label',`${MATCH_NAMES[target().tone]}，目標聲音的發聲器材`);
  find('[data-match-picture]').dataset.instrument=target().tone;
  update();
 }
 find('[data-match-new]').addEventListener('click',()=>{
  question=deck.next();startQuestion();root.scrollIntoView({block:'start'});
  find('[data-play="quiz-base"]').focus({preventScroll:true});
 });
 for(const button of root.querySelectorAll('[data-match-step]'))button.addEventListener('click',()=>{
  const key=button.dataset.matchStep,levels=MATCH_LEVELS[key],next=levels.indexOf(answer[key])+Number(button.dataset.direction);
  if(next<0||next>=levels.length)return;
  answer[key]=levels[next];update();
 });
 find('[data-match-switch]').addEventListener('click',()=>{answer.tone=MATCH_TONES[(MATCH_TONES.indexOf(answer.tone)+1)%MATCH_TONES.length];update();});
 find('form').addEventListener('submit',async event=>{
  event.preventDefault();onChange();
  if(!heardTarget||!heardChoice){
   feedback.hidden=false;feedback.dataset.state='incomplete';feedback.textContent=!heardTarget?'先按「聽目標聲音」，再試聽並調整自己的聲音。':'再按「聽我的聲音」確認目前的設定，然後完成比較。';return;
  }
  const ticket=revision,submitted={...answer};
  try{
   const clip=await prepare('quiz-base');if(ticket!==revision)return;
   const comparison=compareMatch(submitted,target());root.dataset.matchState='compared';
   targetPlot.setAttribute('d',matchWavePath(clip));targetPlot.removeAttribute('hidden');find('[data-match-legend]').hidden=false;root.dataset.revealed='true';
   feedback.hidden=false;feedback.dataset.state=comparison.correct?'correct':'incorrect';
   feedback.textContent=comparison.correct?'配對成功！你已經把音色、音高與音量調得很接近了。':'已顯示目標波形，聽聽看差在哪裡，再試著調整。';
   const hints=[
    ['音色',comparison.tone?'波形選對了':`試試其他波形，找出${MATCH_NAMES[target().tone]}的音色`,comparison.tone],
    ['音高',comparison.frequency?'音高接近了':`你的聲音較${answer.frequency<target().frequency?'低，增加頻率，讓波更密':'高，減少頻率，讓波更疏'}`,comparison.frequency],
    ['振幅／音量',comparison.amplitude?'振幅接近了':`振幅較${answer.amplitude<target().amplitude?'小，增加振幅再試聽':'大，減少振幅再試聽'}`,comparison.amplitude]
   ];
   find('[data-match-hints]').replaceChildren(...hints.map(([title,text,ok])=>{const p=document.createElement('p'),strong=document.createElement('strong');p.dataset.matched=String(ok);strong.textContent=`${ok?'✓':'↗'} ${title}`;p.append(strong,document.createTextNode(text));return p;}));
   result.hidden=false;
  }catch{if(ticket!==revision)return;feedback.hidden=false;feedback.dataset.state='error';feedback.textContent='目標波形暫時無法載入，請再按「完成比較」重試。';}
 });
 find('[data-match-retry]').addEventListener('click',()=>{onChange();conceal();root.dataset.matchState='answering';find('[data-match-step=frequency]:not(:disabled)').focus({preventScroll:true});});
 startQuestion();
 return {settings,prepare,buffer:(clip,context)=>timbreBuffer(clip,context),
  start(key){
   if(key==='quiz-base')heardTarget=true;else{heardChoice=true;if(root.dataset.waveReady!=='true')renderWave();}
   root.dataset.matchPlaying=key;
   root.querySelectorAll('[data-play]').forEach(button=>{const active=button.dataset.play===key;button.setAttribute('aria-pressed',String(active));button.querySelector('[data-match-play-label]').textContent=active?'停止播放':button.dataset.play==='quiz-base'?'聽目標聲音':'聽我的聲音';});
  },stop(){
   delete root.dataset.matchPlaying;
   root.querySelectorAll('[data-play]').forEach(button=>{button.setAttribute('aria-pressed','false');button.querySelector('[data-match-play-label]').textContent=button.dataset.play==='quiz-base'?'聽目標聲音':'聽我的聲音';});
  }
 };
}
