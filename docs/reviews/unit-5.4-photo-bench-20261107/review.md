# 5.4第一、二區：對齊5.3寫實實驗桌

2026-11-07（Asia/Taipei）。使用者要求先參考5.3的加熱畫面與風格，後續選定「先重做第1、2區，再依原本節奏逐區製作」。

## 參考與調整

實際檢視5.3五區及5.4六區的目前畫面，並閱讀5.3的熱量器材素材、共用呈現層、加熱曲線及實驗桌樣式。5.3的特徵是暖色木桌、寫實透明玻璃與金屬、奶油色儀表、程式LCD、就近曲線及下方操作讀值；5.4原簡化3D和平面器材的材質及場景感不一致。

本輪第一區改以參照5.3生成的空燒杯／熱盤底圖，加上由模型控制的樣品水位、寫實冰塊、沸騰氣泡、LCD及供熱指示；曲線仍與器材並排，累計吸熱量及樣品溫度集中至下方奶油色操作列。三段標籤保留但減少厚重填色。

第二區兩側改用同一套寫實水浴、杯內與外浴探針及雙通道LCD；暖水與鹽水都用清澈液體，靠條件、讀值及冰量區分。熱箭頭仍只在暫停／完成且主動顯示時出現，穿杯壁連接兩液體，不連到儀表。人工檢視初稿後將看似穿過水浴的支架立柱移至容器外。

[素材說明](../../../units/5/parts/5.4/assets/README.md)保存生成原檔、空白LCD及空樣品杯的分工；WebP只作格式轉換，畫面依原比例以SVG視窗呈現器材區。圖片是AI情境，並非實驗照片或實測紀錄。

## 科學與功能

第一區原三段能量、停點、時長及終點80g水保留；水位下降時探針仍浸水且不觸底。第二區保留50g冰＋50g水、250g有限外浴、暖水40→32°C與預冷鹽水−10→−2°C的能量模型。冰塊三維縮放連動剩餘冰量，沒有底圖固定冰塊／樣品水位與動畫衝突。

器材比例、液面及冰形為辨識用示意，不作精密體積量測；相同照片不代表水與鹽水相同體積。兩支探針各自浸在樣品／外浴中，兩液體隔杯壁。外浴無持續加熱或製冷，不額外增加熱源。

寫實層無獨立時鐘，由原控制器提供狀態；暫停、離區及重做的語意保留。任一材質圖片失敗時保留同狀態SVG與原操作，無JS保留初始SVG與禁用控制。前兩區不再初始化WebGL。

[範圍核對](preservation.json)確認第三至第六區、單元小測、開場、分享資訊、原模型與第二區補充保留；本輪不是全頁重製或最終驗收。

## 檢查

[本機30項](local.txt)通過：14模型項、15瀏覽器子流程及外層；包括融冰保溫、探針全程浸水、LCD與外浴／冰量同步、三段停點、暫停續行重做、離區、WebGL不可用與素材失敗替代、無JS、鍵盤及其餘區塊代表流程。[35組版面](layout-local.json)無整頁水平溢出，[錯誤紀錄](errors-local.json)為空。人工檢視[5.3參照](reference-5.3.png)、[融冰](melting-local.png)、[沸騰](boiling-local.png)、[雙水浴解釋](comparison-local.png)、[第一區390px](first-narrow-local.png)與[第二區390px](second-narrow-local.png)。維持第4階段；未作Firefox／Safari或實體裝置驗收。

## 發布

功能提交e2127c26，經5dcf6cb98cb66ca51c403a3b2c1a20776a60eb56整合其他單元更新後發布，5.4內容無額外差異。原生Pages[42353508993](https://github.com/BillLaiTrade/k12-learning-demos/actions/runs/42353508993)的build、deploy與report-build-status皆成功，見[release.json](release.json)。

[公開16項](public.txt)通過，[19檔資源](public-hashes.json)與本機一致，[35組公開版面](layout-public.json)無整頁水平溢出，[錯誤紀錄](errors-public.json)為空。人工核對[融冰](melting-public.png)、[沸騰](boiling-public.png)、[第二區解釋](comparison-public.png)、[第一區窄版](first-narrow-public.png)與[第二區窄版](second-narrow-public.png)，確認寫實器材、同源讀值及熱傳位置。瀏覽器採程序限定環境代理CA公鑰匹配；未更改持久信任庫，檔案核對使用系統TLS驗證。

下一步先檢視[第一區](https://billlaitrade.github.io/k12-learning-demos/units/5/parts/5.4/#card-01)與[第二區](https://billlaitrade.github.io/k12-learning-demos/units/5/parts/5.4/#card-02)，再依回饋精修或接續第三區。
