# 6.1 教材資料與素材

- `elements.css`、`elements.js` 為本教材原生 CSS／JavaScript，沒有外部套件或服務。
- 小葵與阿公直接引用共用 `shared-assets/characters/dialogue-character-avatars.png`；未複製人物素材。
- 石墨、鑽石的 inline SVG 為本教材繪製的外觀示意，不是照片或原子排列圖。
- 五種初始樣品及兩份例外資料共用同一組樣品資料來源；表內明示室溫約 25°C、常壓與碳樣品形態。

## 內容來源（2026-10-28 實際讀取）

- 皇家化學學會元素資料：[銅](https://periodic-table.rsc.org/element/29/copper)、[鋁](https://periodic-table.rsc.org/element/13/aluminium)、[鐵](https://periodic-table.rsc.org/element/26/iron)、[硫](https://periodic-table.rsc.org/element/16/sulfur)、[碳](https://periodic-table.rsc.org/element/6/carbon)、[汞](https://periodic-table.rsc.org/element/80/mercury)。用於名稱、符號、外觀、狀態與用途及碳不同形態的資料查核。
- 科學史研究所：[Robert Boyle](https://www.sciencehistory.org/education/scientific-biographies/robert-boyle/)。用於四元素傳統、波以耳對元素觀點及實驗研究的歷史背景。教材未採用原典引文或複製外部圖像。
- 水的化學分解承接 4.1 及教育部自然領綱 Aa-Ⅳ-3，與波以耳的工作分開呈現。
- 課綱、公開教材計畫與已核可範圍另見 `BillLaiTrade/k12` 的單元 6 規劃。來源支持內容查核，不代表指定出版社已逐頁驗收。

## 製作原則

使用者已指示先完成 6.1 六張的內容與可操作初稿，故事保留基本銜接，後續可調整，不以敘事完美作為製作前提。五段教學不判分，只在最後安排一次整合檢核。頁面不是全單元完成或最終驗收紀錄。

## 第一區塊四列對照修訂（2026-10-28）

使用者核可四列逐項左右對齊、主要結果預設全部可見，點選只在下方補充說明的示意。`classical-comparison.css` 為第一區塊樣式；`classical-elements.png` 為依核可圖生成的透明土、水、氣、火插畫素材，以 CSS 定位取用。插畫不是真實樣品照片或實驗證據；水分解紀錄為 inline SVG，兩瓶氣體沒有液面或氣體顏色，且註明未表示體積比例。共用角色頭像維持直接引用。

新增查核來源（實際讀取）：[Soil Science Society of America 教師資源：Soil Basics](https://www.soils4teachers.org/soil-basics)、[OpenStax Chemistry 2e：Phases and Classification of Matter](https://openstax.org/books/chemistry-2e/pages/1-2-phases-and-classification-of-matter)、[Britannica：Air](https://www.britannica.com/science/air)、[Britannica：Flame](https://www.britannica.com/science/flame)，並重新讀取上述波以耳科學史。分別支持泥土為多成分混合物、水可分解、空氣為氣體混合物、火焰涉及燃燒與氣體發光；古代意涵與現代日常對應事物不直接等同。

## 四項獨立科學史補充（2026-10-28）

依使用者指示為每項加入三段歷程，來源在各補充面板中可直接查閱。新增實際讀取的依據：

- [Britannica：道庫恰耶夫](https://www.britannica.com/biography/Vasily-Vasilyevich-Dokuchayev)、[土壤科學研究](https://www.britannica.com/science/pedology)，及前述 SSSA 土壤成分頁：支持多地土壤調查、成土條件及成分研究的敘述。
- [Britannica：卡文迪西](https://www.britannica.com/biography/Henry-Cavendish)：支持氫與氧反應生成水的研究。
- [Science History Institute：拉瓦節](https://www.sciencehistory.org/education/scientific-biographies/antoine-laurent-lavoisier/)：支持與拉普拉斯的水組成研究，以及鉛／錫燃燒後質量增加與氧結合的解釋。
- [Science History Institute：普利斯特里](https://www.sciencehistory.org/education/scientific-biographies/joseph-priestley/)：支持布萊克的二氧化碳、不同氣體的製備與性質比較，以及氧氣研究。

古代四元素概念與後來日常事物研究分開標示；不虛構每一項各有一場推翻四元素說的實驗，不把歷史人物的不同解釋全部說成今日觀點。

## 四項圖像研究區（2026-10-28）

使用者核可四項都依「古代觀點插畫 → 圖像化研究證據 → 現代理解」編排，取代主要畫面的三欄長文。`classical-inquiry.js`／`.css` 實作四項獨立觀察；`soil-composition.png` 依核可土壤示意生成並修正空氣孔隙的位置，作組成示意，不是顯微照片。圖中礦物、有機物、水及未充水孔隙分別有互動標記，不表示成分比例。其餘水、氣、火使用可縮放 SVG 研究圖解，沒有虛構實測數值。

- 水：生成與分解兩份結果同時顯示；操作只突出其中一份，不隱藏結果。氣體無色，圖不表示體積比例，不提供反應操作指引。
- 氣：蠟燭在氧氣、空氣、二氧化碳中的已知表現定性比較，另列氮、氧與其他氣體組成；明示性質比較本身不足以證明空氣為混合物。氧是助燃氣體，不是燃料；二氧化碳敘述限定為這裡的蠟燭。
- 火：比較金屬樣品與其氧化產物質量，追蹤參與反應的氧。比較對象是樣品，不是密閉系統總質量；未加入虛構讀值。
- 詳細科學史與先前已查核來源保留於可展開區，主要結果與短研究脈絡直接可見。

本次重新讀取 SSSA Soil Basics、OpenStax 1.2，並以 [Britannica Oxygen](https://www.britannica.com/science/oxygen) 及 [Carbon dioxide](https://www.britannica.com/science/carbon-dioxide) 核對氧與燃燒、二氧化碳不維持多數材料燃燒的性質。未把二氧化碳寫成對所有物質都絕對不助燃。其餘歷史線索沿用上節實際讀取來源。
