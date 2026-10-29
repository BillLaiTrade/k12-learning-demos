import { act, advance, freshExperiment, gasGeometry, airComposition, checkReport, clamp } from './air-model.mjs';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const text = (selector, value) => { const el = $(selector); if (el.textContent !== value) el.textContent = value; };
const shown = (selector, visible) => { $(selector).hidden = !visible; };
const disabled = (selector, value) => { $(selector).disabled = value; };
const number = n => Number(n).toFixed(1);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let experiment = freshExperiment(), lastFrame = 0, lastPaint = 0, ratioVisible = false;
let selectedTool = 'wool';

const svgStart = (name, height = 440) => `<svg viewBox="0 0 520 ${height}" aria-hidden="true"><defs><linearGradient id="glass-${name}"><stop stop-color="#ffffff" stop-opacity=".8"/><stop offset=".4" stop-color="#dae9df" stop-opacity=".15"/><stop offset=".8" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#b8cfc0" stop-opacity=".5"/></linearGradient><linearGradient id="water-${name}" x2="0" y2="1"><stop stop-color="#a9d8dc" stop-opacity=".7"/><stop offset="1" stop-color="#72b6c3" stop-opacity=".7"/></linearGradient></defs>`;

function apparatus(name, progress, alignment, control = false) {
  const g = gasGeometry(progress, alignment, control);
  const top = 315 - g.top * 12, bottom = top + 288, level = 315 - g.water * 12;
  const outline = `M220 ${bottom} V${top + 14} Q220 ${top} 235 ${top} H275 Q290 ${top} 290 ${top + 14} V${bottom}`;
  const clip = outline + ' Z';
  let graduations = '';
  for (let v = 10; v <= 110; v += 10) {
    const y = top + (v + 2) / 5 * 12;
    graduations += `<path d="M276 ${y}h14" stroke="#789586" stroke-width="${v % 20 === 0 ? 1.7 : 1}"/><text x="299" y="${y + 4}" font-size="11">${v}</text>`;
  }
  const wool = Array.from({ length: 12 }, (_, i) => {
    const y = top + 18 + i * 2.1;
    return `<path d="M228 ${y}q12 -11 21 0t29 -2q-13 10 -26 0t-24 4" fill="none" stroke="${i % 3 ? '#7b8176' : '#565d55'}" stroke-width="1.6"/>`;
  }).join('');
  const rust = control ? '' : `<g opacity="${Math.min(.8, progress * .8)}"><path d="M232 ${top + 20}q15 12 39 2m-35 11q16 -11 41 3m-45 8q22 -6 38 -3" stroke="#ad693e" stroke-width="4" fill="none"/></g>`;
  const current = selectedTool === 'wool' ? `<path d="M204 ${top + 30}h-47" stroke="#92a18c"/><text x="42" y="${top + 27}" class="diagram-label">${control ? '沒有鋼絲絨' : '潮濕鋼絲絨'}</text>` : selectedTool === 'scale' ? `<path d="M319 ${top + 125}h29" stroke="#92a18c"/><text x="353" y="${top + 129}" class="diagram-label">校正體積刻度</text>` : `<path d="M290 ${bottom - 6}h41" stroke="#92a18c"/><text x="336" y="${bottom - 10}" class="diagram-label">水封管口</text>`;
  return svgStart(name) + `<defs><clipPath id="tube-${name}"><path d="${clip}"/></clipPath></defs>
    <ellipse cx="260" cy="427" rx="175" ry="5" fill="#d2dece"/>
    <path d="M155 402H118V52H153" fill="none" stroke="#7b8d80" stroke-width="7" stroke-linecap="round"/><path d="M148 ${top + 57}H222" stroke="#8d9d90" stroke-width="7"/>
    <rect x="165" y="315" width="225" height="107" fill="url(#water-${name})"/>
    <path d="M165 272V415Q165 425 177 425H378Q390 425 390 415V272" fill="none" stroke="#9aafa0" stroke-width="3"/>
    <path d="M170 315H386" stroke="#629aab" stroke-width="2"/>
    <path d="${clip}" fill="#fcfdf8"/><g clip-path="url(#tube-${name})"><rect x="220" y="${level}" width="70" height="440" fill="url(#water-${name})"/><path d="M220 ${level}H290" stroke="#458ea0" stroke-width="2"/>${control ? '' : wool + rust}</g>
    <path d="${outline}" fill="url(#glass-${name})" stroke="#8ca696" stroke-width="2.5"/>
    ${graduations}<text x="299" y="${top + 16}" font-size="11">mL</text>
    <path d="M203 315H345" stroke="#b79b6c" stroke-width="1.4" stroke-dasharray="5 4"/>
    ${current}<text x="356" y="307" class="diagram-label">槽內水面</text>
    <path d="M220 ${level}H190" stroke="#347d93" stroke-width="1.5"/>
    <text x="26" y="${Math.min(360, Math.max(210, level - 5))}" class="diagram-label">氣體空間</text><text x="26" y="${Math.min(386, Math.max(235, level + 21))}" class="diagram-value">${number(g.volume)} mL</text>
    <text x="344" y="408" font-size="11">管口在水下</text><text x="28" y="26" font-size="11">器材剖面示意・校正後氣體體積</text>
    ${name === 'setup-scene' ? `<rect class="hit-tool" data-tool-target="wool" x="222" y="${top + 8}" width="66" height="48" fill="transparent"/><rect class="hit-tool" data-tool-target="scale" x="292" y="${top + 65}" width="40" height="180" fill="transparent"/><rect class="hit-tool" data-tool-target="seal" x="215" y="${bottom - 16}" width="80" height="32" fill="transparent"/>` : ''}</svg>`;
}

const phases = { ready: '尚未開始', prepared: '起始已記錄', running: '反應進行中', settled: '趨於穩定', waiting: '延長觀察中', stable: '可調整讀值條件', aligning: '正在對齊水面', aligned: '可記錄最終值', recorded: '前後記錄已保存' };
const messages = {
  ready: '先在上一區記錄開始體積。', prepared: '開始體積已保存。可以開始縮時觀察。',
  running: '注意鏽色、水面與氣體空間如何一起改變；即時讀值尚未保存。',
  settled: '水面趨於穩定，但不能只憑這一刻就認定反應完成。延長觀察看看。',
  waiting: '讓模型繼續等待，檢查是否還有明顯變化；鋼絲絨仍有未反應的鐵。',
  stable: '延長觀察後沒有明顯變化，模型已回到相同室溫。把內外水面對齊，再讀值。',
  aligning: '正在調整整支集氣管；管口仍在水下，刻度、水面與氣體空間同步改變。',
  aligned: '內外水面已對齊、溫度與開始相同；現在可以記錄反應後的氣體體積。',
  recorded: '已保留 100.0 mL 與 79.0 mL 的前後記錄。往下比較減少的部分。'
};

function renderExperiment() {
  const s = experiment, p = s.preview ?? s.progress;
  const align = s.preview !== null && p < 1 ? 0 : s.alignment;
  for (const [id, control] of [['setup-scene', false], ['reaction-scene', false], ['control-scene', true]]) {
    const el = $('#' + id), g = gasGeometry(p, align, control);
    el.innerHTML = apparatus(id, p, align, control);
    el.dataset.volume = g.volume; el.dataset.water = g.water; el.dataset.top = g.top; el.dataset.mouth = g.mouth;
  }
  document.documentElement.dataset.phase = s.phase;
  document.documentElement.dataset.paused = s.paused;
  text('#live-volume', `${number(gasGeometry(p, align).volume)} mL`);
  text('#phase-name', s.preview !== null ? '回看中・記錄保留' : s.paused && ['running', 'waiting', 'aligning'].includes(s.phase) ? '已暫停' : phases[s.phase]);
  text('#experiment-status', s.preview !== null ? '正在回看觀察。前後記錄保留；回到目前狀態後再操作。' : messages[s.phase]);
  text('#setup-status', s.before === null ? '初始內外水面對齊，可記錄氣體體積。' : '開始體積已記錄：100.0 mL。');
  $$('[data-record]').forEach(el => { const v = s[el.dataset.record]; el.textContent = v === null ? '尚未記錄' : number(v) + ' mL'; });
  disabled('#record-before', s.phase !== 'ready');
  disabled('#experiment-start', !['prepared', 'running'].includes(s.phase) || s.preview !== null);
  text('#experiment-start', s.phase === 'running' ? '繼續觀察' : '開始觀察');
  disabled('#experiment-pause', !['running', 'waiting', 'aligning'].includes(s.phase) || s.preview !== null);
  text('#experiment-pause', s.paused ? '繼續' : '暫停');
  disabled('#experiment-wait', s.phase !== 'settled' || s.preview !== null);
  disabled('#experiment-align', s.phase !== 'stable' || s.preview !== null);
  disabled('#record-after', s.phase !== 'aligned' || s.preview !== null);
  disabled('#experiment-time', s.before === null);
  if (document.activeElement !== $('#experiment-time')) $('#experiment-time').value = String(p);
  shown('#experiment-live', s.preview !== null);
  shown('#rust-dialogue', p > .08);
  shown('#stable-dialogue', ['stable', 'aligning', 'aligned', 'recorded'].includes(s.phase) && s.preview === null);
  const complete = s.before !== null && s.after !== null;
  shown('#comparison-empty', !complete); shown('#comparison-chart', complete);
  text('#loss-value', complete ? number(s.before - s.after) + ' mL' : '尚未記錄');
  shown('#ratio-result', complete && ratioVisible); shown('#ratio-dialogue', complete && ratioVisible);
}

function dispatch(action, value) {
  experiment = act(experiment, action, value);
  if (action === 'reset') ratioVisible = false;
  if (reduced.matches && ['start', 'wait', 'align'].includes(action)) experiment = advance(experiment, 20);
  renderExperiment();
}
for (const [id, action] of Object.entries({ 'record-before': 'before', 'experiment-start': 'start', 'experiment-pause': 'pause', 'experiment-wait': 'wait', 'experiment-align': 'align', 'record-after': 'after', 'experiment-live': 'live', 'experiment-reset': 'reset' })) $('#' + id).addEventListener('click', () => dispatch(action));
$('#experiment-time').addEventListener('input', e => dispatch('scrub', e.target.value));
$('#show-control').addEventListener('change', e => shown('#control-view', e.target.checked));
$('#show-ratio').addEventListener('click', () => { ratioVisible = true; renderExperiment(); });
$$('[data-tool]').forEach(button => button.addEventListener('click', () => {
  selectedTool = button.dataset.tool;
  $$('[data-tool]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  text('#tool-copy', { wool: '讓鐵與氧氣反應；使用足量鋼絲絨，反應後仍會留有鐵。', seal: '管口一直浸在水中，隔開管內與外部空氣；不能在實驗中把管口提出水面。', scale: '刻度讀取的是已校正的自由氣體體積，已處理材料占據的空間；不是容器容量或水量。' }[selectedTool]);
  renderExperiment();
}));
$('#setup-scene').addEventListener('click', event => {
  const target = event.target.closest('[data-tool-target]');
  if (target) $(`button[data-tool="${target.dataset.toolTarget}"]`).click();
});
let hiddenPaused = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenPaused = experiment.paused; experiment.paused = true; }
  else { experiment.paused = hiddenPaused; lastFrame = 0; }
});
function frame(time) {
  const dt = lastFrame ? Math.min(.15, (time - lastFrame) / 1000) : 0;
  lastFrame = time;
  if (!document.hidden && !experiment.paused && ['running', 'waiting', 'aligning'].includes(experiment.phase)) {
    const oldPhase = experiment.phase;
    experiment = advance(experiment, dt);
    if (time - lastPaint >= 50 || experiment.phase !== oldPhase) { renderExperiment(); lastPaint = time; }
  }
  requestAnimationFrame(frame);
}
renderExperiment(); requestAnimationFrame(frame);

// Composition diagram: tiles represent volume shares, not individual molecules.
$('#air-tiles').innerHTML = Array.from({ length: 100 }, (_, i) => `<span class="tile ${i < 78 ? 'nitrogen' : i < 99 ? 'oxygen' : 'other'}" data-kind="${i < 78 ? 'nitrogen' : i < 99 ? 'oxygen' : 'other'}"></span>`).join('');
$$('[data-gas]').forEach(button => button.addEventListener('click', () => {
  const gas = button.dataset.gas;
  $$('[data-gas]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  $$('.tile').forEach(tile => tile.classList.toggle('dim', gas !== 'all' && tile.dataset.kind !== gas));
  text('#gas-description', { all: '氮氣最多；氧氣只占一部分，還有其他氣體。', nitrogen: '約 78 份是氮氣，是乾燥空氣中最多的成分。', oxygen: '約 21 份是氧氣，與前面估計的約五分之一相符。', other: '其他氣體合計約 1 份，包括氬氣、二氧化碳等；不能把剩餘部分都當成氮氣。' }[gas]);
}));

let sample = 'oxygen', splintIn = false;
const sampleNames = { oxygen: '氧氣', nitrogen: '氮氣', air: '一般空氣' };
function renderSplint() {
  const burning = splintIn && sample === 'oxygen', tipY = splintIn ? 200 : 85;
  $('#splint-scene').dataset.sample = sample; $('#splint-scene').dataset.burning = burning;
  $('#splint-scene').innerHTML = svgStart('splint', 300) + `<ellipse cx="260" cy="280" rx="125" ry="7" fill="#dbe4d3"/><path d="M212 85V104L175 133V255Q175 271 193 271H327Q345 271 345 255V133L308 104V85" fill="url(#glass-splint)" stroke="#93ac9c" stroke-width="3"/><ellipse cx="260" cy="85" rx="48" ry="7" fill="#eef5eb" stroke="#93ac9c" stroke-width="2"/><rect x="220" y="213" width="80" height="31" rx="6" fill="#e3eddf"/><text x="260" y="234" text-anchor="middle" font-size="14">${sampleNames[sample]}</text><path d="M260 ${tipY - 130}V${tipY}" stroke="#b5925d" stroke-width="11" stroke-linecap="round"/><path d="M260 ${tipY - 8}V${tipY}" stroke="${burning ? '#e87325' : splintIn && sample === 'nitrogen' ? '#777e70' : '#bd5735'}" stroke-width="11" stroke-linecap="round"/>${burning ? `<g class="flame"><path d="M260 206C227 190 249 171 253 153C262 171 286 188 260 206" fill="#e8a13e"/><path d="M260 205C248 193 256 184 260 180C268 192 270 198 260 205" fill="#ffe8a7"/></g>` : ''}<text x="32" y="37" class="diagram-label">已知樣本的示意觀察・氣體維持透明</text></svg>`;
  text('#splint-status', !splintIn ? '先選樣本，再放入帶餘燼木條。每次重做使用相近的初始餘燼。' : sample === 'oxygen' ? '木條在足夠氧氣中復燃；燃燒的是木條，氧氣幫助燃燒。' : sample === 'nitrogen' ? '氮氣不支持此木條繼續燃燒；但未復燃不能唯一鑑定氣體是氮氣。' : '本組觀察中，木條未像氧氣樣本般復燃；不表示所有餘燼在空氣中必然立即熄滅。');
  shown('#oxygen-dialogue', burning);
  disabled('#splint-in', splintIn); disabled('#splint-out', !splintIn);
}
$$('[data-sample]').forEach(button => button.addEventListener('click', () => {
  sample = button.dataset.sample; splintIn = false;
  $$('button[data-sample]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  renderSplint();
}));
$('#splint-in').addEventListener('click', () => { splintIn = true; renderSplint(); });
$('#splint-out').addEventListener('click', () => { splintIn = false; renderSplint(); });
$('#splint-reset').addEventListener('click', () => { splintIn = false; renderSplint(); });
renderSplint();

let waterPercent = 0;
function renderHumidity() {
  const dryOnly = $('#dry-only').checked, values = airComposition(waterPercent, dryOnly);
  const names = { nitrogen: '氮氣', oxygen: '氧氣', other: '其他', water: '水氣' };
  $('#humidity-chart').innerHTML = Object.entries(values).map(([key, value]) => `<span class="${key}" style="width:${value}%" data-value="${value}"></span>`).join('');
  $('#humidity-values').innerHTML = Object.entries(values).map(([key, value]) => `<span><i class="${key}"></i>${names[key]}<strong>${Number(value.toFixed(2))}%</strong></span>`).join('');
  const status = dryOnly ? '比較基準：只看不含水氣的部分，重新以它為 100%，讀回約 78／21／1。' : waterPercent ? '比較基準：含水氣的整體。2% 水氣＋98% 乾燥部分，合計 100%。' : '比較基準：不含水氣的乾燥空氣。';
  text('#humidity-status', status);
  $('#humidity-chart').setAttribute('aria-label', Object.entries(values).map(([key, value]) => names[key] + Number(value.toFixed(2)) + '%').join('，'));
}
$$('[data-water]').forEach(button => button.addEventListener('click', () => {
  waterPercent = Number(button.dataset.water);
  $$('[data-water]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  renderHumidity();
}));
$('#dry-only').addEventListener('change', renderHumidity); renderHumidity();

const form = $('#report-form');
const clearFeedback = () => { $('#report-feedback').hidden = true; $('#report-feedback').textContent = ''; delete $('#report-feedback').dataset.result; };
form.addEventListener('input', clearFeedback); form.addEventListener('change', clearFeedback); form.addEventListener('reset', clearFeedback);
form.addEventListener('submit', e => {
  e.preventDefault();
  const data = new FormData(form), report = checkReport(Object.fromEntries(data));
  $('#report-feedback').textContent = report.messages.join(' ');
  $('#report-feedback').dataset.result = report.result; $('#report-feedback').hidden = false;
});
let scrollQueued = false;
function syncRoute() {
  if (scrollQueued) return; scrollQueued = true;
  requestAnimationFrame(() => {
    scrollQueued = false;
    const sections = $$('.lesson'), current = [...sections].reverse().find(s => s.getBoundingClientRect().top <= innerHeight * .3) || sections[0];
    const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 4;
    const id = atEnd ? 's8' : current.id;
    $$('.route a').forEach(a => { if (a.hash === '#' + id) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
  });
}
addEventListener('scroll', syncRoute, { passive: true }); addEventListener('resize', syncRoute); syncRoute();
