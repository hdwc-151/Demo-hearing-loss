// Test logic frontend bằng bộ chạy test có sẵn của Node (node:test) -> KHÔNG thêm dependency.
// Chạy: npm test   (hoặc: node --test scripts/logic.test.mjs)
// Phạm vi: phần thuần JS (phoneme, level, store, api). Component React/Web Audio cần trình duyệt
// thật nên vẫn do tests/e2e_browser.py đảm nhiệm.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { degradeTokens, countHiddenLetters } from "../src/util/phoneme.js";
import { nearestLevel } from "../src/util/level.js";
import { SCENARIOS, LEVELS, LEVEL_PRESETS, SOUND_PRESENTATION, SOUND_ITEMS } from "../src/data/constants.js";
import { useStore, selectEffectiveLevel, GREETING } from "../src/store.js";
import { askDrBunny, getConfig, setApiBase, isOfflineMode, OFFLINE } from "../src/api.js";
import { answerLocal, retrieve, DISCLAIMER, norm } from "../src/util/graphrag.js";
import { renderProcedural, modulationEnvelope, rngFromSeed, seedFromString, fft, SR } from "../src/util/noise.js";
import { FREQS } from "../src/data/constants.js";
import { getJSON, setJSON, getItem, setItem } from "../src/storage.js";

// ---------- phoneme: bộ đếm "Mất X/Y chữ cái" và bất biến bố cục ----------
// dùng chính hàm mà Simulator.jsx gọi (countHiddenLetters), không chép lại công thức
const isLetter = (c) => /\p{L}/u.test(c);
// "sự thật": đếm chữ cái bị thay bằng khoảng trắng so với văn bản gốc
function trueHidden(orig, tokens) {
  const out = tokens.map((t) => (t.cls === "hide" ? " ".repeat(t.t.length) : t.t)).join("");
  let n = 0;
  for (let i = 0; i < orig.length; i++) if (isLetter(orig[i]) && out[i] === " ") n++;
  return n;
}

test("bộ đếm chữ bị ẩn đúng ở mọi kịch bản, mức, ngôn ngữ (AUDIT-01: tiếng Anh từng thiếu 58–101 chữ)", () => {
  for (const lang of ["vi", "en"]) for (const level of ["Mild", "Moderate", "Severe"]) for (const key of Object.keys(SCENARIOS)) {
    const text = SCENARIOS[key][lang].normalize("NFC");
    const toks = degradeTokens(text, level, lang, "north");
    assert.equal(countHiddenLetters(toks), trueHidden(text, toks), `${lang}/${level}/${key}`);
  }
});

test("ghép các token lại phải ra ĐÚNG văn bản gốc (chữ bị ẩn chỉ mờ đi, không đổi độ rộng)", () => {
  for (const lang of ["vi", "en"]) for (const level of LEVELS) for (const key of Object.keys(SCENARIOS)) {
    const text = SCENARIOS[key][lang].normalize("NFC");
    const joined = degradeTokens(text, level, lang, "south").map((t) => t.t).join("");
    assert.equal(joined, text, `${lang}/${level}/${key}`);
  }
});

test("tiếng Anh: digraph th/sh/ph/kh/ght bị ẩn nguyên cụm và giữ chữ gốc", () => {
  const toks = degradeTokens("night thought", "Moderate", "en");
  const hidden = toks.filter((t) => t.cls === "hide").map((t) => t.t);
  assert.ok(hidden.includes("ght"), "phải ẩn cả cụm 'ght'");
  assert.ok(hidden.includes("th"), "phải ẩn cả cụm 'th'");
});

// ---------- nearestLevel ----------
test("nearestLevel: mỗi preset ánh xạ về chính nó", () => {
  for (const lv of LEVELS) assert.equal(nearestLevel(LEVEL_PRESETS[lv], LEVEL_PRESETS, LEVELS), lv);
});

test("nearestLevel: audiogram lệch nhẹ khỏi Moderate vẫn là Moderate; toàn 0 là Normal", () => {
  assert.equal(nearestLevel([30, 40, 50, 60, 70, 75], LEVEL_PRESETS, LEVELS), "Moderate");
  assert.equal(nearestLevel([0, 0, 0, 0, 0, 0], LEVEL_PRESETS, LEVELS), "Normal");
  assert.equal(nearestLevel([110, 110, 110, 110, 110, 110], LEVEL_PRESETS, LEVELS), "Severe");
});

test("nearestLevel: hoà khoảng cách -> chọn mức nhẹ hơn (ổn định, không nhảy)", () => {
  const mid = LEVEL_PRESETS.Normal.map((v, i) => (v + LEVEL_PRESETS.Mild[i]) / 2);
  assert.equal(nearestLevel(mid, LEVEL_PRESETS, LEVELS), "Normal");
});

// ---------- store ----------
const initial = useStore.getState();
beforeEach(() => { useStore.setState(initial, true); setApiBase("/api"); });

test("store.setThreshold: làm tròn về số nguyên, kẹp trong [-10, 110], đánh dấu customized", () => {
  const { setThreshold } = useStore.getState();
  setThreshold(0, 32.4);
  assert.equal(useStore.getState().thresholds[0], 32);
  setThreshold(1, 500);
  assert.equal(useStore.getState().thresholds[1], 110);
  setThreshold(2, -99);
  assert.equal(useStore.getState().thresholds[2], -10);
  assert.ok(Number.isInteger(useStore.getState().thresholds[0]), "backend khai báo int -> không được gửi số lẻ");
  assert.equal(useStore.getState().customized, true);
});

test("store: kéo audiogram thì mức hiệu dụng đổi theo (AUDIT-06); chọn preset thì reset", () => {
  const s = () => useStore.getState();
  assert.equal(selectEffectiveLevel(s()), "Normal");
  LEVEL_PRESETS.Severe.forEach((db, i) => s().setThreshold(i, db));
  assert.equal(s().level, "Normal", "preset đang chọn không đổi");
  assert.equal(selectEffectiveLevel(s()), "Severe", "nhưng mô phỏng phải theo audiogram vừa kéo");
  s().setLevel("Mild");
  assert.equal(s().customized, false);
  assert.equal(selectEffectiveLevel(s()), "Mild");
  assert.deepEqual(s().thresholds, LEVEL_PRESETS.Mild);
});

test("store.addChat: giữ lịch sử, bắt đầu bằng lời chào (AUDIT-09)", () => {
  assert.deepEqual(useStore.getState().chat, [GREETING]);
  useStore.getState().addChat({ role: "user", text: "xin chào" });
  useStore.getState().addChat({ role: "bot", text: "chào bạn" });
  assert.equal(useStore.getState().chat.length, 3);
  assert.equal(useStore.getState().chat[2].text, "chào bạn");
});

// ---------- api (mock fetch) ----------
const AUD = Object.fromEntries(FREQS.map((f, i) => [String(f), LEVEL_PRESETS.Moderate[i]]));
const realFetch = globalThis.fetch;
const realSet = globalThis.setTimeout, realClear = globalThis.clearTimeout;
function trackTimers() {            // đếm timer còn treo để phát hiện rò rỉ
  const live = new Set();
  globalThis.setTimeout = (fn, ms, ...a) => { const id = realSet(fn, ms, ...a); live.add(id); return id; };
  globalThis.clearTimeout = (id) => { live.delete(id); return realClear(id); };
  return { live, restore() { globalThis.setTimeout = realSet; globalThis.clearTimeout = realClear; } };
}
const abortError = () => Object.assign(new Error("aborted"), { name: "AbortError" });
// Mô phỏng máy chủ treo: chỉ kết thúc khi bị abort. Nếu code KHÔNG truyền signal thì promise treo mãi
// (đúng với trình duyệt thật) và test sẽ hết giờ -> thất bại, thay vì văng lỗi giả làm test "xanh".
const hangingFetch = (_url, opts = {}) => new Promise((_, rej) => {
  opts.signal?.addEventListener("abort", () => rej(abortError()));
});
const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test("api.askDrBunny: phân biệt offline / 4xx / 5xx / timeout và không rò timer (AUDIT-07)", { timeout: 5000 }, async () => {
  const t = trackTimers();
  try {
    globalThis.fetch = async () => { throw new TypeError("fetch failed"); };
    const off = await askDrBunny(AUD, "tôi không nghe rõ chữ s");   // mất mạng -> trả lời bằng bộ tri thức trong máy
    assert.equal(off.mode, "local");
    assert.match(off.answer, /trong máy/);
    assert.ok(off.answer.includes(DISCLAIMER), "câu trả lời trong máy cũng phải có câu miễn trừ");
    assert.ok(off.nodes.length > 0);

    globalThis.fetch = async () => jsonResponse(422, {});
    const invalid = await askDrBunny(AUD, "Tôi có nên đi khám bác sĩ không?");
    assert.equal(invalid.mode, "local");
    assert.equal(invalid.error, "HTTP 422");
    assert.ok(invalid.answer.includes(DISCLAIMER));
    assert.ok(invalid.nodes.includes("SEEK_CARE"));

    globalThis.fetch = async () => jsonResponse(404, {});
    assert.equal((await askDrBunny(AUD, "Tôi có nên đi khám bác sĩ không?")).mode, "local");

    globalThis.fetch = async () => jsonResponse(503, {});
    assert.equal((await askDrBunny(AUD, "q")).mode, "local");

    globalThis.fetch = hangingFetch;
    const timeout = await askDrBunny(AUD, "q", 30);
    assert.equal(timeout.mode, "local");
    assert.equal(timeout.error, "timeout");

    globalThis.fetch = async () => jsonResponse(200, { answer: "ok", mode: "hardcoded", nodes: [] });
    assert.equal((await askDrBunny({}, "q")).answer, "ok");

    assert.equal(t.live.size, 0, "mọi timer phải được dọn (finally)");
  } finally { t.restore(); globalThis.fetch = realFetch; }
});

test("api.getConfig: gộp phần trình bày theo id; lỗi hoặc quá hạn -> null thay vì treo (AUDIT-08)", { timeout: 5000 }, async () => {
  try {
    globalThis.fetch = async (url) => String(url).endsWith("/presets")
      ? jsonResponse(200, { freqs: [250], level_presets: { Normal: [10] }, cutoff: { Normal: 8000 }, noise_gain: { Normal: 0.03 } })
      : jsonResponse(200, [{ id: "water", label: "Vòi nước", freq: 250, db: 20 }]);
    const cfg = await getConfig();
    assert.deepEqual(cfg.freqs, [250]);
    assert.equal(cfg.soundItems[0].emoji, "🚰", "emoji được gộp từ SOUND_PRESENTATION theo id");

    globalThis.fetch = async () => jsonResponse(500, {});
    assert.equal(await getConfig(), null);

    globalThis.fetch = hangingFetch;
    const t0 = Date.now();
    assert.equal(await getConfig(40), null);
    assert.ok(Date.now() - t0 < 1500, "phải bỏ cuộc theo timeout, không treo mãi ở 'checking'");
  } finally { globalThis.fetch = realFetch; }
});

// ---------- AUDIT-21: chữ trên icon âm vị phải khớp band của engine ----------
// Một âm vị "thuộc band X" nếu nó bị ẩn từ mức đầu tiên rụng band X: HIGH -> Mild, MID -> Moderate, LOW -> Severe.
// Nguyên âm không bao giờ bị ẩn (engine giữ nguyên âm ở mọi mức).
const firstLevelHidden = (tok) => LEVELS.find((lv) => degradeTokens(tok, lv, "vi", "north").some((t) => t.cls === "hide")) ?? null;

test("icon âm vị của audiogram khớp band của engine tiếng Việt (AUDIT-21)", () => {
  const expected = { ph_high: ["Mild"], ph_mid: ["Moderate"], ph_low: ["Severe", null] };   // null = nguyên âm, không bao giờ ẩn
  for (const [id, allowed] of Object.entries(expected)) {
    for (const tok of SOUND_PRESENTATION[id].text.split(" ")) {
      assert.ok(allowed.includes(firstLevelHidden(tok)), `${id}: "${tok}" bị engine ẩn từ mức ${firstLevelHidden(tok)}, icon đang xếp sai band`);
    }
  }
});

test("danh sách fallback SOUND_ITEMS dùng đúng chữ của SOUND_PRESENTATION (không lệch nhau)", () => {
  for (const it of SOUND_ITEMS) if (SOUND_PRESENTATION[it.id]?.text) assert.equal(it.text, SOUND_PRESENTATION[it.id].text, it.id);
});

// ---------- chế độ chạy trong máy ----------
test("chế độ offline chủ động: không gọi mạng lần nào, vẫn trả lời và có cấu hình dự phòng (app mobile / demo)", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("không được gọi mạng"); };
  try {
    setApiBase(OFFLINE);
    assert.equal(isOfflineMode(), true);
    const r = await askDrBunny(AUD, "ù tai có sao không");
    assert.equal(r.mode, "local");
    assert.ok(r.answer.includes(DISCLAIMER));
    assert.equal(await getConfig(), null);
    assert.equal(calls, 0, "chế độ offline không được phép chạm mạng");
  } finally { globalThis.fetch = realFetch; setApiBase("/api"); }
});

test("GraphRAG trong máy: có dấu hay không dấu cho cùng kết quả, luôn kèm câu miễn trừ", () => {
  assert.deepEqual(retrieve(AUD, "Tôi bị ù tai").map((x) => [x.id, x.score]), retrieve(AUD, "Tôi bị u tai").map((x) => [x.id, x.score]));
  assert.equal(norm("Đường Hết").trim(), "duong het");
  for (const q of ["", "xin chào", "nghe không rõ chữ s ở nơi ồn"]) assert.ok(answerLocal(AUD, q).answer.includes(DISCLAIMER));
  assert.doesNotThrow(() => answerLocal({}, "audiogram rỗng không được làm văng lỗi"));
});

// ---------- nhiễu thủ tục trong máy (tính chất, không so từng mẫu với numpy) ----------
const powerSpectrum = (x) => { const re = Float64Array.from(x), im = new Float64Array(x.length); fft(re, im); return re.map((v, i) => v * v + im[i] * im[i]); };
const hfFraction = (x) => { const p = powerSpectrum(x), n = x.length; let hi = 0, tot = 0; for (let k = 1; k <= n / 2; k++) { tot += p[k]; if (k * SR / n > 2000) hi += p[k]; } return hi / tot; };
const rmsOf = (x) => Math.sqrt(x.reduce((a, v) => a + v * v, 0) / x.length);

test("nhiễu trong máy: năng lượng trên 2 kHz giảm dần theo mức; RMS tăng theo mức; biên độ trong [-1, 1]", () => {
  const out = LEVELS.map((lv) => renderProcedural("shopping", lv));
  const hf = out.map(hfFraction);
  for (let i = 1; i < hf.length; i++) assert.ok(hf[i] < hf[i - 1], `HF phải giảm: ${hf.map((v) => v.toFixed(3))}`);
  const rms = out.map(rmsOf);
  for (let i = 1; i < rms.length; i++) assert.ok(rms[i] > rms[i - 1], `RMS phải tăng: ${rms.map((v) => v.toFixed(3))}`);
  for (const x of out) assert.ok(x.every((v) => v >= -1 && v <= 1));
});

test("nhiễu trong máy: điều biên có đỉnh quanh nhịp âm tiết 3–5 Hz", () => {
  const n = 2 ** 18;                                      // ≈ 11,9 giây, độ phân giải 0,084 Hz
  const env = modulationEnvelope(n, rngFromSeed(7));
  const mean = env.reduce((a, v) => a + v, 0) / n;
  const p = powerSpectrum(env.map((v) => v - mean));
  let best = 0, bestK = 0;
  for (let k = 1; k * SR / n <= 12; k++) if (p[k] > best) { best = p[k]; bestK = k; }
  const f = bestK * SR / n;
  assert.ok(f >= 3 && f <= 5, `đỉnh điều biên ở ${f.toFixed(2)} Hz`);
});

test("nhiễu trong máy: tuần hoàn (lặp liền mạch), tất định theo seed, từ chối độ dài không phải luỹ thừa của 2", () => {
  const x = renderProcedural("car", "Moderate");
  let diff = 0; for (let i = 1; i < x.length; i++) diff += Math.abs(x[i] - x[i - 1]);
  assert.ok(Math.abs(x[0] - x[x.length - 1]) < 6 * diff / (x.length - 1), "chỗ nối đầu-cuối không được nhảy");
  assert.deepEqual(renderProcedural("car", "Moderate", 4096, 5), renderProcedural("car", "Moderate", 4096, 5));
  assert.notDeepEqual(renderProcedural("car", "Moderate", 4096, 5), renderProcedural("car", "Moderate", 4096, 6));
  assert.ok(seedFromString("a|b") !== seedFromString("a|c"));
  assert.throws(() => renderProcedural("car", "Normal", 1000), RangeError);
});

// ---------- lưu trữ và cài đặt ----------
test("storage: lưu và đọc lại (Node không có localStorage nên đi qua bộ nhớ phiên)", async () => {
  await setItem("k1", "giá trị");
  assert.equal(await getItem("k1"), "giá trị");
  await setJSON("obj", { a: 1 });
  assert.deepEqual(await getJSON("obj"), { a: 1 });
  assert.deepEqual(await getJSON("không-có", { d: 0 }), { d: 0 });
});

test("store: lưu cài đặt, chuyển sang chế độ trong máy thì backend = local, chấp nhận hướng dẫn thì onboarded", async () => {
  const s = () => useStore.getState();
  await s().loadSettings();
  assert.equal(s().ready, true);
  assert.equal(s().settings.onboarded, false);
  await s().acceptOnboarding();
  assert.equal(s().settings.onboarded, true);
  await s().saveSettings({ apiBase: OFFLINE });
  await s().refreshBackend();
  assert.equal(s().backend, "local");
  assert.equal(isOfflineMode(), true);
  await s().loadSettings();                                // đọc lại từ bộ nhớ lưu trữ
  assert.equal(s().settings.apiBase, OFFLINE);
  assert.equal(s().settings.onboarded, true);
});
