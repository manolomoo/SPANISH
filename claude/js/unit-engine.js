// ===========================================================
// 單元引擎：把 G/Q/D（或 W 單字表）資料轉成卡片／測驗／口說結構，
// 並實作回音法播放器、測驗流程、口說流程、短文逐句播放。
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

  function segmentsFromKeys(keys, mainEs) {
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
    (data.G || []).forEach((grp, gi) => {
      const [gname, list] = grp;
      (list || []).forEach((c, ci) => {
        cards.push({
          id: `${unitId}:c:${gi}:${ci}`,
          group: gname,
          es: c.es,
          zh: c.zh,
          tag: c.tag || "",
          tip: c.tip || "",
          pic: c.pic || null,
          col: c.col || null,
          segments: segmentsFromKeys(c.keys, c.es),
        });
      });
    });
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
    return { cards, quiz, speak, story: [], groups: (data.G || []).map((g) => g[0]) };
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
        segments: [
          { voice: "es", text: full, label: "冠詞＋名詞" },
          { voice: "es", text: word, label: "單字" },
        ],
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
  // 回音法播放器（圖卡）
  // ===========================================================
  function renderPic(pic, seedText, explicitColor) {
    return window.renderPic ? window.renderPic(pic, seedText, explicitColor) : document.createElement("div");
  }

  function CardEchoPlayer(container, unitId, allCards, groups) {
    const self = this;
    self.unitId = unitId;
    self.allCards = allCards;
    self.groups = groups && groups.length > 1 ? groups : [];
    self.cards = allCards;
    self.idx = 0;
    self.segIdx = 0;
    self.round = 1;
    self.phase = "listen"; // listen -> echo -> shadow
    self.timer = null;
    self.paused = false;
    self.speed = parseFloat(localStorage.getItem("esp_speed") || "1");

    self.audio = new Audio();
    self.audio.preservesPitch = true;
    self.audio.mozPreservesPitch = true;
    self.audio.webkitPreservesPitch = true;

    container.innerHTML = `
      <div class="group-chips"></div>
      <div class="stage-counter"></div>
      <div class="big-card">
        <div class="poop-row"></div>
        <div class="pic-slot"></div>
        <div class="es"></div>
        <div class="tag"></div>
        <div class="zh"></div>
        <div class="tip"></div>
        <div class="phase-banner"></div>
        <div class="phase-hint"></div>
      </div>
      <div class="card-nav">
        <button class="btn ghost" data-act="prev">⟵ 上一張</button>
        <button class="btn" data-act="replay">🔁 念一次</button>
        <button class="btn ghost" data-act="pause">⏸ 暫停</button>
        <button class="btn ghost" data-act="next">下一張 ⟶</button>
      </div>
      <div class="speed-row"></div>
    `;

    self.chipsEl = container.querySelector(".group-chips");
    self.counterEl = container.querySelector(".stage-counter");
    self.cardEl = container.querySelector(".big-card");
    self.poopEl = container.querySelector(".poop-row");
    self.picSlot = container.querySelector(".pic-slot");
    self.esEl = container.querySelector(".es");
    self.tagEl = container.querySelector(".tag");
    self.zhEl = container.querySelector(".zh");
    self.tipEl = container.querySelector(".tip");
    self.bannerEl = container.querySelector(".phase-banner");
    self.hintEl = container.querySelector(".phase-hint");
    self.speedRow = container.querySelector(".speed-row");
    self.pauseBtn = container.querySelector('[data-act="pause"]');

    [0.6, 0.8, 1].forEach((sp) => {
      const b = document.createElement("button");
      b.className = "speed-btn" + (self.speed === sp ? " active" : "");
      b.textContent = sp + "x";
      b.addEventListener("click", () => {
        self.speed = sp;
        localStorage.setItem("esp_speed", String(sp));
        self.speedRow.querySelectorAll(".speed-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        self.audio.playbackRate = sp;
      });
      self.speedRow.appendChild(b);
    });

    self.renderChips();

    container.querySelector('[data-act="prev"]').addEventListener("click", () => self.prevCard());
    container.querySelector('[data-act="next"]').addEventListener("click", () => self.nextCard());
    container.querySelector('[data-act="replay"]').addEventListener("click", () => self.playCurrentSegment());
    self.pauseBtn.addEventListener("click", () => self.togglePause());
    self.cardEl.style.cursor = "pointer";
    self.cardEl.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      self.skipPhase();
    });

    self.startCard(0);
  }

  CardEchoPlayer.prototype.renderChips = function () {
    const self = this;
    self.chipsEl.innerHTML = "";
    if (!self.groups.length) return;
    const mk = (label, group) => {
      const chip = document.createElement("div");
      chip.className = "group-chip" + (self.activeGroup === group ? " active" : "");
      chip.textContent = label;
      chip.addEventListener("click", () => {
        self.activeGroup = group;
        self.cards = group ? self.allCards.filter((c) => c.group === group) : self.allCards;
        if (!self.cards.length) { self.activeGroup = null; self.cards = self.allCards.slice(); }
        self.renderChips();
        self.startCard(0);
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

  CardEchoPlayer.prototype.startCard = function (idx) {
    this.clearTimer();
    this.audio.pause();
    if (!this.cards || !this.cards.length) {
      this.activeGroup = null;
      this.cards = (this.allCards || []).slice();
      if (!this.cards.length) {
        if (this.wordEl) this.wordEl.textContent = "（沒有可練習的卡片）";
        return;
      }
    }
    this.idx = Math.max(0, Math.min(idx, this.cards.length - 1));
    this.segIdx = 0;
    this.round = 1;
    this.phase = "listen";
    this.paused = false;
    this.pauseBtn.textContent = "⏸ 暫停";
    this.renderCard();
    this.runPhase();
  };

  CardEchoPlayer.prototype.renderCard = function () {
    const card = this.cards[this.idx];
    if (!card) return;
    this.counterEl.textContent = `第 ${this.idx + 1} / ${this.cards.length} 張`;
    this.poopEl.textContent = Rewards.renderPoop(`${this.unitId}:card:${card.id}`);
    this.picSlot.innerHTML = "";
    this.picSlot.appendChild(renderPic(card.pic, card.es, card.col));
    this.esEl.textContent = card.es;
    this.tagEl.textContent = card.tag || "";
    this.tagEl.style.display = card.tag ? "" : "none";
    this.zhEl.textContent = card.zh || "";
    this.tipEl.textContent = card.tip || "";
    this.tipEl.style.display = card.tip ? "" : "none";
  };

  CardEchoPlayer.prototype.currentSegment = function () {
    const card = this.cards[this.idx];
    return card ? card.segments[this.segIdx] : null;
  };

  CardEchoPlayer.prototype.playCurrentSegment = function () {
    const seg = this.currentSegment();
    if (!seg) return;
    const src = audioSrcFor(seg.voice, seg.text);
    if (!src) return;
    this.audio.src = src;
    this.audio.playbackRate = this.speed;
    this.audio.currentTime = 0;
    this.audio.play().catch(() => {});
  };

  CardEchoPlayer.prototype.setBanner = function (phase, text) {
    this.bannerEl.className = "phase-banner " + phase;
    this.bannerEl.textContent = text;
  };

  CardEchoPlayer.prototype.runPhase = function () {
    const self = this;
    const card = self.cards[self.idx];
    if (!card) return;
    const seg = self.currentSegment();
    if (!seg) {
      self.finishCard();
      return;
    }
    const hint = `詞 ${self.segIdx + 1}/${card.segments.length}（${seg.label}：${seg.text}） ・ 第 ${self.round}/2 輪 ・ 輕點卡片可跳過`;
    self.hintEl.textContent = hint;

    if (self.phase === "listen") {
      self.setBanner("listen", "🎧 聽");
      const src = audioSrcFor(seg.voice, seg.text);
      if (src) {
        self.audio.src = src;
        self.audio.playbackRate = self.speed;
        self.audio.currentTime = 0;
        self.audio.onended = () => {
          if (!self.paused) self.timer = setTimeout(() => self.setPhase("echo"), 250);
        };
        self.audio.play().catch(() => {
          self.timer = setTimeout(() => self.setPhase("echo"), 900);
        });
      } else {
        self.timer = setTimeout(() => self.setPhase("echo"), 900);
      }
    } else if (self.phase === "echo") {
      self.setBanner("echo", "🔁 回音（心裡默念一次）");
      if (!self.paused) self.timer = setTimeout(() => self.setPhase("shadow"), 1600);
    } else if (self.phase === "shadow") {
      self.setBanner("shadow", "🗣 跟讀（大聲說出來）");
      if (!self.paused) self.timer = setTimeout(() => self.advance(), 2200);
    }
  };

  CardEchoPlayer.prototype.setPhase = function (phase) {
    this.clearTimer();
    this.phase = phase;
    this.runPhase();
  };

  CardEchoPlayer.prototype.advance = function () {
    this.clearTimer();
    if (this.round < 2) {
      this.round++;
      this.phase = "listen";
      this.runPhase();
      return;
    }
    this.round = 1;
    this.segIdx++;
    const card = this.cards[this.idx];
    if (card && this.segIdx < card.segments.length) {
      this.phase = "listen";
      this.runPhase();
    } else {
      this.finishCard();
    }
  };

  CardEchoPlayer.prototype.skipPhase = function () {
    this.clearTimer();
    this.audio.pause();
    if (this.phase === "listen") this.setPhase("echo");
    else if (this.phase === "echo") this.setPhase("shadow");
    else this.advance();
  };

  CardEchoPlayer.prototype.togglePause = function () {
    this.paused = !this.paused;
    if (this.paused) {
      this.clearTimer();
      this.audio.pause();
      this.pauseBtn.textContent = "▶ 繼續";
    } else {
      this.pauseBtn.textContent = "⏸ 暫停";
      this.runPhase();
    }
  };

  CardEchoPlayer.prototype.finishCard = function () {
    const card = this.cards[this.idx];
    this.setBanner("shadow", "✅ 完成！可切換下一張");
    this.hintEl.textContent = "已標記練習紀錄";
    Rewards.recordCardHeard(this.unitId, card.id);
    this.poopEl.textContent = Rewards.renderPoop(`${this.unitId}:card:${card.id}`);
  };

  CardEchoPlayer.prototype.prevCard = function () {
    this.startCard(this.idx - 1 < 0 ? 0 : this.idx - 1);
  };
  CardEchoPlayer.prototype.nextCard = function () {
    this.startCard(this.idx + 1 >= this.cards.length ? this.cards.length - 1 : this.idx + 1);
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

  return {
    parseKeyPair,
    audioSrcFor,
    fromGQD,
    fromWordlist,
    CardEchoPlayer,
    QuizRunner,
    SpeakRunner,
    StoryRunner,
  };
})();

window.UnitEngine = UnitEngine;
