(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  // Shared observations: both tables refer to the same named, identified samples.
  const samples = [
    { id: 'copper', name: '銅', type: '金屬', state: '固體', appearance: '紅棕色，有金屬光澤；固體', conductivity: '良好', ductility: '佳，可拉成線、壓成片', uses: '銅線：導電、可拉成細線' },
    { id: 'aluminium', name: '鋁', type: '金屬', state: '固體', appearance: '銀白色，有金屬光澤；固體', conductivity: '良好', ductility: '佳，可拉成線、壓成片', uses: '鋁箔：可壓成薄片；導線：可導電' },
    { id: 'iron', name: '鐵', type: '金屬', state: '固體', appearance: '銀灰色，有金屬光澤；固體', conductivity: '良好', ductility: '佳，可拉成線、壓成片', uses: '鐵絲；生活鋼材則是含鐵的合金' },
    { id: 'sulfur', name: '硫', type: '非金屬', state: '固體', appearance: '黃色，非金屬光澤；固體', conductivity: '不易導電', ductility: '差，較脆，不能拉成細線', uses: '用於製造硫酸等化工原料' },
    { id: 'diamond', name: '碳（鑽石）', type: '非金屬', state: '固體', appearance: '純淨時可透明，非金屬光澤；固體', conductivity: '不易導電', ductility: '差，不能像金屬拉成線', uses: '切割、研磨工具：硬度很高' }
  ];
  const exceptions = {
    graphite: { id: 'graphite', name: '碳（石墨）', type: '非金屬', state: '固體', conductivity: '可導電' },
    mercury: { id: 'mercury', name: '汞', type: '金屬', state: '液體', conductivity: '可導電' }
  };
  const propertyNotes = {
    appearance: '銅、鋁、鐵都有金屬光澤，但顏色不必相同。這五份樣品在室溫下都是固體，所以只看固態也分不出金屬與非金屬。',
    conductivity: '這份資料中，銅、鋁、鐵的導電性佳，硫與鑽石不易導電。先保留「典型差異」的說法，下一段加入石墨再檢查。',
    ductility: '銅、鋁、鐵能拉成細線或壓成薄片；硫與鑽石不能像金屬那樣延展。堅硬和延展性好不是同一件事。',
    uses: '銅線把導電性與延展性一起用上，鋁箔利用可壓成薄片的性質，鑽石工具利用高硬度。用途和性質的組合有關。'
  };
  function cell(tag, content, scope) {
    const node = document.createElement(tag);
    node.textContent = content;
    if (scope) node.scope = scope;
    return node;
  }
  function renderProperties() {
    const body = $('#properties-table tbody');
    for (const sample of samples) {
      const row = document.createElement('tr');
      row.dataset.sample = sample.id;
      row.append(cell('th', sample.name, 'row'));
      for (const key of Object.keys(propertyNotes)) {
        const td = cell('td', sample[key]);
        td.dataset.column = key;
        row.append(td);
      }
      body.append(row);
    }
  }
  renderProperties();
  function selectProperty(key) {
    $$('[data-property]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.property === key)));
    $$('#properties-table [data-column]').forEach(node => node.classList.toggle('active-column', node.dataset.column === key));
    $('#property-note').textContent = propertyNotes[key];
  }
  $$('[data-property]').forEach(button => button.addEventListener('click', () => selectProperty(button.dataset.property)));
  selectProperty('appearance');

  const classicalDetails = {
    earth: ['土', '日常泥土包含礦物、有機物、水、空氣等成分；不同樣品的組成也可能不同。', '它通常是多種物質的混合物，不能當成單一化學元素。', '這裡以日常泥土作比較，不把古代「土」的意涵直接等同現代泥土。'],
    water: ['水', '水可以經由化學分解得到氫和氧。', '依今天的化學判準，水是化合物。', '回顧第四單元已學過的結果；氣體身分來自已確認的實驗資料，不能只靠外觀判定。'],
    air: ['氣', '日常空氣含有氮、氧等多種氣體。', '空氣是混合物，不是單一化學元素。', '這裡以日常空氣作對照；古代「氣」的意涵，不等於現代空氣的完整科學描述。'],
    fire: ['火', '火焰是燃燒過程中可見的現象，涉及高溫氣體等發光。', '火焰不是一種化學元素，不能和銅、鐵等元素並列。', '古代四元素曾是一套解釋物質的觀點；今天依物質組成及實驗證據使用不同的分類。']
  };
  let classicalSelection = null;
  const detail = $('#classical-detail');
  function showClassicalDetail(key) {
    classicalSelection = key;
    const [name, main, conclusion, note] = classicalDetails[key];
    $$('[data-classical]').forEach(button => {
      const selected = button.dataset.classical === key;
      button.setAttribute('aria-expanded', String(selected));
      button.classList.toggle('selected', selected);
    });
    $('#classical-detail-title').textContent = `補充說明｜${name}`;
    $('#classical-detail-main').textContent = main;
    $('#classical-detail-conclusion').textContent = conclusion;
    $('#classical-detail-note').textContent = note;
    $('#classical-detail-icon').className = `detail-symbol classical-icon icon-${key}`;
    $('#classical-detail-icon').hidden = key === 'water';
    $('#water-evidence').hidden = key !== 'water';
    $('#boyle-toggle').hidden = key !== 'water';
    $('#boyle-toggle').setAttribute('aria-expanded', 'false');
    $('#boyle-explanation').hidden = true;
    detail.hidden = false;
    $('#classical-announcement').textContent = `已展開${name}的補充說明，四列對照仍完整顯示。`;
  }
  $$('[data-classical]').forEach(button => button.addEventListener('click', () => showClassicalDetail(button.dataset.classical)));
  $('#classical-close').addEventListener('click', () => {
    const previous = classicalSelection;
    detail.hidden = true;
    classicalSelection = null;
    $$('[data-classical]').forEach(button => { button.setAttribute('aria-expanded', 'false'); button.classList.remove('selected'); });
    $('#classical-announcement').textContent = '補充說明已收起，四列對照仍完整顯示。';
    if (previous) $(`[data-classical="${previous}"]`).focus({ preventScroll: true });
  });
  $('#boyle-toggle').addEventListener('click', () => {
    const open = $('#boyle-toggle').getAttribute('aria-expanded') !== 'true';
    $('#boyle-toggle').setAttribute('aria-expanded', String(open));
    $('#boyle-explanation').hidden = !open;
  });

  const shownExceptions = new Set();
  function renderExceptions() {
    const body = $('#exceptions-table tbody');
    body.replaceChildren();
    const rows = [...samples, ...[...shownExceptions].map(key => exceptions[key])];
    for (const sample of rows) {
      const row = document.createElement('tr');
      row.dataset.sample = sample.id;
      const name = cell('th', sample.name, 'row');
      if (sample.id in exceptions) {
        row.className = 'exception-row';
        const label = cell('span', '新增');
        label.className = 'pill';
        name.append(document.createTextNode(' '), label);
      }
      row.append(name, cell('td', sample.type), cell('td', sample.state), cell('td', sample.conductivity));
      body.append(row);
    }
    $$('[data-exception]').forEach(button => button.setAttribute('aria-pressed', String(shownExceptions.has(button.dataset.exception))));
    const notes = [];
    if (shownExceptions.has('graphite')) notes.push('石墨是能導電的非金屬，所以不能說「能導電就一定是金屬」。');
    if (shownExceptions.has('mercury')) notes.push('汞是室溫下的液態金屬，所以不能說「金屬在室溫下全部是固體」。');
    $('#exception-note').textContent = notes.join(' ') || '選取石墨或汞，讓新資料和原有資料並列。';
  }
  $$('[data-exception]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.exception;
    if (shownExceptions.has(key)) shownExceptions.delete(key); else shownExceptions.add(key);
    renderExceptions();
  }));
  $('#exceptions-reset').addEventListener('click', () => { shownExceptions.clear(); renderExceptions(); });
  renderExceptions();

  const symbols = [
    ['氫', 'H', '「气」部是氣態元素名稱的常見線索。'],
    ['氦', 'He', '「气」部是氣態元素名稱的常見線索；He 的 e 要小寫。'],
    ['碳', 'C', '「石」字旁是固態非金屬名稱的常見線索；石墨與鑽石都使用 C。'],
    ['鈣', 'Ca', '「金」字旁是固態金屬名稱的常見線索；Ca 和 C 是不同符號。'],
    ['銅', 'Cu', '「金」字旁是固態金屬名稱的常見線索；Cu 不是 CU。'],
    ['鐵', 'Fe', '「金」字旁是固態金屬名稱的常見線索；鐵的符號是 Fe。'],
    ['鋁', 'Al', '「金」字旁是固態金屬名稱的常見線索；Al 第二個字母是小寫 l。'],
    ['硫', 'S', '「石」字旁是固態非金屬名稱的常見線索。'],
    ['汞', 'Hg', '汞是室溫下的液態金屬，名稱沒有「金」字旁；偏旁不能當作絕對規則。']
  ];
  function selectSymbol(symbol) {
    const [name, value, clue] = symbols.find(item => item[1] === symbol);
    $$('[data-symbol]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.symbol === symbol)));
    const glyph = $('#symbol-glyph');
    glyph.replaceChildren(document.createTextNode(value[0]));
    if (value[1]) { const lower = cell('span', value[1]); lower.className = 'symbol-lower'; glyph.append(lower); }
    glyph.setAttribute('aria-label', `元素符號 ${value}`);
    $('#symbol-name').textContent = name;
    $('#symbol-writing').textContent = `${value[0]} 大寫${value[1] ? `，${value[1]} 小寫` : '；只有一個字母'}。`;
    $('#symbol-clue').textContent = clue;
  }
  for (const [name, value] of symbols) {
    const button = cell('button', name);
    button.type = 'button';
    button.dataset.symbol = value;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => selectSymbol(value));
    $('#symbol-choices').append(button);
  }
  selectSymbol('Fe');

  const carbon = {
    appearance: ['深灰至黑色，較軟，容易留下痕跡。', '純淨時可透明，非常堅硬。', '相同的是元素身分；外觀、硬度等性質仍可不同。'],
    conductivity: ['可以導電，是非金屬中的導電例子。', '通常不易導電。', '同為碳元素的不同形態，導電性也可不同；不能把石墨的性質套用到所有碳樣品。'],
    uses: ['可作電極；也用於鉛筆芯。一般鉛筆芯含石墨與黏土，不是純碳。', '高硬度可用於切割、研磨工具；也可作珠寶。', '用途和樣品性質有關。相同的元素符號 C，並沒有說明所有性質。']
  };
  function selectCarbon(key) {
    $$('[data-carbon]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.carbon === key)));
    $('#graphite-detail').textContent = carbon[key][0];
    $('#diamond-detail').textContent = carbon[key][1];
    $('#carbon-note').textContent = carbon[key][2];
  }
  $$('[data-carbon]').forEach(button => button.addEventListener('click', () => selectCarbon(button.dataset.carbon)));
  selectCarbon('appearance');

  const form = $('#review-form');
  const feedback = $('#review-feedback');
  let submitted = false;
  function hideFeedback(edited) {
    feedback.hidden = true;
    feedback.classList.remove('success');
    feedback.replaceChildren();
    $('#review-edit-note').textContent = edited ? '內容已變更，請重新檢查這份介紹。' : '';
  }
  form.addEventListener('change', () => { if (submitted) { hideFeedback(true); submitted = false; } });
  form.addEventListener('reset', () => { submitted = false; hideFeedback(false); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    const choices = data.getAll('wire');
    const complete = Boolean(data.get('copper') && data.get('iron') && choices.length && data.get('claim'));
    const nameCorrect = data.get('copper') === 'Cu' && data.get('iron') === 'Fe';
    const wireCorrect = choices.length === 2 && choices.includes('conductivity') && choices.includes('ductility');
    const claimCorrect = data.get('claim') === 'graphite';
    const success = complete && nameCorrect && wireCorrect && claimCorrect;
    hideFeedback(false);
    feedback.hidden = false;
    feedback.classList.toggle('success', Boolean(success));
    feedback.append(cell('h3', !complete ? '還有資料尚未完成' : success ? '這份介紹有依據，也保留了例外' : '有些說明需要再核對'));
    if (!complete) {
      feedback.append(cell('p', '請完成兩個名稱／符號對應、選擇用途依據，以及回應導電性的判斷，再一起檢查。'));
    } else {
      const list = document.createElement('ul');
      list.append(
        cell('li', nameCorrect ? '名稱與符號對應正確：銅 Cu、鐵 Fe。' : '再核對名稱：銅是 Cu，鐵是 Fe。大小寫也要保留。'),
        cell('li', wireCorrect ? '導電性佳能傳導電流，延展性佳能拉成細線；兩項性質一起支持這個用途。' : '導電細線需要導電性，也需要能拉成線的延展性。顏色與「是固體」不足以說明這個用途。'),
        cell('li', claimCorrect ? '石墨是能導電的非金屬，因此「能導電」不足以斷定是金屬。' : '回看石墨：它能導電，但屬於非金屬。汞則是室溫下的液態金屬；兩者都提醒我們保留例外。')
      );
      feedback.append(list);
    }
    submitted = true;
    feedback.focus({ preventScroll: true });
  });
  $('#review-submit').disabled = false;

  // Reading navigation only; it does not grade or count progress.
  if ('IntersectionObserver' in window) {
    const visible = new Map();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => visible.set(entry.target.id, entry.isIntersecting));
      const active = $$('.lesson-card').find(section => visible.get(section.id));
      if (!active) return;
      $$('.route a').forEach(link => {
        if (link.hash === `#${active.id}`) link.setAttribute('aria-current', 'step');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-5% 0px -45% 0px', threshold: 0 });
    $$('.lesson-card').forEach(section => observer.observe(section));
  }
})();
