# Part 3.1 本機 3D 素材

本資料夾收納兩個候選頁共用的 3D 蘋果、由該模型產生的透明底圖片，以及本機執行 3D 場景所需的 Three.js 檔案。頁面不需連線到 CDN 才能載入模型或程式庫。

## 蘋果模型

- 來源：[Poly Haven — Food Apple 01](https://polyhaven.com/a/food_apple_01)
- 授權：CC0 1.0 Universal；模型可自由使用。
- 格式與解析度：glTF 2.0、2K 貼圖。模型網格、二進位幾何資料及底色、法線、粗糙度貼圖都保留在 `models/food_apple_01/`。
- 頁面將模型水平最大寬度縮放為 7.62 cm，依據 USDA FoodData Central 中型蘋果的 3 英吋直徑參照。這是教學模型的比例設定；來源模型其他尺寸沒有宣稱為 USDA 實測值。
- `apple-hero.webp` 是用同一個掃描模型產生的透明底靜態圖片，供卡片與逐顆蘋果計數畫布使用；3D 觀察場景仍載入 glTF 模型。

## Three.js

- 版本：0.186.1。
- 來源：[Three.js npm 套件](https://www.npmjs.com/package/three)，套件授權見 `vendor/three/LICENSE`（MIT）。
- 本頁只納入 `three.module.js`、其核心 `three.core.js`、`GLTFLoader`、`RoomEnvironment` 及載入器直接匯入的兩個工具模組，避免重複放入整個套件。
- WebGL 場景由 `apple-3d-viewer.js` 載入並顯示模型；Canvas 上的尺面、刻度、視線投影與讀值仍由各頁自己的教學程式繪製。

## 維護注意

升級 Three.js 時，需同步檢查其授權、載入器的相依匯入、模型載入與兩個頁面的視角／尺面對齊。
