// Headless Chrome checks for the Claude study site.
// Usage: node tools/browser_check.js http://127.0.0.1:8765/claude
"use strict";
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const BASE = process.argv[2] || "http://127.0.0.1:8765/claude";
const OUT = process.env.SHOT_DIR || "/opt/cursor/artifacts";
fs.mkdirSync(OUT, { recursive: true });

const chrome = spawn("google-chrome", [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--remote-debugging-port=9222",
  "--user-data-dir=/tmp/claude-chrome-profile",
  "--autoplay-policy=no-user-gesture-required",
  "about:blank",
], { stdio: "ignore" });

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function connect() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch("http://127.0.0.1:9222/json/version");
      const j = await res.json();
      return j.webSocketDebuggerUrl;
    } catch (e) {
      await sleep(150);
    }
  }
  throw new Error("chrome debugger did not come up");
}

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.next = 1;
    this.pending = new Map();
    this.listeners = [];
  }
  open() {
    return new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve);
      this.ws.addEventListener("error", reject);
      this.ws.addEventListener("message", (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(JSON.stringify(msg.error)));
          else resolve(msg.result);
        } else {
          this.listeners.forEach((fn) => fn(msg));
        }
      });
    });
  }
  send(method, params, sessionId) {
    const id = this.next++;
    const payload = { id, method, params: params || {} };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

async function main() {
  const wsUrl = await connect();
  const cdp = new CDP(wsUrl);
  await cdp.open();
  const exceptions = [];
  const pages = [];

  async function withPage(width, height, fn) {
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width, height, deviceScaleFactor: 1, mobile: width < 700,
    }, sessionId);
    const local = [];
    const onMsg = (msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === "Runtime.exceptionThrown") {
        const d = msg.params.exceptionDetails;
        local.push((d.exception && d.exception.description) || d.text || "exception");
      }
    };
    cdp.listeners.push(onMsg);
    try {
      return await fn(sessionId, local);
    } finally {
      const i = cdp.listeners.indexOf(onMsg);
      if (i >= 0) cdp.listeners.splice(i, 1);
      await cdp.send("Target.closeTarget", { targetId });
    }
  }

  async function goto(sessionId, url) {
    await cdp.send("Page.navigate", { url }, sessionId);
    const start = Date.now();
    while (Date.now() - start < 8000) {
      const r = await cdp.send("Runtime.evaluate", {
        expression: "document.readyState",
        returnByValue: true,
      }, sessionId);
      if (r.result && r.result.value === "complete") return;
      await sleep(80);
    }
    throw new Error("timeout " + url);
  }

  async function evalJson(sessionId, expression) {
    const r = await cdp.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    }, sessionId);
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }

  async function shot(sessionId, name) {
    const r = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
    const file = path.join(OUT, name);
    fs.writeFileSync(file, Buffer.from(r.data, "base64"));
    console.log("shot", file);
  }

  // Automated playback page, mobile and desktop.
  for (const vp of [{ w: 390, h: 844, name: "mobile" }, { w: 1280, h: 900, name: "desktop" }]) {
    await withPage(vp.w, vp.h, async (sessionId, local) => {
      await goto(sessionId, BASE + "/tools/echo_browser_test.html");
      let status = null;
      for (let i = 0; i < 40; i++) {
        status = await evalJson(sessionId, `(() => {
          const s = document.getElementById("status");
          return s && s.dataset.done ? { done: s.dataset.done, fails: s.dataset.fails, text: s.textContent, log: document.getElementById("log").textContent } : null;
        })()`);
        if (status) break;
        await sleep(200);
      }
      console.log("BROWSER", vp.name, JSON.stringify(status && status.text), "fails", status && status.fails);
      if (status && status.log) console.log(status.log);
      if (!status || status.fails !== "0") exceptions.push(vp.name + " browser test failed");
      local.forEach((e) => exceptions.push(vp.name + " " + e));
      await shot(sessionId, `echo_player_${vp.name}.png`);
    });
  }

  const routes = ["index.html", "u0.html", "u1.html", "u2.html", "u3.html", "u4.html", "u5.html"];
  for (const route of routes) {
    await withPage(390, 844, async (sessionId, local) => {
      await goto(sessionId, BASE + "/" + route);
      await sleep(400);
      const info = await evalJson(sessionId, `(() => {
        const doc = document.documentElement;
        const es = document.querySelector(".big-card > .es");
        const play = document.querySelector("[data-act='play']");
        const buttons = [...document.querySelectorAll(".play-all, .card-nav .btn, .tab, .unit-card")].slice(0, 8).map((b) => ({
          t: (b.textContent || "").trim().slice(0, 24),
          h: Math.round(b.getBoundingClientRect().height),
        }));
        return {
          title: document.title,
          overflow: doc.scrollWidth > doc.clientWidth + 2,
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          es: es ? es.textContent : null,
          blank: es ? !es.textContent.trim() : false,
          play: play ? play.textContent : null,
          lang: document.querySelector(".lang-pill") ? document.querySelector(".lang-pill").textContent : null,
          buttons,
        };
      })()`);
      console.log("PAGE", route, JSON.stringify(info));
      if (info.overflow) exceptions.push(route + " horizontal overflow");
      if (info.blank) exceptions.push(route + " blank card");
      if (route.startsWith("u") && !info.es) exceptions.push(route + " missing card");
      if (route.startsWith("u") && info.play && !info.play.includes("播放整個單元")) exceptions.push(route + " missing play-all label");
      local.forEach((e) => exceptions.push(route + " " + e));
      if (route !== "index.html") {
        await evalJson(sessionId, `document.querySelector(".big-card")?.scrollIntoView({block:"center"})`);
        await sleep(100);
      }
      if (route === "index.html") await shot(sessionId, "home_mobile.png");
      if (route === "u0.html") await shot(sessionId, "u0_mobile_card.png");
      if (route === "u5.html") await shot(sessionId, "u5_mobile_spanish.png");
      if (route === "u3.html") await shot(sessionId, "u3_mobile_verb.png");
    });
  }

  await withPage(390, 844, async (sessionId, local) => {
    await goto(sessionId, BASE + "/u5.html");
    await sleep(300);
    await evalJson(sessionId, `document.querySelector("[data-act='next']").click()`);
    await sleep(150);
    await evalJson(sessionId, `document.querySelector(".big-card")?.scrollIntoView({block:"center"})`);
    const info = await evalJson(sessionId, `({
      es: document.querySelector(".big-card > .es").textContent,
      lang: document.querySelector(".lang-pill").textContent,
      zh: document.querySelector(".big-card .zh").textContent,
    })`);
    console.log("U5 next card", JSON.stringify(info));
    if (info.lang !== "英文") exceptions.push("u5 second card should be English, got " + info.lang + " " + info.es);
    if (!info.es || !info.es.trim()) exceptions.push("u5 english card blank");
    await shot(sessionId, "u5_mobile_english.png");
    local.forEach((e) => exceptions.push("u5-next " + e));
  });

  await withPage(1280, 900, async (sessionId, local) => {
    await goto(sessionId, BASE + "/u0.html");
    await sleep(300);
    await evalJson(sessionId, `document.querySelector(".big-card")?.scrollIntoView({block:"center"})`);
    const info = await evalJson(sessionId, `({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      es: document.querySelector(".big-card > .es").textContent,
      font: getComputedStyle(document.querySelector(".big-card > .es")).fontSize,
    })`);
    console.log("U0 desktop", JSON.stringify(info));
    if (info.overflow) exceptions.push("u0 desktop overflow");
    await shot(sessionId, "u0_desktop_card.png");
    local.forEach((e) => exceptions.push("u0-desktop " + e));
  });

  await withPage(390, 844, async (sessionId, local) => {
    await goto(sessionId, BASE + "/u2.html");
    await sleep(250);
    await evalJson(sessionId, `document.querySelector('.tab[data-panel="quiz"]').click()`);
    await sleep(200);
    await evalJson(sessionId, `document.querySelector('.tab[data-panel="speak"]').click()`);
    await sleep(150);
    await evalJson(sessionId, `document.querySelector('.tab[data-panel="story"]').click()`);
    await sleep(150);
    const info = await evalJson(sessionId, `({
      story: document.querySelectorAll(".story-line").length,
      quizWas: true,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    })`);
    console.log("U2 tabs", JSON.stringify(info));
    if (info.story < 1) exceptions.push("u2 story missing");
    if (info.overflow) exceptions.push("u2 story overflow");
    await shot(sessionId, "u2_mobile_story.png");
    local.forEach((e) => exceptions.push("u2 " + e));
  });

  console.log(exceptions.length ? "BROWSER FAIL\n" + exceptions.join("\n") : "BROWSER ALL PASSED");
  chrome.kill("SIGKILL");
  process.exit(exceptions.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  chrome.kill("SIGKILL");
  process.exit(1);
});
