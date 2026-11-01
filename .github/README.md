# GitHub Pages 發布

Pages 目前已選 GitHub Actions。`workflows/pages.yml` 在推送main或手動執行時讀取來源，依設定使用唯一發布流程；同一發布群組依序執行，不取消正在進行的發布。

## 已完成舊紀錄造成的發布鎖

服務曾將已完成的609c9cfe及af49b0a0部署繼續當作進行中，阻擋下一版。單純取消、回報完成或標inactive不足以解除；清理已完成且停用的那筆紀錄後，下一版可發布。

正式流程使用`scripts/pages-lock.mjs`：先找出與本次SHA不同、一般部署為success／inactive且Pages為succeed的最近紀錄。相同舊SHA若仍有queued／in_progress等活動紀錄，就保留它。完整紀錄與狀態歷史先上傳為`pages-record-backup-<run>-<attempt>`，保留90天；遠端封存成功後重新核對SHA與完成狀態，再停用並清理這一筆舊部署紀錄、對Pages送出舊部署取消請求，隨後執行正式發布。只處理一筆，保留提交、網站內容及發布產物。

如果一般紀錄已被先前修復清掉，會以同一流程中已成功完成的舊發布工作確認孤立的Pages鎖；一樣須先封存再取消。缺少遠端備份、備份屬於別次發布、紀錄變成進行中或任一API檢查不一致時，流程會停止。11項模擬API檢查涵蓋上述前提與正常清理順序：`node --test tests/pages-lock.test.mjs`。實際發布與公開驗證結果另記於規劃repo，不能以模擬測試當成發布完成。

## 檢視與復原紀錄

在Actions對應發布工作下載備份artifact，可查原部署ID、提交、環境及全部狀態。該次Pages產物仍是獨立的github-pages artifact，原始提交保留在Git歷史。需要重演既有版本時，以該版本建立新的正常發布；清理歷史紀錄不會修改既有提交。

先前一次性取消診斷已撤除；其他工作區的手動紀錄修復工具保留。完整故障與檢查歷程位於`BillLaiTrade/k12`的`docs/reviews/`，本輪結果於部署後補記。
