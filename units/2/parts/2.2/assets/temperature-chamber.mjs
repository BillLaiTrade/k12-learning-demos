import { svgNode } from './sound-speed-rendering.mjs?v=chamber-18';

export const AIR_CHAMBER = { x: 27, y: 27, width: 412, height: 91 };
export const PROBE_TIP = { x: 424, y: 82 };

// 空氣窗、導熱夾套、控溫底座及測溫探棒共用一套座標，縮放時不會脫離。
export function airChamberScene(root, prefix, adjustable) {
  const chamber = svgNode('g', { class: 'medium-scene air-chamber', 'data-material': 'air', 'data-adjustable': adjustable, 'aria-hidden': 'true' }, root);
  chamber.innerHTML = `
    <defs>
      <linearGradient id="${prefix}-frame" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#eff3f1"/><stop offset=".21" stop-color="#acbcc0"/><stop offset=".45" stop-color="#f9fbf9"/><stop offset=".72" stop-color="#81999f"/><stop offset="1" stop-color="#c9d3d2"/></linearGradient>
      <linearGradient id="${prefix}-front" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#7e939a"/><stop offset=".09" stop-color="#f1f3ee"/><stop offset=".42" stop-color="#b9c4c4"/><stop offset=".68" stop-color="#edf0ec"/><stop offset="1" stop-color="#74898e"/></linearGradient>
      <linearGradient id="${prefix}-glass" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e8f3ed" stop-opacity=".16"/><stop offset=".45" stop-color="#fffefa" stop-opacity="0"/><stop offset="1" stop-color="#c3d5cd" stop-opacity=".13"/></linearGradient>
      <radialGradient id="${prefix}-knob" cx=".35" cy=".25"><stop stop-color="#88989a"/><stop offset=".25" stop-color="#283a40"/><stop offset=".8" stop-color="#53636a"/><stop offset="1" stop-color="#15282e"/></radialGradient>
      <clipPath id="${prefix}-air"><rect x="27" y="27" width="412" height="91" rx="4"/></clipPath>
    </defs>
    <g class="chamber-body">
      <path d="M26 24L35 16H442L435 24Z" fill="url(#${prefix}-frame)" stroke="#829a9a" stroke-width=".65"/>
      <path d="M435 24L442 16V113L435 122Z" fill="url(#${prefix}-front)" stroke="#829a9a" stroke-width=".65"/>
      <rect x="24" y="23" width="412" height="98" rx="5" fill="url(#${prefix}-glass)" stroke="#9bb4ac" stroke-width="1.5"/>
      <path d="M28 26H431M28 118H431" stroke="#e2eae4" stroke-width="2"/>
      <rect class="chamber-jacket" x="24" y="118" width="427" height="11" rx="2" fill="url(#${prefix}-frame)" stroke="#819899" stroke-width=".8"/>
      <path d="M28 121H434M28 126H434" stroke="#edf1ed" stroke-width=".65"/>
      <rect x="28" y="129" width="12" height="4" rx="1" fill="#6e8485"/><rect x="421" y="129" width="12" height="4" rx="1" fill="#6e8485"/>
      ${adjustable ? `
      <g class="chamber-thermal-link" data-contact-y="118">
        <path d="M85 126H96V179H85ZM440 126H451V179H440Z" fill="url(#${prefix}-front)" stroke="#81918e" stroke-width=".7"/>
        <path d="M88 130V175M448 130V175" stroke="#e8eae2" stroke-width="1.8"/>
      </g>
      <path d="M88 177L96 170H444L451 178V227H85V183Z" fill="url(#${prefix}-frame)" stroke="#6f8589"/>
      <rect x="85" y="179" width="366" height="47" rx="5" fill="url(#${prefix}-front)" stroke="#6f8589"/>
      <path d="M90 182H445M90 222H445" stroke="#fafbf7" stroke-width="1" opacity=".7"/>
      <rect x="98" y="226" width="25" height="5" rx="2" fill="#526568"/><rect x="413" y="226" width="25" height="5" rx="2" fill="#526568"/>
      <text x="103" y="207" fill="#405657" font-size="13" font-family="inherit">溫控裝置</text>
      <circle cx="241" cy="203" r="13" fill="url(#${prefix}-knob)" stroke="#7e9393"/><path d="M241 192V199" stroke="#f6f8ee" stroke-width="1.5" stroke-linecap="round"/>
      <rect class="chamber-meter" x="310" y="187" width="112" height="30" rx="4" fill="#364d4d" stroke="#8fa5a0" stroke-width="1.2"/>
      <rect x="314" y="191" width="104" height="22" rx="2" fill="#e3eee0"/>
      <text x="316" y="184" fill="#536b66" font-size="8.5" font-family="inherit">腔內空氣溫度</text>
      ` : ''}
      <g class="rig-heat-light" opacity="0"><path d="M29 123H445${adjustable?'M91 123V175M445 123V175':''}" stroke="#e89a56" stroke-width="4" fill="none"/><circle cx="282" cy="197" r="3" fill="#f49a43" stroke="#f5dcc0" visibility="${adjustable?'visible':'hidden'}"/></g>
      <g class="rig-cold-light" opacity="0"><path d="M29 123H445${adjustable?'M91 123V175M445 123V175':''}" stroke="#70b6d1" stroke-width="4" fill="none"/><circle cx="282" cy="209" r="3" fill="#57add5" stroke="#d5f1fa" visibility="${adjustable?'visible':'hidden'}"/></g>
    </g>
    <g class="medium-interior" clip-path="url(#${prefix}-air)"></g>
    <g class="chamber-source-layer"></g>
    <g class="chamber-surface">
      <path d="M31 29H93L65 115H31Z" fill="#fff" opacity=".055"/>
      <path d="M31 29V114M431 29V114" stroke="#f6fbf8" stroke-width="1.1" opacity=".65"/>
      <ellipse cx="58" cy="115" rx="7" ry="2.4" fill="#6f8786" stroke="#bbc9c1" stroke-width=".7"/>
      ${adjustable ? `
      <path class="chamber-sensor-cable" d="M424 21H448V161Q448 169 430 169H411V185" fill="none" stroke="#354a4b" stroke-width="2.6" stroke-linecap="round"/>
      <rect x="407" y="183" width="8" height="5" rx="1" fill="#526967" stroke="#c6d0ca" stroke-width=".6"/>
      <rect class="chamber-probe-port" x="417" y="17" width="14" height="12" rx="2" fill="url(#${prefix}-front)" stroke="#617b7e" stroke-width=".7"/>
      <path class="chamber-probe-stem" d="M424 27V80" stroke="#687f88" stroke-width="4" stroke-linecap="round"/><path d="M423.2 30V76" stroke="#f1f5f0" stroke-width="1.1"/>
      <circle class="chamber-probe-tip" cx="424" cy="82" r="3" fill="#a2b9bf" stroke="#58707c" stroke-width=".8"/>
      ` : ''}
    </g>`;
  if (!adjustable) for (const node of chamber.querySelectorAll('.rig-heat-light,.rig-cold-light')) node.remove();
  const hot = chamber.querySelector('.rig-heat-light'), cold = chamber.querySelector('.rig-cold-light');
  return {
    interior: chamber.querySelector('.medium-interior'), sourceLayer: chamber.querySelector('.chamber-source-layer'),
    paint() {},
    setTemperature(value, target) {
      chamber.dataset.temperature = value.toFixed(4);
      hot?.setAttribute('opacity', target===30 ? '1' : '0');
      cold?.setAttribute('opacity', target===0 ? '1' : '0');
      chamber.setAttribute('aria-label', `${adjustable?'可調溫':'參考'}空氣腔體，${value.toFixed(1)} 攝氏度${adjustable?'，控溫底座以導熱夾套連接腔體，溫度探棒位於腔內':''}`);
    }
  };
}
