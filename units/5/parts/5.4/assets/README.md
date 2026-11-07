# 5.4 器材與視覺呈現

## 2026-11-07：第1、2區對齊5.3

使用者要求先實際參考5.3的加熱畫面，並選定「先重做第1、2區，再依原本節奏逐區製作」。參照5.3的`heat-bench-refined.webp`、`heat-bench-view.mjs`、`heat-stage-lab.css`及目前第一、二區：暖色木桌、寫實玻璃與金屬、霧面儀表、動態LCD、就近曲線與下方奶油色操作列。

### 素材來源

- `heating-bench-photo.webp`：image_gen參照5.3原器材圖生成空燒杯底圖；原檔`/workspace/generated_images/exec-56268b45-9b62-47c5-94ff-c114bdb25ace.png`。
- `phase-bath-photo.webp`：同一參照生成水浴、空樣品杯、杯內／外浴雙探針與雙通道空白LCD；初稿立柱看似穿過水浴，經image_gen修到容器外。最終原檔`/workspace/generated_images/exec-55813bf5-5fba-4fcf-91b4-f6905d89ba65.png`。
- `ice-cube-photo.webp`：image_gen生成透明背景冰塊，原檔`/workspace/generated_images/exec-07fb4c71-cb2c-4827-8f60-a561b0397f1c.png`。

三圖僅轉WebP（品質90），未裁切或重繪檔案。兩張器材圖保留1672×941；畫面透過SVG的1048×941視窗取左側器材區，保留照片原比例。冰塊保留透明通道。

### 動態與科學分工

`photo-apparatus.mjs`只有呈現層，不持有第二套時鐘。第一區水位、冰塊縮放、沸騰氣泡、LCD及供熱指示沿用`thermal.js`與核心模型；最新線段與三段停點保留。第二區兩側沿用有限量外浴的熱容量、外浴溫變與冰量；先觀察、暫停後才主動顯示熱箭頭。

熱箭頭由加熱盤穿杯底指入樣品，或穿樣品杯側壁連接兩液體，不指向儀表。原圖無預畫數字、冰塊及樣品液面，動態內容不會與底圖中的固定冰塊或水位衝突。水浴外液面為情境圖，不供精密體積量測；純水與鹽水不以染色區別。

先載入器材與冰塊素材，成功才顯示寫實層；任一圖片失敗保留同狀態SVG與原操作。無JS保留初始SVG、概念及禁用控制。前兩區不再初始化Three.js；舊3D模組保留於版本庫，但未作為目前頁面的入口。第三至第六區及小測保持，留待逐區製作。

[本輪完整檢查與發布紀錄](../../../../../docs/reviews/unit-5.4-photo-bench-20261107/review.md)。
