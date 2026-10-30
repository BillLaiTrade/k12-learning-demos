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
  all: '氮最多，其次是氧，再來是氬；其餘氣體只占少量。',
  nitrogen: '100份乾燥空氣中，約78份是氮氣（約78%）。',
  oxygen: '100份乾燥空氣中，約21份是氧氣（約21%）。',
  argon: '氬氣占全部乾燥空氣約0.93%。斜紋格合併氬氣與其餘少量；放大圖突出的是氬氣。',
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
  status.textContent = descriptions[selected] + (section.dataset.arrangement === 'mixed' ? ' 排列改變，比例不變；氣體混合在一起。' : ' 集中排列，方便比較比例。');
}
// A fixed permutation of all 100 positions: every tile moves, no share is added or removed.
// The coarse minor tile stays on the bottom row so its connector does not cross the chart.
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
for (const button of controls) {
  button.disabled = false;
  button.addEventListener('click', () => {
    selected = button.dataset.airGas;
    focused = selected;
    hovered = null;
    for (const control of controls) control.setAttribute('aria-pressed', String(control === button));
    describe();
    emphasize();
  });
  button.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    hovered = button.dataset.airGas; emphasize();
  });
  button.addEventListener('pointerleave', () => { hovered = null; emphasize(); });
  button.addEventListener('focus', () => { focused = button.dataset.airGas; emphasize(); });
  button.addEventListener('blur', () => { focused = null; emphasize(); });
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
