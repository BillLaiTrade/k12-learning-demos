# 4.5 像素電視：承接先備知識的一窗導入

日期：2026-11-04

使用者指出原三段圖文內容太多、混雜，要求先查閱成像機制介紹，避免重複前面學習區，並縮減成一個視窗可看清楚。

## 資料與教學範圍

- [Samsung Display：Pixel](https://global.samsungdisplay.com/27669)：像素是顯示影像的基本單位，許多像素如馬賽克組成影像，RGB子像素的光量決定顏色。
- [Stanford CS101：Image-1](https://web.stanford.edu/class/cs101/image-1-introduction.html)：完整圖片可放大為像素格，每格都有RGB數值。
- [IOP：LED screens](https://www.iop.org/explore-physics/physics-around-you/technology-our-lives/led-screens)與[Penn State：Color Displays](https://www.mrsec.psu.edu/education-outreach/public/museum-kits/pocket-tech/color-displays)供交叉理解，不把其全部細節搬入課程。

第三區已教色光混合與RGB疊色，第四／五區已有光進入眼睛的觀察。這裡的增量是「每格可分別控制」，並非再次教混色、視覺或黑色。不同顯示技術的發光／調光構造不在本次實作目標，保留理想RGB模型界線。

## 呈現

一張圖：真實目標的8×8完整畫面，標出相鄰像素A／B，右側並列其RGB強弱及各自顏色。前置一句接回第三區，結尾一句「每格分別設定RGB，許多格排在一起，就是一幅畫面」。圖中的RGB示例不是互動元件，也不揭露目標的數值配方。

移除常態遠近眼睛圖、送光原理、藍光關閉解釋、橙變黃比較與長段重複說明。8×8／0～4級簡化提示與收合參考資料保留。操作區的即時RGB回饋不改。

使用原模型生成新SVG；不使用外部圖片，不新增套件。桌機並列、手機上下排列，自然高度，不使用裁切或固定高度。主要句子至少14px；七視窗測量導入上下界，含320×568與844×390；已扣除原頁面sticky導覽的scroll-padding，避免重複留白。

## 驗證與保持

模型6項，瀏覽器30項（含外層），核對64格、A／B位置與色值、預設收合來源、七視窗一窗完整、無橫向溢出、三任務實作、鍵盤／手機、備援／無JS、初始化重入及兩小測狀態獨立。執行結果與公開證據存主專案本次review。只修改第二小測導入、對應CSS／建圖／測試及文件；五個學習區、第一小測、RGB模型與控制器保持。
