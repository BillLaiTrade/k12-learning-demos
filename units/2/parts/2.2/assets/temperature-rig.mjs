// 選定溫度立即套用；聲音只在敲擊後開始實時計算。
export const temperatureText = value => new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 1 }).format(value);

const heatIcon = '<path d="M7 28C-1 21 16 17 8 5M18 28C10 21 27 17 19 3M29 28C21 21 38 17 30 5"/>';
const coldIcon = '<path d="M18 2V34M4.1 10L31.9 26M4.1 26L31.9 10M12 5L18 10L24 5M12 31L18 26L24 31M4 17L11 18L8 25M28 11L25 18L32 19M4 19L11 18L8 11M28 25L25 18L32 17"/>';
const roomIcon = '<path d="M30 13A13 13 0 0 0 7 8L3 13M3 5V13H11M6 23A13 13 0 0 0 29 28L33 23M25 23H33V31"/>';

export function createTemperatureRig(parent, { prefix, onSelect, chamber }) {
  const rig = document.createElement('div');
  rig.className = 'temperature-rig';
  rig.setAttribute('role', 'group');
  rig.setAttribute('aria-label', '可調溫組的溫度選擇');
  rig.innerHTML = `
    <div class="thermal-actions">
      ${[[80,'heat','加熱到 80°C',heatIcon],[0,'cool','冷卻到 0°C',coldIcon],[20,'room','回到 20°C',roomIcon]].map(([target,kind,label,icon])=>`<button type="button" class="thermal-button ${kind}" data-temperature-target="${target}" aria-pressed="false"><svg viewBox="0 0 36 36" aria-hidden="true">${icon}</svg><span>${label}</span></button>`).join('')}
    </div>
    <p class="sr-only rig-announcement" role="status" aria-live="polite"></p>`;
  parent.append(rig);
  for (const button of rig.querySelectorAll('[data-temperature-target]')) button.addEventListener('click', () => onSelect(Number(button.dataset.temperatureTarget)));
  const reading = document.createElement('output');
  reading.className = 'group-temperature-value'; reading.id = `${prefix}temperature-value`;
  reading.setAttribute('aria-label', '可調溫組目前的空氣溫度');
  reading.setAttribute('aria-live','off');
  parent.querySelector('.temperature-heading').firstElementChild.replaceWith(reading);
  return { element: rig, render(value, target) {
    rig.dataset.temperature = value.toFixed(4); rig.dataset.target = String(target);
    rig.dataset.state = 'steady';
    reading.textContent = `${temperatureText(value)}°C`;
    chamber.setTemperature(value, target);
    for (const button of rig.querySelectorAll('[data-temperature-target]')) button.setAttribute('aria-pressed', String(Number(button.dataset.temperatureTarget) === target));
    const announcement = `空氣溫度 ${temperatureText(value)} 攝氏度，可敲擊音叉比較。`;
    const status = rig.querySelector('.rig-announcement'); if(status.textContent!==announcement) status.textContent=announcement;
  } };
}
