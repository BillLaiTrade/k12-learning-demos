# 2.1 波的傳播素材

- 共用人物頭像位於專案根目錄 `shared-assets/characters/dialogue-character-avatars.png`；左半為小葵，右半為無鬍子的阿公。頁面以 CSS 裁切對應半幅，不在本單元素材夾存放副本。
- `wave-story-opening-outdoor.png` 為 2.1 標題區的開場情境圖；阿公外觀依角色設定圖修整，保留原場景與手持的粗繩樣式。依使用者核可調整為阿公在左、小葵在右，對應阿公產生擾動及後續動畫向右傳播；以原圖為參考進行水平鏡像編輯。
- 學習內容中的繩波動畫與波形示意皆使用綠色細線。
- `taiwan-satellite-map-3857.png` 是 Esri World Imagery 衛星影像匯出圖，採 EPSG:3857 範圍 `x=13258692.2314–13691756.4896 m`、`y=2451599.0874–2949622.9843 m`，尺寸 720 × 828；較寬的範圍讓臺灣北端完整留白。地圖 SVG 使用相同投影範圍；南投埔里設定觀測點與東部外海震央情境點座標分別為 (23.9666667°N, 120.9691462°E) 與 (23.91°N, 122.15°E)，兩點直線距離約 120.2 km。100 公里比例尺依比例尺所在緯度 21.69°N 的 Web Mercator 地面距離換算。影像來源：Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community.
- P 波頻率 1.22 Hz 與 S 波週期 0.84 s 參考 2024-04-03 花蓮地震的 TW.SSLB（南投雙龍站）波形。P 值取 BHZ 垂直分量 2024-04-02 23:58:22–23:58:31 UTC 訊號窗的頻譜主峰 1.215 Hz；S 值取 BHE 東西向分量 23:58:33–23:58:43 UTC 訊號窗主峰 1.194 Hz 的倒數 0.838 s，頁面以 1.22 Hz 和 0.84 s 顯示。圖上的波長（P 5 km、S 3 km）是教學模型值，非測站直接量得；地圖的 120 km 也是情境設定，並非此筆地震到 TW.SSLB 的距離。來源：[USGS us7000m9g4](https://earthquake.usgs.gov/earthquakes/eventpage/us7000m9g4/executive)；[EarthScope TW.SSLB 波形](https://service.earthscope.org/fdsnws/dataselect/1/query?net=TW&sta=SSLB&loc=%2A&cha=BH%3F&starttime=2024-04-02T23%3A58%3A00&endtime=2024-04-03T00%3A01%3A00).
