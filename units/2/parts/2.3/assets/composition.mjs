const section = document.querySelector('#s2');
const controls = [...section.querySelectorAll('[data-air-gas]')];
const status = section.querySelector('#air-highlight-status');
const descriptions = {
  all: '含量依序是氮氣、氧氣、氬氣；其餘氣體只占少量。',
  nitrogen: '氮氣約占 78%：100 份乾燥空氣中，約有 78 份是氮氣。',
  oxygen: '氧氣約占 21%：100 份乾燥空氣中，約有 21 份是氧氣。',
  argon: '氬氣約占全部乾燥空氣的 0.93%，含量第三。斜紋末格合併呈現氬氣與其餘少量氣體。',
  other: '其餘氣體包含二氧化碳等少量成分，不再包含已單獨列出的氬氣；在斜紋末格合併呈現。'
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
