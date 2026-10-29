# 2.3 空氣：初稿互動與素材

- `air-model.mjs`：校正後氣體體積、水位／壓差／管位、共用實驗狀態、乾濕空氣比例、倒扣杯及獨立小測判定。內部水面高於槽面時，不把壓力差當成零；對齊後才保存 79.0 mL。
- `air.js`：以 SVG 繪製器材及氣體示意，處理共用播放時鐘、暫停／回看、記錄、對照、重設與各區操作。第02–04區共用同一資料來源，小測150→120 mL為獨立示例。
- `air.css`：沿用展示站綠色、紙色、對話頭像及垂直學習路線。人物使用根目錄 `shared-assets/characters/dialogue-character-avatars.png`，未新增副本。
- 器材圖由程式繪製，沒有生成或下載新的圖片；圖中氣體透明，圖表顏色只用於分類。幾何與數據是教學模型，不是真實實驗紀錄或實物製造圖。
- 依據：`BillLaiTrade/k12` 的 `docs/product/units/4-matter-separation-and-aqueous-solutions/4.3-teaching-and-interaction-spec.md`。來源為 NOAA JetStream 空氣組成、RSC／Nuffield 鋼絲絨耗氧及 RSC 氧氣木條觀察教案，正式頁尾提供連結。
- 檢查指令：`node --test tests/unit-2.3-model.test.cjs tests/unit-2.3.test.cjs`；瀏覽器可由 `CHROMIUM_PATH` 指定。執行結果另記錄於本次 review，不以此指令本身宣稱已通過。
