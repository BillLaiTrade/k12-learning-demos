# 單元3.3採用C02首頁插圖

日期：2026-10-30（臺北時間）。

使用者指定`exec-80d5dd63-14a0-4b82-a6f8-901a37d9f742.png`並表示「採用這個」，即第三輪C02「聲音體驗市集」。已將該原始PNG原樣保存為`units/3/parts/3.3/assets/sound-fair-opening.png`，替換原波形SVG首頁圖，更新替代文字及圖說。CSS沿用1.1式圖框，以寬度100%、高度自動完整顯示，保留1672×941比例，沒有裁切、重繪或後製。

原圖、C02候選與正式素材的SHA256均為`acfb11d11123dadbb8849d36f9c6b572d2070348acb021df2573da5cc07b9fdf`。候選比較頁與生成紀錄已標示C02為已採用，其餘候選保留。素材來源及各道具與七區的連接，見[第三輪紀錄](../unit-3.3-hero-candidates-round3/README.md)及[核心內容紀錄](../../decisions/unit-3.3-initial-production.md)。

## 檢查

- `CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-3.3.test.cjs`：11項通過、0失敗、0略過（含外層），見[輸出](tests.log)。涵蓋七區模型、聲音與互動、跨區停止、綜合小測及1.1格式／八種寬度排版。
- 另以瀏覽器確認1024、1280、1440、1920及390px首頁圖片載入、比例與可見邊界、無頁面水平溢出，舊首頁SVG已移除，無主控台與資源錯誤，見[版面檢查](layout-checks.log)。
- 比較修改前後`<main>`起至頁尾，教學內容與小測HTML相同；模型、播放及互動模組未改。
- 實際檢視[桌機](desktop.png)、[筆電](laptop.png)及[手機](mobile.png)畫面。

本次為已核可首頁插圖的採用，不表示整個單元已完成最終教材驗收。其他歷史單元測試未重跑。
