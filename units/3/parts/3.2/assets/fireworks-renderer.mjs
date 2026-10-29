import { seededRandom } from './fireworks-model.mjs?v=1';

// 解析式阻力、重力與尾跡；重播與不同螢幕更新率呈現相同的一發煙火。
export class FireworkRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this.stars = [];
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    this.width = bounds.width; this.height = bounds.height;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(bounds.width * ratio);
    this.canvas.height = Math.round(bounds.height * ratio);
    this.context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.draw(this.elapsed ?? -1);
  }

  prepare(seed) {
    const random = seededRandom(seed);
    const palettes = [[255, 193, 100], [255, 173, 148], [174, 213, 255]];
    this.color = palettes[seed % palettes.length];
    this.origin = { x: .57 + random() * .12, y: .32 + random() * .025 };
    this.stars = Array.from({ length: 172 }, (_, index) => ({
      angle: index * Math.PI * 2 / 172 + (random() - .5) * .06,
      speed: index % 3 ? .255 + random() * .095 : .11 + random() * .12,
      life: 2.8 + random() * 1.8,
      width: .75 + random() * .8,
      phase: random() * Math.PI * 2,
      delay: random() * .025,
      cool: index % 13 === 0
    }));
    this.draw(-1);
  }

  position(star, time) {
    const drag = (1 - Math.exp(-1.55 * time)) / 1.55;
    return {
      x: this.width * (this.origin.x + Math.cos(star.angle) * star.speed * drag + .006 * time),
      y: this.height * this.origin.y + this.width * (Math.sin(star.angle) * star.speed * drag * .82 + .018 * time * time)
    };
  }

  draw(elapsed) {
    this.elapsed = elapsed;
    const ctx = this.context, w = this.width, h = this.height;
    if (!ctx || !w || !h) return;
    ctx.clearRect(0, 0, w, h);
    if (elapsed < 0 || elapsed > 5.1 || !this.stars.length) return;
    const time = this.reducedMotion.matches ? .62 : elapsed;
    const globalFade = this.reducedMotion.matches ? Math.min(1, Math.max(0, (4.7 - elapsed) / 1.7)) : 1;
    const x = this.origin.x * w, y = this.origin.y * h;
    const color = this.color;

    // 爆開時的短暫光暈；其後留有淡煙與水面反光。
    const flash = Math.exp(-elapsed * 15);
    ctx.globalCompositeOperation = 'screen';
    const halo = ctx.createRadialGradient(x, y, 0, x, y, w * .2);
    halo.addColorStop(0, 'rgba(255,248,221,' + (.85 * flash) + ')');
    halo.addColorStop(.18, 'rgba(255,204,125,' + (.38 * flash) + ')');
    halo.addColorStop(1, 'rgba(255,179,86,0)');
    ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);
    const smoke = ctx.createRadialGradient(x + elapsed * w * .012, y, 0, x, y, w * .17);
    smoke.addColorStop(0, 'rgba(176,174,192,' + (.055 * Math.min(elapsed, 1) * Math.max(0, 1 - elapsed / 5)) + ')');
    smoke.addColorStop(1, 'rgba(176,174,192,0)');
    ctx.fillStyle = smoke; ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath(); ctx.rect(0, h * .60, w, h * .17); ctx.clip();
    const reflected = ctx.createRadialGradient(x, h * .66, 0, x, h * .66, w * .14);
    reflected.addColorStop(0, 'rgba(255,181,82,' + (.17 * Math.exp(-elapsed / 1.3)) + ')');
    reflected.addColorStop(1, 'rgba(255,181,82,0)');
    ctx.fillStyle = reflected; ctx.fillRect(0, 0, w, h); ctx.restore();

    ctx.lineCap = 'round';
    for (const star of this.stars) {
      const age = time - star.delay;
      if (age < 0 || age > star.life) continue;
      const fade = Math.pow(1 - age / star.life, .65) * globalFade;
      const rgb = star.cool ? [230, 240, 255] : color;
      const tail = .55 + Math.min(age, 1.8) * .4;
      const head = this.position(star, age);
      const start = this.position(star, Math.max(0, age - tail));
      ctx.shadowColor = 'rgb(' + rgb.join(',') + ')'; ctx.shadowBlur = 5;
      const trail = ctx.createLinearGradient(start.x, start.y, head.x, head.y);
      trail.addColorStop(0, 'rgba(' + rgb.join(',') + ',0)');
      trail.addColorStop(1, 'rgba(' + rgb.join(',') + ',' + (.88 * fade) + ')');
      ctx.strokeStyle = trail; ctx.lineWidth = star.width;
      ctx.beginPath();
      for (let i = 0; i <= 9; i++) {
        const point = this.position(star, Math.max(0, age - tail + tail * i / 9));
        if (!i) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
      const twinkle = age < .8 ? 1 : .58 + .42 * Math.sin(age * 25 + star.phase) ** 2;
      ctx.fillStyle = 'rgba(255,249,229,' + (fade * twinkle) + ')';
      ctx.beginPath(); ctx.arc(head.x, head.y, star.width * .85, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
  }
}
