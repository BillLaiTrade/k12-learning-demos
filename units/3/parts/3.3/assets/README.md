# 3.3 示意素材與聲音模型

- 對話頭像：沿用儲存庫共用 `shared-assets/characters/dialogue-character-avatars.png`。
- 首頁插圖：`sound-fair-opening.png`為使用者於2026-10-30選定的第三輪C02「聲音體驗市集」。以image_gen依1.1／1.2及共用角色參考生成，來源為`docs/reviews/unit-3.3-hero-candidates-round3/candidate-c02.png`；1672×941原始PNG直接採用，未裁切、重畫或後製。生成紀錄見該輪`generation.json`。
- 第一區音叉：依核可示意圖，以image_gen製作`fork-tabletop-background.png`及透明`fork-apparatus.png`，生成紀錄見`fork-generation.json`。音叉照片的兩叉股分段彎曲，叉柄／木座固定；音槌及單叉股放大觀察使用SVG。
- 琴弦、空氣柱與訊號圖為本次繪製的SVG，無外部圖片授權依賴。
- 示意音為本次以Web Audio產生的短音，不是錄音；學生頁已標明弦音／管音示意。沒有替換3.2已核可的真實音效。
- 第一區`fork-model.mjs`為440Hz純音衰減示意，輕／較重敲相對振幅0.30／0.70，長2.4秒，並非音叉實錄。音槌接觸、聲音及叉股位移共用音訊時間；畫面5Hz放慢、位移放大，兩叉股反向；停止後放大圖明示此次最大振幅快照。比較紀錄採相同時間窗（4個週期，約9.09ms）及比例，振幅標記由平衡位置到單側最大位移，不是峰到峰值。
- 其餘區`model.mjs`的固定泛音係數用於呈現不同波形；不宣稱精確重建特定樂器。音訊為1.6秒，20ms淡入、120ms淡出，依RMS作近似大小聲匹配；不是聲級校準，也不保證不同設備與頻率下主觀響度相等。
- 畫面弦振動以基本頻率的1/60呈現；管內空氣位移以1/100放慢，使用兩端開口管基本模式的往返位移，聲音保持原音高。
- 弦的相對模型：60cm、相對張力1時220Hz，頻率隨有效長度反比、相對張力平方根變化。管的模型：同類兩端開口管、空氣聲速343m/s，基本頻率依 `343/(2L)` 計算；忽略端點修正，學生不需運算這些公式。
- 相對振幅、圖形振幅、系統音量及真實耳邊聲級必須分開理解；第七區dBA資料不是網頁聲音輸出讀值。第六、七區不播放極端頻率或高聲級情境。

來源：

- [教育部自然科學課綱](https://edu.law.moe.gov.tw/LawContent.aspx?id=GL001823)，Ka-Ⅳ-5與附錄。
- [OpenStax 17.6 Hearing](https://openstax.org/books/college-physics-2e/pages/17-6-hearing)：人耳可聽範圍約20～20000Hz，狗高頻上限約30000Hz、蝙蝠可達100000Hz；物種與個體會有差異。頁面只作上限例子，不製造未查證的下限。
- [OpenStax 17.3 Sound Intensity and Sound Level](https://openstax.org/books/college-physics-2e/pages/17-3-sound-intensity-and-sound-level)：聲級、參考基準與分貝非線性關係。
- [NIDCD Noise-Induced Hearing Loss](https://www.nidcd.nih.gov/health/noise-induced-hearing-loss)：生活情境的平均聲級參考，一般交談60～70dBA、電影院74～104dBA、音樂會94～110dBA。本頁僅引用資料，沒有新增噪音／聽力保護課程。
- 更完整教材核對及資料限制見規劃儲存庫的[3.3第二階段報告](https://github.com/BillLaiTrade/k12/blob/main/docs/product/units/2-wave-and-sound/2.3-curriculum-materials-review.md)。

## 2026-10-30第一區後續修訂

現行音叉改以fork-experiment.mjs產生的連續SVG曲線、金屬漸層與木座細節呈現，不再載入fork-apparatus.png的照片切片；照片與生成紀錄保留作歷史來源。兩叉股相反彎曲且根部固定，音訊與放慢振動模型維持。下方四週期比較圖在2.4秒內沿時間軸逐步繪製，停止保留進度、重敲重畫、重設清空；不可將橫軸解讀成聲波在空氣中的傳播距離。

## 2026-10-30第二區雙喇叭

`pitch-speaker.png`為image_gen依使用者核可圖生成的透明背景獨立木製喇叭素材，兩欄引用同一檔。原始生成檔exec-f4ee6408-62fa-4ae6-b42a-9b3a497df737.png原樣採用；核可圖與生成說明見docs/reviews/unit-3.3-card02-speakers/。桌面為CSS木紋，側面振膜及波形為SVG，不把整張示意圖嵌入頁面。人物繼續使用共用頭像。

pitch-experiment.mjs只管理視覺與頻率顯示。音訊沿用soundSamples，純音相對振幅0.50，左200Hz、右200～800Hz、每次100Hz。2秒播放對應10毫秒放慢紀錄，時間放慢200倍，振膜位移為同一時間相位的正弦函數；不改變音訊音高。每次只有一組聲音及動畫，結束恢復振膜平衡位置、保留波形，調頻僅重畫右側紀錄。
