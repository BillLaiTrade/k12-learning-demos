import {TIMBRE_KEYS,loadTimbreClip,waveformPath,WAVE_START,WAVE_SECONDS,WAVE_PLOT} from './timbre-model.mjs?v=1';

const labels={pure:'音叉',string:'吉他',pipe:'排笛'};
function guitarPicture(){
 const frets=Array.from({length:19},(_,i)=>{const x=1816-(1816-310)*(1-Math.pow(2,-(i+1)/12));return `<path d="M${x} 305V410" stroke="#c7bda6" stroke-width="4"/>`;}).join('');
 const strings=Array.from({length:6},(_,i)=>`<path d="M310 ${306+i*20}H1816" stroke="${i<3?'#c5b894':'#e0dfd1'}" stroke-width="${5-i*.5}"/>`).join('');
 return `<svg viewBox="0 0 2167 725" class="timbre-guitar" aria-hidden="true"><image href="assets/guitar-body.png" width="2167" height="725"/>${frets}${strings}</svg>`;
}
function pipePicture(){
 const pipes=Array.from({length:6},(_,i)=>{
  const x=40+i*35,y=22+i*12,h=235-i*23;
  return `<svg x="${x}" y="${y}" width="36" height="19" viewBox="375 5 280 120" preserveAspectRatio="none"><image href="assets/pan-bamboo.png" width="1024" height="1536"/></svg><svg x="${x}" y="${y+19}" width="36" height="${h-32}" viewBox="375 125 280 1260" preserveAspectRatio="none"><image href="assets/pan-bamboo.png" width="1024" height="1536"/></svg><svg x="${x}" y="${y+h-13}" width="36" height="13" viewBox="375 1385 280 140" preserveAspectRatio="none"><image href="assets/pan-bamboo.png" width="1024" height="1536"/></svg>`;
 }).join('');
 return `<svg viewBox="0 0 320 280" class="timbre-pipes" aria-hidden="true">${pipes}<path d="M40 106L251 126M40 117L251 137" stroke="#8f6033" stroke-width="6"/><path d="M40 106L251 126M40 117L251 137" stroke="#e5c18a" stroke-width="2" stroke-dasharray="5 3"/></svg>`;
}
function axes(){
 const grid=Array.from({length:11},(_,i)=>`<path d="M${52+50*i} 16V144" class="grid"/>`).join('');
 return `${grid}<path class="axis" d="M52 16V144H552M52 80H552"/><g class="timbre-axis-text"><text x="42" y="21" text-anchor="end">0.6</text><text x="42" y="85" text-anchor="end">0</text><text x="42" y="148" text-anchor="end">−0.6</text></g>`;
}
export function createTimbreExperiment(root){
 const rows=new Map(TIMBRE_KEYS.map(key=>[key,root.querySelector(`[data-timbre="${key}"]`)])),clips=new Map();
 let active=null,duration=1.2;
 rows.get('pure').querySelector('.timbre-picture').innerHTML='<img src="assets/fork-apparatus.png" alt="" class="timbre-fork">';
 rows.get('string').querySelector('.timbre-picture').innerHTML=guitarPicture();
 rows.get('pipe').querySelector('.timbre-picture').innerHTML=pipePicture();
 for(const row of rows.values()){
  row.querySelector('.wave').innerHTML=axes()+'<g class="timbre-cursor" aria-hidden="true" data-progress="0" hidden><circle r="12" class="timbre-cursor-halo"/><circle r="6" class="timbre-cursor-dot"/></g>';
  row.querySelector('.timbre-image-play').addEventListener('click',()=>row.querySelector('.timbre-play').click());
 }
 async function prepare(key){
  const row=rows.get(key),clip=await loadTimbreClip(key),plot=row.querySelector('.wave');
  let path=plot.querySelector('.signal');
  if(!path){path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('class','signal');plot.insertBefore(path,plot.querySelector('.timbre-cursor'));}
  clips.set(key,clip);
  path.setAttribute('d',waveformPath(clip));
  plot.dataset.startSeconds=String(WAVE_START);plot.dataset.windowSeconds=String(WAVE_SECONDS);plot.dataset.frequency='440';
  plot.setAttribute('aria-label',`${labels[key]}實際播放訊號第200至210毫秒，三圖共用時間與相對振幅刻度${key==='pure'?'；音叉為近似純音合成示意':''}`);
  row.dataset.ready='true';row.querySelector('.timbre-load').hidden=true;
  return clip;
 }
 // 只下載資料繪圖，不建立AudioContext或自動播放；失敗保留空圖與可重試的播放鍵。
 for(const key of TIMBRE_KEYS)prepare(key).catch(()=>{
  const row=rows.get(key);row.dataset.ready='false';row.querySelector('.timbre-load').textContent='波形未載入，點播放重試';
 });
 function update(seconds){
  if(!active)return;
  const {samples,rate}=clips.get(active),progress=Math.max(0,Math.min(1,seconds/duration));
  // 跟隨既有折線的同一取樣區間，以線性內插貼在線上；不可另算正弦或假波形。
  const first=Math.ceil(WAVE_START*rate),last=Math.floor((WAVE_START+WAVE_SECONDS)*rate),sample=first+(last-first)*progress;
  const lower=Math.floor(sample),upper=Math.min(last,lower+1),amplitude=samples[lower]+(samples[upper]-samples[lower])*(sample-lower);
  const x=WAVE_PLOT.left+(sample/rate-WAVE_START)/WAVE_SECONDS*(WAVE_PLOT.right-WAVE_PLOT.left),y=WAVE_PLOT.zero-WAVE_PLOT.scale*amplitude;
  const cursor=rows.get(active).querySelector('.timbre-cursor');
  cursor.setAttribute('transform',`translate(${x} ${y})`);cursor.dataset.progress=String(progress);
 }
 return {prepare,update,start(key,seconds){
  active=key;duration=seconds;update(0);
  for(const [k,row]of rows){row.querySelector('.timbre-cursor').toggleAttribute('hidden',k!==key);row.dataset.sounding=String(k===key);row.querySelectorAll('.play,.timbre-image-play').forEach(button=>button.setAttribute('aria-pressed',String(k===key)));}
 },stop(){
  active=null;
  for(const row of rows.values()){row.querySelector('.timbre-cursor').setAttribute('hidden','');row.dataset.sounding='false';row.querySelectorAll('.play,.timbre-image-play').forEach(button=>button.setAttribute('aria-pressed','false'));}
 }};
}
