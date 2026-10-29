import { DISTANCE, START_X, END_X } from './sound-speed-model.mjs?v=fixed-22';

const metres = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 });
const color = model => model.temperature > 20 ? '#bc5722' : model.temperature < 20 ? '#287fae' : '#176b53';
const setText = (node, value) => { if (node.textContent !== value) node.textContent = value; };

// 下方單一刻度共用兩組位置與實時時鐘。
export function createTemperatureProgress(row, id) {
  const progress = document.createElement('div');
  progress.className = 'race-progress';
  progress.setAttribute('role', 'group');
  progress.setAttribute('aria-label', '0 攝氏度與 80 攝氏度的聲音傳播進度');
  progress.innerHTML = `
    <div class="race-scale">
      <div class="race-line"></div><div class="race-filled"></div>
      ${Array.from({ length: 6 }, (_, i) => `<span class="race-tick" data-distance="${i*1000}" style="left:${i*20}%"><span>${metres.format(i*1000)}${i===0||i===5?' m':''}</span></span>`).join('')}
      <span class="race-tick race-midpoint" style="left:50%"><span>2,500</span></span>
      <div class="race-marker race-other" hidden aria-hidden="true"><svg viewBox="0 0 20 16"><circle cx="10" cy="6" r="4"/></svg><i></i></div>
      <div class="race-marker race-own" hidden aria-hidden="true"><svg viewBox="0 0 20 16"><circle cx="10" cy="6" r="4"/></svg><i></i></div>
      <div class="race-readouts">
        <div class="race-label race-other-label"><i aria-hidden="true"></i><span>0°C</span><span class="race-distance"><output aria-live="off">0</output> m</span></div>
        <div class="race-label race-own-label"><i aria-hidden="true"></i><span>80°C</span><span class="race-distance"><output aria-live="off">0</output> m</span></div>
      </div>
    </div>`;
  // 與上方實際粒子區的 0～5,000 m 共用同一比例。
  const scale = progress.querySelector('.race-scale');
  scale.style.left = `${START_X/456*100}%`;
  scale.style.width = `${(END_X-START_X)/456*100}%`;
  row.querySelector('.row-body').append(progress);
  const gap = document.createElement('p');
  gap.className = 'progress-gap'; gap.hidden = true;
  gap.setAttribute('aria-live', 'off');
  row.querySelector('.arrival-readout').append(gap);
  const ownMarker = progress.querySelector('.race-own'), otherMarker = progress.querySelector('.race-other');
  const ownLabel = progress.querySelector('.race-own-label'), otherLabel = progress.querySelector('.race-other-label');
  const ownValue = ownLabel.querySelector('output'), otherValue = otherLabel.querySelector('output');
  const fill = progress.querySelector('.race-filled');
  progress.dataset.ownerGroup = id;
  return { render(own, other, synchronized) {
    const ownPosition = own.distance/DISTANCE*100, otherPosition = other.distance/DISTANCE*100;
    progress.style.setProperty('--own-color', color(own));
    progress.style.setProperty('--other-color', color(other));
    progress.dataset.ownDistance = String(own.distance);
    progress.dataset.otherDistance = String(other.distance);
    progress.dataset.otherGroup = other.id;
    ownMarker.style.left = `${ownPosition}%`; otherMarker.style.left = `${otherPosition}%`;
    ownMarker.hidden = !own.active; otherMarker.hidden = !other.active;
    fill.style.width = `${ownPosition}%`;
    const ownMetres = Math.round(own.distance), otherMetres = Math.round(other.distance);
    setText(ownValue, metres.format(ownMetres));
    setText(otherValue, metres.format(otherMetres));
    ownValue.setAttribute('aria-label', `${own.temperature} 攝氏度組${own.active?`振動已傳到 ${metres.format(ownMetres)} 公尺`:'尚未敲擊'}`);
    otherValue.setAttribute('aria-label', `${other.temperature} 攝氏度組${other.active?`振動已傳到 ${metres.format(otherMetres)} 公尺`:'尚未敲擊'}`);
    gap.hidden = !own.active && !other.active;
    const difference = ownMetres-otherMetres;
    const relation = !synchronized ? 'individual' : own.distance>=DISTANCE&&other.distance>=DISTANCE ? 'arrived' : difference===0 ? 'even' : difference>0 ? 'ahead' : 'behind';
    gap.dataset.relation = relation;
    gap.dataset.difference = String(difference);
    const message = {individual:'分別敲擊',arrived:'均已到達',even:'進度相同',ahead:`領先 ${metres.format(difference)} 公尺`,behind:`落後 ${metres.format(-difference)} 公尺`}[relation];
    setText(gap, message);
    gap.setAttribute('aria-label', !synchronized ? '兩組分別敲擊，位置不作聲速快慢判斷' : message);
  } };
}
