# ADR-0001: Một repo (monorepo) cho backend, frontend, mobile và tài liệu

- **Trạng thái:** chấp nhận · **Ngày:** 2026-10-28
- **Bối cảnh:** hai bản cài đặt song song (Python, JavaScript) phải đổi cùng lúc; ứng dụng mobile dùng chung mã với web.
- **Quyết định:** một repo, thư mục `backend/`, `frontend/` (cả web và dự án Capacitor), `tests/`, `mobile/` (thiết kế, tài nguyên, listing), `docs/`, `demo/`, `legacy/`.
- **Hệ quả:** (+) một PR sửa được cả hai bên và test parity chạy chung; (+) CI một nơi. (−) CI nặng hơn; dùng `paths` filter nếu cần. Prototype cũ nằm ở `legacy/`, không chạy trong CI.
