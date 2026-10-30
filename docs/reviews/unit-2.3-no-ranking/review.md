# 第二區移除多寡排行句

日期：2026-10-30（臺北時間）。依使用者指示移除「氮最多，其次是氧，再來是氬；其餘氣體只占少量」，同時收起空白高度。初始、未選成分切換排列與點空白恢復時均不帶回該句；圖表、圖例比例與個別選取的既有回饋保留。本次未實作先前討論的放大圖條件展開方案。

更新既有檢查，確認初始狀態無排行文字／保留高度、取消選取不帶回排行句。[第二區11項通過](browser-tests.log)（含外層），0失敗／0跳過；涵蓋兩種排列、成分與合併格選取、空白取消、鍵盤／觸控、五種寬度、無JavaScript。語法及`git diff --check`通過，未重跑完整頁套件。

已目視檢視[手機](mobile.webp)，另存[桌機](desktop.webp)。維持第4階段逐區修訂，非整份教材驗收。

## 公開確認

實作`1e1d6670543e00127863779d4694b808d132baa5`已推送；[Pages41056676128](https://github.com/BillLaiTrade/k12-learning-demos/actions/runs/41056676128)與[Deploy41056677283](https://github.com/BillLaiTrade/k12-learning-demos/actions/runs/41056677283)成功。公開HTML／CSS／JS三檔HTTP200、SHA-256與實作一致，見[比對](public-hashes.json)。公開1440／390／320px確認無排行句及空白高度，兩種排列與選取／取消正常，見[公開核對](public-check.log)。

[檢視第二區](https://billlaitrade.github.io/k12-learning-demos/units/2/parts/2.3/?v=1e1d6670#s2)。
