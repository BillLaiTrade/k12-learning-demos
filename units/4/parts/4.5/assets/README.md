# 4.5 素材與呈現

- `color-story-opening.png`：2026-11-02以image_gen生成，1672×941 PNG，來源`/workspace/generated_images/exec-f57aa8f9-728d-436d-95ba-fc61fd98cf96.png`。參考3.2既有人物畫風，改為小葵與阿公在科學教室觀察三稜鏡／白幕，保留色光燈、色卡、透明色片。用於首頁與OG／Twitter分享縮圖。此為情境插畫，非定量光學圖。
- 角色頭像直接引用`shared-assets/characters/dialogue-character-avatars.png`，未重製或複製。
- `studio.mjs`直接引用4.1的`assets/vendor/three/build/three.module.js`，保留原有授權檔，不新增依賴。
- 木紋、金屬器材、觀察者標記、色卡、光斑與接收面均由本區程式產生；結果共用`color-model.mjs`。
- `lesson.css`外殼與對話以現有4.4為基礎，對齊2.2同一排版規格。

模型限制及測試指令見上層README；主專案保存規劃、課綱對照與檢視紀錄。

第一區修訂新增`prism-optics.mjs`（mm單位光學）、`precision-prism.mjs`（操作）、`prism-studio.mjs`（同尺寸Three.js器材）、`spectral-data.mjs`（CIE／D65表）與`colour-LICENSE.txt`。`prism-scientific-layout.svg`及PNG由模型資料以Matplotlib繪製，未使用生成式圖片決定科學幾何；來源、條件、色域與幾何光學限制見[spectral-sources.md](spectral-sources.md)。原首頁情境插畫仍為情境用途。
