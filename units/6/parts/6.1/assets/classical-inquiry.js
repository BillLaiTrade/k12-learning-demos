(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const book = {
    earth: {
      past: '「土」曾被視為物質的基本成分之一。', title: '看看土壤裡有什麼', instruction: '點選成分，觀察它在土樣中的位置。',
      conclusion: '日常泥土通常是混合物', result: '同一份土樣含多種成分；不同土樣的組成也可能不同。',
      brief: '19 世紀後期，道庫恰耶夫進行多地土壤調查；後續成分研究讓人們更清楚認識土壤。',
      note: '組成示意，非顯微照片；不表示各成分比例。',
      choices: [['mineral','礦物'],['organic','有機物'],['water','水'],['air','空氣']], initial: 'water',
      feedback: { mineral: '礦物：來自岩石風化等過程，是土壤固體顆粒的一部分。', organic: '有機物：可包括植物殘體及其分解形成的物質。', water: '水：存在於土壤顆粒之間的孔隙中。', air: '空氣：存在於未被水填滿的孔隙中，不是另一種石粒。' }
    },
    water: {
      past: '水曾被列為構成物質的基本元素。', title: '從兩個方向認識水', instruction: '看研究者做了什麼，以及哪些觀察改變了看法。',
      conclusion: '水是化合物', result: '水由氫、氧兩種元素組成，可以經化學分解得到其他物質。',
      brief: '卡文迪西、拉瓦節與拉普拉斯等人的水組成研究，配合後來的水分解證據，逐步改變人們對水的理解。',
      note: '不同研究的概念示意，非歷史裝置復原；分解以電解水為例，省略電解質及氣體檢驗細節，未表示氣體體積比例。',
      choices: [['formation','看生成水'],['decomposition','看分解水']], initial: 'decomposition',
      feedback: { formation: '生成水：氫與氧反應產生水蒸氣，冷卻後可凝結成水滴。水不是憑空出現，而是反應的產物。', decomposition: '分解水：適當條件下通電，水發生化學分解；兩側收集的氣體經檢驗，是已確認的氫與氧。不是水沸騰變成水蒸氣。' }
    },
    air: {
      past: '「氣」曾被視為物質的基本成分之一。', title: '看似相近，性質卻不同', instruction: '比較已知的蠟燭燃燒表現，再看空氣組成。',
      conclusion: '日常空氣是混合物', result: '空氣包含氮、氧及其他氣體，不能當成單一化學元素。',
      brief: '布萊克、普利斯特里等人研究不同氣體；拉瓦節將氧認識為大氣的一部分。性質比較還需配合組成研究。',
      note: '性質比較示意，非實測影片；氣體均無色，不以火焰大小計算空氣組成。',
      choices: [['oxygen','氧氣'],['ordinary','空氣'],['carbon','二氧化碳']], initial: 'ordinary',
      feedback: { oxygen: '氧氣：可使蠟燭燃燒更旺。氧氣是助燃氣體，並不是燃料。', ordinary: '空氣：能讓蠟燭燃燒；組成研究顯示，其中包含氮、氧及其他氣體。', carbon: '二氧化碳：不能維持這裡的蠟燭燃燒。這個比較本身還不足以證明空氣是混合物。' }
    },
    fire: {
      past: '火曾被列為構成物質的基本元素。', title: '火是成分，還是燃燒時的現象？', instruction: '從熟悉的蠟燭，看火焰與物質的變化。',
      conclusion: '火焰是燃燒時的現象', result: '燃燒涉及物質反應；火焰不是一種化學元素。',
      brief: '拉瓦節以稱量及氣體研究，解釋鉛、錫等金屬燃燒後增重，來自氧與金屬結合。',
      note: '以蠟充分燃燒為例；生成的氣體通常看不見，身分需由實驗確認。蠟融化本身不是燃燒。',
      choices: [], feedback: {}
    }
  };
  const svg = (content, label, height = 360) => `<svg class="inquiry-svg" viewBox="0 0 600 ${height}" role="img" aria-label="${label}">${content}</svg>`;
  function soil() {
    const points = [['mineral',310,290,'1'],['organic',760,330,'2'],['water',340,600,'3'],['air',680,720,'4']];
    return `<div class="soil-observer"><svg viewBox="0 0 1000 1000" role="group" aria-label="土壤組成觀察圖，選擇標記查看成分"><image href="assets/soil-composition.png" width="1000" height="1000"/><g>${points.map(([key,x,y,n])=>`<g data-observe="${key}" class="soil-target" role="button" tabindex="0" aria-label="查看${book.earth.choices.find(c=>c[0]===key)[1]}位置" aria-pressed="false"><circle class="soil-ring" cx="${x}" cy="${y}" r="53"/><circle cx="${x}" cy="${y}" r="20" fill="white" stroke="#366956" stroke-width="3"/><text x="${x}" y="${y+8}" text-anchor="middle" font-size="25" font-weight="800" fill="#214e3e">${n}</text></g>`).join('')}</g></svg></div><div class="soil-legend"><span>1 礦物顆粒</span><span>2 有機物</span><span>3 水</span><span>4 空氣孔隙</span></div>`;
  }
  function water() {
    const drop = (x,y,size=1) => `<path transform="translate(${x} ${y}) scale(${size})" d="M0-15C-4-7-12 0-12 8C-12 24 12 24 12 8C12 0 4-7 0-15Z" fill="#77c9e4" stroke="#4c9bb8" stroke-width="2"/>`;
    const formation = svg(`
      <g class="water-apparatus">
        <rect x="15" y="45" width="105" height="52" rx="13" fill="#fffaf0" stroke="#cdbd95"/>
        <text x="67" y="79" text-anchor="middle">氫氣</text>
        <rect x="15" y="151" width="105" height="52" rx="13" fill="#fffaf0" stroke="#cdbd95"/>
        <text x="67" y="185" text-anchor="middle">氧氣</text>
        <path d="M120 71H198V113H226M120 177H198V156H226" fill="none" stroke="#91a8a8" stroke-width="7"/>
        <path d="M175 71l-12-7v14ZM175 177l-12-7v14Z" fill="#507c75"/>
        <path d="M240 82Q220 82 220 104V206Q220 230 247 230H369Q397 230 397 206V104Q397 82 375 82Z" fill="#f6fbfd" stroke="#7e9fa8" stroke-width="3"/>
        <path d="M235 101V206Q235 215 248 215" fill="none" stroke="white" stroke-width="5"/>
        ${flame(273,194,.82)}
        <path d="M303 167q18-17 4-34m30 30q18-17 4-34" fill="none" stroke="#b1cbd4" stroke-width="4" stroke-linecap="round"/>
        <text x="310" y="58" text-anchor="middle" class="water-label">發生反應</text>
        ${drop(373,118,.6)}${drop(369,159,.7)}${drop(374,200,.5)}
        <path d="M402 95H460M450 89l10 6-10 6" fill="none" stroke="#7e9fa8" stroke-width="2"/>
        <circle cx="516" cy="144" r="64" fill="#edf8fc" stroke="#7eacba" stroke-width="3"/>
        ${drop(495,128,.8)}${drop(528,166,1.1)}
        <text x="516" y="55" text-anchor="middle" class="water-label">冷卻後</text>
        <text x="516" y="238" text-anchor="middle" class="water-label">凝結的水滴</text>
        <text x="308" y="262" text-anchor="middle" class="water-small">水蒸氣 → 冷卻 → 液態水</text>
      </g>`, '生成水的研究情境：氫與氧反應生成水蒸氣，冷卻後在容器壁凝結成水滴；右側放大水滴。', 280);
    const decomposition = svg(`
      <g class="water-apparatus">
        <path d="M155 133V247Q155 260 170 260H527Q540 260 540 247V133" fill="#f6fbfd" stroke="#7e9fa8" stroke-width="3"/>
        <path d="M158 160Q349 170 537 160V246Q537 257 523 257H173Q158 257 158 246Z" fill="#c4e9f3"/>
        <path d="M242 202V72Q242 52 264 52H282Q304 52 304 72V202" fill="#f9fdfe" stroke="#7e9fa8" stroke-width="3"/>
        <path d="M394 202V72Q394 52 416 52H434Q456 52 456 72V202" fill="#f9fdfe" stroke="#7e9fa8" stroke-width="3"/>
        <path d="M245 136Q273 145 301 136V202H245Z" fill="#c4e9f3"/>
        <path d="M397 105Q425 114 453 105V202H397Z" fill="#c4e9f3"/>
        <text x="273" y="32" text-anchor="middle" class="water-label">氫氣</text>
        <text x="425" y="32" text-anchor="middle" class="water-label">氧氣</text>
        <path d="M273 194V223M425 194V223" stroke="#6f7b75" stroke-width="10"/>
        <path d="M273 223V308H142M425 223V330H142" stroke="#6f8983" stroke-width="3" fill="none"/>
        <g fill="#fff" stroke="#6fa9ba" stroke-width="2"><circle cx="264" cy="172" r="5"/><circle cx="281" cy="153" r="4"/><circle cx="417" cy="172" r="5"/><circle cx="432" cy="145" r="4"/><circle cx="420" cy="123" r="3"/></g>
        <rect x="19" y="280" width="123" height="64" rx="12" fill="#f3e7c9" stroke="#b8a77f" stroke-width="2"/>
        <text x="80" y="306" text-anchor="middle" class="water-label">電源</text>
        <text x="80" y="332" text-anchor="middle" class="water-small">直流電</text><text x="153" y="305" class="water-small">－</text><text x="153" y="355" class="water-small">＋</text>
        <text x="62" y="123" class="water-label">水溶液</text>
        <path d="M100 137L180 182" fill="none" stroke="#7e9fa8" stroke-width="2"/>
        <text x="349" y="287" text-anchor="middle" class="water-small">電極附近冒出氣泡，分別收集</text>
        <text x="349" y="385" text-anchor="middle" class="water-small">氣體無色，身分需經檢驗確認</text>
      </g>`, '電解水的概念裝置：電源連接兩支電極，水溶液中的氣泡分別進入倒置的收集管；負極收集氫氣、正極收集氧氣，氣體經檢驗確認。', 405);
    return `<div class="water-investigation">
      <section class="water-record" data-focus="formation" aria-label="生成水的研究紀錄">
        <header><span class="water-direction">生成</span><strong>讓氫與氧反應，出現了什麼？</strong></header>
        ${formation}<p class="water-finding"><span>觀察</span>冷卻後，容器壁出現水滴。</p>
      </section>
      <div class="water-evidence-link">合起來看：水與氫、氧有什麼關係？</div>
      <section class="water-record" data-focus="decomposition" aria-label="分解水的研究紀錄">
        <header><span class="water-direction">分解</span><strong>水經化學分解，得到什麼？</strong></header>
        ${decomposition}<p class="water-finding"><span>檢驗</span>兩側收集的氣體，分別是氫與氧。</p>
      </section>
    </div>`;
  }
  function flame(x,y,size) {
    if (!size) return `<path d="M${x} ${y}q-15-12-4-26q10-12 0-23" fill="none" stroke="#9ca99f" stroke-width="3"/><text x="${x}" y="${y-56}" class="smoke-label" text-anchor="middle">熄滅</text>`;
    return `<g transform="translate(${x} ${y}) scale(${size})"><path d="M0 0C-30-3-30-29-17-45C-9-57-7-66-9-81C23-56 12-43 24-31C41-10 21 5 0 0Z" fill="#ef8b32"/><path d="M1-2C-14-4-14-18-5-31C1-38 3-43 1-51C22-29 22-12 1-2Z" fill="#ffe48a"/></g>`;
  }
  function air() {
    const gases=[['oxygen','氧氣',1.05,'助燃較旺'],['ordinary','空氣',.64,'可維持燃燒'],['carbon','二氧化碳',0,'不能維持此蠟燭燃燒']];
    const drawing=gases.map(([key,name,size,note],i)=>{const x=i*200;return `<g class="gas-record" data-focus="${key}"><rect x="${x+5}" y="5" width="190" height="285" rx="16"/><text x="${x+100}" y="40" text-anchor="middle" class="diagram-heading">${name}</text><path d="M${x+31} 254V76Q${x+100} 56 ${x+169} 76V254Z" fill="#f6fbfc" stroke="#9bb4b7" stroke-width="2"/><ellipse cx="${x+100}" cy="76" rx="69" ry="11" fill="#f9fcfd" stroke="#9bb4b7" stroke-width="2"/><rect x="${x+84}" y="190" width="32" height="62" rx="5" fill="#efdfb7" stroke="#b29d75"/><path d="M${x+100} 190v-13" stroke="#5e5a49" stroke-width="3"/>${flame(x+100,177,size)}<text x="${x+100}" y="278" text-anchor="middle" class="gas-result">${note}</text></g>`;}).join('');
    return svg(drawing+'<g class="air-composition"><path d="M115 317H485" stroke="#a4bdaf" stroke-width="2"/><text x="300" y="342" text-anchor="middle" class="diagram-heading">空氣組成研究：氮 ＋ 氧 ＋ 其他氣體</text></g>','氧氣、空氣與二氧化碳中的蠟燭燃燒表現不同；下方另列空氣包含的氣體。',365);
  }
  function fire() {
    const candle = lit => `<svg viewBox="0 0 180 205" role="img" aria-label="${lit?'蠟燭燃燒，燭芯上方有火焰，周圍發光放熱':'未點燃的蠟燭，包含蠟與燭芯'}">
      ${lit?'<ellipse cx="90" cy="73" rx="50" ry="61" fill="#ffedbd" opacity=".65"/>':''}
      <ellipse cx="90" cy="182" rx="48" ry="9" fill="#dce6e0"/>
      <rect x="60" y="${lit?119:91}" width="60" height="${lit?63:91}" rx="7" fill="#eddfb4" stroke="#b7a581" stroke-width="2"/>
      <ellipse cx="90" cy="${lit?119:91}" rx="30" ry="7" fill="#fff1cb" stroke="#b7a581" stroke-width="2"/>
      <path d="M90 ${lit?119:91}v-15" stroke="#5b5849" stroke-width="4"/>
      ${lit?flame(90,106,.95):''}</svg>`;
    return `<div class="fire-investigation">
      <div class="fire-sequence">
        <article class="fire-before"><h6>燃燒前</h6>${candle(false)}<p>蠟燭與空氣</p></article>
        <article class="fire-burning"><h6>燃燒時</h6>${candle(true)}<p>火焰發光、放熱</p></article>
        <article class="fire-after"><h6>生成物</h6>
          <svg viewBox="0 0 180 205" role="img" aria-label="燃燒生成的無色氣體需經實驗確認，圖示為氣體擴散與檢驗紀錄，不是可見的煙">
            <path d="M42 105V41m-12 14 12-14 12 14M89 89V25m-12 14 12-14 12 14M136 105V41m-12 14 12-14 12 14" fill="none" stroke="#9ab4b8" stroke-width="3" stroke-linecap="round"/>
            <rect x="31" y="111" width="118" height="75" rx="10" fill="#fdfefb" stroke="#a5bcb1" stroke-width="2"/>
            <path d="M45 135l6 6 12-14m-18 33 6 6 12-14" fill="none" stroke="#6f9d80" stroke-width="3"/>
            <path d="M76 135h57m-57 25h57" stroke="#b2c5ba" stroke-width="4"/>
          </svg><p>水蒸氣、二氧化碳<br><small>由實驗確認</small></p></article>
      </div>
      <div class="candle-reaction"><span>蠟（燃料）＋ 空氣中的氧氣</span><b>↓ 充分燃燒</b><span>水蒸氣 ＋ 二氧化碳</span></div>
      <div class="fire-findings"><strong>火焰是燃燒時的現象</strong><span>蠟與氧反應形成新物質，<br>不是釋出一種叫「火」的元素。</span></div>
    </div>`;
  }
  const diagrams = { earth:soil, water, air, fire };
  function select(key, observation) {
    const root=$('#visual-inquiry');
    root.querySelectorAll('[data-observation]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.observation===observation)));
    root.querySelectorAll('[data-focus]').forEach(n=>n.classList.toggle('focused',n.dataset.focus===observation));
    root.querySelectorAll('[data-observe]').forEach(n=>{
      const active=n.dataset.observe===observation;
      n.setAttribute('aria-pressed',String(active)); n.classList.toggle('focused',active);
    });
    $('#inquiry-feedback').textContent=book[key].feedback[observation];
    root.dataset.observation=observation;
  }
  function render(key) {
    const item=book[key],root=$('#visual-inquiry');
    root.dataset.item=key;
    $('#inquiry-past-icon').className=`classical-icon icon-${key}`;
    const texts={ 'inquiry-past-summary':item.past, 'inquiry-title':item.title, 'inquiry-instruction':item.instruction, 'inquiry-conclusion-title':item.conclusion, 'inquiry-conclusion-text':item.result, 'inquiry-history-brief':item.brief, 'inquiry-diagram-note':item.note };
    Object.entries(texts).forEach(([id,value])=>{$(`#${id}`).textContent=value;});
    $('#inquiry-diagram').innerHTML=diagrams[key]();
    $('#inquiry-conclusion-visual').innerHTML=key==='earth'?'<div class="result-chips"><span>礦物</span><span>有機物</span><span>水</span><span>空氣</span></div><span class="classical-icon icon-earth"></span>':key==='water'?'<div class="result-chips"><span>氫元素</span><span>氧元素</span></div><span class="classical-icon icon-water"></span>':key==='air'?'<div class="result-chips"><span>氮</span><span>氧</span><span>其他氣體</span></div><span class="classical-icon icon-air"></span>':'<span class="classical-icon icon-fire"></span><div class="result-chips"><span>物質反應</span><span>發熱、發光</span></div>';
    const controls=$('#inquiry-controls');controls.replaceChildren();
    controls.hidden=item.choices.length===0;
    $('#inquiry-feedback').hidden=controls.hidden;
    item.choices.forEach(([value,label])=>{
      const button=document.createElement('button');button.type='button';button.dataset.observation=value;button.textContent=label;
      button.addEventListener('click',()=>select(key,value));controls.append(button);
    });
    root.querySelectorAll('[data-observe]').forEach(point=>{
      point.addEventListener('click',()=>select(key,point.dataset.observe));
      point.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(key,point.dataset.observe);}});
    });
    $('#inquiry-research').open=false;
    if (item.choices.length) select(key,item.initial);
    else { delete root.dataset.observation; $('#inquiry-feedback').textContent=''; }
  }
  window.ClassicalInquiry={render};
})();
