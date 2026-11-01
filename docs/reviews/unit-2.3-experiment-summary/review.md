# 第三區實驗重點整理與材料提示

2026-11-01，依使用者核可的版面示意，在整組實驗下方加入單一外框的五列整理；問題與說明在桌機左右對齊，720px以下上下排列。使用語意化dl與標題關聯，無JavaScript仍完整可讀。材料圖上方提示改為置中、淡黃底與深色粗體。

五項說明涵蓋雙氧水來源、二氧化錳的催化作用、先排空氣、排水集氣及水下封存；二氧化錳含氧但非本實驗產氧來源、不增加最終產氧量及回收質量的洗淨乾燥條件均明確標示。

使用者追加要求點桌面空白處暫停、再點繼續。既有控制器已支援，未改動畫程式；新增測試以原生滑鼠點選擺放、倒置瓶入水及移開玻璃片三個時點的桌面與背景，驗證停止時鐘、再次點選原進度繼續且不開器材視窗。原器材優先、觸控、選字／拖曳／捲動排除與已完成不自行重播等檢查保留。

## 本輪驗證

- `CHROMIUM_PATH=/usr/bin/chromium AIR_FULL_ARTIFACT_DIR=/tmp/unit23-summary/full OXYGEN_ARTIFACT_DIR=/tmp/unit23-summary/oxygen OXYGEN_TAP_ARTIFACT_DIR=/tmp/unit23-summary/tap node --test --test-reporter=tap --test-concurrency=1 tests/unit-2.3-full.test.cjs tests/unit-2.3-oxygen.test.cjs tests/unit-2.3-canvas-tap.test.cjs`
- 最終31項（含外層），通過31、失敗0、取消0、跳過0，完整輸出為final-tests.tap。
- 初輪封存測試仍等5秒，但現行模型定義7.8秒；修改前HTML與修改後HTML都確認5秒仍播放、8秒完成，故測試改依OXYGEN_OPERATIONS定義等待，沒有縮短動畫或改完成條件。
- 額外本機版面檢查：1440、1024、768、390、320px，各含有／無JavaScript，共10種配置；五列內容全部顯示、整理區在整組實驗下方且等寬對齊、文字欄起點一致、手機上下排列，頁面無水平溢出。
- 1440／390px截圖分別為summary-*與materials-*；已目視桌機整理、置中提示，手機排列經座標斷言確認。

本輪僅本機更新，未推送、部署或驗證公開頁面；沿用使用者先前「不要發布任何內容」指示。其他區塊及實驗控制器、化學模型與素材不變，維持第4階段修訂。
