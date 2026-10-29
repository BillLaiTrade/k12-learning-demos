import { cupGeometry } from './cup-lab-model.mjs?v=cup-lab-6';
const X = x => 500 + x * 24, Y = y => 210 + y * 24;
const f = n => Number(n).toFixed(2);
export function cupSVG(state, { id = 'cup', mini = false, bubbles = [] } = {}) {
  const g = cupGeometry(state.depth, state.angle, state.escaped, state.waterArea), centerY = Y(state.depth - 5);
  const points = g.polygon.map(p => `${f(X(p.x))},${f(Y(p.y))}`).join(' ');
  const level = Y(g.water);
  const camera = Math.max(0, Math.min(1, (state.depth + 1) / 13));
  const view = `0 ${-80 + 210 * camera} 1000 ${720 - 220 * camera}`;
  const foldedPaper = `<image href="assets/cup-paper.webp" x="-32" y="-89.6" width="64" height="64" ${state.wet ? `filter="url(#wet-paper-${id})"` : ''}/>`;
  return `<svg viewBox="${view}" role="img" aria-label="${state.angle ? '傾斜的透明杯' : '杯口朝下的透明杯'}；紙團${state.wet ? '已沾水' : '保持乾燥'}" xmlns="http://www.w3.org/2000/svg"><defs>
  <linearGradient id="room-${id}" x2="0" y2="1"><stop stop-color="#f6f8ed"/><stop offset="1" stop-color="#f4e9d5"/></linearGradient>
  <linearGradient id="water-${id}" x2="0" y2="1"><stop stop-color="#b5e6e8"/><stop offset="1" stop-color="#8fcbd6"/></linearGradient>
  <linearGradient id="glass-${id}"><stop stop-color="#effcff" stop-opacity=".76"/><stop offset=".09" stop-color="#568b9b" stop-opacity=".18"/><stop offset=".27" stop-color="#fff" stop-opacity=".05"/><stop offset=".75" stop-color="#fff" stop-opacity=".04"/><stop offset=".92" stop-color="#b0d4df" stop-opacity=".5"/><stop offset="1" stop-color="#f7ffff" stop-opacity=".85"/></linearGradient>
  <linearGradient id="air-${id}"><stop stop-color="#fffdf1" stop-opacity=".93"/><stop offset=".5" stop-color="#f5fcf6" stop-opacity=".88"/><stop offset="1" stop-color="#fffdf1" stop-opacity=".93"/></linearGradient>
  <linearGradient id="paper-${id}" x2=".8" y2="1"><stop stop-color="${state.wet ? '#dcebed' : '#fffef9'}"/><stop offset="1" stop-color="${state.wet ? '#a0c6cc' : '#e8e7db'}"/></linearGradient>
  <clipPath id="interior-${id}"><polygon points="${points}"/></clipPath><clipPath id="watercut-${id}"><rect x="0" y="${level}" width="1000" height="1200"/></clipPath><clipPath id="tank-${id}"><rect x="99" y="210" width="802" height="365"/></clipPath>
  <filter id="wet-paper-${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".6 0 0 0 .12 0 .75 0 0 .12 0 0 .8 0 .12 0 0 0 1 0"/></filter></defs>
  <rect x="-100" y="-100" width="1200" height="900" fill="url(#room-${id})"/>
  <path d="M0 581H1000V720H0Z" fill="#e6cda8"/><path d="M0 600H1000M0 635H1000M0 674H1000" stroke="#d8b58b" stroke-width="3" opacity=".5"/>
  <ellipse cx="500" cy="601" rx="423" ry="13" fill="#baa47d" opacity=".15"/>
  <path d="M91 185L126 165H875L909 185V581L876 599H125L91 581Z" fill="#d8ebdf" fill-opacity=".2" stroke="#8daeb0" stroke-width="3"/>
  <path d="M101 210L131 194H870L899 210Z" fill="#d1f5f3" stroke="#89c4ce" stroke-width="2"/>
  <rect x="99" y="210" width="802" height="365" fill="url(#water-${id})"/>
  <image href="assets/cup-water-caustics.webp" x="99" y="210" width="802" height="365" preserveAspectRatio="none" clip-path="url(#tank-${id})" opacity=".64"/>
  <path d="M99 210Q240 205 360 210T630 210T901 210" fill="none" stroke="#f0ffff" stroke-width="4" opacity=".85"/>
  <g clip-path="url(#interior-${id})"><rect x="0" y="-180" width="1000" height="1080" fill="url(#air-${id})"/><g class="cup-contained-water" clip-path="url(#watercut-${id})"><rect class="cup-water-fill" x="99" y="-180" width="802" height="1080" fill="url(#water-${id})"/><image href="assets/cup-water-caustics.webp" x="99" y="-155" width="802" height="365" preserveAspectRatio="none" opacity=".64"/><image href="assets/cup-water-caustics.webp" x="99" y="210" width="802" height="365" preserveAspectRatio="none" opacity=".64"/></g><path d="M0 ${level}H1000" stroke="#6dabb5" stroke-width="2.5"/></g>
  ${g.draining && g.drainPoint.y < 0 ? `<path class="cup-drain-stream" d="M${f(X(g.drainPoint.x))} ${f(Y(g.drainPoint.y))}Q${f(X(g.drainPoint.x) + 7)} ${f((Y(g.drainPoint.y) + 210) / 2)} ${f(X(g.drainPoint.x))} 210" fill="none" stroke="#67aeba" stroke-width="5" stroke-linecap="round" opacity=".8"/><ellipse cx="${f(X(g.drainPoint.x))}" cy="211" rx="16" ry="3" fill="none" stroke="#eaffff" stroke-width="2"/>` : ''}
  <g transform="translate(500 ${centerY}) rotate(${-state.angle}) scale(1.3333333333)" class="cup-glass"><path d="M-72 90L-57.6 -83Q-56 -90 -46 -90H46Q56 -90 57.6 -83L72 90" fill="url(#glass-${id})" stroke="#4f7b88" stroke-width="2.8"/><path d="M-66 86L-53 -78M57 -75L69 85" fill="none" stroke="#f9ffff" stroke-width="4.2" opacity=".9"/><ellipse cx="0" cy="-88" rx="57" ry="8" fill="#ebf7f3" fill-opacity=".65" stroke="#5f8790" stroke-width="2.5"/><ellipse cx="0" cy="-89" rx="48" ry="4.5" fill="#fffef7" fill-opacity=".6" stroke="#b3d2d5" stroke-width="1.5"/>${foldedPaper}<ellipse class="cup-rim" cx="0" cy="90" rx="72" ry="10" fill="none" stroke="#3e7282" stroke-width="3"/><path d="M-71 91Q0 107 71 91" fill="none" stroke="#f6ffff" stroke-width="3"/><ellipse class="cup-rim-handle" data-cup-handle="rim" cx="0" cy="90" rx="72" ry="13" fill="transparent" stroke="transparent" stroke-width="30" vector-effect="non-scaling-stroke" pointer-events="all"/></g>
  ${bubbles.map(b => `<circle cx="${f(b.x)}" cy="${f(b.y)}" r="${b.r}" fill="#f8ffff" fill-opacity=".35" stroke="#eaffff" stroke-width="2.2"/><circle cx="${f(b.x - b.r * .25)}" cy="${f(b.y - b.r * .3)}" r="${b.r * .25}" fill="#fff" opacity=".8"/>`).join('')}
  <path d="M91 185V581L125 599H876L909 581V185M99 190V575H901V190M91 185H909M126 165V194M875 165V194" fill="none" stroke="#5b8997" stroke-width="3"/><path d="M96 187V579L125 593H875L904 579V187M102 194V569H897" fill="none" stroke="#f8ffff" stroke-width="2.4" opacity=".85"/>
  </svg>`;
}
