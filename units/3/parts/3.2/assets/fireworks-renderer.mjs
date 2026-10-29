import { seededRandom } from './fireworks-model.mjs?v=1';

export const FIREWORK_DURATION = 5.1;

// 三維球殼投影、阻力與重力均依經過時間求值；重播不依賴上一幀的殘影。
export class FireworkRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.bloom = document.createElement('canvas');
    this.layer = this.bloom.getContext('2d');
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this.stars = []; this.fragments = []; this.smoke = [];
    this.glows = [[255, 208, 129], [255, 151, 60], [221, 237, 255]].map(rgb => {
      const sprite = document.createElement('canvas'); sprite.width = sprite.height = 32;
      const ctx = sprite.getContext('2d'), gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255,253,230,1)');
      gradient.addColorStop(.12, 'rgba(' + rgb.join(',') + ',.8)');
      gradient.addColorStop(.35, 'rgba(' + rgb.join(',') + ',.18)');
      gradient.addColorStop(1, 'rgba(' + rgb.join(',') + ',0)');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, 32, 32);
      return sprite;
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas); this.resize();
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    this.width = bounds.width; this.height = bounds.height;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    for (const canvas of [this.canvas, this.bloom]) {
      canvas.width = Math.round(bounds.width * ratio); canvas.height = Math.round(bounds.height * ratio);
      canvas.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    this.draw(this.elapsed ?? -1);
  }

  prepare(seed) {
    const random = seededRandom(seed);
    this.origin = { x: .59 + random() * .065, y: .30 + random() * .015 };
    this.stars = Array.from({ length: 174 }, (_, index) => {
      // 球殼有前後深度，投影後既有外圈，也有填滿中央的火星。
      const z = random() * 2 - 1, angle = random() * Math.PI * 2;
      const radial = Math.sqrt(1 - z * z), speed = .205 + random() * .055;
      const perspective = 1 + z * .12;
      return {
        vx: Math.cos(angle) * radial * speed * perspective,
        vy: Math.sin(angle) * radial * speed * perspective,
        drag: 1.0 + random() * .45,
        life: 1.9 + random() * 1.9,
        width: .42 + random() * .52,
        brightness: .6 + random() * .4,
        phase: random() * Math.PI * 2,
        delay: random() * .018,
        silver: index % 11 === 0,
        trail: .45 + random() * .50
      };
    });
    // 小碎星從已散開的火星旁迸出，配合爆響之後的劈啪尾聲。
    this.fragments = [];
    for (let index = 0; index < 48; index++) {
      const parent = this.stars[Math.floor(random() * this.stars.length)];
      const birth = .69 + random() * .47;
      const angle = random() * Math.PI * 2;
      for (let child = 0; child < 3; child++) {
        const theta = angle + child * 2.1 + (random() - .5) * .6;
        this.fragments.push({ parent, birth, vx: Math.cos(theta) * (.025 + random() * .04),
          vy: Math.sin(theta) * (.025 + random() * .04), life: .32 + random() * .64,
          phase: random() * Math.PI * 2, width: .3 + random() * .35 });
      }
    }
    this.smoke = Array.from({ length: 7 }, () => ({
      x: (random() - .5) * .16, y: (random() - .5) * .10,
      radius: .04 + random() * .05, drift: .005 + random() * .01
    }));
    this.draw(-1);
  }

  position(star, age) {
    const drag = (1 - Math.exp(-star.drag * age)) / star.drag;
    return {
      x: this.width * (this.origin.x + star.vx * drag + .006 * age),
      y: this.height * this.origin.y + this.width * (star.vy * drag + .0135 * age * age)
    };
  }

  glow(ctx, x, y, size, opacity, type = 0) {
    ctx.globalAlpha = opacity;
    ctx.drawImage(this.glows[type], x - size / 2, y - size / 2, size, size);
  }

  drawStars(ctx, time, opacity) {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const star of this.stars) {
      const age = time - star.delay;
      if (age < 0 || age >= star.life) continue;
      const fade = Math.pow(1 - age / star.life, .6) * star.brightness * opacity;
      const tail = Math.min(age, star.trail);
      const steps = Math.max(2, Math.min(12, Math.ceil(tail / .045)));
      let previous = this.position(star, age - tail);
      ctx.fillStyle = star.silver ? '#d9e9ff' : '#edb36c';
      // 亮度及色溫沿尾跡衰減；微小明暗斷點避免像等寬向量線條。
      for (let index = 1; index <= steps; index++) {
        const ratio = index / steps, sampleAge = age - tail + ratio * tail;
        const point = this.position(star, sampleAge);
        const grain = .52 + .48 * Math.sin(sampleAge * 88 + star.phase) ** 2;
        ctx.globalAlpha = fade * ratio ** 1.6 * grain * .75;
        ctx.strokeStyle = star.silver ? '#d9e9ff' : ratio < .5 ? '#e78431' : '#ffd99c';
        ctx.lineWidth = star.width * (.35 + ratio * .65);
        ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(point.x, point.y); ctx.stroke();
        if (index % 3 === 0) ctx.fillRect(point.x, point.y, .45, .45);
        previous = point;
      }
      const head = this.position(star, age);
      const flicker = age < .55 ? 1 : .45 + .55 * Math.sin(age * 19 + star.phase) ** 2;
      this.glow(ctx, head.x, head.y, 6.5 + star.width * 2, fade * flicker * .85, star.silver ? 2 : age > 2 ? 1 : 0);
      ctx.globalAlpha = fade * flicker;
      ctx.fillStyle = star.silver ? '#f1f6ff' : age > 2 ? '#ffc077' : '#fff8dd';
      ctx.beginPath(); ctx.arc(head.x, head.y, star.width * .68, 0, Math.PI * 2); ctx.fill();
    }
    for (const fragment of this.fragments) {
      const age = time - fragment.birth;
      if (age < 0 || age >= fragment.life) continue;
      const base = this.position(fragment.parent, fragment.birth);
      const inherited = Math.exp(-fragment.parent.drag * fragment.birth) * .35;
      const velocityX = fragment.vx + fragment.parent.vx * inherited;
      const velocityY = fragment.vy + fragment.parent.vy * inherited;
      const position = t => ({ x: base.x + this.width * velocityX * t,
        y: base.y + this.width * (velocityY * t + .035 * t * t) });
      const head = position(age), tail = position(Math.max(0, age - .065));
      const fade = (1 - age / fragment.life) * opacity;
      const flicker = .3 + .7 * Math.sin(age * 46 + fragment.phase) ** 2;
      ctx.globalAlpha = fade * flicker;
      ctx.strokeStyle = '#ffe2ad'; ctx.lineWidth = fragment.width;
      ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(head.x, head.y); ctx.stroke();
      this.glow(ctx, head.x, head.y, 5, fade * flicker, 0);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  draw(elapsed) {
    this.elapsed = elapsed;
    const ctx = this.context, layer = this.layer, w = this.width, h = this.height;
    if (!ctx || !layer || !w || !h) return;
    ctx.clearRect(0, 0, w, h); layer.clearRect(0, 0, w, h);
    if (elapsed < 0 || elapsed > FIREWORK_DURATION || !this.stars.length) return;
    const time = this.reducedMotion.matches ? .85 : elapsed;
    const opacity = this.reducedMotion.matches ? Math.min(1, Math.max(0, (4.7 - elapsed) / 1.7)) : 1;
    const x = this.origin.x * w, y = this.origin.y * h;

    // 煙團先於光點繪出，隨風擴散；不以單一圓環代替煙火。
    for (const puff of this.smoke) {
      const radius = w * (puff.radius + elapsed * .017);
      const px = x + w * (puff.x + puff.drift * elapsed), py = y + w * puff.y - elapsed * h * .009;
      const smoke = ctx.createRadialGradient(px, py, 0, px, py, radius);
      smoke.addColorStop(0, 'rgba(151,147,153,' + (.045 * Math.min(elapsed * 2, 1) * Math.max(0, 1 - elapsed / 5.1)) + ')');
      smoke.addColorStop(1, 'rgba(130,130,145,0)');
      ctx.fillStyle = smoke; ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
    }
    this.drawStars(layer, time, opacity);
    // 遠處火星在山脊、岸線前漸隱，避免越過湖面與近景欄杆。
    const skyline = layer.createLinearGradient(0, h * .47, 0, h * .57);
    skyline.addColorStop(0, '#fff'); skyline.addColorStop(1, 'rgba(255,255,255,0)');
    layer.globalCompositeOperation = 'destination-in';
    layer.fillStyle = skyline; layer.fillRect(0, 0, w, h);
    layer.globalCompositeOperation = 'source-over';
    ctx.globalCompositeOperation = 'screen';
    const flash = Math.exp(-elapsed * 20);
    const halo = ctx.createRadialGradient(x, y, 0, x, y, w * .16);
    halo.addColorStop(0, 'rgba(255,250,226,' + (.95 * flash) + ')');
    halo.addColorStop(.16, 'rgba(255,213,140,' + (.6 * flash) + ')');
    halo.addColorStop(1, 'rgba(255,189,92,0)');
    ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(this.bloom, 0, 0, w, h);

    // 水面映出同一發煙火的碎光，水平水紋打散倒影，限制在遠岸與欄杆之間。
    ctx.save(); ctx.beginPath();
    for (let row = h * .59; row < h * .80; row += 3.5) ctx.rect(0, row, w, 1.6);
    ctx.clip(); ctx.globalAlpha = .20;
    ctx.translate(Math.sin(time * 2.2) * 1.2, h * .60); ctx.scale(1, -.36); ctx.translate(0, -h * .53);
    ctx.drawImage(this.bloom, 0, 0, w, h); ctx.restore();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
}
