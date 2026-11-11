# Hợp nhất dependency sau PR #35

Ngày chuẩn bị: 2026-11-11. Nền: main `74a99190c4800d84849bef31b1cab63a883bf42d`.

PR #35 đã được người sở hữu cho phép merge sau 7/7 check thành công.
Nhánh này giữ lịch sử merge của các PR dưới đây để kiểm thử **cùng một tổ hợp** trước khi đưa vào main.
Không lấy check xanh của một nhánh cũ làm bằng chứng duy nhất cho tổ hợp mới.

| PR | Thay đổi | Gate cho tổ hợp mới |
| --- | --- | --- |
| #2 | upload-artifact v7 | Android/iOS build, tải artifact thành công |
| #5 | FastAPI 0.162.0 | Cài bộ pin, API/DSP tests, E2E |
| #6 | google-services 4.5.0 | Resolve classpath và Android build/unit/lint; chưa bật Firebase |
| #7 | Starlette 1.10.0 | Cài cùng FastAPI và chạy backend/E2E |
| #8 | Pydantic 2.14.2 | Validation API và backend/E2E |
| #10 | NumPy 2.5.4 | Backend, research reference và Python–JS parity |
| #12 | Playwright 1.64.1 | Cài Chromium tương ứng và E2E |
| #13 | setup-java v6 | Android build/unit/lint với JDK 21 |
| #17 | Autoprefixer 10.6.2 | Lockfile, web build, browser và native builds |
| #19 | PostCSS 8.5.32 | Lockfile, web build, browser và native builds |
| #33 | Zustand 5.1.0 | State/logic, browser và native builds |

Các xung đột ở requirements-tested và package/lockfile được giải quyết bằng cách giữ
tất cả phiên bản đích trong bảng. CI backend và E2E cài đồng thời requirements.txt và
requirements-tested.txt; do đó resolver phải chấp nhận chính tổ hợp pin này. Bộ test
research có môi trường SciPy riêng như trước.

## Các PR giữ ngoài tổ hợp

- **#11 Capacitor**: năm cập nhật đã có trong PR #35 và đã qua build Android/iOS, kiểm thử
  Assets 4 và audit toolchain. Không nhập lại một lockfile cũ hoặc tạo merge rỗng chỉ để
  thay nhãn trạng thái. Xử lý PR này như cập nhật đã được thay thế bởi #35.
- **#34 Tailwind 4**: các check frontend/native thất bại; cần một migration CSS/build riêng.
- **#4 Gradle 9.8.2**: các check cũ không chạy Android. Chưa có bằng chứng migration
  Gradle major với cấu hình AGP/Capacitor hiện tại; giữ wrapper 8.14.3 đã build thành công.
- **#3 configure-pages v6**: check PR cũ không chạy step cấu hình/deploy Pages.
  Chưa coi CI chung là kiểm thử action này. Pages trên main đã deploy với v5.
- **#9 gradle/actions v6**: upstream tách cache thành thành phần thương mại có điều khoản
  riêng. Chưa thay v4 hoặc chấp nhận thay đổi điều khoản trong lần merge này. Xem
  [release v6](https://github.com/gradle/actions/releases/tag/v6.0.0) và
  [thông báo của Gradle](https://blog.gradle.org/github-actions-for-gradle-v6).

## Giới hạn

Merge dependency không sửa các vấn đề đã ghi trong báo cáo: evidence router bỏ sót
paraphrase/phủ định, khác biệt UI/API, DSP trên UI thread và thiếu nghiệm thu máy thật.
APK debug và iOS Simulator không phải bản phát hành đã ký hoặc kiểm định lâm sàng.
Chỉ merge tổ hợp sau khi CI hiện hành đạt; ghi SHA và liên kết run trong PR.
