# 第六區移除重複說明

2026-10-30，依使用者截圖移除紅藍光圖例、隨光源切換的操作提示、反射角互換的展開說明及其下方光路補充文字。同步刪除已移除節點的 JavaScript 更新與專用 CSS，更新模組及樣式版本以避免舊快取。保留雙光源開關、器材標記、角度讀值、兩張路徑卡與重點段落；移除圖例後保留實驗台與路徑卡之間14px間距。

桌機1440px與手機390px實際開啟紅光並截圖檢視，無頁面JavaScript錯誤。測試同步改為核對移除的內容不存在、角度讀值與光源按鈕仍正常，不保留隱藏說明作為測試入口。

驗證：`CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-1.2-reversible.test.cjs tests/unit-1.2-curved-mirrors.test.cjs` 共18項通過，包含反射幾何、第二區操作、第五區近遠成像及法線、第六區開關／調角／觸控與替代圖。JavaScript語法及差異空白檢查通過；未執行全站測試。截圖見 `desktop.png`、`mobile.png`。
