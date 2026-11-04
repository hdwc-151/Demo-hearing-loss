"""Sinh tests/fixtures/parity_fixture.json từ backend Python (nguồn chân lý).

File có 2 phần, frontend (scripts/check-parity.mjs) đọc cả hai:
  - cases:     văn bản tiếng Việt VÀ tiếng Anh x mức x giọng -> kết quả mong đợi (khớp từng ký tự)
  - constants: hằng số dùng chung (tần số, preset, cutoff, ...) để phát hiện frontend bị lệch
               so với backend/core/constants.py (BUILD_LOG R-06)
  - graphrag:  (audiogram, câu hỏi) -> kết quả truy xuất + câu trả lời tầng 1; bản JS offline
               (frontend/src/util/graphrag.js) phải trùng khớp
Ngoài ra sinh frontend/src/data/graphrag_nodes.js (dữ liệu 6 nút tri thức) từ backend/core/graphrag.py.

Chạy lại khi đổi thuật toán hoặc hằng số:  python tests/make_fixtures.py
Test `test_parity_fixture_is_fresh` (test_backend.py) báo lỗi nếu quên chạy lại.
"""
import json
import pathlib
import sys
import unicodedata

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))
from core import constants as C  # noqa: E402
from core import phoneme as ph  # noqa: E402
from core import graphrag as gr  # noqa: E402
from eval_retrieval import CASES as EVAL_DEV, HOLDOUT as EVAL_HOLD  # noqa: E402

FIXTURE_PATH = HERE / "fixtures" / "parity_fixture.json"
NODES_JS_PATH = HERE.parent / "frontend" / "src" / "data" / "graphrag_nodes.js"
VERSION = 3

SENTENCES_VI = [
    "Vâng, của bác xong hết rồi ạ. Tổng cộng hóa đơn là 276 nghìn.",
    "Bố ơi, cuối tuần này vợ chồng con đưa hai cháu về quê thăm bố mẹ nhé.",
    "Chúng ta rà soát lại tiến độ dự án trước khi chốt ngân sách quý ba.",
    "Em ơi, cho bàn anh xin thêm ít khăn giấy và thanh toán luôn nhé!",
    "Đứng gần cổng chính thôi nhé! Bên kia đang đông lắm.",
    "Rẽ phải ở lối ra tiếp theo, rồi rẽ trái ngay ngã tư đèn đỏ nhé.",
    "Hãy lắng nghe tiếng violin vút cao hòa cùng tiếng sáo trúc.",
    "Dạ sáng thứ Bảy tụi con đi sớm cho kịp ăn trưa ạ.",
    "gì gia giêng gà nghe nhanh sáng kịp con mắt măng ông quà xin chào",
    "ngh nh ng gh ph th kh tr ch qu",
    "Tiếng nước nhỏ giọt, chó sủa, máy hút bụi, pháo hoa!",
    "Chim hót 4500 Hz; xe tải 98 dB.",
    "dơ ra đi về dòng sông",
]
# Tiếng Anh: engine EN trước đây KHÔNG có ca nào trong fixture (chỉ được fuzz thủ công).
SENTENCES_EN = [
    "Thanks, the night shift caught the whole street.",
    "She thought the physics graph looked rough through the fog.",
    "Khaki shorts, a shiny watch and a bright phone.",
    "Let's review the Q3 forecast before we finalize the budget.",
    "THE NIGHT SHIFT CAUGHT THE WHOLE STREET.",
    "Your total is $27.60; the bus costs 12 dollars.",
    "Listen to the high violin notes blending with the soft flute.",
    "ghost ghth thr tch chth sth",
]
LEVELS = ["Mild", "Moderate", "Severe"]
DIALECTS = ["north", "south"]


def build_cases():
    cases = []
    for s in SENTENCES_VI:
        for lv in LEVELS:
            for d in DIALECTS:
                cases.append({"lang": "vi", "text": s, "level": lv, "dialect": d,
                              "expected": ph.degrade_text(s, lv, "vi", d)})
    # văn bản NFD (vd copy từ macOS): phải cho ra cùng kết quả với NFC
    for s in SENTENCES_VI[:3]:
        nfd = unicodedata.normalize("NFD", s)
        for lv in LEVELS:
            cases.append({"lang": "vi", "text": nfd, "level": lv, "dialect": "north",
                          "expected": ph.degrade_text(s, lv, "vi", "north")})
    for s in SENTENCES_EN:
        for lv in LEVELS:
            cases.append({"lang": "en", "text": s, "level": lv, "dialect": "north",
                          "expected": ph.degrade_text(s, lv, "en", "north")})
    return cases


def build_constants():
    return {
        "freqs": C.FREQS,
        "level_presets": C.LEVEL_PRESETS,
        "level_cutoff": C.LEVEL_CUTOFF,
        "level_noise_gain": C.LEVEL_NOISE_GAIN,
        "scenarios": C.SCENARIOS,
        "sound_items": C.SOUND_ITEMS,
    }


EXTRA_QUESTIONS = [
    "", "ù tai", "u tai", "Thuốc hết rồi nhưng tôi vẫn nghe rõ", "Tôi có nên đi khám bác sĩ không?",
    "tại sao tôi không nghe rõ chữ s", "Hôm nay bố hét to quá làm con khó chịu", "NGHE KHÔNG RÕ Ở NƠI ỒN ÀO",
    "can toi may tro thinh khong",
]


def _aud(preset):
    return {str(f): int(v) for f, v in zip(C.FREQS, preset)}


def build_graphrag_cases():
    auds = [_aud(C.LEVEL_PRESETS["Normal"]), _aud(C.LEVEL_PRESETS["Moderate"]),
            {"250": 20, "500": 25, "1000": 30, "2000": 55, "4000": 60, "8000": 65}]
    cases = []
    for q in [c[0] for c in EVAL_DEV] + [c[0] for c in EVAL_HOLD] + EXTRA_QUESTIONS:
        for a in auds:
            r = gr.retrieve(a, q, k=3)
            cases.append({"audiogram": a, "question": q, "ids": [x["id"] for x in r], "scores": [x["score"] for x in r],
                          "hits": [x["hits"] for x in r], "fallback": gr._fallback_answer(a, q)})
    return cases


def build_nodes_js():
    payload = {"disclaimer": gr.DISCLAIMER, "weights": {"condition": gr.W_CONDITION, "word": gr.W_WORD, "phrase": gr.W_PHRASE},
               "nodes": [{"id": n["id"], "keywords": n["keywords"], "text": n["text"], "advice": n["advice"]} for n in gr.NODES]}
    return ("// TỰ SINH bởi tests/make_fixtures.py từ backend/core/graphrag.py — KHÔNG sửa tay.\n"
            "// Điều kiện `when` của từng nút nằm ở util/graphrag.js và được check-parity.mjs kiểm tra.\n"
            "export default " + json.dumps(payload, ensure_ascii=False, indent=1) + ";\n")


def build_fixture():
    return {"version": VERSION, "cases": build_cases(), "constants": build_constants(), "graphrag": build_graphrag_cases()}


def main():
    fx = build_fixture()
    FIXTURE_PATH.parent.mkdir(exist_ok=True)
    FIXTURE_PATH.write_text(json.dumps(fx, ensure_ascii=False, indent=1), encoding="utf-8")
    NODES_JS_PATH.write_text(build_nodes_js(), encoding="utf-8")
    print(f"wrote {len(fx['cases'])} cases + {len(fx['graphrag'])} graphrag cases + constants -> {FIXTURE_PATH}")
    print(f"wrote graphrag nodes -> {NODES_JS_PATH}")


if __name__ == "__main__":
    main()
