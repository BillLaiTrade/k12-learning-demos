## 4.3 名牌固定對齊（2026-11-05）

`unit-4.3-label-alignment.test.cjs`驗四桌面尺寸的待機、錯誤、正確、重播中／後與換題；名稱座標保持同欄且沒有與最快／最慢標記重疊。`LABEL_ALIGNMENT_CAPTURE_DIR`輸出截圖與alignment.json；沿用公開網址與代理參數。

## 4.3 依4.1統一格式（2026-11-05）

`unit-4.3-format41.test.cjs`在四種桌電／筆電尺寸直接比對4.1／4.3的同類元件計算樣式，另驗舊錨點與閱讀進度、主次按鈕和鍵盤焦點；`FORMAT41_CAPTURE_DIR`輸出代表截圖及layout.json。沿用`LESSON_BASE_URL`與`LESSON_USE_PROXY`供公開檢查。共用格式、11項互動及實際水位由既有測試回歸，沒有改科學模型。

## 4.3 全面再檢查的11項決策（2026-11-05）

`unit-4.3-eleven-model.test.mjs`補三項：真實硬幣邊緣的可見薄片、6,666組控制值的連續可見狀態與同物光線、80／160／400／800px各解析度仍使用實際可見取樣。原深度模型中「加滿即全幣可見」的斷言改驗真實外緣仍被槽緣遮住，狀態應為部分，固定中心／鏡頭與Snell斷言保持。

`unit-4.3-eleven.test.cjs`補七項（含外層）：完全離屏後的真實滑鼠發射與鍵盤、三種小車的視窗／分頁續播及主動收合後不自動播、短句與科學前提、卡片無變動保留判定／重播暫藏恢復／實際變動清除、四種桌電／筆電尺寸、第六區預覽／精細／無worker的一致部分可見。`ELEVEN_CAPTURE_DIR`保存畫面與visibility.json。兩份既有小車測試調整自動續播新預期，原雙輪運動與速度比斷言保持。

```sh
node --test tests/unit-4.3-eleven-model.test.mjs
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules node --test tests/unit-4.3-eleven.test.cjs
```

沿用`LESSON_BASE_URL`／`LESSON_USE_PROXY`。正式範圍為桌電／筆電，原窄版檢查只作既有回歸，未新增手機排版要求。

## 4.3 每次載入隨機首題（2026-11-05）

模型新增48組首題（24種排列×兩種入射角），逐輪核對24種排序各一次及跨輪不連續重題。小測專項新增真實重新載入六次，以受控亂數避免機率性斷言，每次由實際SVG光路判讀並驗證錯誤／正確作答。整課、最後檢查及觸控流程改依當題角度，不預設首題答案；完整角度、材質、拖曳、重播、換題與備援檢查保持。

```sh
node --test --test-isolation=none tests/unit-4.3-layer-speed-model.test.mjs tests/unit-4.3-final-review-model.test.mjs
node --test --test-isolation=none --test-concurrency=1 tests/unit-4.3-layer-speed-quiz.test.cjs tests/unit-4.3-final-review.test.cjs tests/unit-4.3-format.test.cjs tests/unit-4.3.test.cjs
```

沿用LESSON_BASE_URL／LESSON_USE_PROXY與LAYER_CAPTURE_DIR；reload-cases.json記錄六次實際光路／角度／材質及正確排序。執行環境須允許本機HTTP與Chromium。

## 4.2 全頁與第三區／潛望鏡檢查（2026-11-05）

現行4.2是光學反射頁。`unit-1.2-mirror`、`unit-1.2-periscope`、`unit-1.2-curved-mirrors`及`unit-1.2-reversible`保留歷史檔名，實際網址已指向`/units/4/parts/4.2/`；舊`unit-4.2.test.cjs`等混合物分離測試屬現行2.2，不是本課。

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-1.2-mirror.test.cjs tests/unit-1.2-periscope.test.cjs tests/unit-1.2-curved-mirrors.test.cjs tests/unit-1.2-reversible.test.cjs tests/unit-4.2-completion.test.cjs
```

五套均支援`LESSON_BASE_URL`（站台根網址，例如`https://billlaitrade.github.io/k12-learning-demos/`）及`LESSON_USE_PROXY=1`（使用既有HTTPS_PROXY）；未指定根網址時自行啟動本機伺服器。`MIRROR_CAPTURE_DIR`、`PERISCOPE_CAPTURE_DIR`及`COMPLETION_CAPTURE_DIR`可分開保存公開／本機證據。潛望鏡既有截圖仍使用`/tmp/periscope-review/`，取消計時JSON使用指定的PERISCOPE_CAPTURE_DIR。

第三區保留光路、投影、圖像像素與淨空斷言，更新為現行文案、既有路線、直接拖熊及4.1網址，不恢復已刪除的控制。潛望鏡取消檢查在pointerdown／keydown前後同一事件記錄狀態、時間與殘留光線，避免長拖曳後才讀取瞬間cooldown；另保留真實滑鼠／鍵盤與同步早期取消、期限恢復檢查。

全頁專項補驗無JS分享HTML／圖片、三種桌機筆電尺寸、七段路線／標頭、第一區實際點燈／旋轉、第四區拖曳／邊界／取消、WebGL不可用時的各區隔離，以及潛望鏡素材延遲／失敗／重新載入。與四套既有專項合讀，不以單一全頁專項宣稱所有光學或全部小測已通過；結果以對應檢查紀錄為準。


## 4.3 逐項核可後統一改善（2026-11-05）

本輪正式桌電／筆電檢查使用`unit-4.3-final-review.test.cjs`：離屏自動續播與手動／比較停格、第三四區預覽、第五區獨立漸進光束／角度角色、四卡全放後實際拖回再放入、只用左右鍵、單組角度回饋；1440×900、1366×768、1280×720、1024×768七區界線。第六區用真實時間記錄加放水與同步影格，驗眼睛不中斷、手動水位接管、返回續播、停止恢復細節與無worker備援。`FINAL_REVIEW_CAPTURE_DIR`保存畫面與water-frames.json；`LESSON_BASE_URL`、`LESSON_USE_PROXY`沿用。

新增純模型3項檢查雙向等光學時間／不同速度、全24題單逆序提示／材質身份、方向快取前後像素一致；與原六套31項搭配共34項。既有整課深度操作補等候非同步配對影格，返回光束檢查等漸進光束抵達；沒有降低科學斷言。手機既有格式冒煙可回歸，非新增手機排版驗收。

```sh
node --test tests/unit-4.3-final-review-model.test.mjs
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules node --test tests/unit-4.3-final-review.test.cjs
```

## 4.3 四層介質排序（2026-11-04）

模型6項改驗24種排列、四個位置、四筆不同且相差至少2度的角度與連續光路。小測14項遍歷24排列×四寬度共96組／384筆角度，保留九尺寸、點燈、排序、鍵盤、原生手機與備援；兩種固體速度排序分別驗證，不要求同物態有不同材質圖。手機排序兩列、順序編號1～4。搭配格式5與整課1共26項。指令／LAYER_CAPTURE_DIR及公開參數沿用。

## 4.3 小測角度讀值（2026-11-04）

`unit-4.3-layer-speed-quiz.test.cjs`現14項（含外層），新增六排列×四寬度，直接由實際SVG光線計算角度並與一位小數讀值比對；確認完成後顯示、換題收起、數字在層內且避開光線。另保留原九尺寸、點燈、觸控與排序流程。模型未變，本輪跑受影響小測專項；`LAYER_CAPTURE_DIR`保存angle-readings.json。

## 4.3 小測照射燈發射（2026-11-04）

`unit-4.3-layer-speed-quiz.test.cjs`現13項（含外層），新增點燈／Enter／空白發射、發射時停用、重播保留排序、四種寬度對位及換題後待命；原生手機與圖像失敗備援也由照射燈啟動。原光路、排序及九尺寸條件保持。模型未變，本輪只跑受影響的小測專項。

## 4.3 三態材質與光路連動（2026-11-04）

模型現6項，新增六種排列皆將氣／液／固圖樣與同一n綁定，並確認氣體代表n接近1。瀏覽器專項現12項（含外層），新增三種不同取樣、換題物態移位及依圖判讀速度順序一致；材質失敗也攔截重用的第一區底圖。配格式5及整課1共24項。沿用`unit-4.3-layer-speed-model.test.mjs`、`unit-4.3-layer-speed-quiz.test.cjs`、`LAYER_CAPTURE_DIR`與公開參數。

## 4.3 三層小測材質精修（2026-11-04）

沿用`unit-4.3-layer-speed-quiz.test.cjs`，專項現為11項（含外層），配格式5及整課1項共17項。新增專用寬／直立底圖與透明光源已載入、出光口與首段光線對位檢查，九尺寸確認底圖切換與等比物理角度；材質失敗改攔截`layer-quiz-*.png`，仍測試備援操作。`LAYER_CAPTURE_DIR`、公開參數沿用。純模型未改，本輪不重跑；下方原模型5項仍可獨立執行，整套合計22項。

## 4.3 三層介質光速排序（2026-11-04）

```sh
node --test tests/unit-4.3-layer-speed-model.test.mjs
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules node --test --test-concurrency=1 tests/unit-4.3-layer-speed-quiz.test.cjs tests/unit-4.3-format.test.cjs tests/unit-4.3.test.cjs
```

模型5項確認六種順序、司乃耳不變量、連續光路、角度與速度排序、依路程及光速推進、無重複排序輪換、移卡與判定。瀏覽器10項（含外層）驗證真實中間光前緣、觀察後作答、不完整／錯誤／修正、拖曳交換／外放取消、完整鍵盤、離屏續播／換題取消、九尺寸均勻縮放、原生手機拖曳後立即點選、減少動態仍逐段發射、材質備援與無JS。沿用格式及整課6項，替換原三題單選檢查。支援LESSON_BASE_URL、LESSON_USE_PROXY及LAYER_CAPTURE_DIR。未變更的六區模型及動畫時長組合不在本輪擴大重跑。

## 4.5 兩處偏轉與主圖分色（2026-11-04）

```sh
node tests/unit-4.5-prism-explanations.test.mjs
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.5-prism-diagrams.test.cjs
```

生成測試4項驗證真實法線、原方向延長與弧箭頭端點；第二區改驗明示放大分離的定性光路、順序與表面交點，取代舊A近看條件。瀏覽器專項8項子測試（含外層9項）：原生收合／鍵盤不重設原操作、1366／820／650／390／320寬度、四張SVG文字不裁切、無JS。僅載入第一、二區實際3D，其他區的WebGL模組在測試中攔截，不當成全課回歸。支援COLOR_URL／COLOR_CAPTURE_DIR／CHROMIUM_PATH。另沿用光學7及顯色3項檢查；下方舊規格保留歷史。

## 4.5 圖解清晰度、對位與藍光顯色（2026-11-04）

```sh
node tests/unit-4.5-prism-optics.test.mjs
node tests/unit-4.5-prism-display.test.mjs
node tests/unit-4.5-prism-explanations.test.mjs
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.5.test.cjs
```

光學7項回歸固定幾何與能量；顯色3項確認共用壓縮保留正通道比例、亮度單調與三色顯示／坐標；圖解4項涵蓋桌機手機四張SVG、法線、兩次折射、A區對應與等軸近看。整課35項（含外層）增加雙列DOM對位線同坐標、白光時隱藏、實際藍色像素不偏紫，保留主圖／預覽一致、操作、七寬度、觸控／備援與無JS。支援COLOR_URL／COLOR_CAPTURE_DIR／CHROMIUM_PATH，GPU檢查依序執行。

## 4.5 第一、二區色散教學分工（2026-11-03）

```sh
node tests/unit-4.5-prism-explanations.test.mjs
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.5.test.cjs
```

圖解4項核對靜態產物與正式模型、均勻比例、折點／法線、紅藍偏折順序與局部近看不改角差。整課保留真實3D／白幕像素、第一區滑軌與鍵盤、第二區固定器材與各色落點、七寬度器材避讓、手機觸控／取消、WebGL備援及無JS；新增教學分工、原生details與圖像載入、同一幕面白光參照固定不變。支援COLOR_URL／COLOR_CAPTURE_DIR／CHROMIUM_PATH。模型未改，不重跑未受影響的純模型套件；新增圖解檢查以node直接執行，確認列出4項子測試。

## 4.5 第五區精簡下拉選單（2026-11-03）

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.5-path-lessons.test.cjs
```

沿用第五六區專項（含外層6項），以三組原生select驗證80組合、保留另外兩組狀態、三段色條／預覽／3D同步；八種視窗選單並排、控制區≤110px、無溢出、44px高度，原生鍵盤選取保持焦點，手機情境與拖曳取消、第六區備援保持。支援COLOR_URL與COLOR_CAPTURE_DIR。整課unit-4.5.test.cjs同步第五區選擇器；本輪僅執行專項，未重跑整課及未改動的純模型。下方直向按鈕描述為前輪歷史。

## 4.5 第五區三組獨立選項（2026-11-03）

```sh
node tests/unit-4.5-filter-paper-model.test.mjs
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-4.5-path-lessons.test.cjs tests/unit-4.5.test.cjs
```

純模型4項檢查80種條件、色片／紙張各自吸收及逐色守恆、沒有入射就沒有輸出、無色片與黑紙。第五六區專項核對80種實際點選、三組選項獨立、入射／透射／紙張反射的色條與預覽像素、真實3D紙張為霧面非自發光材質／燈色採透射光、紙張漫反射線不穿透、八種視窗三欄直向按鈕／44px觸控／器材避讓、手機原生操作與備援，以及第六區回歸。整課保留六區及唯一小測。使用COLOR_URL／COLOR_CAPTURE_DIR／CHROMIUM_PATH指定公開頁及證據位置，GPU檢查依序執行。

## 4.5 第四區檢視與第五、六區集中操作（2026-11-03）

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-4.5-surface-inset.test.cjs tests/unit-4.5-surface-viewport.test.cjs
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-4.5-path-lessons.test.cjs tests/unit-4.5.test.cjs
```

第四區既有22項檢查20種組合、14組視窗與手機操作。第五六區專項檢查四種色片×四種照明的單變因、數值色條／預覽像素與動態角色一致；直接讀取測試攔截後的實際3D光線與遮板座標，確認遮擋時止於入射面且只改入眼量；八種視窗保留器材、預覽避讓、44px按鈕與完整選項。另驗證鍵盤、手機真實點按／拖曳取消及兩種入眼情境的WebGL備援。正式程式不新增測試API，純光學數值未改。支援COLOR_URL／COLOR_CAPTURE_DIR／CHROMIUM_PATH，軟體GPU檢查依序執行。

## 4.5 指標焦點與拖曳綠框（2026-11-03）


## 4.5 第四區同視窗操作（2026-11-03）

```sh
node --test tests/unit-4.5-surface-viewport.test.cjs
node --test tests/unit-4.5-surface-inset.test.cjs
```

版面專項16項含外層：14組視窗與1項原生手機操作。用真實3D投影檢查器材完整、實際工具按鈕與預覽不遮擋，量測三欄及全部選項位於同一視窗、九個顏色按鈕至少44px、沒有內部捲軸／水平溢出／裁字，逐一切燈與換紙不捲頁；原生點按／拖曳及展開說明保留。既有專項另驗證20種照明／材料組合、七種寬度、隱藏光路後換燈及WebGL備援。支援`COLOR_URL`、`COLOR_CAPTURE_DIR`及`CHROMIUM_PATH`。光學模型未改。

## 4.5 合併第四／五區、共六區（2026-11-03）

```sh
node --test tests/unit-4.5-surface-model.test.mjs tests/unit-4.5-color-model.test.mjs tests/unit-4.5-prism-optics.test.mjs tests/unit-4.5-mix-optics.test.mjs
node --test tests/unit-4.5-surface-inset.test.cjs
node --test tests/unit-4.5.test.cjs
```

專項核對預設綠光照白紙，桌機及手機備援實際操作四種燈色×五種色卡，切換其中一組保留另一組，逐色守恆、主圖材質／實際燈光顏色／預覽像素／三欄／說明同步；沒有入射的色光不會被錯列為反射或吸收。保留紙面非自發光、同側漫反射、多寬度避讓及光路隱藏後仍可換燈色的檢查。整頁改驗六區、導覽標題／編號、無舊lighting場景、小測回看指向合併後第四區及新第五區，原透明色片／入眼光實驗與前三區回歸保持。

## 4.5 第四區內嵌觀察與反射／吸收（2026-11-03）

```sh
node --test tests/unit-4.5-surface-inset.test.cjs
node --test tests/unit-4.5.test.cjs
node --test tests/unit-4.5-color-model.test.mjs tests/unit-4.5-prism-optics.test.mjs tests/unit-4.5-mix-optics.test.mjs
```

專項驗證五種色卡的主畫面材質／預覽／定性文字／逐色條長同步，反射與吸收逐色相加等於入射，遮隱光路及旋轉／俯看／方向鍵不改結果。用測試限定的唯讀觀察核對真實3D色卡為不透明、有紙面紋理的高粗糙度非金屬材質、無自發光；分散光路由不同起點離開且均留在入射側，不新增眼睛；另以實際渲染像素核對隱藏光路後藍卡／白卡的受光區仍較邊緣明亮，固定照明不被關閉；七種寬度的預覽／工具不遮住預設器材且無水平溢出；手機可直接點選全部材料，WebGL失效時平面圖與結果仍可用。正式程式不新增測試API。支援`COLOR_URL`、`COLOR_CAPTURE_DIR`及`CHROMIUM_PATH`。

`node --test tests/unit-4.5-torch-focus.test.cjs`：5項含外層，三色開關後移開無框且保留方向鍵焦點、拖曳可見／放開及各種取消清除、Tab與鍵盤提示、手機原生點按及touchEnd／touchCancel。使用圖片備援隔離焦點事件；另跑真立體金邊5與快速比較4項。光束8／版面15／整頁34與純模型本輪未重跑。COLOR_URL／COLOR_CAPTURE_DIR／CHROMIUM_PATH沿用。

## 4.5 手電筒金色輪廓（2026-11-03）

`node --test tests/unit-4.5-torch-gold.test.cjs`：5項含外層。真立體三色靜置輪廓、點按／鍵盤、快速比較恢復、拖曳／取消、WebGL失效備援與手機原生觸控；以PNG像素核對金色跟隨透明外形、金屬內部保持、四角沒有矩形框、白幕保持。小數位置按截圖包絡對齊，PNG先decode。軟體GPU檢查採依序執行，避免兩組立體場景並行耗盡資源。搭配既有快速比較4及光束8項；COLOR_URL／COLOR_CAPTURE_DIR／CHROMIUM_PATH沿用。

## 4.5 快速比較開啟三燈（2026-11-03）

`node --test tests/unit-4.5-mix-presets.test.cjs`：4項含外層，桌機24組與手機9組實際開關／比較操作，核對全開、落點、aria-pressed、選取狀態與渲染像素；含重按同一比較、Enter／Space及單燈仍可再關。COLOR_URL／COLOR_CAPTURE_DIR／CHROMIUM_PATH沿用。另跑既有光束8項；整頁主測試的舊保留開關斷言同步更新，本輪整頁34、版面15與純模型未重跑。

## 4.5 第三區舒展比例與下方名稱（2026-11-03）

沿用版面15與互動光束8項。使用者最新回饋取代強制同窗／半高：版面改查白幕填滿框架且1000:560、圖框下方單行名稱、沒有可見狀態徽章、下方快速比較、44px觸控與正常文件流，不再限制整卡一窗或木紋區70px。13種視窗皆可正常點按、拖動及展開說明。保留8項真立體光束／開關／鍵盤／取消／觸控／備援檢查；本輪整頁34與純光學未重跑。

## 4.5 第三區直接點按與手電筒區高度（2026-11-03）

沿用光路8／版面15／整頁34項，將開關操作改成直接點手電筒。驗證預設全開、移除獨立開關、點按與Enter／Space、拖曳放開／取消不誤切換、手機拖動後再次點按、排列保留開關；13種視窗檢查快速比較在場景下方，器材觸控至少44px、木紋區不高於70px及既有同畫面操作。另以八組視窗記錄前後高度，純光學未改不重跑。

## 4.5 第三區柔光束修訂（2026-11-03）

沿用光路專項8項，改查實際填色體積、遠端展寬、柔化濾鏡與無描邊／箭頭／圓圈；三色以pngjs比較顯示／隱藏提示的同狀態截圖，確認亮心與側暈的像素差由內往外遞減，避免只有資料或透明幾何通過。關燈拖動不顯示光束，落點仍能調整。既有燈頭／光斑校準、放開／取消、PNG備援、觸控與尺寸檢查保持；另跑15項版面與34項整頁。pngjs沿用執行環境既有工具，無新安裝。

# 5.1 瀏覽器操作檢查

## 4.5 第三區拖曳限定光路（2026-11-03）

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.5-mix-guide.test.cjs
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.5-mix-compact.test.cjs
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.5.test.cjs
```

光路專項8項（含外層）：三色的真實燈頭／光斑端點、筒身共線及大側向瞄準、預設／點按／鍵盤不常駐、放開／Escape／擷取遺失／失焦清除、關燈無發光帶、尺寸變更、圖片備援及手機原生放開／取消。測試才加入唯讀模型投影觀察，正式程式不含全域測試API。搭配15項視窗高度及34項真立體整頁回歸；純光學未改不重跑。COLOR_URL與COLOR_CAPTURE_DIR沿用。

## 4.5 第三區視窗高度與操作範圍（2026-11-03）

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.5-mix-compact.test.cjs
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.5.test.cjs
```

專項13種視窗加說明展開，共15項（含外層）。量測一般筆電／大手機整卡可見、所有視窗操作區對齊後白幕／三燈／六按鈕同畫面可用、每一按鈕點按及拖曳不引起頁面捲動、白幕1000×560比例、觸控範圍與無內部捲軸。專項阻擋立體模組，使用同尺寸同模型圖片隔離CSS；既有整頁34項保持真立體／手機及其他區回歸。COLOR_URL與COLOR_CAPTURE_DIR沿用。純模型未改，本輪不重跑。

## 4.5 第三區手電筒金屬材質（2026-11-03）

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.5.test.cjs
```

整頁擴充立體手電筒載入、實際朝向更新、初次載入前後白幕光斑剖面不變、無SVG替代、同模型PNG備援仍可瞄準及既有滑鼠／手機／七寬度回歸。純光學模型、mix-optics及功率配比未改，本輪不重跑。COLOR_URL及COLOR_CAPTURE_DIR沿用。

## 4.5 第三區正面手電筒（2026-11-03）

```sh
node --test tests/unit-4.5-mix-optics.test.mjs tests/unit-4.5-prism-optics.test.mjs tests/unit-4.5-color-model.test.mjs
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.5.test.cjs
```

新混光模型驗證三個已知波長的正功率D65配比、先加總再裁切、固定圓形足跡、七個交集區、分開確實不混色、排列保留開關及各手電筒單位瞄準向量。整頁檢查改用直接抓取下方原生手電筒，驗證完全重疊後三支各自可移開、開關／取消／方向鍵、正式角色素材完整檔案與CSS位置、正面畫布同倍率、七寬度不遮色區、原生觸控與WebGL不可用時混色仍可操作；其他區回歸保持。COLOR_URL、COLOR_CAPTURE_DIR沿用。

## 4.5 第二區固定三稜鏡與單色比較（2026-11-02）

```sh
node --test tests/unit-4.5-prism-optics.test.mjs tests/unit-4.5-color-model.test.mjs
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.5.test.cjs
```

模型新增650／530／460nm單色有限狹縫、真實折射與透射、同一白光取景範圍；整頁驗證兩區同器材與白光像素、第二區所有位移入口停用、單色主圖／近看像素與真實落點、光路／視角不改結果、回白光復原、小葵觀察接阿公解釋、七寬度兩區預覽避讓、手機切光與平面備援。測試以分區唯讀觀察實際器材，正式程式不新增測試API。COLOR_URL、COLOR_CAPTURE_DIR沿用。

## 4.5 第一區預設分光與常駐白幕（2026-11-02）

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.5.test.cjs
```

整頁28項（含外層）。改驗首次／重新整理都預設放入玻璃、開啟實際多條分光線、按鈕選取與引導對應，確認不存在放大按鈕／視窗，右上預覽兩狀態同步；保留3D拖曳／取消、鍵盤、手機、七寬度、備援與其他區／小測回歸。光學模型未改，本輪不重跑模型11項。`COLOR_URL`與`COLOR_CAPTURE_DIR`沿用。

## 4.5 第一區內嵌白幕預覽與較小側偏（2026-11-02）

```sh
node --test tests/unit-4.5-prism-optics.test.mjs tests/unit-4.5-color-model.test.mjs
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.5.test.cjs
```

模型11項、整頁27項（含外層）。依30°等腰N-BK7更新解析偏向、有限狹縫光譜、真實3D／白幕尺寸與像素，保留401波長的兩介面及守恆檢查；新增右上內嵌預覽／放大共用接收區、Escape焦點回復、手機原生放大、七寬度不遮擋器材及無浮動標籤。以實際3D把手投影抓取，測試才注入唯讀觀察；正式程式沒有測試API。`COLOR_URL`、`COLOR_CAPTURE_DIR`沿用。

## 4.5 第一區科學條件與橫向滑軌（2026-11-02）

```sh
node --test tests/unit-4.5-prism-optics.test.mjs tests/unit-4.5-color-model.test.mjs
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.5.test.cjs
```

新模型6＋既有模型5項；整頁更新為26項（含外層）。核對N-BK7公開折射率、最小偏向解析式、401波長及有限狹縫的兩介面、守恆、固定白幕、14.47／18.05×5mm包絡；瀏覽器檢查實際3D頂點／紙幕尺寸、主圖與近看像素、兩軸同倍率、抓取偏移／移動暫停／定位、鍵盤、觸控取消與中途雙指、七寬度標籤避讓、資料圖與備援。`COLOR_URL`、`COLOR_CAPTURE_DIR`沿用；正式程式不含測試API，測試才攔截兩個立體模組讀取實際器材。前七區及唯一小測的其餘回歸保留。

## 4.5 光的色散與顏色完整初版（2026-11-02）

```sh
node --test tests/unit-4.5-color-model.test.mjs
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.5.test.cjs
```

純模型檢查連續可見光的兩介面折射、白幕落點、單色比較、線性RGB疊加、所有照明／材料組合守恆及遮擋只改入眼光。瀏覽器檢查七區與唯一小測、實際3D抓取、畫面像素／參照一致、單變因、狀態獨立、鍵盤、手機觸控、七種寬度、備援及靜態閱讀。`COLOR_URL`指定公開頁，`COLOR_CAPTURE_DIR`另存畫面與layout.json，避免覆寫本機證據。正式程式無測試API，測試才攔截模組觀察真實器材投影座標。

## 3.3 單元小測三區操作

```sh
CHROMIUM_PATH=/usr/bin/chromium MATCH_CAPTURE_DIR=/tmp/unit33-three-steps DECIBEL_CAPTURE_DIR=/tmp/unit33-three-steps-page node --test --test-concurrency=1 tests/unit-3.3-sound-match.test.cjs tests/unit-3.3.test.cjs
```

小測專項與整頁檢查：依2026-11-03核可，以3.2為小測樣式基準，直接比對外框、淡米黃標頭、問號徽章、並列標題與小標字級及配色；任務內距保留緊湊配置。整頁七區仍沿用既有格式；三區順序與至少10px間距、三個主按鈕175px等寬靠右對齊，桌面完成區說明及按鈕同列、手機自然換行、提交仍屬原表單，答對／答錯回饋在第三區，八種寬度無溢出。取代舊的單一視窗高度限制，保留原聲音／波形一致、配對、結果保留、重試、換題、鍵盤及手機觸控檢查。`SOUND33_BASE_URL`可指定公開頁，截圖請存至獨立目錄。

## 3.3 第四區操作精簡

```sh
CHROMIUM_PATH=/usr/bin/chromium PAN_CAPTURE_DIR=/tmp/unit33-pan-controls node --test --test-concurrency=1 tests/unit-3.3-pan.test.cjs tests/unit-3.3.test.cjs
```

共24項（含外層）。核對排笛不再有重設按鈕，提示「點選任一根管子，就能吹奏。」位於視角切換下方、圖外上方，七種寬度與兩視角皆置中且不溢出。專項以重新載入初始化測試情境，整頁以實際點選長短管比較；原六管音高、動畫、鍵盤／手機點奏、下載取消與失敗重試維持。`SOUND33_BASE_URL`可指定公開頁，`PAN_CAPTURE_DIR`指定截圖位置。

## 3.3 第三區固定開場問答

```sh
CHROMIUM_PATH=/usr/bin/chromium GUITAR_CAPTURE_DIR=/tmp/unit33-guitar-dialogue node --test --test-concurrency=1 tests/unit-3.3-guitar.test.cjs tests/unit-3.3.test.cjs
```

吉他12項、整頁11項，共23項（含外層）。補驗核可的兩段開場對話與先後位置，以及下方由小葵整理的共同發現，在切換長短／鬆緊、修改數值及重設後都保持，發現的角色名稱與樣式為小葵；原撥弦、幾何、音高、播放取消、七種寬度與手機觸控檢查維持。`SOUND33_BASE_URL`可指定公開頁，另設`GUITAR_CAPTURE_DIR`保存公開畫面，避免覆寫既有證據。

## 3.3 第一區緊湊比較紀錄

```sh
CHROMIUM_PATH=/usr/bin/chromium FORK_CAPTURE_DIR=/tmp/unit33-compact-records node --test --test-concurrency=1 tests/unit-3.3-fork.test.cjs tests/unit-3.3.test.cjs
```

共22項（含外層）：音叉專項補驗1440／1366／390／320px下初始短狀態、只敲一種時另一欄不撐高、兩次觀察後相同波形尺寸、重設收回及無JavaScript初始狀態。原音訊、振動、停止／重播、取消、錯誤重試、鍵盤／觸控及整頁回歸維持。`SOUND33_BASE_URL`可指定公開頁（勿帶hash），公開檢查須信任環境代理CA；截圖存至`/tmp`避免覆寫歷史證據。

## 3.2 鋼尺場景放大裁切

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-2.2.test.cjs
```

既有6項（含外層）增加場景等比例放大、背景／互動SVG對齊及裁切框核對；桌夾修訂另掃描透明素材的可見邊界，確認完整夾具留在框內、點夾具不發聲、靠近固定端的尺面不受透明邊界阻擋。原有實際畫面點擊、自由端形變、按住停止、鍵盤、自然衰減、手機觸控與離開停止檢查維持。可搭配tests/unit-3.2-playback.test.cjs共14項檢查跨區互停。

## 3.2 第16項：比較區未載入備援

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-3.2-loading-state.test.cjs
```

共7項（含外層）。以正式頁與預覽頁檢查停用JavaScript、延遲主程式、阻擋主程式／相依檔、重新整理恢復、單區初始化例外不影響另一區、390px觸控／鍵盤／減少動態與正常播放。未就緒時提示可見、按鈕停用、比較區inert；就緒後五組圖與操作恢復。`LOADING_STATE_SITE_URL` 可指定公開站根網址，`LOADING_STATE_ARTIFACT_DIR` 指定截圖與狀態紀錄目錄，預設 `/tmp/unit32-loading-state`。公開頁使用環境HTTPS_PROXY。

## 3.2 第14項：完整公式答案

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-3.2-fireworks.test.cjs
```

共13項（含外層）。純模型逐一檢查四種氣溫×401種時間差的1604組結果：完整答案通過，微小偏差仍判錯；原340m/s估算例子不再通過。瀏覽器檢查整數題、390px鍵盤小數作答、四捨五入／截斷／偏差0.01公尺失敗、相同數值尾零成功，以及可見與輔助說明。約1秒的欄位與煙火像素在瀏覽器內同時擷取，避免多次通訊後才取樣已消退的火花，原1500像素及音畫同步門檻保持。原煙火播放、重播、換題與異常恢復繼續檢查；可搭配圖片重試及跨區播放共三檔27項。公開重跑方式沿用下列FIREWORKS_URL與FIREWORKS_ARTIFACT_DIR。

## 3.2 第11項：重播同題／換一題

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-3.2-fireworks.test.cjs
```

既有12項（含外層）加入首次／完成／換題名稱、同題重播中斷及解碼失敗後保留名稱、重試文案對應當前按鈕與恢復後同題氣溫／時間差檢查。原本的真實音訊時鐘、作答、鍵盤及390px版面檢查持續執行。`FIREWORKS_URL` 可指定公開頁，`FIREWORKS_ARTIFACT_DIR` 指定既存截圖目錄；公開頁使用環境 HTTPS_PROXY。

## 3.2 第10項：煙火夜景圖失敗重試

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-3.2-picture-retry.test.cjs
```

實際阻擋夜景圖、再恢復請求，核對重新下載與解碼、重複失敗、保留同題氣溫與時間差、正常重播不重載圖片、載入中離開／換題不啟動舊觀察；另檢查圖片／音效分開提示及390px觸控／鍵盤／減少動態的圖片與音效恢復。共6項（含外層）。`PICTURE_RETRY_URL` 可指定公開頁，`PICTURE_RETRY_ARTIFACT_DIR` 指定截圖與請求紀錄目錄，預設 `/tmp/unit32-picture-retry`。

## 3.2 第08項：暫停後單獨敲擊

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-3.2-single-paused.test.cjs
```

實際檢查第四、五區暫停後單獨敲擊只重播點選組別，其他組的秒數、粒子、器材表面與位置完全凍結；並核對溫度刻度、完成後保留繼續入口、明確繼續時各組接續原秒數、同步重播／重設及390px觸控／鍵盤／減少動態／跨區返回。共4項（含外層）。`SINGLE_PAUSED_URL` 可指定公開頁，`SINGLE_PAUSED_ARTIFACT_DIR` 指定紀錄與截圖目錄，預設 `/tmp/unit32-single-paused`。

## 3.2 第06項：鐘罩音效輸出中斷

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-3.2-vacuum-interruption.test.cjs
```

以真正的 AudioContext suspend／resume 核對中斷提示可見、分貝及LED清除、空氣量／氣壓與電源／敲錘保留、抽氣／進氣照常、系統恢復不自動發聲、原開關恢復與音訊節點沿用；另涵蓋啟動等待中的中斷、390px觸控／鍵盤／減少動態及離開後不自行播放。共5項（含外層）。`VACUUM_INTERRUPTION_URL` 可指定公開頁，`VACUUM_INTERRUPTION_ARTIFACT_DIR` 指定截圖及中斷紀錄目錄，預設 `/tmp/unit32-vacuum-interruption`。

## 3.2 第05項：鐘罩輔助提示方向

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-3.2-vacuum-status.test.cjs
```

實際操作並核對空氣量與 aria-live 提示：抽氣減少、停止保留、進氣增加、關閉進氣、切換方向、回到充足及抽氣下限；另檢查390px觸控／鍵盤／減少動態、電鈴關閉時不宣稱聽到鈴聲，以及音效失敗提示仍優先顯示。可用 `VACUUM_STATUS_URL` 檢查公開頁、`VACUUM_STATUS_ARTIFACT_DIR` 指定敘述紀錄及截圖目錄（預設 `/tmp/unit32-vacuum-status`）。共5項，包含外層主測試；可搭配既有鐘罩、音訊重試與跨區播放檢查。

## 3.2 第02項：音檔重試

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-3.2-audio-retry.test.cjs
```

以實際阻擋鋼尺／電鈴音檔、再恢復連線的方式，驗證原生媒體錯誤後確實重新請求並播放、等待期間保留錯誤、鐘罩保留空氣量／模式／音訊節點與實際分貝取樣，以及重複失敗、取消等待、離開不自動恢復、390px觸控／鍵盤／減少動態。共6項（含外層）。可用`AUDIO_RETRY_URL`檢查公開頁，`AUDIO_RETRY_ARTIFACT_DIR`指定截圖目錄，預設存於`/tmp/unit32-audio-retry`。與第01項、鋼尺、鐘罩及跨區測試一起執行可檢查原有播放行為。

## 3.2 敲擊前靜止與音叉傳播

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.2-particle-rest.test.cjs tests/unit-3.2-playback.test.cjs
```

第四區已移除空氣與水的背景微動。測試分別在開啟及關閉「減少動態」時，驗證敲擊前靜止、音叉敲擊後三種介質仍有傳播振動、實時計時、暫停凍結、重設後持續靜止及四種桌機寬度；另保留跨區播放停止回歸。兩檔合計 11 項（含外層），測試自行啟停本機伺服器與 Chromium。不代表完整歷史測試皆已通過。

## 3.2 煙火動畫與測距

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.2-fireworks.test.cjs tests/unit-3.2-playback.test.cjs
```

煙火動畫不因「減少動態」定格。檢查兩種偏好設定的逐時畫面一致、擴散下墜及清除、真實音訊延遲、2～6秒實時計時、作答及重播與跨區停止；兩檔合計 20 項（含外層）。觀察紀錄維持「亮光 → 計時 → 聲音」同列，驗證計時位於兩事件之間且置中、無分隔線或進度條、不預告總時間、計時持續增加、聲音抵達後停止，以及四種桌機寬度與390px的元件範圍和完整6.00秒讀值可讀性；當次畫面存於 `/tmp/unit32-stopwatch-{width}.png`。

煙火版面檢查另驗證「你的計算」位於上方兩欄之下並橫跨完整內容寬度；桌機公式、輸入框與核對按鈕同列，390px 直列，右側僅保留條件與紀錄。

## 6.1 元素的探索

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-6.1.test.cjs
```

檢查六張既定標題、單一結尾檢核、共用人物、四列古今對照預設可見、補充說明切換／收起、波以耳說明展開、五份樣品的性質欄位切換、石墨及汞獨立加入／移除與重設、名稱／符號與大小寫、碳樣品比較，以及檢核的未完成／錯誤／正確回饋、修改後撤下舊結果與全部重填。另含鍵盤、觸控、減少動畫、320–1440px 版面、素材與導覽連結。另核對 3.1／3.2 格式的區塊編號、導覽與標題一致、實際錨點跳轉，以及單元小測獨立標頭。另檢查六種寬度下左右同列對齊、補充面板位於四列之後，以及鍵盤／觸控操作。另核對土／水／氣／火各自的古代看法、研究與證據、現代理解、人物差異及來源，並檢查手機的三段順序。新增四項圖像探索：土壤位置標記、生成／分解水的並列紀錄、氣體性質比較及空氣組成、樣品質量與氧參與的追蹤；確認操作後主要結果持續可見。共 15 組子測試，連同主測試為 16 項。

測試自行啟停本機 Python 伺服器與 Chromium，需要環境允許本機 socket 與瀏覽器程序。可用 `ELEMENTS_CAPTURE_DIR=/tmp/unit61-review` 保存檢視截圖；`ELEMENTS_URL` 可指定以 `/` 結尾的公開學習頁。畫面檢視與內容範圍紀錄另存 `docs/reviews/unit-6.1/review.md`；操作通過不代表全單元最終驗收。

需要 Node.js、Python 3、Playwright 及 Chromium。雲端環境已提供這些工具，不需修改套件清單。

在 `k12-learning-demos` 根目錄執行：

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-5.1.test.cjs
```

若使用 Playwright 安裝的 Chromium，可省略 `CHROMIUM_PATH`；自備瀏覽器則指定其執行檔路徑。

檢查會啟動一個隨機本機 port 的 Python 靜態伺服器，結束時關閉伺服器與瀏覽器。涵蓋合併後四個學習區塊、前後共用頭像、眼睛連續拖曳／邊界／取消／鍵盤／真實手機觸控、俯平仰視的玻璃與刻線透視、固定液面、原有每格 1°C、第四區無額外估讀表單、結尾未完成／錯誤／正確紀錄、容許差距、排序及重設、不同視窗、素材及單元導覽。

這些操作檢查不代表課綱、指定版本教材或完整單元已通過外部驗收。

## 1.1 第三區：三孔板通光

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-1.1-aperture.test.cjs
```

核對小光源至屏幕有限光束依序通過三片孔板的前、後孔口：全通、部分、全擋、高低高回歸、各板單獨通光但合起來全擋、上游擋光後下游熄燈、前後位置及板厚效應、有限孔口與微弱通光。解析面積另與48組獨立逐條射線穿孔取樣比較。瀏覽器以測試載入時的模組觀察入口讀取實際3D孔口、亮點材質／可見性與指示燈，不在正式程式暴露全域測試介面；包含實際滑鼠／觸控拖曳、鍵盤、高度滑桿、重設、五種寬度，以及第二區、第六區及相鄰1.2頁面HTTP入口回應。截圖與紀錄見 `docs/reviews/unit-1.1-card03/`。

## 1.1 單元小冊：影子判定、少量吸附與尺軌

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-1.1-shadow-theatre.test.cjs tests/unit-1.1-aperture.test.cjs
```

核對投影大小及位置各自合格才吸附、初始三個前後位置僅調x／y不能完成、非0.42深度可合理完成、吸附前後z及道具大小完全相同、x／y修正不超過投影位置容錯、多組非0.42深度可達標、容錯邊界及80組獨立射線交屏幕計算。實際瀏覽器涵蓋三道具的失敗／成功狀態、滑鼠及觸控拖曳、鍵盤、尺軌、滾輪、轉動視角、完成後「演出完成」停用與重新挑戰提示、重設還原道具／進度／描邊／尺軌狀態及再次完成、五種尺寸；以測試載入時的場景觀察入口核對真正的3D座標，正式程式未暴露測試API。另檢查尺軌左光源／右屏幕、0–10換算與端點、讀值／道具切換同步、Home／End／方向鍵、78px扁平高度、原生滑鼠及觸控拖動、拖動經過合格位置不提前鎖定、放開後才吸附且保留z。桌機、手機使用獨立程序，另跑第三區通光回歸。紀錄見 `docs/reviews/unit-1.1-shadow-theatre/`。

## 1.2 平面鏡成像區塊

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-1.2-mirror.test.cjs
```

檢查第三區上下同時對照的精簡版：中央光路精確為2公尺入射、3公尺反射、2公尺延長、5公尺直達；81個瞳孔取樣核對反射與直達方向一致、有限鏡面及入眼線不穿原熊。實際SVG路徑、螢幕物像等距／同大及距離標籤亦核對。直接讀取觀察窗畫布確認兩排熊的像素相同、全熊位於取景範圍內、鏡面裁切不遮掉玩偶，並核對近處原熊在視野內、比遠熊大、完整不透明、兩排像素相同、不遮住遠熊、代理圖比例及腳底落地點。320–1440px六種尺寸皆保留上下兩排與左右對應欄，沒有切換、鼻尖標記或散光。新增六種寬度的實際遮擋檢查：沿光路逐點取樣，確認距離標籤及安全邊界不遮實線、虛線、鏡面、人物、玩偶或標題，亦不超出圖框。另含圖下兩則短對話、沿用共用頭像與雙色背景、六種尺寸文字不溢位且不碰頭像、說明字數上限與必要光路小註、滑鼠／鍵盤與真實手機觸控前往第四區、量距往返、慢速素材載入、重複ID／程式／資源錯誤，以及第一單元入口與1.1頁面載入。共15項（含外層項目），紀錄與核可圖、實際截圖見 `docs/reviews/unit-1.2-card03/` 的 `stacked-*`、`clearance-*` 及最新 `explanation-*` 檔案。

## 2.2 鋼尺操作檢查

同樣使用現有 Python 3、Playwright 及 Chromium，於 repo 根目錄執行：

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-2.2.test.cjs
```

涵蓋實際尺面點擊、連續重新撥動、自由段變形與固定段不動、立即停止、自然衰減、鍵盤與備用按鈕、窄螢幕觸控、背景不觸發、點擊及振動時無預設矩形焦點框／觸控高亮，以及素材載入錯誤。測試自行啟動及關閉本機伺服器與瀏覽器。

另檢查透明素材中尺身兩條長邊的像素邊界保持平直、顯示後與桌子前緣方向平行，以及靜止／停止後沒有懸空段額外變形。外觀仍需檢視實際靜止與振動畫面，不能只以程式檢查取代。

聲音檢查會解碼實際 WAV，確認有效訊號強度及峰值餘裕、固定 100% 播放、沒有頁面音量滑桿、實際播放時間前進、停止歸零及播放自然結束。這些量測不能代替使用者喇叭上的實際聽感評估。
## 4.2 蒸發結晶連續播放

在 repo 根目錄執行：

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.2.test.cjs
```

以真實 DOM、原生按鈕及 WebGL 檢查移除進度條與控制列後的操作。點選步驟從該步驟連續播放至第四步結束，點擊圖片從目前步驟重播至結束；選取狀態與提示隨播放進度自動推進。涵蓋沸騰畫面實際變動、器材照片固定、快速切換取消舊播放、反覆點圖重播、Enter／Space 與觸控，以及 WebGL 不可用時只停用動畫按鈕。

時間契約保持首段 1.5 秒、後三段各 3 秒，合計 10.5 秒；檢查各時間邊界與最後乾燥狀態。短片段以 Playwright 受控時間檢查中間畫面及停止點，避免軟體 GPU 截圖耗時造成誤判；仍使用實際的網頁事件和畫面渲染。測試自動啟停本機伺服器與瀏覽器，不代表完整單元已驗收。

## 1.2 第五區三鏡比較

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-1.2-curved-mirrors.test.cjs tests/unit-1.2-mirror.test.cjs
```

新測試以獨立的切線分量／法線分量檢查球面反射、近軸會聚位置、會聚後光路繼續及成像位置條件；實際點選三種鏡面的三處反射點、重複收起／重開、鍵盤與觸控，並檢查 1440／1280／1024／768／390 px 的三圖並列、版面順序、物體箭頭一致高度、圖片及相鄰活動。版面語意與幾何檢查搭配人工截圖對照，不以測試通過替代視覺檢視。既有平面鏡測試一併執行以檢查相鄰第三、四區回歸。

## 2.2 聲音傳播區塊

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-2.2-sound-propagation.test.cjs tests/unit-2.2.test.cjs
```

新測試檢查初始靜止、近端先動／遠端後動、疏密區向右傳播、粒子位移有界且不互相穿越、橘色粒子雙向往返、按鈕與直接點鐘觸發一致、連續敲擊重啟且不累積動畫、移除播放／重播控制、耳膜在擾動抵達後才振動、自然結束、鍵盤及真實觸控點鐘、手機共用放大視圖、320／390／768 px 無橫向溢出，以及減少動畫偏好下不自動播放。另逐幀檢查整段動畫的密部／疏部標示只向右移動、逐漸淡出、離開後不再出現，手機標示同步位置與透明度，再敲擊可重設；涵蓋原先到達右側後交替跳回的時間邊界。素材與主頁載入錯誤也列為失敗。需另檢視桌面及手機截圖，確認鐘、耳部剖面、疏密標示與使用者核可示意一致。

鐘聲採用使用者選定的 BELL 8B，檢查含餘音約 6 秒的實際 WAV 解碼後的強度與峰值、沒有自動播放、固定 100% 音量且無滑桿、按鈕與直接點鐘可播放、連續敲擊重新起音、播放時間確實前進、自然結束不循環，以及手機真實觸控播放。檢查無法取代使用者裝置上的實際聽感評估。

## 2.2 第四、第五區塊：介質與溫度影響聲速

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-2.2-sound-speed.test.cjs
```

純模型檢查 5,000 公尺、物理傳播延遲、位移有界、固定 y、粒子不交叉、歸位與介質／溫度先後。瀏覽器檢查正式五張學習卡、第四區只有介質比較、第五區只有溫度比較、沒有模式分頁、唯一原生／SVG ID、左右欄格式、導覽與小測。來源、粒子、水體／鋼材、表面取樣、一體音叉的連續彎曲、叉尖反向往返、底部與握柄銜接、鋼材接觸曲線、0.6 秒敲槌、下方刻度及右側純到達時間皆檢查。

第09項另核對第五區與小測在0、10、20、30、80°C採相同近似聲速；0°C／80°C到達5,000公尺為15.106／13.193秒、差1.913秒，12秒時的位置為3,972／4,548公尺。獨立預覽頁使用相同公式與控制器版本。

兩區分別涵蓋個別／同時敲擊、重啟、暫停、重設、背景、鍵盤、手機點擊與溫控按鈕、七種寬度；調溫或重設第五區不改動第四區。0／20／30°C 比較先後與同溫同步均驗證。沒有凍結時鐘的真實秒錶同時核對兩區的 1／5／10 秒位置與五組到達等待時間，保留真實時間並確認沒有額外倍率。

正式入口為 `units/3/parts/3.2/#card-04` 與 `#card-05`；`SOUND_SPEED_LESSON_URL` 可指定其他完整課程入口。獨立頁 `previews/unit-3.2-card04/` 同樣呈現兩個獨立區塊並共用正式資產。最新畫面與完整結果見 `docs/reviews/unit-2.2-card05/`。

第五區已依核可圖改為溫控裝置與三個目標溫度按鈕，沒有滑桿。另檢查調溫準備、液柱／讀值／聲速連動、互斥指示燈、連點、途中敲擊先穩定目標再起算、重設與背景，以及核可版型及七種寬度。全頁回歸指令可合跑本檔與第二、三區及鋼尺測試；最新共 64 項通過（含外層）。

## 2.2 第三區塊：真空鐘罩實驗

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-2.2-vacuum.test.cjs tests/unit-2.2-sound-propagation.test.cjs tests/unit-2.2.test.cjs
```

鐘罩檢查包括預設靜音、實錄解碼、實際 AudioContext／媒體播放、圖上及下方控制一致、抽氣中途停止、進氣反向操作、空氣量上下限、抽氣到下限仍啟用且保留「停止抽氣」、初始／抽氣／接近真空／進氣恢復均不繪製空氣粒子、敲錘在低空氣量時持續動作，以及直接量測 GainNode 隨抽氣降低、進氣恢復，確認不是僅更新文字。另涵蓋開關／快速切換／鍵盤、離開區塊停止聲音且保留空氣量、手機觸控、320／390／768／1024 px 無溢出、點擊區尺寸與完整器材顯示。新增罩外分貝儀檢查逐聲道 RMS 讀值隨抽氣下降、進氣恢復，並在空氣量不變時暫停實際音訊驗證讀值清除；關閉顯示「—」、原狀態列與深綠色說明標籤移除。最新桌上型分貝儀與照片整合，檢查七段顯示器實際亮起的筆畫與 output 一致、器材實際位置命中、手機各尺寸不再出現空氣藍色點；320／390／768／1024px 儀表位於同一實驗桌內，與鐘罩留白超過圖寬 5%，空氣讀值維持單行。截圖與核可示意另保存於 `docs/reviews/unit-2.2-card03/`，操作通過不代替人工畫面對照。

2.2 共用格式另比對 1440／1024／768／390px 下第一至三區塊的側欄與主欄位置、內距、標題／說明字級與對齊、角色對話順序、重點框，並持續檢查第三區塊分貝儀與鐘罩間距。

## 1.2 第六區光路可逆與第二區共用場景

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-1.2-reversible.test.cjs tests/unit-1.2-curved-mirrors.test.cjs tests/unit-1.2-mirror.test.cjs
```

第六區檢查41組光路、共用場景及第二區實際器材拖曳回歸；最新操作依使用者指示改為雙光源獨立開關，檢查實際器材固定座標連點四種組合、紅藍及同開的畫面色彩像素、拖曳不切換、取消手勢、背景點擊、鍵盤、五種寬度、真實觸控及SVG器材點擊。原三步記錄與分段動畫測試已由上述行為取代。與既有第三至五區測試一起執行，另以實際截圖檢視畫面。

第六區另檢查實際Three.js物件的扇形、角度弧線及反射光點可見性：初始及雙關閉時隱藏，單開任一或雙開時顯示，重設及關閉後調角仍隱藏。測試只在載入時插入物件觀察入口，不在正式程式新增全域測試介面。

第六區已依使用者要求移除角度滑桿。測試透過器材拖曳與鍵盤調角，檢查range輸入不存在、讀值同步，並以真實觸控序列驗證拖曳不切換光源。

## 5.1 第二區塊：加冰塊與加熱水

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-5.1-water-lab.test.cjs tests/unit-5.1.test.cjs
```

新測試涵蓋 0–60°C 刻度的每度等距分度、長中短刻線、數字及攝氏單位、刻線與數字位於玻璃管身內、凹液面最低點校準、冷卻與加熱的連續變化、冰塊落下／漂浮／融化（前 8 秒維持完整、後 12 秒逐漸縮小）、熱源與冰塊分開操作、溫度與液柱界限、停止／重設、鍵盤、主圖與放大窗同一畫面同步，以及五種視窗寬度。可用 `WATER_LAB_CAPTURE_DIR=/tmp/water-lab-review` 另存桌機／手機狀態截圖；`WATER_LAB_URL` 可指定待檢查的頁面。器材配置與核可示意圖的外觀比對見 `docs/reviews/unit-5.1-card02/review.md`。

## 4.2 第三區塊：濾紙層析互動實驗

```sh
node --test tests/unit-4.2-chromatography.test.cjs tests/unit-4.2.test.cjs
```

新區塊檢查使用真實 DOM、Canvas 2D、原生按鈕與指標事件；包含溶劑到達墨點才展開、色帶位置與前緣的關係、兩種樣本連續分離、切換及重播、點放／拖曳、放置過高／過低、杯外放置與取消、暫停續播、夾具取新濾紙、鍵盤與觸控，以及場景載入失敗。時間以 Playwright 時鐘控制，另以真實時間手動確認完整播放。

版面檢查 1440、850、768、390px：所有右側內容位於 `.card-main`，不跨入卡片編號欄、不造成水平溢出，使用共用正式頭像，沒有額外操作說明面板。另與使用者核可的靜態預覽比較主要欄位、兩列對話、按鈕、實驗場景與下方概念區的位置與尺寸，並檢視桌面、手機及結果截圖。

2026-10-28 層析暈染修訂：示意延長為 24 秒，檢查前緣在約 4 秒到達墨點、先形成混合暈染再逐漸分色，原點淡化但不消失。新增實際 Canvas 像素檢查，比較原點／拖尾與鄰近紙張的色差，避免只驗證內部資料卻沒有真正畫出殘色。相關區塊的 13 項檢查通過。

最新時間調整：依使用者要求縮為 16 秒，各觀察時間依原進度比例縮短；檢查總長、約 2.67 秒的接觸時點及終點前後的播放狀態，保留原點殘色與拖尾像素檢查。

## 5.1 第三區塊：攝氏／華氏雙刻度

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-5.1-dual-scale.test.cjs tests/unit-5.1-water-lab.test.cjs tests/unit-5.1.test.cjs
```

新測試涵蓋綠線實際拖曳、抓取偏移、圖外指標捕獲、量程鉗制、放開停止、手機觸控拖曳／取消且不捲動頁面、綠線鍵盤操作，以及 −40°C／−40°F 交會、獨立刻度的 1.8 倍間距、刻字不重疊、一般公式與代入式、五個預設值、降溫／升溫點擊及滑鼠／觸控長按釋放、輸入數字及單位的雙向換算、範圍／空白錯誤、近似值標示、鍵盤、現有頭像、320–1440px 版面及真實觸控。`DUAL_SCALE_CAPTURE_DIR` 可保存截圖，`DUAL_SCALE_URL` 可指定待檢查的頁面。外觀仍須對照核可示意圖檢視。

## 1.2 單元小測：潛望鏡

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-1.2-periscope.test.cjs tests/unit-1.2-mirror.test.cjs tests/unit-1.2-curved-mirrors.test.cjs tests/unit-1.2-reversible.test.cjs
```

潛望鏡檢查有限鏡片與單面反射、36 × 36 組角度的反射分量及管道邊界、不同視線的獨立反向傳播、船／天空／海面及局部／完全遮擋、觀察窗實際像素與完整三維視線的交叉核對。實際操作涵蓋兩片鏡子的 35% 滑鼠拖曳倍率、雙向旋轉、上下限立即回調與跨轉軸穩定、CDP 觸控拖曳的 10° 手勢只轉動 3.5°、鍵盤與半度微調、角度上下限、取消拖曳、光路及提示、第一關只依實際對準判定、第二關僅依實際修復判定、沒有鏡片選擇題或底部折射延伸問題、第三關答案與操作門檻、反向訊號重合、狀態失效及沒有整份重來按鈕，以及 1440／1280／1024／768／390 px 版面、資源錯誤及離頁時 GPU 資源釋放。

與第三至六區循序執行回歸，避免多個軟體 WebGL 瀏覽器競用。實體點擊前取消平滑捲動並確認座標穩定，不以強制點擊略過命中問題。觀察窗取樣核對使用相同 Canvas CPU 色彩取樣方式，以免 GPU／CPU 縮圖插值差異被誤判為光路偏差。整卡截圖暫隱藏外側 sticky 導覽，避免離開視窗的部分在長截圖中混入懸浮導覽；正式頁面不隱藏導覽。截圖與人工對照保留在 `docs/reviews/unit-1.2-periscope/`。

潛望鏡提示光已改為整束實際光路短暫亮起後熄滅。另檢查顯示路徑與獨立追跡完全一致、沒有箭頭／移動光點／圈叉、撞壁光斑位於真實交點、快速連點不疊加或延長、自動消失及空檔、拖曳／微調立即取消、沒有額外文字提示或分關重設控制、五種寬度的追蹤按鈕無圖示且縮為兩行文字、檢查按鈕位於追蹤入口下方且兩者均在觀察窗內、撞壁光斑隨追蹤熄滅、換關取消舊計時器、第三關比較線不被過期動畫清除，以及減少動態與手機觸控。淡出曲線純函式與實際 SVG 路徑、時間及畫面分別核對。 提示已改為從小葵眼位反向追蹤，另以 1296 組角度比對中央視線，並實際檢查五組船／天空／海面／遮擋設定的 SVG 起點一律為眼位，管外直線延伸不自動接船。

## 5.1 統一為 3.2 頁面版型

同時執行 `unit-5.1.test.cjs`、`unit-5.1-water-lab.test.cjs`、`unit-5.1-dual-scale.test.cjs`，共 30 項檢查。響應式面板依實際內容欄寬判定橫向／直向配置。`TEMPERATURE_LESSON_URL`、`WATER_LAB_URL`、`DUAL_SCALE_URL` 可分別指定整頁、第二區與第三區待測網址，未設定時仍使用自動啟停的本機伺服器。文字／圖像／控制項保留核對與版型截圖另見 `docs/reviews/unit-5.1-layout/`。

## 4.2 第五區塊：直接稱量與 ppm

```sh
node --test --test-concurrency=1 tests/unit-4.2-concentration.test.cjs tests/unit-4.2-chromatography.test.cjs tests/unit-4.2.test.cjs
```

新第五區檢查溶質／溶劑淨質量、分母包含兩者、0 溶質、非整數質量、質量比 ppm 的固定總量與溶劑補足；並以真實 DOM 和 Canvas 驗證糖匙點擊／拖曳、快速連點、取回、倒水按住放手、取消、數字輸入與拒絕無效值、份量卡加入／取回／上下限、重設、鍵盤、真實觸控、載入失敗與 320–1440px 排版。第五區 14 項、層析 13 項、蒸發 9 項，共 36 項通過。另須檢視實際畫面與核可示意圖，詳見 `docs/reviews/unit-4.2-card05/review.md`。

第五區最新增減操作修訂：新增明確加糖／減糖／加水／減水按鈕、上下限停用、鍵盤及觸控，檢查單次調水 2.6 秒期間的實際畫面與水量持續變化、減水獨立動畫、慢速長按後放手停止，以及重設取消。本輪 `tests/unit-4.2-concentration.test.cjs` 共 17 項通過；並人工檢視新增控制列在桌面與窄螢幕的呈現。


第五區器材點擊修訂：撤除控制列，改測糖罐加入／秤上糖舀出、水壺倒入／秤上量杯倒出；新增 320／390px 四處實物點擊的真實觸控、量杯抬起傾斜歸位、離秤讀值暫停與恢復，以及新背景／透明量杯素材失敗的隔離檢查。仍檢查 1.1 秒糖／2.6 秒水、長按倒水、數字輸入及 ppm。最新執行結果見 `docs/reviews/unit-4.2-card05/review.md`。

第五區正式公式對照：新增分子為溶質質量、分母為溶液總質量、正式公式位於數字代入式前、配方變更只更新代入數字，以及 320–1440px 公式內部排版檢查。

第五區公式位置修訂：正式公式必須是整個「配成糖水後」結果面板的前一個同層區域，並檢查 320–1440px 的實際上下順序，避免再插入質量列與數字代入式之間。

## 5.1 第四區：合併視差、估讀與記錄

`unit-5.1.test.cjs` 已取代原放入動畫及獨立溫度滑桿測試，現有 10 個瀏覽器情境（含外層 runner 共 11 項）。與第二、三區測試合跑共 32 項。另檢查第四區共用精緻器材圖片載入、眼睛命中區與俯仰標籤不相交、刻度數字在各視角都完整可見。`TEMPERATURE_LESSON_URL` 可指定線上版本；不設定則啟動本機頁面。外觀參照、三種視角及手機截圖見 `docs/reviews/unit-5.1-card04/`。


第四區估讀表單已依使用者指示移除，原記錄／參考測試撤下，改檢查第四區沒有輸入、表單及參考元件。拖曳視線、刻度投影與結尾讀值小測持續回歸。

## 4.2 ppm：實物比例與毫米放大

```sh
node --test --test-concurrency=1 tests/unit-4.2-ppm.test.cjs tests/unit-4.2-concentration.test.cjs tests/unit-4.2-chromatography.test.cjs tests/unit-4.2.test.cjs
```

`unit-4.2-ppm.test.cjs` 檢查一公升液柱的幾何體積、糖密度與總實心體積、1 克／1 毫克模型相差1,000倍、變形旋轉後晶粒不重疊、正規化幾何與實際實例體積、1／1,000 ppm 及百分比換算、正式公式順序、秤量皿與配方卡切換、毫米尺規與隨畫面寬計算的倍率、鍵盤／觸控／重設、320–1440px 排版、WebGL 及背景失敗處理。ppm 已依新指示改為實物觀察，舊份量卡拖曳檢查由上述情境取代。上方糖水仍檢查四種器材點擊、動畫、質量輸入與公式同步，並與 ppm 操作隔離。物性來源與限制見 `docs/decisions/unit-4.2-ppm-physical-scale.md`，實際畫面與結果見 `docs/reviews/unit-4.2-ppm/review.md`。

本次正式實作最終四組合跑共 50 項全數通過：ppm 9、稱量與整合 19、層析 13、蒸發 9（均含外層測試）。

ppm 深色糖碟修訂：增加主場景兩個碟面的實際像素亮度，以及放大畫面深底／白糖的亮度對比檢查；既有體積、尺度與操作檢查一併重跑。

ppm 器皿與糖堆質感修訂：新增封閉削角晶體、錯層位移與安全自然旋轉檢查，非重疊界限包含位置微擾；加入新碟面素材失敗情境。本輪 ppm 11 項全部通過。

ppm 可拖曳放大鏡修訂：以常駐鏡框與握柄取代浮動圖；檢查真實滑鼠及觸控拖曳、移動中局部取樣、糖碟對準、兩碟同倍率、1毫米尺規、鍵盤移動與微調、Home／Escape歸位、取消與共用重設。320–1440px逐一確認鏡框、握柄與標籤都留在場景內，並檢查對準後無視野偏移。最新執行結果見ppm核對紀錄。

ppm份量重點修正：兩碟共用36毫米完整視野；檢查每個模型頂點皆在圓形鏡面內、1公分尺規與約3倍的畫面倍率、整杯水及兩個原糖碟未被鏡框遮住、鏡框與原尺寸糖量的連線，以及同倍率下1毫克比1克小得多的實際像素差距。原拖曳／觸控與重設檢查延用新的整份呈現規格。

## 5.1 單元小測：拿取、量測與溫標判斷

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-5.1-thermometer-quiz.test.cjs tests/unit-5.1.test.cjs tests/unit-5.1-dual-scale.test.cjs tests/unit-5.1-water-lab.test.cjs
```

全套目前 39 項（含 runner 外層），新小測涵蓋純模型校準與估讀界限、真實滑鼠與手機觸控拿取／放入／放回、B 可先量、同杯單支限制、取消與無效放置、鍵盤、等待穩定／斜視／單位／讀值回饋、紀錄保留、新挑戰中斷動畫、真實頭像、公式上下分數、7 種視窗與資源載入。`THERMOMETER_QUIZ_URL` 可指定待檢查的公開頁面；未設定時使用自動啟停的本機伺服器。整頁測試已撤下舊排序及原理單選題，保留教學區回歸與導覽。核可圖、實作截圖與對照見 `docs/reviews/unit-5.1-quiz/`。

小測視線修訂：檢查兩支初始皆非平視且高低不同、新回合交換、沒有回到平視按鈕或 Home 捷徑、滑鼠與真實手機觸控能手動調整到同高、斜視作答被提醒，以及修正視線後不用重填既有讀值。

ppm最新單一引入：確認只有1毫克模型／糖碟，沒有1克模型、第二碟或比較卡；同一比例的一公升水作參照，ppm依1公斤溶液總質量計算。覆蓋百萬分之一／定義／公式／唯一代入式的順序、密度與1毫克體積、完整份量、畫面微量像素、來源連線、初始觀察、滑鼠／觸控、鍵盤／取消／重設、7種寬度及載入失敗。上方稱量的整合檢查同步改為單一1毫克觀察。

單一ppm引入最終合跑31項通過：ppm12、上方稱量與整合19（含外層）；本輪未重跑蒸發與層析。畫面及完整結果見`docs/reviews/unit-4.2-ppm/review.md`最新章節。

ppm與百分濃度銜接：檢查相同質量比、×100%／×1,000,000的兩列對照、0.0001%＝1ppm的獨立算術、少量時易讀的理由，以及定義→銜接→正式公式→代入式的順序；新增說明與對照列納入320–1440px界限檢查。

ppm介紹措辭修訂：新增檢查明說「並不是新的濃度概念」、圖後先交代相同質量比例、溶質特別少時適用與同一濃度換表示方式，原有計算與版面檢查延用。

ppm核可雙圖正式版：檢查醒目觀察標題、單一質量、手形入口可操作、18毫米完整視野及5毫米尺規、共用分式→兩種表示係數→大字等價結果的順序、ppm數字的視覺層級、來源連線、滑鼠／觸控／鍵盤／重設及失敗處理。標牌、握柄、原糖量、手形、兩支係數與等價結果納入320–1440px界限檢查；上方稱量整合同步回歸。

2.2 第四區音叉接觸修正另逐 0.1 秒檢查小幅反向往返、至少四次換向、叉臂直段保持筆直、鋼材由右叉臂經薄層全程連接，柄與鋼材不相連；最慢空氣聲速亦需符合空間取樣要求。原五公里實時與前三區塊回歸保留。

2.2 第四區個別音叉可獨立敲擊：檢查水、空氣、鋼不同時刻開始、未敲組靜止、重敲不重設其他組、同步途中只重敲一組、獨立秒數、完成後再次敲擊、暫停／繼續及切回共同起跑；Enter、Space、手機觸控與兩種模式均涵蓋。

2.2 第四區右側精簡為到達時間：驗證只含標題與數字、沒有末端放大圖／粒子／狀態／連結線；尚未到達不預填秒數，實際到達時間與個別操作維持正確。相鄰粒子延遲改以主動畫取樣，兩種模式的七種寬度均在已到達狀態檢查數字不溢出。

2.2 第四區敲槌動作保留 0.6 秒：受控時鐘檢查前 0.5 秒可見、暫停保持、繼續後退開與隱藏；真實秒錶也量測敲槌隱藏時刻，並同時維持三種介質原本的首次到達時間。

2.2 音叉外觀改用固定幾何與快速反向微移：純函式量測每秒十六次換向與 1.5 圖形單位振幅上限；DOM 檢查叉臂 d 全程不變、只有水平 translate、鋼材接觸不中斷，並保留暫停／歸位、敲槌 0.6 秒及實際傳播秒錶。

## 4.2 未知樣本調查

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.2-investigation.test.cjs
```

新增末尾自由取樣活動，涵蓋同一批樣本的獨立取樣與任意測試順序、泥沙與溶解食鹽的分離、靜置／過濾／蒸發／淨稱量、觀察快照及筆記、證據與成分推論、相同取樣兩次稱量與選填百分濃度／ppm、原生鍵盤、滑鼠／真實觸控點擊與拖曳、取消與重設、庫存補充、背景暫停、載入失敗重試、減少動態，以及 320–1440 px 七種寬度的初始／展開版面。亦檢查側欄逐字對應正文標題、目前四個錨點跳轉／目前位置、獨立小測標頭及初始空杯不畫晶體。最新加入六種庫存、兩種動態偏好的逐時取樣守恆／水平液面／瓶口座標，以及實際 Canvas 照片與水流是否連接；共 21 組子測試，含外層 22 項。可檢視 `/tmp/investigation-*.png` 的當次截圖；核可與持久化證據存於 `docs/reviews/unit-4.2-investigation/`。

2026-10-28 與前面稱量、ppm、層析、蒸發四組依序執行，合計 74 項通過，0 失敗。未把本輪檢查當成整個第四單元的最終驗收。

導覽與小測標頭修訂後，完整五組 75 項通過；補上初始空杯不畫晶體的檢查及渲染修正後，小測最終 20 項通過。逐字核對五個主標題、每個錨點的實際跳轉與唯一高亮、小測獨立計數和標頭；桌面／手機對照見同目錄 review 最新章節。

取樣倒水修訂後，小測本輪 22 項通過：六種庫存／兩種動態偏好逐時驗證瓶內、杯內與飛行中液體的份量守恆，液體先到瓶口才出水，水流落到杯中才增加杯內份量。並攔截實際 Canvas 的照片座標變換與水流筆畫，驗證兩者確實連接；正常、手機減少動態與最後一份取樣的畫面另存同一 review。本輪未重跑前四組互動測試。

原第四方法配對區移除後，導航測試核對四個教學區、01–04 顯示編號、原配對控制不存在及獨立小測。層析／稱量的素材失敗檢查改為實際操作仍保留的蒸發控制，確認其他區仍可使用；最終五組完整回歸 **77 項通過、0 失敗**，詳見 review 最新章節。

## 5.2 第一區：三種環境的熱傳方向

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-5.2-direction.test.cjs
```

14 項（含外層）檢查杯內雙溫度計、初溫 60°C／10°C、每支 81 條共同校準的 0–80°C 刻度、液泡浸水與離底、液柱／即時讀值同步、5／25／70°C 三種場景、深銅路徑跨杯壁與實際流光移動方向、升降溫與淨熱傳方向、暫停／繼續／重來、播放中切換、近同溫漸弱與同溫移除、鍵盤、一般及減少動態下持續流動的真實畫面像素、320–1440px 七種寬度、真實手機觸控、其他區塊獨立運作及小測。`DIRECTION_LAB_URL` 可指定公開版本；未設定則自動啟停本機伺服器。`DIRECTION_CAPTURE_DIR` 可保存實際瀏覽器視窗截圖。核可圖及正式畫面見 `docs/reviews/unit-5.2-card01/`。

2.2 第五區整合空氣腔體與控溫：新增夾套／底座連接、探棒在同一氣體內、讀值窗於七種寬度對齊、與第四區相同音叉幾何、舊器材照片不再載入的檢查。聲速、鋼尺、空氣傳播、真空鐘罩四組合跑 65 項全部通過；結果及人工畫面核對見 `docs/reviews/unit-2.2-card05/review.md` 最新章節。

參考 5.1 的玻璃質感修訂：同組測試改用整合空玻璃管的新圖，確認不再有白底儀器面板，四個玻璃／水面前景圖與當前環境一致，並依新細管逐度校準。最終仍為 12 項通過；沒有以放寬刻度誤差替代精確座標。

2.2 第五區調溫即時套用：既有測試改為點擊當下立即讀到 0／20／30°C，組名／聲速／腔內探棒同步且連續切換後穩定，可直接敲擊開始實時計時。移除已撤下的升降溫插值純函式測試；四組完整回歸 64 項通過、0 失敗，見第五區 review 的 instant-temperature-tests.log。

2.2 第五區依核可示意加入雙向進度對照：實線為本組、虛線為另一組，以同一實時時鐘繪製。加熱改為80°C並採絕對溫度平方根聲速關係；檢查七種寬度的標記精確對齊、位置與秒數、標籤界限、暫停／重設、先到達／全部到達／同溫，以及分別起跑不作領先判斷。完整四組66項通過、0失敗，見第五區review的race-tests.log。

### 4.2 檢視清單前五項

```sh
node --test --test-concurrency=1 tests/unit-4.2-filtration.test.cjs tests/unit-4.2-investigation.test.cjs tests/unit-4.2-concentration.test.cjs tests/unit-4.2-ppm.test.cjs tests/unit-4.2-chromatography.test.cjs tests/unit-4.2.test.cjs
```

新增過濾／加熱全時段份量守恆、實際杯子照片與水柱筆畫位置、空皿不提前出現液體或固體、第一區完成保留／鍵盤重播、命名標記與流程編號、9 種寬度標籤不重疊、減少動態與素材重試。雲端 Chromium 的 2D Canvas 使用軟體繪圖以避免加速環境干擾；仍保留 WebGL 與所有畫面／互動斷言。導航等待 DOM 後明確等待各區就緒，HTTP server 的請求紀錄使用 ignore，避免未讀取的 pipe 堵塞。

2.2 第五區高度精簡：器材、探棒與重複讀值撤下，溫度output改放在組名旁，兩組同用緊湊腔體；只保留下方一條本組／參考組位置對照。既有檢查同步改為單一軌道與七種寬度的比例、標籤界限及組名讀值，完整四組66項通過，見第五區review的compact-tests.log。

2.2 第五區改成固定0°C與80°C兩組，沒有調溫控制。既有測試更新固定條件、無切換、重播／重設不變、同一時鐘的位置與到達時間、分別敲擊及兩區獨立；撤下舊切換專用檢查。完整四組65項通過、0失敗，見第五區review的fixed-tests.log。

## 2.1 第二區：三態圖解比較表

第四區固態總覽的表面順序另以 `CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-2.1-solid-overview.test.cjs` 檢查。由實際 SVG 座標核對 16–72 顆之間每步增減的下層完整、頂層連續、左右表面移除及既有粒子不跳位；另操作凝固、融化、昇華切換與取消，確認抵達才加入、切換延續數量及取消後 48 顆不受舊動畫影響。兩組子測試含外層共 3 項；`SOLID_OVERVIEW_CAPTURE_DIR` 可保存當次畫面。

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-2.1-states-table.test.cjs
```

測試自行啟停 Python 靜態伺服器與 Chromium。檢查阿公收尾對話與單一模型附註、九格圖解預設可見、固體外形、液體等量與體積格等寬／同水位比較、換容器後杯口與水面對齊、氣體體積格的100–300mL上下限、每次50mL增減與獨立壓縮、四個氣體模型持續運動、粒子數與連續邊界、移除暫停按鈕、前景運動與離區停止／返回續播、格內活塞的滑鼠／鍵盤／觸控、固體與液體可上拉、下壓到樣本表面即停止且樣本體積不變，氣體可壓縮、其他教學區塊保留、五種螢幕寬度及減少動畫設定。10 組子測試，連同外層共 11 項；`STATES_CAPTURE_DIR` 可指定截圖目錄。審閱紀錄見 `docs/reviews/unit-2.1-states-table/review.md`。

## 3.3 聲音的特性

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-3.3.test.cjs
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-3.3-fork.test.cjs
```

驗證七區模型與實際聲音緩衝訊號、琴弦／空氣柱、音色近似RMS匹配、無極端頻率測試音、自然結束、跨區停止、唯一綜合小測、與1.1的格式對照、捲動側欄標示，以及八種寬度的七區欄位／控制項邊界與手機錨點遮擋檢查。合計11項（含外層），測試自行啟停伺服器與Chromium；臨時畫面位於 `/tmp/unit33-review/`。核心內容與檢視紀錄見 `docs/decisions/unit-3.3-initial-production.md` 、`docs/reviews/unit-3.3-initial/review.md` 及 `docs/reviews/unit-3.3-format/review.md`。

## 2.3 新版第二區：空氣組成與分類

```sh
node --test tests/unit-2.3-composition.test.cjs tests/unit-2.3.test.cjs tests/unit-numbering.test.cjs
node --test tests/unit-2.3-model.test.cjs
```

第一組檢查本輪第二區全部資料預設可見、78／21／1份額、氬氣與其他1%的關係、永久／變動分類、可選成分突出、鍵盤／觸控、停用JavaScript、減少動態、320–1440px版面及路線錨點；並回歸既有杯子拖曳、保水、重設及全站編號連結。新版入口已完成六教學＋一小測；舊耗氧測量、乾濕切換及比例小測瀏覽器案例已隨被排除需求移出，杯子回歸案例保留並增加重設後固定比較仍可見的規則。第二組保留歷史氣體／杯子模型檢查，不代表新版六區或小測已完成。

`AIR_COMPOSITION_URL`可指定公開2.3頁面，公開Chromium透過繼承的HTTPS代理；`AIR_COMPOSITION_ARTIFACT_DIR`可指定畫面路徑。本輪證據見`docs/reviews/unit-2.3-composition/`，舊杯子回歸截圖預設存`/tmp/unit23-cup-regression`，避免覆寫歷史交付證據。

## 3.4 聲波反射與回聲

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.4-model.test.mjs tests/unit-3.4.test.cjs tests/unit-numbering.test.cjs
```

檢查六區與單一結尾小測、往返路程與空氣／水中聲速、反射動畫暫停／重來、跨區及背景停止、鍵盤／觸控、聲納深度與收合揭示、直接聲保留及反射減弱、離線合成語音解碼及音效停止、小測未完成／錯誤／正確／修改／重填，以及1440–320px版面與全站既有入口載入。截圖位於 `/tmp/k12-34-review`。這是第四階段初稿的功能檢查，不代表課程或完整第三單元已完成外部驗收；真實裝置上的聽感需另檢視。

## 2.3 六教學＋一小測完整初稿

```sh
AIR_COMPOSITION_ARTIFACT_DIR=/tmp/unit23-composition node --test --test-reporter=spec tests/unit-2.3-full.test.cjs tests/unit-2.3-composition.test.cjs tests/unit-2.3.test.cjs tests/unit-2.3-report.test.cjs tests/unit-2.3-model.test.cjs tests/unit-numbering.test.cjs
```

新增完整頁檢查：七個路線錨點、六區角色對話、第一區示例在操作前／重設後可見、兩種製氣重播／暫停／繼續／全覽、離區暫停與不自動恢復、氧氣／二氧化碳性質比較、唯一小測未答／錯誤／改答／正確／局部重設、320–1440px無溢出、停用JavaScript仍能閱讀全部教學證據、觸控及減少動態。另以純函式逐項驗證小測的概念判讀；歷史氣體模型僅作保留模組回歸，不是現行耗氧教學。

`AIR_FULL_URL`可指定公開2.3網址；`AIR_FULL_ARTIFACT_DIR`可指定完整頁畫面路徑。本輪畫面與輸出存`docs/reviews/unit-2.3-complete/`，既有第二區局部交付畫面保留。

## 2.3 第二區排列與放大圖優化

```sh
AIR_COMPOSITION_ARTIFACT_DIR=/tmp/unit23-explore AIR_FULL_ARTIFACT_DIR=/tmp/unit23-full node --test --test-reporter=spec tests/unit-2.3-composition.test.cjs tests/unit-2.3-full.test.cjs
```

第二區測試涵蓋看比例／看混合保留100格與78／21／1組成、兩種排列的四項選取、氬／其餘放大圖不同突出、切換保留選取、顯示全部保留排列、游標／鍵盤／觸控、減少動態、五種寬度與無JavaScript完整閱讀。`AIR_COMPOSITION_URL`可指定公開網址；新版預設截圖目錄為`docs/reviews/unit-2.3-composition-explore/`，公開檢查請另設暫存截圖目錄以保留本機證據。

2.3第二區另涵蓋主圖直接點選：比例／混合排列的綠／黃／斜紋格，與圖例、放大圖及說明同步；合併格同時標示氬／其餘。檢查原生按鈕不改氣體配色或混合位置、手機直接點格、單一Tab入口與依畫面位置的方向鍵操作。新版預設證據目錄為`docs/reviews/unit-2.3-composition-click/`。

## 3.4 第一區：依核可示意圖直接操作喇叭

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.4-model.test.mjs tests/unit-3.4.test.cjs tests/unit-3.4-reflection.test.cjs tests/unit-numbering.test.cjs
```

第一區專項10項（含主項）：直接點喇叭與下方按鈕、重播時取消舊排程、暫停／續播、三階段與接收提示、同一緩衝區的原音與較弱延遲副本、關音效、跨區／背景停止、Enter／Space與觸控、減少動態，以及六種寬度內容欄邊界。`REFLECTION_URL`可指定公開3.4網址（以`/`結尾），會使用繼承的HTTPS代理。畫面暫存於`/tmp/k12-34-s1-verified`，不覆寫歷史審閱圖片。


### 3.3第一區音叉專項

`tests/unit-3.3-fork.test.cjs`共8項（含外層）：同頻率／衰減與振幅比例、初始與紀錄狀態、真實音訊緩衝區、兩種敲擊的實際螢幕位移與兩叉股反向、單側振幅、停止／重設／自然結束、Enter／空白鍵、快速重敲及跨區／畫面外／分頁隱藏／pagehide停止、非同步取消／聲音失敗重試、減少動態偏好及七種尺寸。配合既有3.3回歸11項，共19項通過；畫面位於`/tmp/unit33-fork-review`，核可圖與實際結果見`docs/reviews/unit-3.3-card01-fork/review.md`。

3.4第一區音效補查：`tests/unit-3.4-reflection.test.cjs`量測最末增益後的真實Web Audio訊號，檢查頁面沒有音量滑桿、行動觸控啟音、失敗／逾時提示及webkit前綴相容入口；可用`REFLECTION_URL`指定公開頁。此檢查不代表已確認使用者裝置的實體喇叭或靜音設定。
### 3.3第一區逐步紀錄修訂

音叉專項新增音槌接觸後波形向右延伸、停止保留部分波形、重敲從左重畫、另一欄保留及重設清空。現行音叉使用連續向量叉股，位移由實際叉端螢幕座標核對。專項與整頁回歸合計20項通過（含外層）；見 docs/reviews/unit-3.3-card01-refinement/review.md。本輪尚未發布，不沿用舊公開版作為本次驗證。

## 2.3 第三／五區：氮氣與氬氣介紹版（歷史，已整合第二區）

```sh
CHROMIUM_PATH=/usr/bin/chromium GAS_PROFILE_ARTIFACT_DIR=/tmp/unit23-gas-profiles AIR_FULL_ARTIFACT_DIR=/tmp/unit23-gas-profiles-full node --test --test-concurrency=1 tests/unit-2.3-nitrogen.test.cjs tests/unit-2.3-argon.test.cjs tests/unit-2.3-full.test.cjs
```

使用者核可介紹方向並釐清須融合原單元格式後，03與05改為共用標頭／字體／配色及小葵阿公簡短引入，保留氣體介紹為主、生活用途小圖在下的靜態版面。兩個既有測試入口現在共用 `helpers/gas-profile.cjs`；各6項（含外層），檢查名稱／化學式、約數與乾燥基準、三項限定性質、用途層次與圖片實際解碼、舊重播不載入、七種寬度320–1440px、觸控導覽及無JavaScript；每種寬度另比對第二區共用標頭／字體／編號／背景／內距的實際computed style，並驗證原44px人物頭像。整頁另9項回歸原杯子、氧氣、二氧化碳、小測及導覽。`GAS_PROFILE_URL` 可讓兩入口共同指定公開頁，或分別使用 `NITROGEN_URL`／`ARGON_URL`；`GAS_PROFILE_ARTIFACT_DIR` 指定截圖目錄。最新格式融合證據見 `docs/reviews/unit-2.3-gas-integrated/`；前版海報式畫面留於 `docs/reviews/unit-2.3-gas-profiles/` 作歷程。

先前充氮包裝與焊接左右比較動畫已退出03／05主線；原腳本與模型檔保留歷史，不再由頁面載入。舊動畫測試結果不代表目前介紹版通過。

### 3.3第二區雙喇叭比較

`CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-3.3-pitch.test.cjs`：7項（含外層），檢查200～800Hz每100Hz步進、界限、相同振幅與波形週期、真實音訊、左右自由重播、點喇叭、鍵盤、波形與振膜同步、切區／離屏／隱藏停止及桌機／筆電對稱配置。`SOUND33_BASE_URL`可指定公開課程網址，瀏覽器使用繼承的HTTPS代理；截圖寫至/tmp/unit33-pitch-review。與既有整頁及第一區音叉合計27項通過，證據見docs/reviews/unit-3.3-card02-speakers/。

3.4第二區同步比較：`node --test tests/unit-3.4-distance-model.test.mjs tests/unit-3.4-distance.test.cjs`。涵蓋0.20秒近牆接收／遠牆到壁、共同尺度、兩組返回音最末訊號、鼠標／鍵盤／真實觸控拖牆、重播與暫停、同距重合、跨區／背景停止及1440–320px版面。以`DISTANCE_URL`指定公開網址，可重跑同一套UI檢查；測試需既有Playwright與Chromium。

### 3.3主喇叭振動回歸

第二區專項新增主喇叭實際畫面6幀差異、固定箱體位置／尺寸、與側面同相位、自然結束及調頻歸位，200Hz與800Hz均在減少動態偏好下驗證。現第二區8項、加整頁及第一區共28項通過（含外層），不再僅以側面放大窗或data-playing旗標判定主喇叭有振動。證據見docs/reviews/unit-3.3-card02-front-motion/。

### 3.3全寬卡片版型（2026-10-31）

依使用者最新要求，格式基準由1.1概念側欄改為2.1橫向標頭及全寬內容。整頁回歸直接載入2.1比對標頭、編號、字級、內距與圓角；逐區檢查七區內容寬度與上下排列。整頁、音叉及雙喇叭專項合計28項通過；證據在docs/reviews/unit-3.3-fullwidth-cards/。

### 2.1 六種物態變化的實拍照片對照

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-2.1-phase-life.test.cjs
```

現行為每組兩張固定實拍照片，取代 fea12ccb 的生活場景合成動畫。檢查1920×1080、1440×900、1366×768、1280×800、1024×768的六種切換，照片整區高度為完整粒子展示框的一半，照片在起始／中段／完成均維持相同像素；上方粒子仍轉換，蒸發保留24顆液態粒子。另驗六種重播、快速切換、離屏暫停與返回、12個四角入口、減少動態、分享連結、390px載入與來源頁。總覽粒子數依目前16–72顆計，非固定48顆；獨立六種示範維持48顆。

`PHASE_LIFE_CAPTURE_DIR`指定截圖及本次結果目錄，`PHASE_PHOTOS_URL`可指定以`/`結尾的公開頁面，透過繼承的HTTPS代理重跑同套檢查。照片來源與擷取記錄見`units/2/parts/2.1/assets/phase-life-assets.md`與同目錄JSON；本次畫面與結果見`docs/reviews/unit-2.1-phase-photos/`。原同步場景紀錄保留在`docs/reviews/unit-2.1-phase-life/`作歷史依據，非現行照片驗證。

### 3.3前兩區音量檢查

音叉及音調喇叭專項直接量測最終AudioBufferSource資料的峰值／RMS，確認提高音量且未削波，輕重比例及固定振幅仍成立。模型原始資料測試保留。整頁及兩專項28項通過；詳見docs/reviews/unit-3.3-intro-audio-gain/。measure.cjs另可用SOUND33_BASE_URL量測公開頁，並以第五區純音確認其他區輸出不變。

### 3.4第二區分別點喇叭（2026-10-31）

`CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.4-distance-model.test.mjs tests/unit-3.4-distance.test.cjs`：新增上／下方只播放所選組的波前、接收燈、返回路徑、計時及接收紀錄；未選組從播放中到完成都等待發聲。實際Web Audio最末輸出須只有原音與該組回波，並檢查上方不等待遠牆、暫停續播保留範圍、切換取消舊排程、主按鈕恢復同步、Enter／Space與手機兩組觸控。`DISTANCE_URL`可指定公開頁（以`/`結尾），截圖暫存於`/tmp/k12-34-distance-verified`；原同步、拖牆、同距及版面回歸仍保留。

## 2.3 第四區：氧氣製備與兩組木條同步比較

```sh
CHROMIUM_PATH=/usr/bin/chromium OXYGEN_ARTIFACT_DIR=/tmp/unit23-oxygen AIR_FULL_ARTIFACT_DIR=/tmp/unit23-full-oxygen node --test --test-concurrency=1 tests/unit-2.3-oxygen-model.test.mjs tests/unit-2.3-oxygen.test.cjs tests/unit-2.3-full.test.cjs tests/unit-2.3-report.test.cjs
```

驗證四步與裝置同步、先排空氣才排水集氣、實際SVG水位連續降低、水下蓋片、兩支木條同時移動與只有氧氣復燃、暫停凍結／繼續、快速重播、鍵盤、Escape、背景／離區停止、七種寬度兩瓶並列且不超出滿寬內容區、手機觸控、減少動態、無JS必要結果。整頁及小測模型回歸仍檢查六教學＋一小測、二氧化碳舊重播、第一區與單元導覽。`OXYGEN_URL` 可指定公開2.3頁面，`OXYGEN_ARTIFACT_DIR` 保存本次畫面（預設 `/tmp/unit23-oxygen`）。新測試的本機伺服器只服務展示站checkout。共24項（含外層）；教學動畫不是反應時間／產率實測，也不代表整單元外部驗收。

### 2.3 氧氣3D場景與動作銜接

```sh
CHROMIUM_PATH=/usr/bin/chromium OXYGEN_THREE_ARTIFACT_DIR=/tmp/unit23-oxygen-three node --test tests/unit-2.3-oxygen-three.test.cjs
```

新增8項（含外層）直接驗證WebGL：真正畫布初始化、導管連續位置、先移到瓶口再排水、氣泡／水面、先撤管才蓋片、同一時鐘的立體木條與火焰、暫停後畫布像素完全相同／恢復後改變、1024／390／320px尺寸，以及模擬無WebGL仍有可讀可操作的SVG。`OXYGEN_URL` 可指定公開頁面。軟體GPU截圖可能比動畫本身慢，測試先暫停瀏覽器時鐘，再受控推進及截圖，保留所有動作與像素斷言；不以機器執行時間冒充使用者裝置幀率。原有氧氣及整頁回歸繼續保留，氧氣集氣取樣在導管到位後才開始。

## 3.3 第二區正／側面切換

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.3-pitch.test.cjs tests/unit-3.3-fork.test.cjs tests/unit-3.3.test.cjs
```

第二區12項涵蓋共同視角、不中斷音訊／進度、±A端點連接同一膜緣點、生產renderer取樣200～800Hz的同幅及頻率比例、實際側面幀差、鍵盤／觸控與七種寬度；另保留聲音峰值／RMS、停止／調頻／跨區等檢查。三檔合計32項（含外層）。`SOUND33_BASE_URL`可將第二區12項指向完整公開網址；公開測試仍需Chromium與繼承的HTTPS proxy。截圖存至`/tmp/unit33-pitch-review/`，核可圖與交付證據在`docs/reviews/unit-3.3-speaker-view-switch/`。

## 2.3 第五區舊比較動畫（歷史）

舊氬氣氣流／表面差異模型及檢查紀錄保留於版本歷程與歷史review；目前第五區為上方「氮氣與氬氣介紹版」，`unit-2.3-argon.test.cjs` 已改驗新版，舊模型測試不能作新版版面驗證。

## 3.3 第三區木吉他

```sh
node tests/unit-3.3-guitar-model.test.cjs
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.3-guitar.test.cjs tests/unit-3.3-fork.test.cjs tests/unit-3.3-pitch.test.cjs tests/unit-3.3.test.cjs
```

模型直接執行4項、瀏覽器整合43項，共47項（含外層）。吉他專項11項涵蓋實際拖曳／鍵盤／觸控、點品格、一次只改長短或張力、110／220Hz實際播放資料、音量與衰減、左右弦實際畫面幀差、固定兩端／琴身／非有效弦段、取消／重設／離場、失敗重試及兩模式七種寬度。手機第一次點弦以pointerup觸發，並驗證相容click不會再起音一次。`SOUND33_BASE_URL`可指向公開完整頁；`GUITAR_CAPTURE_DIR`指定畫面資料夾，預設`/tmp/unit33-guitar-review`。核可圖與實際畫面見`docs/reviews/unit-3.3-guitar/`。



## 3.3 第四區排笛自由吹奏

```sh
node tests/unit-3.3-pan-model.test.cjs
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.3-pan.test.cjs tests/unit-3.3-fork.test.cjs tests/unit-3.3-pitch.test.cjs tests/unit-3.3-guitar.test.cjs tests/unit-3.3.test.cjs
```

排笛專項10項，整合53項、直接模型3項，共56項（含外層）。驗證六管頻率與實際AudioBuffer、音量、重聽／換管、切換不中斷、粒子封底不動與歸位、實際幀差、長度端點、取消／失敗重試、鍵盤／真實觸控及兩視角七種寬度。`SOUND33_BASE_URL`可指定公開頁，`PAN_CAPTURE_DIR`指定截圖目錄，預設/tmp/unit33-pan-review。核可圖、素材與本機證據見docs/reviews/unit-3.3-pan-flute/。

## 3.4 第三區：可編輯時間與四段推導

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.4-calculation-model.test.mjs tests/unit-3.4-calculation.test.cjs
```

檢查預設4秒、0.1–60秒與小數輸入、未完成／超界數字的處理、每段數值連動、四步推導及不提前揭示單程答案；量測真實4秒返回與最末音訊強度、同緩衝區原音和較弱回波、雙發聲入口、暫停續播、取消舊排程、跨區／背景停止、Enter／Space、真實觸控與減少動態。另驗1440–320px三種數字長度的版面、標示及44px熱區，保留既有標題和角色對話。`CALCULATION_URL`可指定以`/`結尾的公開頁，`CALCULATION_CAPTURE_DIR`可指定證據目錄，預設`/tmp/k12-34-calculation-verified`。公開檢查透過繼承HTTPS代理；音訊量測不取代使用者裝置實體聽感。

## 2.3 第二區整合氣體知識與實驗重編（2026-10-31）

```sh
CHROMIUM_PATH=/usr/bin/chromium GAS_PROFILE_ARTIFACT_DIR=/tmp/unit23-knowledge AIR_COMPOSITION_ARTIFACT_DIR=/tmp/unit23-knowledge-composition AIR_FULL_ARTIFACT_DIR=/tmp/unit23-knowledge-full node --test --test-concurrency=1 tests/unit-2.3-nitrogen.test.cjs tests/unit-2.3-argon.test.cjs tests/unit-2.3-oxygen-profile.test.cjs tests/unit-2.3-composition.test.cjs tests/unit-2.3-full.test.cjs tests/unit-2.3-report.test.cjs
CHROMIUM_PATH=/usr/bin/chromium OXYGEN_ARTIFACT_DIR=/tmp/unit23-knowledge-oxygen OXYGEN_THREE_ARTIFACT_DIR=/tmp/unit23-knowledge-three AIR_ARTIFACT_DIR=/tmp/unit23-knowledge-cup node --test --test-concurrency=1 tests/unit-2.3-oxygen-model.test.mjs tests/unit-2.3-oxygen.test.cjs tests/unit-2.3-oxygen-three.test.cjs tests/unit-2.3.test.cjs
```

前三個入口共用 `helpers/gas-profile.cjs`，現驗證第二區內的氮／氬／氧介紹，不再驗獨立03／05。檢查預設氮氣、原生點選／鍵盤／觸控切換、滑過不換內容、換排列與點空白保留閱讀、斜紋格先明確拆分、其餘不等同二氧化碳、三種科學措辭與用途照片實際解碼、七種寬度與無JS三份完整資料。`GAS_PROFILE_URL` 指定共同公開頁，`GAS_PROFILE_ARTIFACT_DIR`指定截圖位置；組成與整頁可另以 `AIR_COMPOSITION_URL`／`AIR_FULL_URL` 指向公開頁。

整頁現驗證四教學＋一小測、五個有效導覽、兩實驗及杯子／小測回歸；小測模型逐項核對新回看位置。第二組另驗氧氣3D／SVG後備、暫停／繼續、無JS、木條共用時鐘、窄欄並列及杯子真實滑鼠／觸控拖曳保水。未復用舊編號通過紀錄。證據見 `docs/reviews/unit-2.3-composition-knowledge/`。


### 第四區實錄音檔更新

現行第四區使用CC BY 4.0的mrshoes封底PVC排管實錄，六管WAV由來源錄音剪取調音。相同指令的排笛專項現11項，整合54項、直接模型／WAV3項共57項（含外層）。以實際播放Buffer自相關檢查音高、PCM與雜湊確認實錄音檔；另測載入後取消不會起音、503失敗後重試成功。來源授權與重製程式見docs/reviews/unit-3.3-pan-recordings/及scripts/prepare-pan-recordings.py。

### 2.3 第二區知識卡緊湊版與材質圖示（2026-10-31）

沿用第二區整合的三氣體＋組成圖與完整頁檢查；生命用途圖片選取改為 `.gas-profile-example figure img`，另核對每張卡三幅裝飾圖示實際解碼、256×256及空alt，避免把圖示誤算為用途照片。`GAS_PROFILE_ARTIFACT_DIR=/tmp/unit23-gas-detail`、`AIR_COMPOSITION_ARTIFACT_DIR=/tmp/unit23-gas-detail/composition` 與 `AIR_FULL_ARTIFACT_DIR=/tmp/unit23-gas-detail-full` 保存本輪畫面。範圍為知識卡排版與素材，未修改實驗／模型；保留先前回歸紀錄，不重跑無關模型。

前後尺寸與畫面另存 `docs/reviews/unit-2.3-gas-detail/`，不是以主觀敘述宣稱留白改善：同寬卡片桌面約減28.4%、手機約減22.0%，文字內容逐項核對相同。

## 3.3 第五區：實際音訊與波形

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.3-timbre.test.cjs tests/unit-3.3.test.cjs
```

共19項（含外層），包含音源授權／雜湊／PCM與餘裕、三列無自動播放、瀏覽器實際AudioBuffer逐值等於公開WAV、所有繪圖頂點與播放取樣逐點相符、440Hz基頻及RMS、連續獨立重播／鍵盤／觸控、自然結束／離開／隱藏停止、下載慢時取消不誤起音、下載失敗不補假波形且可重試，並回歸整頁與小測。桌機／筆電／手機八種寬度保留對齊的時間軸及可用控制。SOUND33_BASE_URL可指定公開完整頁URL（以/結尾），TIMBRE_CAPTURE_DIR指定截圖目錄。


第五區圖片點播補充：相同兩檔指令現20項通過（含外層）。新增三張圖片與側邊播放鍵的實際PCM相等、重播取消舊聲源、兩入口狀態同步、圖片鍵盤操作及手機圖片觸控只起音一次。


第五區亮點補充：專項現10項，整頁11項，合計21項（含外層）。以SVG path真實幾何核對亮點位置貼線、與AudioContext進度一致、左右／上下移動、僅一列顯示及播放後清除／重播回左；不以複製製作端公式取代檢查。

## 現行2.3第三區氧氣近景精修（2026-10-31）

```sh
CHROMIUM_PATH=/usr/bin/chromium AIR_FULL_ARTIFACT_DIR=/tmp/unit23-refined-full OXYGEN_ARTIFACT_DIR=/tmp/unit23-refined OXYGEN_THREE_ARTIFACT_DIR=/tmp/unit23-refined-material node --test --test-concurrency=1 tests/unit-2.3-oxygen-model.test.mjs tests/unit-2.3-oxygen.test.cjs tests/unit-2.3-oxygen-three.test.cjs tests/unit-2.3-full.test.cjs tests/unit-2.3-report.test.cjs
```

現行以材質圖片＋即時SVG取代舊WebGL；沿用 `oxygen-three.test.cjs` 測試入口，但內容改查實際現行渲染，沒有宣稱測試舊3D。共31項（含外層），檢查排氣瓶外、水滿初態、導管連續移動且到位才排水、氣泡不越過水面、先撤管後蓋片、暫停像素一致、兩支木條同步、火焰錨定尖端與狀態圖說、四步／下方無步驟、原頭像、七種寬度、手機同步放大、鍵盤／觸控、背景／離場、快速重播、減少動態、無JS及整頁／小測回歸。`OXYGEN_URL` 與 `AIR_FULL_URL` 可指向公開版本；截圖只反映實際測試瀏覽器，不保證各裝置固定幀率。

## 3.4 第四區：自由選點主動聲納測深

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.4-sonar-model.test.mjs tests/unit-3.4-sonar-profile.test.mjs tests/unit-3.4-sonar.test.cjs
```

共18項（含外層）：固定起伏地形與1,500m/s、2／4／6秒模型；發聲才建立A、B、C…（Z後AA）且收到回波才填值；滑鼠／真實手機觸控拖船、按鈕及鍵盤、測量期間鎖船、舊標記不隨船移動、圖表逐筆對應、獨立暫停續播、清除取消與重新編號、跨區／背景停止、啟音失敗重試，以及1440–320px七種寬度。真實4秒與Web Audio最末輸出量測不凍結時鐘；返回副本較弱，暫停後SVG像素保持不變。手機拖曳後第一次觸控發聲須只新增一筆。

測試自行啟停Python與Chromium。`SONAR_URL`可指定以`/`結尾的公開課程入口（可帶版本查詢參數）；公開瀏覽器沿用HTTPS代理。`SONAR_CAPTURE_DIR`指定截圖目錄，預設`/tmp/k12-34-sonar`。本機完整回歸沿用本課第一至三區與整頁指令，不把操作通過視為整單元外部驗收。舊深度滑桿／收合答案／八倍聲納檢查由本專項與整頁新聲納案例取代。

## 3.3 第六區：持續純音頻率探索

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.3-hearing.test.cjs tests/unit-3.3-timbre.test.cjs tests/unit-3.3.test.cjs tests/unit-3.3-fork.test.cjs tests/unit-3.3-pitch.test.cjs tests/unit-3.3-guitar.test.cjs tests/unit-3.3-pan.test.cjs
```

第六區專項以瀏覽器OfflineAudioContext實際render驗證20／80／1000／8000／16000／20000Hz、低增益與頭尾餘裕、35ms調頻後的2000Hz及起音10ms就停止；實際頁面攔截OscillatorNode確認持續播放超過短音長度、調頻沿用同一個節點、頻率數值、暫停／重播／跨區取消。另含真實滑鼠拖曳與邊界、鍵盤、端點改寫／防反向／重設、待resume取消與失敗重試、知識文字、八種寬度，以及真實手機touch拖曳後立即暫停、紀錄／重設／點喇叭且每次起音一次。HEARING_CAPTURE_DIR指定截圖目錄，SOUND33_BASE_URL可指向公開頁（以/結尾）。

本輪上述整合75項通過（含外層），0失敗／略過；第六區單獨11項。實際音訊驗證只確認數位訊號，不冒稱驗證喇叭的聲壓輸出或學生聽覺。


第六區取消補充：hearing專項現12項，搭配整頁共23項（含外層）。新增兩端獨立取消、另一端／頻率／連續播放保留、可重新記錄、鍵盤及真實手機取消不重複觸發；未重跑無關音訊模型。

3.4聲納場景精修另驗證生成岩層WebP實際解碼、裁切於模型邊界，以及中間船位的海床／測點／距離一致；`sonar-scene.mjs`只管理獨立場景繪製。

第六區比較插圖補充：既有hearing專項補充檢查三張SVG圖片及原PNG解碼、五種展開寬度，保存hearing-animals-1440.png／390.png。專項仍12項，與整頁合計23項（含外層）；插圖取景經實際畫面檢視，保留頻率資料與收合行為。

3.4聲納最新地形依史密森尼／NOAA查核改為大陸棚、坡、平原、海山與海溝的組合示意；`sonar-terrain.mjs`統一投影，範圍約150–8,250m、往返0.2–11秒。新增淺棚與深溝的實時操作回歸，原2／4／6秒代表條件保留。

## 2.3第三區氧氣：四步驟帶動內容（2026-10-31）

```sh
CHROMIUM_PATH=/usr/bin/chromium OXYGEN_ARTIFACT_DIR=/tmp/unit23-steps OXYGEN_THREE_ARTIFACT_DIR=/tmp/unit23-steps-material AIR_FULL_ARTIFACT_DIR=/tmp/unit23-steps-full node --test --test-concurrency=1 tests/unit-2.3-oxygen-model.test.mjs tests/unit-2.3-oxygen.test.cjs tests/unit-2.3-oxygen-three.test.cjs tests/unit-2.3-full.test.cjs tests/unit-2.3-report.test.cjs
```

現行上方改為四步獨立時鐘／內容，取代自動連播全程。共34項（含外層）：模型3、步驟與木條11、材質場景7、整頁9、小測模型4。驗證初始只呈現材料、每步圖／操作／原理一起切換、播完不自動前進、前後／直接選步重建初態、正確焦點與鍵盤、選取頁籤hover對比、單一重播／暫停／繼續、快速切換、背景／離區、第四步接木條、七寬度×四狀態、手機觸控／減少動態、無JS四步可讀、瓶外排氣滿水、氣泡只在液體中、導管到位才排水、撤管後才蓋片、暫停實際像素一致及原木條／整頁回歸。

公開驗證可設 `OXYGEN_URL`／`AIR_FULL_URL`；`oxygen-three.test.cjs`仍是沿用入口，實際測試材質底圖＋SVG，不宣稱舊WebGL檢查。核可四格圖、各步桌機／手機及保存範圍見 `docs/reviews/unit-2.3-oxygen-steps/`。

3.4聲納累積橘線：新增sonar-profile純資料測試，驗證未完成點排除、左右排序、重複位置最新值、原紀錄不變與加密後描出海山；瀏覽器驗證實際SVG頂點、原A/B/C表格順序、單點不畫線、重測與清除。

## 2.3氧氣新增第二步：組裝與開始產氣（2026-10-31）

```sh
CHROMIUM_PATH=/usr/bin/chromium OXYGEN_ARTIFACT_DIR=/tmp/unit23-assembly OXYGEN_THREE_ARTIFACT_DIR=/tmp/unit23-assembly-material AIR_FULL_ARTIFACT_DIR=/tmp/unit23-assembly-full node --test --test-concurrency=1 tests/unit-2.3-oxygen-model.test.mjs tests/unit-2.3-oxygen.test.cjs tests/unit-2.3-oxygen-three.test.cjs tests/unit-2.3-full.test.cjs tests/unit-2.3-report.test.cjs
```

現行為五步。共36項（含外層）：模型4、步驟／木條11、材質場景8、整頁9、小測模型4。新增檢查空瓶→雙氧水→加入催化劑→塞好送氣的實際可見狀態、同步內容標籤／四條操作說明、加入材料時未封口、催化劑接觸後反應、封口後才有導管氣流、集氣瓶仍滿水、重播重建空瓶、暫停像素一致；原七寬度與手機觸控／鍵盤／無JS／減少動態回歸更新為五步，其他實驗與小測維持。

素材、各段桌機／手機影格及保存範圍見 `docs/reviews/unit-2.3-oxygen-assembly/`。沿用 `OXYGEN_URL`／`AIR_FULL_URL` 可驗證公開頁；`oxygen-three.test.cjs`測試的是現行材質圖＋SVG，不是歷史WebGL。
## 3.4 第四區：點船發聲與拖曳區分

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-3.4-sonar-ship.test.cjs
```

專項6項（含外層），驗證滑鼠點船一次原音／一次返回／一筆紀錄、拖曳及拖回原位不發聲、小抖動不改船位、Enter／Space與方向鍵分工、下方按鈕保留，以及真實手機觸控去重、忙碌／取消觸控與拖船後再點船。可用`SONAR_URL`指向公開完整課程入口（以/結尾，可帶版本查詢參數），沿用HTTPS代理。原聲納13項瀏覽器回歸另跑，清楚區分本機及公開結果。

## 3.3 第七區：靜態生活聲級比較

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.3.test.cjs tests/unit-3.3-hearing.test.cjs
```

23項通過（含外層），0失敗／略過。整頁檢查改驗證第七區三個OSHA參考值20／60／100、三幅插圖實際解碼、無操作控制或發聲、兩則知識與來源；八種寬度核對共同刻度標記與讀值位置、圖卡不溢出，DECIBEL_CAPTURE_DIR保存1440／1024／390px完整畫面。整頁SOUND33_BASE_URL可指向公開頁，瀏覽器沿用代理並略過本機格式比較頁。無需新增測試依賴。

## 2.3第三／四區集氣，第五區性質比較（2026-10-31）

```sh
CHROMIUM_PATH=/usr/bin/chromium GAS_PROPERTIES_ARTIFACT_DIR=/tmp/unit23-properties OXYGEN_ARTIFACT_DIR=/tmp/unit23-properties-oxygen OXYGEN_THREE_ARTIFACT_DIR=/tmp/unit23-properties-material AIR_FULL_ARTIFACT_DIR=/tmp/unit23-properties-full GAS_PROFILE_ARTIFACT_DIR=/tmp/unit23-properties-knowledge node --test --test-concurrency=1 tests/unit-2.3-properties.test.cjs tests/unit-2.3-oxygen-model.test.mjs tests/unit-2.3-oxygen.test.cjs tests/unit-2.3-oxygen-three.test.cjs tests/unit-2.3-full.test.cjs tests/unit-2.3-report.test.cjs tests/unit-2.3-nitrogen.test.cjs tests/unit-2.3-argon.test.cjs tests/unit-2.3-oxygen-profile.test.cjs
```

共67項（含外層）：新增properties10、氧氣模型4、五步／木條11、材質場景8、整頁9、小測模型4、三種知識卡各7。新增檢查六區無重複ID、03／04只有製備收集、05集中兩種氣體與石灰水、來源／下一區／小測回看、同餘燼同步深度／時間、氧氣復燃／二氧化碳漸暗未復燃、暫停實際像素、跨播放器互相暫停、快速重播、鍵盤／背景／離區、七寬度兩瓶並列、觸控／減少動態／無JS及唯一小測。原杯子專項僅更新六區導覽預期，未重跑拖曳／保水全套；整頁已檢查杯子預設比較與重設，源碼保存證據見本輪review。

`GAS_PROPERTIES_URL` 可指定公開2.3頁面，`GAS_PROPERTIES_ARTIFACT_DIR` 保存新區截圖；其餘URL／截圖變數沿用各測試。證據見 `docs/reviews/unit-2.3-properties-block/`。原第五區小測現在為第六區，舊#s5為性質比較。

## 2.3準備材料：物品本體與名稱點選介紹（2026-10-31）

```sh
CHROMIUM_PATH=/usr/bin/chromium OXYGEN_MATERIALS_ARTIFACT_DIR=/tmp/unit23-material-exploration node --test --test-concurrency=1 tests/unit-2.3-materials.test.cjs tests/unit-2.3-oxygen.test.cjs tests/unit-2.3-oxygen-three.test.cjs tests/unit-2.3-full.test.cjs tests/unit-2.3-properties.test.cjs
```

本機48項全通過、零失敗／略過（含外層）：材料介紹10、五步／木條11、材質場景8、整頁9、性質比較10。材料專項驗證七個原生控制、照片本體座標實際命中、標籤／Enter／空白、兩段介紹與ARIA連結、點選停止可選導覽並保留選擇、離開後返回、七寬度最小44px目標／不溢出、真實觸控／減少動態、氧氣來源與催化劑／排氣／水下蓋片界線及無JS完整可讀。專項不取代其他教材的拖曳或氣體知識卡完整測試。

`OXYGEN_MATERIALS_URL` 可指定公開完整網址，`OXYGEN_MATERIALS_ARTIFACT_DIR`保存七項在1440／390／320px的畫面。其餘URL沿用各測試；公開頁材料＋氧氣＋整頁可跑30項。紀錄見 `docs/reviews/unit-2.3-material-exploration/`。


## 2.3 第四區：二氧化碳五步製備與收集

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-2.3-co2-model.test.mjs tests/unit-2.3-co2.test.cjs
```

17項（含外層）：六材料本體／標籤點選與持續介紹、組裝放石塊／倒酸／封塞、瓶外排氣、導管由瓶口上方移至底部、撤管先於蓋片及標示、獨立時鐘／暫停像素／快速切步、鍵盤焦點、跨實驗互停、七種寬度、共用SVG近景、觸控與減少動態、無JS。`CO2_URL`指定公開完整2.3頁（以/結尾）；`CO2_ARTIFACT_DIR`指定當次截圖位置，預設/tmp/unit23-co2。科學及製作紀錄見docs/reviews/unit-2.3-co2-steps/。第三區及第五區沿用各自專項；歷史四步重播已由五步取代，不代表整份歷史測試均已重跑。

## 3.3 第七區：十二場景授權錄音

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.3-decibel-audio.test.cjs tests/unit-3.3-decibel.test.cjs tests/unit-3.3.test.cjs
```

音效專項需要系統 `ffmpeg`，獨立量測新版十二成品 LUFS、真峰值與 -23 LUFS 共同基準，確認分段響度遞增及書房至施工至少26.5 LU差距、峰值處理無自動補償增益，核對來源及成品雜湊／衍生授權。瀏覽器將實際播放 AudioBuffer 與選定 WAV 經相同 AudioContext 解碼的全部 PCM 逐值比較，避免只依畫面標籤宣稱聲音正確。涵蓋圖片沒有播放按鈕且點擊／觸控不會起音、唯一播放鍵於載入／播放中停用與顯示狀態、停止後恢復並可重播、鍵盤／手機操作、連續跨過兩個完整錄音時長仍播放且使用同一音源、手動停止、播放中換場景、停止後切換不自動起音、慢下載取消／快速切換／503 重試、隱藏與離區／其他區及小測音源互斥、320–1440px 六種寬度。`SOUND33_BASE_URL` 可指向以 `/` 結尾的公開頁（故障注入也走該頁的本地音檔請求）；`DECIBEL_AUDIO_CAPTURE_DIR` 指定截圖目錄。

前六區全套回歸沿用各專項及 `unit-3.3.test.cjs`，不把數位響度或操作檢查當作真實 dBA 重現／主觀聽感校準。來源差異、授權與重製方法見 `docs/reviews/unit-3.3-decibel-audio/source/`；成品及授權清單在 `assets/decibel-audio/`。

## 2.3氧氣移除重複說明、以圖中標示引導（2026-11-01）

沿用材料、氧氣步驟、材質／物理與二氧化碳四套瀏覽器檢查共42項（含外層）。氧氣原步驟檢查改驗證標題下的科學引導及無JS可讀，物理檢查增加標示跟隨移管／水位、最後指向水下蓋片，暫停像素同時包含標示。圖片採原SVG與手機近景共用物件。最終隱藏重複可見狀態後另重跑氧氣11項；紀錄見docs/reviews/unit-2.3-oxygen-observation/。公開可設OXYGEN_URL與OXYGEN_MATERIALS_URL跑材料10＋步驟11＋物理8，共29項。

## 2.3氧氣右側直列操作流程（2026-11-01）

```sh
node tests/unit-2.3-oxygen-model.test.mjs
CHROMIUM_PATH=/usr/bin/chromium OXYGEN_ARTIFACT_DIR=/tmp/unit23-operations OXYGEN_THREE_ARTIFACT_DIR=/tmp/unit23-operations-physics OXYGEN_MATERIALS_ARTIFACT_DIR=/tmp/unit23-operations-materials AIR_FULL_ARTIFACT_DIR=/tmp/unit23-operations-full CO2_ARTIFACT_DIR=/tmp/unit23-operations-co2 GAS_PROPERTIES_ARTIFACT_DIR=/tmp/unit23-operations-properties node --test --test-concurrency=1 tests/unit-2.3-materials.test.cjs tests/unit-2.3-oxygen.test.cjs tests/unit-2.3-oxygen-three.test.cjs tests/unit-2.3-full.test.cjs tests/unit-2.3-co2.test.cjs tests/unit-2.3-properties.test.cjs
```

瀏覽器61項（材料10、操作11、物理8、整頁9、二氧化碳13、性質10，含各外層）及模型5項通過。新版驗證單層直列、八個有目的的操作窗口、圖內媒體控制與材料頁無播放、下一項具名文字、手機展開／收合與隱藏焦點、上下鍵／Home／End、各項正確前提、暫停像素、原素材解碼／唯一ID、七寬度×八操作、觸控／減少動態／無JS、跨播放器、第五區與唯一小測。

公開核心可設OXYGEN_URL、OXYGEN_MATERIALS_URL與AIR_FULL_URL，跑材料10＋操作11＋物理8＋整頁9，共38項。原第五區／二氧化碳整合檢查改由選擇氧氣操作啟動播放器，材料頁不再有可選導覽。未變更的第二區知識卡與杯子完整拖曳專項未重跑。新證據見docs/reviews/unit-2.3-oxygen-operations/。

## 2.3後續操作的器材點選介紹（2026-11-01）

```sh
CHROMIUM_PATH=/usr/bin/chromium OXYGEN_EQUIPMENT_ARTIFACT_DIR=/tmp/unit23-equipment node --test --test-concurrency=1 tests/unit-2.3-equipment.test.cjs tests/unit-2.3-materials.test.cjs tests/unit-2.3-oxygen.test.cjs tests/unit-2.3-oxygen-three.test.cjs tests/unit-2.3-full.test.cjs tests/unit-2.3-co2.test.cjs tests/unit-2.3-properties.test.cjs
```

器材專項9項（含外層）：直接以原圖座標點七操作×五種核心器材，另點移動的試藥瓶／藥匙／粉末／玻璃片；核對基本介紹與各步角色、隱藏目標不互動、暫停／手動續播、Enter／空白／Escape及模態焦點、七種寬度與近景點選、真實觸控／減少動態及無JS回看第一步。與原六套瀏覽器61項合計70項，模型未變更而未重跑模型專項。各套截圖目錄請以原環境變數指到/tmp，避免覆寫歷史證據。

公開新專項可用OXYGEN_EQUIPMENT_URL指定網址；搭配OXYGEN_URL、AIR_FULL_URL跑器材9＋操作11＋物理8＋整頁9，共37項。新證據見docs/reviews/unit-2.3-oxygen-equipment/。

## 2.3第一步材料改為同款視窗（2026-11-01）

```sh
CHROMIUM_PATH=/usr/bin/chromium OXYGEN_MATERIALS_ARTIFACT_DIR=/tmp/unit23-material-dialog OXYGEN_EQUIPMENT_ARTIFACT_DIR=/tmp/unit23-material-dialog-equipment OXYGEN_ARTIFACT_DIR=/tmp/unit23-material-dialog-operations OXYGEN_THREE_ARTIFACT_DIR=/tmp/unit23-material-dialog-physics AIR_FULL_ARTIFACT_DIR=/tmp/unit23-material-dialog-full node --test --test-concurrency=1 tests/unit-2.3-materials.test.cjs tests/unit-2.3-equipment.test.cjs tests/unit-2.3-oxygen.test.cjs tests/unit-2.3-oxygen-three.test.cjs tests/unit-2.3-full.test.cjs
```

本機47項（材料10、器材9、操作11、物理8、整頁9，含外層）通過。材料專項改驗證七件原圖／名稱開共用視窗、定義與用途逐字保留、無常駐資訊、首次不自動開啟、反覆點同物品、Enter／空白／Escape、同步aria-expanded與回焦點、保留選擇但返回不重開、七寬度44px與模態不溢出、真實觸控及無JS原文可讀。其餘專項配合第一步開視窗後先關閉再切步，後七項點選與原物理／小測回歸。

公開可設OXYGEN_MATERIALS_URL、OXYGEN_EQUIPMENT_URL、OXYGEN_URL、AIR_FULL_URL，跑材料10＋器材9＋操作11＋整頁9，共39項。證據見docs/reviews/unit-2.3-material-dialog/。模型、CO2與性質模組未改，未在本輪重跑它們的專用套件。


## 3.4 第五區：生活中的反射波前（2026-11-01）

原第五／六區合併，五教學＋一小測。執行：

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.4-room-model.test.mjs tests/unit-3.4-room-audio.test.mjs tests/unit-3.4-room.test.cjs
```

3項波前模型、2項音訊、13項瀏覽器（含主項）。涵蓋圓形擴散、近遠返回、只改指定表面反射、音檔直接聲相同／非靜音／不削波、拍手與語音、暫停續播offset、材料保留同一畫面並取消音源、完成後定格比較、跨區／背景停止、九種寬度、真實手機觸控、啟音延遲及失敗重試。`ROOM_CAPTURE_DIR`指定截圖目錄，`ROOM_URL`可指定公開頁URL（可含版本query，勿帶hash）。不代表Safari實機或真人聽辨已驗證。

## 2.3氧氣可選連續播放（2026-11-01）

```sh
CHROMIUM_PATH=/usr/bin/chromium OXYGEN_CONTINUOUS_ARTIFACT_DIR=/tmp/unit23-continuous node --test tests/unit-2.3-continuous.test.cjs
```

連播專項10項（含外層）：預設關閉、材料起播、完整七操作與完成影格停留、從目前進度切入、右側／圖內共用暫停及接續、操作間停留暫停、手動選步取消連播、器材視窗保持暫停、Escape／背景／離區／其他播放器、七寬度、原生鍵盤、真實觸控、減少動態及無JS。暫停時比對實際場景像素；全程核對催化劑／封口／蓋片前提，最後停在第三區封存畫面。

本輪與材料10、器材9、操作11、物理8、整頁9、CO2 13、性質10合計80項瀏覽器檢查；各套截圖路徑須以原環境變數指向/tmp，避免覆寫歷史證據。模型未改，不另重跑純模型套件。公開核心可用OXYGEN_CONTINUOUS_URL、OXYGEN_URL、OXYGEN_EQUIPMENT_URL、AIR_FULL_URL指定同一頁面，連播10＋操作11＋器材9＋整頁9，共39項。證據見docs/reviews/unit-2.3-oxygen-continuous-controls/。

## 3.3 單元小測：把聲音調出來（2026-11-01）

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.3-sound-match-model.test.cjs tests/unit-3.3-sound-match.test.cjs tests/unit-3.3.test.cjs
```

模型 4 項、小測瀏覽器 14 項（含主項）、整頁 11 項（含主項），共 29 項。涵蓋實際播放 PCM 逐點對照波形、45組獨立題目與固定檔位、換波形／加減頻率／加減振幅及兩端停用、兩聲試聽與取消、揭示／修改／隨時換題／繼續調整、鍵盤與真實觸控、八種寬度與筆電核心工具同屏、延遲啟音取消、素材失敗重試。`SOUND33_BASE_URL` 可指定公開頁（勿含 hash），`MATCH_CAPTURE_DIR` 指定畫面目錄；公開模式不注入素材故障，其餘操作照常執行。音色、喇叭、分貝音效及聽覺探索另有專項回歸。

3.3現行已取代四題結算，改為每題獨立、隨時換題。模型檢查45種組合及135次跨循環不連續重複；瀏覽器涵蓋未試聽／調整／播放／比較後換題，連續七題沒有結算，舊resume及慢載音檔不遲到播放，換題清除回饋與聽題資格且無自動播放。手機真實觸控連續六次換題。其餘操作盤點仍待逐項核可。

## 2.3 字卡閱讀與淡入淡出（2026-11-01）

```sh
CHROMIUM_PATH=/usr/bin/chromium OXYGEN_CAPTIONS_ARTIFACT_DIR=/tmp/unit23-captions node --test tests/unit-2.3-captions.test.cjs
```

新專項10項（含外層）：以原生Animation檢查閱讀停留與中途透明度、快速句合併、連播同張字卡、淡出／淡入暫停、器材介紹後不自行續播、取消舊回呼、完成／重播、背景與其他播放器、桌機與窄欄、減少動態及無JS。搭配原材料10、器材9、操作11、連播10、物理8，共58項本機瀏覽器檢查；所有截圖環境變數指向/tmp以保存舊證據。公開可設OXYGEN_CAPTIONS_URL、OXYGEN_EQUIPMENT_URL、OXYGEN_URL、OXYGEN_CONTINUOUS_URL跑字卡10＋器材9＋操作11＋連播10，共40項。證據見docs/reviews/unit-2.3-oxygen-caption-fade/。

## 3.4 井深小測（2026-11-01）

```sh
node tests/unit-3.4-well-model.test.mjs
CHROMIUM_PATH=/usr/bin/chromium node tests/unit-3.4-well.test.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/unit-3.4.test.cjs
```

3項模型／短喊聲PCM、11項井深瀏覽器（含外層）。涵蓋原音與較弱回聲共用AudioBuffer、實際排程延遲與畫面起始紀錄、非靜音／不削波、未探測與答案各狀態、所有核對結果只提供提醒，永不展示答案、換題清除、重喊保留草稿、跨區／背景取消、延遲啟音取消、載入及啟音失敗重試、九種寬度、人物熱區與真實手機觸控／鍵盤、減少動態。`WELL_URL`指定公開頁URL（可含query，勿帶hash），`WELL_CAPTURE_DIR`指定截圖目錄。前五區與共享播放回歸另跑整課10項及第五區13項。檢查不代表Safari實機或真人聽感核可。

## 2.3方案A：唯一主播放鍵（2026-11-01）

既有unit-2.3-continuous.test.cjs改驗證唯一按鈕、選步預覽、明確按播放才連播、700ms停留、完整流程與最後停止／重新開始、精確暫停續播、切步取消、手機吸頂、原生鍵盤／觸控及無JS。氧氣、材料、器材、字卡、物理、整頁及跨播放器檢查配合新入口；不保留舊單步播放預期。

本機九套共90項（含各外層）通過。公開核心用OXYGEN_CONTINUOUS_URL、OXYGEN_URL、OXYGEN_CAPTIONS_URL、OXYGEN_EQUIPMENT_URL、AIR_FULL_URL跑單鍵10＋操作11＋字卡10＋器材9＋整頁9，共49項；各截圖環境變數指向/tmp以免覆寫歷史證據。另以實際捲動確認主圖、近景與註記處只有同一顆主按鈕且可見。證據見docs/reviews/unit-2.3-oxygen-unified-player/。

### 3.4 F14整數公尺作答

模型4項、井深瀏覽器12項及整課10項共26項。本輪更新既有模型測試，另驗證四種題目附近的小數均為格式提醒，精確整數才可通過，錯誤整數仍走概念提示。瀏覽器逐題核對小數不被四捨五入、學生輸入不改寫、整數提示與欄位關聯、step／min／數字鍵盤、手機觸控及九寬度，維持不展示答案。公開另以`WELL_URL`跑井深12項。下方舊容差與判分未改的描述為此前階段歷史，以本節為準。

### 3.4 F11永不展示答案

井深12項、導覽13項、整課10項沿用既有專項。原精簡解析測試改為重複錯答／正答僅有提醒；換井以確定順序涵蓋全部0.40／0.50／0.60／0.80秒題目，每題驗證錯答與正答均不含標準答案、完整算式、聲路解析或「看解析」入口，學生輸入保持。九寬度、真實觸控與跨區回來也不顯示解答。音訊、題目及判分模型未改，不重跑未受影響的純模型／PCM檢查。`WELL_URL`與`WELL_CAPTURE_DIR`用於公開井深重驗；導覽另用`NAVIGATION_URL`（實際變數見腳本）。

### 3.4井深解析四步推導（歷史，已由F11移除）

同上`tests/unit-3.4-well.test.cjs`現為12項（含外層），新增四段編號、往返時間、總路程、兩個等長長條與井深，換井後逐項核對新題數值。核對前不顯示解析，重喊／換井／改答仍清除舊結果。井深12項與整課10項合計22項；九種寬度及真實觸控沿用小測專項。

### 3.4井深精簡解析高度（歷史，已由F11移除）

井深專項仍為12項。原四大段檢查改為單一圖文區內的三個精簡計算線索，並驗證兩半長條等長與換井資料同步。九種寬度另斷言桌機解析高度≤360px、窄螢幕≤520px，保留不溢出、原生觸控／鍵盤、聲音、判分與取消舊排程檢查。

## 2.3 左側空白點選暫停／繼續（2026-11-01）

```sh
CHROMIUM_PATH=/usr/bin/chromium OXYGEN_TAP_ARTIFACT_DIR=/tmp/unit23-tap node --test tests/unit-2.3-canvas-tap.test.cjs
```

新專項10項（含外層），驗證空白點選精確暫停／續播、場景像素與原生字卡動畫凍結、器材及材料介紹優先、預覽／完成不誤啟動、文字選取／拖曳／右鍵排除、手機主圖與近景真實觸控、原生滑動不切換、卡片文字區、700ms完成影格停留、自動換步後仍有效，以及右側控制不重複觸發。

搭配字卡10、單鍵連播10、器材9、操作11、材料10，本機共60項通過。公開可設OXYGEN_TAP_URL、OXYGEN_CAPTIONS_URL、OXYGEN_CONTINUOUS_URL、OXYGEN_EQUIPMENT_URL跑點選10＋字卡10＋連播10＋器材9共39項；截圖目錄均設至/tmp避免覆寫歷史證據。模型／CSS／其他區未改，未重跑其專用套件。證據見docs/reviews/unit-2.3-oxygen-canvas-tap/。

## 3.4第三區緊湊排版（2026-11-01）

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/unit-3.4-calculation.test.cjs
```

現14項（含外層），保留原速音訊、數字輸入、暫停續播、跨區／背景、錯誤重試與真實觸控。新增四種筆電／桌機視窗同屏檢查：互動區對齊後，時間欄、場景、總路程、等長長條與單程距離均可見，數字變更同步；預設互動區≤640px、整區≤1000px。十種寬度×三種數值另檢查高度、長數字、標籤不重疊及點擊區。`CALCULATION_URL`指定公開頁面URL，`CALCULATION_CAPTURE_DIR`指定截圖與layout／same-view量測JSON。

## 2.3 認識材料的用途標題（2026-11-01）

既有materials專項10項改驗證七材料「認識材料／用途」及玻璃片一般用途，equipment專項9項驗證後續操作仍為「本步中的作用」。兩套共19項通過；OXYGEN_MATERIALS_URL／OXYGEN_EQUIPMENT_URL可指定公開頁，截圖目錄另設/tmp以保留歷史證據。無新增測試套件或依賴，播放邏輯、模型及版面未改；證據見docs/reviews/unit-2.3-material-purpose/。

## 2.3 選步立即播放（2026-11-01）

continuous與oxygen專項改驗證點選即播放、重選從頭重演、換步取消舊時鐘／字卡、正確科學前提、鍵盤及手機同規則。其他氧氣與跨播放器專項改由選步直接起播，不再多按主鍵。十套共100項通過（連播10＋操作11＋空白點選10＋字卡10＋器材9＋材料10＋物理8＋整頁9＋性質10＋CO2 13，含外層）。

公開核心以OXYGEN_CONTINUOUS_URL、OXYGEN_URL、OXYGEN_TAP_URL、OXYGEN_CAPTIONS_URL、OXYGEN_EQUIPMENT_URL指定同頁，跑上述五套共50項；截圖目錄須另設/tmp保留歷史證據。模型、CSS與其他區未改，無新依賴。證據見docs/reviews/unit-2.3-oxygen-step-play/。

## 3.4 第四區同屏與紀錄分頁（2026-11-01）

```sh
node tests/unit-3.4-sonar-profile.test.mjs
CHROMIUM_PATH=/usr/bin/chromium node tests/unit-3.4-sonar.test.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/unit-3.4-sonar-ship.test.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/unit-3.4.test.cjs
```

本機圖模型2＋聲納15＋船隻7＋整課10，共34項（含外層）。聲納新增四個桌機／筆電視窗自區塊標頭起的全核心同屏、場景與圖表測點水平誤差<1.5px、九種寬度，以及每頁四筆／自動跳至新筆所在頁／鍵盤換頁／探測中翻舊紀錄／保留全部測點／清除重設。手機原生觸控另測五筆後的上一頁／下一頁，排除相容click重複。完整對話與模型說明改驗證展開後可讀。原速、音訊、拖船、點船、暫停及錯誤重試沿用原檢查。`SONAR_URL`指定公開頁（勿帶hash），`SONAR_CAPTURE_DIR`保存截圖及same-view.json，避免覆寫歷史證據。瀏覽器觸控為Chromium模擬，不代表Safari實機或真人聽感核可。

## 2.3 擺放集氣位置動畫（2026-11-01）

oxygen-model增加先定位再降導管、無加藥／反應的檢查，現6項；oxygen-three增加實際可見位移、水下滿水、暫停像素、移動命中與手機觸控，現11項（含外層）。本機模型／物理17、其餘氧氣60及整頁重跑9共86項不同檢查通過。首輪整頁離區等待超時，改原生點選並先讓可見影格更新後9項全過；初次手機全卡截圖捲出實驗，改近景可見截圖後17項全過，原記錄保持。

公開以OXYGEN_URL、OXYGEN_CONTINUOUS_URL、OXYGEN_EQUIPMENT_URL指定同頁，物理11＋操作11＋連播10＋器材9共41項。截圖目錄OXYGEN_THREE_ARTIFACT_DIR、OXYGEN_ARTIFACT_DIR、OXYGEN_CONTINUOUS_ARTIFACT_DIR、OXYGEN_EQUIPMENT_ARTIFACT_DIR另指/tmp，以免覆寫歷史證據。見docs/reviews/unit-2.3-oxygen-placement/。

## 3.1 第七區：公式選取與空白取消

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-3.1-formula-focus.test.cjs
```

檢查桌機滑鼠／鍵盤及手機真實觸控：選取頻率或週期公式後，點公式面板留白或面板外可清除全部對應高亮與按鈕選取狀態；巢狀分數文字、中文公式切換、重複點選取消及其他參數控制維持正常。共3項（含外層）。可設定 `FORMULA_URL` 指向公開完整課程入口，沿用既有 HTTPS 代理驗證。

## 3.1 第七區：理想化參數與真實繩子模式

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.1-speed-modes.test.cjs tests/unit-3.1-formula-focus.test.cjs
```

兩模式專項8項（含外層），加上公式選取回歸3項，合計11項。驗證理想模式的獨立波長與變速變色，真實模式固定12 m/s／綠色及頻率、週期、波長三向連動、上下限、各模式參數保存、播放中切換與舊動畫取消、30m的2.5秒抵達及單次振動、原生鍵盤／手機觸控與減少動態、五種寬度的版面。傳播測試以受控瀏覽器時鐘驗證時間及進度，並不代表量測真實繩子。`SPEED_MODES_URL` 可指向公開完整課程入口，`SPEED_MODES_CAPTURE_DIR` 可保存1440／390px兩模式畫面；公開驗證沿用既有HTTPS代理。

## 3.4 F01啟音與回聲同步（2026-11-01）

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/unit-3.4-audio-start.test.cjs
```

新專項8項（含外層）：前三區600ms啟音延遲各驗證零進度等待、完整最末輸出、原音／回聲排程及接收時刻；另測等待中暫停續播不重發、改值／快速重播取消、跨區起播／背景取消、延遲續播保留原畫面且只排剩餘回聲。真實AudioContext＋Analyser，記錄自然ended與stop，不能只驗證排程而未驗最末輸出。快速重播案例先明確確認尚在準備中（音源0、進度0），再於同一瀏覽器工作中觸發第二次原生按鈕click，避免自動化捲動／等待讓首次準備已完成；滑鼠／觸控入口仍由既有專項覆蓋。`AUDIO_START_URL`指定公開頁（不帶hash），`AUDIO_START_CAPTURE_DIR`保存三區等待／完成截圖及timing.json。既有reflection14、distance15、calculation14、sonar15、room13、well12與整課10作共用播放器回歸；不重跑未改的純模型。公開專項亦需執行，觸控仍由既有專項覆蓋，不代表Safari實機或真人聽感驗收。


## 2.3 第四區：與最新第三區一致的八項操作工作區（2026-11-01）

原五步專項已更新為八項與單鍵連播；執行 `CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-2.3-co2-model.test.mjs tests/unit-2.3-co2.test.cjs`。檢查材料／動態器材視窗、操作起訖狀態、連播／手動切步、封存停止、字卡共用、空白點選、跨實驗互停、七寬度與手機固定單鍵、觸控／鍵盤／無JS。`CO2_URL`及`CO2_ARTIFACT_DIR`沿用；本輪畫面與實際輸出見docs/reviews/unit-2.3-co2-workspace-20261101/。



## 3.4 F02側欄切換播放規則（2026-11-01）

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/unit-3.4-navigation.test.cjs
```

新專項13項（含外層）：六個播放器點側欄他區停下、原區可續播或小測重喊、聲納不重建測點、已完成小測不清除；六種600ms啟音準備取消無舊聲音；普通滑動／同區連結／Ctrl開新頁不中斷，鍵盤Enter及手機實際觸控導覽／滑動正常。搭配F01啟音8、整課10，共31項。`NAVIGATION_URL`可指定公開頁（不帶hash），`NAVIGATION_CAPTURE_DIR`保存navigation.json及390px定格畫面。手機滑動以CDP原生touch事件輸入，不代表Safari實機。公開專項需另跑，不以本機通過代替發布確認。

## 3.4 第五區乾淨結尾（2026-11-01）

既有`unit-3.4-room.test.cjs`仍13項（含外層）。完成檢查改為拍手／語音×有／無材料四組：結束後DOM波線0、時間不跳回、切材料不恢復舊波或新聲音、明確重播才從零恢復波。手機原生觸控同驗結束與材料切換，保留播放中暫停／同時刻減弱對照、音訊、九寬度與錯誤重試。本機房間13＋整課10共23項，公開以`ROOM_URL`另跑13項；`ROOM_CAPTURE_DIR`保存四種結尾、390px結尾及`end-states.json`。模型與音檔未改，不重跑純模型。

### 3.4聲納工具列對調（2026-11-01）

既有`unit-3.4-sonar.test.cjs`仍15項（含外層），九寬度新增座標斷言：狀態／按鈕組在左，速度／時間組在右；窄螢幕先操作後數據，狀態不撞按鈕。暫停專項另以320px實際「已暫停探測」及續播檢查，截圖`paused-toolbar-320.png`。同屏、對齊、音訊、移船及紀錄功能保持。沿用`SONAR_URL`與`SONAR_CAPTURE_DIR`分別跑公開版、另存證據。

### 3.4聲納人物對話常駐（2026-11-01）

沿用聲納15項，在初始頁確認三段人物對話全部可見且不在details內，模型說明仍預設收合。原筆電同屏、手機九寬度與操作測試保持；不新增獨立鏡像測試。

### 3.4聲納對話順序（2026-11-01）

聲納既有15項同驗三段對話常駐、前兩段位於互動前／總結在互動後；九寬度依760px切換雙欄與依序。筆電同屏從互動工具列起量測，另記錄從區塊標頭起的操作區座標headingView；不宣稱新加入的上方對話與全部內容同屏。既有音效與操作檢查保持。

## 3.1 第五區：振動前的平衡繩子

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-3.1-cycle-rest.test.cjs
```

共4項（含外層），確認無JavaScript與一般載入時皆是完整綠色平衡直線，等待時不自動振動；滑鼠、鍵盤及手機觸控播放後才產生波形，前方未受擾動的繩段保持平直。以受控瀏覽器時鐘檢查四段振動、完成後一個波長標示、四段完成狀態及重播回到直線起點。含減少動態與手機版面檢查。`CYCLE_WAVE_URL` 可指定公開頁面，`CYCLE_CAPTURE_DIR` 可保存初始畫面；公開驗證沿用既有HTTPS代理。

## 4.1 頂部標頭與滿寬內容

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-4.1-layout.test.cjs tests/unit-1.1-aperture.test.cjs tests/unit-1.1-shadow-theatre.test.cjs
```

六區比照現行2.2標頭，檢查320、390、768、1024、1366、1440px下的上下排列、內容滿寬、完整副標、主標題不重複、無橫向溢出與外側導覽；另操作桌機／觸控的燈光、遮擋球、影子大小、計時及結尾小測。歷史`unit-1.1-*`測試實際指向4.1，涵蓋三孔板及影子劇場的幾何、拖曳、鍵盤、尺軌與通過／重設狀態。可用`LIGHT_LAYOUT_URL`指定公開4.1網址，`LIGHT_LAYOUT_CAPTURE_DIR`保存版面數據與桌機／手機畫面。

## 3.4 F15正式房間精簡配置

沿用房間13項、整課10項共23項。房間原「控制在場景下方」預期改為核可配置：操作→提問→場景→圖例／狀態；10種寬度、各有／無材料共20組版面，檢查44px操作區、文字不溢出、詳細提示在工作區外且角色對話不收合。1440／1366／1280px下確認房間圖766×490.23px、工作區671.81px，從工作區起可同屏，沒有把整區含標頭與對話都算入。

原聲音、暫停、同時刻切換、結尾清空、背景取消、錯誤重試與觸控／鍵盤回歸保留。`ROOM_URL`可指向公開正式課程，`ROOM_CAPTURE_DIR`保存截圖及 `compact-layouts.json`；公開另跑房間13項。控制器、模型及音檔未改，不重跑未受影響的純模型／PCM檢查。

## 4.4 區塊內浮動操作（2026-11-03）

`node tests/unit-4.4-imaging-studio.test.cjs`：直接在課程內驗證同一canvas、兩把固定尺、可移動／收合面板及六種成像，確認沒有dialog或滿視窗按鈕。九種尺寸比較舞台與canvas高度，防止舊高度規則裁切；器材投影角點保持在舞台及底部尺上方。原生滑鼠／觸控移動面板、鍵盤復位、尺精準對齊，以及導覽離開／返回仍保留條件。IMAGING_URL／IMAGING_CAPTURE_DIR沿用，IMAGING_ONLY_HUD=1只跑本輪四項介面情境；其餘成像／光路回歸仍保留。IMAGING_ONLY_ENTRY及IMAGING_ONLY_PANELS可分別補驗導覽及面板。

## 4.4 一般課程預設對照及六種成像（2026-11-03，前輪紀錄）

`node tests/unit-4.4-imaging-studio.test.cjs`：一般網址不帶workspace、dialog未開啟時，五組桌機左圖右表與兩把尺同窗；四組手機／平板直接六點位與摘要、表格可展開。一般頁及展開工作區實際切換六種情況並核對無捲動、器材／尺／模型一致；另核對無窮遠平行光、焦點點像像素、有限圖卡隱藏／返回、F內正立放大虛像及六條反向延長線，屏幕不會對焦。保留F刻度、金框、原生手勢與返回狀態。IMAGING_URL及IMAGING_CAPTURE_DIR指定公開頁與證據目錄。模型9項、整課專項亦檢查；實際結果見本輪交付紀錄。


## 4.4 十區透鏡成像基本版

2026-11-02第一區立體改版後，另執行：

```sh
node tests/unit-4.4-pinhole-optics.test.mjs
CHROMIUM_PATH=/usr/bin/chromium node tests/unit-4.4-pinhole-3d.test.cjs
```

最新針孔模型10項、立體瀏覽器11項（含主項），加下方既有透鏡模型8與整課23，共52項。前輪四項回饋執行受影響的模型10＋立體11＋整課23，共44項；未重跑未改的透鏡純模型。新專項讀取實際Three.js場景及投影像素，驗證直線穿孔／孔板遮擋、倒立與連續大小、接收面位置、滑鼠／原生觸控拖曳、旋轉／滾輪／雙指縮放、取消手勢、鍵盤界限與同屏幕正面觀察、七寬度及深連結。`PINHOLE_URL`指定公開頁，`PINHOLE_CAPTURE_DIR`保存scene.json、layout.json與畫面。正式程式沒有測試API；測試以模組攔截注入唯讀觀察介面。新專項另驗三件器材各自的滑鼠與原生觸控拖曳、鍵盤範圍與防穿越、器材移動後的實際光路幾何、同孔板放大視角、孔口投影尺寸及畫面內光路按鈕。公開需另跑立體11與整課23，共34項瀏覽器檢查。

```sh
node tests/unit-4.4-optics.test.mjs
CHROMIUM_PATH=/usr/bin/chromium node tests/unit-4.4.test.cjs
```

純模型8項、瀏覽器23項（含主項），涵蓋實際成像計算、九個教學區與單一小測、調焦／物距紀錄、透鏡切換、眼睛／眼鏡／顯微鏡、滑鼠拖曳／鍵盤／原生觸控、七寬度與十個導覽標題連動，並與2.2計算樣式比對。`LENS_URL`指定公開頁（不帶hash），`LENS_CAPTURE_DIR`另存畫面與layout.json。詳見`units/4/parts/4.4/README.md`；操作通過不代表外部驗收。

4.4第一區接續依指示移除位置／視角重設按鈕，既有立體11及整課23項同步移除對已刪按鈕的依賴；以重新載入建立測試初始狀態，確認兩按鈕不存在並保留其餘操作與七寬度檢查。

## 4.4 凸、凹透鏡分區與10區整合（2026-11-02）

```sh
node tests/unit-4.4-parallel-optics.test.mjs
CHROMIUM_PATH=/usr/bin/chromium node tests/unit-4.4.test.cjs
```

新球面模型6項、更新整課23項，共29項。凸／凹輪廓厚薄、兩球面交點、兩介面司乃耳關係、真會聚／反向延長、完整取景由純模型核對；瀏覽器測第二／第五區獨立、同鏡片近看、選取文字對比、第三區單台分階段對焦／物距紀錄、第八區同眼模型矯正與撤鏡、第九區獨立顯微鏡、四題回看更新、十個標題導覽、七種寬度與手機原生觸控。以`LENS_URL`另跑公開23項，`LENS_CAPTURE_DIR`保存近看／整體／手機畫面及layout.json。

舊模型與針孔互動未改，不重跑未受影響的純模型／立體專項；五檔完整套件合計58項，勿誤稱本輪已執行58項。歷史lab4等ID保持作內部模型識別，已移除lab3與lab9的獨立工作台，不能再假設內部ID就是可見區號。

## 4.4 第二區立體凸透鏡與逐面折射（2026-11-02）

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/unit-4.4-convex-studio.test.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/unit-4.4.test.cjs
```

新專項8（含主項）＋整課23共31項。直接對實際Three.js鏡片求交，確認入射／出射點在曲面、主軸光不偏折、其餘光穿過焦點後繼續行進；檢查主圖與剖面共同開關、兩步驟選取與實際3D法線、器材不隨視角變動、滑鼠／鍵盤／原生觸控旋轉縮放及取消、七寬度完整取景／標籤／剖面文字，以及模擬渲染失敗仍可操作剖面。測試才攔截模組加入唯讀觀察介面，正式程式沒有測試API。`CONVEX_URL`指定公開頁（不帶hash），`CONVEX_CAPTURE_DIR`保存畫面、layout.json與scene.json；公開另跑8＋23項。純模型未改，不重跑；六檔完整套件66項不可當作本輪執行數。

## 4.4 第三區立體成像與物距比較（2026-11-02）

```sh
node tests/unit-4.4-imaging-optics.test.mjs
CHROMIUM_PATH=/usr/bin/chromium node tests/unit-4.4-imaging-studio.test.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/unit-4.4.test.cjs
```

新增模型4、立體專項10（含主項）與更新整課23，共37項。模型核對不同物距的像距、倍率、分物點會聚、實際屏幕平面的散開包絡、焦點／軌道／屏幕邊界及單一器材移動。立體專項使用實際屏幕像素檢查大小比例，驗證相同器材與正面視角、拖曳抓取偏移、階段狀態保留、四筆紀錄不覆蓋、明確刪除、失焦與清楚狀態、手機原生拖曳／取消／雙指縮放、七寬度取景與標籤避讓、WebGL失敗仍可操作。測試才攔截模組加入觀察與條件設定，正式程式無測試API。`IMAGING_URL`指定公開頁，`IMAGING_CAPTURE_DIR`保存畫面與量測；公開另跑專項10＋整課23。既有第一／第二區、其他光學模型未改，不重跑其專項。

## 4.4 第四區立體實驗台與常駐眼睛視角（2026-11-02）

```sh
node tests/unit-4.4-magnifier-optics.test.mjs
CHROMIUM_PATH=/usr/bin/chromium node tests/unit-4.4-magnifier-studio.test.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/unit-4.4.test.cjs
```

新模型4、立體專項10（含主項）、整課23，共37項。模型核對焦距內正立虛像、固定眼睛的視角尺度、原物參照、瞳孔射線與反向延長線、屏幕散開包絡／遮擋及器材範圍。專項讀取實際影像像素及CSS尺寸，驗證同步更新、主圖旋轉縮放不改眼睛影像、光路與延長線、屏幕插入／移動／正面／取下、抓取偏移、鍵盤微調、七寬度與標籤避讓、原生觸控／取消／雙指縮放及WebGL失敗備援。測試才攔截模組加入觀察與條件設定，正式程式無測試API。`MAGNIFIER_URL`與`MAGNIFIER_CAPTURE_DIR`指定公開頁與輸出。公開另跑專項10及整課23；前一輪曾遇2.2參考頁導航30秒逾時，本輪公開導航允許90秒、整課總期限360秒，所有斷言保留。

4.4第四區後續長寬比調整：原立體專項增加舞台至少3:2附近的橫向比例、依內容寬度720px切換並排／上下的斷言，保留七寬度、標籤避讓、相同畫面尺度與操作檢查。本機及公開各執行10項（含主項），未重跑未改的純模型與整課23項；詳見寬版交付紀錄。

## 2.3 第六區：直接拖動桌上器材（2026-11-02）

執行 `node tests/unit-2.3-direct-model.test.mjs` 與 `node tests/unit-2.3-direct.test.cjs`：新增模型8、瀏覽器12項（含主項）。瀏覽器使用畫面內實際器材，完整桌機與原生手機觸控集氣／封存，另核對持續使用、220ms停靠、空白／路過／取消、錯誤恢復、手機工具可見、邊緣捲動與接近提示、七寬度及鍵盤輔助。`COLLECTION_TASK_URL`指定公開頁，`DIRECT_ARTIFACT_DIR`保存畫面及版面資料。

回歸沿用 `unit-2.3-report.test.cjs`（16模型）、`unit-2.3-collection-task.test.cjs`（15）、`unit-2.3-full.test.cjs`（9）、`unit-2.3-properties.test.cjs`（14）、`unit-2.3-thistle.test.cjs`（5）；本輪本機合計79項。直接用 `node` 執行各檔以保留巢狀項目輸出；公開另跑五組瀏覽器55項。整頁截圖請以 `AIR_FULL_ARTIFACT_DIR`指定輸出目錄，避免更新歷史檢視素材。第1至5區HTML雜湊及實際畫面見 `docs/reviews/unit-2.3-direct-20261102/`。

### 3.4 第一區移除暫停按鈕（2026-11-02）

第一區保留圖上喇叭與「發出一次短音」兩入口，皆從頭發聲；移除獨立暫停按鈕。第一區14項與導覽13項改驗跨區／背景自動中斷、凍結、舊回聲取消及明確重新發聲；其餘區仍測既有暫停／續播。整課10項的手機案例改驗跨區停止。`REFLECTION_URL`可指定公開頁重跑第一區，`NAVIGATION_URL`指定公開導覽；不將按鈕移除誤當成取消背景／跨區音訊互斥。

### 2.3 第六區改為常駐材料區（2026-11-02）

移除選材／開始階段，測試改為直接點材料上桌。原直接瀏覽器新增一項初始操作、缺件不隱形使用及重複取用檢查，現13項；小測15項更新無開始按鈕、混淆物上桌試用與清空後仍可操作。沿用科學16、直接模型8、整頁9、第五區14及漏斗5，本機共80項、公開五組瀏覽器56項。helper中的select只代表測試取用四件基本器材，沒有對應的產品選材階段。操作、錯誤修正、手機觸控／七寬度及科學檢查均保留，證據見unit-2.3-supplies紀錄。

### 2.3 收回器材、鑷子顯示與反應瓶加清水（2026-11-02）

新增 `node tests/unit-2.3-return-water-model.test.mjs`（13）及 `node tests/unit-2.3-return-water.test.cjs`（8含主項）：12件物品切換、依附器材回收、先撤管／放回石塊／移開蓋片、容器內容清空而已倒液體保持、清水入反應瓶但不製氣、後加酸／實際液位及液封；瀏覽器另驗綠框消失、鑷子實際像素、手機快速連點／捲動與蓋片收回。`COLLECTION_TASK_URL`指定公開頁、`RETURN_ARTIFACT_DIR`保存畫面。

保留原科學16、直接模型8、拖曳13、小測15、整頁9、第五區14與漏斗5，本輪本機101項、公開六組瀏覽器64項。helper取用既有器材時直接操作桌上本體，不再重點材料區，以免觸發新收回行為。詳細最終輸出見unit-2.3-return-water紀錄。

## 4.4 初始取景、單一操作與畫面內焦距（2026-11-03）

更新第三區17項為載入即320／145.5公分對焦、初始方位−0.15與木座占畫面約八成、兩把尺皆可用且沒有模式切換。既有四關鍵點位、光路保持、投影、尺面／鍵盤／觸控與八組視窗繼續檢查；移除已取消的固定圖卡／模式切換測試。第二區8項新增距離線端點與實際鏡片中心及F投影一致、旋轉後更新、七寬度及無獨立下方區塊。成像模型7項改驗兩器材隨時可移動、另一器材不自動搬移；整課23項同步新操作。以上命令及URL／截圖變數沿用。

## 4.4 金框引導、預覽下方視角按鈕與F單位（2026-11-03）

第三區專項更新為18項（含主項）：新增F刻度、整數／小數讀值、軌道外訊息、滑桿F數值及無公分檢查；驗證屏幕／圖卡／固定透鏡的唯一金框、操作後清除及原生觸控引導。八組視窗檢查右側預覽下方按鈕不裁切、進出屏幕視角保留返回入口、光路工具必要時換行且不重疊，並保留既有對焦、投影、尺定位、相機與降級。整課23項與URL／截圖變數沿用；模型未改。

## 4.4 F主刻度精確對齊（2026-11-03）

第三區專項19項：獨立主刻度線與按鈕、把手及模型距離的像素坐標核對；實際滑鼠拖曳圖卡至2F／3F與屏幕至F／3F、無點刻度按鈕，驗3px協助對準、非主刻度連續拖曳與方向鍵微調。原生手機拖曳至2F與七寬度全部主刻度座標核對，保留八組視窗及尺高限制；整課23項命令沿用。

## 4.3 常駐折射解析與0–90°（2026-11-03）

第三／四區專項沿用oblique-lab、flow、beam測試入口，改驗下方常駐解析與上方手動動畫；新`unit-4.3-single-model.test.mjs`遍歷兩介質雙向0–90°、精確臨界角及兩側、全反射、掠射、有限端點與前緣連續。舊模型與第五區回歸保留。完整指令見該單元README；本機58項（19模型／39瀏覽器）全過。`LESSON_BASE_URL`及`LESSON_USE_PROXY`可切換公開驗證。

## 4.4 展開操作與觀察對照（2026-11-03）

第三區專項21項（含主項）：保留原19項，新增全視窗左圖右表的五組桌機尺寸、四個狀態切換不捲動、返回／Escape保留器材、光路、物點、旋轉縮放與焦點／捲動位置、workspace=1直接進入及返回後清除參數。另驗四組手機／平板尺寸，主圖、兩把尺、四個選項同窗，完整表格展開收合、原生觸控拖曳主刻度及退出後狀態。完整專項加整課23項共44項；公開專項21項。IMAGING_URL不帶workspace參數，專項自行測直接進入；截圖與原有環境變數沿用。

## 4.3 第三／四區0–40°折射比較（2026-11-03）

使用者確認教學範圍後，兩區操作統一0–40°。既有專項改驗原生滑桿、光源方向鍵／Home／End、拖曳與輸入事件不越界，水／玻璃40°仍顯示折射光，並移除臨界角／全反射／掠射教學提示。純模型新增兩介質雙向0–40°遍歷；完整物理邊界測試仍保留作內部防護。第五區高度檢查等待縮放後兩個畫面更新再量測，原有可見範圍條件保持。完整指令沿用單元README。

## 4.3 單一大場景與兩倍速（2026-11-03）

第三／四區專項改驗同一SVG與場景內解說、首次發射前隱藏／完成後顯示、調角與介質預覽、0–40°、上方放大按鍵、無暫停按鈕、離屏／頁面隱藏後自動續播、箭頭時序、載入競態／重試及八視窗文字／光線不遮擋。純模型另核對新時程恰為舊版一半且介質速度比例保持；原生手機驗兩區×水／玻璃四組操作。整課指令沿用單元README，57項（21模型／36瀏覽器）全過；另6項光束回歸補驗可見錯誤訊息。公開URL／代理設定沿用。

## 4.3 第三／四區單視窗完整操作（2026-11-03）

完整單元指令加入`tests/unit-4.3-viewport.test.cjs`：16組寬高×兩區×水／玻璃×0°／40°共128筆，驗證對齊操作區後全場景／解說／按鍵／滑桿皆在可見視窗內，無內部捲軸、文字裁切或角度壓扁，並保留44px觸控、介質標籤位置與光線不遮解說檢查。`VIEWPORT_CAPTURE_DIR`保存畫面及measurements.json；公開URL／代理設定沿用。另驗證聚焦／重設／重播不推移場景及短橫向視窗的發射前後解說可見性，整課75項（21模型／54瀏覽器，含外層）。

4.3格式檢查在視窗縮放後先等待兩次畫面更新，再量測錨點位置，避免容器尺寸重算時讀到中途版面；原導覽／標題可見條件保持。


## 4.3 第三區小車動畫（2026-11-03）

`unit-4.3-oblique-cart.test.cjs` 檢查兩輪跨界時序、車軸只有異速才旋轉、同速後保持方向／慢速、重播及收合／離屏／隱藏停止、一般偏好自播／減少動態手動、鍵盤／原生觸控、七寬度，以及第二區直行類比與第三區光學操作獨立。配合既有oblique-lab及整課回歸；`CART_CAPTURE_DIR`保存畫面。完整指令見單元README。


## 4.4 第三區外置位置尺與常駐屏幕面板（2026-11-03）

虛像呈現修訂：`node tests/unit-4.4-imaging-optics.test.mjs` 與 `node tests/unit-4.4-imaging-studio.test.cjs` 驗證連續虛像位置／倍率、反向延長線交點、透明圖案與無底座、實際像素差、同一屏幕投影、取景／縮放、十尺寸與原生觸控。`IMAGING_ONLY_VIRTUAL=1` 可單獨執行虛像專項；五倍近看之外可再縮小查看完整長軌。

五倍放大修訂：`IMAGING_ONLY_ZOOM=1` 檢查實際相機距離達初始1/5、滾輪及原生雙指相同邊界、旋轉保持距離、縮回全景，並核對器材狀態、投影像素與固定屏幕座標。`IMAGING_ONLY_LAYOUT=1` 檢查去除標題／無窮遠入射／旋轉提示三列後的十尺寸版面與六種成像。

最新固定右欄修訂：`IMAGING_ONLY_HUD=1` 擴至十個相關專項，核對第三／第四區的實際舞台高度規則、右欄固定座標、無拖曳入口、旋轉及縮放、六種成像、器材提示與手機觸控。短螢幕按雙尺剩餘高度縮短主圖。`IMAGING_ONLY_SCREEN=1` 可獨立重驗屏幕進入焦距內與正面近看，該專項會自行建立物距條件。

後續直立面板修訂以 `IMAGING_ONLY_HUD=1 node tests/unit-4.4-imaging-studio.test.cjs` 檢查十尺寸下的直立比例、屏幕／簡短成像特徵／按鈕上下排列、無復位按鈕及提示文字、觀察列無按鈕框線；保留整列點選、面板拖移、鍵盤及手機觸控。5項通過（含主項），其餘17項跳過。

沿用 `node tests/unit-4.4-imaging-studio.test.cjs` 及 `node tests/unit-4.4.test.cjs`。第三區專項檢查十種視窗下主圖與兩尺同窗、兩尺與常駐六列表格位於3D舞台外、屏幕面板沒有收合入口、摘要與詳細狀態整合、面板拖移／復位／觸控、水平完整旋轉及俯視、相機距離和投影像素保持；保留原光學、尺定位、鍵盤微調、觸控取消／雙指縮放及WebGL備援。`IMAGING_URL`、`IMAGING_CAPTURE_DIR` 沿用。


## 第四區反向小車動畫（2026-11-03）

第四區展開說明加入與第三區共用的小車控制器；上方粗糙地面類比較慢的水／玻璃，下方平滑地面類比較快的空氣。一側先加速、方向偏離法線，兩輪都進入後同速沿新方向前進。介質名稱跟隨第四區選擇，類比示意速度固定70→100，不代替光學模型或與入射角聯動。第三區原100→55保持，各自獨立播放／重播／收合／離屏／隱藏停止。

新增`tests/unit-4.3-exit-cart.test.cjs`，同時回歸第三區：

```sh
node --test --test-concurrency=1 tests/unit-4.3-exit-cart.test.cjs tests/unit-4.3-oblique-cart.test.cjs tests/unit-4.3-oblique-lab.test.cjs tests/unit-4.3-viewport.test.cjs tests/unit-4.3.test.cjs
```

`CART_CAPTURE_DIR`保存畫面／七寬度量測；各專項請指定不同目錄以保留兩方向的同名截圖。公開URL與代理變數沿用。

## 2.3 全單元盤點後的討論修訂（2026-11-03）

```sh
node --test tests/unit-2.3-*-model.test.mjs
node --test --test-concurrency=1 tests/unit-2.3-discussion.test.cjs tests/unit-2.3-composition.test.cjs tests/unit-2.3-captions.test.cjs tests/unit-2.3-feedback.test.cjs tests/unit-2.3-eight.test.cjs tests/unit-2.3-full.test.cjs tests/unit-2.3-properties.test.cjs tests/unit-2.3-move.test.cjs
```

新增模型涵蓋空瓶不能完成、倒液開始／中止／部分／滿瓶的實際量、錯藥與耗盡提示、清水偏差與成果一致、大理石有限、無樣本不誤報逸散、空氣中出口不隨水槽、成功後持續反應及開封重新判定。瀏覽器以真實事件驗杯子首次完全浸水解鎖、預設紀錄保持、比例與身分、工具介紹、連續播放與字幕同步、停靠不執行、放開及中止、鍵盤確認／取消、空瓶錯誤、成功樣本開封、手機遠處器材取景與提示、七種寬度、無JS及資源／程式錯誤。`UNIT23_REVIEW_URL`與`UNIT23_REVIEW_ARTIFACT_DIR`可指定公開頁及獨立證據；其他套件沿用各自既有參數。公開回歸不覆寫本機證據。

## 4.3 第五區樣式對齊與完整操作（2026-11-03）

新增`unit-4.3-return-refresh.test.cjs`20項（含外層）：照片裁切、凹入式選擇、同光路三層光線、16種視窗×兩介質×0°／35°共64筆，驗證主圖／按鍵／讀值同視窗、光源不被切換遮擋、最小字體及觸控範圍、放大交點對齊與關閉鈕不遮文字、焦點不推移場景。`RETURN_REFRESH_CAPTURE_DIR`保存畫面與measurements.json；原return-lab保留11項功能子檢查及外層，`RETURN_CAPTURE_DIR`沿用；加模型及其他區回歸的指令見單元README。

第五區樣式核對及既有flow回歸在視窗縮放後等待版面與ResizeObserver更新完成，再量測可見範圍與字體；原範圍／字級／不捲動的斷言保持。


## 4.3 第五區主圖側別角度、取消放大（2026-11-03）

return-lab改為10項：無放大、四種開燈組合的固定側別名稱、雙介質0／1／5／30／34／35°數字及弧線真實角度、鍵盤／兩端拖曳及觸控、光路端點／三層一致、切換及重設、競態與失敗重試。return-refresh20項改驗直接顯示角度，16視窗64筆新增文字互不重疊及不被切換遮住的條件；保留同視窗／觸控／不捲動及等比例。第三／四區專項只將第五區放大入口預期改為不存在。指令及公開環境變數沿用；目前完整組合52項（含外層），歷史54項及近拍專項由本節更新。

## 2.3 第二輪重審 A1–A12（2026-11-03）

新增 `unit-2.3-reaudit-model.test.mjs`（17項）及 `unit-2.3-reaudit.test.cjs`（7項子測試及外層）。模型驗證滿瓶氣體置換、原位置繼續反應但預覽不漏水／不拆卸、實際補救可重新通過、流出液體補入空氣、出口共用分類、累積容量／溢流／淹管／中止、整組停放和氣液守恆。瀏覽器以真實滑鼠、鍵盤及原生觸控驗取消、滿瓶再混空氣失敗、塞子可再抓取、正在溢流的即時提示，以及文案、清水介紹、無 JS 與資源／程式錯誤。

```sh
node --test --test-reporter=tap --test-concurrency=1 tests/unit-2.3-*-model.test.mjs
node --test --test-reporter=tap --test-concurrency=1 tests/unit-2.3-reaudit.test.cjs tests/unit-2.3-discussion.test.cjs tests/unit-2.3-move.test.cjs tests/unit-2.3-eight.test.cjs tests/unit-2.3-feedback.test.cjs tests/unit-2.3-full.test.cjs tests/unit-2.3-nine-details.test.cjs tests/unit-2.3-composition.test.cjs tests/unit-2.3-properties.test.cjs tests/unit-2.3-captions.test.cjs
```

新套件公開驗證參數：`UNIT23_REAUDIT_URL`、`UNIT23_REAUDIT_ARTIFACT_DIR`。公開證據與本機使用不同目錄。部分舊測試依採用決策改驗滿瓶仍置換氣體、預覽不解除液封，以及溢流後仍保留部分錯誤藥品；不再要求舊的錯誤行為。

## 第五區依開燈方向切換角度角色（2026-11-03）

依使用者最新指示，單開A時上方空氣為入射角、下方介質為折射角；單開B時下方介質為入射角、上方空氣為折射角。單燈模式藍色為入射、綠色為折射，扇形／引線／數字同步；只有雙燈同開才顯示空氣側與水／玻璃側，沿用綠色空氣側、藍色慢介質側。全關仍隱藏。主圖、無放大、數值與光路、角度範圍及操作保持。主圖ARIA及單燈結果列同步使用入射／折射名稱。

本輪執行`node --test --test-concurrency=1 tests/unit-4.3-return-lab.test.cjs tests/unit-4.3-return-refresh.test.cjs`，30項（含外層）。功能專項驗證四種開燈組合的名稱、顏色及雙介質數值；版面專項維持16視窗64筆及固定條件。未更改原可逆模型與其他區，完整52項為前輪歷史，本輪依受影響範圍檢查。


## 4.4 第四區圖卡尺與五列觀察（2026-11-03）

沿用 `node tests/unit-4.4-magnifier-optics.test.mjs`、`node tests/unit-4.4-magnifier-studio.test.cjs`、`node tests/unit-4.4.test.cjs`。本輪4＋11＋23＝38項（瀏覽器含主項）。第四區新增整列／鍵盤切換、實際條件選取、尺拖曳／鍵盤／觸控、五倍縮放、0.6F虛像真交點與透明圖案；保留同尺度實際像素、屏幕遮擋／取下復原、七寬度、原生觸控及WebGL失敗備援。`MAGNIFIER_URL`／`MAGNIFIER_CAPTURE_DIR`可指定公開頁及獨立證據；正式程式無測試API。


## 4.4 第四區跨F與預設光路（2026-11-03）

沿用magnifier-optics、magnifier-studio及unit-4.4三支專項指令，模型5＋立體12＋整課23＝40項（瀏覽器含主項）。新增F前後0.001F／F／1.5F／2F的真實像距、反向線與平行出射、角度投影有限極限、會聚光進入固定眼睛的未解析狀態、遠像位置標籤及相機範圍；七寬度×四種成像共28組。原生觸控與鍵盤可跨F，確認預設已開光路、切列偏好及返回F內恢復原像素。`MAGNIFIER_URL`／`MAGNIFIER_CAPTURE_DIR`與整課`LENS_URL`／`LENS_CAPTURE_DIR`沿用；正式程式沒有測試API。

## 2.3 空氣組成主圖粒子減半（2026-11-03）

`unit-2.3-composition-particles-model.test.mjs`與`unit-2.3-composition.test.cjs`改驗主圖500顆（390／105／4／1）；放大圖仍93／7。沿用模型邊界、連續切換／身分、移動、點選、暫停、手機觸控、減少動態偏好、七寬度與無JS檢查，不新增鏡像測試。討論整合套件的主圖數量預期同步。

## 4.3 第六區同步雙視角（2026-11-03）

unit-4.3-depth-model.test.mjs五項檢查水深／觀看位置全域的Snell關係、局部視位置共線、獨立相機光線與側面槽緣遮擋一致、三維切向折射及固定觀看目標。unit-4.3-depth-lab.test.cjs十一子項加外層，涵蓋初始無作答教學、實際Canvas像素與幣像位置變化、固定硬幣、槽壁遮擋及同位置加水可見、輔助線開關、鍵盤／拖曳／原生觸控、重設、離屏續播、九種視窗與44px觸控區、減少動態偏好、材質失敗重試及無JavaScript閱讀。

DEPTH_CAPTURE_DIR保存畫面與measurements.json；LESSON_BASE_URL／LESSON_USE_PROXY沿用既有公開測試設定。整課回歸的固定硬幣斷言改讀新實體幣與視位置的語意節點，不再假設前兩個circle就是硬幣。與原optics、整課及format組合共25項（含外層）。

## 4.3 第六區空槽加水與材質精修（2026-11-04）

depth-model新增無水純空氣／遮擋與固定世界檢查，濕態擴至1–100公分，現在6項；depth-lab改驗初始0公分不可見、新增手動加水與離屏續播／固定觀看位置／重設回空槽，現在12子項加外層共13項。文字下限只量必要標示，不將硬幣上的微小裝飾壓字當成教學標籤。其餘輸入、部分幣面共線、九尺寸／觸控區、減少動態、材質復原及無JavaScript閱讀仍保留。原整課／格式與optics一同執行共27項，DEPTH_CAPTURE_DIR／LESSON_BASE_URL／LESSON_USE_PROXY沿用。

## 2.3 第三輪重審 B1–B9（2026-11-04）

```sh
node --test --test-reporter=tap tests/*2.3*model*.mjs
node --test --test-reporter=tap tests/unit-2.3-b.test.cjs tests/unit-2.3-captions.test.cjs tests/unit-2.3-move.test.cjs tests/unit-2.3-reaudit.test.cjs
node --test --test-reporter=tap tests/unit-2.3-nine-details.test.cjs tests/unit-2.3-full.test.cjs tests/unit-2.3-eight.test.cjs tests/unit-2.3-feedback.test.cjs tests/unit-2.3-properties.test.cjs tests/unit-2.3-discussion.test.cjs
```

新增11項模型邊界與6項實際瀏覽器情境：兩段玻璃各自形狀／長度固定、橡皮管固定可用長度、真實時間暫停字幕、八張無JS代表圖、重新集氣後立即提示封存、液體與已反應量轉移、污染提示、移動水槽與透視水域共用判斷、耗盡後器材前提及下一步順序。字幕原本的「暫停保留舊淡出文字」斷言改為立即同步當前畫面；播放中的停留／淡出／淡入及連續播放仍驗證。原有模型期待同步更新為實際排水流入水槽及先裝漏斗再補酸。新瀏覽器套件支援 `UNIT23_B_URL`／`UNIT23_B_ARTIFACT_DIR` 以核對公開版與保存獨立證據。B10、B11未新增教學，預設觀察紀錄維持。

## 4.3 第六區直接操作（2026-11-04）

depth-lab改驗唯一原生range為場景內垂直水位把手，觀看位置由SVG眼睛直接控制。新增水位把手／水面拖曳、無初始跳位、垂直鍵盤、手動接管加水及原生手機水位不捲頁／其他圖面可捲頁；原本眼睛鍵盤、拖曳與觸控保留。廣泛狀態矩陣透過Home／PageUp／方向鍵事件設定觀看位置，沒有隱藏舊滑桿。專項13子項加外層共14項，全組合28項（8模型／20瀏覽器，含外層），證據與環境變數沿用。

## 4.3 第六區工具列、導軌與槽口取景（2026-11-04）

沿用第六區五檔組合及DEPTH_CAPTURE_DIR／LESSON_BASE_URL／LESSON_USE_PROXY。共29項（9模型／20瀏覽器，含外層）：新增同瞳孔取景不跟隨水位、近遠及不同水位下可見硬幣周緣不被裁切；瀏覽器核對光路工具歸屬左圖、共用列只有加水／重設、圖內導軌及沒有公分讀值。原生水面／把手／眼睛拖曳、鍵盤、手動接管、離屏續播、九尺寸、遮擋與部分可見、材質重試、無JS及整課功能持續回歸。更新整課手機檢查，改看仍可見的水位控制，不再要求已刪除的數字output。

## 4.3 第六區固定鏡頭與距離感（2026-11-04）

五檔組合與公開環境變數沿用，共30項（10模型／20瀏覽器，含外層）。depth-model新增相機只有原點平移、方向／上軸／倍率在全觀看範圍及各水位固定、兩槽緣投影寬度單調縮小；depth-lab原畫面變化專項增加近中遠×空槽／滿水六組及實際繪出硬幣寬度單調縮小，不增加正式程式測試介面。DEPTH_CAPTURE_DIR另存distance-comparison.json與六張distance畫面；原操作與九尺寸檢查保持。

## 4.3 第六區分段加水／放水（2026-11-04）

沿用第六區五檔組合與DEPTH_CAPTURE_DIR／LESSON_BASE_URL／LESSON_USE_PROXY，共31項（10模型／21瀏覽器，含外層）。depth-lab專項15項：每次加／放一段且停留、同向連按累加、途中改向不跳位、空／滿停用、加放水離屏續播、拖曳接管、原生手機點按、減少動態與偏好變更只到本段目標。九尺寸核對提示位於左圖下緣，無重設／重複提示。原重設測試情境改透過既有公開水位與眼睛鍵盤事件設定，不加入正式測試API。另保存first-water-step.png、drained-one-step.png及原畫面／量測。

## 4.1 第四、五區載入失敗狀態（2026-11-04）

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.1-scene-failure.test.cjs
```

專項涵蓋WebGL無法啟動、模組下載失敗、320px錯誤版面、單一區失敗而另一區實際正常操作、第四區遮擋球進出及中斷動畫、第五區手機真實觸控拖曳及畫面中斷。確認停用控制、觀察文字、焦點／捲動位置、失效後事件與動畫不再更動狀態；原第三區及小測無WebGL提示沿用，其他導覽可用。測試逐一載入單一正常3D場景、占位圖片，其餘3D以空模組隔離，不當成整課回歸。另核對第三區新增操作提示在失效時改為無法操作。`UNIT41_FAILURE_CAPTURE`可指定紀錄與320px提示截圖目錄。

## 4.3 第六區持續加滿／放空（2026-11-04）

依使用者澄清，depth-lab仍15項，五檔組合仍31項（10模型／21瀏覽器）。改驗一次點按連續通過中間水位直至滿／空，同向重按不重播、反向由目前水位接續；兩方向離屏續播、手動接管、手機完整加放水、減少動態及偏好途中變更皆到正確端點。參數沿用，另保存water-filling.png、water-draining.png。分段停止與連按累加屬歷史測試，由本節取代。

## 4.3 第六區移除重播按鈕（2026-11-04）

刪除過時的重播專項，預設檢查改驗depth-replay不存在、只有加水／放水兩按鈕。第六區專項14項（含外層），與格式共19項；本輪執行這兩檔，持續加放水、反向接續、手動接管、離屏續播、鍵盤／觸控、九尺寸、材質備援及無JS持續覆蓋。完整五檔組合現在30項，純模型與整課未因本次按鈕移除而重跑。公開參數沿用。

## 4.1 第18項：小測滾輪縮放（2026-11-04）

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-1.1-shadow-theatre.test.cjs
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.1-scene-failure.test.cjs
```

劇場既有操作測試更新滾輪預期：未選取及選取三道具後，滾輪只改相機遠近，全部道具及判定保持，頁面不捲動；核對縮放上下限及重設距離。尺軌與鍵盤、滑鼠／手機觸控、吸附保留z、完成重設及五寬度沿用。此套測試隔離前三個3D場景，僅驗劇場，不當成整課回歸。失敗狀態套件新增劇場可見提示於無WebGL時改成無法操作的斷言。

## 4.3 第六區眼睛與視野窗連線（2026-11-04）

depth-lab新增視野歸屬／焦點專項，15項（含外層）；加format及整課為21項，五檔完整組合31項。新增鍵盤移動後兩線起點跟隨、末端留在視野框、隱藏光路仍保留連結、焦點配對；九尺寸×近／中／遠共27組，取樣曲線確認留在區域內、不遮SVG文字、眼睛框不壓字、端點貼框、無箭頭且pointer-events為none。保留原生觸控與完整水位行為。初輪21項後，局部框線／標籤微調以既有起始／連線／版面4項補驗；DEPTH_CAPTURE_DIR的measurements.json包含connections，公開參數沿用。

## 4.3 第六區三十項畫面整理（2026-11-04）

depth-lab現在16項（含外層）：增加同名前側槽壁、實際擋光點、空槽／靠近／加水原因及等比例高解析繪圖的核對。版面由27組擴至9尺寸×5水位×3位置共135組，檢查文字互不重疊、水位把手及眼睛框不遮字、標籤不蓋真正光路、曲線避字及不越界。保留持續加放水、反向、接管、離屏續播、鍵盤／原生觸控、減少動態、材質備援與無JS。

完整命令為`node --test --test-concurrency=1 tests/unit-4.3-depth-model.test.mjs tests/unit-4.3-depth-lab.test.cjs tests/unit-4.3-optics.test.mjs tests/unit-4.3-format.test.cjs tests/unit-4.3.test.cjs`，32項（含外層）。固定鏡頭模型仍驗證全域可見幣面不裁切、各水位方向／倍率固定及遠離單調縮小；公開網址、代理及DEPTH_CAPTURE_DIR沿用。本輪沒有擴充外部依賴。

## 4.3 第六區同高接頸（2026-11-04）

既有depth-lab連接斷言改驗桌機在眼睛高度接入小開口，邊長接近端點直線距離、與觀看窗共用連續圓角輪廓；手機改驗標題同款眼睛短接至觀看窗上緣。保留焦點／鍵盤、27組連接及135組文字／光路避讓。本輪只跑受影響的起始／配對／版面4項，滑軌移到眼睛下方後補驗3項；原模型與加放水未重跑。公開參數及DEPTH_CAPTURE_DIR沿用。

## 4.3 第六區核可虛線操作提示（2026-11-04）

depth-lab以觀看配對取代已刪除的接頸檢查：水平虛線、眼睛下方雙箭頭、同款圖稿、焦點同步、眼睛移動而虛線／觀看窗固定。135組避讓現在同時量測無底牌的端點及操作文字，避免將其他標籤的底牌誤套到純文字。保留44px、最小字體、無溢出、原生觸控與完整加放水。專項16項（含外層），加format及整課22項。公開網址／代理／DEPTH_CAPTURE_DIR沿用。

4.3第六區的即時加放水中途證據改讀Canvas原像素，避免整個元素截圖等待期間跨過下一個水位檢查；焦點顏色等CSS實際轉場完成後再比對。原30%／65%／端點、焦點加強與還原斷言保持，沒有改產品計時或為測試加入介面API。公開針對兩情境及外層3項補驗全過，完整結果另存本輪公開紀錄。

## 4.3 第六區約兩秒的漸進加放水（2026-11-04）

既有動態偏好檢查改驗兩種偏好都漸進、切換偏好不跳端點。以實際click／tap計時、MutationObserver逐幀觀察Canvas已繪製水位與側圖水面／像素摘要，檢查正常及減少動態的加滿／放空、中途40→100／60→0與播放中改偏好，手機原生觸控也量測。每次端點約兩秒，中間至少四個實際繪製水位，雙視圖數值同步，滿量行程須有不同中間像素；不使用模擬時鐘取代實際時間。`water-timing.json`保存觀測。專項16項、加格式及整課22項，原方向反轉、手動接管及離屏續播保持。
## 4.1 共通規格六項修正（2026-11-05）

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-4.1-readiness.test.cjs tests/unit-1.1-aperture.test.cjs tests/unit-1.1-shadow-theatre.test.cjs tests/unit-4.1-scene-failure.test.cjs tests/unit-4.1-layout.test.cjs
```

新增readiness七項（含外層）：靜態分享標題／摘要／URL／開場圖及實際PNG尺寸、夜間四種狀態、320px圖片失敗及鍵盤重試、較早成功／失敗請求不覆蓋目前場景、四個3D區載入期間停用控制及實際孔板就緒後讀值／通光同步。`UNIT41_READY_CAPTURE`保存畫面與觀察記錄；不提供該變數也可執行。

劇場新增快速完成／重設還原補光及清理延遲回呼的實際流程，原投影及操作檢查沿用。孔板觸控測試將窄版投影出的拖曳距離維持至少24px，超過既有6px門檻；產品門檻不改。孔板專項隔離未測的另外三個3D場景，保留圖片、第二區開關及計時回歸；整課場景與主要操作仍由layout套件檢查。五檔合計50項（含外層），執行結果以當輪日誌為準。

## 4.2 以4.1為標準的共用外觀（2026-11-05）

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.2-style-alignment.test.cjs
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-4.2-completion.test.cjs tests/unit-1.2-mirror.test.cjs tests/unit-1.2-curved-mirrors.test.cjs tests/unit-1.2-reversible.test.cjs tests/unit-1.2-periscope.test.cjs
```

新增版面專項18項（含外層），以14個寬度直接比較4.1與4.2的實際CSS計算值，涵蓋六區卡片、頁寬、欄距、編號牌、標題、副標、內距與頭像；另比較小測外框／標頭，檢查窄版導覽不遮標題、唯一ID及資源載入。`STYLE_CAPTURE_DIR`可保存桌機／手機截圖與量測；`LESSON_BASE_URL`可指向公開站，`LESSON_USE_PROXY=1`使用環境HTTPS代理。切換寬度後以實際截圖提交畫面，避免背景分頁尚未更新斷點時讀取舊樣式。

既有鏡像專項改驗核可的48px教學頭像，其餘圖文避讓斷言保留；整課分享圖斷言同步先前已核可的1671×941小熊開場圖。互動與光學斷言不變。

雙光源專項在測試頁停用文件平滑捲動，並在實體指標操作前要求畫布完整入鏡，避免跳區捲動尚未停止時取得負的螢幕座標；不改產品捲動設定、指標命中或光學斷言。
軟體3D繪圖的整套總預算調整為180秒，與鏡像及潛望鏡相同；個別產品計時與操作斷言不變。

## 4.2 第一區前四項畫面改善（2026-11-05）

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.2-reflection-stage.test.cjs
CHROMIUM_PATH=/usr/bin/chromium node --test tests/unit-4.2-completion.test.cjs
```

第一區專項7項（含外層）：兩側實際Three.js光源條件、360條光錐邊緣光線落在材料內、初始反射方向與相機一致、四種獨立開關／燈頭／按鈕回饋、三視角下取樣渲染像素、切換保留器材位置及開燈狀態、拖曳／取消／鍵盤回正、六種尺寸幾何與44px目標、手機原生觸控及一般動態。單區套件隔離未測的其他3D活動；整頁整合另由completion的7項確認。

`REFLECTION_CAPTURE_DIR`保存三視角、桌機／手機畫面與geometry.json／pixels.json。`LESSON_BASE_URL`支援公開站；使用環境代理時設`LESSON_USE_PROXY=1`。測試只在攔截的模組回應內讀取實際場景，正式產品不暴露測試API。開關色彩採等待實際計算樣式後比對，保留狀態與物理燈光斷言。

## 4.1 月球軌道與平行陽光（2026-11-05）

```sh
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules node --test --test-reporter=spec tests/unit-4.1-moon-model.test.mjs tests/unit-4.1-moon-lab.test.cjs
```

模型3項驗證整圈固定距離／5.145°傾角／角度反解、72個位置對照獨立平行光月相公式、實際比例下無每月假遮擋及多點反射。對齊交點的額外情境驗證月球落入地影，以及月球視直徑稍小於太陽時保留部分日光，避免錯把環食當全食。瀏覽器專項6項含外層，涵蓋1366／1024px真實WebGL月球拖曳、點軌道、原生滑桿鍵盤、畫布方向鍵、六組月相／標籤避讓、真實地球視窗像素、旋轉／縮放、位置還原保留鏡頭、摺疊停畫／重開復用及WebGL／模組／貼圖／執行中context lost。MOON_CAPTURE可保存畫面及browser.json。只隔離其他四個3D模組與夜間圖片，三張天體貼圖真實載入，不作整課驗收。正式程式沒有測試API。

## 4.2 固定正面參考（2026-11-05）

沿用以上命令，第一區專項現為11項（含外層）。新增共享開關時參考圖的四種實際影像、轉動主畫面時參考相機／像素不變、兩個正面畫布的原始像素色彩一致、上下拖曳不改俯仰、容器窄版上下排列，以及失敗時兩圖與五個控制的狀態。手機案例另確認左右拖曳與垂直捲頁互不混用。`reference-colors.json`保存不含CSS邊框的畫布像素取樣，`stage-1440.png`及`stage-390.png`保存完整版面。

整頁completion的7項保留；快速跳區檢查曾揭露舊Observer只挑當批變更事件的目標，會將閱讀路線留在較早區塊。產品改按當下卡片位置同步高亮及進度，未放寬導覽／定位斷言。第二區起的學習HTML與第一區已核可對話另以雜湊確認保留。

## 4.2 自由觀看與下方參考圖片（2026-11-05）

第一區專項現為12項（含外層），沿用`tests/unit-4.2-reflection-stage.test.cjs`。分欄及固定俯仰斷言改成：上下拖曳改變實際相機高度、水平可轉過一圈、上下方分離且只有一張互動畫布、固定1119×678雙燈圖片、一鍵重設兩角度／開啟兩燈／回到視口、鍵盤及原生觸控，以及WebGL不可用時仍可閱讀圖片。參考圖與正面實際渲染以對應材料像素取樣比對，沒有降低原亮度容差。

觸控以同一CDP原生輸入序列連續拖曳與點擊，先等待捲動呈現再取得實際按鈕座標；保留實際命中、角度、開燈及視口斷言。產品對照按鈕補足3D拖曳後瀏覽器可能省略click的有效touch release，排除移動／取消並避免相容click重複啟動。

本次整頁回歸命令為`CHROMIUM_PATH=/usr/bin/chromium node --test --test-skip-pattern='入口、|潛望鏡素材' tests/unit-4.2-completion.test.cjs`，5項（含外層），涵蓋導覽及標頭、第一區實際燈具點擊／拖曳、第四區操作及WebGL備援；未變動的分享資訊與潛望鏡延遲素材專項不重跑。

## 4.2 緊湊操作區與小型參考（2026-11-05）

第一區專項現為13項（含外層），沿用`tests/unit-4.2-reflection-stage.test.cjs`。移除預設視角按鈕後，側面光學取樣改以真實滑鼠自由拖曳達到±38°；回正使用上方唯一按鈕。確認三個控制、兩角度重設／雙燈全開、不捲頁、參考圖完整縮小、五種常見視窗同時容納整個操作區及手機按鈕不被導覽遮住。六種寬度仍檢查完整器材、標籤、44px按鈕及溢出；材料大小改驗實際像素寬度，符合縮短主畫面後的可讀性需求。

正面PNG仍為原場景擷取，未重製。主畫面與PNG長寬比不同時，分別投影相同材料位置再取樣亮度，保留原容差6。`viewport.json`及`viewport-1366.png`／`viewport-390.png`記錄同窗檢查；原生觸控、開關、光錐、側面反光及無WebGL備援斷言保留。整頁回歸沿用前述排除未變動分享與延遲潛望鏡素材的completion命令。
