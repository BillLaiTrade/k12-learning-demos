import { cupGeometry, aboveWater } from './cup-lab-model.mjs';
const X = x => 500 + x * 24, Y = y => 210 + y * 24;
const f = n => Number(n).toFixed(2);
export function cupSVG(state, { id = 'cup', mini = false, zoom = false, bubbles = [] } = {}) {
  const g = cupGeometry(state.depth, state.angle, state.escaped), centerY = Y(state.depth - 5);
  const points = g.polygon.map(p => `${f(X(p.x))},${f(Y(p.y))}`).join(' ');
  const level = Y(g.water), paper = { x: X(g.paper.x), y: Y(g.paper.y) };
  const camera = Math.max(0, Math.min(1, (state.depth + 1) / 13));
  const view = zoom ? `${X(g.outlet.x) - 180} ${Y(g.outlet.y) - 190} 360 280` : `0 ${-80 + 210 * camera} 1000 ${720 - 220 * camera}`;
  const callout = (key, label, y, target) => `<g class="cup-callout" data-cup-hint="${key}" aria-hidden="true"><path d="M${target.x} ${target.y}L670 ${y}H700" fill="none" stroke="#385f52" stroke-width="2"/><circle cx="${target.x}" cy="${target.y}" r="5" fill="#176b53" stroke="#fffdf4" stroke-width="2"/><rect x="696" y="${y - 20}" width="${label.length * 24 + 28}" height="40" rx="19" fill="#fffdf2" stroke="#94ac8b" stroke-width="1.5"/><text x="710" y="${y + 8}" font-size="23" font-weight="700" fill="#284e40">${label}</text></g>`;
  const airPoints = aboveWater(g.polygon, g.water);
  const airTarget = airPoints.length ? { x: X(airPoints.reduce((a, p) => a + p.x, 0) / airPoints.length), y: Y(airPoints.reduce((a, p) => a + p.y, 0) / airPoints.length) } : { x: 500, y: centerY };
  const foldedPaper = `<image href="assets/cup-paper.webp" x="-21" y="-94.8" width="42" height="42" ${state.wet ? `filter="url(#wet-paper-${id})"` : ''}/>`;
  const labelMarkup = mini || zoom ? '' : callout('surface', '外側水面', 220, { x: 854, y: 210 }) + callout('paper', state.wet ? '紙團已沾水' : '乾紙團', 305, paper) + callout('air', g.airArea > .1 ? '杯內空氣' : '杯內的水', 415, airTarget);
  return `<svg viewBox="${view}" role="img" aria-label="${state.angle ? '杯子傾斜，空氣從杯口逸出，水進入' : '杯口朝下的透明杯'}；紙團${state.wet ? '已沾水' : '保持乾燥'}" xmlns="http://www.w3.org/2000/svg"><defs>
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
  <g clip-path="url(#interior-${id})"><rect x="0" y="-100" width="1000" height="1000" fill="url(#air-${id})"/><g clip-path="url(#watercut-${id})"><rect x="99" y="130" width="802" height="500" fill="url(#water-${id})"/><image href="assets/cup-water-caustics.webp" x="99" y="210" width="802" height="365" preserveAspectRatio="none" opacity=".64"/></g><path d="M0 ${level}H1000" stroke="#6dabb5" stroke-width="2.5"/></g>
  <g transform="translate(500 ${centerY}) rotate(${-state.angle}) scale(1.3333333333)" class="cup-glass"><path d="M-72 90L-57.6 -83Q-56 -90 -46 -90H46Q56 -90 57.6 -83L72 90" fill="url(#glass-${id})" stroke="#4f7b88" stroke-width="2.8"/><path d="M-66 86L-53 -78M57 -75L69 85" fill="none" stroke="#f9ffff" stroke-width="4.2" opacity=".9"/><ellipse cx="0" cy="-88" rx="57" ry="8" fill="#ebf7f3" fill-opacity=".65" stroke="#5f8790" stroke-width="2.5"/><ellipse cx="0" cy="-89" rx="48" ry="4.5" fill="#fffef7" fill-opacity=".6" stroke="#b3d2d5" stroke-width="1.5"/>${foldedPaper}<ellipse cx="0" cy="90" rx="72" ry="10" fill="none" stroke="#3e7282" stroke-width="3"/><path d="M-71 91Q0 107 71 91" fill="none" stroke="#f6ffff" stroke-width="3"/></g>
  ${bubbles.map(b => `<circle cx="${f(b.x)}" cy="${f(b.y)}" r="${b.r}" fill="#f8ffff" fill-opacity=".35" stroke="#eaffff" stroke-width="2.2"/><circle cx="${f(b.x - b.r * .25)}" cy="${f(b.y - b.r * .3)}" r="${b.r * .25}" fill="#fff" opacity=".8"/>`).join('')}
  <path d="M91 185V581L125 599H876L909 581V185M99 190V575H901V190M91 185H909M126 165V194M875 165V194" fill="none" stroke="#5b8997" stroke-width="3"/><path d="M96 187V579L125 593H875L904 579V187M102 194V569H897" fill="none" stroke="#f8ffff" stroke-width="2.4" opacity=".85"/>
  ${labelMarkup}</svg>`;
}
