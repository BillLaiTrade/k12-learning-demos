# 3.4第二區原速虛擬實驗室檢視

2026-10-31（臺北時間）。核可圖為approved-mockup.png。已逐張對照桌機desktop.png、手機mobile.png與narrow-320.png：虛擬空間、近景喇叭與接收器、獨立木板、340／680公尺、原速2／4秒與紀錄、數字輸入及同步／暫停配置一致。保留原單元外框與角色對話；所有字、波前、距離、燈光與操作均是網頁層。板位由共同線性尺度校正，680路長精確為340兩倍。器材放大示意，不把場景當真實數百公尺室內音場。

全五套模型與瀏覽器52項通過（full-tests.log），第一區、其餘區及小測回歸正常。其後加寬窄手機較長標籤，補查手機數字輸入，最終模型＋第二區20項全數通過（targeted-final-tests.log）；未反覆重跑無關區。第一區及第三區至頁尾HTML逐字相同，見unchanged-sections.json。

真實performance秒錶量測340／680公尺接收約2.009／4.009秒；原音＋2／4秒返回副本最末峰值0.319657／0.143846。單獨1020公尺6秒、同距合併、暫停／續播、切換取消、數字／滑桿／拖板及鍵盤同步、空白／未完成／過界／小數提交、真實手機拖曳與兩組喇叭及數字欄、背景停止與錯誤重試皆通過。

11種寬度1440／1280／1120／1050／1024／900／768／640／390／360／320px，狀態列、數字輸入與接收圖表無裁字或橫向溢出，原速字樣兩處完整。量測見layout.json；near-arrived.png為2秒附近近牆收到、680公尺到板的暫停畫面。

沒有Safari實機或使用者裝置聽感驗證。維持第四階段，不將局部測試當作整份教材外部驗收。

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 tests/unit-3.4-model.test.mjs tests/unit-3.4-distance-model.test.mjs tests/unit-3.4-distance.test.cjs tests/unit-3.4-reflection.test.cjs tests/unit-3.4.test.cjs
```

版面腳本`/tmp/k12-34-virtual-review.cjs`；公開可設定`VIRTUAL_LAB_URL`、`VIRTUAL_LAB_CAPTURE_DIR`。專項截圖暫存目錄已從舊distance-verified改為`/tmp/k12-34-virtual-verified`。
