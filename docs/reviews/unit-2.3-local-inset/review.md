# 第二區小成分局部放大框

日期：2026-10-30（臺北時間）。使用者引用先前提案並指示按方案修改，核可將常駐底部的放大圖改為依選取就近展開。

- 初始放大框及連線收起、不占版面。主圖、四項氣體及氬約0.93%／其餘少量標示一直可讀。
- 點斜紋格、氬氣或其餘氣體，才在主圖下緣展開小型放大框；點氮／氧／空白或Escape收起。
- 桌機圖例維持主圖右側；手機與窄內容欄由主圖、已展開放大框、2×2圖例依序排列。短連線直接接合併格與放大框，隨排列及視窗更新。
- 游標移入／焦點只突出成分，不自動開框；框內閱讀／點選不關閉，切換比例／混合保留選取與展開狀態。觸發按鈕提供aria-controls及aria-expanded。
- 既有排行句、主圖下方三行說明及顯示全部按鈕維持移除。停用JavaScript時放大框收起，主圖、四項比例及分類仍完整可讀；沒有新增套件或測驗。

## 檢查

[本機輸出](browser-tests.log)：第二區12項、完整頁9項，共21項通過（含外層），0失敗／0跳過。涵蓋展開／收起、hover與focus不開框、框內點選、Escape、切換保留狀態、連線、主圖／圖例同步、鍵盤／觸控、五種寬度、無JavaScript與其他區既有互動；語法及`git diff --check`通過。

已目視檢視[桌機收起](closed-desktop.webp)、[桌機展開](open-desktop.webp)與[手機展開](open-mobile.webp)，另存[手機收起](closed-mobile.webp)及[混合合併格](mixed-minor.webp)。確認小框與主圖距離小於25px，手機在圖例之前，沒有橫向溢出。

維持第4階段逐區修訂，非整份教材驗收。

## 公開確認

實作`399f72bc337a0bf27fc602d8eefd9fea8339ab1d`已推送。其部署與接續65694b14被後續main更新取代；已確認最新`0a4c2350`包含本次修改、未改2.3檔案。[Pages41058341540](https://github.com/BillLaiTrade/k12-learning-demos/actions/runs/41058341540)與[Deploy41058342226](https://github.com/BillLaiTrade/k12-learning-demos/actions/runs/41058342226)皆成功。

公開HTML／CSS／JS三檔HTTP200，SHA-256與實作一致，見[版本比對](public-hashes.json)。公開第二區12項通過（含外層），0失敗／0跳過，包含開框／收起、框內閱讀、Escape、切換保留狀態、兩種排列與手機主圖下方位置，見[公開輸出](public-tests.log)；已目視檢視[公開手機展開](public-mobile.webp)。

[直接檢視第二區](https://billlaitrade.github.io/k12-learning-demos/units/2/parts/2.3/?v=399f72bc#s2)。
