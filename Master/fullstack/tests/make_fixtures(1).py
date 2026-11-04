import json, pathlib, sys, unicodedata

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))
from core import phoneme as ph

SENTENCES = [
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
LEVELS = ["Mild", "Moderate", "Severe"]
DIALECTS = ["north", "south"]

cases = []
for s in SENTENCES:
    for lv in LEVELS:
        for d in DIALECTS:
            cases.append({"text": s, "level": lv, "dialect": d,
                          "expected": ph.degrade_text(s, lv, "vi", d)})
for s in SENTENCES[:3]:
    nfd = unicodedata.normalize("NFD", s)
    for lv in LEVELS:
        cases.append({"text": nfd, "level": lv, "dialect": "north",
                      "expected": ph.degrade_text(s, lv, "vi", "north")})

out = HERE / "fixtures" / "phoneme_vi.json"
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps({"version": 1, "cases": cases}, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"wrote {len(cases)} cases -> {out}")
