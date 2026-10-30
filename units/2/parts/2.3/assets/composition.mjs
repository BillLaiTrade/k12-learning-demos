const section = document.querySelector('#s2');
const controls = [...section.querySelectorAll('[data-air-gas]')];
const viewControls = [...section.querySelectorAll('[data-air-view]')];
const shares = [...section.querySelectorAll('.air-share')];
const status = section.querySelector('#air-highlight-status');
const panel = section.querySelector('.air-composition-panel');
const minor = section.querySelector('[data-component="minor"]');
const detail = section.querySelector('.air-other-detail');
const connector = section.querySelector('.air-zoom-link path');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const descriptions = {
  all: '',
  nitrogen: '100份乾燥空氣中，約78份是氮氣（約78%）。',
  oxygen: '100份乾燥空氣中，約21份是氧氣（約21%）。',
  argon: '氬氣占全部乾燥空氣約0.93%。斜紋格合併氬氣與其餘少量；放大圖突出的是氬氣。',
  minor: '斜紋格合併氬氣與其餘少量氣體，合計約1%；氬氣占全部約0.93%。右側兩項與放大圖一併標示，可再選名稱分別查看。',
  other: '其餘氣體包含二氧化碳等，不再包含已單獨列出的氬氣；放大圖突出的是其餘少量成分。'
};
let selected = 'all';
let focused = null;
let hovered = null;
let connectorFrame = 0;
function emphasize() {
  section.dataset.emphasis = hovered || focused || selected;
}
function describe() {
  status.textContent = selected === 'all' ? '' : descriptions[selected] + (section.dataset.arrangement === 'mixed' ? ' 排列改變，比例不變；氣體混合在一起。' : ' 集中排列，方便比較比例。');
}
// A fixed permutation of all 100 positions: every tile moves, no share is added or removed.
// The coarse minor tile stays on the bottom row so its connector does not cross the chart.
const positionOf = index => section.dataset.arrangement === 'mixed' ? (index * 37 + 31) % 100 : index;
shares.forEach((share, index) => {
  const position = (index * 37 + 31) % 100;
  share.style.setProperty('--mix-x', position % 10 - index % 10);
  share.style.setProperty('--mix-y', Math.floor(position / 10) - Math.floor(index / 10));
});
function updateConnector() {
  const p = panel.getBoundingClientRect();
  const m = minor.getBoundingClientRect();
  const d = detail.getBoundingClientRect();
  const g = section.querySelector('.air-share-grid').getBoundingClientRect();
  const x = m.left + m.width / 2 - p.left;
  const y = m.bottom - p.top + 3;
  const endY = d.top - p.top;
  // When the legend stacks between the chart and inset, route through the panel gutter.
  if (section.querySelector('.air-legend').getBoundingClientRect().top > g.bottom) {
    const turnY = g.bottom - p.top + 7;
    connector.setAttribute('d', `M ${x} ${y} V ${turnY} H 6 V ${endY - 9} H 25 V ${endY}`);
  } else {
    connector.setAttribute('d', `M ${x} ${y} V ${endY}`);
  }
}
function followConnector() {
  cancelAnimationFrame(connectorFrame);
  const until = performance.now() + (reducedMotion.matches ? 0 : 420);
  const step = () => {
    updateConnector();
    if (performance.now() < until) connectorFrame = requestAnimationFrame(step);
  };
  connectorFrame = requestAnimationFrame(step);
}
function choose(gas, sourceShare) {
  selected = gas;
  hovered = null;
  focused = gas;
  for (const control of controls) {
    const active = control.dataset.airGas === gas || (gas === 'minor' && ['argon', 'other'].includes(control.dataset.airGas));
    control.setAttribute('aria-pressed', String(active));
  }
  for (const share of shares) {
    const active = share.dataset.component === gas || (share.dataset.component === 'minor' && ['argon', 'other'].includes(gas));
    share.setAttribute('aria-pressed', String(active));
  }
  const target = sourceShare || shares.find(share => share.dataset.component === (['argon', 'other'].includes(gas) ? 'minor' : gas));
  if (target) for (const share of shares) share.tabIndex = share === target ? 0 : -1;
  describe(); emphasize();
}
for (const button of controls) {
  button.disabled = false;
  button.addEventListener('click', () => choose(button.dataset.airGas));
  button.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    hovered = button.dataset.airGas; emphasize();
  });
  button.addEventListener('pointerleave', () => { hovered = null; emphasize(); });
  button.addEventListener('focus', () => { focused = button.dataset.airGas; emphasize(); });
  button.addEventListener('blur', () => { focused = null; emphasize(); });
}
for (const [index, share] of shares.entries()) {
  share.disabled = false;
  share.addEventListener('click', () => choose(share.dataset.component, share));
  share.addEventListener('focus', () => { focused = share.dataset.component; emphasize(); });
  share.addEventListener('blur', () => { focused = null; emphasize(); });
  share.addEventListener('keydown', event => {
    const position = positionOf(index);
    const row = Math.floor(position / 10), column = position % 10;
    const targets = {
      ArrowLeft: row * 10 + Math.max(0, column - 1),
      ArrowRight: row * 10 + Math.min(9, column + 1),
      ArrowUp: Math.max(0, row - 1) * 10 + column,
      ArrowDown: Math.min(9, row + 1) * 10 + column,
      Home: row * 10,
      End: row * 10 + 9
    };
    if (!(event.key in targets)) return;
    event.preventDefault();
    const target = shares.find((_, i) => positionOf(i) === targets[event.key]);
    for (const candidate of shares) candidate.tabIndex = candidate === target ? 0 : -1;
    target.focus({ preventScroll: true });
  });
}
for (const button of viewControls) {
  button.disabled = false;
  button.addEventListener('click', () => {
    section.dataset.arrangement = button.dataset.airView;
    for (const control of viewControls) control.setAttribute('aria-pressed', String(control === button));
    hovered = null; focused = null;
    emphasize(); describe(); followConnector();
  });
}
// Clicking away dismisses the selection without consuming the other action.
document.addEventListener('click', event => {
  const control = event.target.closest('.air-share, [data-air-gas], [data-air-view]');
  if (control && section.contains(control)) return;
  if (selected !== 'all' || section.dataset.emphasis !== 'all') choose('all');
});
new ResizeObserver(followConnector).observe(panel);
updateConnector();
const links = [...document.querySelectorAll('.route a[href^="#"]')];
const sections = links.map(link => document.querySelector(link.getAttribute('href')));
let pending = false;
function updateRoute() {
  pending = false;
  const position = innerHeight * .35;
  const active = sections.reduce((current, element) => element.getBoundingClientRect().top <= position ? element : current, sections[0]);
  for (const link of links) {
    if (link.getAttribute('href') === '#' + active.id) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  }
}
addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(updateRoute); } }, { passive: true });
addEventListener('resize', updateRoute);
updateRoute();
