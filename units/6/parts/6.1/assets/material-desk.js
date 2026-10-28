(() => {
  'use strict';
  const artURL = 'assets/material-samples.png?v=8aafc8641583';
  const apparatusURL = 'assets/material-apparatus.png?v=fff93eb82931';
  const positions = { copper: [0, 0], aluminium: [1, 0], iron: [2, 0], sulfur: [0, 1], diamond: [1, 1], copperWire: [2, 1], foil: [0, 2], ironWire: [1, 2], cuttingDisc: [2, 2] };
  const colors = { copper: ['#f4ba84', '#b65c35', '#e59a65'], aluminium: ['#fcfcf7', '#929da1', '#dae0de'], iron: ['#b7bfc0', '#59696d', '#9da6a6'] };
  const uses = {
    copper: ['copperWire', '為什麼銅能做成電線？', ['能導電', '能拉成細線'], '生活電線還包含絕緣層。'],
    aluminium: ['foil', '為什麼鋁能做成鋁箔？', ['能壓成薄片', '延展性佳'], '薄薄的鋁箔，是加工形成的。'],
    iron: ['ironWire', '鐵為什麼能加工成鐵絲？', ['能拉成細線', '延展性佳'], '這裡比較純鐵；生活鋼材是含鐵的合金。'],
    sulfur: ['sulfur', '硫可以用在哪裡？', ['製造硫酸等化工原料'], '這是用途資料，不是由顏色或導電性直接推得的結果。'],
    diamond: ['cuttingDisc', '鑽石為什麼能用於切割工具？', ['硬度高', '可作研磨材料'], '圖示工具的工作邊含鑽石；整件工具不是純碳。']
  };
  function art(id, x, y, size, height = size) {
    const [col, row] = positions[id];
    return `<svg x="${x}" y="${y}" width="${size}" height="${height}" preserveAspectRatio="${height === size ? 'xMidYMid meet' : 'none'}" viewBox="${col * 418} ${row * 418} 418 418"><image href="${artURL}" width="1254" height="1254"/></svg>`;
  }
  function apparatus(col, x, y, width, height) {
    const cellWidth = 2167 / 3;
    return `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${col * cellWidth} 0 ${cellWidth} 726"><image href="${apparatusURL}" width="2167" height="726"/></svg>`;
  }
  function defs(id, sample) {
    const c = colors[sample] || colors.aluminium;
    return `<defs>
      <linearGradient id="${id}-metal" x2=".1" y2="1"><stop stop-color="${c[0]}"/><stop offset=".35" stop-color="${c[1]}"/><stop offset=".55" stop-color="${c[2]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient>
      <linearGradient id="${id}-brass"><stop stop-color="#8a6a39"/><stop offset=".35" stop-color="#f8e6b6"/><stop offset=".65" stop-color="#c7a56b"/><stop offset="1" stop-color="#745a32"/></linearGradient>
      <linearGradient id="${id}-steel"><stop stop-color="#869392"/><stop offset=".4" stop-color="#f1f1e8"/><stop offset=".6" stop-color="#a4aeaa"/><stop offset="1" stop-color="#657572"/></linearGradient>
    </defs>`;
  }
  function screw(id, x, y) {
    return `<circle cx="${x}" cy="${y}" r="5" fill="url(#${id}-brass)" stroke="#81734c" stroke-width=".8"/><path d="m${x - 2} ${y + 2} 4-4" stroke="#706342" stroke-width="1.3"/>`;
  }
  function circuit(sample, id, power) {
    const lit = power && sample.conductivity === '良好';
    const material = colors[sample.id]
      ? `<path d="M152 168h105v24H152Z" fill="url(#${id}-metal)" stroke="#9b8872"/><path d="M154 170h100" stroke="#fff" stroke-opacity=".6"/>`
      : art(sample.id, 139, 132, 132, 66);
    // One series path: battery + → switch → lamp → sample → battery −.
    return `<svg class="desk-circuit" viewBox="0 0 400 230" role="img" aria-label="${sample.name}接入同一配置的電路，電源${power ? '接通' : '斷開'}，燈${lit ? '亮' : '不亮'}" data-lit="${lit}">
      ${defs(id, sample.id)}
      <ellipse cx="200" cy="207" rx="171" ry="10" fill="#c3bda3" opacity=".14"/><g class="desk-apparatus">${apparatus(0, 20, 68, 106, 112)}${apparatus(lit ? 2 : 1, 275, 13, 106, 112)}</g>
      <path d="M27 105H20Q10 105 10 95V69Q10 58 23 58H142M169 58h100q12 0 12 12v13h7" fill="none" stroke="#914b3b" stroke-width="7" stroke-linecap="round"/>
      <path d="M27 104H20Q11 104 11 95V69Q11 59 23 59H142M169 59h100q11 0 11 11v13h8" fill="none" stroke="#dc8971" stroke-width="2" stroke-linecap="round"/>
      <path d="M369 83h5q10 0 10 13v71q0 13-15 13H267M141 180H26q-14 0-14-13v-12q0-9 8-9h28" fill="none" stroke="#384c43" stroke-width="7" stroke-linecap="round"/>
      <path d="M369 82h5q11 0 11 14v71q0 13-15 13H267M141 179H26q-13 0-13-12v-12q0-8 7-8h28" fill="none" stroke="#82918a" stroke-width="2" stroke-linecap="round"/>
      <g class="circuit-switch"><rect x="132" y="49" width="47" height="20" rx="6" fill="#e5e4d5" stroke="#c5c9ba"/><circle cx="142" cy="58" r="3" fill="#b08e50"/><circle cx="169" cy="58" r="3" fill="#b08e50"/><path d="M142 58 169 ${power ? 58 : 39}" stroke="#718778" stroke-width="4" stroke-linecap="round"/></g>
      <text x="7" y="103" class="circuit-polarity">＋</text><text x="8" y="157" class="circuit-polarity">−</text>
      <path d="M128 192h151v10H128Z" fill="#667a70"/><path d="M128 192h151v4H128Z" fill="#a7b4a7"/>
      ${material}
      <g fill="url(#${id}-steel)" stroke="#89998b"><rect x="133" y="165" width="20" height="29" rx="2"/><rect x="256" y="165" width="20" height="29" rx="2"/></g>
      ${screw(id, 143, 178)}${screw(id, 266, 178)}
    </svg>`;
  }
  function appearance(sample) {
    return `<svg class="desk-specimen" viewBox="0 0 400 230" role="img" aria-label="${sample.name}：${sample.appearance}">${art(sample.id, 106, 14, 188)}</svg>`;
  }
  function processing(sample, id, showResult) {
    const metal = sample.type === '金屬';
    let result;
    if (metal) {
      result = `<path d="M233 88c-25-13-41 13-17 19s53-18 32-23-44 10-28 18 39-4 47 7" fill="none" stroke="url(#${id}-metal)" stroke-width="4" stroke-linecap="round"/><path d="m215 126 65 7-14 45-65-10Z" fill="url(#${id}-metal)" stroke="${colors[sample.id][1]}"/><path d="m216 129 59 6" stroke="#fff" stroke-opacity=".7"/><text x="320" y="103" class="process-label">拉成線</text><text x="320" y="158" class="process-label">壓成片</text>`;
    } else if (sample.id === 'sulfur') {
      result = `<g fill="#ead151" stroke="#c7a638" stroke-width="1.5"><path d="m205 123 22-29 20 30-34 15Z"/><path d="m241 150 23-26 22 24-29 13Z"/><path d="m231 169 12-13 11 15Z"/><path d="m277 111 10-15 12 19Z"/></g><text x="252" y="202" class="process-label">較脆，容易碎裂</text>`;
    } else {
      result = `${art('diamond', 200, 48, 120)}<text x="260" y="202" class="process-label">不能像金屬延展</text>`;
    }
    return `<svg class="desk-processing" viewBox="0 0 400 230" role="img" aria-label="${sample.name}的${showResult ? '加工結果：' + sample.ductility : '加工前樣品'}">${defs(id, sample.id)}
      ${showResult ? `${art(sample.id, 15, 56, 124)}<text x="77" y="202" class="process-label">原樣</text><path d="M148 123h33m-8-7 8 7-8 7" fill="none" stroke="#9b9f7e" stroke-width="2.5" stroke-linecap="round"/>${result}` : art(sample.id, 106, 14, 188)}
    </svg>`;
  }
  window.MaterialDesk = {
    create(samples) {
      const root = document.querySelector('#material-desk');
      const state = { mode: 'conductivity', metal: 'copper', nonmetal: 'sulfur', power: true, processed: true, application: 'copper' };
      const find = id => samples.find(sample => sample.id === id);
      const powerButton = root.querySelector('#desk-power');
      const processButton = root.querySelector('#desk-process');
      const render = () => {
        root.dataset.mode = state.mode;
        for (const side of ['metal', 'nonmetal']) {
          const sample = find(state[side]);
          const panel = root.querySelector(`[data-desk-side="${side}"]`);
          panel.querySelectorAll('[data-desk-sample]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.deskSample === sample.id)));
          const image = panel.querySelector('.desk-picture');
          image.innerHTML = state.mode === 'conductivity' ? circuit(sample, `desk-${side}`, state.power) : state.mode === 'appearance' ? appearance(sample) : processing(sample, `desk-${side}`, state.processed);
          const caption = state.mode === 'appearance' ? sample.appearance : state.mode === 'ductility' ? (state.processed ? sample.ductility : '加工前的樣品') : !state.power ? '電源斷開，燈不亮' : sample.conductivity === '良好' ? '燈亮，導電性良好' : '燈不亮，不易導電';
          panel.querySelector('.desk-result').textContent = `${sample.name}｜${caption}`;
        }
        powerButton.hidden = state.mode !== 'conductivity';
        powerButton.setAttribute('aria-checked', String(state.power));
        powerButton.querySelector('span:last-child').textContent = state.power ? '電源已接通' : '電源已斷開';
        processButton.hidden = state.mode !== 'ductility';
        processButton.setAttribute('aria-pressed', String(state.processed));
        processButton.textContent = state.processed ? '查看加工前' : '查看加工結果';
        root.querySelector('#desk-scope').textContent = {
          conductivity: '性質示意，非實測讀值；相同電路配置，不比較燈泡亮度。',
          appearance: '室溫約 25°C、常壓；有反光，不一定是金屬光澤。',
          ductility: '加工結果示意；能拉成線、壓成片稱為延展性佳，與硬度不同。'
        }[state.mode];
        const sample = find(state.application);
        const [illustration, title, tags, note] = uses[sample.id];
        const application = document.querySelector('#desk-application');
        application.querySelector('.desk-use-image').innerHTML = `<svg viewBox="0 0 200 130" aria-hidden="true">${art(illustration, 35, 0, 130)}</svg>`;
        application.querySelector('h3').textContent = title;
        application.querySelector('.desk-use-tags').replaceChildren(...tags.map(tag => { const span = document.createElement('span'); span.textContent = tag; return span; }));
        application.querySelector('.desk-use-note').textContent = note;
      };
      root.querySelectorAll('[data-desk-sample]').forEach(button => button.addEventListener('click', () => {
        state[button.closest('[data-desk-side]').dataset.deskSide] = button.dataset.deskSample;
        state.application = button.dataset.deskSample;
        render();
      }));
      powerButton.addEventListener('click', () => { state.power = !state.power; render(); });
      processButton.addEventListener('click', () => { state.processed = !state.processed; render(); });
      root.querySelector('#desk-reset').addEventListener('click', () => {
        Object.assign(state, { metal: 'copper', nonmetal: 'sulfur', power: true, processed: true, application: 'copper' });
        root.querySelector('[data-property=conductivity]').click();
      });
      render();
      return { setMode(mode) { state.mode = mode; render(); } };
    }
  };
})();
