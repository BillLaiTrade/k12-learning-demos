# 3.3 示意素材與聲音模型

- 人物：沿用儲存庫共用 `shared-assets/characters/dialogue-character-avatars.png`，未新增或改造角色圖片。
- 開場、琴弦、空氣柱與訊號圖為本次繪製的SVG，無外部圖片授權依賴。
- 示意音為本次以Web Audio產生的短音，不是錄音；學生頁已標明弦音／管音示意。沒有替換3.2已核可的真實音效。
- `model.mjs`的固定泛音係數用於呈現不同波形；不宣稱精確重建特定樂器。音訊為1.6秒，20ms淡入、120ms淡出，依RMS作近似大小聲匹配；不是聲級校準，也不保證不同設備與頻率下主觀響度相等。
- 畫面弦振動以基本頻率的1/60呈現；管內空氣位移以1/100放慢，使用兩端開口管基本模式的往返位移，聲音保持原音高。
- 弦的相對模型：60cm、相對張力1時220Hz，頻率隨有效長度反比、相對張力平方根變化。管的模型：同類兩端開口管、空氣聲速343m/s，基本頻率依 `343/(2L)` 計算；忽略端點修正，學生不需運算這些公式。
- 相對振幅、圖形振幅、系統音量及真實耳邊聲級必須分開理解；第七區dBA資料不是網頁聲音輸出讀值。第六、七區不播放極端頻率或高聲級情境。

來源：

- [教育部自然科學課綱](https://edu.law.moe.gov.tw/LawContent.aspx?id=GL001823)，Ka-Ⅳ-5與附錄。
- [OpenStax 17.6 Hearing](https://openstax.org/books/college-physics-2e/pages/17-6-hearing)：人耳可聽範圍約20～20000Hz，狗高頻上限約30000Hz、蝙蝠可達100000Hz；物種與個體會有差異。頁面只作上限例子，不製造未查證的下限。
- [OpenStax 17.3 Sound Intensity and Sound Level](https://openstax.org/books/college-physics-2e/pages/17-3-sound-intensity-and-sound-level)：聲級、參考基準與分貝非線性關係。
- [NIDCD Noise-Induced Hearing Loss](https://www.nidcd.nih.gov/health/noise-induced-hearing-loss)：生活情境的平均聲級參考，一般交談60～70dBA、電影院74～104dBA、音樂會94～110dBA。本頁僅引用資料，沒有新增噪音／聽力保護課程。
- 更完整教材核對及資料限制見規劃儲存庫的[3.3第二階段報告](https://github.com/BillLaiTrade/k12/blob/main/docs/product/units/2-wave-and-sound/2.3-curriculum-materials-review.md)。
