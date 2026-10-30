# 移除第二區「顯示全部」按鈕

日期：2026-10-30（臺北時間）。依使用者指示刪除與點空白功能重複的「顯示全部」按鈕，同步清理專用樣式。保留點旁邊空白取消選取、恢復全部配色與保留排列；四項氣體圖例及主圖點選維持。

更新既有檢查改用點空白恢復，未新增測試檔。[第二區11項通過](browser-tests.log)（含外層），0失敗／0跳過，涵蓋按鈕移除、四項圖例、兩種排列、主圖／圖例點選、空白取消、手機觸控、鍵盤、五種寬度與無JavaScript。`git diff --check`通過；未重跑完整頁套件。

已目視檢視[手機](mobile.webp)，另存[桌機](desktop.webp)。維持第4階段逐區修訂，非整份教材驗收。

## 公開確認

實作`4d666561f152aa5170cc384c4e5b5de51be30073`已推送；[Pages41055518840](https://github.com/BillLaiTrade/k12-learning-demos/actions/runs/41055518840)與[Deploy41055520562](https://github.com/BillLaiTrade/k12-learning-demos/actions/runs/41055520562)成功。公開HTML／CSS兩檔HTTP200、SHA-256與實作一致，見[比對](public-hashes.json)。

公開1440／390／320px確認按鈕移除、四項氣體圖例、無溢出，以及兩種排列的選取／點空白恢復正常，見[公開核對](public-check.log)。

[檢視第二區](https://billlaitrade.github.io/k12-learning-demos/units/2/parts/2.3/?v=4d666561#s2)。
