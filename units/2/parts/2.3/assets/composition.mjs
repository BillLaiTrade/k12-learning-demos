const section = document.querySelector('#s2');
const controls = [...section.querySelectorAll('[data-air-gas]')];
const status = section.querySelector('#air-highlight-status');
const descriptions = {
  all: '氮氣最多，氧氣次之；其他氣體合計約 1%。',
  nitrogen: '氮氣約占 78%：100 份乾燥空氣中，約有 78 份是氮氣。',
  oxygen: '氧氣約占 21%：100 份乾燥空氣中，約有 21 份是氧氣。',
  other: '其他氣體合計約占 1%，包含氬氣、二氧化碳等；不是只有一種氣體。'
};
let selected = 'all';
const emphasize = gas => { section.dataset.emphasis = gas; };
for (const button of controls) {
  button.addEventListener('click', () => {
    selected = button.dataset.airGas;
    for (const control of controls) control.setAttribute('aria-pressed', String(control === button));
    status.textContent = descriptions[selected];
    emphasize(selected);
  });
  button.addEventListener('pointerenter', () => emphasize(button.dataset.airGas));
  button.addEventListener('pointerleave', () => emphasize(selected));
  button.addEventListener('focus', () => emphasize(button.dataset.airGas));
  button.addEventListener('blur', () => emphasize(selected));
}
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
