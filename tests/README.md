# 5.1 瀏覽器操作檢查

需要 Node.js、Python 3、Playwright 及 Chromium。雲端環境已提供這些工具，不需修改套件清單。

在 `k12-learning-demos` 根目錄執行：

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-5.1.test.cjs
```

若使用 Playwright 安裝的 Chromium，可省略 `CHROMIUM_PATH`；自備瀏覽器則指定其執行檔路徑。

檢查會啟動一個隨機本機 port 的 Python 靜態伺服器，結束時關閉伺服器與瀏覽器。涵蓋測量示範、取消等待動畫、刻度及邊界對齊、未完成／錯誤／正確紀錄、估讀容許差距、完整重設、鍵盤操作、減少動畫、不同視窗尺寸、素材載入及單元導覽。

這些操作檢查不代表課綱、指定版本教材或完整單元已通過外部驗收。

## 2.2 鋼尺操作檢查

同樣使用現有 Python 3、Playwright 及 Chromium，於 repo 根目錄執行：

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-2.2.test.cjs
```

涵蓋實際尺面點擊、連續重新撥動、自由段變形與固定段不動、立即停止、自然衰減、鍵盤與備用按鈕、窄螢幕觸控、背景不觸發，以及素材載入錯誤。測試自行啟動及關閉本機伺服器與瀏覽器。
