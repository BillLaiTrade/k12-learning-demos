# 5.1 瀏覽器操作檢查

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

煙火版面檢查另驗證「你的估算」位於上方兩欄之下並橫跨完整內容寬度；桌機公式、輸入框與核對按鈕同列，390px 直列，右側僅保留條件與紀錄。

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

核對投影大小及位置各自合格才吸附、初始三個前後位置僅調x／y不能完成、非0.42深度可合理完成、吸附前後z及道具大小完全相同、x／y修正不超過投影位置容錯、現有0.16步幅可達標、容錯邊界及80組獨立射線交屏幕計算。實際瀏覽器涵蓋三道具的失敗／成功狀態、滑鼠及觸控拖曳、鍵盤、尺軌、滾輪、轉動視角、完成後「演出完成」停用與重新挑戰提示、重設還原道具／進度／描邊／尺軌狀態及再次完成、五種尺寸；以測試載入時的場景觀察入口核對真正的3D座標，正式程式未暴露測試API。另檢查尺軌左光源／右屏幕、0–10換算與端點、讀值／道具切換同步、Home／End／方向鍵、78px扁平高度、原生滑鼠及觸控拖動、拖動經過合格位置不提前鎖定、放開後才吸附且保留z。桌機、手機使用獨立程序，另跑第三區通光回歸。紀錄見 `docs/reviews/unit-1.1-shadow-theatre/`。

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

純模型檢查 5,000 公尺、物理傳播延遲、位移有界、固定 y、粒子不交叉、歸位與介質／溫度先後。瀏覽器檢查正式五張學習卡、第四區只有介質比較、第五區只有溫度比較、沒有模式分頁、唯一原生／SVG ID、左右欄格式、導覽與小測。來源、粒子、水體／鋼材、表面取樣、固定叉臂快速微移、0.6 秒敲槌、下方刻度及右側純到達時間皆檢查。

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
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.4-sonar-model.test.mjs tests/unit-3.4-sonar.test.cjs
```

共13項（含外層）：固定起伏地形與1,500m/s、2／4／6秒模型；發聲才建立A、B、C…（Z後AA）且收到回波才填值；滑鼠／真實手機觸控拖船、按鈕及鍵盤、測量期間鎖船、舊標記不隨船移動、圖表逐筆對應、獨立暫停續播、清除取消與重新編號、跨區／背景停止、啟音失敗重試，以及1440–320px七種寬度。真實4秒與Web Audio最末輸出量測不凍結時鐘；返回副本較弱，暫停後SVG像素保持不變。手機拖曳後第一次觸控發聲須只新增一筆。

測試自行啟停Python與Chromium。`SONAR_URL`可指定以`/`結尾的公開課程入口（可帶版本查詢參數）；公開瀏覽器沿用HTTPS代理。`SONAR_CAPTURE_DIR`指定截圖目錄，預設`/tmp/k12-34-sonar`。本機完整回歸沿用本課第一至三區與整頁指令，不把操作通過視為整單元外部驗收。舊深度滑桿／收合答案／八倍聲納檢查由本專項與整頁新聲納案例取代。

## 3.3 第六區：持續純音頻率探索

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.3-hearing.test.cjs tests/unit-3.3-timbre.test.cjs tests/unit-3.3.test.cjs tests/unit-3.3-fork.test.cjs tests/unit-3.3-pitch.test.cjs tests/unit-3.3-guitar.test.cjs tests/unit-3.3-pan.test.cjs
```

第六區專項以瀏覽器OfflineAudioContext實際render驗證20／80／1000／8000／16000／20000Hz、低增益與頭尾餘裕、35ms調頻後的2000Hz及起音10ms就停止；實際頁面攔截OscillatorNode確認持續播放超過短音長度、調頻沿用同一個節點、頻率數值、暫停／重播／跨區取消。另含真實滑鼠拖曳與邊界、鍵盤、端點改寫／防反向／重設、待resume取消與失敗重試、知識文字、八種寬度，以及真實手機touch拖曳後立即暫停、紀錄／重設／點喇叭且每次起音一次。HEARING_CAPTURE_DIR指定截圖目錄，SOUND33_BASE_URL可指向公開頁（以/結尾）。

本輪上述整合75項通過（含外層），0失敗／略過；第六區單獨11項。實際音訊驗證只確認數位訊號，不冒稱驗證喇叭的聲壓輸出或學生聽覺。
