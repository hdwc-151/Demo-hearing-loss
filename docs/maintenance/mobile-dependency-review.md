# Rà soát dependency và mobile — 2026-11-11

## Kết luận và phạm vi

Dependabot PR [#11](https://github.com/hdwc-151/Demo-hearing-loss/pull/11) là cập nhật tự động theo nhóm `@capacitor/*` trong `.github/dependabot.yml`, không phải bằng chứng repo bị xâm nhập. Kiểm tra bằng GitHub connector thấy PR mở, chưa merge, `mergeable=true`, `mergeable_state=clean`, không có review/comment. Không bật auto-merge, không sửa hoặc đóng nhánh Dependabot trong đợt này.

Đã kiểm kê cây tệp, lịch sử/README/archive và rà các thành phần đang được duy trì: frontend, API/Python engines, native Android/iOS, cấu hình, CI, Docker và test. Không cài hay chạy lại dependency của các bản cũ trong `archive/`. Quét dependency và rà soát mã có mục tiêu không phải chứng nhận repo hoàn toàn không có lỗ hổng.

## PR #11: commit, thay đổi và CI

- Base `main`: `729211619d43a407128bc09f1bc8fbd394faa12b`.
- Head Dependabot: `2775e246754a750545165a56e213186bcef99366`.
- Chỉ thay `frontend/package.json` và `frontend/package-lock.json`.
- Core/Android/CLI/iOS: **8.5.3 → 8.6.0**; Assets: **3.0.5 → 4.0.0**. Assets là thay đổi major, cần test riêng, không suy ra tương thích từ bốn cập nhật minor.

GitHub connector trả **7 check success** trên đúng head SHA, không phải chỉ trạng thái tổng hợp hoặc workflow bị skip:

| Workflow | Run | Job thành công |
| --- | --- | --- |
| CI | [42981839821](https://github.com/hdwc-151/Demo-hearing-loss/actions/runs/42981839821) | backend, auditory-reference, frontend, e2e |
| Mobile builds | [42981839876](https://github.com/hdwc-151/Demo-hearing-loss/actions/runs/42981839876) | android (assembleDebug + APK artifact), ios (Simulator compile) |
| HealthKit native compile | [42981839807](https://github.com/hdwc-151/Demo-hearing-loss/actions/runs/42981839807) | ios-simulator-compile |

Kiểm thử riêng checkout nguyên PR #11 trên Windows/Node 24.22.1: `npm ci`, 48 Node tests, parity văn bản **111/111**, hằng số **8/8**, GraphRAG **87/87**, Vite production build đều qua. Assets 4 tạo thành công **74 tài nguyên Android + 7 iOS** trên checkout riêng; không ghi đè bộ hình đang duy trì. Các kết quả này không xác nhận âm thanh/rung/HealthKit trên thiết bị thật.

## Bảo mật dependency

Audit npm ngày 2026-11-11, dùng lockfile của từng checkout, bao gồm devDependencies:

| Checkout | Critical | High | Moderate | Tổng mục package bị đánh dấu |
| --- | ---: | ---: | ---: | ---: |
| `main` tại SHA trên | 1 | 4 | 7 | 12 |
| PR #11 nguyên bản | 0 | 1 | 8 | 9 |
| Nhánh cải tiến: bộ Capacitor #11 + Vite 6.4.6 | 0 | 0 | 7 | 7 |

Đây là số mục package trong kết quả `npm audit`, không phải số CVE độc lập hay số đường khai thác. Dependency runtime của nhánh cải tiến: **0 cảnh báo** khi `npm audit --omit=dev`. Audit Python của môi trường kiểm thử đã cài: **0 lỗ hổng được biết**, sau khi cập nhật pip trong venv; không suy ra mọi phiên bản được cận dưới requirements cho phép đều an toàn.

Các lỗi nghiêm trọng ban đầu thuộc **công cụ phát triển/build**: `tar` qua CLI cũ lồng trong Assets 3, `sharp` cũ, Capacitor CLI/xcode và Vite 5. Chưa phát hiện bằng chứng các lỗi này đã bị khai thác. PR #11 bỏ CLI 5 lồng và nâng sharp, nhưng vẫn giữ Vite 5.4.21 có advisory high. Vì vậy nhánh này kiểm thử cùng bộ nâng cấp Capacitor và bổ sung **Vite 6.4.6**, tương thích peer range Vite 6 của plugin React 4.3.4. Không dùng `npm audit fix --force` để đổi hàng loạt major.

Nguồn advisory mẫu: [tar path traversal](https://github.com/advisories/GHSA-34x7-hfp2-rc4v), [sharp/libvips](https://github.com/advisories/GHSA-f88m-g3jw-g9cj), [Vite/launch-editor](https://github.com/advisories/GHSA-587h-7wmj-h5pm). Kết quả audit trực tiếp và lockfile là cơ sở cho bảng trên; advisory có thể thay đổi sau ngày rà soát.

**Còn 7 mục moderate** trong toolchain: `@capacitor/assets`, `@trapezedev/project`, `xcode`, `uuid`, `rimraf`, `glob`, `minimatch`. Một số là đánh dấu lan truyền từ dependency con, không phải 7 lỗi độc lập. Cần tiếp tục nâng parent package có bản vá tương thích hoặc đánh giá override riêng; chưa áp override major chưa kiểm thử. Không dùng ảnh/đầu vào build không tin cậy và không mở dev server công khai khi chưa rà cấu hình. CI mới chạy cả `npm audit --audit-level=high`, thay vì chỉ quét runtime và bỏ sót build tools.

**Giới hạn connector:** endpoint Dependabot alerts bị GitHub Fetch từ chối vì không thuộc tập endpoint được hỗ trợ. Do đó chưa xác minh dashboard Security alerts/Code scanning/secret scanning hoặc branch protection; không tuyên bố dashboard Security sạch. Chưa chạy SAST toàn diện, kiểm thử xâm nhập hoặc audit dependency Android/iOS bằng công cụ chuyên biệt. API công khai vẫn cần HTTPS, giới hạn request/chi phí và quản lý secret như tài liệu triển khai.

## Mã và cấu hình được cải thiện

- Mobile runner chạy Vite + Capacitor CLI cục bộ, build tài nguyên mới và chỉ sync nền tảng được chọn. Android chạy độc lập với Xcode; iOS báo yêu cầu macOS trước khi thay tệp trên host không phù hợp.
- Native bundle luôn có base `/`, `offline`, không bật demo; không thừa hưởng tiền tố Pages hay API web ngoài ý muốn. Giữ application ID, storage keys và mặc định local.
- Bổ sung lệnh run/debug/test; Gradle wrapper hỗ trợ Windows và Unix; Simulator build không cần signing và có đường dẫn đầu ra cố định.
- Sửa race khi gỡ component trước lúc `App.addListener` resolve: listener đến muộn được gỡ, callback cũ bị chặn; có regression test.
- Thêm privacy manifest UserDefaults reason `CA92.1` vào Xcode target Resources cho Capacitor Preferences. CI xác minh tệp nằm trong app; không coi manifest là xác nhận App Privacy/HealthKit đã hoàn tất.
- Build demo gọi Vite bằng Node trực tiếp, tránh `npx` không chạy được qua `execFileSync` trên Windows. Demo/ảnh lịch sử không bị thay đổi.
- CI bổ sung mobile regression tests, audit đầy đủ, Android unit/lint, APK và báo cáo; đóng gói Simulator app. Workflow HealthKit dùng cùng lệnh sync mobile và trigger khi runner/config thay đổi.
- README Việt là mặc định, có EN/简体中文 đầy đủ, lưu nguyên README cũ. Sửa thông tin React/Zustand và yêu cầu Xcode/Android Studio; mô tả API/native CORS, build/test và các giới hạn thật.

## Kiểm thử nhánh cải tiến

| Kiểm tra cục bộ | Kết quả |
| --- | --- |
| Backend pytest | 87 passed, 1 skipped (research SciPy riêng); một cảnh báo deprecation TestClient ở bộ Python mới |
| GraphRAG retrieval | dev 12/12, holdout 8/8; holdout từng được dùng khi tuning |
| Frontend | 48 Node tests; parity 111 + 8 + 87 qua |
| Mobile runner/lifecycle | 4 regression tests qua |
| Build web/mobile/demo | Vite 6.4.6 qua; sync Android 5 plugin qua; ép base/API đúng khi env cố tình đặt Pages prefix/API sai |
| Chromium UI | 16 browser + 18 review + 13 mobile viewport + 10 Audio Lab checks qua |
| Demo mới, file:// | 8 checks qua; không gọi mạng |
| Offline PWA | 5 checks qua |
| Dependency audit | runtime 0; đầy đủ 0 critical/high, 7 moderate; môi trường Python 0 |

Cục bộ dùng Windows, Node **24.22.1**, Python **3.13.12**; CI dùng Node **22**, Python **3.12**, Linux/Android SDK/JDK 21 và macOS/Xcode. Máy cục bộ không có Android SDK/JDK 21 hay Xcode nên không nhận local sync là native compile. Trạng thái native compile của nhánh mới phải đối chiếu các run liên kết trong PR sau khi push, không lấy kết quả xanh của #11 để thay thế.

## Điều kiện trước khi merge hoặc phát hành

1. Tất cả check của **head commit mới nhất** phải hoàn tất; kiểm log Android lint, APK và iOS Simulator artifact, manifest đóng gói.
2. Review phần major Assets 4, Vite 6 và lockfile; nhánh này chứa cùng năm cập nhật package của #11 nhưng **không merge PR #11**. Nếu chọn merge nhánh này, #11 có thể trùng/nảy conflict; rà lại rồi quyết định đóng/rebase riêng.
3. Test trên Android/iPhone thật: mất mạng từ cold start, lưu/reload cài đặt, audio/rung, chuyển app/khóa màn hình/cuộc gọi, VoiceOver/TalkBack và kết nối API HTTPS/CORS.
4. HealthKit cần acceptance riêng: denied/empty/revoked, hai tai, tương thích OS, kiểm tra không gửi dữ liệu. Không đóng issue #31 chỉ vì Simulator compile.
5. Signed AAB/IPA, team/entitlement/profile, Play internal test/TestFlight và backend production là các gate chưa hoàn tất. Xem [deployment readiness](../product/DEPLOYMENT_READINESS.md).

Nguồn yêu cầu mobile: [Capacitor 8](https://capacitorjs.com/docs/updating/8-0), [Preferences](https://capacitorjs.com/docs/apis/preferences), [privacy manifest](https://capacitorjs.com/docs/ios/privacy-manifest).
