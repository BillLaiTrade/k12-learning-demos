# 第五區音訊來源與修改

## 吉他 string.wav

- 原作：[31-A#4.flac](https://freesound.org/people/allan764/sounds/467669/)，作者 allan764。
- 授權：[Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/)。原作的HQ MP3預覽用作處理來源。
- 選取前1.2秒，原基頻約468.92Hz，以Rubber Band保時長調音至440Hz，混成單聲道、淡入淡出及固定增益；保留原本撥弦衰減。修改版依CC BY 3.0提供。

## 排笛／排管 pipe.wav

- 原作：[panflute scale octave and a half](https://freesound.org/people/mrshoes/sounds/278175/)，作者 mrshoes。
- 授權：[Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)。原作的HQ MP3預覽用作處理來源。
- 作者以一端封閉的3/4英吋PVC管及水位錄製音階，並非竹製排笛實錄。
- 自16.95秒選取1.2秒單音，原基頻約411.88Hz，以Rubber Band保時長調音至440Hz，混成單聲道、淡入淡出及固定增益。修改版依CC BY 4.0提供。

## 音叉近似純音 pure.wav

本專案合成的440Hz正弦示意音，並非音叉實錄。與另外兩份音檔使用相同的1.2秒長度、淡入淡出及全段RMS匹配。純音及其製作腳本依本專案條款提供。

## 波形與重製

頁面從這三個最終WAV的同一份PCM資料建立AudioBuffer及繪製波形，不以手繪、固定泛音係數、循環重建或分別自動放大的圖代替錄音。圖截取200–210ms；三圖共用10ms時間窗及數位相對振幅刻度，未經聲壓校準。

音檔來源、處理參數、音高、RMS、峰值、SHA-256見recordings.json。執行scripts/prepare-timbre-recordings.py可重製；來源證據及原預覽位於docs/reviews/unit-3.3-timbre/source/，排管原檔位於docs/reviews/unit-3.3-pan-recordings/source/。
