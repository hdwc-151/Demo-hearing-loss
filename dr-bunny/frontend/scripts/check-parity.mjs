// Kiểm parity giữa frontend và backend Python. Fixture do tests/make_fixtures.py sinh:
//   1) cases:     phoneme.js phải cho cùng kết quả với engine Python (tiếng Việt VÀ tiếng Anh)
//   2) constants: constants.js phải trùng backend/core/constants.py (BUILD_LOG R-06)
//   3) graphrag:  bản GraphRAG chạy trong máy (util/graphrag.js) phải trùng câu trả lời tầng 1 của backend
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { degradeTokens } from "../src/util/phoneme.js";
import * as C from "../src/data/constants.js";
import { retrieve, fallbackAnswer } from "../src/util/graphrag.js";

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(resolve(here, "../../tests/fixtures/parity_fixture.json"), "utf8"));

// ---- 1) engine chữ ----
let caseFail = 0;
for (const c of fx.cases) {
  const got = degradeTokens(c.text, c.level, c.lang, c.dialect)
    .map((t) => (t.cls === "hide" ? " ".repeat(t.t.length) : t.t))
    .join("");
  if (got !== c.expected) {
    caseFail++;
    if (caseFail <= 5) console.error("MISMATCH", JSON.stringify({ lang: c.lang, text: c.text, level: c.level, dialect: c.dialect }),
      "\n  want:", JSON.stringify(c.expected), "\n  got: ", JSON.stringify(got));
  }
}
console.log(`parity chữ: ${fx.cases.length - caseFail}/${fx.cases.length} ca khớp (vi + en)`);

// ---- 2) hằng số ----
const K = fx.constants;
const pick = (items, keys) => items.map((it) => Object.fromEntries(keys.map((k) => [k, it[k]])));
const checks = [
  ["FREQS", C.FREQS, K.freqs],
  ["LEVEL_PRESETS", C.LEVEL_PRESETS, K.level_presets],
  ["LEVEL_CUTOFF", C.LEVEL_CUTOFF, K.level_cutoff],
  ["LEVEL_NOISE_GAIN", C.LEVEL_NOISE_GAIN, K.level_noise_gain],
  ["LEVELS (thứ tự)", C.LEVELS, Object.keys(K.level_presets)],
  ["SOUND_ITEMS (id, label, freq, db)", pick(C.SOUND_ITEMS, ["id", "label", "freq", "db"]), K.sound_items],
  ["SCENARIOS (danh sách khoá)", Object.keys(C.SCENARIOS), Object.keys(K.scenarios)],
  ["SCENARIOS (noiseFreq, noiseQ)",
    Object.fromEntries(Object.entries(C.SCENARIOS).map(([k, v]) => [k, { noise_freq: v.noiseFreq, noise_q: v.noiseQ }])),
    K.scenarios],
];
let constFail = 0;
for (const [name, got, want] of checks) {
  if (!isDeepStrictEqual(got, want)) {
    constFail++;
    console.error(`LỆCH HẰNG SỐ ${name}\n  backend:  ${JSON.stringify(want)}\n  frontend: ${JSON.stringify(got)}`);
  }
}
console.log(`parity hằng số: ${checks.length - constFail}/${checks.length} nhóm khớp`);

// ---- 3) GraphRAG chạy trong máy ----
let gFail = 0;
for (const c of fx.graphrag) {
  const r = retrieve(c.audiogram, c.question, 3);
  const got = { ids: r.map((x) => x.id), scores: r.map((x) => x.score), hits: r.map((x) => x.hits), fallback: fallbackAnswer(c.audiogram, c.question) };
  const want = { ids: c.ids, scores: c.scores, hits: c.hits, fallback: c.fallback };
  if (!isDeepStrictEqual(got, want)) {
    gFail++;
    if (gFail <= 3) console.error("GRAPHRAG LỆCH", JSON.stringify(c.question), "\n  want:", JSON.stringify(want).slice(0, 300), "\n  got: ", JSON.stringify(got).slice(0, 300));
  }
}
console.log(`parity GraphRAG: ${fx.graphrag.length - gFail}/${fx.graphrag.length} ca khớp`);

process.exit(caseFail || constFail || gFail ? 1 : 0);
