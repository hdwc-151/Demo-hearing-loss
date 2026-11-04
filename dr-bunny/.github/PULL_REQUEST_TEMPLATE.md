## Thay đổi
<!-- Mô tả ngắn: sửa gì và vì sao. Liên kết issue: Fixes #... -->

## Loại thay đổi
- [ ] Sửa lỗi  - [ ] Tính năng  - [ ] Tài liệu  - [ ] Hạ tầng / CI  - [ ] Ứng dụng mobile

## Checklist
- [ ] `make test` xanh (pytest + parity + test logic)
- [ ] Đổi `backend/core/*` hoặc hằng số? Đã chạy `make fixtures` và commit `tests/fixtures/*`, `frontend/src/data/graphrag_nodes.js`
- [ ] Đổi giao diện? Đã thử trên viewport điện thoại và chạy `make e2e`
- [ ] Nội dung y tế/thính học mới có nguồn; vẫn có câu miễn trừ
- [ ] Không commit khoá API, keystore, `.env`
