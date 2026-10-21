"""Đo chất lượng truy xuất GraphRAG trên bộ câu hỏi DEV (nhỏ, tự gán nhãn).

Chạy:  python tests/eval_retrieval.py
Lưu ý: bộ này dùng để theo dõi hồi quy, KHÔNG phải benchmark độc lập — tránh tinh chỉnh
từ khoá quá khớp riêng bộ này.
"""
import pathlib, sys

BACKEND = pathlib.Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
from core import graphrag  # noqa: E402

AUD = {"250": 20, "500": 25, "1000": 30, "2000": 55, "4000": 60, "8000": 65}  # high=60, low=25

# (câu hỏi, node kỳ vọng ở top-1)
CASES = [
    ("Ở siêu thị tôi nghe tiếng nhưng không rõ chữ, tại sao?", "NOISY_ENVIRONMENT"),
    ("Người nhà nên nói thế nào để tôi nghe dễ hơn?", "FAMILY_COMMUNICATION"),
    ("Tiếng chim hót sao tôi không nghe thấy?", "HIGH_FREQ_LOSS"),
    ("Nói to quá tôi thấy đau tai, sao vậy?", "LOUDNESS_RECRUITMENT"),
    ("Tôi có nên đi khám bác sĩ không?", "SEEK_CARE"),
    ("Tiếng nước nhỏ giọt sao nghe nhỏ thế?", "LOW_MID_FREQ_LOSS"),
    ("Phụ âm s, t, k có bị mất không?", "HIGH_FREQ_LOSS"),
    ("Quán cà phê đông người thì làm sao?", "NOISY_ENVIRONMENT"),
    ("Bố mẹ tôi hay hét lên khi nói chuyện", "FAMILY_COMMUNICATION"),
    ("Tôi bị ù tai, có nghiêm trọng không?", "SEEK_CARE"),
    ("Khi nào tôi cần máy trợ thính?", "SEEK_CARE"),
    ("Vì sao tôi nghe được tiếng xe nhưng không rõ người nói?", "NOISY_ENVIRONMENT"),
]

# HOLDOUT: viết TRƯỚC khi tinh chỉnh, KHÔNG dùng để chọn tham số/từ khoá.
HOLDOUT = [
    ("Ở nhà hàng đông khách tôi không hiểu người phục vụ", "NOISY_ENVIRONMENT"),
    ("Tôi nên đi khám ở đâu?", "SEEK_CARE"),
    ("Giọng trẻ em sao tôi khó nghe?", "HIGH_FREQ_LOSS"),
    ("Người thân nói to quá làm tôi khó chịu", "LOUDNESS_RECRUITMENT"),
    ("Tiếng xe máy ngoài đường làm tôi không nghe rõ", "NOISY_ENVIRONMENT"),
    ("Tôi thấy khó nghe trong cuộc họp có nhiều người nói", "NOISY_ENVIRONMENT"),
    ("Tôi bị ù tai về đêm, có bình thường không?", "SEEK_CARE"),
    ("Phụ âm f và v khó nghe quá", "HIGH_FREQ_LOSS"),
]


def evaluate(cases=None, verbose=True):
    top1 = top2 = 0
    for q, gold in (cases or CASES):
        ranked = [n["id"] for n in graphrag.retrieve(AUD, q, k=3)]
        ok1 = bool(ranked) and ranked[0] == gold
        ok2 = gold in ranked[:2]
        top1 += ok1; top2 += ok2
        if verbose and not ok1:
            print(f"  MISS top1  gold={gold:22} got={ranked[:2]}  | {q}")
    n = len(cases or CASES)
    if verbose:
        print(f"top-1 {top1}/{n} = {top1/n:.2%} | top-2 {top2}/{n} = {top2/n:.2%}")
    return top1 / n, top2 / n


if __name__ == "__main__":
    print("DEV:");    evaluate()
    print("HOLDOUT:"); evaluate(HOLDOUT)
