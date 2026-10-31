# 3.3第五區：同音高音色比較

日期：2026-10-31。使用者核可三列示意圖，並要求每條波形必須真正對應該聲音；不是以漂亮的預設曲線代替實際資料。仍為第四階段製作待使用者檢視，不宣稱教材外部驗收。

## 核心內容與畫面

- 同音高可有不同音色；基本週期相近時，每週期的細節仍不同。聲音的起音、衰減與氣息也屬音色線索，不將短窗當作完整音色描述。
- 依approved-mockup.png實作三列：音叉、木吉他、排笛縮圖／預設波形／各自播放鍵；各聲音可自由重播。保留現行共用人物、全寬卡片與室內背景，沒有新增調頻、音量、固定參照或逐區測驗。
- 三列共用10ms、±0.6數位相對振幅刻度。正式線條依實際PCM而變；與概念示意圖不同的形狀及高度是預期結果，不將各列自動放大至同高。

## 聲音與資料一致性

- 音叉為440Hz近似純音合成示意，頁面明示；不是實錄。
- 木吉他採allan764「31-A#4.flac」（CC BY 3.0）；排管採mrshoes「panflute scale octave and a half」（CC BY 4.0）。作者原用封底PVC管及水位錄製排管，頁面來源明示，沒有冒稱竹製排笛實錄。
- 兩份實錄只擷取、保時長調音、淡入淡出與固定增益；沒有壓縮、循環、逐週期重建。所有單音1.2秒，共同全段RMS約0.1383；峰值分別0.2004／0.8800／0.2511，未削波。量測基頻440.000／439.999／440.079Hz，保留實錄變化。
- 最終單聲道PCM16 WAV解析為Float32Array。同一陣列直接copyToChannel至22050Hz AudioBuffer，並逐一繪出200–210ms的221個取樣點。不在圖層套用舊固定泛音模型，不逐列正規化。
- 圖片為器材示意，訊號為數位錄音／合成訊號，未校準真實聲壓；RMS匹配不保證設備上主觀響度完全一致。
- 授權、修改、來源雜湊在assets/timbre-audio/LICENSE.md與recordings.json；原吉他HQ MP3與來源查核在source/，排管原檔沿用前次review/source。scripts/prepare-timbre-recordings.py可重製。

## 已執行檢查

1. `CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.3-timbre.test.cjs tests/unit-3.3.test.cjs`：19項通過，0失敗／略過。
2. `CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.3-fork.test.cjs tests/unit-3.3-pitch.test.cjs tests/unit-3.3-guitar.test.cjs tests/unit-3.3-pan.test.cjs`：43項通過，0失敗／略過。

合計62項（包含外層）。新專項直接攔截真正啟動的AudioBuffer：所有取樣值與最終WAV逐值相等；每個圖形頂點反算振幅與該Buffer對應取樣誤差小於1e-7，未播放前預設圖與重播後圖完全一致。另檢查實際Buffer基頻、音量與峰值、獨立重聽／換音源、自然結束／導航／隱藏停止、鍵盤及真實觸控、慢下載取消後不誤起音、503預載失敗保持空圖且可重試。

八種寬度320–1920px檢查時間軸對齊、按鈕可用及無橫向溢出。已檢視timbre-1440.png、timbre-1024.png與timbre-390.png。桌機三列合計約478px；手機採每列圖後附完整播放鍵。前三至四區及唯一結尾小測回歸正常。尚待公開部署核對與使用者實際聆聽／檢視。
