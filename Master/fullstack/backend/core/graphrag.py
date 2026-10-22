import os
import re
import unicodedata
from typing import Dict, List, Optional
import httpx

DISCLAIMER = "(Đây là mô phỏng & sàng lọc tham khảo, không thay chẩn đoán của bác sĩ.)"

W_CONDITION = 1.0
W_WORD = 1.5
W_PHRASE = 2.5

NODES = [
    {
        "id": "HIGH_FREQ_LOSS",
        "keywords": ["chu", "phu am", "khong ro", "nham", "s", "x", "th", "ch", "thi tham", "chim", "tre em", "phu nu", "bien mat"],
        "when": lambda p: p["high"] > 25,
        "text": "Tần số cao (2000–8000 Hz) bị giảm nên các phụ âm s, x, ph, th, kh, t, ch, k, p dễ 'rụng' khỏi câu nói; "
                "tiếng chim, tiếng thì thầm, giọng trẻ em và phụ nữ khó nghe hơn.",
        "advice": "Nhờ người nói nhìn thẳng mặt để đọc khẩu hình, nói chậm và tách rõ từng chữ.",
    },
    {
        "id": "LOW_MID_FREQ_LOSS",
        "keywords": ["nho", "be", "yen tinh", "tram", "buoc chan", "am luong", "ca am thanh", "giot", "nuoc"],
        "when": lambda p: p["low"] > 25,
        "text": "Dải trầm-trung (250–1000 Hz) cũng giảm nên âm thanh nói chung nhỏ đi rõ rệt, kể cả trong phòng yên tĩnh.",
        "advice": "Nên đo thính lực lâm sàng tại chuyên khoa Tai-Mũi-Họng để kiểm tra cả dẫn truyền khí và xương.",
    },
    {
        "id": "NOISY_ENVIRONMENT",
        "keywords": ["on", "sieu thi", "nha hang", "dong nguoi", "hop", "xe", "tieng on", "nghe tieng", "khong ro chu",
                     "tieng xe", "xe co", "duong pho", "giao thong", "quan ca phe"],
        "when": lambda p: p["high"] > 20,
        "text": "Ở nơi ồn (siêu thị, nhà hàng, cuộc họp), tiếng ồn nền che lấp các phụ âm yếu tần số cao. "
                "Bạn vẫn nghe được nguyên âm nên biết có người nói, nhưng não phải tự đoán phụ âm → nghe nhầm và mệt mỏi thính giác.",
        "advice": "Chọn chỗ ngồi xa nguồn ồn, quay mặt về phía người nói, giảm tiếng TV/nhạc nền khi trò chuyện.",
    },
    {
        "id": "FAMILY_COMMUNICATION",
        "keywords": ["nguoi nha", "gia dinh", "con chau", "noi the nao", "giao tiep", "ong ba", "bo me", "het len", "noi to"],
        "when": lambda p: p["high"] > 20,
        "text": "Người thân thường nói to hơn khi thấy ông bà nghe kém, nhưng nói to chủ yếu tăng âm trầm, không giúp phụ âm cao rõ hơn.",
        "advice": "3 nguyên tắc: nói chậm & rõ (không hét), nhìn thẳng mặt khi nói, giảm tiếng ồn nền trước khi trò chuyện.",
    },
    {
        "id": "LOUDNESS_RECRUITMENT",
        "keywords": ["choi tai", "to qua", "het", "kho chiu", "nhuc tai", "am to", "dau tai"],
        "when": lambda p: p["high"] > 40,
        "text": "Với suy giảm tiếp nhận, khoảng cách giữa 'vừa nghe thấy' và 'quá to, khó chịu' bị thu hẹp (loudness recruitment): "
                "nói nhỏ thì không nghe, hét lên lại thấy chói.",
        "advice": "Giữ âm lượng vừa phải và ổn định, ưu tiên nói rõ thay vì nói to.",
    },
    {
        "id": "SEEK_CARE",
        "keywords": ["di kham", "bac si", "may tro thinh", "dieu tri", "co sao khong", "nghiem trong", "o tai", "u tai", "ù tai"],
        "when": lambda p: p["high"] > 40 or p["low"] > 30,
        "text": "Mức ngưỡng bạn đang mô phỏng nằm trong vùng nên được đo thính lực chuẩn để biết chính xác.",
        "advice": "Đặt lịch khám Tai-Mũi-Họng / trung tâm thính học; chỉ chuyên gia mới tư vấn máy trợ thính phù hợp.",
    },
]


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFD", (s or "").lower()).replace("đ", "d")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return " " + " ".join(re.findall(r"[a-z0-9]+", s)) + " "


for _n in NODES:
    _n["keywords"] = [_norm(k).strip() for k in _n["keywords"]]


def profile(audiogram_db: Dict[str, int]) -> Dict[str, float]:
    high = (audiogram_db["2000"] + audiogram_db["4000"] + audiogram_db["8000"]) / 3.0
    low = (audiogram_db["250"] + audiogram_db["500"] + audiogram_db["1000"]) / 3.0
    return {"high": high, "low": low}


def retrieve(audiogram_db: Dict[str, int], question: str = "", k: int = 3) -> List[dict]:
    p = profile(audiogram_db)
    q = _norm(question)
    scored = []
    for n in NODES:
        score = W_CONDITION if n["when"](p) else 0.0
        hits = []
        for kw in n["keywords"]:
            if f" {kw} " in q:
                hits.append(kw)
                score += W_PHRASE if " " in kw else W_WORD
        if score > 0:
            scored.append((score, n, hits))
    scored.sort(key=lambda x: -x[0])
    return [{"id": n["id"], "score": round(s, 1), "hits": h, "text": n["text"], "advice": n["advice"]}
            for s, n, h in scored[:k]]


def retrieve_context(audiogram_db: Dict[str, int], question: str = "") -> str:
    p = profile(audiogram_db)
    lines = [f"PTA trầm-trung (250–1000Hz): {p['low']:.1f} dB HL | PTA cao (2000–8000Hz): {p['high']:.1f} dB HL."]
    for n in retrieve(audiogram_db, question):
        lines.append(f"[{n['id']}] {n['text']} Lời khuyên: {n['advice']}")
    return "\n".join(lines)


def build_system_prompt(audiogram_db: Dict[str, int], question: str = "") -> str:
    return (
        "Bạn là Bác sĩ Thỏ (Dr. Bunny), trợ lý giáo dục thính học ấm áp.\n"
        f"Dữ liệu GraphRAG của người dùng:\n{retrieve_context(audiogram_db, question)}\n\n"
        "QUY TẮC BẮT BUỘC:\n"
        "1. CHỈ dựa vào dữ liệu GraphRAG ở trên; không bịa thêm số liệu hay bệnh danh.\n"
        "2. Không chẩn đoán. Luôn nhắc đây là công cụ mô phỏng & sàng lọc tham khảo.\n"
        "3. Trả lời ngắn gọn, dễ hiểu cho người lớn tuổi lẫn con cháu."
    )


def _fallback_answer(audiogram_db: Dict[str, int], question: str) -> str:
    p = profile(audiogram_db)
    nodes = retrieve(audiogram_db, question, k=2)
    head = f"🐰 Ngưỡng bạn đang mô phỏng — trầm-trung: {round(p['low'])} dB HL, cao: {round(p['high'])} dB HL. "
    if not nodes:
        return head + "Với mức này bạn nghe rõ hầu hết âm thanh và phụ âm. " + DISCLAIMER
    body = " ".join(f"{n['text']} 👉 {n['advice']}" for n in nodes)
    return head + body + " " + DISCLAIMER


def answer(audiogram_db: Dict[str, int], question: Optional[str]) -> dict:
    q = (question or "").strip()
    nodes = retrieve(audiogram_db, q)
    base = {"context": retrieve_context(audiogram_db, q), "nodes": [n["id"] for n in nodes]}
    api_key = os.getenv("LLM_API_KEY")
    if not api_key or not q:
        return {**base, "answer": _fallback_answer(audiogram_db, q), "mode": "hardcoded"}
    try:
        reply = _call_llm(build_system_prompt(audiogram_db, q), q, api_key)
        return {**base, "answer": reply, "mode": "llm"}
    except Exception as e:
        return {**base, "answer": _fallback_answer(audiogram_db, q), "mode": "hardcoded", "llm_error": str(e)}


_HTTP: Optional[httpx.Client] = None


def _client() -> httpx.Client:
    global _HTTP
    if _HTTP is None:
        _HTTP = httpx.Client(timeout=30.0)
    return _HTTP


def _call_llm(system_prompt: str, user_q: str, api_key: str) -> str:
    base = os.getenv("LLM_BASE_URL", "https://open.bigmodel.cn/api/paas/v4")
    model = os.getenv("LLM_MODEL", "glm-4-flash")
    r = _client().post(
        f"{base}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"model": model, "temperature": 0.3, "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_q},
        ]},
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]
