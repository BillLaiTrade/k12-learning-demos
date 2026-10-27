# 鋼尺聲音來源與處理

- 作品：Metal Ruler Twang.wav
- 作者：calebowenw
- 原始作品頁：https://freesound.org/people/calebowenw/sounds/219337/
- 公開高品質預聽音檔：https://cdn.freesound.org/previews/219/219337_4037663-hq.mp3
- 授權：Creative Commons Attribution 3.0（CC BY 3.0），https://creativecommons.org/licenses/by/3.0/
- 查閱日期：2026-10-27。作品頁說明為使用接觸式麥克風與 Zoom H4n 錄製的金屬尺彈振；與空氣中直接收音的音色可能不同。這是實錄，並非鋼琴或合成振盪器聲。
- 頁面已標示作者、作品頁、授權及音量調整；音檔存放在本 repo，播放不依賴第三方站台。

## 本地衍生檔

`metal-ruler-twang.wav`：48 kHz、16-bit PCM、雙聲道，約 2.409 秒。保持原速與原音高，做低頻整理、動態壓縮、響度正規化及尾端淡出。量測約 −16.00 LUFS、真峰值 −2.64 dBTP，樣本峰值 0.7364；預設播放器音量 100%，保留低於削波的餘裕。

使用 FFmpeg 重製的命令如下（`source.mp3` 為上述公開預聽檔）：

```sh
ffmpeg -i source.mp3 -af 'highpass=f=60,acompressor=threshold=0.03:ratio=4:attack=0.5:release=80:makeup=3,loudnorm=I=-16:TP=-1.5:LRA=7:measured_I=-26.73:measured_TP=-13.37:measured_LRA=0:measured_thresh=-37.13:offset=0:linear=true,afade=t=out:st=2.36:d=0.048' -ar 48000 -ac 2 -c:a pcm_s16le metal-ruler-twang.wav
```

- 公開預聽檔 SHA-256：`54cd70a0f55051ce87358ccc7e02cf679f3006a40359abe7e8961ba9bb7a742b`
- 衍生 WAV SHA-256：`29d1410dd7b6934f69d922ed331e40ab3927045df6f5f1fda82ddf02c8532be1`
