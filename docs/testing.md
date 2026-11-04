# Kiểm thử

## Các lớp

| Lớp | Lệnh | Số lượng | Kiểm gì |
|---|---|---|---|
| Backend (pytest) | `make test-api` | 49 | Validation API, CORS, nhiễu (tính chất), GAN (độ dài, lùi tầng), âm vị, GraphRAG, LLM giả (miễn trừ, không lộ lỗi), lifespan, fixture còn tươi |
| Đo GraphRAG | `tests/eval_retrieval.py` | 12 dev + 8 holdout | Top-1/Top-2 (bộ nhỏ; holdout đã bị dùng nên chỉ để theo dõi hồi quy) |
| Parity JS↔Python | `make test-web` | 111 + 8 + 87 | Chữ rụng vi/en, hằng số, câu trả lời GraphRAG |
| Logic frontend (`node:test`) | `make test-web` | 20 | Bộ đếm chữ ẩn, `nearestLevel`, store, api (fetch giả: timeout, phân loại lỗi, offline), nhiễu trong máy, GraphRAG trong máy, lưu trữ, icon âm vị khớp engine |
| E2E giao diện | `make e2e` | 16 | Bật/tắt, cache nhiễu, một AudioContext, race khi rời tab, chat với backend thật |
| E2E hành vi cải tiến | `make e2e` | 17 | Audiogram↔Simulator, lịch sử chat, phân loại lỗi, phím tắt, XSS prototype… |
| E2E di động (iPhone 14) | `make e2e` | 13 | Hướng dẫn lần đầu, Cài đặt, chế độ trong máy không chạm mạng, rung, không tràn ngang, **xuống nền thì dừng phát** |
| E2E demo một file | `make demo` | 8 | Mở bằng `file://`, không gọi mạng, đủ chức năng |
| E2E PWA | `python tests/e2e_pwa.py` | 5 | Service worker, manifest, mở được khi mất mạng |

## Chạy

```bash
make install
make test                      # nhanh, không cần trình duyệt
# E2E cần Chromium (playwright install chromium) và hai server:
make dev-api &                 # :8000
make dev-web &                 # :5173
make e2e
make demo
```

## Kiểm tra đột biến

Trong đợt rà soát, từng bản vá được hoàn nguyên trong bản sao tạm để xác nhận test mới chuyển đỏ (18/18 đột biến bị bắt). Khi thêm test cho lỗi mới, hãy tự làm bước này: sửa tạm mã về hành vi cũ và chắc rằng test thật sự đỏ.

## Chưa được kiểm chứng (cần làm trên môi trường phù hợp)

- **Build native**: dự án Android (Gradle) và iOS (SwiftPM) được sinh bằng `cap add` và `cap sync` chạy được, nhưng **chưa biên dịch** (không có Android SDK, Xcode). Workflow `.github/workflows/mobile.yml` dành cho việc này.
- **Âm thanh thật**: e2e kiểm việc gọi Web Audio (số nguồn, bao hình biên độ, số AudioContext), không nghe được chất lượng. Cần nghe thử trên tai nghe/loa thật, kể cả khi bật công tắc im lặng iOS và khi có cuộc gọi đến.
- **Rung (Haptics)** trên thiết bị thật; trình duyệt desktop chỉ kiểm lời gọi `navigator.vibrate`.
- **GAN và LLM thật**: không có checkpoint/torch/khoá API; kiểm bằng hàm giả.
- **Giá trị khoa học**: test chứng minh mã làm đúng điều định làm, không chứng minh mô phỏng sát thính lực thực. Cần chuyên gia thính học và thí nghiệm người nghe.
