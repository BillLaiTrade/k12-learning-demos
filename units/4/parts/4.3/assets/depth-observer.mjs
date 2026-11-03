import { TANK, observerCamera, cameraDirection, traceViewRay } from './depth-model.mjs?v=20261103-dual2';

export function createTextures(photo) {
  const texture = (sx, sy, sw, sh, width = 256, height = 128) => {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (photo) ctx.drawImage(photo, sx, sy, sw, sh, 0, 0, width, height);
    else { ctx.fillStyle = '#c18c52'; ctx.fillRect(0, 0, width, height); }
    return { data: ctx.getImageData(0, 0, width, height).data, width, height };
  };
  const coin = document.createElement('canvas'); coin.width = coin.height = 256;
  const c = coin.getContext('2d', { willReadFrequently: true });
  const gradient = c.createLinearGradient(20, 0, 220, 256);
  gradient.addColorStop(0, '#fbe5a7'); gradient.addColorStop(.3, '#cb8c45'); gradient.addColorStop(.55, '#f5d088'); gradient.addColorStop(1, '#94542b');
  c.fillStyle = gradient; c.fillRect(0, 0, 256, 256);
  for (const [r, color, width] of [[123, '#6c431f', 3], [119, '#ffe8b5', 2], [111, '#915f30', 3], [106, '#f5d59b', 2]]) {
    c.beginPath(); c.arc(128, 128, r, 0, Math.PI * 2); c.strokeStyle = color; c.lineWidth = width; c.stroke();
  }
  for (let a = 0; a < 360; a += 6) {
    const x = Math.cos(a * Math.PI / 180), y = Math.sin(a * Math.PI / 180);
    c.beginPath(); c.moveTo(128 + 114 * x, 128 + 114 * y); c.lineTo(128 + 120 * x, 128 + 120 * y); c.strokeStyle = '#fff0bf'; c.lineWidth = 2; c.stroke();
  }
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 100px serif';
  c.fillStyle = '#fff0b6'; c.fillText('1', 129, 121); c.fillStyle = '#805027'; c.fillText('1', 127, 119);
  c.font = '22px serif'; c.fillText('光 的 探 索', 128, 185);
  return { wood: texture(260, 320, 700, 180), water: texture(270, 620, 700, 210),
    coin: { data: c.getImageData(0, 0, 256, 256).data, width: 256, height: 256 } };
}

const sample = (t, u, v) => {
  const x = ((Math.floor(u * t.width) % t.width) + t.width) % t.width;
  const y = ((Math.floor(v * t.height) % t.height) + t.height) % t.height;
  const i = (y * t.width + x) * 4;
  return [t.data[i], t.data[i + 1], t.data[i + 2]];
};

export function renderObserver(canvas, geometry, textures) {
  // Event-driven CPU ray tracing: no continuous water animation or external 3D library.
  const width = Math.max(360, Math.min(640, Math.round(canvas.clientWidth * Math.min(devicePixelRatio || 1, 1.3))));
  const height = Math.round(width * 500 / 720);
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  const frame = ctx.createImageData(width, height), pixels = frame.data;
  const camera = observerCamera(geometry, width / height);
  let coinPixels = 0, minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const direction = cameraDirection(camera, 2 * (x + .5) / width - 1, 1 - 2 * (y + .5) / height);
    const hit = traceViewRay(geometry, camera.origin, direction);
    let color;
    if (!hit) {
      color = sample(textures.wood, x / width * 1.4, y / height * .75);
      color = color.map(v => v * .86);
    } else if (hit.kind === 'rim') {
      color = [203, 213, 187];
    } else if (hit.kind === 'outside') {
      // Frosted, backed near wall gives the occlusion an actual visible cause.
      const p = hit.point, vertical = p[1] / TANK.height;
      color = [39 + vertical * 35, 99 + vertical * 47, 100 + vertical * 48];
      const edge = Math.min(Math.abs(p[2] - TANK.width / 2), Math.abs(p[2] + TANK.width / 2));
      if (edge < 2 || p[1] < 3) color = [153, 189, 175];
      if (p[1] > TANK.height - 4) color = [218, 231, 206];
    } else {
      const p = hit.point;
      if (hit.kind === 'coin') {
        color = sample(textures.coin, (p[2] / TANK.coinRadius + 1) / 2,
          (p[0] - TANK.coinX + TANK.coinRadius) / (TANK.coinRadius * 2));
        coinPixels++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      } else {
        color = sample(textures.wood, p[2] / 160, p[0] / 220 + p[1] / 180);
        const wallShade = hit.kind === 'wall' ? .70 : .90;
        color = color.map(v => v * wallShade);
      }
      if (hit.wet) {
        const caustic = sample(textures.water, p[2] / 180 + .2, p[0] / 210 + p[1] / 140);
        const tint = hit.kind === 'coin' ? .08 : .65;
        color = color.map((v, i) => v * (1 - tint) + caustic[i] * tint);
        const distance = hit.distance;
        color[0] *= Math.exp(-distance * .0016);
        color[1] *= Math.exp(-distance * .00025);
        color[2] += 8;
      }
    }
    const i = (y * width + x) * 4;
    pixels[i] = color[0]; pixels[i + 1] = color[1]; pixels[i + 2] = color[2]; pixels[i + 3] = 255;
  }
  ctx.putImageData(frame, 0, 0);
  const bounds = coinPixels ? { x: minX / width, y: minY / height, width: (maxX - minX + 1) / width, height: (maxY - minY + 1) / height } : null;
  return { coinPixels, bounds, width, height };
}
