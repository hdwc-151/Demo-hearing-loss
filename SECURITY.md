# Chính sách bảo mật

## Phiên bản được hỗ trợ
Chỉ nhánh `main` và bản phát hành mới nhất.

## Báo lỗ hổng
**Đừng mở issue công khai.** Dùng *Security → Report a vulnerability* (GitHub private advisory) của repo, hoặc email [email người duy trì]. Hãy nêu: mô tả, các bước tái hiện, phiên bản/commit, ảnh hưởng. Chúng tôi phản hồi trong vòng 7 ngày và công bố cùng bản vá.

## Phạm vi
Backend FastAPI (lạm dụng API, DoS tài nguyên, lộ thông tin), XSS/CSRF trong web, chuỗi cung ứng (dependency), cấu hình mẫu (Docker, nginx, CI), ứng dụng iOS/Android.

## Thiết kế an toàn hiện có
- Kiểm tra đầu vào chặt (`Literal`, giới hạn độ dài, khoảng giá trị, tập khoá bắt buộc); cache có chặn trên bộ nhớ.
- CORS theo danh sách origin; không trả chi tiết lỗi LLM/nội bộ ra API; `torch.load(weights_only=True)`.
- React tự escape nội dung; CSP trong `frontend/nginx.conf`; không chạy mã từ dữ liệu người dùng.
- App mobile: không xin quyền, mặc định không gửi dữ liệu đi, `allowBackup=false`.

## Giới hạn đã biết
`/graphrag` chưa có giới hạn tần suất (cần reverse proxy nếu bật LLM — [docs/deployment.md](docs/deployment.md)); `/noise` cache 24 giờ chưa có ETag; 9 cảnh báo `npm audit` ở công cụ build (không nằm trong bản đóng gói) chờ nâng major.
