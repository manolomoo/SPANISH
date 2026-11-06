// ===========================================================
// 共用小工具：主題切換、emoji 渲染、DOM 捷徑、單元清單設定
// ===========================================================
"use strict";

const UNITS = [
  { id: "u0", num: "0", title: "文法術語", sub: "Gramática — 工具單元", kinds: ["cards", "quiz", "speak"] },
  { id: "u1", num: "1", title: "冠詞", sub: "Artículos", kinds: ["cards", "quiz", "speak"] },
  { id: "u2", num: "2", title: "冠詞＋單字", sub: "Artículos + Vocabulario（含短文）", kinds: ["cards", "quiz", "speak", "story"] },
  { id: "u3", num: "3", title: "動詞 1", sub: "Verbos — 10 個常用動詞", kinds: ["cards", "quiz", "speak"] },
  { id: "u4", num: "4", title: "Estar + 現在分詞", sub: "Estar + Gerundio", kinds: ["cards", "quiz", "speak"] },
  { id: "u5", num: "5", title: "Ser + 形容詞・顏色", sub: "陰性 vs 陽性", kinds: ["cards", "quiz", "speak"] },
];

function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

function el(tag, attrs, children) {
  const n = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      if (k === "class") n.className = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (k.startsWith("on") && typeof attrs[k] === "function") n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
  }
  (children || []).forEach((c) => {
    if (c == null) return;
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return n;
}

// -------- emoji / picture rendering --------
// pic = [hexCodepoint, variant] from content.json, or null -> fallback colour block
// explicitColor: card.col (顏色單元的真實色票），優先於雜湊色塊
function renderPic(pic, seedText, explicitColor) {
  if (pic && pic[0] && !explicitColor) {
    try {
      const cp = parseInt(pic[0], 16);
      if (!Number.isNaN(cp)) {
        const glyph = String.fromCodePoint(cp);
        return el("div", { class: "pic" }, [glyph]);
      }
    } catch (e) { /* fall through */ }
  }
  const block = el("div", { class: "pic block" });
  if (explicitColor) {
    block.style.background = explicitColor;
    return block;
  }
  const hue = hashHue(seedText || "x");
  block.style.background = `hsl(${hue}, 55%, 45%)`;
  return block;
}
function hashHue(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

// -------- theme --------
function initTheme() {
  const saved = localStorage.getItem("esp_theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  const btn = $(".theme-btn");
  if (btn) {
    btn.textContent = document.documentElement.getAttribute("data-theme") === "dark" ? "☀️" : "🌙";
    btn.addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("esp_theme", next);
      btn.textContent = next === "dark" ? "☀️" : "🌙";
    });
  }
}

// -------- top bar --------
function renderTopbar(title, backHref) {
  const bar = $(".topbar");
  if (!bar) return;
  bar.innerHTML = "";
  bar.appendChild(el("a", { class: "back", href: backHref || "./index.html" }, ["←"]));
  bar.appendChild(el("h1", {}, [title]));
  bar.appendChild(el("button", { class: "theme-btn", type: "button" }, ["🌙"]));
}

document.addEventListener("DOMContentLoaded", initTheme);
