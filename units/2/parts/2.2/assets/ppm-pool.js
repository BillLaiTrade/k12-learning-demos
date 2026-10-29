import {poolLiters} from './ppm-quantity-model.js?v=polish-1';
import {createQuantityView} from './ppm-quantity-view.js?v=polish-1';
const root=document.getElementById('ppm-lab');
const waterVolumeL=poolLiters();
const waterMassG=waterVolumeL*1000; // Teaching estimate: water density = 1 kg/L.
const view=createQuantityView(root);
const number=(value,digits=0)=>value.toLocaleString('en-US',{maximumFractionDigits:digits});
function renderExample(){
  const soluteG=100;
  const totalG=waterMassG+soluteG,ratio=soluteG/totalG;
  const ppm=ratio*1000000,percent=ratio*100;
  const roundedPpm=number(ppm,3),roundedPercent=number(percent,6);
  const fields={solute:`${number(soluteG)} 克`,total:`${number(totalG)} 克`,'ppm-short':`≈ ${roundedPpm} ppm`,meaning:`每 100 萬份溶液中，約 ${roundedPpm} 份是溶質。`};
  for(const [key,text] of Object.entries(fields))for(const node of root.querySelectorAll(`[data-pool="${key}"]`))node.textContent=text;
  for(const [key,text] of Object.entries({numerator:fields.solute,denominator:fields.total,ppm:fields['ppm-short'],percent:`≈ ${roundedPercent}%`}))for(const node of root.querySelectorAll(`[data-ppm="${key}"]`))node.textContent=text;
  view.setSalt(soluteG);
  root.dataset.waterVolumeL=String(waterVolumeL);root.dataset.waterMassG=String(waterMassG);root.dataset.soluteG=String(soluteG);root.dataset.totalG=String(totalG);root.dataset.totalMg=String(totalG*1000);root.dataset.ppm=String(ppm);root.dataset.percent=String(percent);
  document.getElementById('pool-worked-formula').setAttribute('aria-label',`${soluteG}克除以${totalG}克，再乘以一百萬，約為${roundedPpm}ppm`);
  document.getElementById('ppm-status').textContent=`加入${soluteG}克溶質；溶液總質量${number(totalG)}克，濃度約${roundedPpm}ppm，約${roundedPercent}%。`;
}
renderExample();root.dataset.ready='true';
window.addEventListener('pagehide',event=>{if(!event.persisted)view.dispose();});
