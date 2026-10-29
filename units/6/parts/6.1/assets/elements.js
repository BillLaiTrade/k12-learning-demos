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
  const materialDesk = window.MaterialDesk.create(samples);
  function selectProperty(key) {
    $$('[data-property]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.property === key)));
    $$('#properties-table [data-column]').forEach(node => node.classList.toggle('active-column', node.dataset.column === key));
    $('#property-note').textContent = propertyNotes[key];
    materialDesk.setMode(key);
  }
  $$('[data-property]').forEach(button => button.addEventListener('click', () => selectProperty(button.dataset.property)));
  selectProperty('conductivity');

  const classicalDetails = {
    earth: ['土', '日常泥土包含礦物、有機物、水、空氣等成分；不同樣品的組成也可能不同。', '它通常是多種物質的混合物，不能當成單一化學元素。', '這裡以日常泥土作比較，不把古代「土」的意涵直接等同現代泥土。'],
    water: ['水', '水可以經由化學分解得到氫和氧。', '依今天的化學判準，水是化合物。', '回顧第二單元已學過的結果；氣體身分來自已確認的實驗資料，不能只靠外觀判定。'],
    air: ['氣', '日常空氣含有氮、氧等多種氣體。', '空氣是混合物，不是單一化學元素。', '這裡以日常空氣作對照；古代「氣」的意涵，不等於現代空氣的完整科學描述。'],
    fire: ['火', '火焰是燃燒過程中可見的現象，涉及高溫氣體等發光。', '火焰不是一種化學元素，不能和銅、鐵等元素並列。', '古代四元素曾是一套解釋物質的觀點；今天依物質組成及實驗證據使用不同的分類。']
  };
  // Representative historical evidence, not four identical discovery stories.
  const classicalHistories = {
    earth: {
      pastTitle: '「土」曾是基本成分之一',
      past: '古希臘四元素觀點把「土」列為解釋物質的基本成分之一；當時的「土」並不是今天已確認的化學元素。',
      evidenceTitle: '土壤調查與成分研究',
      evidence: '19 世紀後期，道庫恰耶夫調查不同地區的土壤，研究岩石、氣候與生物如何影響土壤。後續土壤科學也以物理、化學等方法研究其成分。',
      observation: '研究發現：不同土壤並不相同；日常土壤包含礦物、有機物、水、空氣等多種成分。',
      modernTitle: '日常泥土通常是混合物',
      modern: '泥土不是一種單一化學元素，而是包含多種物質的混合物；不同樣品的組成可以不同。',
      scope: '這是後來認識日常土壤的代表性研究脈絡，不是某一次土壤實驗就推翻古代四元素說。古代「土」的意涵，也不直接等於現代泥土。',
      sources: [['道庫恰耶夫的土壤調查','https://www.britannica.com/biography/Vasily-Vasilyevich-Dokuchayev'],['土壤科學的研究方法','https://www.britannica.com/science/pedology'],['SSSA：土壤成分','https://www.soils4teachers.org/soil-basics']]
    },
    water: {
      pastTitle: '水曾被列為基本元素',
      past: '在古希臘四元素觀點中，水是組成物質的基本成分之一。但這不等於水符合今天化學元素的判準。',
      evidenceTitle: '生成水與分解水的證據',
      evidence: '18 世紀後期，卡文迪西研究氫與氧反應生成水；拉瓦節與拉普拉斯等人也研究水的組成。後來，水電解等實驗又提供了把水分解成氫、氧的證據。',
      observation: '證據連結：氫與氧能反應生成水，水也能化學分解成氫與氧，因此水不是單一化學元素。',
      modernTitle: '水是化合物',
      modern: '水由氫、氧兩種元素組成，可以經化學分解得到其他物質；下圖回顧已學過的分解結果。',
      scope: '波以耳推動對傳統元素觀點的質疑與實驗研究；水的組成研究及後來的水電解，並不是波以耳完成的同一項實驗。',
      sources: [['卡文迪西的氣體與水研究','https://www.britannica.com/biography/Henry-Cavendish'],['拉瓦節與水的組成','https://www.sciencehistory.org/education/scientific-biographies/antoine-laurent-lavoisier/'],['水的化學分解','https://openstax.org/books/chemistry-2e/pages/1-2-phases-and-classification-of-matter']]
    },
    air: {
      pastTitle: '「氣」曾是基本成分之一',
      past: '古希臘四元素觀點把「氣」視為基本成分之一；當時沒有今天對空氣中各種氣體的組成認識。',
      evidenceTitle: '製備、收集並比較不同氣體',
      evidence: '18 世紀，布萊克研究後來稱為二氧化碳的氣體，普利斯特里等人研究氧氣。研究者比較不同氣體的性質，拉瓦節進一步認識到氧是大氣的一部分。',
      observation: '觀察差異：有些氣體能讓燃燒更旺，有些不能維持燃燒。外觀看似相近的氣體，性質可以不同。',
      modernTitle: '日常空氣是混合物',
      modern: '空氣包含氮、氧及其他氣體，不是一種單一化學元素。製得某種氣體的實驗，也不等於已把空氣的所有成分一次分開。',
      scope: '這是不同研究者逐步認識氣體及大氣組成的例子。古代「氣」不直接等於現代空氣；這些發現也不是同一場空氣分解實驗。',
      sources: [['普利斯特里與不同氣體的研究','https://www.sciencehistory.org/education/scientific-biographies/joseph-priestley/'],['拉瓦節對氧與大氣的解釋','https://www.sciencehistory.org/education/scientific-biographies/antoine-laurent-lavoisier/'],['現代空氣組成','https://www.britannica.com/science/air']]
    },
    fire: {
      pastTitle: '火曾被當作基本元素',
      past: '古希臘四元素觀點把火列為物質的基本成分之一，用這套觀點理解自然中的變化；今天對燃燒與火焰的解釋則不同。',
      evidenceTitle: '燃燒的稱量與氣體研究',
      evidence: '18 世紀，拉瓦節研究金屬燃燒前後的質量及參與反應的氣體。他指出，鉛、錫等金屬燃燒後質量增加，是因為氧與金屬結合。',
      observation: '實驗發現：氧與金屬結合，造成可量測的質量增加。這些燃燒現象需要用物質反應來解釋。',
      modernTitle: '火焰是燃燒時的現象',
      modern: '火焰涉及燃燒中的高溫氣體等發光，不是一種化學元素。燃燒可以有火焰，但不是所有燃燒都會出現可見火焰。',
      scope: '金屬燃燒的稱量是理解燃燒的代表性證據，不是從古代四元素觀點直接跳到今日全部燃燒理論的單一步驟。',
      sources: [['拉瓦節的金屬燃燒稱量','https://www.sciencehistory.org/education/scientific-biographies/antoine-laurent-lavoisier/'],['火焰的現代理解','https://www.britannica.com/science/flame'],['燃燒與發光放熱','https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions']]
    }
  };
  function renderClassicalHistory(key) {
    const item = classicalHistories[key];
    const name = classicalDetails[key][0];
    $('#classical-history-title').textContent = `${name}的觀念發展脈絡`;
    const values = {
      'history-past-title': item.pastTitle, 'history-past-text': item.past,
      'history-evidence-title': item.evidenceTitle, 'history-evidence-text': item.evidence,
      'history-observation': item.observation,
      'history-modern-title': item.modernTitle, 'history-modern-text': item.modern,
      'history-scope': item.scope
    };
    for (const [id, text] of Object.entries(values)) $(`#${id}`).textContent = text;
    const sources = $('#history-sources');
    sources.replaceChildren();
    item.sources.forEach(([title, url], index) => {
      if (index) sources.append(document.createTextNode(' ／ '));
      const a = cell('a', title); a.href = url; sources.append(a);
    });
  }
  let classicalSelection = null;
  const detail = $('#classical-detail');
  function showClassicalDetail(key) {
    classicalSelection = key;
    renderClassicalHistory(key);
    const [name, main, conclusion, note] = classicalDetails[key];
    $$('[data-classical]').forEach(button => {
      const selected = button.dataset.classical === key;
      button.setAttribute('aria-expanded', String(selected));
      button.classList.toggle('selected', selected);
    });
    $('#classical-detail-title').textContent = `補充說明｜${name}`;
    window.ClassicalInquiry.render(key, classicalHistories[key]);
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
