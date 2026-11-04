# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), phiên bản theo [SemVer](https://semver.org/lang/vi/).

## [0.3.0] — 2026-10-28
### Thêm
- **App iOS/Android** bằng Capacitor 8: dự án Android (Gradle) và iOS (SwiftPM), biểu tượng và màn hình chờ, rung nhẹ, thanh trạng thái, dừng phát khi xuống nền, khoá dọc, `AVAudioSession.playback` cho iOS.
- **Chạy hoàn toàn trong máy:** `util/graphrag.js` (GraphRAG tầng 1) và `util/noise.js` (nhiễu thủ tục bằng FFT) — parity với Python (87 ca GraphRAG) và test tính chất cho nhiễu.
- **Màn Cài đặt** (chế độ dữ liệu trong máy/máy chủ, kiểm tra kết nối, rung) và **hướng dẫn an toàn** lần đầu.
- **PWA:** manifest, service worker, mở được khi mất mạng.
- **Bản demo một file HTML** (`npm run build:demo`).
- Repo GitHub đầy đủ: CI, deploy Pages, build mobile, Docker, Makefile, tài liệu, ADR, mẫu issue/PR, dependabot.
### Đổi
- Cấu trúc thư mục phẳng: `fullstack/{backend,frontend,tests}` → `backend/`, `frontend/`, `tests/`; prototype cũ vào `legacy/`.
- Mất kết nối máy chủ → Bác sĩ Thỏ trả lời bằng engine trong máy (trước đây chỉ báo lỗi).
- Vùng chạm tối thiểu 44 px trên màn cảm ứng.
### Sửa (từ đợt rà soát độc lập — xem báo cáo, AUDIT-01…24)
- Bộ đếm chữ ẩn sai ở tiếng Anh; Simulator bỏ qua audiogram người dùng kéo; câu trả lời LLM thiếu câu miễn trừ và lộ lỗi nội bộ; cache `/degrade` không chặn trên; từ khoá GraphRAG bị cộng điểm hai lần; mất lịch sử chat khi đổi tab; legend audiogram ghi ngược quy ước; DOM-XSS trong prototype; và các mục khác.
### Bảo mật
- Nâng `vite` 5.4.21 và `postcss` 8.5.31; dependency chạy thật 0 lỗ hổng đã biết.

## [0.2.0] — 2026-10-20
Bản fullstack gốc (FastAPI + React): engine chữ tiếng Việt theo âm tiết, audiogram tương tác, GraphRAG, nhiễu thủ tục và GAN tuỳ chọn. Xem `docs/history/`.
