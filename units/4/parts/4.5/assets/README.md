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

2026-11-03依新回饋取消視窗高度壓縮，白幕按固有比例填滿寬度；名稱改為器材下方的單行字與色點，移除可見開關狀態節點。mix-lab只移除該文字更新，操作、光束與模型保持；無障礙狀態仍保留。

2026-11-03新增開啟時的輪廓金邊：mix-lab建立獨立零尺寸SVG濾鏡，透明度門檻排除接觸陰影，膨脹／柔化後與原圖合成；CSS只對data-on=true的torch-drawing套用。原立體渲染、PNG、版面與操作保持，金色僅為狀態提示，不改光束或白幕。

2026-11-03第四區新增`surface-appearance.mjs`：以現有Three.js產生霧面紙紋／凹凸、固定白色聚光照明、柔邊白光照射範圍及漸淡的分散反射線。概念圖僅供設計參考，不用作場景背景；器材仍可旋轉，光路開關只隱藏教學覆蓋層。原色光模型與共用人物保持，不新增圖片或套件。平面備援由rendering.mjs產生相同的紙面明暗、受光區與分散線。

2026-11-03合併第四／五區：新增`surface-model.mjs`，沿用原RGB反射模型，統一二十種燈色／色卡組合的入射、反射、吸收、預覽與定性說明。`surface-appearance.mjs`改用所選燈色的入射光與聚光燈，依出射色畫漫反射；環境光降低以凸顯受光區。主圖保持真正可旋轉的Three.js器材，概念圖不作背景。頁面重新編成六區，正式角色與原光學模型保持。

2026-11-03第五、六區新增path-lessons.css，沿用既有Three.js器材、白幕預覽與正式角色，重新安排對照／預覽／控制及動態發現。rendering.mjs的第六區平面備援改用程式繪製眼睛及正確同側反射／另一側透射，遮擋提示同步於兩種預覽。studio.mjs調整這兩區的預設取景，並計算第六區光線與遮光板入射面的交點。無新增圖像、套件或外部服務。

2026-11-03第五區依核可圖改為三組獨立直向按鈕。新增filter-paper-model.mjs計算透射後的紙張反射；filter-paper-appearance.mjs以紙紋、霧面無自發光材質與透射色光聚光燈呈現實驗紙張；filter-paper-rendering.mjs共用模型畫固定曝光預覽及暗色備援。既有Three.js、器材幾何與正式角色保持，不把示意圖作網頁背景，無新圖像或套件。低環境光只改第五區，紙面照明與光路開關分離。

2026-11-03第五區依最新回饋改用三組原生下拉選單；lesson.mjs接收change並保留另外兩組狀態，path-lessons.css收斂高度。filter-paper模型、照明及渲染檔案未改，不新增素材或依賴。前輪直向按鈕為歷史。

2026-11-03第一、二區依核可分工新增prism-lessons.css及prism-refraction-explanation.svg／prism-dispersion-explanation.svg。SVG由scripts/build-prism-explanations.mjs讀取既有光學模型產生，玻璃漸層與細陰影為呈現，幾何／光路維持同一比例；局部近看兩軸同倍率、不改角差。角色沿用正式共用頭像，核可概念圖僅作設計證據，未嵌入頁面。precision-prism新增固定白光參照canvas，沿用原drawProjection與曝光；原光學及3D模組未改。

2026-11-04第一、二區依四項回饋修正。prism-display.mjs使用共同係數壓縮亮度，降低藍光因通道獨立裁切而偏紫；所有色光與主圖／預覽／備援共用，不改物理模型。兩張SVG各新增-mobile.svg構圖，picture依螢幕切換，仍由build-prism-explanations讀同一幾何生成；深綠墊、玻璃邊緣及投影均由SVG提供，沒有新點陣資產。A框與近看有明確對應及等軸倍率；對位虛線由HTML疊在兩列相同坐標，光學畫布像素保持可驗證。

2026-11-04續修：第一區SVG補兩處各自原方向延長線與真實角度弧箭頭；第二區SVG改為可辨識的三色分離放大原理圖，圖內明列非實際角度，取消A近看。僅原理圖放大分離，立體實驗台及幕面仍用實際計算。四張圖由build-prism-explanations.mjs生成，不改執行模型與顯色；以本項及最新決策為準，前輪A近看描述保留歷史。

2026-11-04續修精簡：第二區兩張SVG將偏折說明併入紅／藍光標籤，移除圖內大註記，統一由HTML圖說聲明代表色與非實際角度。prism-lessons.css改三格等高流程，手機直排。第一區圖解與全部執行模型保持；以unit-4.5-dispersion-concise決策為準。

2026-11-04整合：移除第六區頁面與導覽，第四／五區的surface-model及filter-paper-model觀察句接到反射光入眼；計算函式不變。lesson.mjs更新文案模組與小測版本，path-lessons.css保留舊#s6零高度原生錨點於第五區。3D、接收預覽與材質不改，無新圖片或依賴。舊eye分支保留相容，頁面不再建立eye實驗。

2026-11-04雙色光小測：duo-quiz-model.mjs共用72題的色光選擇／判定與上方混光；duo-quiz.mjs控制相互獨立的查證／作答與平面備援，duo-quiz-studio.mjs建立兩燈／色片／金框紙張的3D場景，duo-quiz.css只作用於小測。上方沿用現有torch三張PNG與SOURCE_LINEAR，下方紙面獨立受光，不新增素材／套件。五區及舊模型保持。核可概念圖只供構圖參考，未整張貼入網頁。

2026-11-04依回饋，duo-probe.mjs改為第三區相同的直接拖曳／點按開關／快速排列。沿用MIX_SETUP、torch-studio真實幾何與PNG投影校準，白幕及淺木紋比例對齊；兩支燈仍可獨立換色。torch-studio僅擴充可選目標幕、動態色環，不更動原預設、幾何與材質。小測柔光束／金邊使用獨立SVG ID，無新圖像或依賴。

2026-11-04小測場景條件續修：duo-quiz及HTML以三張條件卡明列A／B光源、色片、金框紙張；duo-quiz-studio只新增實際攝影機投影回呼，提供HTML標籤定位與連線，不更改幾何、照明或色光計算。duo-quiz.css只調整挑戰說明、條件與標示；白光參照及開燈結果明確區分。無新圖片或依賴。

2026-11-04六題版：duo-quiz-model新增初始六題及平衡換組選取，原光學／判定函式保持；duo-quiz保存六份前端作答狀態，切題共用同一3D場景與表單。duo-quiz.css整合挑戰樣式為滿寬連貫動線，沒有額外六套渲染器；五區、上方自由試光及既有器材／素材保持，無新增依賴。

2026-11-04第二小測新增pixel-tv-model.mjs（五級RGB、可達目標與逐格判定）、pixel-tv.mjs（獨立任務／試調帶回與畫布狀態）、pixel-tv.css（CSS電視框及對照介面）。目標小狐狸／4×4圖案由模型色塊直接繪製；三張生成示意圖只供設計參考，未貼成操作背景。新活動不依賴WebGL、不新增點陣圖或套件；原學習區及六題小測素材與模型保持。

2026-11-04像素電視操作續修：15個原生亮度按鈕預先包含於HTML，pixel-tv-loader.js獨立啟動調色模組，不再依賴課程入口。五級按鈕與即時色塊由CSS／DOM呈現，子像素近看收合；沒有新圖片或套件。

2026-11-04依核可示意加入像素概念導入。pixel-tv-picture.svg、pixel-tv-rgb.svg、pixel-tv-compose.svg由scripts/build-pixel-tv-concepts.mjs讀取pixel-tv-model的實際8×8目標及顯色函數產生，含真實3×3局部、RGB子像素和逐格組圖。參考圖exec-ae7277bf-ab83-47ea-adfd-928b3b399fe9.png僅作布局討論，未貼為網頁背景；圖解可在無JS時閱讀，沒有外部素材或依賴。

2026-11-04像素圖解因果續修：沿用三個SVG檔名與建置腳本，改為單一像素直接放大、紅藍固定只調綠的前後對照、0／32／64格組圖進程。金框尺寸等於單一格；同一設定的兩種觀看方式以等號區別於時間變化。圖像顏色共用既有模型，未新增圖檔或外部素材。

2026-11-04補強送光與觀看距離：pixel-tv-picture.svg加入紅／綠送光符號及藍關閉標示；pixel-tv-rgb.svg加入固定螢幕與近遠眼睛／距離線；pixel-tv-compose.svg標出相鄰A／B，與HTML各自RGB狀態例子對應。沿用原三檔及建置腳本，色彩來自原模型，非實測距離或面板結構；沒有新增外部素材。

2026-11-04像素電視導入精簡：pixel-tv-overview.svg由scripts/build-pixel-tv-concepts.mjs讀取實際PICTURE_TARGET生成，64格色值及A／B索引9／10均與操作模型相同。導入改用單一總覽及HTML兩格RGB對照；原三張概念SVG保留歷史，不再使用。圖解為自行繪製，外部研究來源僅作文字觀念參考；無新增依賴。

2026-11-04像素電視改三段：pixel-tv-model只允許關閉／弱／強（內部0／1／4），目標資料與pixel-tv-overview.svg同步；控制器新增一次一個方向的提示與本次瀏覽內的可重用色盤。DOM色票由已成功設定產生，未使用生成示意圖作實際介面或色值來源，無新圖片或依賴。loader／controller／model／CSS同步更新版本。

2026-11-04兩任務初始目標分開：像素電視模型新增共用紫色PALETTE.P，4×4只改問號格目標；所有UI由同資料顯示。loader／controller／model快取版本同步，沒有新增圖片、依賴或版面修改。

2026-11-04像素電視調色整合：目標／準備色、RGB預覽、調色按鈕與填入操作集中同一tv-tuner。保留原節點與控制器，CSS只調面板內邊框／間距及手機換行，無新素材、依賴或模型修改。

2026-11-04像素電視觀察室：image_gen另製海灣圖exec-34155ff2-2d14-46e6-9038-c79ff3793e4b.png（1254×1254），原檔保存在pixel-tv-harbour-source.png。build-pixel-tv-picture.cjs平均取樣96×96並簡化為3842色，產生pixel-tv-harbour.png、pixel-tv-harbour-no-red.png及pixel-tv-picture.mjs。新pixel-tv-observer-model.mjs、Canvas2D與3×3子像素檢視共用此資料，關閉通道精確設0，其餘不變；結果圖非生成或CSS濾鏡。舊pixel-tv-model及概念SVG保留歷史。無新套件／WebGL依賴。
