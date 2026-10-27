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


## 第二學習區塊：黃銅鐘敲擊

- 作品：BELLHand-Int_Brass Bell Store2_JvZ_OwSFX
- 作者：Joshua_van_Zyl
- 作品頁：https://freesound.org/people/Joshua_van_Zyl/sounds/764907/
- 公開預聽檔：https://cdn.freesound.org/previews/764/764907_16528747-hq.mp3
- 授權：CC0 1.0，https://creativecommons.org/publicdomain/zero/1.0/；可免署名使用。
- 查閱日期：2026-10-27。作者描述為實際搖響黃銅手鐘，以 Zoom H6 與指向式麥克風錄音。
- 本地檔 `brass-bell-strike.wav`：取原錄音 2.4～4.5 秒，去除前後空白；保留原速原音高，整理低頻、淡化起尾並正規化響度。48 kHz、PCM16、雙聲道，2.1 秒，約 −16 LUFS、真峰值 −6.04 dBTP，樣本峰值約 −6.3 dBFS。
- 兩種敲擊入口皆在使用者操作事件內啟動聲音及慢速動畫。音量固定 100%，音檔自然播畢；再次敲擊會停止舊音並從頭起音，不疊加播放器。離開分頁時停止聲音，返回不自動重新敲擊。
- 鐘聲使用實錄原速，粒子與耳膜動畫依圖下注記放慢；動畫時間不代表聲音實際抵達耳朵所需的時間。

重製命令：

```sh
ffmpeg -ss 2.4 -i source.mp3 -af 'atrim=duration=2.1,asetpts=PTS-STARTPTS,highpass=f=70,afade=t=in:d=0.003,afade=t=out:st=2:d=0.1,loudnorm=I=-16:TP=-1.5:LRA=7' -ar 48000 -c:a pcm_s16le brass-bell-strike.wav
```

- 原預聽 MP3 SHA-256：`b6c8bbd3c6d5a63756044af6f9afbe4d692c55271ef88cf88f1c0c4bc17be0c7`
- 衍生 WAV SHA-256：`6ac98ff337689bb6df4585de1d51c70617454558fc421a34e0ab302b3592b45c`
