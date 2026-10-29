# 聲音來源與處理

## 單元小測：單發煙火爆炸聲

- 作品：FRWKRec_Single Firework With City Reverb_Jaku5.wav。
- 作者：jakubp.jp（Freesound）。
- 作品頁：https://freesound.org/people/jakubp.jp/sounds/552699/
- 公開高品質預聽檔：https://cdn.freesound.org/previews/552/552699_3921235-hq.mp3
- 授權：CC0 1.0，http://creativecommons.org/publicdomain/zero/1.0/；可免署名使用。
- 查閱日期：2026-10-29（Asia/Taipei）。作品為單次煙火與城市回響的實錄。
- 本地 firework-burst.wav：取原預聽檔 0.061–3.261 秒，移除爆炸前的低聲背景，保留單次爆炸及衰減回響。48 kHz、PCM16、雙聲道，3.2 秒。整理極低頻與高頻、適度壓縮及正規化響度，起音 1 ms／結尾 350 ms 淡化。
- 解碼檢查：RMS 約 0.0638、峰值約 0.5813，起音 20 ms 內峰值約 0.2764；聲音清楚、無削波。播放直接輸出至 Web Audio 目的端，無額外音量滑桿。
- 爆炸聲依觀察開始後的隨機時間差預約播放；原錄音不含額外等待段，避免把音檔前導空白算成未顯示的延遲。

重製命令：

    ffmpeg -i source.mp3 -af 'atrim=start=0.061:end=3.261,asetpts=PTS-STARTPTS,highpass=f=45,lowpass=f=8500,acompressor=threshold=0.12:ratio=2.5:attack=1:release=130,loudnorm=I=-17:TP=-1.5:LRA=7,afade=t=in:d=0.001,afade=t=out:st=2.85:d=0.35' -ar 48000 -ac 2 -c:a pcm_s16le firework-burst.wav

- 原預聽 MP3 SHA-256：750405aee4544a7deb850f07f8eb005b8cc3aeb72c119963634c99b13878c6fb
- 衍生 WAV SHA-256：74ff4e7b8ef39d2610ccb49aa69fcb0e4a304c6c7b2a4266e9f8a0d0c46b113f

## 鋼尺

- 作品：ruler twanging.wav
- 作者：BeeProductive
- 原始作品頁：https://freesound.org/people/BeeProductive/sounds/383135/
- 公開高品質預聽音檔：https://cdn.freesound.org/previews/383/383135_4298084-hq.mp3
- 授權：Creative Commons 0（CC0 1.0），https://creativecommons.org/publicdomain/zero/1.0/；可免署名使用。
- 查閱日期：2026-10-27。作者說明為在桌邊撥動尺，先錄塑膠尺，再錄金屬尺。
- 使用者從候選音效中選定第 1 項；本地示範擷取後半段 1:31.85～1:34.50 的一次撥動。頁面不顯示署名，此檔保留來源紀錄。

## 本地衍生檔

`metal-ruler-twang.wav`：48 kHz、16-bit PCM、雙聲道，2.65 秒。保留原速、原音高，做低頻整理、動態壓縮、響度正規化及起尾淡化。成品量測約 −16.66 LUFS、真峰值 −4.51 dBTP；播放器音量固定為 100%。音檔網址帶版本參數，避免瀏覽器沿用前一版快取。

重製命令（`source.mp3` 為上述公開預聽檔）：

```sh
ffmpeg -ss 91.85 -i source.mp3 -af 'atrim=duration=2.65,asetpts=PTS-STARTPTS,highpass=f=60,acompressor=threshold=0.035:ratio=3:attack=2:release=100,afade=t=in:d=0.003,afade=t=out:st=2.45:d=0.2,loudnorm=I=-16:TP=-1.5:LRA=7' -ar 48000 -ac 2 -c:a pcm_s16le metal-ruler-twang.wav
```

- 預聽檔 SHA-256：`8645a4241badc827e83b43616f05e774103607cfa5545f78b536a6068d3f8598`
- 衍生 WAV SHA-256：`3259212de78fac715bacdbd3194cf33c4d1db0366e9c5312c457a2396249bdf1`


## 第二學習區塊：手持小鐘（使用者選定②）

- 作品：BELL 8B
- 作者：internationalauntie
- 作品頁：https://freesound.org/people/internationalauntie/sounds/868396/
- 公開預聽檔：https://cdn.freesound.org/previews/868/868396_10158715-hq.mp3
- 授權：CC0 1.0，https://creativecommons.org/publicdomain/zero/1.0/；可免署名使用。
- 查閱日期：2026-10-27。作者描述為跳蚤市場購入的手持小鐘系列。使用者從新一輪候選中選定第②項。
- 本地檔 `handbell-strike.wav`：擷取第一段鈴響，原錄音 3.72～9.72 秒，去除等待空白並保留衰減餘音；保留原速原音高，整理低頻、淡化起尾及正規化響度。48 kHz、PCM16、單聲道，6 秒，成品量測約 −16.76 LUFS、真峰值 −1.50 dBTP。
- 直接點鐘與下方按鈕皆在使用者操作事件內啟動聲音及慢速動畫。音量固定 100%，音檔自然播畢；再次敲擊停止舊音並從頭起音，不疊加播放器。離開分頁時停止聲音，返回不自動重新敲擊。
- 鐘聲使用實錄原速，粒子與耳膜動畫依圖下注記放慢；動畫時間不代表聲音實際抵達耳朵所需的時間。

重製命令：

```sh
ffmpeg -ss 3.72 -i source.mp3 -af 'atrim=duration=6,asetpts=PTS-STARTPTS,highpass=f=60,afade=t=in:d=0.002,afade=t=out:st=5.85:d=0.15,loudnorm=I=-16:TP=-1.5:LRA=7' -ar 48000 -c:a pcm_s16le handbell-strike.wav
```

- 原預聽 MP3 SHA-256：`e4e5de0b4cb7b800abf2d694c494d63bb81880c2bd6e2ccb871426c4603e8680`
- 衍生 WAV SHA-256：`c0646533782aa772483c9432f7bed9fc7b50cc71aa7739ec530e133a29e3a2e2`

舊版 `brass-bell-strike.wav` 為 Joshua_van_Zyl 的 [黃銅手鐘錄音](https://freesound.org/people/Joshua_van_Zyl/sounds/764907/)（CC0）衍生檔，保留於素材目錄，現行頁面不再載入。


## 第三學習區塊：持續運作的電鈴

- 作品：School Bell；作者：civvy。
- 作品頁：https://freesound.org/people/civvy/sounds/620392/
- 公開預聽 MP3：https://cdn.freesound.org/previews/620/620392_13730662-hq.mp3
- 授權：CC0 1.0，https://creativecommons.org/publicdomain/zero/1.0/；無須在頁面上署名。
- 查閱日期：2026-10-28。作者說明為實際校園電鈴的錄音衍生作品。
- `electric-bell-loop.wav`：截取 0.55～3.45 秒的持續響鈴部分，保持原速／原音高，整理低頻、做 12 ms 起尾淡化以降低循環接點突變，並正規化響度。48 kHz、PCM16、雙聲道，2.9 秒，量測約 −16.00 LUFS、真峰值 −9.94 dBTP。
- 使用者開啟電鈴後才播放並循環；由 Web Audio 增益隨罩內空氣狀態連續變化，沒有把音高變低來表示抽氣。空氣量與音量為定性示意，不是實驗量測的對應曲線。

重製命令：

```sh
ffmpeg -ss 0.55 -i source.mp3 -af 'atrim=duration=2.9,asetpts=PTS-STARTPTS,highpass=f=80,afade=t=in:d=0.012,afade=t=out:st=2.888:d=0.012,loudnorm=I=-16:TP=-1.5:LRA=7' -ar 48000 -c:a pcm_s16le electric-bell-loop.wav
```

- 原預聽檔 SHA-256：`a2aee75fe70baae59ec9a7877b03693c1e354b3bf47943f74c23d58c84c1d9f4`
- 衍生 WAV SHA-256：`bb66f54c77671aa222a2a1d8068cd80bc15cc0672ee92c0c593622bf3cda2436`
