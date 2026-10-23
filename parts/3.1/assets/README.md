# Part 3.1 量測場景素材

本資料夾包含學習頁使用的鉛筆圖像、視差場景程式及本機 Three.js 檔案。頁面不需連線到 CDN 才能載入程式庫。

## 鉛筆圖像與參考

- `pencil-photo.webp` 是為本單元製作的透明底鉛筆產品圖，用於開場、質量換算與天平情境；第六區塊改用可旋轉的 3D 鉛筆模型。
- 外觀與比例參考公開的 Fusion 360 鉛筆模型：[Vichack18/Pencil-Github-3D-Model](https://github.com/Vichack18/Pencil-Github-3D-Model)。參考其長筆身、削尖木頭、石墨筆芯及金屬筆箍的相對位置；本頁只採用通用鉛筆特徵，未使用該模型檔案或其標誌。
- 鉛筆圖像的木紋、漆面、筆箍和橡皮擦為本單元另行繪製的通用產品示意，不含品牌標誌。
- 質量換算假設每支模型鉛筆約 5 g，僅用於教學示範，不代表一般鉛筆的固定質量。
- `meteorite-recording-opening.png` 是小葵與阿公在實驗室準備記錄隕石資料的故事開場插圖；小葵外觀依人物設定圖，阿公依已確認的人物文字設定描繪。圖片不含文字，說明與對話由頁面呈現。
- `dialogue-character-avatars.png` 是小葵與阿公的並列頭像圖，左側為小葵、右側為阿公；頁面以 CSS 裁切相應半幅，顯示在每段對白旁。

## 視差場景

- `pencil-3d-viewer.js` 以 Three.js 幾何建立完整場景，不使用平面鉛筆貼圖：鉛筆包含六角漆面筆桿、木質筆尖、石墨筆芯、金屬筆箍和橡皮擦；20 cm 直尺以圓角擠出幾何製作，具有可見厚度、尺面、雙側刻線與數字。鉛筆平放在尺面上，筆尖對齊 0 cm。
- 鉛筆與尺使用實際 3D 材質、透視相機和光源；視角改變時，尺面交點和橘色讀值標記隨之改變，鉛筆與尺保持固定。標記放在尺的另一側刻線列，讓端點投影和對應刻度能在同一視角下辨讀。
- 共用量測模型以 18 cm 呈現刻度與估讀；第六區塊使用獨立的視差端點模型，尺上讀值依相機視線與尺面的交點估算，畫面不揭露模型設定長度。
- 建模方式參考 Three.js 官方幾何與材質文件：[ExtrudeGeometry](https://threejs.org/docs/#api/en/geometries/ExtrudeGeometry)、[CylinderGeometry](https://threejs.org/docs/#api/en/geometries/CylinderGeometry)、[CapsuleGeometry](https://threejs.org/docs/#api/en/geometries/CapsuleGeometry)、[MeshPhysicalMaterial](https://threejs.org/docs/#api/en/materials/MeshPhysicalMaterial)。外觀比例參考公開的 [Fusion 360 鉛筆模型](https://github.com/Vichack18/Pencil-Github-3D-Model)，未使用其模型檔案或標誌。
- Three.js 版本：0.186.1。套件授權見 `vendor/three/LICENSE`（MIT）。

若升級 Three.js，需同步檢查授權、模組相依、場景視角及尺面對齊。若調整幾何尺寸，需同步確認模型、端點投影和讀值一致。
