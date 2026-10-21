// Phoneme Visual Degradation phía client. Đồng bộ logic với backend/core/phoneme.py (R-06).
// VI: tokenizer âm tiết (R-04 bản 2) — tách (âm đầu)(nguyên âm)(âm cuối), phân band theo
//     loại âm + vị trí; xử đúng "gi"; giữ nguyên âm + thanh điệu.
// EN: giữ engine set ký tự cũ.
// Trả token React: {t, cls} với cls = '' | 'hide' | 'fade'.

const HIGH = "HIGH", MID = "MID", LOW = "LOW", VOWEL = "VOWEL", OTHER = "OTHER";

const ONSETS = ["ngh", "ng", "nh", "ph", "th", "kh", "tr", "ch", "gh", "gi", "qu",
  "b", "c", "d", "đ", "g", "h", "k", "l", "m", "n", "p", "q", "r", "s", "t", "v", "x"];
const CODAS = ["ng", "nh", "ch", "c", "m", "n", "p", "t"];
const ONSET_HIGH = new Set(["ph", "th", "kh", "x", "s", "h", "v"]);
const ONSET_MID = new Set(["tr", "ch", "qu", "t", "c", "k", "q", "p"]);
const ONSET_LOW = new Set(["ng", "ngh", "nh", "gh", "g", "m", "n", "l", "b", "đ"]);
const CODA_MID = new Set(["p", "t", "c", "ch"]);
const CODA_LOW = new Set(["m", "n", "ng", "nh"]);
const FALLBACK = { f: HIGH, z: HIGH, j: MID, w: LOW };
const DROP_BANDS = { Mild: [HIGH], Moderate: [HIGH, MID], Severe: [HIGH, MID, LOW] };

const baseLetter = (ch) => ch.normalize("NFD")[0].toLowerCase();
const isVowel = (ch) => "aeiouy".includes(baseLetter(ch));

function onsetBand(onset, nextIsI, dialect) {
  const o = onset.toLowerCase();
  if (o === "gi" || (o === "g" && nextIsI) || o === "d" || o === "r")
    return dialect === "south" ? LOW : HIGH;
  if (ONSET_HIGH.has(o)) return HIGH;
  if (ONSET_MID.has(o)) return MID;
  if (ONSET_LOW.has(o)) return LOW;
  return FALLBACK[o] || OTHER;
}

function segmentSyllable(syl, dialect) {
  const low = syl.toLowerCase();
  const segs = [];
  // 1) âm đầu greedy
  let onset = "";
  for (const cand of ONSETS) {
    if (low.startsWith(cand)) {
      if (cand === "gi" && syl.length <= 2) continue; // "gi"/"gì" đứng 1 mình -> 'g'
      onset = syl.slice(0, cand.length); break;
    }
  }
  let rest = syl.slice(onset.length);
  // 2) âm cuối
  let coda = "";
  for (const cand of CODAS) {
    if (rest.toLowerCase().endsWith(cand) && rest.length > cand.length) { coda = rest.slice(-cand.length); break; }
  }
  const nucleus = coda ? rest.slice(0, rest.length - coda.length) : rest;
  // 3) phát band
  if (onset) {
    const nxt = nucleus[0] || "";
    segs.push([onset, onsetBand(onset, nxt && baseLetter(nxt) === "i", dialect)]);
  }
  let run = "";
  for (const ch of nucleus) {
    if (isVowel(ch)) run += ch;
    else { if (run) { segs.push([run, VOWEL]); run = ""; } segs.push([ch, FALLBACK[ch.toLowerCase()] || OTHER]); }
  }
  if (run) segs.push([run, VOWEL]);
  if (coda) segs.push([coda, CODA_MID.has(coda.toLowerCase()) ? MID : LOW]);
  return segs;
}

function classifyVi(text, dialect) {
  const out = [];
  const parts = text.match(/\p{L}+|[^\p{L}]+/gu) || [];
  for (const tok of parts) {
    if (/^\p{L}+$/u.test(tok)) out.push(...segmentSyllable(tok, dialect));
    else out.push([tok, OTHER]);
  }
  return out;
}

function tokensVi(text, level, dialect) {
  const drop = DROP_BANDS[level] || [];
  return classifyVi(text, dialect).map(([seg, band]) => {
    if (drop.includes(band)) return { t: seg, cls: "hide" };
    if (band === VOWEL && level === "Severe") return { t: seg, cls: "fade" };
    return { t: seg, cls: "" };
  });
}

// --- EN cũ ---
const EN_MILD = new Set("sfzxvSFZXV");
const EN_MOD = new Set("tkcpgdhbđqTKCPGDHBĐQ");
const EN_SEV = new Set("mnlrwjyMNLRWJY0123456789");
function tokensEn(text, level) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    const two = text.substr(i, 2).toLowerCase();
    const three = text.substr(i, 3).toLowerCase();
    if (three === "ght" && (level === "Moderate" || level === "Severe")) { out.push({ t: "   ", cls: "hide" }); i += 3; continue; }
    if (["th", "sh", "ph", "kh"].includes(two)) { out.push({ t: "  ", cls: "hide" }); i += 2; continue; }
    if (["ch", "tr", "gh"].includes(two) && (level === "Moderate" || level === "Severe")) { out.push({ t: "  ", cls: "hide" }); i += 2; continue; }
    const ch = text[i];
    if (level === "Mild" && EN_MILD.has(ch)) out.push({ t: ch, cls: "hide" });
    else if (level === "Moderate" && (EN_MILD.has(ch) || EN_MOD.has(ch))) out.push({ t: ch, cls: "hide" });
    else if (level === "Severe") out.push((EN_MILD.has(ch) || EN_MOD.has(ch) || EN_SEV.has(ch)) ? { t: ch, cls: "hide" } : { t: ch, cls: "fade" });
    else out.push({ t: ch, cls: "" });
    i++;
  }
  return out;
}

export function degradeTokens(text, level, lang = "vi", dialect = "north") {
  text = (text || "").normalize("NFC"); // đồng bộ backend: văn bản NFD (macOS) phải cho cùng kết quả
  if (level === "Normal") return [{ t: text, cls: "" }];
  return lang === "vi" ? tokensVi(text, level, dialect) : tokensEn(text, level);
}
