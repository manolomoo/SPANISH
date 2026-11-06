// ===========================================================
// 單元引擎：把 G/Q/D（或 W 單字表）資料轉成卡片／測驗／口說結構，
// 並實作回音法播放器、測驗流程、口說流程、短文逐句播放。
// 圖卡：西文／英文、動詞／現在分詞各自獨立，每張走完聽→回音→跟讀才換下一張。
// 禁止使用 speechSynthesis；一律用 AUDIO_MANIFEST 對應的 mp3。
// ===========================================================
"use strict";

const UnitEngine = (function () {
  const ARTICLES = ["El", "La", "Los", "Las", "Un", "Una", "Unos", "Unas"];
  const ARTICLE_TAG = {
    El: "定冠詞・陽性單數（el）",
    La: "定冠詞・陰性單數（la）",
    Los: "定冠詞・陽性複數（los）",
    Las: "定冠詞・陰性複數（las）",
    Un: "不定冠詞・陽性單數（un）",
    Una: "不定冠詞・陰性單數（una）",
    Unos: "不定冠詞・陽性複數（unos）",
    Unas: "不定冠詞・陰性複數（unas）",
  };

  // -------- key parsing（沿用 tools/build_audio.py 的慣例） --------
  // 'en:xxx' -> 英文 xxx；'ex:xxx' -> 西文例字 xxx；其餘 -> 西文原樣
  function parseKeyPair(key) {
    if (key.startsWith("en:")) return { voice: "en", text: key.slice(3) };
    if (key.startsWith("ex:")) return { voice: "es", text: key.slice(3) };
    return { voice: "es", text: key };
  }

  function audioSrcFor(voice, text) {
    const m = window.AUDIO_MANIFEST || {};
    return m[`${voice}|${text}`] || null;
  }

  function normText(s) {
    return String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function segmentsFromKeys(keys, mainEs) {
    // 口說示範仍可列出多個音檔按鈕，但每個按鈕各自播放，不會自動連成一輪。
    // mainEs 有時只是給人看的組合字串（例如「vocabulario ↔ vocabulary」），
    // 本身沒有對應音檔；這種情況改以 keys 列表本身建立播放段落。
    const seen = new Set();
    const segs = [];
    if (audioSrcFor("es", mainEs)) {
      segs.push({ voice: "es", text: mainEs, label: "西文" });
      seen.add("es|" + mainEs);
    }
    (keys || []).forEach((k) => {
      const p = parseKeyPair(k);
      const sig = p.voice + "|" + p.text;
      if (seen.has(sig)) return;
      seen.add(sig);
      const label = p.voice === "en" ? "英文" : segs.length === 0 ? "西文" : "例句";
      segs.push({ voice: p.voice, text: p.text, label });
    });
    return segs;
  }

  // 圖卡練習：西文與英文必須拆成各自獨立的卡片；
  // 動詞與現在分詞、詞條與例句也各自一張，避免同一輪裡接著念。
  function practiceItemsFromCard(c) {
    const raw = [];
    const seen = new Set();
    const push = (voice, text, role) => {
      const t = String(text || "").trim();
      if (!t) return;
      const sig = voice + "|" + normText(t);
      if (seen.has(sig)) return;
      seen.add(sig);
      raw.push({ voice, text: t, role });
    };
    (c.keys || []).forEach((k) => {
      const p = parseKeyPair(k);
      const role = String(k).startsWith("en:") ? "en" : String(k).startsWith("ex:") ? "ex" : "es";
      push(p.voice, p.text, role);
    });
    if (!raw.length && c.es) push(audioSrcFor("en", c.es) && !audioSrcFor("es", c.es) ? "en" : "es", c.es, audioSrcFor("en", c.es) && !audioSrcFor("es", c.es) ? "en" : "es");

    const heads = new Set(
      raw.filter((x) => x.role !== "ex").map((x) => x.voice + "|" + normText(x.text))
    );
    let kept = raw.filter((x) => x.role !== "ex" || !heads.has(x.voice + "|" + normText(x.text)));
    if (!kept.length && c.es) kept = [{ voice: "es", text: String(c.es).trim(), role: "es" }];
    return kept.map((x) => ({
      voice: x.voice,
      text: x.text,
      role: x.role,
      label: x.role === "en" ? "英文" : x.role === "ex" ? "例句" : "西文",
    }));
  }

  function presentPracticeItem(c, item, index, total) {
    if (total === 1) {
      const same = normText(c.es) === normText(item.text);
      return {
        es: same ? c.es : item.text,
        zh: c.zh || "",
        tag: c.tag || (item.role === "en" ? "英文" : item.role === "ex" ? "例句" : ""),
        tip: c.tip || "",
      };
    }
    let zh = c.zh || "";
    let tag = "";
    let tip = "";
    if (item.role === "en") {
      zh = zh.replace(/｜.*$/, "").trim().replace(/（西）/g, "（英）");
      if (!zh) zh = "英文";
      else if (!/英/.test(zh)) zh += "（英文）";
      tag = "英文";
    } else if (item.role === "ex") {
      zh = c.tip || (zh ? "例：" + zh : "例句");
      tag = "例句";
    } else {
      const oneWord = !/\s/.test(item.text);
      const head = normText(String(c.es || "").split(/→|↔/)[0]);
      if (oneWord && /(?:ando|iendo|yendo)$/i.test(item.text) && normText(item.text) !== head) {
        zh = zh ? zh + "（現在分詞）" : "現在分詞";
        tag = "現在分詞";
      } else if (index === 0) {
        tag = c.tag || item.label || "西文";
        tip = c.tip || "";
      } else {
        tag = item.label || c.tag || "西文";
      }
    }
    return { es: item.text, zh, tag, tip };
  }

  // D（口說）項目：若有 pre（照片造句的已知句），示範要先播 pre 再播 a，順序不能顛倒
  function speakSegmentsFromD(d) {
    if (d.keys) return segmentsFromKeys(d.keys, d.a);
    if (d.pre) {
      const segs = [];
      if (audioSrcFor("es", d.pre)) segs.push({ voice: "es", text: d.pre, label: "情境句" });
      if (audioSrcFor("es", d.a)) segs.push({ voice: "es", text: d.a, label: "答案句" });
      return segs;
    }
    return segmentsFromKeys(undefined, d.a);
  }

  // -------- random helpers --------
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function sampleOthers(list, excludeIdx, n) {
    const idxs = shuffle(list.map((_, i) => i).filter((i) => i !== excludeIdx)).slice(0, n);
    return idxs.map((i) => list[i]);
  }
  function sampleArray(list, n) {
    return shuffle(list).slice(0, n);
  }

  // -------- adapters: G/Q/D 格式 (u0, u3, u4, u5) --------
  function fromGQD(unitId, data) {
    const cards = [];
    const aliases = [];
    (data.G || []).forEach((grp, gi) => {
      const [gname, list] = grp;
      const seenInGroup = new Map();
      (list || []).forEach((c, ci) => {
        const legacyId = `${unitId}:c:${gi}:${ci}`;
        const items = practiceItemsFromCard(c);
        let emitted = 0;
        items.forEach((item, si) => {
          const sig = item.voice + "|" + normText(item.text);
          if (seenInGroup.has(sig)) {
            aliases.push({ fromId: legacyId, toId: seenInGroup.get(sig) });
            return;
          }
          const shown = presentPracticeItem(c, item, si, items.length);
          const id = emitted === 0 ? legacyId : `${legacyId}:k${emitted}`;
          emitted++;
          seenInGroup.set(sig, id);
          cards.push({
            id,
            legacyId,
            group: gname,
            es: shown.es,
            zh: shown.zh,
            tag: shown.tag,
            tip: shown.tip,
            pic: c.pic || null,
            col: c.col || null,
            lang: item.voice,
            segments: [{ voice: item.voice, text: item.text, label: item.label }],
          });
        });
      });
    });
    cards.aliases = aliases;
    const quiz = (data.Q || []).map((q, i) => ({
      id: `${unitId}:q:${i}`,
      qText: q.q,
      z: q.z,
      choices: q.o.slice(),
      answer: q.a,
      sayPair: q.say ? parseKeyPair(q.say) : null,
    }));
    const speak = (data.D || []).map((d, i) => ({
      id: `${unitId}:s:${i}`,
      prompt: d.pre ? `已知：${d.pre}\n${d.q}` : d.q,
      answerShow: d.pre ? `${d.pre} ${d.show || d.a}` : d.show || d.a,
      pic: d.pic || null,
      col: d.col || null,
      segments: speakSegmentsFromD(d),
    }));
    return { cards, aliases, quiz, speak, story: [], groups: (data.G || []).map((g) => g[0]) };
  }

  // -------- adapters: W 單字表格式 (u1, u2) --------
  function fromWordlist(unitId, data) {
    const W = data.W || [];
    const cards = W.map((row, i) => {
      const [article, word, zh] = row;
      const full = `${article} ${word}`;
      return {
        id: `${unitId}:c:0:${i}`,
        group: "單字",
        es: full,
        zh,
        tag: ARTICLE_TAG[article] || article,
        tip: "",
        pic: null,
        lang: "es",
        legacyId: `${unitId}:c:0:${i}`,
        segments: [{ voice: "es", text: full, label: "西文" }],
      };
    });

    const quiz = [];
    W.forEach((row, i) => {
      const [article, word, zh] = row;
      const full = `${article} ${word}`;
      quiz.push({
        id: `${unitId}:q:w1:${i}`,
        qText: zh,
        z: "中文 → 西文（含冠詞）",
        choices: [full, ...sampleOthers(W, i, 3).map((r) => `${r[0]} ${r[1]}`)],
        answer: full,
        sayPair: { voice: "es", text: full },
      });
      quiz.push({
        id: `${unitId}:q:w2:${i}`,
        qText: full,
        z: "西文 → 中文",
        choices: [zh, ...sampleOthers(W, i, 3).map((r) => r[2])],
        answer: zh,
        sayPair: { voice: "es", text: full },
      });
      const wrongArticles = ARTICLES.filter((a) => a !== article);
      quiz.push({
        id: `${unitId}:q:w3:${i}`,
        qText: word,
        z: "選出這個字正確的冠詞",
        choices: [article, ...sampleArray(wrongArticles, 3)],
        answer: article,
        sayPair: { voice: "es", text: word },
      });
    });

    const speak = W.map((row, i) => {
      const [article, word, zh] = row;
      const full = `${article} ${word}`;
      return {
        id: `${unitId}:s:w:${i}`,
        prompt: `請用西文說出（含冠詞）：${zh}`,
        answerShow: full,
        pic: null,
        segments: [
          { voice: "es", text: full, label: "冠詞＋名詞" },
          { voice: "es", text: word, label: "單字" },
        ],
      };
    });

    const story = (data.S || []).map((row, i) => ({
      id: `${unitId}:st:${i}`,
      es: row[0],
      zh: row[1],
      segments: [{ voice: "es", text: row[0], label: "西文" }],
    }));

    return { cards, quiz, speak, story, groups: ["單字"] };
  }

  // ===========================================================
  // 回音法：每個單字／句子各自走完「聽 → 回音 → 跟讀」兩輪，才換下一個。
  // 等待時間對齊原站 week00／week03：回音 min(音檔長度, 3) 秒，
  // 跟讀 max(1.5, 音檔長度+1) 秒。音檔長度用 duration/語速。
  // ===========================================================
  function echoWaits(durationSec) {
    const d = typeof durationSec === "number" && isFinite(durationSec) && durationSec > 0 ? durationSec : 0.9;
    return { echo: Math.min(d, 3), shadow: Math.max(1.5, d + 1) };
  }

  function EchoSession(io) {
    this.io = io || {};
    this.gen = 0;
    this.paused = false;
    this.running = false;
    this.index = 0;
    this.cards = [];
    this.jumpTo = null;
  }

  EchoSession.prototype.stop = function () {
    this.gen++;
    this.running = false;
    this.paused = false;
    this.jumpTo = null;
    if (this.io.abort) this.io.abort();
  };

  EchoSession.prototype.pause = function () {
    if (!this.running) return;
    this.paused = true;
  };

  EchoSession.prototype.resume = function () {
    if (!this.running) return;
    this.paused = false;
  };

  EchoSession.prototype.skipTo = function (index) {
    if (!this.running) return;
    if (index < 0) index = 0;
    if (index > this.cards.length) index = this.cards.length;
    this.jumpTo = index;
    if (this.io.abort) this.io.abort();
  };

  EchoSession.prototype.begin = function (cards, index) {
    this.stop();
    this.cards = cards || [];
    this.index = Math.max(0, Math.min(index || 0, Math.max(0, this.cards.length - 1)));
    this.jumpTo = null;
    this.paused = false;
    this.running = this.cards.length > 0;
    const gen = this.gen;
    if (this.running) this._loop(gen);
    else if (this.io.onFinish) this.io.onFinish();
  };

  EchoSession.prototype._loop = async function (gen) {
    const io = this.io;
    while (gen === this.gen && this.index < this.cards.length) {
      const card = this.cards[this.index];
      if (io.onCard) io.onCard(card, this.index, this.cards.length);
      let abortedCard = false;
      for (let round = 1; round <= 2; round++) {
        if (gen !== this.gen) return;
        if (io.onPhase) io.onPhase(card, round, "listen");
        const played = await io.play(card);
        if (gen !== this.gen) return;
        if (played === "abort" || this.jumpTo != null) { abortedCard = true; break; }
        const waits = echoWaits(played && played.duration);
        if (io.onPhase) io.onPhase(card, round, "echo");
        const w1 = await io.wait(waits.echo);
        if (gen !== this.gen) return;
        if (w1 === "abort" || this.jumpTo != null) { abortedCard = true; break; }
        if (io.onPhase) io.onPhase(card, round, "shadow");
        const w2 = await io.wait(waits.shadow);
        if (gen !== this.gen) return;
        if (w2 === "abort" || this.jumpTo != null) { abortedCard = true; break; }
      }
      if (gen !== this.gen) return;
      if (abortedCard) {
        if (this.jumpTo != null) {
          this.index = this.jumpTo;
          this.jumpTo = null;
          continue;
        }
        return;
      }
      if (io.onDoneCard) io.onDoneCard(card);
      if (gen !== this.gen) return;
      if (this.jumpTo != null) {
        this.index = this.jumpTo;
        this.jumpTo = null;
        continue;
      }
      this.index++;
    }
    if (gen !== this.gen) return;
    this.running = false;
    this.paused = false;
    if (io.onFinish) io.onFinish();
  };

  // ===========================================================
  // 回音法播放器（圖卡）
  // ===========================================================
  const PHASE_TEXT = {
    listen: "聽",
    echo: "回音・心裡默念",
    shadow: "跟讀・大聲說出來",
  };

  function renderPic(pic, seedText, explicitColor) {
    return window.renderPic ? window.renderPic(pic, seedText, explicitColor) : document.createElement("div");
  }

  function CardEchoPlayer(container, unitId, allCards, groups) {
    const self = this;
    self.unitId = unitId;
    self.allCards = allCards && allCards.length ? allCards : [];
    self.groups = groups && groups.length > 1 ? groups : [];
    self.filter = null;
    self.idx = 0;
    self.phase = "";
    self.round = 0;
    self.playing = false;
    self.paused = false;
    self.finishedUnit = false;
    self.timer = null;
    self.speed = parseFloat(localStorage.getItem("esp_speed") || "0.8");
    if (![0.6, 0.8, 1].includes(self.speed)) self.speed = 0.8;

    self.audio = new Audio();
    self.audio.preservesPitch = true;
    self.audio.mozPreservesPitch = true;
    self.audio.webkitPreservesPitch = true;

    if (window.Rewards && Rewards.migrateSplitCards) {
      Rewards.migrateSplitCards(unitId, self.allCards, self.allCards.aliases || []);
    }
    if (window.__activeEcho && window.__activeEcho !== self) window.__activeEcho.stop();
    window.__activeEcho = self;

    self.session = new EchoSession({
      onCard: function (card, index) { self.onSessionCard(card, index); },
      onPhase: function (card, round, phase) { self.onSessionPhase(card, round, phase); },
      play: function (card) { return self.playCardAudio(card); },
      wait: function (sec) { return self.waitSec(sec); },
      onDoneCard: function (card) { self.onSessionDone(card); },
      onFinish: function () { self.onSessionFinish(); },
      abort: function () { self.abortPending(); },
    });

    container.innerHTML = `
      <div class="group-chips"></div>
      <div class="stage-counter"></div>
      <div class="big-card" data-echo-phase="">
        <div class="poop-row"></div>
        <div class="pic-slot"></div>
        <div class="lang-pill"></div>
        <div class="es"></div>
        <div class="tag"></div>
        <div class="zh"></div>
        <div class="tip"></div>
        <div class="phase-banner"></div>
        <div class="phase-hint"></div>
      </div>
      <button class="btn primary play-all" data-act="play" type="button">▶ 播放整個單元</button>
      <div class="card-nav">
        <button class="btn ghost" data-act="prev" type="button">⟵ 上一張</button>
        <button class="btn ghost" data-act="next" type="button">下一張 ⟶</button>
      </div>
      <div class="card-nav">
        <button class="btn" data-act="once" type="button">🔊 念一次</button>
        <button class="btn ghost" data-act="pause" type="button" disabled>⏸ 暫停</button>
        <button class="btn ghost" data-act="stop" type="button" disabled>■ 停止</button>
      </div>
      <div class="speed-row"></div>
      <p class="play-help">回音法跟原站一樣：每個單字或句子先聽發音，再心裡默念，然後大聲跟讀。同一個字兩輪都做完，才換下一個。西文和英文、動詞和現在分詞都是各自的卡片，不會接在同一輪裡。按「播放整個單元」會跨分類，把這個單元的圖卡依序走完。</p>
    `;

    self.chipsEl = container.querySelector(".group-chips");
    self.counterEl = container.querySelector(".stage-counter");
    self.cardEl = container.querySelector(".big-card");
    self.poopEl = container.querySelector(".poop-row");
    self.picSlot = container.querySelector(".pic-slot");
    self.langEl = container.querySelector(".lang-pill");
    self.esEl = container.querySelector(".es");
    self.tagEl = container.querySelector(".tag");
    self.zhEl = container.querySelector(".zh");
    self.tipEl = container.querySelector(".tip");
    self.bannerEl = container.querySelector(".phase-banner");
    self.hintEl = container.querySelector(".phase-hint");
    self.speedRow = container.querySelector(".speed-row");
    self.playBtn = container.querySelector('[data-act="play"]');
    self.pauseBtn = container.querySelector('[data-act="pause"]');
    self.stopBtn = container.querySelector('[data-act="stop"]');

    [0.6, 0.8, 1].forEach((sp) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "speed-btn" + (self.speed === sp ? " active" : "");
      b.textContent = sp + "x";
      b.addEventListener("click", () => {
        self.speed = sp;
        localStorage.setItem("esp_speed", String(sp));
        self.speedRow.querySelectorAll(".speed-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        try { self.audio.playbackRate = sp; } catch (e) { /* ignore */ }
      });
      self.speedRow.appendChild(b);
    });

    self.renderChips();
    container.querySelector('[data-act="prev"]').addEventListener("click", () => self.prevCard());
    container.querySelector('[data-act="next"]').addEventListener("click", () => self.nextCard());
    container.querySelector('[data-act="once"]').addEventListener("click", () => self.playOnce());
    self.playBtn.addEventListener("click", () => self.startUnit());
    self.pauseBtn.addEventListener("click", () => self.togglePause());
    self.stopBtn.addEventListener("click", () => self.stop());
    self.cardEl.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      self.skipPhase();
    });

    self.renderCard();
    self.setBanner("", "按「播放整個單元」開始");
    self.hintEl.textContent = "輕點卡片可跳過目前這一段等待";
    self.updateButtons();
  }

  CardEchoPlayer.prototype.viewList = function () {
    if (!this.filter) return this.allCards;
    const list = this.allCards.filter((c) => c.group === this.filter);
    return list.length ? list : this.allCards;
  };

  CardEchoPlayer.prototype.currentCard = function () {
    const list = this.viewList();
    if (!list.length) return null;
    if (this.idx < 0 || this.idx >= list.length) this.idx = 0;
    return list[this.idx];
  };

  CardEchoPlayer.prototype.globalIndexOfCurrent = function () {
    const cur = this.currentCard();
    if (!cur) return 0;
    const i = this.allCards.indexOf(cur);
    return i < 0 ? 0 : i;
  };

  CardEchoPlayer.prototype.renderChips = function () {
    const self = this;
    self.chipsEl.innerHTML = "";
    if (!self.groups.length) return;
    const mk = (label, group) => {
      const chip = document.createElement("button");
      chip.type = "button";
      const on = self.filter === group;
      const curCard = self.currentCard();
      const playingHere = !!(self.playing && group && curCard && curCard.group === group);
      chip.className = "group-chip" + (on ? " active" : "") + (playingHere ? " playing" : "");
      chip.textContent = label;
      chip.addEventListener("click", () => {
        self.stop();
        self.filter = group;
        self.idx = 0;
        self.finishedUnit = false;
        self.renderChips();
        self.renderCard();
        self.setBanner("", "按「播放整個單元」開始");
      });
      return chip;
    };
    self.chipsEl.appendChild(mk("全部", null));
    self.groups.forEach((g) => self.chipsEl.appendChild(mk(g, g)));
  };

  CardEchoPlayer.prototype.clearTimer = function () {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  };

  CardEchoPlayer.prototype.abortPending = function () {
    this.clearTimer();
    if (this._playSafety) {
      clearTimeout(this._playSafety);
      this._playSafety = null;
    }
    try {
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.pause();
    } catch (e) { /* ignore */ }
    if (this._endPlay) {
      const f = this._endPlay;
      this._endPlay = null;
      f("abort");
    }
    if (this._endWait) {
      const f = this._endWait;
      this._endWait = null;
      f("abort");
    }
  };

  CardEchoPlayer.prototype.renderCard = function () {
    const card = this.currentCard();
    const list = this.viewList();
    this.cardEl.dataset.cardId = card ? card.id : "";
    this.cardEl.dataset.echoPhase = this.phase || "";
    if (!card) {
      this.counterEl.textContent = "0 / 0";
      this.esEl.textContent = "（沒有可練習的卡片）";
      this.zhEl.textContent = "";
      this.tagEl.textContent = "";
      this.tipEl.textContent = "";
      this.langEl.textContent = "";
      this.poopEl.textContent = "";
      this.picSlot.innerHTML = "";
      return;
    }
    const pos = this.playing
      ? `整個單元 ${this.globalIndexOfCurrent() + 1} / ${this.allCards.length}`
      : `${this.idx + 1} / ${list.length}`;
    const group = card.group ? ` ・ ${card.group}` : "";
    const round = this.playing && this.round ? ` ・ 第 ${this.round}/2 輪` : "";
    this.counterEl.textContent = pos + group + round;
    const poopKey = `${this.unitId}:card:${card.id}`;
    this.poopEl.textContent = window.Rewards ? Rewards.renderPoop(poopKey) : "";
    this.picSlot.innerHTML = "";
    this.picSlot.appendChild(renderPic(card.pic, card.es, card.col));
    const lang = card.lang === "en" ? "英文" : "西文";
    this.langEl.textContent = lang;
    this.langEl.className = "lang-pill " + (card.lang === "en" ? "lang-en" : "lang-es");
    this.esEl.textContent = card.es || (card.segments[0] && card.segments[0].text) || "";
    this.esEl.classList.toggle("hl", this.phase === "listen");
    const long = (this.esEl.textContent || "").length;
    this.esEl.style.fontSize = long > 48 ? "26px" : long > 28 ? "32px" : "";
    this.tagEl.textContent = card.tag || "";
    this.tagEl.style.display = card.tag ? "" : "none";
    this.zhEl.textContent = card.zh || "";
    this.tipEl.textContent = card.tip || "";
    this.tipEl.style.display = card.tip ? "" : "none";
    this.cardEl.classList.toggle("is-listen", this.phase === "listen");
    this.cardEl.classList.toggle("is-echo", this.phase === "echo");
    this.cardEl.classList.toggle("is-shadow", this.phase === "shadow");
  };

  CardEchoPlayer.prototype.setBanner = function (phase, text) {
    this.bannerEl.className = "phase-banner" + (phase ? " " + phase : "");
    this.bannerEl.textContent = text || "";
  };

  CardEchoPlayer.prototype.updateButtons = function () {
    this.playBtn.disabled = false;
    this.playBtn.textContent = this.playing ? "▶ 播放中…" : "▶ 播放整個單元";
    this.pauseBtn.disabled = !this.playing;
    this.pauseBtn.textContent = this.paused ? "▶ 繼續" : "⏸ 暫停";
    this.stopBtn.disabled = !this.playing && !this.paused;
  };

  CardEchoPlayer.prototype.onSessionCard = function (card, index) {
    this.filter = null;
    this.idx = index;
    this.playing = true;
    this.renderChips();
    this.renderCard();
  };

  CardEchoPlayer.prototype.onSessionPhase = function (card, round, phase) {
    this.phase = phase;
    this.round = round;
    this.renderCard();
    const seg = card.segments && card.segments[0];
    const label = seg ? `${seg.label}｜${seg.text}` : card.es;
    this.setBanner(phase, PHASE_TEXT[phase] || "");
    this.hintEl.textContent = `${label} ・ 第 ${round}/2 輪 ・ 輕點卡片可跳過這一段`;
    this.updateButtons();
  };

  CardEchoPlayer.prototype.onSessionDone = function (card) {
    if (window.Rewards) Rewards.recordCardHeard(this.unitId, card.id);
    this.poopEl.textContent = window.Rewards ? Rewards.renderPoop(`${this.unitId}:card:${card.id}`) : "";
  };

  CardEchoPlayer.prototype.onSessionFinish = function () {
    this.playing = false;
    this.paused = false;
    this.phase = "";
    this.round = 0;
    this.finishedUnit = true;
    this.filter = null;
    this.idx = 0;
    this.renderChips();
    this.renderCard();
    this.setBanner("shadow", "本單元播完");
    this.hintEl.textContent = "已走完這個單元的全部分卡。再按一次會從頭播放。";
    this.updateButtons();
  };

  CardEchoPlayer.prototype.playCardAudio = function (card) {
    const self = this;
    return new Promise((resolve) => {
      let settled = false;
      const finish = (v) => {
        if (settled) return;
        settled = true;
        if (self._playSafety) {
          clearTimeout(self._playSafety);
          self._playSafety = null;
        }
        try {
          self.audio.onended = null;
          self.audio.onerror = null;
        } catch (e) { /* ignore */ }
        if (self._endPlay === finish) self._endPlay = null;
        resolve(v);
      };
      if (self._endPlay) {
        const prev = self._endPlay;
        self._endPlay = null;
        prev("abort");
      }
      self._endPlay = finish;
      const seg = card && card.segments && card.segments[0];
      const src = seg ? audioSrcFor(seg.voice, seg.text) : null;
      if (!src) {
        self._endPlay = null;
        finish({ duration: 0.9, missing: true });
        return;
      }
      try { self.audio.pause(); } catch (e) { /* ignore */ }
      self.audio.onended = null;
      self.audio.onerror = null;
      self.audio.src = src;
      self.audio.playbackRate = self.speed;
      self.audio.onended = () => {
        const intrinsic = self.audio.duration;
        const d = intrinsic && isFinite(intrinsic) ? intrinsic / (self.speed || 1) : 0.9;
        finish({ duration: d });
      };
      self.audio.onerror = () => finish({ duration: 0.9, error: true });
      const armSafety = () => {
        self._playSafety = setTimeout(() => {
          if (self.session && self.session.paused && self.phase === "listen" && self._endPlay === finish) {
            armSafety();
            return;
          }
          const intrinsic = self.audio.duration;
          const d = intrinsic && isFinite(intrinsic) ? intrinsic / (self.speed || 1) : 1;
          finish({ duration: d, timeout: true });
        }, 20000);
      };
      armSafety();
      const p = self.audio.play();
      if (p && p.catch) p.catch(() => finish({ duration: 0.9, blocked: true }));
    });
  };

  CardEchoPlayer.prototype.waitSec = function (sec) {
    const self = this;
    const total = Math.max(0, sec) * 1000;
    return new Promise((resolve) => {
      let settled = false;
      let left = total;
      const finish = (v) => {
        if (settled) return;
        settled = true;
        self.clearTimer();
        if (self._endWait === finish) self._endWait = null;
        resolve(v);
      };
      if (self._endWait) {
        const prev = self._endWait;
        self._endWait = null;
        prev("abort");
      }
      self._endWait = finish;
      const tick = () => {
        if (settled) return;
        if (!self.session || self._endWait !== finish) return;
        if (self.session.gen !== genAtStart) return finish("abort");
        if (self.session.paused) {
          self.timer = setTimeout(tick, 40);
          return;
        }
        if (left <= 0) return finish("ok");
        const slice = Math.min(left, 80);
        const started = performance.now();
        self.timer = setTimeout(() => {
          if (!(self.session && self.session.paused)) left -= performance.now() - started;
          tick();
        }, slice);
      };
      const genAtStart = self.session ? self.session.gen : 0;
      tick();
    });
  };

  CardEchoPlayer.prototype.skipPhase = function () {
    if (!this.playing || this.paused) return;
    if (this.phase === "listen" && this._endPlay) {
      const intrinsic = this.audio.currentTime && this.audio.currentTime > 0.15 ? this.audio.currentTime : 0.8;
      try { this.audio.pause(); } catch (e) { /* ignore */ }
      const f = this._endPlay;
      this._endPlay = null;
      f({ duration: intrinsic / (this.speed || 1), skipped: true });
      return;
    }
    if ((this.phase === "echo" || this.phase === "shadow") && this._endWait) {
      const f = this._endWait;
      this._endWait = null;
      f("ok");
    }
  };

  CardEchoPlayer.prototype.startUnit = function () {
    if (!this.allCards.length) return;
    const start = this.finishedUnit ? 0 : this.globalIndexOfCurrent();
    this.finishedUnit = false;
    this.filter = null;
    this.idx = start;
    this.playing = true;
    this.paused = false;
    this.renderChips();
    this.updateButtons();
    this.session.begin(this.allCards, start);
  };

  CardEchoPlayer.prototype.togglePause = function () {
    if (!this.playing) return;
    if (this.session.paused) {
      this.session.resume();
      this.paused = false;
      if (this.phase === "listen") {
        const p = this.audio.play();
        if (p && p.catch) p.catch(() => {});
      }
    } else {
      this.session.pause();
      this.paused = true;
      if (this.phase === "listen") {
        try { this.audio.pause(); } catch (e) { /* ignore */ }
      }
    }
    this.updateButtons();
  };

  CardEchoPlayer.prototype.stop = function () {
    this.finishedUnit = false;
    if (this.session) this.session.stop();
    this.playing = false;
    this.paused = false;
    this.phase = "";
    this.round = 0;
    this.renderChips();
    this.renderCard();
    this.setBanner("", "已停止");
    this.hintEl.textContent = "停在這張卡。按「播放整個單元」會從這裡繼續。";
    this.updateButtons();
  };

  CardEchoPlayer.prototype.playOnce = function () {
    const self = this;
    const card = self.currentCard();
    if (!card) return;
    self.finishedUnit = false;
    if (self.session) self.session.stop();
    self.playing = false;
    self.paused = false;
    self.phase = "listen";
    self.round = 0;
    self.renderCard();
    self.setBanner("listen", "聽");
    self.hintEl.textContent = "只念一次，不進入回音";
    self.updateButtons();
    self.playCardAudio(card).then((r) => {
      if (r === "abort") return;
      self.phase = "";
      self.renderCard();
      self.setBanner("", "念完了");
      if (window.Rewards) {
        Rewards.recordCardHeard(self.unitId, card.id);
        self.poopEl.textContent = Rewards.renderPoop(`${self.unitId}:card:${card.id}`);
      }
    });
  };

  CardEchoPlayer.prototype.prevCard = function () {
    if (this.playing) {
      if (this.paused) {
        this.session.resume();
        this.paused = false;
        this.updateButtons();
      }
      const at = typeof this.session.index === "number" ? this.session.index : this.globalIndexOfCurrent();
      this.session.skipTo(at - 1);
      return;
    }
    const list = this.viewList();
    if (!list.length) return;
    this.idx = (this.idx - 1 + list.length) % list.length;
    this.finishedUnit = false;
    this.phase = "";
    this.renderCard();
    this.setBanner("", "按「播放整個單元」開始");
  };

  CardEchoPlayer.prototype.nextCard = function () {
    if (this.playing) {
      if (this.paused) {
        this.session.resume();
        this.paused = false;
        this.updateButtons();
      }
      const at = typeof this.session.index === "number" ? this.session.index : this.globalIndexOfCurrent();
      this.session.skipTo(at + 1);
      return;
    }
    const list = this.viewList();
    if (!list.length) return;
    this.idx = (this.idx + 1) % list.length;
    this.finishedUnit = false;
    this.phase = "";
    this.renderCard();
    this.setBanner("", "按「播放整個單元」開始");
  };


  // ===========================================================
  // 測驗
  // ===========================================================
  function QuizRunner(container, unitId, pool, opts) {
    this.container = container;
    this.unitId = unitId;
    this.pool = pool;
    this.sessionSize = Math.min(opts && opts.sessionSize || 12, pool.length);
    this.start();
  }

  QuizRunner.prototype.start = function () {
    this.items = shuffle(this.pool).slice(0, this.sessionSize);
    this.idx = 0;
    this.correct = 0;
    this.answered = false;
    this.render();
  };

  QuizRunner.prototype.render = function () {
    const self = this;
    if (self.idx >= self.items.length) {
      self.renderSummary();
      return;
    }
    const item = self.items[self.idx];
    const choices = shuffle(item.choices);
    self.container.innerHTML = `
      <div class="quiz-progress">第 ${self.idx + 1} / ${self.items.length} 題　・　目前 ${self.correct} 題正確</div>
      <div class="quiz-q">
        <div class="es-big"></div>
        <div class="prompt"></div>
        <div class="btn-row" style="justify-content:center;margin-top:10px">
          <button class="btn small" data-act="say">🔊 念一次</button>
          <button class="btn small ghost" data-act="hint" style="display:none">💡 提示</button>
        </div>
        <div class="quiz-opts"></div>
        <div class="quiz-result-bar">
          <span class="result-text"></span>
          <button class="btn primary" data-act="next" style="display:none">下一題 ⟶</button>
        </div>
      </div>
    `;
    self.container.querySelector(".es-big").textContent = item.qText;
    self.container.querySelector(".prompt").textContent = item.z;
    const optsEl = self.container.querySelector(".quiz-opts");
    choices.forEach((opt) => {
      const b = document.createElement("button");
      b.className = "quiz-opt";
      b.textContent = opt;
      b.addEventListener("click", () => self.choose(opt, b));
      optsEl.appendChild(b);
    });
    self.answered = false;
    self.container.querySelector('[data-act="say"]').addEventListener("click", () => self.playSay(item));
    const hintBtn = self.container.querySelector('[data-act="hint"]');
    if (Rewards.hintUnlocked()) {
      hintBtn.style.display = "";
      hintBtn.addEventListener("click", () => {
        if (self.answered) return;
        const wrongBtns = Array.from(optsEl.querySelectorAll(".quiz-opt")).filter((b) => b.textContent !== item.answer);
        const victim = wrongBtns[Math.floor(Math.random() * wrongBtns.length)];
        if (victim) victim.style.display = "none";
        hintBtn.disabled = true;
      });
    }
    self.container.querySelector('[data-act="next"]').addEventListener("click", () => {
      self.idx++;
      self.render();
    });
  };

  QuizRunner.prototype.playSay = function (item) {
    if (!item.sayPair) return;
    const src = audioSrcFor(item.sayPair.voice, item.sayPair.text);
    if (!src) return;
    const a = new Audio(src);
    a.play().catch(() => {});
  };

  QuizRunner.prototype.choose = function (opt, btn) {
    const self = this;
    if (self.answered) return;
    self.answered = true;
    const item = self.items[self.idx];
    const isCorrect = opt === item.answer;
    if (isCorrect) self.correct++;
    self.container.querySelectorAll(".quiz-opt").forEach((b) => {
      b.style.pointerEvents = "none";
      if (b.textContent === item.answer) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    self.container.querySelector(".result-text").textContent = isCorrect ? "✅ 答對了！" : `❌ 答錯了，正確答案：${item.answer}`;
    self.container.querySelector('[data-act="next"]').style.display = "";
    Rewards.recordQuizAnswer(self.unitId, item.id, isCorrect);
  };

  QuizRunner.prototype.renderSummary = function () {
    const self = this;
    Rewards.recordQuizSession(self.unitId, self.items.length, self.correct);
    const pct = Math.round((self.correct / self.items.length) * 100);
    self.container.innerHTML = `
      <div class="quiz-summary">
        <div class="big-num">${self.correct} / ${self.items.length}</div>
        <div>正確率 ${pct}%${pct >= 80 && self.items.length >= 10 ? "　🏆 達標！" : ""}</div>
        <div class="btn-row" style="justify-content:center;margin-top:16px">
          <button class="btn primary" data-act="again">🔄 再測一次</button>
        </div>
      </div>
    `;
    self.container.querySelector('[data-act="again"]').addEventListener("click", () => self.start());
  };

  // ===========================================================
  // 口說
  // ===========================================================
  function SpeakRunner(container, unitId, items) {
    this.container = container;
    this.unitId = unitId;
    this.items = items;
    this.idx = 0;
    this.render();
  }

  SpeakRunner.prototype.render = function () {
    const self = this;
    const item = self.items[self.idx];
    self.container.innerHTML = `
      <div class="stage-counter">第 ${self.idx + 1} / ${self.items.length} 題</div>
      <div class="speak-card">
        <div class="poop-row" style="position:static"></div>
        <div class="pic-slot"></div>
        <div class="q-text"></div>
        <div class="answer"></div>
        <div class="btn-row" id="segBtns" style="display:none;justify-content:center"></div>
        <button class="btn primary" data-act="reveal">看答案／示範</button>
      </div>
      <div class="card-nav">
        <button class="btn ghost" data-act="prev">⟵ 上一題</button>
        <button class="btn ghost" data-act="next">下一題 ⟶</button>
      </div>
    `;
    self.container.querySelector(".poop-row").textContent = Rewards.renderPoop(`${self.unitId}:speak:${item.id}`);
    const picSlot = self.container.querySelector(".pic-slot");
    if (item.pic || item.col) picSlot.appendChild(renderPic(item.pic, item.prompt, item.col));
    else picSlot.style.display = "none";
    self.container.querySelector(".q-text").textContent = item.prompt;
    const ansEl = self.container.querySelector(".answer");
    ansEl.textContent = item.answerShow;
    self.container.querySelector('[data-act="reveal"]').addEventListener("click", () => self.reveal());
    self.container.querySelector('[data-act="prev"]').addEventListener("click", () => {
      self.idx = Math.max(0, self.idx - 1);
      self.render();
    });
    self.container.querySelector('[data-act="next"]').addEventListener("click", () => {
      self.idx = Math.min(self.items.length - 1, self.idx + 1);
      self.render();
    });
  };

  SpeakRunner.prototype.reveal = function () {
    const self = this;
    const item = self.items[self.idx];
    self.container.querySelector(".answer").classList.add("show");
    const segBtns = self.container.querySelector("#segBtns");
    segBtns.style.display = "flex";
    segBtns.innerHTML = "";
    item.segments.forEach((seg) => {
      const b = document.createElement("button");
      b.className = "btn small";
      b.textContent = `▶ ${seg.label}`;
      b.addEventListener("click", () => {
        const src = audioSrcFor(seg.voice, seg.text);
        if (src) new Audio(src).play().catch(() => {});
      });
      segBtns.appendChild(b);
    });
    const res = Rewards.recordSpeak(self.unitId, item.id);
    self.container.querySelector(".poop-row").textContent = Rewards.renderPoop(`${self.unitId}:speak:${item.id}`);
  };

  // ===========================================================
  // 短文（逐句播放，句間停頓）
  // ===========================================================
  function StoryRunner(container, unitId, lines) {
    this.container = container;
    this.unitId = unitId;
    this.lines = lines;
    this.render();
  }

  StoryRunner.prototype.render = function () {
    const self = this;
    self.container.innerHTML = `
      <div class="btn-row" style="margin-bottom:10px">
        <button class="btn primary" data-act="playall">▶ 全部逐句播放（句間停頓）</button>
      </div>
      <div class="story-list"></div>
    `;
    const list = self.container.querySelector(".story-list");
    self.lines.forEach((line, i) => {
      const row = document.createElement("div");
      row.className = "story-line";
      row.dataset.idx = i;
      row.innerHTML = `
        <div class="n">${i + 1}</div>
        <div class="txt"><div class="es"></div><div class="zh"></div></div>
        <button class="btn small">▶</button>
      `;
      row.querySelector(".es").textContent = line.es;
      row.querySelector(".zh").textContent = line.zh;
      if (Rewards.getPoop(`${self.unitId}:story:${line.id}`) > 0) row.classList.add("heard");
      row.querySelector("button").addEventListener("click", () => self.playLine(i));
      list.appendChild(row);
    });
    self.container.querySelector('[data-act="playall"]').addEventListener("click", () => self.playAll());
  };

  StoryRunner.prototype.playLine = function (i) {
    const self = this;
    const line = self.lines[i];
    const seg = line.segments[0];
    const src = audioSrcFor(seg.voice, seg.text);
    Rewards.recordStory(self.unitId, line.id);
    const row = self.container.querySelector(`.story-line[data-idx="${i}"]`);
    if (row) row.classList.add("heard");
    return new Promise((resolve) => {
      if (!src) {
        resolve();
        return;
      }
      const a = new Audio(src);
      a.onended = () => resolve();
      a.play().catch(() => resolve());
    });
  };

  StoryRunner.prototype.playAll = async function () {
    for (let i = 0; i < this.lines.length; i++) {
      await this.playLine(i);
      await new Promise((r) => setTimeout(r, 700));
    }
  };

  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("click", (e) => {
      const t = e.target && e.target.closest ? e.target.closest(".tab") : null;
      if (!t || !window.__activeEcho) return;
      if (t.dataset.panel !== "cards") window.__activeEcho.stop();
    });
  }

  return {
    parseKeyPair,
    audioSrcFor,
    echoWaits,
    EchoSession,
    fromGQD,
    fromWordlist,
    CardEchoPlayer,
    QuizRunner,
    SpeakRunner,
    StoryRunner,
  };
})();

window.UnitEngine = UnitEngine;
