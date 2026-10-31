# 3.3第七區：三個生活聲級的靜態比較

日期：2026-10-31。使用者要求改採精美、一目了然的靜態呈現，三個情境分貝差距應明顯，避免原電影院／音樂會範圍高度重疊。仍為第四階段製作待檢視，不新增外部教材驗收。

## 來源與範圍

三例全部改用同一個官方來源：[OSHA Technical Manual Section III Chapter5 Figure3, Decibel Scale](https://www.osha.gov/otm/section-3-health-hazards/chapter-5#decibles)。頁面可讀說明明列Typical Sound Levels(dBA)：Silent Study Room20、Conversation(3ft. away)60、Construction Site100。網頁皆標「約」，交談距離換成約0.9m。source-evidence.json保存查核日期、來源摘錄、原標籤、單位與三例。沒有以資料區間的中點取代範圍，也沒有任意湊出三個聲級。

這些是典型情境參考值，不是同地同條件的實驗、固定場所讀值或裝置實測。0dB與聲級非聽感倍數仍保留，分貝基準另沿用OpenStax17.3。不教對數或聲壓運算，不新增噪音／聽力保護章節。

## 圖像與版面

依使用者方向製作三幅精緻生活場景：安靜書房、成人正常交談、施工工地。decibel-scenes.png為image_gen原始三格PNG2172×724，未改像素，以SVG viewBox與clipPath分別取景；文字與20／60／100dBA由HTML呈現。插圖為示意，不是測量照片；對話人物沿用共用小葵／阿公，情境中的普通成人不是這兩名角色。

桌機三張圖卡並列，各卡大數字直接可讀；下面同一條0～120dBA數字刻度標出三例位置，數字間距不代表聽感或聲強倍數。再接兩個簡短知識框與阿公說明、資料條件和來源連結。手機三張圖文同行直列，保留共同刻度。沒有點選切換、滑桿、麥克風、播放、模擬儀表或區內測驗；移除原level()及資料切換碼，頁尾來源同步更新。

## 驗證

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.3.test.cjs tests/unit-3.3-hearing.test.cjs
```

23項通過（含外層），0失敗／略過。核對三個值20／60／100、真實PNG解碼、三幅圖及來源、共同刻度標記的實際螢幕位置、靜態區沒有發聲或操作控制、知識文字；320～1920px八種寬度無橫向溢出。整頁／唯一小測與第六區連續調頻／取消／鍵盤／手機維持正常。

已實際檢視decibel-1440.png、decibel-1024.png及decibel-390.png，三場景與數字清楚、無串圖、手機完整，沒有左側空白欄。共用2.1版型與七區標題／導覽一致。公開版本確認另記於規劃repo。
