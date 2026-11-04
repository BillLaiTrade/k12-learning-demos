# 4.4 第四區觀看條件驗證

2026-11-04，限定第四區的成像／屏幕／眼位判準，不加入第七區眼內機制。

```sh
node tests/unit-4.4-imaging-optics.test.mjs
node tests/unit-4.4-magnifier-optics.test.mjs
IMAGING_CAPTURE_DIR=/tmp/mag-conditions-shared node tests/unit-4.4-imaging-studio.test.cjs
MAGNIFIER_CAPTURE_DIR=/tmp/mag-conditions-eye node tests/unit-4.4-magnifier-studio.test.cjs
LENS_CAPTURE_DIR=/tmp/mag-conditions-integration node tests/unit-4.4.test.cjs
```

公開驗證可設定 `IMAGING_URL`、`MAGNIFIER_URL`、`LENS_URL` 為4.4目錄網址（含結尾斜線）。

- 模型確認眼位靠近鏡片且固定、入眼光束通過有限瞳孔、各條件座標有限；相對放大程度與同眼位原物比較，不要求眼睛畫面隨圖卡外推一直變大。
- 瀏覽器核對只保留圖卡側F的浮動焦點，沒有眼睛位置尺；同物距操作、四列切換、相機旋轉與五倍近看均不移動眼睛。
- 常駐三項說明隨F內／F／F外更新，區分虛像能看但不能投屏幕，以及形成實像卻非任意眼位可看清。明說代表線空隙不等於沒有光，不能以眼位是否為交點判斷可見性。
- 確認整個第四區沒有角膜、水晶體、視網膜等機制內容或剖面圖；只連結第七區，不改動第七區本體。
- 第四區圖卡1.5F、屏幕3F可接清楚倒立實像，固定眼位仍看不清；兩區同條件的屏幕像素雜湊一致。移離3F失焦；F內仍不冒充清晰投影。
- 手機觸控、七種寬度、固定右欄、標籤避讓及整課導覽、小測、鍵盤皆回歸檢查。

[桌面三項判準](desktop.png)、[手機三項判準](mobile.png)。

本機68項全部通過：屏幕模型10、第四區模型10、兩區瀏覽器11、第四區瀏覽器14、整課23（瀏覽器含主項）。[屏幕模型](screen-model-tests.txt)、[第四區模型](eye-model-tests.txt)、[兩區回歸](shared-tests.txt)、[第四區操作](eye-tests.txt)、[整課](integration-tests.txt)。
