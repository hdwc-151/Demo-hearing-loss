# HearAtlas — Apple HealthKit audiogram (iOS native only)

**Trạng thái:** tích hợp mã nguồn read-only + hiển thị preview, **chưa build/test trên Xcode hoặc iPhone thật**. Không tuyên bố đã kết nối thành công tài khoản Apple Health của người dùng.

## Cấu trúc

- \`frontend/ios/App/App/AppDelegate.swift\`: local \`HealthAudiogramPlugin\` dùng \`HKHealthStore\`, \`HKAudiogramSample\`, truy vấn audiogram mới nhất sau khi hỏi quyền.
- \`frontend/ios/App/App/SceneDelegate.swift\`: \`HearAtlasBridgeViewController\` đăng ký plugin iOS bằng \`registerPluginInstance\`.
- \`frontend/ios/App/App/HearAtlas.entitlements\`: HealthKit capability.
- \`frontend/ios/App/App/Info.plist\`: \`NSHealthShareUsageDescription\`, giải thích phạm vi đọc.
- \`frontend/src/util/healthkitAudiogram.js\`: chỉ cho phép gọi plugin từ app native iOS, validate source, unit, frequency, bilateral data, date.
- \`frontend/src/components/HealthImport.jsx\`: nút **Đọc audiogram từ Apple Health** trong Cài đặt chỉ hiển thị trên iPhone native. Không ghi vào localStorage, Zustand hay gửi mạng. Người dùng có thể xóa preview ngay.

## Xcode sign-off trên macOS (chưa xác minh)

1. Có tài khoản Apple Developer hỗ trợ HealthKit entitlement cho Bundle ID hiện tại và provisioning profile tương ứng.
2. \`cd frontend && npm ci && npm run cap:sync\`, mở \`frontend/ios/App/App.xcodeproj\` trên Xcode bản tương thích.
3. Chọn App target → Signing & Capabilities → xác nhận HealthKit xuất hiện, provisioning và entitlements \`App/HearAtlas.entitlements\`; kiểm tra \`NSHealthShareUsageDescription\`.
4. Kiểm tra \`SceneDelegate\` thực sự dùng \`HearAtlasBridgeViewController\` và plugin đăng ký trước khi JS gọi.
5. Test trên **iPhone thật**: chưa có dữ liệu, có dữ liệu 2 tai, thiếu 1 tai, từ chối cấp quyền, cấp lại quyền trong Settings, iOS 15–18, iOS 18.1+ với \`point.tests\`, tần số thiếu, nhiều mẫu, màn hình rời/khôi phục.
6. Kiểm tra bản phát hành không gửi HealthKit tới backend, logs, analytics, LLM hoặc trình lưu trữ. Xóa dữ liệu preview khi màn Settings unmount.
7. Không tự gắn dữ liệu HealthKit lên đường giả định của Simulator; muốn dùng để mô phỏng phải thêm **source label** rõ, lựa chọn tai trái/phải, consent và các đường đo còn thiếu.

**Bảo mật và chính sách:** Không dùng HealthKit làm training data, không xuất dữ liệu ra cloud theo mặc định. Không xem kết quả “không có dữ liệu” như bằng chứng chắc chắn người dùng chưa từng đo: HealthKit trả về rỗng cả khi quyền bị từ chối. Không chuyển đổi dB HL ↔ dBFS/dB SPL khi thiếu hiệu chuẩn.

**Nguồn API Apple:**
- https://developer.apple.com/documentation/healthkit/hkaudiogramsample
- https://developer.apple.com/documentation/healthkit/hkaudiogramsensitivitypoint
- https://developer.apple.com/documentation/healthkit/hkaudiogramsensitivitytest
- https://developer.apple.com/documentation/healthkit/hkunit/decibelhearinglevel()
- https://capacitorjs.com/docs/ios/custom-code

**Chưa hỗ trợ:** web/PWA/Android, song phương sync, HealthKit write, iCloud backup, chia sẻ cho model. Không thể chạy HealthKit thật trong GitHub Actions runner Linux.
