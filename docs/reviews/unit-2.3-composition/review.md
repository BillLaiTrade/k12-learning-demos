# 2.3 第二區：空氣組成與分類初稿

日期：2026-10-30（臺北時間）。

- 使用者已核可六教學＋一小測方案、材料與集氣細化，進入第四階段；本輪依順序先交付第二區。公開入口現為已完成的第一／二區，其餘區塊及第一區固定比較續做，不作整份教材完成宣告。
- 第一區HTML器材及杯子模組沿用；舊鋼絲絨測量、乾濕比例、舊整合小測及對應導覽移出，避免新版仍教已排除內容。舊程式保留追溯但不載入。單元入口文案同步改為組成／分類。
- 第二區以小葵與阿公短對話承接空氣存在，100份圖、78／21／1、氬氣約0.93%及其他成分資訊、永久／變動氣體卡及乾燥基準說明直接可讀。二氧化碳包含在其他1%中；水蒸氣不加到乾燥圖之外。相對穩定不等於不反應。
- 點選、鍵盤或觸控僅突出對應份額；比例及必要說明不隱藏。資訊放大不改變比例，圖格不是分子、氣體沒有圖例顏色；停用JavaScript仍可讀到全部資料。
- 故事線先保留粗略方向，正式文案及整段節奏待內容具體後與使用者調整。

## 本機檢查

`node --test --test-reporter=spec tests/unit-2.3-composition.test.cjs tests/unit-2.3.test.cjs tests/unit-numbering.test.cjs`：31項通過，0失敗、0跳過（含外層）；[完整輸出](browser-tests.log)。涵蓋5組第二區檢查、杯子回歸及全站編號／連結。`node --test tests/unit-2.3-model.test.cjs`：1項檔案檢查通過，為歷史模型回歸，不宣稱是新版測驗驗證。

已目視檢視[1440px](composition-1440.webp)與[390px](composition-390.webp)，另保存[1024px](composition-1024.webp)。320／390／800／1024／1440px無水平溢出；分類卡在窄欄按永久→變動順序上下排列。腳本語法及`git diff --check`通過。

## 公開確認

實作提交`445f0679be2b43152b10aa65a886588647851679`的[Pages41038796444](https://github.com/BillLaiTrade/k12-learning-demos/actions/runs/41038796444)及[Deploy demo page41038796369](https://github.com/BillLaiTrade/k12-learning-demos/actions/runs/41038796369)皆成功。公開HTML、第二區CSS／JS及單元入口四檔HTTP200，SHA-256與實作提交一致，見[版本比對](public-hashes.json)。

以公開網址重跑第二區瀏覽器檢查：6項通過（含外層），0失敗／0跳過，涵蓋資料直接可見、比例與分類、滑鼠／鍵盤／觸控突出、停用JavaScript、減少動態及320–1440px版面，見[公開檢查輸出](public-tests.log)。公開檢查不冒充重新執行全部杯子回歸。

直接檢視[第二區](https://billlaitrade.github.io/k12-learning-demos/units/2/parts/2.3/#s2)。後續依核可順序製作氮氣區。

本輪是第二區可檢視初稿，不代表第五階段完整教材檢查、外部驗收或最終核可。
