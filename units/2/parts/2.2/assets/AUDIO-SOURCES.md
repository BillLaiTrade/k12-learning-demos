# 鋼尺聲音來源與處理

- 作品：ruler on table_ST.wav
- 作者：wilhelmsqueek
- 原始作品頁：https://freesound.org/s/347392/
- 公開高品質預聽音檔：https://cdn.freesound.org/previews/347/347392_6222517-hq.mp3
- 授權：Creative Commons 0（CC0 1.0），https://creativecommons.org/publicdomain/zero/1.0/；可免署名使用。
- 查閱日期：2026-10-27。作品說明為把鋼尺放在桌緣，一端懸空並按住另一端後撥動錄音。
- 頁面不顯示音效署名；此檔案保留來源與授權紀錄。

## 本地衍生檔

`metal-ruler-twang.wav`：取預聽檔 11.3 至 13.25 秒，48 kHz、16-bit PCM、雙聲道，1.95 秒。經低頻整理、動態壓縮、響度正規化及尾端淡出；量測約 −16.0 LUFS、真峰值 −4.4 dBTP。音量設定為 100%。

重製命令（`source.mp3` 為上述公開預聽檔）：

```sh
ffmpeg -ss 11.3 -i source.mp3 -t 1.95 -af 'highpass=f=60,acompressor=threshold=0.03:ratio=4:attack=0.5:release=80:makeup=3,loudnorm=I=-16:TP=-1.5:LRA=7,afade=t=out:st=1.85:d=0.1' -ar 48000 -ac 2 -c:a pcm_s16le metal-ruler-twang.wav
```

- 預聽檔 SHA-256：`12993f245f927df8a4986428cc9d40aee7d8e31cd3a31fc2fa381ff712136ef4`
- 衍生 WAV SHA-256：`19c9304f878c2b363915502045645e7bcd3ac74ab59abc3f787cebf4ecc1b244`
