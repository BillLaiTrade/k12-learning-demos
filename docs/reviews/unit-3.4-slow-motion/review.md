# 3.4第二區慢動作標示檢視

2026-10-31（臺北時間）。核可圖與實作畫面已逐張檢視，確認加框／放大倍率、完整傳播時間名稱、桌機同列與手機另行配置符合提案。正式場景沿用原照片與聲波層，不以生成示意圖替換既有器材。

- 第二區模型4項及瀏覽器13項共17項全數通過，0失敗／略過；完整日誌見local-tests.log。涵蓋單組／同步、真實最末音訊、計時、暫停續播、切換取消、拖牆、鍵盤／真實觸控、背景停止及既有版面。
- 手動版面檢查1440／1280／1120／1050／1024／900／768／640／390／360／320px共11種視窗，狀態列每項及其文字均在框內、無橫向溢出或裁字，倍率字體至少14px；720px以下內容寬時倍率獨立下一行，寬欄同列。量測見layout.json。
- desktop.png、mobile.png為同次暫停時刻（模型0.2058秒，顯示0.21秒），近牆已收到0.20秒、遠牆尚在到壁階段；narrow-320.png為初始窄手機畫面。圖示與標籤不提供新操作，仍由喇叭／原按鈕播放。
- 科學參數及JS、聲音未改；本輪未重跑第一區與其餘區專項，不將局部檢查當作整份教材驗收。

驗證指令：

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.4-distance-model.test.mjs tests/unit-3.4-distance.test.cjs
```

暫存完整版面檢查腳本與畫面：`/tmp/k12-34-slow-motion-review.cjs`、`/tmp/k12-34-slow-motion-review/`。以`SLOW_MOTION_URL`指定公開頁，`SLOW_MOTION_CAPTURE_DIR`指定證據目錄可重現。
