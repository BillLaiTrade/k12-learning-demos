# GitHub Pages 發布

`workflows/pages.yml` 支援推送 `main` 與手動執行。第一個工作先讀取 Pages 發布來源；只有來源為 **GitHub Actions**（API `build_type=workflow`）才發布，分支來源時明確略過，避免兩條發布流程競爭。不取消正在進行的發布。教材與公開網址不受此設定檢查影響。

## 需要儲存庫管理員完成的設定

1. 開啟 <https://github.com/BillLaiTrade/k12-learning-demos/settings/pages>。
2. 在 **Build and deployment → Source** 選擇 **GitHub Actions**。
3. 開啟 **Actions → Deploy demo page → Run workflow**，分支選 `main`；之後推送會自動發布。

目前連線及 Actions 的 `GITHUB_TOKEN` 更新 Pages 來源皆回 HTTP403 `Resource not accessible by integration`，無法代做上述管理設定；不需新增密鑰或刪除網站。

## 2026-11-01 故障與驗證

Pages 分支來源與自訂 Actions 曾同時發布。新部署被服務回報為已成功的舊提交阻擋，取消舊部署又回應已完成。一次性修復 `41289099188` 將過時紀錄停用後重建，`609c9cfe` 的 Pages 工作 `41289128518` 成功，接續動畫已公開：實際20檔一致，公開瀏覽器41項檢查全過。

後續推送及重建仍被已成功的609c9cfe阻擋。將已確認完成的紀錄標為inactive並不能穩定解除Pages服務端鎖；試驗維護工作已移除，沒有將它當成永久修復。後續應由管理員統一為Actions來源，再執行此正式流程並檢查服務端鎖是否消失；如仍拒絕，需攜帶失敗與成功的部署ID向GitHub支援查核。

詳細紀錄在規劃儲存庫 `BillLaiTrade/k12` 的 `docs/reviews/pages-co2-recovery-20261101/`。交付時須同時確認部署工作成功、公開檔案內容一致及瀏覽器操作，不能只依工作流程綠燈。
