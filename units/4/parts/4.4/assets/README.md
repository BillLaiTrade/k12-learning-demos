
第九區使用 `microscope-studio.mjs/css` 呈現直立式顯微鏡剖面及觀看窗；`microscope-optics.mjs` 依既有 `optics.mjs` 的兩透鏡配置計算連續代表光線。第一步呈現中間實像，後兩步呈現目鏡的虛像；預設不顯示輔助光路。器材外形及圖案放大為示意。

第九區的立體剖面由 `microscope-model.mjs` 使用單元既有 Three.js 製作，材質環境由程式生成，無新增外部圖像素材。光路與三個短標籤依模型投影；模型不可用時仍可操作 SVG 備用剖面。
