import {bindRoomWaveLab} from '../../units/3/parts/3.4/assets/room-wave-lab.mjs?v=0df53bfb7d7b';

const mode=new URL(location.href).searchParams.get('layout')==='current'?'current':'compact';
document.documentElement.dataset.layout=mode;
for(const link of document.querySelectorAll('[data-preview-layout]')){
  if(link.dataset.previewLayout===mode)link.setAttribute('aria-current','step');
}
const root=document.getElementById('room');
if(mode==='compact'){
  const heading=root.querySelector('.room-wave-heading'),title=heading.querySelector('h3');
  root.setAttribute('role','group');root.setAttribute('aria-label',title.textContent);
  const toolbar=document.createElement('div');toolbar.className='room-toolbar';
  toolbar.append(root.querySelector('.room-wave-controls'),heading.querySelector('.room-condition'));
  heading.replaceWith(toolbar);
  const question=document.getElementById('room-observation');toolbar.after(question);
  const reading=document.createElement('div');reading.className='room-reading';
  reading.append(root.querySelector('.room-wave-legend'),document.getElementById('room-status'));
  root.append(reading);
  const hint=root.querySelector('.room-wave-hint');root.after(hint);
  root.querySelector('.room-wave-scene').before(document.getElementById('room-error'));
}
let active=null;
const claim=api=>{if(active&&active!==api)active.pause();active=api;};
const release=api=>{if(active===api)active=null;};
bindRoomWaveLab(claim,release);
document.addEventListener('visibilitychange',()=>{if(document.hidden)active?.pause();});
window.addEventListener('pagehide',()=>active?.pause());
document.body.dataset.ready='true';
