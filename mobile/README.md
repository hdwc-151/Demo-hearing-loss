# Mobile (iOS / Android)

Trạng thái build, cách kiểm tra backend và các gate phát hành còn thiếu: [Deployment readiness](../docs/product/DEPLOYMENT_READINESS.md). Chưa có tài khoản developer vẫn chạy được CI Android debug và iOS Simulator; chưa đủ để phát hành lên cửa hàng.

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
| Công cụ | Android Studio **Otter 2025.2.1+**, **JDK 21**, Android SDK 36 | **Xcode 26+**, SwiftPM; signing phù hợp cho máy thật |
| Phiên bản tối thiểu của app | Android 7.0 (minSdk 24) | iOS 15 |
| Chung | Node 22, `npm ci` trong `frontend/` | |

## Chạy trên máy ảo hoặc máy thật

```bash
cd frontend
npm ci
npm run android        # build web → cap sync → mở Android Studio → bấm Run
npm run ios            # (macOS) build web → cap sync → mở Xcode → chọn thiết bị → Run
```
Sửa mã web xong, chạy lại `npm run cap:sync -- android` hoặc `npm run cap:sync -- ios` (macOS). Các lệnh `android` và `ios` chỉ đồng bộ nền tảng tương ứng. Không chạy lại `cap add` vì dự án native đã được commit.

`npm run build:mobile` ép `VITE_BASE=/`, `VITE_API_BASE=offline`, `VITE_DEMO=0`; môi trường Pages hoặc `.env.local` không được làm sai đường dẫn asset native. Không commit `server.url`, `cleartext`, `allowNavigation` mở rộng hoặc cấu hình live reload vào bản phát hành. App native dùng tài nguyên đã đóng gói và không đăng ký PWA service worker.

### Build và kiểm tra không cần IDE đang mở

Từ `frontend/`, sau `npm ci`:

```sh
npm run test:mobile     # test lệnh build và vòng đời sự kiện native
npm run android:run     # build + sync + cap run android (chọn emulator/thiết bị)
npm run android:debug   # build + sync + Gradle assembleDebug
npm run android:test    # build + sync + testDebugUnitTest và lintDebug
npm run ios:run         # macOS: build + sync + cap run ios
npm run ios:debug       # macOS: build + sync + xcodebuild Simulator, không ký
```

- Android: cài SDK 36 và chấp nhận SDK licenses trong Android Studio; chọn JDK 21 cho Gradle. Khi dùng CLI, đặt `JAVA_HOME`, `ANDROID_HOME` hoặc `android/local.properties` trỏ tới SDK trên máy. Không commit đường dẫn máy cá nhân.
- APK ở `frontend/android/app/build/outputs/apk/debug/app-debug.apk`. Bật USB debugging rồi `adb install -r <đường-dẫn-apk>` hoặc kéo APK vào emulator. Đây là APK ký bằng debug key, không dùng để phát hành.
- Simulator app ở `frontend/ios/DerivedData/Build/Products/Debug-iphonesimulator/App.app`. Mở Simulator, chọn và khởi động thiết bị rồi `xcrun simctl install booted ios/DerivedData/Build/Products/Debug-iphonesimulator/App.app` từ `frontend/`; mở bằng `xcrun simctl launch booted app.drbunny.simulator`.
- iOS build chỉ chạy trên macOS; Windows/Linux dùng job iOS trong GitHub Actions. Simulator không cần tài khoản Apple. Máy thật cần signing/team/profile; HealthKit có gate quyền và entitlement riêng, không được suy ra từ build Simulator.
- Báo cáo Android nằm trong `frontend/android/app/build/reports/`. CI tải lên APK, báo cáo Android và ZIP Simulator app; tải artifact tại trang run workflow `Mobile builds (Android / iOS)`.

### API trên thiết bị và CORS

Mặc định native ở **Trong máy** và không cần API. Nếu bật máy chủ, nhập URL HTTPS đầy đủ, ví dụ `https://api.example.com`, trong Cài đặt. `/api` chỉ dùng được khi có reverse proxy trên web, còn `localhost` của điện thoại không phải máy tính phát triển.

```dotenv
# Ví dụ cấu hình ở MÁY CHỦ, chỉ thêm origin thực sự sử dụng
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://localhost,capacitor://localhost
```

Origin mặc định Android là `https://localhost`, iOS là `capacitor://localhost`. Không thêm đường dẫn `/api` vào origin CORS. Cổng API không có prefix trừ khi bạn cấu hình reverse proxy. Dùng nút **Kiểm tra kết nối** để kiểm tra `/health`; xác minh cả request POST khi dùng API thật.

Android emulator dùng `10.0.2.2` để định tuyến tới máy host; iOS Simulator có thể truy cập host qua loopback. Tuy nhiên HTTPS vẫn cần chứng chỉ được tin cậy và đúng hostname. Để thử native/API, dùng HTTPS dev endpoint hoặc tunnel có chứng chỉ hợp lệ và không đưa dữ liệu cá nhân lên dịch vụ chưa được phê duyệt. Giữ `allowMixedContent=false`, không mở HTTP toàn cục hay tắt ATS trong release. Khóa LLM chỉ ở backend.

### Privacy manifest iOS

`frontend/ios/App/App/PrivacyInfo.xcprivacy` khai báo UserDefaults reason `CA92.1` cho Capacitor Preferences và được thêm vào target Resources. CI kiểm tra manifest có trong Simulator app. Đây là khai báo API truy cập cài đặt, không thay thế App Privacy, data-safety hoặc đồng ý HealthKit. Rà lại dữ liệu gửi lên API/LLM trước khi phát hành. Tham khảo [Preferences](https://capacitorjs.com/docs/apis/preferences), [privacy manifest](https://capacitorjs.com/docs/ios/privacy-manifest).

## Thông tin cần đổi trước khi phát hành

| Việc | Ở đâu |
|---|---|
| Chỉ đổi `appId` (`app.drbunny.simulator`) khi chủ động tạo danh tính ứng dụng mới | Đồng bộ `frontend/capacitor.config.json`, Android namespace/applicationId, package MainActivity, strings và bundle identifier/profile/entitlement trong Xcode; `cap sync` không tự đổi mọi ID |
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

CI: `.github/workflows/mobile.yml` build APK debug, chạy Android unit/lint, compile và đóng gói iOS Simulator trên PR/main/tag hoặc chạy tay. Việc ký release và tải lên cửa hàng làm thủ công hoặc bằng Fastlane (chưa cấu hình sẵn). [Rà soát dependency và CI](../docs/maintenance/mobile-dependency-review.md).

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
| Emulator không gọi được API | kiểm tra HTTPS/chứng chỉ, host có thể truy cập, CORS và URL đầy đủ; xem phần API ở trên |
| iOS: không có tiếng khi gạt công tắc im lặng | kiểm tra `AppDelegate.swift` còn đoạn `AVAudioSession` sau khi cập nhật Capacitor |
| Biểu tượng không đổi | `make assets` rồi xoá app khỏi máy ảo và cài lại |
