// One-off verification: run fromGQD/fromWordlist for given units in a vm sandbox
// and confirm every segment's (voice,text) resolves to a real file in AUDIO_MANIFEST.
// Usage: node tools/verify_audio.js u2 u3 u4 u5
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const units = process.argv.slice(2);
if (!units.length) {
  console.error("usage: node tools/verify_audio.js <unit> [unit...]");
  process.exit(1);
}

const sandbox = { window: {}, console, document: { addEventListener() {} } };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

function load(file) {
  const code = fs.readFileSync(path.join(ROOT, file), "utf8");
  vm.runInContext(code, sandbox, { filename: file });
}

load("data/audio-manifest.js");
units.forEach((u) => load(`data/${u}-data.js`));
load("js/unit-engine.js");

const UnitEngine = sandbox.window.UnitEngine;
const AUDIO_MANIFEST = sandbox.window.AUDIO_MANIFEST;

let totalSegs = 0;
let missing = [];

units.forEach((u) => {
  const raw = sandbox.window.UNIT_DATA[u];
  const deck = raw.W ? UnitEngine.fromWordlist(u, raw) : UnitEngine.fromGQD(u, raw);

  function checkSegs(label, segs, itemId) {
    (segs || []).forEach((seg) => {
      totalSegs++;
      const key = `${seg.voice}|${seg.text}`;
      if (!AUDIO_MANIFEST[key]) {
        missing.push(`${u} ${label} ${itemId}: ${key}`);
      } else {
        const p = path.join(ROOT, AUDIO_MANIFEST[key]);
        if (!fs.existsSync(p)) missing.push(`${u} ${label} ${itemId}: ${key} -> file missing ${AUDIO_MANIFEST[key]}`);
      }
    });
  }

  deck.cards.forEach((c) => checkSegs("card", c.segments, c.id));
  deck.speak.forEach((s) => checkSegs("speak", s.segments, s.id));
  deck.story.forEach((s) => checkSegs("story", s.segments, s.id));
  deck.quiz.forEach((q) => {
    if (q.sayPair) checkSegs("quiz-say", [{ voice: q.sayPair.voice, text: q.sayPair.text }], q.id);
  });

  console.log(`[${u}] cards=${deck.cards.length} quiz=${deck.quiz.length} speak=${deck.speak.length} story=${deck.story.length}`);
});

console.log(`checked ${totalSegs} segments/refs across units: ${units.join(", ")}`);
if (missing.length) {
  console.log(`MISSING (${missing.length}):`);
  missing.forEach((m) => console.log("  " + m));
  process.exit(1);
} else {
  console.log("All audio references resolved OK.");
}
