# 4.3 三態材質檢查

2026-11-04（臺北時間）。見[決策](../../decisions/unit-4.3-layer-material-states.md)。

- [模型6項](model-tests.txt)通過：六種速度順序、Snell不變量、連續幾何／速度推進、移卡／判定與物態、n、光路連動。
- [最終瀏覽器18項](local-tests.txt)通過：小測12、格式5及整課1（含外層），包含三種真實取樣、換題連動、光路角度、原生手機／鍵盤／拖曳、備援及無JS。
- 首次完整檢查[有一項測試前置狀態未還原](initial-fixture-failure.txt)：新測試換到第二題後，同網址goto未重置文件，後續測試卻假設首題。已改真正reload還原，產品未為此改判定；最終完整18項重跑通過。
- [九尺寸](local/layouts.json)無溢出、文字裁切或角度拉伸；[前版](before.png)／[三態實際畫面](local/observed.png)／[390px](local/390-quiz.png)／[320px](local/320-quiz.png)。
- [20項保留核對](preservation.json)確認六區HTML、既有圖片／CSS／控制器及排序、重播、換題流程相同。新參數與素材映射已另驗；未擴大重跑其他六區全部專項。

發布後於規劃庫補記Pages及公開檢查。維持第四階段，非最終核可。
