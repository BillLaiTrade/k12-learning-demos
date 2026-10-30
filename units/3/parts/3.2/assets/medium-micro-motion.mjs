// 微觀運動的視覺示意，與聲波位移、聲速及實時計時分開。
// 內層只作小幅游移；外層仍由聲波模型控制縱向位移。
export function createMicroMotion(points, kind) {
  if (!['air', 'water'].includes(kind)) return [];
  const extent = kind === 'air' ? { x: 1.6, y: 1.1 } : { x: .45, y: .3 };
  return points.map(({ node }, index) => {
    const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    layer.classList.add('particle-micro-motion');
    while (node.firstChild) layer.append(node.firstChild);
    node.append(layer);
    const noise = step => {
      const seed = Math.sin((index + 1) * 127.1 + step * 311.7) * 43758.5453;
      return 2 * (seed - Math.floor(seed)) - 1;
    };
    const frames = Array.from({ length: 7 }, (_, step) => ({
      transform: `translate(${(noise(step) * extent.x).toFixed(4)}px, ${(noise(step + 9) * extent.y).toFixed(4)}px)`
    }));
    frames.push(frames[0]);
    const duration = 2600 + (noise(21) + 1) * 900;
    const animation = layer.animate(frames, { duration, iterations: Infinity, easing: 'ease-in-out' });
    animation.pause();
    animation.currentTime = (noise(29) + 1) / 2 * duration;
    return animation;
  });
}
