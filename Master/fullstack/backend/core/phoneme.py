import functools
import re
import unicodedata
from typing import Dict, List, Optional, Set, Tuple

LEVELS = ["Normal", "Mild", "Moderate", "Severe"]
HIGH, MID, LOW, VOWEL, OTHER = "HIGH", "MID", "LOW", "VOWEL", "OTHER"
DIALECTS = ("north", "south")

ONSETS = ["ngh", "ng", "nh", "ph", "th", "kh", "tr", "ch", "gh", "gi", "qu",
          "b", "c", "d", "đ", "g", "h", "k", "l", "m", "n", "p", "q", "r", "s", "t", "v", "x"]
CODAS = ["ng", "nh", "ch", "c", "m", "n", "p", "t"]

ONSET_HIGH = {"ph", "th", "kh", "x", "s", "h", "v"}
ONSET_MID = {"tr", "ch", "qu", "t", "c", "k", "q", "p"}
ONSET_LOW = {"ng", "ngh", "nh", "gh", "g", "m", "n", "l", "b", "đ"}
CODA_MID = {"p", "t", "c", "ch"}
FALLBACK = {"f": HIGH, "z": HIGH, "j": MID, "w": LOW}
DROP_BANDS: Dict[str, Set[str]] = {
    "Normal": set(),
    "Mild": {HIGH},
    "Moderate": {HIGH, MID},
    "Severe": {HIGH, MID, LOW},
}

_EN_MILD_DG = ["th", "sh", "ph", "kh"]
_EN_MOD_DG = ["ght", "ch", "tr", "gh"]
_EN_MILD, _EN_MOD, _EN_SEV = set("sfzxv"), set("tkcpgdhbđq"), set("mnlrwjy0123456789")


def bands_from_audiogram(audiogram_db: Optional[Dict[str, int]]) -> Set[str]:
    if not audiogram_db:
        return set()
    low_pta = (audiogram_db.get("250", 10) + audiogram_db.get("500", 10)) / 2.0
    mid_pta = (audiogram_db.get("1000", 10) + audiogram_db.get("2000", 15)) / 2.0
    high_pta = (audiogram_db.get("4000", 15) + audiogram_db.get("8000", 15)) / 2.0
    drop: Set[str] = set()
    if high_pta >= 35:
        drop.add(HIGH)
    if mid_pta >= 45:
        drop.add(MID)
    if low_pta >= 60:
        drop.add(LOW)
    return drop


def _is_vowel(ch: str) -> bool:
    return unicodedata.normalize("NFD", ch)[0].lower() in "aeiouy"


def _onset_band(onset: str, next_is_i: bool, dialect: str) -> str:
    o = onset.lower()
    if o == "gi" or (o == "g" and next_is_i) or o in ("d", "r"):
        return LOW if dialect == "south" else HIGH
    if o in ONSET_HIGH:
        return HIGH
    if o in ONSET_MID:
        return MID
    if o in ONSET_LOW:
        return LOW
    return FALLBACK.get(o, OTHER)


def _segment_syllable(syl: str, dialect: str) -> List[Tuple[str, str]]:
    low = syl.lower()
    segs: List[Tuple[str, str]] = []

    onset = ""
    for cand in ONSETS:
        if low.startswith(cand):
            if cand == "gi" and len(syl) <= 2:
                continue
            onset = syl[:len(cand)]
            break
    rest = syl[len(onset):]

    coda = ""
    for cand in CODAS:
        if rest.lower().endswith(cand) and len(rest) > len(cand):
            coda = rest[-len(cand):]
            break
    nucleus = rest[:len(rest) - len(coda)] if coda else rest

    if onset:
        nxt = nucleus[0] if nucleus else ""
        next_is_i = bool(nxt) and unicodedata.normalize("NFD", nxt)[0].lower() == "i"
        segs.append((onset, _onset_band(onset, next_is_i, dialect)))
    run = ""
    for ch in nucleus:
        if _is_vowel(ch):
            run += ch
        else:
            if run:
                segs.append((run, VOWEL))
                run = ""
            segs.append((ch, FALLBACK.get(ch.lower(), OTHER)))
    if run:
        segs.append((run, VOWEL))
    if coda:
        segs.append((coda, MID if coda.lower() in CODA_MID else LOW))
    return segs


@functools.lru_cache(maxsize=4096)
def _classify_cached(text: str, dialect: str) -> Tuple[Tuple[str, str], ...]:
    out: List[Tuple[str, str]] = []
    for tok in re.findall(r"[^\W\d_]+|[\s\W\d_]+", text):
        if re.fullmatch(r"[^\W\d_]+", tok):
            out.extend(_segment_syllable(tok, dialect))
        else:
            out.append((tok, OTHER))
    return tuple(out)


def classify_vi(text: str, dialect: str = "north") -> List[Tuple[str, str]]:
    text = unicodedata.normalize("NFC", text or "")
    dialect = dialect if dialect in DIALECTS else "north"
    return list(_classify_cached(text, dialect))


classify_vi_char_run = classify_vi


def _degrade_vi(text: str, drop: Set[str], dialect: str) -> str:
    return "".join((" " * len(seg)) if band in drop else seg for seg, band in classify_vi(text, dialect))


def _degrade_en(text: str, drop: Set[str]) -> str:
    if not drop:
        return text
    res = text
    if HIGH in drop:
        for p in _EN_MILD_DG:
            res = re.sub(p, lambda m: " " * len(m.group(0)), res, flags=re.IGNORECASE)
    if MID in drop:
        for p in _EN_MOD_DG:
            res = re.sub(p, lambda m: " " * len(m.group(0)), res, flags=re.IGNORECASE)
    out = []
    for ch in res:
        c = ch.lower()
        hide = ((HIGH in drop and c in _EN_MILD)
                or (MID in drop and c in _EN_MOD)
                or (LOW in drop and c in _EN_SEV))
        out.append(" " if hide else ch)
    return "".join(out)


def degrade_text(
    text: str,
    level: str = "Normal",
    lang: str = "vi",
    dialect: str = "north",
    audiogram_db: Optional[Dict[str, int]] = None,
) -> str:
    text = unicodedata.normalize("NFC", text or "")
    if audiogram_db is not None:
        drop = bands_from_audiogram(audiogram_db)
    else:
        if level == "Normal" or level not in LEVELS:
            return text
        drop = DROP_BANDS[level]
    if not drop:
        return text
    return _degrade_vi(text, drop, dialect) if lang == "vi" else _degrade_en(text, drop)


def band_summary(text: str, dialect: str = "north") -> Dict[str, int]:
    counts = {HIGH: 0, MID: 0, LOW: 0, VOWEL: 0, OTHER: 0}
    for seg, band in classify_vi(text, dialect):
        if band in counts:
            counts[band] += len(seg) if band == VOWEL else 1
    return counts
