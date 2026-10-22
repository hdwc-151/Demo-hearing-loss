const HIGH = "HIGH", MID = "MID", LOW = "LOW", VOWEL = "VOWEL", OTHER = "OTHER";
const ONSETS = [
  "ngh", "ng", "nh", "ph", "th", "kh", "tr", "ch", "gh", "gi", "qu",
  "b", "c", "d", "đ", "g", "h", "k", "l", "m", "n", "p", "q", "r", "s", "t", "v", "x",
];
const CODAS = ["ng", "nh", "ch", "c", "m", "n", "p", "t"];
const ONSET_HIGH = new Set(["ph", "th", "kh", "x", "s", "h", "v"]);
const ONSET_MID = new Set(["tr", "ch", "qu", "t", "c", "k", "q", "p"]);
const ONSET_LOW = new Set(["ng", "ngh", "nh", "gh", "g", "m", "n", "l", "b", "đ"]);
const CODA_MID = new Set(["p", "t", "c", "ch"]);
const FALLBACK = { f: HIGH, z: HIGH, j: MID, w: LOW };
const DROP_BANDS = {
  Normal: new Set(),
  Mild: new Set([HIGH]),
  Moderate: new Set([HIGH, MID]),
  Severe: new Set([HIGH, MID, LOW]),
};

const EN_MILD_DG = ["th", "sh", "ph", "kh"];
const EN_MOD_DG = ["ght", "ch", "tr", "gh"];
const EN_MILD = new Set("sfzxv");
const EN_MOD = new Set("tkcpgdhbđq");
const EN_SEV = new Set("mnlrwjy0123456789");

function isVowel(ch) {
  const base = ch.normalize("NFD")[0].toLowerCase();
  return "aeiouy".includes(base);
}

function onsetBand(onset, nextIsI, dialect) {
  const o = onset.toLowerCase();
  if (o === "gi" || (o === "g" && nextIsI) || o === "d" || o === "r") {
    return dialect === "south" ? LOW : HIGH;
  }
  if (ONSET_HIGH.has(o)) return HIGH;
  if (ONSET_MID.has(o)) return MID;
  if (ONSET_LOW.has(o)) return LOW;
  return FALLBACK[o] || OTHER;
}

function segmentSyllable(syl, dialect) {
  const low = syl.toLowerCase();
  const segs = [];

  let onset = "";
  for (const cand of ONSETS) {
    if (low.startsWith(cand)) {
      if (cand === "gi" && syl.length <= 2) continue;
      onset = syl.slice(0, cand.length);
      break;
    }
  }
  const rest = syl.slice(onset.length);

  let coda = "";
  const restLow = rest.toLowerCase();
  for (const cand of CODAS) {
    if (restLow.endsWith(cand) && rest.length > cand.length) {
      coda = rest.slice(rest.length - cand.length);
      break;
    }
  }
  const nucleus = coda ? rest.slice(0, rest.length - coda.length) : rest;

  if (onset) {
    const nxt = nucleus[0] || "";
    const nextIsI = Boolean(nxt) && nxt.normalize("NFD")[0].toLowerCase() === "i";
    segs.push([onset, onsetBand(onset, nextIsI, dialect)]);
  }
  let run = "";
  for (const ch of nucleus) {
    if (isVowel(ch)) {
      run += ch;
    } else {
      if (run) {
        segs.push([run, VOWEL]);
        run = "";
      }
      segs.push([ch, FALLBACK[ch.toLowerCase()] || OTHER]);
    }
  }
  if (run) segs.push([run, VOWEL]);
  if (coda) segs.push([coda, CODA_MID.has(coda.toLowerCase()) ? MID : LOW]);
  return segs;
}

export function classifyVi(text, dialect = "north") {
  const norm = (text || "").normalize("NFC");
  const dl = dialect === "south" ? "south" : "north";
  const tokens = norm.match(/\p{L}+|[^\p{L}]+/gu) || [];
  const out = [];
  for (const tok of tokens) {
    if (/^\p{L}+$/u.test(tok)) {
      out.push(...segmentSyllable(tok, dl));
    } else {
      out.push([tok, OTHER]);
    }
  }
  return out;
}

export function bandsFromThresholds(thresholds) {
  if (!Array.isArray(thresholds) || thresholds.length < 6) return { drop: new Set(), fadeVowels: false };
  const lowPta = (thresholds[0] + thresholds[1]) / 2;
  const midPta = (thresholds[2] + thresholds[3]) / 2;
  const highPta = (thresholds[4] + thresholds[5]) / 2;
  const drop = new Set();
  if (highPta >= 35) drop.add(HIGH);
  if (midPta >= 45) drop.add(MID);
  if (lowPta >= 60) drop.add(LOW);
  return { drop, fadeVowels: lowPta >= 55 && midPta >= 65 };
}

export function degradeText(text, level = "Normal", lang = "vi", dialect = "north") {
  const norm = (text || "").normalize("NFC");
  if (level === "Normal" || !DROP_BANDS[level]) return norm;
  if (lang === "vi") {
    const drop = DROP_BANDS[level];
    return classifyVi(norm, dialect)
      .map(([seg, band]) => (drop.has(band) ? " ".repeat(seg.length) : seg))
      .join("");
  }
  let res = norm;
  for (const p of EN_MILD_DG) res = res.replace(new RegExp(p, "gi"), (m) => " ".repeat(m.length));
  if (level === "Moderate" || level === "Severe") {
    for (const p of EN_MOD_DG) res = res.replace(new RegExp(p, "gi"), (m) => " ".repeat(m.length));
  }
  return [...res]
    .map((ch) => {
      const c = ch.toLowerCase();
      const drop =
        (level === "Mild" && EN_MILD.has(c)) ||
        (level === "Moderate" && (EN_MILD.has(c) || EN_MOD.has(c))) ||
        (level === "Severe" && (EN_MILD.has(c) || EN_MOD.has(c) || EN_SEV.has(c)));
      return drop ? " " : ch;
    })
    .join("");
}

export function degradeTokens(text, level = "Normal", lang = "vi", dialect = "north", customThresholds = null) {
  const norm = (text || "").normalize("NFC");
  const { drop, fadeVowels } = customThresholds
    ? bandsFromThresholds(customThresholds)
    : { drop: DROP_BANDS[level] || new Set(), fadeVowels: level === "Severe" };

  if (drop.size === 0 && !fadeVowels) return [{ t: norm, cls: "show" }];

  if (lang === "vi") {
    return classifyVi(norm, dialect).map(([seg, band]) => {
      if (drop.has(band)) return { t: seg, cls: "hide" };
      if (fadeVowels && band === VOWEL) return { t: seg, cls: "fade" };
      return { t: seg, cls: "show" };
    });
  }

  const effLevel = drop.has(LOW) ? "Severe" : drop.has(MID) ? "Moderate" : drop.has(HIGH) ? "Mild" : "Normal";
  const degraded = degradeText(norm, effLevel, "en", dialect);
  return [...norm].map((ch, idx) => {
    if (degraded[idx] === " " && ch !== " ") return { t: ch, cls: "hide" };
    if (fadeVowels && ch.trim()) return { t: ch, cls: "fade" };
    return { t: ch, cls: "show" };
  });
}
