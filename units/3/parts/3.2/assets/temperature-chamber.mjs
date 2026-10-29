import { svgNode } from './sound-speed-rendering.mjs?v=fixed-22';

export const AIR_CHAMBER = { x: 27, y: 27, width: 412, height: 91 };

// 兩組使用相同的緊湊空氣腔體，固定比較 0°C 與 80°C。
export function airChamberScene(root, prefix) {
  const chamber = svgNode('g', { class: 'medium-scene air-chamber', 'data-material': 'air', 'aria-hidden': 'true' }, root);
  chamber.innerHTML = `
    <defs>
      <linearGradient id="${prefix}-frame" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#eff3f1"/><stop offset=".21" stop-color="#acbcc0"/><stop offset=".45" stop-color="#f9fbf9"/><stop offset=".72" stop-color="#81999f"/><stop offset="1" stop-color="#c9d3d2"/></linearGradient>
      <linearGradient id="${prefix}-front" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#7e939a"/><stop offset=".09" stop-color="#f1f3ee"/><stop offset=".42" stop-color="#b9c4c4"/><stop offset=".68" stop-color="#edf0ec"/><stop offset="1" stop-color="#74898e"/></linearGradient>
      <linearGradient id="${prefix}-glass" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e8f3ed" stop-opacity=".16"/><stop offset=".45" stop-color="#fffefa" stop-opacity="0"/><stop offset="1" stop-color="#c3d5cd" stop-opacity=".13"/></linearGradient>

      <clipPath id="${prefix}-air"><rect x="27" y="27" width="412" height="91" rx="4"/></clipPath>
    </defs>
    <g class="chamber-body">
      <path d="M26 24L35 16H442L435 24Z" fill="url(#${prefix}-frame)" stroke="#829a9a" stroke-width=".65"/>
      <path d="M435 24L442 16V113L435 122Z" fill="url(#${prefix}-front)" stroke="#829a9a" stroke-width=".65"/>
      <rect x="24" y="23" width="412" height="98" rx="5" fill="url(#${prefix}-glass)" stroke="#9bb4ac" stroke-width="1.5"/>
      <path d="M28 26H431M28 118H431" stroke="#e2eae4" stroke-width="2"/>
      <rect class="chamber-base" x="24" y="118" width="427" height="11" rx="2" fill="url(#${prefix}-frame)" stroke="#819899" stroke-width=".8"/>
      <path d="M28 121H434M28 126H434" stroke="#edf1ed" stroke-width=".65"/>
      <rect x="28" y="129" width="12" height="4" rx="1" fill="#6e8485"/><rect x="421" y="129" width="12" height="4" rx="1" fill="#6e8485"/>

    </g>
    <g class="medium-interior" clip-path="url(#${prefix}-air)"></g>
    <g class="chamber-source-layer"></g>
    <g class="chamber-surface">
      <path d="M31 29H93L65 115H31Z" fill="#fff" opacity=".055"/>
      <path d="M31 29V114M431 29V114" stroke="#f6fbf8" stroke-width="1.1" opacity=".65"/>
      <ellipse cx="58" cy="115" rx="7" ry="2.4" fill="#6f8786" stroke="#bbc9c1" stroke-width=".7"/>

    </g>`;
  return {
    interior: chamber.querySelector('.medium-interior'), sourceLayer: chamber.querySelector('.chamber-source-layer'),
    paint() {},
    setTemperature(value) {
      chamber.dataset.temperature = value.toFixed(4);
      chamber.setAttribute('aria-label', `${value.toFixed(0)} 攝氏度空氣腔體`);
    }
  };
}
