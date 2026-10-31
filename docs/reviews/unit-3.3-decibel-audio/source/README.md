# 原作錄音與查核證據

- `sources.json`：十二情境對應、作者、原作／下載網址、授權、來源 SHA-256、擷取段落與來源差異。
- `commons-evidence.json`、`commons-extra-evidence.json`：查核時 Wikimedia Commons imageinfo/extmetadata 原始回應，保留原作者、來源內容與授權文字。候選不等於採用；實際選用以 sources.json 為準。
- `downloads.json`：最初八份原檔的音軌／時長／SHA-256 查核結果。

原始完整長錄音及候選影片保留於開發環境 `/workspace/audio-work/originals`，不把數百 MB 未採用影片及完整長錄音放入網站。可依 sources.json 的 download_url 下載到任意目錄，命名為 source_file，核對 SHA-256 後執行：

```sh
python3 scripts/prepare-decibel-recordings.py /path/to/originals
```

腳本對缺少原檔、雜湊不符、無音軌、靜音、響度或峰值不合格均拒絕繼續。需系統 ffmpeg/ffprobe；未新增 Python 或 npm 相依套件。下載需遵守來源服務 Retry-After，本次 Wikimedia 曾回覆 429／600 秒，不能把錯誤 HTML 當成音檔。

成品每檔的資料及衍生授權在 `units/3/parts/3.3/assets/decibel-audio/recordings.json` 與 `LICENSE.md`；頁面來源清單由同一份資料生成。
