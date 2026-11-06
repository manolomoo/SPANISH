// ===========================================================
// 獎勵模組：RPG（XP／等級／稱號／能力）＋ 黑狗徽章 ＋ 💩 練習標記
// 全部存在 localStorage，無後端
// ===========================================================
"use strict";

const Rewards = (function () {
  const KEY = "esp_progress_v1";
  const POOP_MAX = 4;
  const DAILY_BONUS_COUNT = 5; // 每天前 N 次練習動作 XP ×2
  const COMBO_THRESHOLD = 3; // 連續答對 >= 3 題開始加成
  const HINT_UNLOCK_LEVEL = 5;

  const TITLES = [
    "幼犬 Cachorro",
    "好奇小狗 Perrito Curioso",
    "學徒犬 Perro Aprendiz",
    "勤奮獵犬 Perro Aplicado",
    "雙語獵犬 Perro Políglota",
    "西語獵人 Cazador de Palabras",
    "智慧老犬 Perro Sabio",
    "草原之狼 Lobo de la Pampa",
    "傳說牧羊犬 Pastor Legendario",
    "犬王 Rey Can",
  ];

  const ABILITIES = [
    { key: "combo", name: "🔥 連擊加成", desc: "連續答對 ≥3 題，之後每題再 +2 XP", active: () => true },
    { key: "daily", name: "🌅 每日前 5 次 ×2", desc: "每天前 5 次練習動作，XP 雙倍", active: () => true },
    { key: "hint", name: "💡 刪錯提示", desc: `等級 ≥${HINT_UNLOCK_LEVEL} 解鎖：測驗可刪除一個錯誤選項`, active: (lv) => lv >= HINT_UNLOCK_LEVEL },
  ];

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function defaultState() {
    return { xp: 0, level: 1, today: todayStr(), todayCount: 0, combo: 0, poop: {}, units: {} };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const st = JSON.parse(raw);
      return Object.assign(defaultState(), st);
    } catch (e) {
      return defaultState();
    }
  }

  function saveState(st) {
    localStorage.setItem(KEY, JSON.stringify(st));
  }

  function ensureUnit(st, unit) {
    if (!st.units[unit]) st.units[unit] = { cardsSeen: [], quizSessions: [], speakSeen: [], storySeen: [] };
    return st.units[unit];
  }

  // -------- leveling --------
  function levelInfoForXp(xp) {
    let level = 1;
    let total = 0;
    let need = 100;
    while (xp >= total + need) {
      total += need;
      level++;
      need = 100 + (level - 1) * 40;
    }
    return { level, xpIntoLevel: xp - total, xpForThisLevel: need };
  }

  function titleForLevel(level) {
    const i = Math.min(level, TITLES.length) - 1;
    return TITLES[Math.max(0, i)];
  }

  // -------- toast --------
  function showToast(text, strong) {
    let t = document.querySelector(".xp-toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "xp-toast";
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.style.fontSize = strong ? "15px" : "";
    t.classList.add("show");
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(() => t.classList.remove("show"), strong ? 3000 : 1800);
  }

  // -------- core XP application (mutates st, caller saves) --------
  function _applyXP(st, base, opts) {
    opts = opts || {};
    const today = todayStr();
    if (st.today !== today) {
      st.today = today;
      st.todayCount = 0;
    }
    let amt = base;
    const tags = [];
    if (st.todayCount < DAILY_BONUS_COUNT) {
      amt *= 2;
      tags.push("🌅×2");
    }
    st.todayCount++;
    if (opts.correct === true) {
      st.combo = (st.combo || 0) + 1;
      if (st.combo >= COMBO_THRESHOLD) {
        amt += 2;
        tags.push("🔥+2");
      }
    } else if (opts.correct === false) {
      st.combo = 0;
    }
    st.xp += amt;
    const before = st.level;
    const info = levelInfoForXp(st.xp);
    st.level = info.level;
    showToast(`+${amt} XP${tags.length ? " " + tags.join(" ") : ""}`);
    if (info.level > before) {
      showToast(`🎉 升級！Lv.${info.level} ${titleForLevel(info.level)}`, true);
    }
    return amt;
  }

  function addXP(base, opts) {
    const st = loadState();
    const amt = _applyXP(st, base, opts);
    saveState(st);
    return amt;
  }

  // -------- poop (💩 練習標記，每項最多 4) --------
  function recordPoop(st, itemKey) {
    const cur = st.poop[itemKey] || 0;
    st.poop[itemKey] = Math.min(POOP_MAX, cur + 1);
    return st.poop[itemKey];
  }

  function getPoop(itemKey) {
    return (loadState().poop || {})[itemKey] || 0;
  }

  function renderPoop(itemKey) {
    const n = getPoop(itemKey);
    return n > 0 ? "💩".repeat(n) : "";
  }

  // -------- recording practice events --------
  // 舊版一張卡含多個音檔（西文＋英文、動詞＋現在分詞）。拆開後把原卡片的
  // 「聽過」與 💩 複製到拆出來的新卡，不另加 XP、不清掉原紀錄。
  function migrateSplitCards(unitId, cards, aliases) {
    const groups = new Map();
    (cards || []).forEach((c) => {
      if (!c || !c.legacyId) return;
      if (!groups.has(c.legacyId)) groups.set(c.legacyId, []);
      groups.get(c.legacyId).push(c.id);
    });
    const st = loadState();
    const u = ensureUnit(st, unitId);
    st.poop = st.poop || {};
    let changed = false;
    const grant = (fromId, toId) => {
      if (!fromId || !toId || fromId === toId) return;
      const heard = u.cardsSeen.includes(fromId);
      const poop = st.poop[`${unitId}:card:${fromId}`] || 0;
      if (heard && !u.cardsSeen.includes(toId)) {
        u.cardsSeen.push(toId);
        changed = true;
      }
      const k = `${unitId}:card:${toId}`;
      if (poop > 0 && (st.poop[k] || 0) < poop) {
        st.poop[k] = poop;
        changed = true;
      }
    };
    groups.forEach((ids, legacyId) => {
      ids.forEach((id) => grant(legacyId, id));
    });
    (aliases || []).forEach((a) => grant(a.fromId, a.toId));
    if (changed) saveState(st);
    return changed;
  }

  function recordCardHeard(unit, itemId) {
    const st = loadState();
    const u = ensureUnit(st, unit);
    const isNew = !u.cardsSeen.includes(itemId);
    if (isNew) u.cardsSeen.push(itemId);
    recordPoop(st, `${unit}:card:${itemId}`);
    _applyXP(st, isNew ? 3 : 1);
    saveState(st);
    return { isNew, poop: st.poop[`${unit}:card:${itemId}`] };
  }

  function recordQuizAnswer(unit, itemId, correct) {
    const st = loadState();
    const u = ensureUnit(st, unit);
    recordPoop(st, `${unit}:quiz:${itemId}`);
    const base = correct ? 6 : 1;
    _applyXP(st, base, { correct });
    saveState(st);
    return { poop: st.poop[`${unit}:quiz:${itemId}`] };
  }

  function recordQuizSession(unit, total, correct) {
    const st = loadState();
    const u = ensureUnit(st, unit);
    u.quizSessions.push({ total, correct, ts: Date.now() });
    if (u.quizSessions.length > 30) u.quizSessions.shift();
    saveState(st);
  }

  function recordSpeak(unit, itemId) {
    const st = loadState();
    const u = ensureUnit(st, unit);
    const isNew = !u.speakSeen.includes(itemId);
    if (isNew) u.speakSeen.push(itemId);
    recordPoop(st, `${unit}:speak:${itemId}`);
    _applyXP(st, isNew ? 4 : 2);
    saveState(st);
    return { isNew };
  }

  function recordStory(unit, itemId) {
    const st = loadState();
    const u = ensureUnit(st, unit);
    const isNew = !u.storySeen.includes(itemId);
    if (isNew) u.storySeen.push(itemId);
    recordPoop(st, `${unit}:story:${itemId}`);
    _applyXP(st, isNew ? 3 : 1);
    saveState(st);
    return { isNew };
  }

  // -------- badges (黑狗徽章) --------
  // totals = { cards: n, speak: n, story: n } 由頁面依實際資料提供
  function getBadgeStatus(unit, kind, totals) {
    totals = totals || {};
    const st = loadState();
    const u = st.units[unit] || { cardsSeen: [], quizSessions: [], speakSeen: [], storySeen: [] };
    if (kind === "cards") {
      let n = u.cardsSeen.length;
      if (totals.cardIds && totals.cardIds.length) {
        const known = new Set(totals.cardIds);
        n = u.cardsSeen.filter((id) => known.has(id)).length;
      }
      return { done: n > 0, crown: totals.cards ? n >= totals.cards : false, count: n, total: totals.cards || 0 };
    }
    if (kind === "quiz") {
      const sessions = u.quizSessions;
      const crown = sessions.some((s) => s.total >= 10 && s.correct / s.total >= 0.8);
      return { done: sessions.length > 0, crown, count: sessions.length, total: 0 };
    }
    if (kind === "speak") {
      const n = u.speakSeen.length;
      return { done: n > 0, crown: n >= 5, count: n, total: Math.max(5, totals.speak || 0) };
    }
    if (kind === "story") {
      const n = u.storySeen.length;
      return { done: n > 0, crown: totals.story ? n >= totals.story : false, count: n, total: totals.story || 0 };
    }
    return { done: false, crown: false, count: 0, total: 0 };
  }

  function isUnitKing(unit, kinds, totals) {
    return kinds.length > 0 && kinds.every((k) => getBadgeStatus(unit, k, totals).crown);
  }

  const KIND_LABEL = { cards: "圖卡", quiz: "測驗", speak: "口說", story: "短文" };
  const KIND_ICON = { cards: "🐕", quiz: "🐕", speak: "🐕", story: "🐕" };

  function renderBadgeRow(container, unit, kinds, totals) {
    container.innerHTML = "";
    container.className = "badge-row";
    kinds.forEach((kind) => {
      const st = getBadgeStatus(unit, kind, totals);
      const wrap = document.createElement("div");
      wrap.className = "badge" + (st.done ? " done" : "") + (st.crown ? " crown" : "");
      const iconWrap = document.createElement("div");
      iconWrap.className = "icon-wrap";
      const icon = document.createElement("div");
      icon.className = "icon";
      icon.textContent = KIND_ICON[kind] || "🐕";
      iconWrap.appendChild(icon);
      wrap.appendChild(iconWrap);
      const label = document.createElement("div");
      label.textContent = KIND_LABEL[kind] || kind;
      wrap.appendChild(label);
      container.appendChild(wrap);
    });
    if (isUnitKing(unit, kinds, totals)) {
      const banner = document.createElement("div");
      banner.className = "king-banner";
      banner.textContent = "👑 黑狗王！本單元全達標";
      banner.style.width = "100%";
      container.appendChild(banner);
    }
  }

  // -------- character card (index.html 首頁) --------
  function getCharSummary() {
    const st = loadState();
    const info = levelInfoForXp(st.xp);
    return {
      level: info.level,
      title: titleForLevel(info.level),
      xp: st.xp,
      xpIntoLevel: info.xpIntoLevel,
      xpForThisLevel: info.xpForThisLevel,
      abilities: ABILITIES.map((a) => ({ name: a.name, desc: a.desc, active: a.active(info.level) })),
    };
  }

  function hintUnlocked() {
    return getCharSummary().level >= HINT_UNLOCK_LEVEL;
  }

  function renderCharCard(container) {
    const c = getCharSummary();
    const pct = Math.min(100, Math.round((c.xpIntoLevel / c.xpForThisLevel) * 100));
    container.innerHTML = "";
    container.className = "rpg-card";
    const row1 = document.createElement("div");
    row1.className = "row1";
    row1.innerHTML = `<div class="avatar">🐕</div><div style="flex:1"><div class="title">${c.title}</div><div class="level">Lv.${c.level} ・ 共 ${c.xp} XP</div></div>`;
    container.appendChild(row1);
    const outer = document.createElement("div");
    outer.className = "xpbar-outer";
    outer.innerHTML = `<div class="xpbar-inner" style="width:${pct}%"></div>`;
    container.appendChild(outer);
    const xptext = document.createElement("div");
    xptext.className = "xptext";
    xptext.textContent = `${c.xpIntoLevel} / ${c.xpForThisLevel} XP 到下一等級`;
    container.appendChild(xptext);
    const abilities = document.createElement("div");
    abilities.className = "abilities";
    c.abilities.forEach((a) => {
      const chip = document.createElement("div");
      chip.className = "ability-chip";
      chip.style.opacity = a.active ? "1" : "0.5";
      chip.title = a.desc;
      chip.textContent = a.name;
      abilities.appendChild(chip);
    });
    container.appendChild(abilities);
  }

  return {
    loadState,
    saveState,
    addXP,
    recordCardHeard,
    migrateSplitCards,
    recordQuizAnswer,
    recordQuizSession,
    recordSpeak,
    recordStory,
    getPoop,
    renderPoop,
    POOP_MAX,
    getBadgeStatus,
    isUnitKing,
    renderBadgeRow,
    getCharSummary,
    hintUnlocked,
    renderCharCard,
    showToast,
  };
})();

window.Rewards = Rewards;
