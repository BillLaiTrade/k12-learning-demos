# 第二區移除主圖下方三行說明

日期：2026-10-30（臺北時間）。依使用者截圖移除主圖下方點選提示、色塊不是分子、顏色與排列示意三行文字及其空間，不新增替代提示。同步清理失效`aria-describedby`及未使用的圖說樣式；圖例與操作保留。

[排版檢查](layout-check.log)：Chromium在1440／390／320px確認三行及失效參照已移除、無橫向溢出、色格選取及點空白恢復正常；已目視檢視[手機](caption-390.webp)，另存[桌機](caption-1440.webp)。`git diff --check`通過。本次為文字／排版精簡，未新增測試檔或重跑完整功能套件，不新增整份教材驗收。

## 公開確認

實作`113c9422562acd0818688d74963d7f437847a4b4`已推送；[Pages41054426105](https://github.com/BillLaiTrade/k12-learning-demos/actions/runs/41054426105)與[Deploy41054426980](https://github.com/BillLaiTrade/k12-learning-demos/actions/runs/41054426980)成功。公開HTML／CSS兩檔HTTP200且SHA-256與實作一致，見[版本比對](public-hashes.json)。公開1440／390／320px皆確認說明已移除、無失效參照或溢出、基本選取／取消正常，見[公開核對](public-check.log)。

[檢視第二區](https://billlaitrade.github.io/k12-learning-demos/units/2/parts/2.3/?v=113c9422#s2)。
