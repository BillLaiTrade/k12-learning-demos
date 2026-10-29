const root=document.getElementById('ppm-lab');
const buttons=[...root.querySelectorAll('[data-pool-dose]')];
const waterVolumeL=10*5*2*1000;
const waterMassG=waterVolumeL*1000; // Teaching estimate: water density = 1 kg/L.
const number=(value,digits=0)=>value.toLocaleString('en-US',{maximumFractionDigits:digits});
function update(soluteG){
  const totalG=waterMassG+soluteG,ratio=soluteG/totalG;
  const ppm=ratio*1000000,percent=ratio*100;
  const roundedPpm=number(ppm,3),roundedPercent=number(percent,6);
  const fields={solute:`${number(soluteG)} 克`,total:`${number(totalG)} 克`,'ppm-short':`≈ ${roundedPpm} ppm`,meaning:`每 100 萬份溶液中，約 ${roundedPpm} 份是溶質。`};
  for(const [key,text] of Object.entries(fields))for(const node of root.querySelectorAll(`[data-pool="${key}"]`))node.textContent=text;
  for(const [key,text] of Object.entries({numerator:fields.solute,denominator:fields.total,ppm:fields['ppm-short'],percent:`≈ ${roundedPercent}%`}))for(const node of root.querySelectorAll(`[data-ppm="${key}"]`))node.textContent=text;
  root.dataset.waterVolumeL=String(waterVolumeL);root.dataset.waterMassG=String(waterMassG);root.dataset.soluteG=String(soluteG);root.dataset.totalG=String(totalG);root.dataset.totalMg=String(totalG*1000);root.dataset.ppm=String(ppm);root.dataset.percent=String(percent);
  for(const button of buttons)button.setAttribute('aria-pressed',String(Number(button.dataset.poolDose)===soluteG));
  document.getElementById('pool-worked-formula').setAttribute('aria-label',`${soluteG}克除以${totalG}克，再乘以一百萬，約為${roundedPpm}ppm`);
  document.getElementById('ppm-status').textContent=`加入${soluteG}克溶質；溶液總質量${number(totalG)}克，濃度約${roundedPpm}ppm，約${roundedPercent}%。`;
}
buttons.forEach(button=>button.addEventListener('click',()=>update(Number(button.dataset.poolDose))));
update(100);root.dataset.ready='true';
const photo=document.getElementById('pool-volume-image');
const fallback=document.getElementById('pool-volume-fallback');
const loaded=()=>{root.dataset.image='ready';photo.hidden=false;fallback.hidden=true;};
const failed=()=>{root.dataset.image='error';photo.hidden=true;fallback.hidden=false;};
photo.addEventListener('load',loaded);photo.addEventListener('error',failed);
document.getElementById('pool-image-retry').addEventListener('click',()=>{root.dataset.image='loading';photo.src=new URL('./ppm-whole-pool.webp?retry='+Date.now(),import.meta.url).href;});
if(photo.complete){if(photo.naturalWidth)loaded();else failed();}
