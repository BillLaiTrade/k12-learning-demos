# 鋼尺聲音來源與處理

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
