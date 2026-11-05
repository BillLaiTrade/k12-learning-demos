# 5.2 第四區寫實場景實作

2026-11-05。使用者核可寫實水／空氣示意圖後，要求依圖製作。本輪維持第4階段，待使用者檢視實作；未記為整頁最終核可。

## 核可圖與實作

- `approved-mockup.png`保留原始核可圖；實際採單一可切換面板，而非兩個同時運行的實驗。
- `section-ready.webp`／`section-observed.webp`為本機實際截圖；`layout-1366-water.webp`／`layout-1366-air.webp`顯示兩種場景。
- 兩張寫實背景無箭頭；SVG箭頭真實移動，遮罩限制在水內／暖氣機外。畫面不以蒸氣或水沸騰冒充流體的流動。
- 下方保留開始／停續、重來、狀態、單一觀察列與收合說明。既有標頭與對話未更動。
- 素材及示意限制見[素材紀錄](../../../units/5/parts/5.2/assets/README.md)與[決策](../../decisions/unit-5.2-convection-photo.md)。

## 本機驗證

- `local-first.txt`如實保留首輪結果：傳導套件未指定已安裝Chromium，啟動失敗；對流一處斷言仍引用舊版12個圓點的索引。改用既有`CHROMIUM_PATH=/usr/bin/chromium`及六組箭頭索引，未為此修改產品邏輯。
- `local-final.txt`：`CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-5.2-convection.test.cjs tests/unit-5.2-conduction.test.cjs`，22項（含兩個外層）全部通過。
- 對流涵蓋手動開始、兩側上升／顏色一致、實際SVG位移、暫停位置與像素固定、停續、重來、切換媒介、鍵盤、背景中斷、圖片失敗重試與晚到回應、一般／減少動態的真實時間觸控；相鄰傳導及輻射／保溫／小測回歸通過。
- `local-layout.json`：1440×900、1366×768、1280×720、820×900、760×900、390×844、320×568，兩媒介共14組；無水平溢位，按鈕至少44px，未開始時間固定，播放確有位移，暫停固定且文字有實際繪製範圍。手機截圖包含原有置頂路線，其位於捲動內容上方。
- `preservation.json`：對`730654ee`移除本區操作面板後HTML逐字一致（僅本區CSS／JS快取版本更新）；其他五區、小測及本區開場／結尾對話保留。

## 發布

待推送與原生Pages成功後，公開驗證另存規劃repo的本輪發布紀錄；不可將待發布當成已上線。
