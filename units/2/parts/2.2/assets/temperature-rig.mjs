// 調溫是實驗準備動畫；敲擊後的聲速計時不使用這個時間軸。
export const temperatureText = value => new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 1 }).format(value);
export function temperatureTransition(from, target, start) {
  return { from, target, start, duration: Math.max(800, Math.abs(target - from) / 12.5 * 1000) };
}
export function temperatureAt(transition, now) {
  const progress = Math.min(1, Math.max(0, (now - transition.start) / transition.duration));
  return transition.from + (transition.target - transition.from) * progress;
}

const unitImage = new URL('./temperature-control-unit.png', import.meta.url).href;
const heatIcon = '<path d="M7 28C-1 21 16 17 8 5M18 28C10 21 27 17 19 3M29 28C21 21 38 17 30 5"/>';
const coldIcon = '<path d="M18 2V34M4.1 10L31.9 26M4.1 26L31.9 10M12 5L18 10L24 5M12 31L18 26L24 31M4 17L11 18L8 25M28 11L25 18L32 19M4 19L11 18L8 11M28 25L25 18L32 17"/>';
const roomIcon = '<path d="M30 13A13 13 0 0 0 7 8L3 13M3 5V13H11M6 23A13 13 0 0 0 29 28L33 23M25 23H33V31"/>';

export function createTemperatureRig(parent, { prefix, onSelect }) {
  const rig = document.createElement('div');
  rig.className = 'temperature-rig';
  rig.setAttribute('role', 'group');
  rig.setAttribute('aria-label', '可調溫組的溫控裝置');
  rig.innerHTML = `
    <div class="rig-equipment">
      <div class="rig-controller">
        <svg viewBox="0 0 1743 902" role="img" aria-label="具有加熱及冷卻表面的金屬溫控裝置，探棒連接可調溫組">
          <defs>
            <radialGradient id="${prefix}heat-glow"><stop stop-color="#fff6a2"/><stop offset=".5" stop-color="#ffb025"/><stop offset="1" stop-color="#ed5322" stop-opacity=".82"/></radialGradient>
            <radialGradient id="${prefix}cold-glow"><stop stop-color="#e7fcff"/><stop offset=".5" stop-color="#83e2ff"/><stop offset="1" stop-color="#258ed6" stop-opacity=".8"/></radialGradient>
            <filter id="${prefix}plate-halo" x="-30%" y="-120%" width="160%" height="340%"><feGaussianBlur stdDeviation="12"/></filter>
          </defs>
          <image href="${unitImage}" width="1743" height="902"/>
          <g class="rig-heat-light" opacity="0"><path d="M310 493H694L679 568H235Z" fill="#f9972f" filter="url(#${prefix}plate-halo)"/><path d="M310 493H694L679 568H235Z" fill="url(#${prefix}heat-glow)" stroke="#ffb945" stroke-width="5"/></g>
          <g class="rig-cold-light" opacity="0"><path d="M891 493H1302L1360 567H888Z" fill="#58baff" filter="url(#${prefix}plate-halo)"/><path d="M891 493H1302L1360 567H888Z" fill="url(#${prefix}cold-glow)" stroke="#8be3ff" stroke-width="5"/></g>
          <circle class="rig-indicator" cx="905" cy="735" r="15" stroke="#fff3d7" stroke-width="3"/>
        </svg>
        <span class="rig-unit-label">溫控裝置</span>
      </div>
      <div class="rig-thermometer">
        <svg viewBox="0 0 160 280" role="img" aria-label="空氣溫度計">
          <defs>
            <linearGradient id="${prefix}thermo-metal"><stop stop-color="#8a989c"/><stop offset=".18" stop-color="#fffefa"/><stop offset=".48" stop-color="#dce2df"/><stop offset=".78" stop-color="#fafaf6"/><stop offset="1" stop-color="#7b8c92"/></linearGradient>
            <linearGradient id="${prefix}thermo-glass"><stop stop-color="#8facb9"/><stop offset=".35" stop-color="#f7fdff"/><stop offset=".7" stop-color="#cce3eb"/><stop offset="1" stop-color="#688b9c"/></linearGradient>
          </defs>
          <path d="M12 252H143L150 259V266H5V259Z" fill="url(#${prefix}thermo-metal)" stroke="#8d989b"/>
          <rect x="14" y="16" width="126" height="241" rx="14" fill="#faf8f2" stroke="#b8b7af"/>
          <path d="M43 48Q33 48 33 60V213A17 17 0 1 0 57 213V60Q57 48 47 48Z" fill="url(#${prefix}thermo-glass)" stroke="#6c8c9b" stroke-width="1.2"/>
          <rect class="rig-fluid-column" x="40" y="58" width="10" height="169" rx="5"/>
          <circle class="rig-fluid-bulb" cx="45" cy="226" r="10.5"/>
          <path d="M37 61V211M38 221Q35 229 40 232" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2"/>
          ${[0,10,20,30].map(t => `<path d="M65 ${208-t*5}H79" stroke="#55656a" stroke-width="1.5"/><text x="91" y="${215-t*5}" fill="#263d40" font-size="21" font-family="system-ui,sans-serif">${t}</text>`).join('')}
          ${[5,15,25].map(t => `<path d="M65 ${208-t*5}H73" stroke="#879597"/>`).join('')}
        </svg>
        <output class="rig-temperature-value" id="${prefix}temperature-value" aria-label="可調溫組目前的空氣溫度" aria-live="off">30°C</output>
      </div>
    </div>
    <div class="thermal-actions">
      ${[[30,'heat','加熱到 30°C',heatIcon],[0,'cool','冷卻到 0°C',coldIcon],[20,'room','回到 20°C',roomIcon]].map(([target,kind,label,icon])=>`<button type="button" class="thermal-button ${kind}" data-temperature-target="${target}" aria-pressed="false"><svg viewBox="0 0 36 36" aria-hidden="true">${icon}</svg><span>${label}</span></button>`).join('')}
    </div>
    <p class="sr-only rig-announcement" role="status" aria-live="polite"></p>`;
  parent.append(rig);
  for (const button of rig.querySelectorAll('[data-temperature-target]')) button.addEventListener('click', () => onSelect(Number(button.dataset.temperatureTarget)));
  const reading = rig.querySelector('output'), column = rig.querySelector('.rig-fluid-column'), bulb = rig.querySelector('.rig-fluid-bulb');
  return { element: rig, render(value, target, changing) {
    rig.dataset.temperature = value.toFixed(4); rig.dataset.target = String(target);
    rig.dataset.state = changing ? target > value ? 'heating' : 'cooling' : 'steady';
    const hot = target === 30, cold = target === 0;
    const color = value > 20 ? '#ef7037' : value < 20 ? '#3c9fd0' : '#458d79';
    rig.style.setProperty('--temperature-ink', color);
    reading.textContent = `${temperatureText(value)}°C`;
    const y = 208 - Math.min(30, Math.max(0, value)) * 5;
    column.setAttribute('y', y.toFixed(3)); column.setAttribute('height', (227-y).toFixed(3));
    column.setAttribute('fill', color); bulb.setAttribute('fill', color);
    rig.querySelector('.rig-thermometer svg').setAttribute('aria-label', `空氣溫度計，目前 ${temperatureText(value)} 攝氏度`);
    rig.querySelector('.rig-heat-light').setAttribute('opacity', hot ? '1' : '0');
    rig.querySelector('.rig-cold-light').setAttribute('opacity', cold ? '1' : '0');
    rig.querySelector('.rig-indicator').setAttribute('fill', hot ? '#f88036' : cold ? '#5bbbe7' : '#7aa28f');
    for (const button of rig.querySelectorAll('[data-temperature-target]')) button.setAttribute('aria-pressed', String(Number(button.dataset.temperatureTarget) === target));
    const announcement = changing ? target===20 ? '正在回到 20 攝氏度。' : `正在${target>value?'加熱':'冷卻'}到 ${target} 攝氏度。` : `空氣溫度 ${temperatureText(value)} 攝氏度，可敲擊音叉比較。`;
    const status = rig.querySelector('.rig-announcement'); if(status.textContent!==announcement) status.textContent=announcement;
  } };
}
