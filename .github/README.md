# GitHub Pages 發布

目前 Pages 由 `main` 根目錄的分支來源自動發布。每次推送只保留這一條自動發布流程；`workflows/pages.yml` 為手動備用，正常更新不需啟動它。若未先把 Pages 來源改為 Actions，請勿重新加入此工作流程的 `push` 觸發，以免兩個發布流程競爭。

`workflows/pages-state.yml` 只維護最近100筆部署紀錄，不發布網站，也不自行建立環境部署。它在推送時及發布成功後，將一般部署 API 顯示 `success`、且 Pages 部署 API 確認為 `succeed` 的紀錄標為 `inactive`，避免服務持續把已完成部署誤判為進行中。它會保留 queued／in_progress 等其餘狀態，不取消或刪除部署，也不改動已發布內容。手動執行時可選擇 `rebuild` 請求現有分支來源重建；自動執行不另外觸發建置。

2026-11-01 曾發生新部署持續被已成功的舊部署 `44f42d94` 阻擋。一次性修復工作 `41289099188` 使用 `deployments: write` 將兩筆過時部署標為 `inactive`，再以 `pages: write` 請求分支建置；後續 `609c9cfe` 的 Pages 工作 `41289128518` 成功，新動畫模組及頁面已可公開取得。修復工作流程執行完畢即移除，避免保留針對舊提交的維護操作。

檢查發布時，先確認對應提交的工作流程結果，再實際核對公開 HTML、程式與素材。公開站可能暫留 404 或舊檔快取，應檢查有版本參數的 `index.html`、實際頁面引用的資源網址及瀏覽器功能；不要只依 Actions 綠燈宣稱已上線。詳細修復及公開檢查證據位於規劃儲存庫 `BillLaiTrade/k12` 的 `docs/reviews/pages-co2-recovery-20261101/`。
