const objectGroups = ['image-side-object', 'image-front-object', 'image-front-reflection']
  .map((id) => document.getElementById(id));
const removeButton = document.getElementById('remove-image-object');
const restoreButton = document.getElementById('restore-image-object');
const rayButton = document.getElementById('toggle-image-rays');
const rays = document.getElementById('image-side-rays');
const extensions = document.getElementById('image-side-extensions');
const virtualImage = document.getElementById('image-side-virtual');
const legend = document.getElementById('image-ray-legend');
const extensionLegend = document.getElementById('image-extension-legend');
const explanation = document.getElementById('image-explanation');
const status = document.getElementById('image-object-status');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let objectPresent = true;
let showingRays = false;
let revealTimers = [];

function cancelReveal() {
  revealTimers.forEach((timer) => window.clearTimeout(timer));
  revealTimers = [];
}

function hideLightPath() {
  cancelReveal();
  showingRays = false;
  [rays, extensions, virtualImage].forEach((group) => { group.style.display = 'none'; });
  legend.hidden = true;
  extensionLegend.hidden = true;
  explanation.hidden = true;
  rayButton.setAttribute('aria-pressed', 'false');
  rayButton.textContent = '顯示光路';
}

function showExtensions() {
  extensions.style.display = '';
  extensionLegend.hidden = false;
  status.textContent = '再把進入眼睛的反射光向鏡後延長：兩條藍色虛線會交在哪裡？';
}

function showVirtualImage() {
  virtualImage.style.display = '';
  explanation.hidden = false;
  status.textContent = '延長線交在鏡後同一點；眼睛看起來像是光從那裡傳來，那就是虛像的位置。';
}

function showLightPath() {
  cancelReveal();
  showingRays = true;
  rays.style.display = '';
  legend.hidden = false;
  rayButton.setAttribute('aria-pressed', 'true');
  rayButton.textContent = '隱藏光路';
  status.textContent = '先追蹤實線：來自小熊同一點的兩條光，經鏡面反射後進入眼睛。';
  if (reducedMotion.matches) {
    showExtensions();
    showVirtualImage();
    return;
  }
  revealTimers = [
    window.setTimeout(showExtensions, 1400),
    window.setTimeout(showVirtualImage, 2800),
  ];
}

function setObjectPresent(present) {
  hideLightPath();
  objectPresent = present;
  objectGroups.forEach((group) => { group.style.display = present ? '' : 'none'; });
  removeButton.disabled = !present;
  restoreButton.disabled = present;
  rayButton.disabled = !present;
  status.textContent = present
    ? '小熊放回了，鏡中像也回來了。顯示光路，追蹤像的位置。'
    : '小熊移除了，鏡中像也消失了；鏡後並沒有另一隻小熊。';
}

removeButton.addEventListener('click', () => setObjectPresent(false));
restoreButton.addEventListener('click', () => setObjectPresent(true));
rayButton.addEventListener('click', () => {
  if (!objectPresent) return;
  if (showingRays) {
    hideLightPath();
    status.textContent = '光路已隱藏。再按一次「顯示光路」，重新追蹤光與像的位置。';
  } else {
    showLightPath();
  }
});
window.addEventListener('pagehide', hideLightPath);
hideLightPath();
