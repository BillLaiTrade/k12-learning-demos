import {signal,stringFrequency,tubeFrequency,hearingBand,soundSamples,challenge,checkSettings} from './model.mjs?v=1';
import {forkSamples,FORK_FREQUENCY,STRIKE_DELAY} from './fork-model.mjs?v=1';
import {createForkExperiment} from './fork-experiment.mjs?v=1';
import {stopOnLeave} from '../../3.2/assets/lesson-playback.mjs?v=2';
const $=id=>document.getElementById(id), ns='http://www.w3.org/2000/svg';
const state={frequency:440,length:60,tension:1,tube:60,index:0};
const forkView=createForkExperiment($('card-01'));
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
function restInstrument(){
 const end=75+425*state.length/90;
 $('string-wire').setAttribute('d',`M75 80H${end}`);
 $('string-bridge').setAttribute('cx',end);$('string-length-line').setAttribute('d',`M75 124H${end}`);
 const width=450*state.tube/80,endTube=65+width;
 $('tube-body').setAttribute('width',width);$('tube-rims').setAttribute('d',`M65 32V110M${endTube} 32V110`);$('tube-length-line').setAttribute('d',`M65 130H${endTube}`);
 $('tube-air').replaceChildren();
 for(let i=0;i<15;i++)for(let row=0;row<3;row++)svg('circle',{cx:75+i*(width-20)/14,cy:52+row*18,r:3,fill:'#397e83','data-origin-x':75+i*(width-20)/14},$('tube-air'));
}
function stop(root=activeRoot){
 if(root && activeRoot && root!==activeRoot)return;
 request++;
 if(source){source.onended=null;try{source.stop();}catch{}source.disconnect();source=null;}
 cancelAnimationFrame(animation);animation=0;
 if(activeRoot){activeRoot.dataset.playing='false';activeRoot.querySelectorAll('.stop').forEach(b=>b.disabled=true);activeRoot.querySelector('.play-state').textContent='已停止，點擊可重新播放';}
 activeRoot=null;forkView.stop();restInstrument();
}
function config(key){
 const answer=answers();
 const map={
  'amplitude-reference':{frequency:FORK_FREQUENCY,amplitude:.3},'amplitude-live':{frequency:FORK_FREQUENCY,amplitude:.7},
  'pitch-reference':{frequency:220,amplitude:.5},'pitch-live':{frequency:state.frequency,amplitude:.5},
  'string-reference':{frequency:220,amplitude:.55,tone:'string'},'string-live':{frequency:stringFrequency(state.length,state.tension),amplitude:.55,tone:'string'},
  'tube-reference':{frequency:tubeFrequency(60),amplitude:.55,tone:'pipe'},'tube-live':{frequency:tubeFrequency(state.tube),amplitude:.55,tone:'pipe'},
  'quiz-base':{frequency:target.base,amplitude:target.amplitude},'quiz-choice':{frequency:Number(answer.frequency),amplitude:Number(answer.amplitude),tone:answer.tone}
 };
 if(key.startsWith('tone-'))return{frequency:440,amplitude:.5,tone:key.slice(5)};
 return map[key];
}
async function play(button){
 stop();const ticket=++request,root=button.closest('.lesson-card,.quiz'),settings=config(button.dataset.play);
 activeRoot=root;root.querySelector('.play-state').textContent='正在準備聲音…';
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('unsupported');
  audioContext??=new Audio();await audioContext.resume();
  if(ticket!==request||document.hidden)return;
  const forkKey=button.dataset.forkStrike;
  const data=forkKey?forkSamples(settings.amplitude,audioContext.sampleRate):soundSamples(settings,audioContext.sampleRate),buffer=audioContext.createBuffer(1,data.length,audioContext.sampleRate);
  buffer.copyToChannel(data,0);source=audioContext.createBufferSource();source.buffer=buffer;source.connect(audioContext.destination);
  root.dataset.playing='true';root.dataset.frequency=String(settings.frequency);root.dataset.amplitude=String(settings.amplitude);root.dataset.tone=settings.tone||'pure';
  root.querySelectorAll('.stop').forEach(b=>b.disabled=false);root.querySelector('.play-state').textContent=forkKey?`${forkKey==='soft'?'輕敲':'較重敲'}，觀察振幅與聲音`:`播放中・${settings.frequency.toFixed(1)} Hz`;
  const start=performance.now(),currentSource=source,forkStart=audioContext.currentTime+(forkKey?STRIKE_DELAY:0);
  if(forkKey)forkView.start(forkKey);
  source.onended=()=>{if(source===currentSource){stop(root);root.querySelector('.play-state').textContent='播放完畢，可再次比較';}};
  source.start(forkStart);
  function animate(now){
   if(source!==currentSource)return;
   if(forkKey)forkView.update(audioContext.currentTime-forkStart);
   const t=(now-start)/1000,fade=Math.max(0,1-t/1.6);
   if(button.dataset.play==='string-live'){
    const end=75+425*state.length/90,displacement=12*Math.sin(t*2*Math.PI*settings.frequency/60)*fade;
    $('string-wire').setAttribute('d',`M75 80Q${(75+end)/2} ${80+displacement} ${end} 80`);
   }
   if(button.dataset.play==='tube-live')$('tube-air').querySelectorAll('circle').forEach((n,i)=>n.setAttribute('cx',Number(n.dataset.originX)+2*Math.cos(Math.PI*Math.floor(i/3)/14)*Math.sin(t*2*Math.PI*settings.frequency/100)*fade));
   animation=requestAnimationFrame(animate);
  }
  animation=requestAnimationFrame(animate);
 }catch{
  if(ticket!==request)return;stop(root);root.querySelector('.play-state').textContent='聲音暫時無法播放，請再點一次；仍可觀察圖形與數值。';
 }
}
function render(){
 wave('amplitude-reference',FORK_FREQUENCY,.3,'pure',true);wave('amplitude-live',FORK_FREQUENCY,.7,'pure',true);
 wave('pitch-reference',220,.5);wave('pitch-live',state.frequency,.5);$('pitch-reading').textContent=`${state.frequency} Hz・每秒振動${state.frequency}次`;
 $('string-length-reading').textContent=state.length+' cm';$('string-tension-reading').textContent=state.tension.toFixed(2)+' 倍';$('string-frequency').textContent=stringFrequency(state.length,state.tension).toFixed(1)+' Hz';
 $('tube-length-reading').textContent=state.tube+' cm';$('tube-frequency').textContent=tubeFrequency(state.tube).toFixed(1)+' Hz';
 for(const tone of ['pure','string','pipe'])wave('tone-'+tone,440,.5,tone);
 restInstrument();
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
const binding={frequency:'frequency','string-length':'length','string-tension':'tension','tube-length':'tube'};
for(const[id,key]of Object.entries(binding))$(id).addEventListener('input',()=>{stop();state[key]=Number($(id).value);render();});
for(const root of document.querySelectorAll('.lesson-card,.quiz')){
 root.dataset.playing='false';
 root.querySelectorAll('.play[data-play]').forEach(button=>button.addEventListener('click',()=>play(button)));
 root.querySelectorAll('.stop').forEach(button=>button.addEventListener('click',()=>stop(root)));
 stopOnLeave(root,()=>stop(root));
}
for(const button of document.querySelectorAll('[data-reset]'))button.addEventListener('click',()=>{
 stop();const n=Number(button.dataset.reset);
 if(n===1)forkView.reset();
 const defaults={1:{},2:{frequency:440},3:{length:60,tension:1},4:{tube:60},5:{}};Object.assign(state,defaults[n]);
 for(const[id,key]of Object.entries(binding))$(id).value=state[key];render();
 button.closest('section').querySelector('.play-state').textContent='等待操作';
});
function hearing(frequency){
 const band=hearingBand(frequency),texts={low:'低於人耳概略可聽範圍，屬於次聲波。',audible:'落在人耳概略可聽範圍內，但每個人的實際聽覺不同。',ultrasound:'高於20,000 Hz，屬於超聲波。人耳聽不到，不代表聲波不存在。'};
 $('hearing-result').textContent=`${frequency.toLocaleString('zh-TW')} Hz：${texts[band]}`;$('hearing-result').dataset.band=band;
 for(const button of document.querySelectorAll('[data-hearing]'))button.setAttribute('aria-pressed',String(Number(button.dataset.hearing)===frequency));
}
for(const button of document.querySelectorAll('[data-hearing]'))button.addEventListener('click',()=>hearing(Number(button.dataset.hearing)));
const levels={conversation:'一般交談約60～70 dBA。這是生活參考範圍，距離與周圍環境改變，量測值也會不同。',cinema:'電影院約74～104 dBA。不同場景、座位與播放條件會造成很大差異，不能說每間電影院都固定是同一個分貝數。',concert:'音樂會約94～110 dBA。與其他資料比較時，也要看量測條件與加權方式；這裡不播放相當聲級的聲音。'};
function level(key){$('level-result').textContent=levels[key];for(const b of document.querySelectorAll('[data-level]'))b.setAttribute('aria-pressed',String(b.dataset.level===key));}
for(const b of document.querySelectorAll('[data-level]'))b.addEventListener('click',()=>level(b.dataset.level));
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
render();hearing(440);level('conversation');newChallenge();activeLink(location.hash||'#card-01');
