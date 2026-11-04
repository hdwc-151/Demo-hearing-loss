# ADR-0002: Capacitor cho app iOS/Android

- **Trạng thái:** chấp nhận · **Ngày:** 2026-10-28
- **Bối cảnh:** sản phẩm dựa vào Web Audio (lọc, điều biên), SVG audiogram kéo thả và một codebase React đã có test. Nhóm nhỏ, cần ra app nhanh.
- **Phương án:** (A) PWA thuần; (B) Capacitor bọc web; (C) React Native; (D) Flutter.
- **Quyết định:** **B**, kèm PWA cài được cho người không dùng cửa hàng.
- **Lý do:** tái sử dụng 100 % giao diện và engine đã được test; Web Audio và SVG chạy nguyên vẹn; plugin chính thức cho rung, thanh trạng thái, màn hình chờ, lưu trữ, vòng đời app. C/D buộc viết lại giao diện và DSP.
- **Hệ quả:** (+) một codebase, cập nhật nhanh. (−) hiệu năng WebView thấp hơn native thuần; trên iOS phải đặt `AVAudioSession = playback` để Web Audio không bị công tắc im lặng chặn (đã vá trong `AppDelegate.swift`); không render được giọng nói thành audio để lọc (xem lộ trình: cần plugin native TTS).
