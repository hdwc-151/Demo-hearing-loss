# Đóng góp cho Dr. Bunny

Cảm ơn bạn đã quan tâm! Dự án là công cụ **giáo dục**; mọi đóng góp cần giữ đúng tinh thần đó (không chẩn đoán, trung thực về giới hạn của mô hình).

## Thiết lập

```bash
make install          # pip (backend) + npm ci (frontend)
make test             # phải xanh trước khi mở PR
make dev-api & make dev-web
```
Cần Python 3.12, Node 22. E2E cần thêm `playwright install chromium` (xem [docs/testing.md](docs/testing.md)).

## Quy trình

1. Mở issue (hoặc nhận một issue có sẵn) trước khi làm việc lớn.
2. Nhánh từ `main`: `feat/…`, `fix/…`, `docs/…`.
3. Commit theo [Conventional Commits](https://www.conventionalcommits.org/): `feat(web): …`, `fix(api): …`, `docs: …`, `chore(mobile): …`.
4. PR nhỏ, tập trung; điền checklist trong mẫu PR. CI (backend, frontend, e2e) phải xanh.

## Quy tắc quan trọng

- **Hai engine, một sự thật.** Đổi `backend/core/*` hoặc hằng số → `make fixtures` và commit `tests/fixtures/*` + `frontend/src/data/graphrag_nodes.js`. Đừng sửa tay file sinh ra.
- **Sửa lỗi phải có test** làm đỏ khi lỗi quay lại (hãy tự kiểm bằng cách hoàn nguyên bản vá tạm thời).
- **Không tối ưu theo cảm tính:** cần số đo (xem cách đo trong `docs/`), ghi vào PR.
- **Nội dung thính học/y tế** (nút tri thức, lời nhắc LLM, ngưỡng) cần nguồn đáng tin; giữ câu miễn trừ. Không thêm lời khuyên điều trị.
- **Không commit** khoá API, keystore, `.env`, mô hình `.pt`.
- **Mobile:** sau khi sửa web chạy `npm run cap:sync` trong `frontend/`. Không commit thư mục build native (đã có trong `.gitignore`). Mọi thay đổi trong `android/` và `ios/` cần mô tả lý do trong PR vì file này do Capacitor sinh ra và dễ bị ghi đè khi nâng cấp.

## Phong cách

`.editorconfig` quy định định dạng cơ bản. Python: PEP 8, type hints cho hàm công khai. JavaScript: ES modules, không thêm thư viện lớn khi chưa cần (bundle hiện ~68 KB gzip). Tài liệu bằng tiếng Việt có dấu; mã và tên biến bằng tiếng Anh hoặc không dấu.
