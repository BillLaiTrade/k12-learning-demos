import {CUP,cupTransfer,drawCup,drawJet} from './cup-transfer.js?v=review-5';
import {loadPicture} from './investigation-renderer.js?v=review-5';
const root=document.getElementById('filter-animation'),button=document.getElementById('filter-play'),canvas=document.getElementById('filter-canvas'),status=document.getElementById('filter-status');
const ctx=canvas.getContext('2d'),duration=10000,scale=1.6;
const sampleMarker=root.querySelector('[data-filter-detail=sample]'),pourMarker=root.querySelector('[data-filter-detail=pour]');
let markerPose=null;
let background,glass,started=0,elapsed=0,frame=0,playing=false,visible=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
export function filtrationFrame(t){
 const received=cupTransfer(t).received;
 return cupTransfer(t,'filter',{mouth:{x:720/scale,y:220/scale},home:{x:365/scale,y:320/scale,angle:0},target:{x:835/scale,y:335/scale},outlet:{x:839/scale,y:574/scale},receiver:{x:839/scale,y:(837-147*received)/scale}});
}
function positionSampleMarker(pose){
 if(!pose)return;
 const width=root.clientWidth,height=root.clientHeight;if(!width||!height)return;
 // Anchor below the cup in its own coordinate system, then keep the text upright.
 const offset=CUP.h/2+20;
 let x=(pose.x-Math.sin(pose.angle)*offset)*scale/canvas.width*width;
 let y=(pose.y+Math.cos(pose.angle)*offset)*scale/canvas.height*height;
 const halfWidth=sampleMarker.offsetWidth/2,halfHeight=sampleMarker.offsetHeight/2;
 const separationX=halfWidth+pourMarker.offsetWidth/2+6,separationY=halfHeight+pourMarker.offsetHeight/2+6;
 if(Math.abs(x-pourMarker.offsetLeft)<separationX&&Math.abs(y-pourMarker.offsetTop)<separationY)x=pourMarker.offsetLeft-separationX;
 x=Math.max(halfWidth+4,Math.min(width-halfWidth-4,x));
 y=Math.max(halfHeight+4,Math.min(height-halfHeight-4,y));
 sampleMarker.style.left=`${x/width*100}%`;sampleMarker.style.top=`${y/height*100}%`;
}
new ResizeObserver(()=>positionSampleMarker(markerPose)).observe(root);
function draw(t){
 const f=filtrationFrame(t);markerPose=f.pose;positionSampleMarker(markerPose);ctx.clearRect(0,0,1672,941);ctx.drawImage(background,0,0,1672,941);
 // Only the receiving liquid rises; the paper and source retain their own amounts.
 if(f.received>0){const level=837-147*f.received;ctx.save();ctx.beginPath();ctx.moveTo(731,602);ctx.lineTo(955,602);ctx.lineTo(946,819);ctx.quadraticCurveTo(837,864,731,819);ctx.closePath();ctx.clip();const g=ctx.createLinearGradient(731,level,950,840);g.addColorStop(0,'#c9e6dd80');g.addColorStop(1,'#78b09c80');ctx.fillStyle=g;ctx.fillRect(720,level,250,170);ctx.fillStyle='#e6f4ef9c';ctx.beginPath();ctx.ellipse(838,level,111,13,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffffffb8';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
 if(f.held>0){ctx.save();ctx.beginPath();ctx.moveTo(708,269);ctx.lineTo(978,269);ctx.lineTo(835,456);ctx.closePath();ctx.clip();ctx.fillStyle='#c7b08c80';ctx.fillRect(700,335-80*Math.sqrt(f.held),290,130);ctx.restore();}
 for(let i=0;i<Math.round(150*f.arrived);i++){const a=i*2.39996,r=Math.sqrt(((i*73)%151)/151);ctx.fillStyle=['#816244','#b69569','#564634','#c6ae87'][i%4];ctx.beginPath();ctx.ellipse(835+Math.cos(a)*70*r,334+Math.sin(a)*16*r,2.5+(i%3),1.8+(i%2),a,0,Math.PI*2);ctx.fill();}
 ctx.save();ctx.scale(scale,scale);drawCup(ctx,glass,f,1);drawJet(ctx,f.stream,true,6);drawJet(ctx,f.outlet,false,4);ctx.restore();
 root.dataset.progress=t.toFixed(4);root.dataset.source=f.source.toFixed(6);root.dataset.received=f.received.toFixed(6);root.dataset.retained=f.arrived.toFixed(6);root.dataset.state=t>=1?'complete':playing?'playing':'ready';
}
function tick(now){if(!playing)return;elapsed=Math.max(0,Math.min(duration,now-started));draw(elapsed/duration);if(elapsed<duration)frame=requestAnimationFrame(tick);else{playing=false;button.setAttribute('aria-label','重新播放過濾動畫');status.textContent='泥沙留在濾紙上，濾液收集在杯中。';}}
function play(){if(!background||!glass)return;cancelAnimationFrame(frame);elapsed=0;playing=true;started=performance.now();status.textContent='';button.setAttribute('aria-label','從頭播放過濾動畫');draw(0);frame=requestAnimationFrame(tick);}
button.addEventListener('click',play);
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(playing){cancelAnimationFrame(frame);playing=false;root.dataset.paused='true';}}else if(root.dataset.paused==='true'){delete root.dataset.paused;playing=true;started=performance.now()-elapsed;frame=requestAnimationFrame(tick);}});
async function load(){try{button.disabled=true;[background,glass]=await Promise.all([loadPicture(new URL('filtration-empty.webp',import.meta.url)),loadPicture(new URL('concentration-beaker.webp',import.meta.url))]);root.dataset.ready='true';button.disabled=false;status.textContent='';draw(reduced.matches?1:0);if(visible&&!reduced.matches)play();}catch{root.dataset.ready='error';status.textContent='過濾畫面無法載入，請點此重試。';status.onclick=load;}}
new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){visible=true;if(root.dataset.ready==='true'&&root.dataset.state==='ready'&&!reduced.matches)play();}},{threshold:.25}).observe(root);
load();
