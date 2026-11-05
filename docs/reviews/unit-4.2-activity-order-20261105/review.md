# 光路可逆移至第三區

新順序為：01表面反射、02反射定律、03光路可逆、04平面鏡虛像、05物距像距、06平面鏡與曲面鏡，最後仍為潛望鏡小測。六區的DOM、標頭編號、導覽、錨點及活動選取器同步；所有活動內容、圖像、模型和既有操作不改動，見`preservation.json`。

全頁針對性回歸5項（含外層）通過，驗證三種桌面尺寸各七個導覽跳轉、標題／導覽文字／編號順序與進度。原生鍵盤將第二區調到21°，新第三區在尚未自行操作前同步到21°；兩燈可獨立開關，第三區自行調到60°時不改第二區角度；重設關閉兩燈。第四區成像、第五區距離拖曳與鍵盤、末區曲面鏡小熊／法線，以及WebGL失敗備援也通過。記錄為`interaction-checks.log`、`navigation.json`，實際第三區畫面為`third-activity.png`。

既有4.1格式對照回歸8項（含外層）通過：1440、760、390、320寬的頁寬、六區卡片、標頭、編號、副標與頭像、小測格式，以及窄版導覽不遮標題、唯一ID與資源。見`style-checks.log`、`style-layout.json`。

全頁命令：

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test \
 --test-skip-pattern='入口、|第一區實際|潛望鏡素材' \
 tests/unit-4.2-completion.test.cjs
```

格式命令：

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test \
 --test-skip-pattern='1366px|1100px|1024px|900px|781px|780px|768px|761px|700px|650px' \
 tests/unit-4.2-style-alignment.test.cjs
```
