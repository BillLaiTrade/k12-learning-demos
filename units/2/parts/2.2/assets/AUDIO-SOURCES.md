# 聲音來源與處理

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
