# 第二區點旁邊恢復全部顯示

日期：2026-10-30（臺北時間）。依使用者提供的選取／未選取兩張畫面，加入點旁邊取消選取。

- 點擊／觸碰色格、圖例與排列切換以外的位置，清除成分選取、圖例按下狀態及突出效果，100格與放大圖恢復全部顯示；保留目前比例／混合排列。
- 色格、圖例（含內部文字）與排列按鈕不會被同一次冒泡點擊取消，既有選取與切換保留。
- 不阻止預設動作或事件傳遞，其他區塊操作正常。沿用顯示全部的狀態更新，不新增套件。

[本機輸出](browser-tests.log)：第二區11項與完整頁9項共20項通過（含外層），0失敗／0跳過。檢查兩種排列、主圖三種色格／右側獨立氬及其餘選取後點空白、點面板外、全部配色及圖例狀態恢復、原排列保留、手機觸控，以及原有互動回歸；語法與`git diff --check`通過。

已目視對照[取消前](before-dismiss.webp)與[點旁邊後](proportion-after-dismiss.webp)，另保存[混合恢復](mixed-after-dismiss.webp)。維持第4階段逐區修訂，非整份教材驗收。

## 公開確認

實作`967bf313af2fa37eaa877a3532dea3c01d4a79e8`已推送。原部署被後續main更新接續，已確認`2492afed`包含本次提交且未改2.3檔案；[Pages41052278667](https://github.com/BillLaiTrade/k12-learning-demos/actions/runs/41052278667)與[Deploy41052279132](https://github.com/BillLaiTrade/k12-learning-demos/actions/runs/41052279132)皆成功。

公開HTML／JS兩檔HTTP200，SHA-256與實作一致，見[比對](public-hashes.json)。公開第二區11項通過（含外層），0失敗／0跳過，包含兩種排列點空白恢復及手機觸控，見[公開輸出](public-tests.log)。

[直接檢視第二區](https://billlaitrade.github.io/k12-learning-demos/units/2/parts/2.3/?v=967bf313#s2)。
