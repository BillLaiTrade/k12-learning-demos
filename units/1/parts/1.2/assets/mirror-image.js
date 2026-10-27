const section = document.getElementById('card-03');
const objectGroups = ['image-side-object', 'image-front-object', 'image-front-reflection']
  .map((id) => document.getElementById(id));
const objectButton = document.getElementById('toggle-image-object');
const stepButton = document.getElementById('toggle-image-rays');
const resetButton = document.getElementById('reset-image-activity');
const status = document.getElementById('image-object-status');
const heading = document.getElementById('image-step-title');
const rays = document.getElementById('image-side-rays');
const mirrorGuides = document.getElementById('image-mirror-guides');
const extensions = document.getElementById('image-side-extensions');
const virtualImage = document.getElementById('image-side-virtual');
const virtualRegion = document.getElementById('image-virtual-region');
const finalExplanation = document.getElementById('image-final-explanation');

let objectPresent = true;
let step = 0;
const steps = [
  {
    title: '1 · 先觀察鏡中像',
    action: '追蹤反射光',
    message: '小熊面向鏡子。試著移除小熊，再放回來，觀察鏡中像是否一起消失、出現。',
  },
  {
    title: '2 · 光怎麼進入眼睛？',
    action: '延長光路找像',
    message: '從小熊鼻尖的同一點出發，沿棕色實線走到鏡面，再跟著箭頭走進小葵的眼睛。鏡面標記指出兩條光反射的位置。',
  },
  {
    title: '3 · 像看起來在哪裡？',
    action: '重新觀察',
    message: '把進入眼睛的反射光反向延長：藍色虛線交在鏡後，對應小熊鼻尖的虛像位置。眼睛看起來像是光從那裡傳來。',
  },
];
function show(group, visible) {
  group.style.display = visible ? 'inline' : 'none';
}
// Render the complete state on every action. Restoration does not depend on
// prior inline styles or delayed animation; one button keeps its position.
function render(message) {
  objectGroups.forEach((group) => show(group, objectPresent));
  show(rays, objectPresent && step >= 1);
  show(mirrorGuides, objectPresent && step >= 1);
  [extensions, virtualImage, virtualRegion].forEach((group) => show(group, objectPresent && step === 2));
  finalExplanation.style.visibility = objectPresent && step === 2 ? 'visible' : 'hidden';
  objectButton.textContent = objectPresent ? '移除小熊' : '放回小熊';
  stepButton.disabled = !objectPresent;
  stepButton.textContent = steps[step].action;
  heading.textContent = objectPresent ? steps[step].title : '小熊移除了 · 再放回來看看';
  status.textContent = message || (objectPresent ? steps[step].message
    : '小熊移除後，鏡中像也消失了。按同一顆「放回小熊」按鈕，或按「重設」，讓它回到鏡前。');
  section.dataset.imageStep = String(step);
  section.dataset.objectPresent = String(objectPresent);
}
objectButton.addEventListener('click', () => {
  objectPresent = !objectPresent;
  step = 0;
  render(objectPresent ? '小熊已放回鏡前，鏡中像也回來了。接著追蹤反射光，看看光如何進入眼睛。' : undefined);
});
stepButton.addEventListener('click', () => {
  if (!objectPresent) return;
  step = (step + 1) % steps.length;
  render();
});
resetButton.addEventListener('click', () => {
  objectPresent = true;
  step = 0;
  render('已重設：小熊面向鏡子，鏡中像可見。可以重新移除、放回，或追蹤光路。');
});
render();
