# 4.4 第四區預設全貌與跨F保留

2026-11-04依使用者確認：先呈現完整上、下端光路，後續可手動分點追蹤；預設視角更接近平視，保留辨認圖卡的斜側角度。

- 初始程式狀態、按鈕aria及圖例均為「一起看」。觀察預設不再指定上端，移動圖卡至F也不再改變所選物點。
- 分別以一起看、下端、上端從0.88F移到F前、F、F外，再反向移回，並切換全部四列，確認光路偏好保留。
- 直接渲染WebGL像素，比較一起看與只看上端：0.88F、F、1.01F及1.5F均能量到額外藍光，避免只驗按鈕或資料值。
- F時紅線與藍線各自平行；不同物點的出射方向不同，不把所有顏色視為同一束光。
- 相機降低俯視、以主要器材為取景中心，並調整窄螢幕邊界；四尺寸×四條件仍維持卡面可辨、標記無重疊、比較區不遮光。
- 手動旋轉、五倍近看、觸控、屏幕比較及WebGL備援回歸。比較屏幕2F按鈕的數值一併校正為2F。

```sh
node tests/unit-4.4-magnifier-optics.test.mjs
MAGNIFIER_CAPTURE_DIR=/tmp/mag-overview-final node tests/unit-4.4-magnifier-studio.test.cjs
IMAGING_CAPTURE_DIR=/tmp/mag-overview-shared node tests/unit-4.4-imaging-studio.test.cjs
```

公開驗證可設定 `MAGNIFIER_URL`／`IMAGING_URL` 為4.4目錄網址（含結尾斜線）。[桌面預設](desktop.png)、[手機預設](mobile.png)。

本輪模型11項、第四區瀏覽器17項、兩區回歸11項，共39項通過（瀏覽器含主項）。[模型](model-tests.txt)、[第四區操作與藍光像素](studio-tests.txt)、[兩區回歸](shared-tests.txt)。
