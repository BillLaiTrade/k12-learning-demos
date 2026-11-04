# 4.4 第四區十二項重整檢查

2026-11-04。以器材可辨、光路清楚、大小可直接比較及四步操作為主要驗收。

```sh
node tests/unit-4.4-imaging-optics.test.mjs
node tests/unit-4.4-magnifier-optics.test.mjs
IMAGING_CAPTURE_DIR=/tmp/mag-layout-shared node tests/unit-4.4-imaging-studio.test.cjs
MAGNIFIER_CAPTURE_DIR=/tmp/mag-layout-eye node tests/unit-4.4-magnifier-studio.test.cjs
LENS_CAPTURE_DIR=/tmp/mag-layout-integration node tests/unit-4.4.test.cjs
```

公開驗證可設定 `IMAGING_URL`、`MAGNIFIER_URL`、`LENS_URL` 為4.4目錄網址（結尾斜線）。

- 保留第三區與共同薄透鏡模型。代表光線換取樣時，逐線核對真實折射關係與虛像反向交點，不以改變像距／倍率整理版面。
- 七寬度驗證操作、版面與溢出；四尺寸×四觀察條件實測卡面投影寬高，要求卡面寬高比大於0.15、卡面高度大於38px；比較區與3D viewport不能重疊，兩張對照同幅並排。
- F三條同色出射線平行；眼位不動；F外仍有實像，窄畫面可標示視野外真實距離。
- 觀察表緊接圖卡尺，沒有大型三分類框；必要補充與進一步探索預設收起。
- 點選觀察列不縮小器材或關光；手動移動不自動追相機。滾輪與原生雙指可五倍近看，眼睛／原物參照不受主相機影響。
- 虛像、屏幕前後遮擋、實像屏幕投影與第三區一致、WebGL備援及整課導覽／小測回歸。

[桌面主畫面](desktop.png)、[手機主畫面](mobile.png)、[F外光路](outside.png)。

本機70項全數通過：屏幕模型10、第四區模型11、兩區瀏覽器11、第四區瀏覽器15、整課23（瀏覽器含主項）。[屏幕模型](screen-model-tests.txt)、[第四區模型](eye-model-tests.txt)、[兩區回歸](shared-tests.txt)、[第四區操作](eye-tests.txt)、[整課](integration-tests.txt)。

公開複驗後補上F標記與器材名稱的矩形碰撞檢查。F文字向上避讓，保留原本焦距的水平位置，並限制在工具列下方；四尺寸×四條件的標記互不重疊，第四區15項重新通過。
