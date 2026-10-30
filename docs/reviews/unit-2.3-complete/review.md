# 2.3 空氣：六教學＋一小測完整初稿

日期：2026-10-30（臺北時間）。

## 交付範圍

使用者明確要求整份完成後，再逐區帶領修改。本輪完成六教學＋一統整小測及七個路線錨點，第一／二區局部交付不再是停點；維持第4階段初稿，故事線與逐句文案後續隨使用者修改，不記為外部驗收或最終核可。

1. 空氣占有空間：原拖曳、鍵盤、保水與小型重設沿用；增加預設直立乾紙／傾斜濕紙示例。示例SVG預存HTML，操作前及重設後仍可見，預覽可選。
2. 組成分類：保留100份78／21／1圖、其他1%資訊放大、氬氣0.93%及永久／變動氣體卡；分類與乾燥基準直接可讀。
3. 氮氣：充氮食品包裝SVG、一般條件的性質與用途連結；不以包裝外觀鑑定氣體，也不聲稱消除所有變質。
4. 氧氣：雙氧水／二氧化錳、初始混合氣排出、排水收集及取樣四階段；同時段加／未加催化材料說明；一般空氣／氧氣的餘燼木條前後比較，火焰附著在木條；呼吸與供氧用途。
5. 氬氣：組成圖位置、焊接保護SVG與性質用途；焊點使用亮光／火花，氣體保持透明，箭頭只表示導向。
6. 二氧化碳：稀鹽酸／大理石、先排氣、向上排空氣收集及取樣四階段；燃燒木條在普通空氣／二氧化碳中的前後比較，石灰水適量通氣前後比較，滅火器與碳酸飲料用途。不同性質觀察分別取樣。
7. 唯一統整小測：提供完整資料，五題六項作答涵蓋組成分類、兩瓶材料對應、助燃、石灰水及性質用途。未完成指出缺項；錯誤附解釋與觀察連結；改答撤下過期結果；重設只清小測，不影響其他區。

兩個製備重播皆為可選的階段突出，不隱藏圖或結果；可暫停、繼續、回全覽，離區或頁面背景暫停、返回不自動播放，減少動態偏好直接呈現完成階段。圖示不冒充實際反應時間、氣泡數量、劑量或產率。

## 科學來源與邊界

沿用已核可的第二／第三階段來源：NOAA乾燥組成、LibreTexts相對穩定／變動分類、RSC氣體製備／收集及木條觀察；二氧化碳石灰水與用途另有既有出版社補核依據。沒有新增三版課本原文已取得的宣告。二氧化錳不是氧氣來源；不改變理論總產氧量；二氧化碳會溶於水，但不宣稱絕對不能排水收集。未引入耗氧測定、濕度、污染、反應方程式或催化微觀機理。

## 檢查

`AIR_COMPOSITION_ARTIFACT_DIR=/tmp/unit23-composition-final node --test --test-reporter=spec tests/unit-2.3-full.test.cjs tests/unit-2.3-composition.test.cjs tests/unit-2.3.test.cjs tests/unit-2.3-report.test.cjs tests/unit-2.3-model.test.cjs tests/unit-numbering.test.cjs`

**57項通過，0失敗、0跳過（含外層）**，見[完整輸出](browser-tests.log)。涵蓋完整頁、第二區、杯子回歸、新小測純判定、保留模型及全站編號導覽。第一次檢查曾因未等待瀏覽器離區事件而使一個子檢查失敗；改為等待實際暫停狀態後，完整重跑57項全部通過。未以刪除或跳過案例處理。

已檢查320／390／800／1024／1440px無水平溢出、圖與表單在欄內；停用JavaScript仍可讀全部主要圖示與說明；觸控、減少動態、鍵盤及路線錨點通過。每個新增區塊皆保存桌機與手機畫面，已目視檢視製氧、二氧化碳及杯子固定比較；最後將氬氣焊點改為亮光／火花並重新捕捉畫面。語法與`git diff --check`通過。

- [第一區桌機](section-1-1440.webp)／[手機](section-1-390.webp)
- [氮氣桌機](section-3-1440.webp)／[手機](section-3-390.webp)
- [氧氣桌機](section-4-1440.webp)／[手機](section-4-390.webp)
- [氬氣桌機](section-5-1440.webp)／[手機](section-5-390.webp)
- [二氧化碳桌機](section-6-1440.webp)／[手機](section-6-390.webp)
- [小測桌機](section-7-1440.webp)／[手機](section-7-390.webp)

## 公開部署與確認

完整初稿提交`b5ff97caddf0a6df4a4460104d2f740a921032ef`的[Pages41041279265](https://github.com/BillLaiTrade/k12-learning-demos/actions/runs/41041279265)及[Deploy41041278968](https://github.com/BillLaiTrade/k12-learning-demos/actions/runs/41041278968)皆成功。公開HTML、兩組樣式、組成／杯子／製氣／小測腳本及單元入口共8檔HTTP200，SHA-256與本次提交一致，見[版本比對](public-hashes.json)。

公開網址重跑完整頁瀏覽器檢查：**9項通過，0失敗／0跳過（含外層）**，見[公開檢查輸出](public-tests.log)。涵蓋七區與唯一小測、第一區預設比較及重設、兩種製氣重播／暫停／繼續／回全覽、離區停止、作答缺漏／錯誤／修改／正確／局部重設、五種寬度、停用JavaScript、觸控、減少動態及末區錨點。沒有把公開9項當成重新執行全部57項。

[完整學習頁](https://billlaitrade.github.io/k12-learning-demos/units/2/parts/2.3/)；[第一區](https://billlaitrade.github.io/k12-learning-demos/units/2/parts/2.3/#s1)、[氮氣](https://billlaitrade.github.io/k12-learning-demos/units/2/parts/2.3/#s3)、[氧氣](https://billlaitrade.github.io/k12-learning-demos/units/2/parts/2.3/#s4)、[氬氣](https://billlaitrade.github.io/k12-learning-demos/units/2/parts/2.3/#s5)、[二氧化碳](https://billlaitrade.github.io/k12-learning-demos/units/2/parts/2.3/#s6)、[統整小測](https://billlaitrade.github.io/k12-learning-demos/units/2/parts/2.3/#s7)。

完整初稿等待使用者逐區修訂，未新增第五至第七階段核可。
