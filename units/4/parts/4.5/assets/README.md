# 4.5 素材與呈現

- `color-story-opening.png`：2026-11-02以image_gen生成，1672×941 PNG，來源`/workspace/generated_images/exec-f57aa8f9-728d-436d-95ba-fc61fd98cf96.png`。參考3.2既有人物畫風，改為小葵與阿公在科學教室觀察三稜鏡／白幕，保留色光燈、色卡、透明色片。用於首頁與OG／Twitter分享縮圖。此為情境插畫，非定量光學圖。
- 角色頭像直接引用`shared-assets/characters/dialogue-character-avatars.png`，未重製或複製。
- `studio.mjs`直接引用4.1的`assets/vendor/three/build/three.module.js`，保留原有授權檔，不新增依賴。
- 木紋、金屬器材、觀察者標記、色卡、光斑與接收面均由本區程式產生；結果共用`color-model.mjs`。
- `lesson.css`外殼與對話以現有4.4為基礎，對齊2.2同一排版規格。

模型限制及測試指令見上層README；主專案保存規劃、課綱對照與檢視紀錄。

第一區修訂新增`prism-optics.mjs`（mm單位光學）、`precision-prism.mjs`（操作）、`prism-studio.mjs`（同尺寸Three.js器材）、`spectral-data.mjs`（CIE／D65表）與`colour-LICENSE.txt`。`prism-scientific-layout.svg`及PNG由模型資料以Matplotlib繪製，未使用生成式圖片決定科學幾何；來源、條件、色域與幾何光學限制見[spectral-sources.md](spectral-sources.md)。原首頁情境插畫仍為情境用途。

第三區依2026-11-03核可的正面示意改用mix-optics.mjs與mix-lab.mjs：正面Canvas2D白幕、程式生成SVG手電筒、原生按鈕與拖曳。人物仍是上述共用正式頭像，概念圖不作網頁背景或角色素材。CIE1931表與授權沿用；資料與模型界線見spectral-sources.md。

第三區手電筒質感於2026-11-03依示意圖回饋再修訂：torch-studio.mjs直接引用4.1既有Three.js，以車削幾何、菱紋刻面、金屬材質與棚燈呈現。torch-red.png、torch-green.png、torch-blue.png為此模型各初始姿態直接輸出的360×260透明圖片，用於載入前／WebGL備援，非從概念圖裁切或另生成的圖片。圖片與立體模型共用相同比例及材質；正式角色素材保持。

2026-11-03新增拖曳限定的SVG輔助光路，使用實際燈頭投影與白幕canvas座標；放開／取消清除。torch-studio提供燈頭出口投影並校準筒身軸線，既有材質／幾何及PNG不改。圖片備援以原模型攝影機產生的軸心與出口UV校準，無新圖像或依賴；ResizeObserver同步版面改變，輔助層不增加高度。

2026-11-03依光束參考圖再修：mix-lab改為三層有寬度的填色體積、柔邊與燈口暈光；無虛線／箭頭／外框，關燈無發光。投影對齊與離手清除保留，未改torch-studio或任何PNG。

2026-11-03第三區器材改為點按切換開關，aria-pressed／開關文字同步；拖曳／取消後略過相容click，不誤關燈。木紋區收斂至約原高一半，名稱旁排，快速比較移到場景下方；原光學、材質、PNG與柔光束計算保持。
