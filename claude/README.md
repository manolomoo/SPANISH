# 西班牙文跟讀練習站

繁體中文介面、手機優先的西班牙文跟讀／練習站。純前端靜態網站，無後端、無追蹤，所有進度存在瀏覽器 `localStorage`。

部署目標：`https://manolomoo.github.io/SPANISH/claude/`（所有資源都用相對路徑，可在子目錄運作，也可直接雙擊打開或用任何靜態伺服器跑）。

## 如何啟動

```bash
cd /workspace/spanish-claude
python3 -m http.server 8000
# 瀏覽器開 http://localhost:8000/index.html
```

## 檔案結構

```
index.html          首頁：RPG 角色卡摘要 + 單元列表（黑狗徽章小圖示）
u0.html              單元 0・文法術語（工具單元）
u1.html              單元 1・冠詞
u2.html              單元 2・冠詞＋單字（含短文）
u3.html              單元 3・動詞 1（10 個常用動詞）
u4.html              單元 4・Estar + 現在分詞
u5.html              單元 5・Ser + 形容詞・顏色（含陰性 vs 陽性）
css/style.css        共用樣式（手機優先、深淺色主題、所有元件 class）
js/app.js            共用小工具：UNITS 清單設定、$/$all/el DOM 捷徑、emoji/色塊渲染、主題切換、topbar
js/rewards.js        RPG（XP／等級／稱號／能力）＋ 黑狗徽章 ＋ 💩 練習標記，全部存 localStorage
js/unit-engine.js    單元引擎：把 G/Q/D 或 W 單字表轉成卡片／測驗／口說資料，並實作回音法播放器、測驗、口說、短文
data/u0-data.js …… data/u5-data.js   各單元內容（window.UNIT_DATA.<unit>，G/Q/D 或 W/S 格式），由 tools/build_audio.py 從 spec 產生
data/audio-manifest.js  "voice|text" -> "audio/xxx.mp3" 的對照表，所有頁面共用
audio/*.mp3          預先合成的西文（Elvira）／英文（Jenny）語音，96kbps
spec/*.json          原始內容來源（content.json 給 u0/u3/u4/u5，u1.json/u2.json 給冠詞＋單字單元）
handouts/*.txt       講義 OCR 文字（輔助理解用，內容以 json 為準；其中兩份是無關的日文不動產文件，與西文學習內容無關，已忽略）
tools/verify_audio.js  在 Node vm 裡跑 fromGQD/fromWordlist，核對每個單元每張卡片/測驗/口說/短文用到的 voice|text 是否都能在 audio-manifest 裡找到實際存在的 mp3 檔（`node tools/verify_audio.js u0 u1 u2 u3 u4 u5`）
tools/build_audio.py 從 spec 產生 audio/*.mp3 + data/audio-manifest.js + data/<unit>-data.js
audio_get.py          單字/句子 -> mp3 的底層工具（呼叫 edge-tts Elvira/Jenny，重用 /workspace/esa 快取，做成 96kbps）
```

## 架構說明

### 資料流
1. `spec/*.json` 是人看得懂的內容來源：
   - `u0`（以及之後的 `u3`/`u4`/`u5`）用 **G**（圖卡分組）/**Q**（測驗）/**D**（口說）格式。
   - `u1`/`u2` 用 **W**（`[冠詞, 單字, 中文]` 三元組）格式，`u2` 另外有 **S**（短文句子陣列）。
2. `tools/build_audio.py <unit>` 讀 spec，蒻出所有需要發音的 (語音, 文字) 配對，呼叫 `audio_get.py` 合成/快取 mp3，寫出：
   - `data/<unit>-data.js`：原始 json 包成 `window.UNIT_DATA.<unit>`
   - `data/audio-manifest.js`：合併所有單元的 `"voice|text" -> "audio/xxx.mp3"` 對照（同一句子/單字的音檔只合成一次，之後其他單元重複用到會自動命中快取）
3. 頁面載入 `data/audio-manifest.js` + `data/<unit>-data.js` 之後，`js/unit-engine.js` 的 `fromGQD()` 或 `fromWordlist()` 會把原始 json **轉成統一的卡片／測驗／口說資料結構**（不手寫死 HTML）：
   - 每張卡片有 `segments: [{voice, text, label}, ...]`——這就是回音法要依序播放、各自完整走「聽→回音→跟讀」的音檔段落。
   - u1/u2 的 W 單字表沒有現成的測驗/口說題目，所以 `fromWordlist()` 會在前端**用單字表自動產生**三種測驗題型（中譯西含冠詞、西譯中、選正確冠詞）與口說題目。

### 回音法播放器（`UnitEngine.CardEchoPlayer`）
- 西文與英文、動詞與現在分詞、詞條與例句都拆成**各自一張卡**。每張卡只有一個音檔，走完自己的回音才換下一張，不會把西文＋英文或動詞＋現在分詞當成同一輪。
- 節奏對齊原站：`聽`（播放 mp3）→ `回音`（心裡默念，等待 `min(音檔秒數, 3)`）→ `跟讀`（大聲說，等待 `max(1.5, 音檔秒數+1)`），每個字兩輪。
- 「播放整個單元」從目前這張開始，**跨分類**把這個單元的圖卡依序走完。暫停會停住音檔與計時，繼續從同一階段接著；停止會清掉音檔與計時，停在目前卡片。上一張／下一張會取消進行中的音檔，避免兩段聲音重疊。
- 「念一次」只播目前這張，不進入回音。語速 0.6x／0.8x／1x（預設 0.8x，`audio.playbackRate` + `preservesPitch`，不用 `speechSynthesis`）。輕點卡片可跳過目前這一段等待。
- 每張卡有自己的 💩（最多 4）。舊版合併卡的練習紀錄會複製到拆開的新卡，不另加 XP、也不清掉。

### 測驗（`UnitEngine.QuizRunner`）
- 每次隨機抽一批題目（預設 12 題或全部題庫，取較小者），四選一，答對/答錯即時標色、可播放題目發音、下一題；答完整批後顯示正確率摘要，寫入 `Rewards.recordQuizSession()` 供「單次 ≥10 題且正確率 ≥80%」黑狗戴皇冠判斷。
- 等級 ≥5 解鎖「💡 提示」能力：可刪掉一個錯誤選項。

### 口說（`UnitEngine.SpeakRunner`）
- 先看中文題目自己說，按「看答案／示範」後顯示西文答案，並列出每個音檔段落的播放鍵（示範發音），計入 💩 與 XP。

### 短文（`UnitEngine.StoryRunner`，給 u2 用）
- 逐句列出，每句可單獨播放；「全部逐句播放」會一句一句播，句間停頓 700ms，不會整段連播。

### 獎勵系統（`js/rewards.js`）
- **💩 練習標記**：每個卡片／測驗題／口說題／短文句子各自一個 key，練過 +1，最多 4 個，存 `localStorage`。
- **黑狗徽章**：每單元每種題型（圖卡／測驗／口說／短文）都有徽章：做過 → 黑狗 🐕；達標 → 黑狗戴皇冠 👑；全部題型都戴皇冠 → 該單元顯示「黑狗王」橫幅。達標規則：
  - 圖卡：該單元所有卡片都聽過一次（跑完三階段）
  - 測驗：單次作答 ≥10 題且正確率 ≥80%
  - 口說：累積練過 ≥5 個不同項目
  - 短文：每一句都播放過
- **RPG**：全站累積 XP／等級／稱號（西班牙文狗主題，如「幼犬 Cachorro」→「犬王 Rey Can」）。XP 規則：答對 > 答錯、新項目 > 重複練習。三種能力加成：
  1. 🔥 連擊加成：連續答對 ≥3 題，之後每題再 +2 XP
  2. 🌅 每日前 5 次 ×2：每天前 5 次會給 XP 的動作雙倍
  3. 💡 刪錯提示：等級 ≥5 解鎖，測驗可刪掉一個錯誤選項
  首頁角色卡顯示等級／XP 條／稱號／能力清單；練習時畫面下方會跳出 `+N XP` 浮動提示（升級時提示更明顯）。

## 目前完成度
- ✅ `index.html`：角色卡、6 個單元全部是可點進去的連結（u0–u5），無任何「即將推出」stub
- ✅ `u0.html`：52 張術語圖卡（3 組：術語卡／西英對照／例句標詞性）、81 題測驗、29 題口說
- ✅ `u1.html`：24 個冠詞＋名詞單字卡、前端自動生成 72 題測驗題庫（中譯西含冠詞／西譯中／選冠詞三種題型）、24 題口說
- ✅ `u2.html`：29 個冠詞＋單字卡、87 題測驗、29 題口說、20 句短文（逐句播放＋全部逐句播放，句間停頓 700ms）
- ✅ `u3.html`：10 個動詞（estar/hacer/leer/jugar/vestir/hablar/mirar/ver/caminar/coger）共 70 張圖卡、60 題測驗、30 題口說
- ✅ `u4.html`：estar 變化＋現在分詞＋「照片造句」（先給 `Hay...` 情境句，再練 estar+分詞描述照片），26 張圖卡、22 題測驗、11 題口說
- ✅ `u5.html`：陰性 vs 陽性（西文＋英文雙語發音）、顏色（真實色票色塊，非隨機色）、Ser 變化、Ser+形容詞，88 張圖卡、52 題測驗、34 題口說
- ✅ 回音法播放器、測驗、口說、短文引擎、RPG／黑狗徽章／💩 全單元共用同一套 `js/unit-engine.js`

## 實作時修正的資料/程式 bug
- `spec/content.json` 的 u5「陰性 vs 陽性」組，`masculine`/`feminine`/`singular`/`plural` 等英文詞的 `keys` 沒有照既有慣例加 `en:` 前綴（u0 已正確使用該慣例），導致這些英文詞會被當成西文字串送去 Elvira 合成、發音錯誤；已依 u0 的慣例修正該組 9 張卡片的 `keys`，重新用 `tools/build_audio.py u5` 產生對應的 Jenny 英文發音。
- `js/app.js` 的 `renderPic()` 原本只支援 emoji 或雜湊色塊，顏色單元（u5「顏色」組）的 `pic: ["sw", n]` + `col: "#xxxxxx"` 並未真的用指定色票顯示；已加上 `explicitColor` 參數，`fromGQD()` 把 `card.col` 傳過去，色塊單元現在顯示真實顏色（紅/藍/綠/黃/粉/橘/黑/白）。
- `js/unit-engine.js` 內有一個局部 `renderPic(pic, seedText)` wrapper 轉呼叫 `window.renderPic`，卻沒有把新增的第三個 `explicitColor` 參數往下傳，導致色票修正一開始沒有生效；已修正 wrapper 簽章。
- u4「照片造句」的 `D`（口說）題目有 `pre` 欄位（先給的情境句，如 `Hay un niño en la foto.`），原本的 `fromGQD()` 完全沒讀取 `pre`，口說題目只會顯示通用的填空模板、看不到具體情境，示範發音也只有答案句、漏播情境句；已讓 `prompt`／`answerShow`／`segments`（新增 `speakSegmentsFromD()`）都把 `pre` 接進來，示範時先播情境句、再播答案句，並在口說卡片新增 `pic-slot` 顯示照片/色塊。
- 新增 `tools/verify_audio.js`：在 Node `vm` 裡跑 `fromGQD`/`fromWordlist`，核對 u0–u5 全部卡片／測驗／口說／短文用到的 `voice|text` 是否都在 `audio-manifest.js` 裡對應到實際存在的 mp3（目前 1119 個參照全數命中）。

## 自測紀錄
- 用 `node --check` 驗證 `js/*.js`、`data/*.js` 語法
- 用 `node tools/verify_audio.js u0 u1 u2 u3 u4 u5` 核對全部單元的音檔參照，1119 筆全部命中
- 用 Python Playwright（headless Chromium，viewport 390×760 模擬 iPhone 寬度）對 `index.html`／`u0`–`u5.html` 做：
  - 載入後檢查 console error／pageerror（全部為 0）
  - 單元頁：切換圖卡／測驗／口說／（u2 另有短文）分頁、點擊卡片走完回音法階段、切下一張、答一題測驗、看口說答案與示範按鈕、u2 短文逐句播放＋標記已聽
  - 確認 u5「陰性 vs 陽性」卡片第二段音檔確實標示「英文」且文字正確（如 masculine/feminine），u4 口說示範會先播情境句再播答案句（2 個示範按鈕）
  - 確認 u5「顏色」組卡片的色塊背景色等於 `content.json` 裡的 `col`（例：Rojo → `rgb(229, 57, 53)` = `#e53935`）
  - 首頁單元列表 6 個全部是可點連結、0 個 stub
  - 截圖檢查 390px 寬版面（首頁角色卡／單元列表、u5 色塊卡片、u2 短文列表）排版正常
- 確認全站無 `speechSynthesis`（僅 `unit-engine.js` 開頭註解提到禁止使用），所有發音一律走 `AUDIO_MANIFEST` 對應的 mp3。圖卡已改成一張一個音檔：西文／英文、動詞／現在分詞各自走完聽→回音→跟讀兩輪才換下一張；「播放整個單元」會跨分類連續播放
- 確認 `index.html`／`u0`–`u5.html` 內所有資源參照都是 `./` 開頭的相對路徑，可在 GitHub Pages 的 `/claude/` 子目錄下正常運作
