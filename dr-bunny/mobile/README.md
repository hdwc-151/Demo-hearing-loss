# Mobile (iOS / Android)

Ứng dụng mobile là **chính ứng dụng web** (`frontend/`) được bọc bằng [Capacitor 8](https://capacitorjs.com/). Thư mục này chứa thiết kế, tài nguyên và hồ sơ cửa hàng; dự án native nằm ở `frontend/android/` và `frontend/ios/`. Thiết kế đầy đủ: [docs/mobile-app-design.md](../docs/mobile-app-design.md).

```
mobile/
├── resources/      icon-only.png, icon-foreground/background.png, splash*.png (sinh bởi make_icons.py)
└── store/          listing.vi.md · listing.en.md · privacy-policy.md · data-safety.md · review-notes.md · screenshots/
```

## Yêu cầu

| | Android | iOS |
|---|---|---|
| Hệ điều hành máy build | Linux / macOS / Windows | **macOS** |
| Công cụ | Android Studio (Koala+), **JDK 21**, Android SDK 36 | Xcode 16+, tài khoản Apple Developer để chạy máy thật |
| Phiên bản tối thiểu của app | Android 7.0 (minSdk 24) | iOS 15 |
| Chung | Node 22, `npm ci` trong `frontend/` | |

## Chạy trên máy ảo hoặc máy thật

```bash
cd frontend
npm ci
npm run android        # build web → cap sync → mở Android Studio → bấm Run
npm run ios            # (macOS) build web → cap sync → mở Xcode → chọn thiết bị → Run
```
Sửa mã web xong, chạy lại `npm run cap:sync` (hoặc lệnh trên) để chép bản build mới vào dự án native. Muốn tải lại nóng khi phát triển: đặt `server.url` trỏ tới Vite dev trong `capacitor.config.json` **chỉ trên máy bạn**, không commit.

## Thông tin cần đổi trước khi phát hành

| Việc | Ở đâu |
|---|---|
| `appId` (`app.drbunny.simulator`) → tên miền của bạn | `frontend/capacitor.config.json`, rồi `npx cap sync`; đổi cả `applicationId` trong `android/app/build.gradle` và bundle identifier trong Xcode |
| Tên hiển thị, phiên bản, build number | `package.json`; `android/app/build.gradle` (`versionCode`, `versionName`); Xcode (Version, Build) |
| Biểu tượng / màn hình chờ | sửa `resources/make_icons.py` hoặc thay PNG rồi `make assets` |
| Địa chỉ máy chủ mặc định (nếu muốn) | bản phát hành mặc định chạy **trong máy**; người dùng tự nhập máy chủ trong Cài đặt |

## Phát hành

**Android (Google Play)**
1. Tạo keystore: `keytool -genkey -v -keystore drbunny.jks -alias drbunny -keyalg RSA -keysize 2048 -validity 10000` (**không commit**; lưu mật khẩu an toàn). Hoặc dùng Play App Signing.
2. Android Studio → *Build → Generate Signed Bundle* (AAB) → tải lên *Internal testing*.
3. Điền Data safety theo `store/data-safety.md`, nội dung listing theo `store/listing.*.md`, ảnh trong `store/screenshots/android-phone/`.

**iOS (App Store)**
1. Xcode → target *App* → *Signing & Capabilities*: chọn Team, bật tự quản lý chữ ký.
2. *Product → Archive* → *Distribute App → App Store Connect* → thử trên **TestFlight**.
3. App Privacy theo `store/data-safety.md`; ảnh iPhone 6.7" trong `store/screenshots/ios-6.7/`; ghi chú cho người duyệt: `store/review-notes.md`.

CI: `.github/workflows/mobile.yml` build debug (APK, iOS Simulator) để bắt lỗi biên dịch sớm; việc ký và tải lên cửa hàng làm thủ công hoặc bằng Fastlane (chưa cấu hình sẵn).

## Việc **bắt buộc thử trên thiết bị thật** (chưa kiểm chứng trong repo này)

- iOS: phát âm thanh khi bật công tắc im lặng (đã đặt `AVAudioSession.playback` trong `AppDelegate.swift`).
- Cuộc gọi đến / khoá màn hình giữa lúc đang phát (app phải tự dừng).
- Rung nhẹ khi kéo audiogram.
- Mở app khi mất mạng; chuyển giữa chế độ trong máy và máy chủ.
- VoiceOver / TalkBack.

## Sự cố thường gặp

| Triệu chứng | Cách xử lý |
|---|---|
| `cap sync` báo thiếu thư mục `dist` | chạy `npm run build` trước (các lệnh `npm run android/ios` đã gồm bước này) |
| Android: "Unsupported class file major version" | dùng JDK 21 (File → Settings → Build Tools → Gradle → Gradle JDK) |
| Android emulator không gọi được máy chủ trên máy bạn | dùng `https://` hoặc địa chỉ `10.0.2.2`; Android chặn HTTP thường (cần `network_security_config` cho bản debug) |
| iOS: không có tiếng khi gạt công tắc im lặng | kiểm tra `AppDelegate.swift` còn đoạn `AVAudioSession` sau khi cập nhật Capacitor |
| Biểu tượng không đổi | `make assets` rồi xoá app khỏi máy ảo và cài lại |
