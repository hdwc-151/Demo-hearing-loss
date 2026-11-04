# Triển khai

## 1. Docker (backend + web)

```bash
cp .env.example .env            # tuỳ chọn: điền LLM_API_KEY
docker compose up --build       # http://localhost:8080  (nginx phục vụ web, /api -> backend)
```
Đặt sau reverse proxy có TLS (Caddy, Traefik, nginx) khi mở ra Internet. Cùng origin nên không cần CORS; `ALLOWED_ORIGINS` chỉ cần khi web và API khác origin.

## 2. GitHub Pages (PWA offline, không backend)

`pages.yml` dựng `VITE_API_BASE=offline` và `VITE_BASE=/<tên-repo>/`: ứng dụng chạy hoàn toàn trong máy, cài được lên màn hình chính iOS/Android và mở được khi mất mạng. Bản demo một file được đặt thêm ở `/demo.html`. Bật Pages: *Settings → Pages → Source: GitHub Actions*.

## 3. Backend riêng + web tĩnh

- Backend: `docker build -t drbunny-api backend` rồi chạy ở Render/Fly.io/Railway/VPS; đặt `ALLOWED_ORIGINS=https://web-cua-ban`.
- Web: `VITE_API_BASE=https://api.cua-ban npm run build` rồi đăng `frontend/dist` lên Netlify/Cloudflare Pages/S3.
- Nếu dùng CSP của `nginx.conf`, thêm origin API vào `connect-src`.

## 4. App mobile

Xem [mobile/README.md](../mobile/README.md). Bản phát hành mặc định ở chế độ **Trong máy**; người dùng có thể trỏ tới máy chủ riêng trong Cài đặt (cần HTTPS; Android chặn HTTP thường).

## 5. Danh sách kiểm tra trước khi mở công khai

- [ ] HTTPS bắt buộc; `LLM_API_KEY` nằm trong secret, không trong ảnh Docker.
- [ ] **Giới hạn tần suất** cho `/graphrag` (reverse proxy hoặc `slowapi`) nếu bật LLM — hiện chưa có (xem báo cáo, mục O-07).
- [ ] `/noise` đang trả `Cache-Control: public, max-age=86400` mà chưa có ETag: khi nâng cấp thuật toán, đổi tham số hoặc thêm phiên bản vào URL (O-06).
- [ ] Chuyên gia thính học rà soát nội dung 6 nút tri thức và lời nhắc LLM (O-10).
- [ ] Theo dõi lỗ hổng: `npm audit --omit=dev`, dependabot đã cấu hình.
