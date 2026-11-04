# ADR-0005: Demo là chính ứng dụng dựng thành MỘT file HTML

- **Trạng thái:** chấp nhận · **Ngày:** 2026-10-28
- **Bối cảnh:** cần liên kết demo chạy ngay, đăng ở đâu cũng được (GitHub Pages, Claude artifact, email), không máy chủ.
- **Quyết định:** `npm run build:demo` chạy Vite ở chế độ `demo` (`VITE_DEMO=1`, tắt mọi lời gọi mạng) rồi nhúng JS và CSS vào `demo/index.html`. Không viết tay một bản demo riêng.
- **Hệ quả:** (+) demo luôn là phiên bản thật, không lệch; có e2e riêng (`e2e_demo.py`: mở bằng `file://`, không gọi mạng). (−) file ~210 KB; phải dùng hàm thay thế (không phải chuỗi) khi nhúng JS vì mã nén chứa `$&`, `$'` (đã gặp và sửa).
