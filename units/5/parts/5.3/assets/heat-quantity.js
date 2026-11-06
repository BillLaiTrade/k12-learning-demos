import { MATERIALS, samplesFor, reading } from './heat-model.mjs';

const number = value => value.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
const fixed = value => value.toFixed(1);
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// 儀器與即時液柱使用同一個 SVG 座標；重繪不留下上一狀態的圖層。
function apparatus(sample, prefix) {
  const id = `${prefix}-${sample.key}`;
  const metal = sample.material !== 'water';
  const densityHeight = { aluminum: 52, iron: 36, copper: 32 }[sample.material];
  const waterY = 232 - sample.mass / 400 * 150;
  const water = `<path d="M29 ${waterY} Q100 ${waterY + 9} 172 ${waterY} L166 225 Q100 243 35 225Z" fill="url(#${id}-water)"/>
    <ellipse cx="100" cy="${waterY}" rx="71" ry="7" fill="#b7d5da" fill-opacity=".4" stroke="#86acb3" stroke-opacity=".6"/>
    <path d="M25 73 Q100 61 176 73 L169 230 Q100 250 32 230Z" fill="url(#${id}-glass)" stroke="#91a7a8" stroke-width="1.5"/>
    <ellipse cx="100" cy="73" rx="75" ry="10" fill="#fff" fill-opacity=".3" stroke="#8fa3a3" stroke-width="1.5"/>
    <path d="M36 89 41 219 M164 88 158 216" stroke="#fff" stroke-opacity=".8" stroke-width="4" stroke-linecap="round"/>
    ${[100,200,300,400].map(m => `<path d="M46 ${232 - m / 400 * 150}h14" stroke="#7a9597" stroke-width="1"/>`).join('')}`;
  const block = `<path d="M47 ${232-densityHeight} 67 ${220-densityHeight} 161 ${220-densityHeight} 145 ${232-densityHeight}Z" fill="#dce0dc" stroke="#8c9a94"/>
    <path d="M47 ${232-densityHeight}H145V232H47Z" fill="url(#${id}-metal)" stroke="#87968e"/>
    <path d="M145 ${232-densityHeight} 161 ${220-densityHeight}V219L145 232Z" fill="${sample.material === 'copper' ? '#a26747' : '#8b9996'}" stroke="#7c8e83"/>
    <path d="M55 ${241-densityHeight}H134" stroke="#fff" stroke-opacity=".5"/>`;
  return `<article class="sample" data-key="${sample.key}"><h4 class="sample-heading">${sample.name}</h4><span class="sample-condition">${sample.mass} g${metal ? '・固體樣品' : ''}</span>
    <svg viewBox="0 0 250 290" role="img" aria-label="${sample.name}，質量 ${sample.mass} g，溫度 20.0°C。">
      <defs>
        <linearGradient id="${id}-glass"><stop stop-color="#789fa5" stop-opacity=".2"/><stop offset=".12" stop-color="#fff" stop-opacity=".65"/><stop offset=".5" stop-color="#f6faf7" stop-opacity=".04"/><stop offset=".91" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#719697" stop-opacity=".3"/></linearGradient>
        <linearGradient id="${id}-water" x2="0" y2="1"><stop stop-color="#8fbfc7" stop-opacity=".25"/><stop offset="1" stop-color="#76aab6" stop-opacity=".5"/></linearGradient>
        <linearGradient id="${id}-metal"><stop stop-color="${sample.material === 'copper' ? '#d59b71' : '#b7c3bf'}"/><stop offset=".3" stop-color="${sample.material === 'copper' ? '#edc6a5' : '#e7ebe6'}"/><stop offset="1" stop-color="${sample.material === 'copper' ? '#b87c56' : '#9caca6'}"/></linearGradient>
        <linearGradient id="${id}-tube"><stop stop-color="#879f9a" stop-opacity=".7"/><stop offset=".3" stop-color="#fff" stop-opacity=".95"/><stop offset=".6" stop-color="#dbe8e0" stop-opacity=".35"/><stop offset="1" stop-color="#a9c0b8" stop-opacity=".7"/></linearGradient>
        <linearGradient id="${id}-heat"><stop stop-color="#dd954e"/><stop offset=".5" stop-color="#edc07b"/><stop offset="1" stop-color="#bd6f3f"/></linearGradient>
      </defs>
      <ellipse cx="105" cy="272" rx="94" ry="9" fill="#365242" opacity=".07"/>
      <rect x="18" y="241" width="169" height="29" rx="6" fill="#d8dfd8" stroke="#99aaa0"/>
      <path d="M24 242H182" stroke="#fafff5" stroke-width="2"/>
      <rect x="40" y="236" width="125" height="5" rx="2" data-heater fill="#9caaa0"/>
      <circle cx="166" cy="256" r="5" fill="#6b8273"/><circle cx="33" cy="256" r="2" data-heater-light fill="#a4afa6"/>
      ${metal ? block : water}
      <path d="M124 34h67v203" fill="none" stroke="#8c9b90" stroke-width="3"/><path d="M185 237h15" stroke="#8c9b90" stroke-width="4" stroke-linecap="round"/>
      <path d="M132 41v165a13 13 0 1 1-14 0V41a7 7 0 0 1 14 0Z" fill="url(#${id}-tube)" stroke="#8baba7" stroke-width="1"/>
      <path d="M122 43V201" stroke="#fff" stroke-opacity=".9" stroke-width="1.5"/>
      <rect data-liquid x="123" y="172" width="4" height="45" rx="2" fill="#c85543"/>
      <circle cx="125" cy="217" r="8" fill="#c85543"/>
      <ellipse cx="122" cy="214" rx="2" ry="3" fill="#f4a698" opacity=".8"/>
      ${Array.from({length:41},(_,i) => {const t=i*2,y=208-t*1.8;return `<path d="M134 ${y}h${t%10===0?10:5}" stroke="#4f695e" stroke-width="${t%10===0?1.2:.7}"/>${t%20===0?`<text x="149" y="${y+3}">${t}</text>`:''}`;}).join('')}
      <text x="145" y="49">°C</text><path d="M117 38h16" stroke="#6d8f82" stroke-width="3"/>
      <text x="100" y="286" text-anchor="middle">${metal ? '樣品均勻受熱' : '水吸收熱量'}</text>
    </svg>
    <div class="temperature-readout"><span data-temperature>20.0</span> °C</div><p class="sample-rise">升高 <span data-rise>0.0</span> °C</p><p class="sample-energy">已吸收 <span data-energy>0</span> cal</p></article>`;
}

class Experiment {
  constructor(root) {
    this.root = root;
    this.mode = root.dataset.mode;
    this.setting = $('[data-setting]', root);
    this.playButton = $('[data-play]', root);
    this.recordButton = $('[data-record]', root);
    this.status = $('[data-status]', root);
    this.graphMax = this.mode === 'heat' ? 2000 : Number(root.dataset.total);
    this.frame = 0;
    this.records = [];
    this.playing = false;
    this.progress = 0;
    this.recorded = false;
    this.setting.addEventListener(this.mode === 'heat' ? 'input' : 'change', () => this.reset());
    this.playButton.addEventListener('click', () => this.playing ? this.pause() : this.start());
    $('[data-reset]', root).addEventListener('click', () => this.reset());
    this.recordButton.addEventListener('click', () => this.record());
    this.reset();
  }
  reset() {
    this.pause();
    this.progress = 0;
    this.recorded = false;
    this.total = this.mode === 'heat' ? Number(this.setting.value) : Number(this.root.dataset.total);
    this.samples = samplesFor(this.mode, this.setting.value);
    if (this.mode === 'heat') $('[data-setting-label]', this.root).textContent = `${number(this.total)} cal`;
    if (this.mode === 'material') $('[data-material-legend]', this.root).textContent = `● ${MATERIALS[this.setting.value].name}`;
    $('[data-apparatus]', this.root).innerHTML = this.samples.map(s => apparatus(s, this.root.id)).join('');
    this.root.dataset.phase = 'ready';
    this.playButton.disabled = false;
    this.playButton.textContent = this.mode === 'heat' ? '開始加熱' : '開始比較';
    this.playButton.setAttribute('aria-pressed','false');
    this.recordButton.disabled = true;
    this.recordButton.textContent = '記下結果';
    this.status.textContent = '從 20°C 開始；改變條件會重新開始，已記下的結果會保留。';
    this.render();
  }
  start() {
    if (this.progress >= 1) return;
    this.playing = true;
    this.root.dataset.phase = 'running';
    this.playButton.textContent = '暫停觀察';
    this.playButton.setAttribute('aria-pressed','true');
    this.status.textContent = this.samples.length === 1 ? '水正在吸收熱量，觀察升溫與曲線。' : '兩份樣品各自吸收相同熱量，觀察升溫差異。';
    this.lastTime = performance.now();
    const tick = now => {
      if (!this.playing) return;
      this.progress = Math.min(1, this.progress + Math.min(100, now - this.lastTime) / 6000);
      this.lastTime = now;
      this.render();
      if (this.progress === 1) {
        this.playing = false;
        this.root.dataset.phase = 'complete';
        this.playButton.textContent = '觀察完成';
        this.playButton.disabled = true;
        this.playButton.setAttribute('aria-pressed','false');
        this.recordButton.disabled = false;
        this.status.textContent = this.samples.map(s => {const r=reading(s,this.total);return `${s.name} ${fixed(r.temperature)}°C，升高 ${fixed(r.rise)}°C`;}).join('；') + '。可以記下結果，再改變條件比較。';
        this.render();
      } else this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
  pause() {
    cancelAnimationFrame(this.frame);
    if (this.playing) {
      this.playing = false;
      this.root.dataset.phase = 'paused';
      this.playButton.textContent = '繼續觀察';
      this.playButton.setAttribute('aria-pressed','false');
      this.status.textContent = '已暫停，溫度、熱量與曲線停在同一狀態。';
      this.render();
    }
  }
  render() {
    const heat = this.progress * this.total;
    this.samples.forEach(sample => {
      const r = reading(sample, heat);
      const article = $(`.sample[data-key="${sample.key}"]`, this.root);
      $('[data-temperature]',article).textContent = fixed(r.temperature);
      $('[data-rise]',article).textContent = fixed(r.rise);
      $('[data-energy]',article).textContent = number(heat);
      $('svg',article).setAttribute('aria-label', `${sample.name}，質量 ${sample.mass} g，已吸收 ${number(heat)} cal，溫度 ${fixed(r.temperature)}°C，升高 ${fixed(r.rise)}°C。`);
      const top = 208 - r.temperature * 1.8;
      $('[data-liquid]',article).setAttribute('y',top);
      $('[data-liquid]',article).setAttribute('height',217-top);
      $('[data-heater]',article).setAttribute('fill',this.playing ? '#d58b46' : '#9caaa0');
      $('[data-heater-light]',article).setAttribute('fill',this.playing ? '#d47643' : '#a4afa6');
    });
    this.renderGraph(heat);
  }
  renderGraph(heat) {
    const maxY = Number(this.root.dataset.ymax);
    const x = q => 49 + q / this.graphMax * 302;
    const y = t => 228 - (t - 20) / (maxY - 20) * 190;
    const yStep = this.mode === 'material' ? 20 : 5;
    const xStep = this.mode === 'material' ? 100 : this.graphMax / 4;
    const grid = Array.from({length:Math.round((maxY-20)/yStep)+1},(_,i) => {
      const t=20+i*yStep;
      return `<path d="M49 ${y(t)}H351" stroke="#e1e7dc"/><text x="39" y="${y(t)+4}" text-anchor="end">${t}</text>`;
    }).join('') + Array.from({length:Math.round(this.graphMax/xStep)+1},(_,i) => {
      const q=i*xStep;
      return `<path d="M${x(q)} 228v5" stroke="#8b9f90"/><text x="${x(q)}" y="248" text-anchor="middle">${number(q)}</text>`;
    }).join('');
    const lines = this.samples.map((s,i) => {
      const r=reading(s,heat),color=i===0?'#427e94':'#b2693d';
      return `<path d="M49 228L${x(heat)} ${y(r.temperature)}" fill="none" stroke="${color}" stroke-width="3"${i===1?' stroke-dasharray="7 4"':''}/><circle cx="${x(heat)}" cy="${y(r.temperature)}" r="4" fill="${color}" stroke="#fffefa" stroke-width="1.5"/>`;
    }).join('');
    const graph = $('[data-graph]',this.root);
    graph.innerHTML = `<text x="8" y="18">溫度（°C）</text>${grid}<path d="M49 32V228H357" fill="none" stroke="#8b9f90" stroke-width="1.3"/>${lines}<text x="351" y="272" text-anchor="end">吸收熱量（cal）</text>`;
    graph.setAttribute('aria-label',`吸收熱量 ${number(heat)} cal。${this.samples.map(s=>`${s.name} ${fixed(reading(s,heat).temperature)}°C`).join('；')}。`);
  }
  record() {
    if (this.progress < 1 || this.recorded) return;
    this.recorded = true;
    const values=this.samples.map(s=>reading(s,this.total));
    const label=this.mode==='heat'?'100 g 水':this.mode==='mass'?`A 100 g／B ${this.setting.value} g`:`水／${MATERIALS[this.setting.value].name}（各 100 g）`;
    const record=[label,`${number(this.total)} cal`,values.map(v=>fixed(v.temperature)).join('／')+' °C',values.map(v=>fixed(v.rise)).join('／')+' °C'];
    this.records.push(record);
    this.records=this.records.slice(-6);
    const tbody=$('[data-records]',this.root);
    tbody.replaceChildren();
    this.records.forEach(row=>{
      const tr=document.createElement('tr');
      row.forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td);});
      tbody.append(tr);
    });
    $('[data-record-wrap]',this.root).hidden=false;
    this.recordButton.disabled=true;
    this.recordButton.textContent='已記下';
    this.status.textContent='結果已加入下方紀錄。換個條件，再比較一次。';
  }
}

const experiments=$$('.experiment').map(root=>new Experiment(root));
function pauseAll(){experiments.forEach(experiment=>experiment.pause());}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseAll();});
window.addEventListener('blur',pauseAll);

if('IntersectionObserver' in window){
  const visible=new Map();
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>visible.set(entry.target.id,entry.isIntersecting));
    const first=$$('.lesson-card,.quiz').find(section=>visible.get(section.id))
      || ($('.lesson-card').getBoundingClientRect().top>0 ? $('.lesson-card') : null);
    if(!first)return;
    $$('.route a').forEach(link=>{
      if(link.hash===`#${first.id}`)link.setAttribute('aria-current','step');
      else link.removeAttribute('aria-current');
    });
  },{rootMargin:'-5% 0px -45% 0px',threshold:0});
  $$('.lesson-card,.quiz').forEach(section=>observer.observe(section));
}
