# 第五區小葵語音試配（2026-11-01）

使用者反映「說一句話」不像小葵。將eSpeak NG通用中文乾音改為臺灣華語神經合成女聲`zh-TW-HsiaoChenNeural`（語速+4%、音高+25Hz）。這是年輕明亮聲線的角色試配，尚待使用者判斷，不宣稱已有正式核可配音。

吸音前後從同一乾音與既有三維模型重建，各2.8347秒；直接起音前4ms完全一致，未分別正規化，無削波，拍手音檔未變更。來源設定及雜湊見素材AUDIO-SOURCES.md。網頁以版本化音檔載入，無執行時外部語音服務。

執行`node tests/unit-3.4-room-audio.test.mjs`：3項通過；執行`CHROMIUM_PATH=/usr/bin/chromium node tests/unit-3.4-room.test.cjs`：13項（含外層）通過。檢查實際AudioContext解碼／輸出、重播、暫停續播、切換取消、手機操作、9種寬度與錯誤復原。已檢視390px截圖，版面無異常。自動檢查不代表真人主觀聽感核可。
