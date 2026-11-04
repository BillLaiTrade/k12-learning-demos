# 4.3 三層介質光速排序檢查

2026-11-04（臺北時間）。見[決策](../../decisions/unit-4.3-layer-speed-quiz.md)。

- [模型5項](model-tests.txt)通過：六種速度排列、n sinθ、連續幾何、角度／速度一致、真實相對速度推進、輪換及移卡判定。
- [瀏覽器10項](ui-local.txt)通過：中間光前緣、作答與回饋、滑鼠／鍵盤／原生手機操作、重播／離屏續播／換題取消、九尺寸、減少動態、底圖備援與無JS。
- [格式與整課6項](lesson-local.txt)通過。
- [九尺寸量測](local/layouts.json)確認無溢出／文字裁切、主要標籤至少13.4px、按鈕至少44px、等比縮放不改物理角度。
- [觀察後畫面](local/observed.png)／[核對畫面](local/correct.png)／[390px](local/390-quiz.png)／[320px](local/320-quiz.png)。
- [首輪發現](ui-initial-findings.txt)：測試端SVGPoint序列化方式已修正；產品修正拖曳後過廣的click抑制，及原生觸控相容click可能丟失首個接續點選，另完成標頭與支架對位。最終完整專項已重跑通過。
- [15項保留核對](preservation.json)確認六區HTML、原CSS／控制器／模型／照片相同；原共用腳本僅移除舊單選判定。未重跑其他六區全部模型、動畫時長或真實學生學習成效。

發布後另於規劃庫記錄原生Pages與公開確認。維持第四階段，沒有新增外部驗收或最終核可。
