"""Phoneme Visual Degradation — làm biến mất chữ theo tần số âm vị (Speech Banana).

VI: tokenizer ÂM TIẾT tiếng Việt — tách (âm đầu)(nguyên âm)(âm cuối), phân band tần số theo
    LOẠI ÂM và VỊ TRÍ (đầu/cuối), giữ nguyên âm + thanh điệu.
EN: giữ engine set ký tự cũ.

Band (Speech Banana):
  HIGH 2–8kHz  (mất ở Mild):     âm đầu xát/bật hơi: ph th kh x s h v r gi d(Bắc)
  MID  1–2kHz  (mất ở Moderate): âm đầu tắc: tr ch qu t c k q p  |  âm cuối tắc: p t c ch
  LOW  250–1000 (mất ở Severe):  âm đầu mũi/vang: ng(h) nh gh g m n l b đ  |  âm cuối mũi: m n ng nh
  VOWEL: nguyên âm + thanh điệu — không xoá; chỉ fade ở Severe (phía frontend).

Bản này: mọi đầu vào được chuẩn hoá NFC trước (văn bản NFD, vd từ macOS, trước đây làm vỡ
tách âm tiết); kết quả cache theo (text, dialect) vì cùng câu được gọi lặp lại nhiều lần.
"""
import functools
import re
import unicodedata
from typing import Dict, List, Tuple

LEVELS = ["Normal", "Mild", "Moderate", "Severe"]
HIGH, MID, LOW, VOWEL, OTHER = "HIGH", "MID", "LOW", "VOWEL", "OTHER"
DIALECTS = ("north", "south")

# ---- danh mục âm tiết tiếng Việt (dài trước để match greedy) ----
ONSETS = ["ngh", "ng", "nh", "ph", "th", "kh", "tr", "ch", "gh", "gi", "qu",
          "b", "c", "d", "đ", "g", "h", "k", "l", "m", "n", "p", "q", "r", "s", "t", "v", "x"]
CODAS = ["ng", "nh", "ch", "c", "m", "n", "p", "t"]

ONSET_HIGH = {"ph", "th", "kh", "x", "s", "h", "v"}
ONSET_MID = {"tr", "ch", "qu", "t", "c", "k", "q", "p"}
ONSET_LOW = {"ng", "ngh", "nh", "gh", "g", "m", "n", "l", "b", "đ"}
CODA_MID = {"p", "t", "c", "ch"}          # âm cuối tắc (không bật hơi)
FALLBACK = {"f": HIGH, "z": HIGH, "j": MID, "w": LOW}
DROP_BANDS = {"Mild": {HIGH}, "Moderate": {HIGH, MID}, "Severe": {HIGH, MID, LOW}}

# ---- EN (engine cũ) ----
_EN_MILD_DG = ["th", "sh", "ph", "kh"]
_EN_MOD_DG = ["ght", "ch", "tr", "gh"]
_EN_MILD, _EN_MOD, _EN_SEV = set("sfzxv"), set("tkcpgdhbđq"), set("mnlrwjy0123456789")


def _is_vowel(ch: str) -> bool:
    return unicodedata.normalize("NFD", ch)[0].lower() in "aeiouy"


def _onset_band(onset: str, next_is_i: bool, dialect: str) -> str:
    o = onset.lower()
    # 'gi' và 'g' trước i là âm /z/ (Bắc: HIGH); d, r cũng /z/ (Bắc)
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

    # 1) âm đầu (greedy); "gi"/"gì" đứng một mình -> coi 'g' là âm đầu
    onset = ""
    for cand in ONSETS:
        if low.startswith(cand):
            if cand == "gi" and len(syl) <= 2:
                continue
            onset = syl[:len(cand)]
            break
    rest = syl[len(onset):]

    # 2) âm cuối, chỉ khi còn nguyên âm làm nhân
    coda = ""
    for cand in CODAS:
        if rest.lower().endswith(cand) and len(rest) > len(cand):
            coda = rest[-len(cand):]
            break
    nucleus = rest[:len(rest) - len(coda)] if coda else rest

    # 3) phát band
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
    """Tách cả câu -> [(chuỗi, band)]. Đầu vào được NFC hoá; dialect lạ -> 'north'."""
    text = unicodedata.normalize("NFC", text or "")
    dialect = dialect if dialect in DIALECTS else "north"
    return list(_classify_cached(text, dialect))


classify_vi_char_run = classify_vi  # tên cũ, giữ để tương thích


def _degrade_vi(text: str, level: str, dialect: str) -> str:
    drop = DROP_BANDS[level]
    return "".join((" " * len(seg)) if band in drop else seg for seg, band in classify_vi(text, dialect))


def _degrade_en(text: str, level: str) -> str:
    res = text
    for p in _EN_MILD_DG:
        res = re.sub(p, lambda m: " " * len(m.group(0)), res, flags=re.IGNORECASE)
    if level in ("Moderate", "Severe"):
        for p in _EN_MOD_DG:
            res = re.sub(p, lambda m: " " * len(m.group(0)), res, flags=re.IGNORECASE)
    out = []
    for ch in res:
        c = ch.lower()
        drop = ((level == "Mild" and c in _EN_MILD)
                or (level == "Moderate" and (c in _EN_MILD or c in _EN_MOD))
                or (level == "Severe" and (c in _EN_MILD or c in _EN_MOD or c in _EN_SEV)))
        out.append(" " if drop else ch)
    return "".join(out)


def degrade_text(text: str, level: str, lang: str = "vi", dialect: str = "north") -> str:
    text = unicodedata.normalize("NFC", text or "")
    if level == "Normal" or level not in LEVELS:
        return text
    return _degrade_vi(text, level, dialect) if lang == "vi" else _degrade_en(text, level)


def band_summary(text: str, dialect: str = "north") -> Dict[str, int]:
    """Đếm âm vị theo band: phụ âm đếm 1/ký tự-âm, nguyên âm đếm theo số ký tự."""
    counts = {HIGH: 0, MID: 0, LOW: 0, VOWEL: 0, OTHER: 0}
    for seg, band in classify_vi(text, dialect):
        if band in counts:
            counts[band] += len(seg) if band == VOWEL else 1
    return counts
