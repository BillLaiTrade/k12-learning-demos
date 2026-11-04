# 4.4 第四區固定眼位驗證

2026-11-04。主線為固定透鏡、固定眼睛，圖卡由近向外跨越F；不再以移眼觀看實像作主題。

```sh
node tests/unit-4.4-imaging-optics.test.mjs
node tests/unit-4.4-magnifier-optics.test.mjs
IMAGING_CAPTURE_DIR=/tmp/mag-fixed-shared node tests/unit-4.4-imaging-studio.test.cjs
MAGNIFIER_CAPTURE_DIR=/tmp/mag-fixed-eye node tests/unit-4.4-magnifier-studio.test.cjs
LENS_CAPTURE_DIR=/tmp/mag-fixed-integration node tests/unit-4.4.test.cjs
```

公開頁可設定 `IMAGING_URL`、`MAGNIFIER_URL`、`LENS_URL` 為4.4目錄網址（含結尾斜線）。眼睛移動的舊假設已改成固定眼位的模型與互動檢查。

- 模型核對固定眼位不能被參數或移動操作改變；四個預設只改圖卡；F內視角倍率與同眼位原物參照；出射束由發散轉平行及會聚；F外仍有實像。
- 瀏覽器逐列核對眼睛座標、相機、光路偏好與上端追蹤不變。用實際畫布像素核對正立、看起來的大小與相對放大程度；F時仍可完整看到紅箭頭與藍點。
- F外取1.5F物距，會聚位置3F；此固定眼位不顯示清晰正立圖案。擴測跨F至3.5F，不裁掉可操作範圍。
- 主相機旋轉、五倍近看及手機觸控往外推圖卡均不移動眼睛。WebGL備援保留同一探究。
- 進一步探索才開啟透明虛像，眼睛留在另一側，右側像素不變；屏幕在眼前遮擋、移至眼後或取下恢復原條件像素。
- 1440／820／390／320寬度將標籤矩形與實際投影線段做交叉檢查，代表光路、入眼光、反向延長線均不能被標籤蓋住；兩區七寬度另核對固定右欄、位置尺及水平溢出。
- 整課檢查保留九區、小測、導覽、鍵盤與原生觸控，進一步探索展開後才操作屏幕。

[接近F](near-f.png)、[恰好F](at-f.png)、[F外會聚](outside-f.png)、[手機](mobile.png)。

本機65項全數通過：屏幕模型10、固定眼睛模型9、兩區瀏覽器11、固定眼睛瀏覽器12、整課23（瀏覽器含主項）。[眼睛操作](eye-tests.txt)、[兩區回歸](shared-tests.txt)、[整課](integration-tests.txt)、[屏幕模型](screen-model-tests.txt)、[眼睛模型](eye-model-tests.txt)。
