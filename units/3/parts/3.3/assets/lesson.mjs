import {signal,soundSamples,challenge,checkSettings} from './model.mjs?v=1';
import {forkSamples,FORK_FREQUENCY,STRIKE_DELAY} from './fork-model.mjs?v=1';
import {createForkExperiment} from './fork-experiment.mjs?v=2';
import {createPitchExperiment,PITCH_SECONDS} from './pitch-experiment.mjs?v=5';
import {createGuitarExperiment} from './guitar-experiment.mjs?v=2';
import {guitarSamples} from './guitar-model.mjs?v=1';
import {createPanExperiment} from './pan-experiment.mjs?v=2';
import {loadPanRecording,recordingLevel} from './pan-recordings.mjs?v=1';
import {createTimbreExperiment} from './timbre-experiment.mjs?v=3';
import {timbreBuffer} from './timbre-model.mjs?v=1';
import {createHearingExperiment} from './hearing-experiment.mjs?v=2';
import {createHearingVoice} from './hearing-audio.mjs?v=1';
import {stopOnLeave} from '../../3.2/assets/lesson-playback.mjs?v=2';
const $=id=>document.getElementById(id), ns='http://www.w3.org/2000/svg';
const state={frequency:400,index:0};
let forkView,pitchView,guitarView,panView,timbreView,hearingView,hearingVoice=null;
const FORK_OUTPUT_GAIN=6;
const PITCH_OUTPUT_GAIN=14;
const names={pure:'純音',string:'弦音示意',pipe:'管音示意'};
let target=challenge(), audioContext, source=null, activeRoot=null, animation=0, request=0;
function svg(tag,attributes,parent){const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attributes))n.setAttribute(k,v);parent.append(n);return n;}
function wave(id,frequency,amplitude,tone='pure',compact=false){
 const root=$(id);root.replaceChildren();
 for(const x of [50,300,550])svg('path',{d:`M${x} 25V145`,class:'grid'},root);
 svg('path',{d:'M50 25V145H550M50 85H550',class:'axis'},root);
 const points=Array.from({length:501},(_,i)=>`${i?'L':'M'}${50+i} ${(85-58*amplitude*signal(i/500*(compact?4/frequency:.01),frequency,tone)).toFixed(3)}`).join(' ');
 svg('path',{d:points,class:'signal'},root);
 root.dataset.frequency=frequency;root.dataset.amplitude=amplitude;root.dataset.tone=tone;
 root.setAttribute('aria-label',`相同時間內（${(compact?4000/frequency:10).toFixed(2)}毫秒）的聲音訊號，頻率${frequency.toFixed(1)}Hz，相對振幅${amplitude.toFixed(2)}，${names[tone]}`);
}
function stop(root=activeRoot){
 if(root && activeRoot && root!==activeRoot)return;
 request++;
 if(hearingVoice){source.onended=null;hearingVoice.stop();hearingVoice=null;source=null;}
 else if(source){source.onended=null;try{source.stop();}catch{}source.disconnect();source=null;}
 cancelAnimationFrame(animation);animation=0;
 if(activeRoot){activeRoot.dataset.playing='false';activeRoot.querySelectorAll('.stop').forEach(b=>b.disabled=true);activeRoot.querySelector('.play-state').textContent='已停止，點擊可重新播放';}
 activeRoot=null;forkView?.stop();pitchView?.stop();guitarView?.stop();panView?.stop();timbreView?.stop();hearingView?.stop();
}
function config(key){
 if(key.startsWith('pan-'))return panView.settings(Number(key.slice(4)));
 if(key==='string-reference'||key==='string-live')return guitarView.settings(key);
 const answer=answers();
 const map={
  'amplitude-reference':{frequency:FORK_FREQUENCY,amplitude:.3},'amplitude-live':{frequency:FORK_FREQUENCY,amplitude:.7},
  'pitch-reference':{frequency:200,amplitude:.5},'pitch-live':{frequency:state.frequency,amplitude:.5},
  'quiz-base':{frequency:target.base,amplitude:target.amplitude},'quiz-choice':{frequency:Number(answer.frequency),amplitude:Number(answer.amplitude),tone:answer.tone}
 };
 if(key.startsWith('tone-'))return{frequency:440,amplitude:.5,tone:key.slice(5)};
 return map[key];
}
async function play(button){
 stop();const ticket=++request,root=button.closest('.lesson-card,.quiz'),settings=config(button.dataset.play);
 activeRoot=root;if(['card-02','card-03','card-04','card-05'].includes(root.id))root.querySelector('.play-state').classList.add('visually-hidden');root.querySelector('.play-state').textContent='正在準備聲音…';
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('unsupported');
  audioContext??=new Audio();await audioContext.resume();
  if(ticket!==request||document.hidden)return;
  const forkKey=button.dataset.forkStrike,pitchKey=button.dataset.play.startsWith('pitch-')?button.dataset.play:null,guitarKey=button.dataset.play.startsWith('string-')?button.dataset.play:null,panKey=button.dataset.play.startsWith('pan-'),timbreKey=button.dataset.play.startsWith('tone-')?button.dataset.play.slice(5):null;
  let buffer;
  if(timbreKey){
   const clip=await timbreView.prepare(timbreKey);
   if(ticket!==request||document.hidden)return;
   buffer=timbreBuffer(clip,audioContext);
  }else if(panKey){
   buffer=await loadPanRecording(Number(button.dataset.play.slice(4)),audioContext);
   if(ticket!==request||document.hidden)return;
  }else{
   const data=forkKey?forkSamples(settings.amplitude,audioContext.sampleRate):guitarKey?guitarSamples(settings.frequency,audioContext.sampleRate):soundSamples(settings,audioContext.sampleRate,pitchKey?PITCH_SECONDS:1.6);
   const outputGain=forkKey?FORK_OUTPUT_GAIN:pitchKey?PITCH_OUTPUT_GAIN:1;
   if(outputGain!==1)for(let i=0;i<data.length;i++)data[i]*=outputGain;
   buffer=audioContext.createBuffer(1,data.length,audioContext.sampleRate);buffer.copyToChannel(data,0);
  }
  source=audioContext.createBufferSource();source.buffer=buffer;source.connect(audioContext.destination);
  root.dataset.playing='true';root.dataset.frequency=String(settings.frequency);root.dataset.amplitude=String(settings.amplitude);root.dataset.tone=settings.tone||'pure';
  root.querySelectorAll('.stop').forEach(b=>b.disabled=false);root.querySelector('.play-state').textContent=forkKey?`${forkKey==='soft'?'輕敲':'較重敲'}，觀察振幅與聲音`:`播放中・${settings.frequency.toFixed(1)} Hz`;
  const start=performance.now(),currentSource=source,forkStart=audioContext.currentTime+(forkKey?STRIKE_DELAY:0);
  if(forkKey)forkView.start(forkKey);
  if(pitchKey){pitchView.start(pitchKey);root.querySelector('.play-state').textContent=`正在播放${pitchKey==='pitch-reference'?'左':'右'}邊：${settings.frequency} Hz`;}
  if(guitarKey)guitarView.start(guitarKey);
  if(panKey)panView.start();
  if(timbreKey){timbreView.start(timbreKey,buffer.duration);root.querySelector('.play-state').textContent=`正在播放${{pure:'音叉近似純音',string:'吉他',pipe:'排笛'}[timbreKey]}`;}
  source.onended=()=>{if(source===currentSource){if(forkKey)forkView.finish();if(pitchKey)pitchView.finish();stop(root);root.querySelector('.play-state').textContent='播放完畢，可再次比較';}};
  source.start(forkStart);
  function animate(now){
   if(source!==currentSource)return;
   if(forkKey)forkView.update(audioContext.currentTime-forkStart);
   if(pitchKey)pitchView.update(audioContext.currentTime-forkStart);
   if(guitarKey)guitarView.update(audioContext.currentTime-forkStart);
   if(timbreKey)timbreView.update(audioContext.currentTime-forkStart);
   if(panKey){const elapsed=audioContext.currentTime-forkStart;panView.update(elapsed,recordingLevel(buffer,elapsed));}
   animation=requestAnimationFrame(animate);
  }
  animation=requestAnimationFrame(animate);
 }catch{
  if(ticket!==request)return;stop(root);if(['card-02','card-03','card-04','card-05'].includes(root.id))root.querySelector('.play-state').classList.remove('visually-hidden');root.querySelector('.play-state').textContent='聲音暫時無法播放，請再點一次；仍可觀察圖形與數值。';
 }
}

function answers(){return{frequency:$('answer-frequency').value,amplitude:$('answer-amplitude').value,tone:$('answer-tone').value};}
function renderChoice(){
 const a=answers(),complete=checkSettings(a,target)!=='incomplete';
 wave('quiz-choice',Number(a.frequency)||target.base,Number(a.amplitude)||target.amplitude,a.tone||'pure');
 document.querySelector('[data-play="quiz-choice"]').disabled=!complete;
 $('quiz-choice-description').textContent=complete?`${a.frequency} Hz・相對振幅 ${Number(a.amplitude).toFixed(2)}・${names[a.tone]}`:'請完成下方設定。';
 $('quiz-feedback').hidden=true;$('quiz-feedback').textContent='';delete $('quiz-feedback').dataset.state;
}
function newChallenge(){
 stop();target=challenge(state.index);
 $('quiz-task').textContent=`原音是${target.base} Hz的純音，相對振幅0.35。請把頻率調成${target.target} Hz（${target.target>target.base?'比原音高':'比原音低'}），維持相同振幅，並改成${names[target.tone]}。`;
 $('quiz-original').textContent=`${target.base} Hz・相對振幅0.35・純音`;
 wave('quiz-base',target.base,.35);$('settings-form').reset();renderChoice();
}
for(const button of document.querySelectorAll('[data-pitch-step]'))button.addEventListener('click',()=>{
 stop();$('card-02').querySelector('.play-state').classList.add('visually-hidden');state.frequency=Math.max(200,Math.min(800,state.frequency+Number(button.dataset.pitchStep)));pitchView.render(state.frequency);$('card-02').querySelector('.play-state').textContent=`右側${state.frequency} Hz：每秒振動${state.frequency}次。點喇叭或播放鍵試聽。`;
});
for(const root of document.querySelectorAll('.lesson-card,.quiz')){
 root.dataset.playing='false';
 root.querySelectorAll('.play[data-play]').forEach(button=>button.addEventListener('click',()=>play(button)));
 root.querySelectorAll('.stop').forEach(button=>button.addEventListener('click',()=>stop(root)));
 stopOnLeave(root,()=>stop(root));
}
for(const button of document.querySelectorAll('[data-reset]'))button.addEventListener('click',()=>{
 stop();const n=Number(button.dataset.reset);
 if(n===1)forkView.reset();
 const defaults={1:{},2:{frequency:440},5:{}};Object.assign(state,defaults[n]);
 button.closest('section').querySelector('.play-state').textContent='等待操作';
});
async function toggleHearing(){
 const root=$('card-06');
 if(activeRoot===root){stop(root);return;}
 stop();const ticket=++request;activeRoot=root;hearingView.clearMessage();hearingView.mode('preparing');
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('unsupported');
  audioContext??=new Audio();await audioContext.resume();if(ticket!==request||document.hidden)return;
  hearingVoice=createHearingVoice(audioContext,hearingView.frequency);source=hearingVoice.oscillator;
  const current=source;source.onended=()=>{if(source===current)stop(root);};
  hearingVoice.start();hearingView.mode('playing');
 }catch{if(ticket!==request)return;stop(root);hearingView.error('目前無法播放這個頻率，請調整頻率或再點播放重試。');}
}
function tuneHearing(frequency){
 if(activeRoot&&activeRoot!==$('card-06'))stop();
 if(hearingVoice)try{hearingVoice.setFrequency(frequency);}catch{stop();hearingView.error('此裝置不支援目前頻率，請往低音調整後再播放。');}
}
$('settings-form').addEventListener('change',()=>{stop();renderChoice();});
$('settings-form').addEventListener('submit',event=>{
 event.preventDefault();const a=answers(),result=checkSettings(a,target),feedback=$('quiz-feedback');
 feedback.hidden=false;feedback.dataset.state=result;
 if(result==='incomplete')feedback.textContent='請先選好頻率、相對振幅與聲音特色，再檢查設定。';
 else if(result==='correct')feedback.textContent=`設定符合要求！你改變頻率來調整高低，維持原振幅，並用${names[target.tone]}改變聲音特色。這三個特徵可以分開比較。`;
 else{
  const hints=[];if(Number(a.frequency)!==target.target)hints.push('再看要求中的頻率，高低音由頻率來描述');if(Number(a.amplitude)!==target.amplitude)hints.push('要求維持原振幅，不是把聲音變大');if(a.tone!==target.tone)hints.push('比較要求的聲音特色與波形');
  feedback.textContent=hints.join('；')+'。可以修改設定後再試。';
 }
});
$('quiz-clear').addEventListener('click',()=>{stop();$('settings-form').reset();renderChoice();});
$('quiz-new').addEventListener('click',()=>{state.index++;newChallenge();});
const links=[...document.querySelectorAll('.route a')];
function activeLink(hash){for(const link of links)if(link.hash===hash)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');}
for(const link of links)link.addEventListener('click',()=>activeLink(link.hash));
window.addEventListener('hashchange',()=>activeLink(location.hash));
const routeSections=links.map(link=>document.querySelector(link.hash));
let routeFrame=0;
function syncRoute(){
 if(routeFrame)return;
 routeFrame=requestAnimationFrame(()=>{
  routeFrame=0;
  const pageEnd=scrollY+innerHeight>=document.documentElement.scrollHeight-2;
  const current=pageEnd?routeSections.at(-1):[...routeSections].reverse().find(root=>root.getBoundingClientRect().top<=innerHeight*.35)||routeSections[0];
  activeLink('#'+current.id);
 });
}
window.addEventListener('scroll',syncRoute,{passive:true});
window.addEventListener('resize',syncRoute);
wave('amplitude-reference',FORK_FREQUENCY,.3,'pure',true);wave('amplitude-live',FORK_FREQUENCY,.7,'pure',true);
forkView=createForkExperiment($('card-01'));
pitchView=createPitchExperiment($('card-02'));pitchView.render(state.frequency);
guitarView=createGuitarExperiment($('card-03'),{onChange:()=>{stop();$('card-03').querySelector('.play-state').classList.add('visually-hidden');},onPluck:key=>$('card-03').querySelector(`.guitar-play[data-play="${key}"]`).click()});
panView=createPanExperiment($('card-04'));
$('card-04').querySelector('[data-pan-reset]').addEventListener('click',()=>{stop();panView.reset();$('card-04').querySelector('.play-state').classList.add('visually-hidden');});
timbreView=createTimbreExperiment($('card-05'));
hearingView=createHearingExperiment($('card-06'),{onToggle:toggleHearing,onFrequency:tuneHearing,onReset:()=>stop($('card-06'))});
$('card-06').addEventListener('pointerdown',()=>{if(activeRoot&&activeRoot!==$('card-06'))stop();},true);
newChallenge();activeLink(location.hash||'#card-01');
