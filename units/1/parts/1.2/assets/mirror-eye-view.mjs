import {eyeView, projectPoint, planeRow, EYE_PLANES} from './mirror-eye-projection.mjs?v=1';

const polygon = points => 'M' + points.map(p => p.slice(0, 2).join(',')).join('L') + 'Z';
export function createEyeView(section) {
  const find = id => section.querySelector(`#${id}`), view = find('image-front-view');
  const textures = {};
  let current = {y: 108, present: true};
  for (const [name, file] of [['front', 'teddy-front'], ['rear', 'teddy-rear']]) {
    const image = new Image();
    image.onload = () => {textures[name] = image; render(current.y, current.present);};
    image.onerror = () => {view.dataset.ready = 'error';};
    image.src = new URL(`mirror/${file}.webp`, import.meta.url).href;
  }
  const contexts = Object.fromEntries(['front', 'rear'].map(name => [name, find(`image-eye-${name}`).getContext('2d', {willReadFrequently: true})]));
  function paint(name, camera, quad, present) {
    const context = contexts[name], image = textures[name], plane = EYE_PLANES[name];
    context.setTransform(2, 0, 0, 2, 0, 0);context.clearRect(0, 0, 400, 700);
    if (!image || !present) return;
    // Rasterize the projective texture at half a CSS pixel per row. Every row is
    // inverted through the camera, rather than translating or scaling a fixed picture.
    const top = Math.max(0, Math.floor(quad[0][1] * 2) / 2), bottom = Math.min(700, quad[2][1]);
    for (let y = top; y < bottom; y += .5) {
      const a = planeRow(camera, plane, y), b = planeRow(camera, plane, Math.min(y + .5, bottom));
      const row = planeRow(camera, plane, y + .25), start = Math.max(0, a.v), end = Math.min(1, b.v);
      if (end > start) context.drawImage(image, 0, start * image.height, image.width, (end - start) * image.height,
        row.x, y, row.width, .52);
    }
  }
  function table(camera, start, end) {
    return polygon([[start, 570, -2500], [end, 570, -2500], [end, 570, 2500], [start, 570, 2500]].map(p => projectPoint(camera, p)));
  }
  function grain(camera, start, end) {
    let d = '';
    for (let z = -900; z <= 900; z += 90) {
      const a = projectPoint(camera, [start, 570, z]), b = projectPoint(camera, [end, 570, z]);
      d += `M${a[0]},${a[1]}L${b[0]},${b[1]}`;
    }
    for (let x = start; x <= end; x += 140) {
      const a = projectPoint(camera, [x, 570, -2500]), b = projectPoint(camera, [x, 570, 2500]);
      d += `M${a[0]},${a[1]}L${b[0]},${b[1]}`;
    }
    return d;
  }
  function shadow(camera, x) {
    return polygon(Array.from({length: 40}, (_, i) => {
      const a = i * Math.PI / 20;
      return projectPoint(camera, [x + Math.sin(a) * 30, 570, Math.cos(a) * 85]);
    }));
  }
  function render(y, present) {
    current = {y, present};
    const model = eyeView(y), camera = model.camera;
    find('image-eye-frame').setAttribute('d', polygon(model.frame));
    find('image-eye-glass').setAttribute('d', polygon(model.glass));
    find('image-eye-clip-shape').setAttribute('d', polygon(model.glass));
    find('image-eye-table').setAttribute('d', table(camera, 170, 1400));
    find('image-eye-grain').setAttribute('d', grain(camera, 170, 1400));
    find('image-eye-reflected-table').setAttribute('d', table(camera, 540, 1400));
    find('image-eye-reflected-grain').setAttribute('d', grain(camera, 540, 1400));
    find('image-eye-shadow').setAttribute('d', present ? shadow(camera, 345) : '');
    find('image-eye-reflected-shadow').setAttribute('d', present ? shadow(camera, 735) : '');
    const nose = find('image-front-point');nose.setAttribute('cx', model.nose[0]);nose.setAttribute('cy', model.nose[1]);
    paint('front', camera, model.front, present);paint('rear', camera, model.rear, present);
    view.dataset.eyeY = String(y);view.dataset.target = camera.target.join(',');
    view.dataset.frame = JSON.stringify(model.frame);view.dataset.nose = model.nose.slice(0, 2).join(',');
    view.dataset.ready = textures.front && textures.rear ? 'true' : 'loading';
    find('image-front-desc').textContent = present
      ? '與左圖共用眼位，持續看著同一鼻尖。鏡框透視、實物與鏡中像的視大小和遮擋隨小葵高度同步計算；虛像位置不變。'
      : '小熊已移除，只剩鏡面與桌面；放回後恢復同一觀察位置。';
  }
  return render;
}
