# 4.4 第三、四區統一驗證

2026-11-04，依使用者要求合併處理兩區格式、器材、可移動眼睛與F點光路。

## 檢查方式

```sh
node tests/unit-4.4-imaging-optics.test.mjs
node tests/unit-4.4-magnifier-optics.test.mjs
IMAGING_CAPTURE_DIR=/tmp/convex-alignment node tests/unit-4.4-imaging-studio.test.cjs
MAGNIFIER_CAPTURE_DIR=/tmp/convex-eye node tests/unit-4.4-magnifier-studio.test.cjs
LENS_CAPTURE_DIR=/tmp/convex-integration node tests/unit-4.4.test.cjs
```

公開頁可分別設定 `IMAGING_URL`、`MAGNIFIER_URL`、`LENS_URL` 為4.4目錄網址（含結尾斜線）；本輪兩個專項測試執行完整案例，舊的 `IMAGING_ONLY_*` 部分模式已由統一專項取代。

- 模型核對兩區全部共用常數、各成像條件基本光路完全一致、F同色束平行、可移動眼睛及視角倍率、實像位置不隨眼睛移動、近點簡化與屏幕遮擋順序。
- 瀏覽器比較兩區物卡幾何、初始相機、光線世界座標、F出射線越過眼睛、實像倒立／虛像正立的畫布像素。小圖案採兩個像素的邊界取整容差核對預期大小比例；模型公式另以浮點精度核對。
- 眼睛尺實際點選F、2F、3F、5F；觀看位置在會聚前／上／太近／之後，各有對應結果；移眼與旋轉、五倍近看互不混淆。
- 插入屏幕、移過眼睛與取下屏幕後比較原條件像素；原生手機觸控拖眼睛與取消手勢；WebGL備援仍可操作眼睛尺。
- 七寬度1440／1366／1024／820／760／390／320核對兩區舞台、固定右欄、雙尺高度、按鈕與水平溢出；整課另驗九區、小測、深連結、鍵盤及觸控。

## 畫面

- [共同格式：屏幕](screen.png)、[共同格式：眼睛](eye.png)
- [F點的屏幕觀察](focal-screen.png)、[F點的眼睛觀察](focal-eye.png)
- [眼睛越過實像位置](real-eye.png)、[眼睛移遠後](real-eye-far.png)
- [手機固定右欄](mobile-eye.png)

瀏覽器使用 Chromium／SwiftShader；眼睛為軸上觀察與理想薄透鏡，不是逐步調節或視網膜模擬。測試與公開部署結果見下方交付紀錄。

本機65項全部通過：屏幕模型10、眼睛模型9、兩區統一瀏覽器11、眼睛瀏覽器12、整課23（瀏覽器含主項）。[兩區統一](alignment-tests.txt)、[眼睛操作](eye-tests.txt)、[整課](integration-tests.txt)、[屏幕模型](screen-model-tests.txt)、[眼睛模型](eye-model-tests.txt)。
