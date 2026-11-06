// node tools/echo_logic_test.js
// Checks split cards, echo phase order, pause/stop/skip, and progress migration.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const store = {};
const sandbox = {
  window: {},
  console,
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  },
  document: { addEventListener() {} },
  performance: { now: () => Date.now() },
};
sandbox.window.window = sandbox.window;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), sandbox, { filename: file });
}

load("data/audio-manifest.js");
["u0", "u1", "u2", "u3", "u4", "u5"].forEach((u) => load(`data/${u}-data.js`));
load("js/rewards.js");
load("js/unit-engine.js");

const UE = sandbox.window.UnitEngine;
const Rewards = sandbox.window.Rewards;
const manifest = sandbox.window.AUDIO_MANIFEST;
let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error("FAIL:", msg);
  }
}

const decks = {};
["u0", "u1", "u2", "u3", "u4", "u5"].forEach((u) => {
  const raw = sandbox.window.UNIT_DATA[u];
  decks[u] = raw.W ? UE.fromWordlist(u, raw) : UE.fromGQD(u, raw);
});

["u0", "u1", "u2", "u3", "u4", "u5"].forEach((u) => {
  decks[u].cards.forEach((c, i) => {
    assert(c.segments && c.segments.length === 1, `${u} card ${c.id} segments=${c.segments && c.segments.length}`);
    assert(c.es && String(c.es).trim(), `${u} blank card ${c.id}`);
    assert(c.segments[0].text && String(c.segments[0].text).trim(), `${u} blank audio text ${c.id}`);
    const key = `${c.segments[0].voice}|${c.segments[0].text}`;
    assert(manifest[key], `${u} missing audio ${key}`);
    if (i > 0) assert(c.id !== decks[u].cards[i - 1].id, `${u} duplicate id ${c.id}`);
  });
  const ids = new Set(decks[u].cards.map((c) => c.id));
  assert(ids.size === decks[u].cards.length, `${u} id collision`);
});

function pairBackToBack(cards) {
  for (let i = 0; i < cards.length; i++) {
    const segs = cards[i].segments;
    if (segs.length > 1) return cards[i].id;
    const voices = new Set(segs.map((s) => s.voice));
    if (voices.size > 1) return cards[i].id;
  }
  return null;
}
["u0", "u3", "u4", "u5"].forEach((u) => {
  assert(!pairBackToBack(decks[u].cards), `${u} still has a mixed-language card`);
});

const u0es = decks.u0.cards.find((c) => c.segments[0].text === "vocabulario" && c.segments[0].voice === "es");
const u0en = decks.u0.cards.find((c) => c.segments[0].text === "vocabulary" && c.segments[0].voice === "en");
assert(u0es && u0en && u0es.id !== u0en.id, "u0 Spanish/English vocabulario are separate cards");

const estar = decks.u3.cards.filter((c) => c.group === "10 個動詞" && /^(Estar|Estando)$/.test(c.segments[0].text));
assert(estar.length === 2 && estar[0].segments[0].text === "Estar" && estar[1].segments[0].text === "Estando", "u3 verb and gerund are separate cards in order");

const u4hacer = decks.u4.cards.filter((c) => c.segments[0].text === "Hacer" || c.segments[0].text === "Haciendo");
assert(u4hacer.length >= 2, "u4 hacer/haciendo split");
const hacerPair = decks.u4.cards.filter((c) => c.group === "現在分詞" && (c.segments[0].text === "Hacer" || c.segments[0].text === "Haciendo"));
assert(hacerPair.length === 2 && hacerPair[0].id !== hacerPair[1].id, "u4 gerund group splits hacer");

const sing = decks.u5.cards.filter((c) => c.segments[0].text === "singular");
assert(sing.some((c) => c.lang === "es") && sing.some((c) => c.lang === "en"), "u5 singular has both languages as cards");
const masc = decks.u5.cards.filter((c) => c.group === "陰性 vs 陽性" && (c.segments[0].text === "masculino" || c.segments[0].text === "masculine"));
assert(masc.some((c) => c.segments[0].voice === "es") && masc.some((c) => c.segments[0].voice === "en"), "u5 masculine/masculino both exist");
assert(new Set(masc.map((c) => c.segments[0].voice + "|" + c.segments[0].text)).size === masc.length, "u5 gender duplicates removed inside the group");

assert(decks.u1.cards.every((c) => c.segments.length === 1 && c.segments[0].text.includes(" ")), "u1 cards are one full phrase");
assert(decks.u2.cards.every((c) => c.segments.length === 1), "u2 cards are one segment");

const groupsInOrder = [];
decks.u5.cards.forEach((c) => {
  if (groupsInOrder[groupsInOrder.length - 1] !== c.group) groupsInOrder.push(c.group);
});
assert(groupsInOrder.length > 1, "u5 has multiple groups for cross-group playback");

const waits = UE.echoWaits(2.5);
assert(waits.echo === 2.5 && waits.shadow === 3.5, "echo waits follow duration");
const waitsLong = UE.echoWaits(8);
assert(waitsLong.echo === 3 && waitsLong.shadow === 9, "echo capped at 3s, shadow is duration+1");
const waitsShort = UE.echoWaits(0.4);
assert(waitsShort.echo === 0.4 && waitsShort.shadow === 1.5, "short clip shadow floor 1.5");

function runSession(cards, hooks) {
  const log = [];
  let active = 0;
  let maxActive = 0;
  const session = new UE.EchoSession({
    onCard(card, index) { log.push(["card", card.id, index]); },
    onPhase(card, round, phase) { log.push(["phase", card.id, round, phase]); },
    onDoneCard(card) { log.push(["done", card.id]); hooks.onDone && hooks.onDone(card, session, log); },
    onFinish() { log.push(["finish"]); hooks.onFinish && hooks.onFinish(log); },
    play(card) {
      active++;
      maxActive = Math.max(maxActive, active);
      log.push(["play", card.id, active]);
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          active--;
          if (hooks.playResolve) hooks.playResolve(card, resolve, session);
          else resolve({ duration: 0.4 });
        }, hooks.playMs || 20);
        hooks.track && hooks.track(card, resolve, () => clearTimeout(timer));
      });
    },
    wait(sec) {
      log.push(["wait", sec]);
      return new Promise((resolve) => {
        let left = hooks.waitMs || 15;
        let settled = false;
        const finish = (v) => { if (!settled) { settled = true; resolve(v); } };
        const tick = () => {
          if (settled) return;
          if (session.paused) { setTimeout(tick, 15); return; }
          if (left <= 0) return finish("ok");
          const slice = Math.min(left, 15);
          setTimeout(() => {
            if (!session.paused) left -= slice;
            tick();
          }, slice);
        };
        hooks.trackWait && hooks.trackWait(finish);
        tick();
      });
    },
    abort() { log.push(["abort"]); hooks.onAbort && hooks.onAbort(); },
  });
  session._maxActive = () => maxActive;
  session._log = log;
  hooks.session = session;
  return session;
}

function phasesFor(log, id) {
  return log.filter((x) => x[0] === "phase" && x[1] === id).map((x) => `${x[3]}${x[2]}`);
}

async function main() {
// Full traversal across groups: 3 cards, 2 rounds each, no overlap.
{
  const cards = [
    { id: "a", group: "甲", segments: [{ voice: "es", text: "uno" }] },
    { id: "b", group: "甲", segments: [{ voice: "en", text: "one" }] },
    { id: "c", group: "乙", segments: [{ voice: "es", text: "dos" }] },
  ];
  const session = runSession(cards, {});
  session.begin(cards, 0);
  await new Promise((r) => setTimeout(r, 700));
  const log = session._log;
  assert(session._maxActive() === 1, "play overlap max=" + session._maxActive());
  assert(phasesFor(log, "a").join(",") === "listen1,echo1,shadow1,listen2,echo2,shadow2", "card a full cycle " + phasesFor(log, "a"));
  assert(phasesFor(log, "b").join(",").startsWith("listen1,echo1,shadow1"), "card b starts only after a");
  const idxA = log.findIndex((x) => x[0] === "done" && x[1] === "a");
  const idxB = log.findIndex((x) => x[0] === "phase" && x[1] === "b");
  assert(idxA !== -1 && idxB > idxA, "b does not start before a finishes");
  assert(log.some((x) => x[0] === "card" && x[1] === "c"), "playback crosses into group 乙");
  assert(log[log.length - 1][0] === "finish", "unit playback finishes");
  const seenGroups = [];
  log.filter((x) => x[0] === "card").forEach((x) => {
    const g = cards.find((c) => c.id === x[1]).group;
    if (seenGroups[seenGroups.length - 1] !== g) seenGroups.push(g);
  });
  assert(seenGroups.join(",") === "甲,乙", "group order " + seenGroups);
}

// Stop cancels further phases and does not finish the unit.
{
  let stopped = false;
  const cards = [
    { id: "a", group: "甲", segments: [{ voice: "es", text: "uno" }] },
    { id: "b", group: "乙", segments: [{ voice: "es", text: "dos" }] },
  ];
  const session = runSession(cards, {
    onDone() {},
  });
  const orig = session.io.onPhase;
  session.io.onPhase = (card, round, phase) => {
    orig(card, round, phase);
    if (!stopped && card.id === "a" && phase === "echo" && round === 1) {
      stopped = true;
      session.stop();
    }
  };
  session.begin(cards, 0);
  await new Promise((r) => setTimeout(r, 400));
  const log = session._log;
  assert(!log.some((x) => x[1] === "b"), "stop prevents next card " + JSON.stringify(log));
  assert(!log.some((x) => x[0] === "finish"), "stop does not emit finish");
  assert(log.filter((x) => x[0] === "play").length === 1, "stop does not start a second play");
}

// Pause holds the echo wait until resume.
{
  const cards = [
    { id: "a", group: "甲", segments: [{ voice: "es", text: "uno" }] },
    { id: "b", group: "乙", segments: [{ voice: "es", text: "dos" }] },
  ];
  let releaseWait = null;
  const session = runSession(cards, {
    waitMs: 500,
    trackWait(resolve) { releaseWait = resolve; },
  });
  const orig = session.io.onPhase;
  session.io.onPhase = (card, round, phase) => {
    orig(card, round, phase);
    if (card.id === "a" && phase === "echo" && round === 1) session.pause();
  };
  session.begin(cards, 0);
  await new Promise((r) => setTimeout(r, 120));
  const mid = session._log.filter((x) => x[0] === "phase").map((x) => x.slice(1).join(":"));
  assert(mid.join(",") === "a:1:listen,a:1:echo", "paused inside echo, no shadow yet: " + mid);
  await new Promise((r) => setTimeout(r, 200));
  const still = session._log.filter((x) => x[0] === "phase").length;
  assert(still === 2, "pause froze the cycle");
  session.resume();
  if (releaseWait) releaseWait("ok");
  await new Promise((r) => setTimeout(r, 250));
  assert(session._log.some((x) => x[0] === "phase" && x[3] === "shadow"), "resume continues into shadow");
}

// Skip to next card aborts current audio and does not overlap.
{
  const cards = [
    { id: "a", group: "甲", segments: [{ voice: "es", text: "uno" }] },
    { id: "b", group: "乙", segments: [{ voice: "es", text: "dos" }] },
    { id: "c", group: "丙", segments: [{ voice: "es", text: "tres" }] },
  ];
  const session = runSession(cards, { playMs: 80, waitMs: 40 });
  const orig = session.io.onPhase;
  session.io.onPhase = (card, round, phase) => {
    orig(card, round, phase);
    if (card.id === "a" && phase === "listen" && round === 1) session.skipTo(1);
  };
  session.begin(cards, 0);
  await new Promise((r) => setTimeout(r, 500));
  assert(session._maxActive() === 1, "skip keeps a single play");
  assert(!session._log.some((x) => x[0] === "done" && x[1] === "a"), "skipped card is not marked done");
  assert(session._log.some((x) => x[0] === "card" && x[1] === "b"), "skip lands on next card");
}

// Migration copies poop/seen onto split ids and aliases, without adding XP.
{
  store.esp_progress_v1 = JSON.stringify({
    xp: 40,
    level: 1,
    today: "2020-1-1",
    todayCount: 0,
    combo: 0,
    poop: { "u3:card:u3:c:0:0": 3, "u5:card:u5:c:0:2": 2 },
    units: {
      u3: { cardsSeen: ["u3:c:0:0"], quizSessions: [], speakSeen: [], storySeen: [] },
      u5: { cardsSeen: ["u5:c:0:2"], quizSessions: [], speakSeen: [], storySeen: [] },
    },
  });
  const before = JSON.parse(store.esp_progress_v1).xp;
  Rewards.migrateSplitCards("u3", decks.u3.cards, decks.u3.aliases || decks.u3.cards.aliases || []);
  Rewards.migrateSplitCards("u5", decks.u5.cards, decks.u5.aliases || []);
  const st = JSON.parse(store.esp_progress_v1);
  assert(st.xp === before, "migration does not add XP");
  const estarKids = decks.u3.cards.filter((c) => c.legacyId === "u3:c:0:0");
  assert(estarKids.length >= 2, "estar legacy split into >=2");
  estarKids.forEach((c) => {
    assert(st.units.u3.cardsSeen.includes(c.id), "estar split kept seen " + c.id);
    assert((st.poop["u3:card:" + c.id] || 0) === 3, "estar poop copied to " + c.id + " got " + st.poop["u3:card:" + c.id]);
  });
  const gendered = decks.u5.cards.filter((c) => c.segments[0].text === "masculino" || c.segments[0].text === "masculine");
  assert(gendered.every((c) => st.units.u5.cardsSeen.includes(c.id)), "alias migration credits both gender cards from the English parent");
  assert(gendered.every((c) => (st.poop["u5:card:" + c.id] || 0) >= 2), "alias poop not reduced");
  const xp2 = JSON.parse(store.esp_progress_v1).xp;
  Rewards.migrateSplitCards("u3", decks.u3.cards, decks.u3.aliases || []);
  assert(JSON.parse(store.esp_progress_v1).xp === xp2, "second migration is a no-op for XP");
  const seenLen = JSON.parse(store.esp_progress_v1).units.u3.cardsSeen.length;
  Rewards.migrateSplitCards("u3", decks.u3.cards, decks.u3.aliases || []);
  assert(JSON.parse(store.esp_progress_v1).units.u3.cardsSeen.length === seenLen, "migration does not duplicate seen ids");
}

console.log(failed ? `FAILED ${failed}` : "ALL ECHO LOGIC CHECKS PASSED");
console.log("cards", Object.fromEntries(Object.entries(decks).map(([k, v]) => [k, v.cards.length])));
process.exit(failed ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(1); });
