# Engine chạy trong máy

Ba bộ máy giúp web, PWA, iOS và Android hoạt động đầy đủ **không cần backend**. Python (`backend/core`) là bản tham chiếu; JavaScript (`frontend/src/util`) là bản chạy trong máy, được giữ song song bằng test.

| Engine | JavaScript | Python (tham chiếu) | Cách kiểm song song |
|---|---|---|---|
| Chữ rụng (vi + en) | `util/phoneme.js` | `core/phoneme.py` | `check-parity.mjs`: 111 ca cố định; fuzz 13.500 kết quả khớp 100 % (kể cả văn bản NFD) |
| GraphRAG tầng 1 | `util/graphrag.js` + `data/graphrag_nodes.js` (tự sinh) | `core/graphrag.py` | `check-parity.mjs`: 87 ca (điểm, từ khoá khớp, câu trả lời từng ký tự) |
| Nhiễu thủ tục | `util/noise.js` | `core/noise.py` | **Tính chất**, không so từng mẫu (số ngẫu nhiên khác nhau): năng lượng > 2 kHz giảm theo mức, RMS tăng theo mức, đỉnh điều biên 3–5 Hz, tuần hoàn, tất định theo seed |
| Hằng số | `data/constants.js` | `core/constants.py` | `check-parity.mjs`: 8 nhóm (tần số, preset, cutoff, hệ số nhiễu, kịch bản, icon) |

## Quy trình đổi backend mà không làm lệch frontend

1. Sửa `backend/core/*`.
2. `make fixtures` → ghi lại `tests/fixtures/parity_fixture.json` và `frontend/src/data/graphrag_nodes.js`.
3. `make test`: `test_parity_fixture_is_fresh` đỏ nếu quên bước 2; `check-parity.mjs` đỏ nếu JS chưa theo kịp.
4. Điều kiện `when` của từng nút GraphRAG nằm trong `util/graphrag.js` (không xuất được từ Python); ca parity với nhiều audiogram sẽ báo ngay nếu lệch.

## Nhiễu thủ tục (noise.js)

Cùng chuỗi xử lý với `noise.py`: nhiễu trắng → FFT → nhân với (độ dốc phổ f⁻² trên 500 Hz) × (gờ Gauss theo kịch bản trên trục log tần số) × (Butterworth bậc 4 theo mức) → IFFT → nhân đường bao điều biên 4 Hz → chuẩn hoá RMS. Độ dài 2¹⁶ mẫu ở 22.050 Hz (≈ 2,97 giây) để dùng FFT cơ số 2. Vì sinh bằng IFFT nên tín hiệu **tuần hoàn** theo độ dài và `src.loop = true` không tạo tiếng tách ở chỗ nối. Đo trong Node: ~55 ms cho một đoạn (chạy một lần rồi cache theo kịch bản).

## Lưu ý

- Hằng số DSP (tần số cắt, hệ số nhiễu, độ dốc phổ) là xấp xỉ tự chọn, chưa hiệu chuẩn với số liệu lâm sàng hay LTASS; mức nhiễu **to hơn** khi nghe kém hơn là ẩn dụ, không phải mô hình vật lý.
- Giọng đọc (`speechSynthesis`) không đi qua bộ lọc; chỉ giảm âm lượng. Hướng cải tiến: render giọng nói thành âm thanh rồi lọc theo audiogram (xem `mobile-app-design.md`, mục Lộ trình).
