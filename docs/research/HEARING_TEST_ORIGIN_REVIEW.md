# Hearing_Test → Dr. Bunny: rà soát nguồn gốc và định hướng tích hợp

**Ngày rà soát:** 2026-11-04 · **Trạng thái:** tài liệu nghiên cứu, không sao chép code · **Không dùng để chẩn đoán**.

## Nguồn được kiểm kê

- Repository tham chiếu: [namlmao130/Hearing_Test](https://github.com/namlmao130/Hearing_Test), nhánh main, **commit \`4d585324125ad59e6123c115fabb35badb78412e\`** (28/10/2026).
- Commit đầu tiên ở repository tham chiếu: [\`03eec3d3910430c1e418b62f8976a3886bed3784\`](https://github.com/namlmao130/Hearing_Test/tree/03eec3d3910430c1e418b62f8976a3886bed3784) (26/10/2026).
- Người phát triển Dr. Bunny cho biết đây là một bản clone bắt đầu từ những dòng code đầu tiên của dự án. GitHub ghi nhận **\`fork: false\`**; một bản sao không nhất thiết là GitHub fork.
- \`Hearing_Test/package.json\` khai báo **\`"license": "UNLICENSED"\`**, và tại snapshot không có file \`LICENSE\`. Vì vậy, **không tự động sao chép hoặc biên dịch lại mã nguồn của người khác** vào Dr. Bunny chỉ vì cùng nguồn gốc; cần xác nhận quyền đối với các thay đổi riêng của repository đó. Trích dẫn liên kết và mô tả phương pháp/công thức không thay thế giấy phép sử dụng.

### Dấu vết lịch sử kiểm chứng được

Bảy WAV trong snapshot \`Hearing_Test\` có Git blob SHA **giống chính xác** các file đã lưu từ trước trong \`Dr. Bunny/archive/previous-root/Tín hiệu mẫu/\`. Ví dụ:

| File tại Hearing_Test | File archive Dr. Bunny | Git blob SHA |
| --- | --- | --- |
| \`assets/audio/input.wav\` | \`archive/previous-root/Tín hiệu mẫu/input.wav\` | \`f9fc546cd8fbfd0b1604724787e3400e2ae79729\` |
| \`assets/audio/samples/LA001.wav\` | \`archive/previous-root/Tín hiệu mẫu/LA001.wav\` | \`415fce4194a721249ef823c09abb18c4b372015e\` |
| \`assets/audio/samples/LA025.wav\` | \`archive/previous-root/Tín hiệu mẫu/LA025.wav\` | \`9a3e776153be1c13cc4ba033cb46fd4db47725c8\` |
| \`assets/audio/studio_male.wav\` | \`archive/previous-root/Tín hiệu mẫu/studio_male.wav\` | \`a752f2205a1350af3b0cf44babb9efb6a24df78d\` |

Ba file WAV còn lại cũng trùng SHA: \`lab_female.wav\`, \`lab_male.wav\`, \`studio_female.wav\`. Bằng chứng này xác nhận **dữ liệu trùng byte**, không tự chứng minh tác giả/giấy phép đối với toàn bộ phần mềm. Không cần thêm bảy bản WAV trùng lặp vào repo.

## Đọc mã nguồn: phần đáng nghiên cứu

| Phần trong Hearing_Test | Ý tưởng/thuộc tính được thấy | Tình trạng Dr. Bunny | Đề xuất |
| --- | --- | --- | --- |
| \`src/core/bayesian-core.js\` | Posterior ngưỡng đơn tần, likelihood logistic, nuisance slope/false-positive/lapse, chọn stimulus bằng expected information; trả \`inconclusive\` nếu không đủ bằng chứng | Chưa có bộ ước lượng ngưỡng độc lập | Nghiên cứu engine tự viết riêng theo tài liệu đã xuất bản; **không dùng audiogram vẽ tay làm kết quả đo** |
| \`src/core/hearing-core.js\` | Đối chứng staircase 10 dB xuống/5 dB lên, dải phát, trial chất lượng, 1 kHz retest, PTA4/WHO eligibility | Audiogram hiện phục vụ mô phỏng | Tách đo ngưỡng, hiệu chuẩn, chất lượng và phân mức thành các lớp có điều kiện nghiêm ngặt |
| \`src/app/self-test/calibration.js\` | Hồ sơ thiết bị/tai nghe/coupler/RETSPL theo tai và tần số, hiệu lực & giới hạn phát | Chưa có hiệu chuẩn SPL/dB HL | Thiết kế contract cho phép đo có giám sát; **không suy dB HL từ PCM/dBFS khi chưa có thiết bị hiệu chuẩn** |
| \`src/app/self-test/tone-test.js\`, \`runtime.js\` | Trình lập lịch phát, snapshot mức, tone/catch im lặng, nonce/epoch để ngăn callback cũ | Audiogram phát tone minh hoạ, không đo ngưỡng | Áp dụng các nguyên tắc quản lý phiên và hủy tác vụ bất đồng bộ cho chức năng mới |
| \`src/app/self-test/speech-test.js\` | Thử nghiệm lời nói trong nhiễu với SNR | Mô phỏng nhiễu và suy giảm lời thoại | Chỉ nên tạo module nghiên cứu có kiểm soát corpus, mức âm và bản quyền; không dùng điểm số để chẩn đoán |
| \`src/storage/session-store.js\` | Xác thực schema, chế độ chỉ-đọc khi dữ liệu hỏng, chống ghi đè khác tab, xuất JSON | Zustand/Capacitor storage đơn giản | Bổ sung versioned schema, xung đột đồng thời, data retention và lựa chọn xóa/xuất dữ liệu |
| \`docs/WHO-REFERENCE.md\` | PTA4 500/1000/2000/4000 Hz, chất lượng đầu vào và chặn phân mức nếu Bayesian chưa xác thực | Không có đo thính lực lâm sàng | Giữ phân mức WHO ngoài đường xử lý mô phỏng; chỉ nghiên cứu sau khi đủ hiệu chuẩn & quy trình |
| \`tests/\` và \`reports/\` | Node invariant, seeded synthetic benchmark, holdout validation có tách tỷ lệ \`inconclusive\` | CI kiểm thử DSP/Chromium, chưa có mô phỏng người trả lời | Dùng **ý tưởng về phương pháp kiểm thử**, sinh bộ dữ liệu riêng, kiểm soát sai lệch và phân biệt coverage/estimate yield |

### Những con số không nên quảng cáo thành độ chính xác lâm sàng

\`docs/BAYESIAN-ACTIVE-LEARNING.md\` **tự báo cáo** dữ liệu giả lập 192 lần/kịch bản (3 seed × 64), ví dụ \`matched_logistic\` 180/192 lần ra estimate và \`random_responder\` 1/192. Các số đó là **mô phỏng trên chính họ mô hình đã chọn**, không phải kiểm định thính lực người thật, độ nhạy hay độ đặc hiệu. Các prior và điều kiện dừng là thiết kế nghiên cứu, không được coi là tiêu chuẩn WHO.

## Kiến trúc đề xuất cho Dr. Bunny

**Nguyên tắc:** **Simulator ≠ Hearing Screening ≠ Hearing Aid Fitting**. Không dùng một đường audiogram được người dùng kéo để kết luận họ bị mất thính lực. Không đảo mô hình suy giảm để kê đơn máy trợ thính.

\`\`\`text
frontend/src/features/screening/            (tương lai, feature flag MẶC ĐỊNH TẮT)
  ScreeningResearch.jsx                     UI không có ngôn ngữ chẩn đoán
  screeningStore.js                         session, thiết bị và consent tách biệt
  playbackController.js                     tạo/hủy stimulus và xác nhận snapshot
frontend/src/util/screening/                 core toán độc lập DOM, chưa tích hợp
backend/research/screening/                  hàm tham chiếu/tạo fixtures Python tùy chọn
tests/research/screening/                    synthetic simulations, calibration gates
docs/science/screening/                      scientific protocol, ethics, limitations
\`\`\`

**Contract khởi đầu (đề xuất, chưa triển khai):**
- \`DigitalPresentation\`: \`frequencyHz\`, \`ear\`, \`requestedPeakDbfs\`, \`actualScheduledPeakDbfs\`, \`startTime\`, \`completedTime\`, \`response\`, \`isSilentCatch\`, \`playbackGeneration\`.
- \`CalibrationEvidence\`: \`deviceChainId\`, \`ear\`, \`frequencyHz\`, \`referenceSpl\`, \`retspl\`, \`measuredAt\`, \`expiresAt\`, \`method\`, \`reviewedBy\`; trường xác nhận thủ công **không được xem là bằng chứng đo chuẩn**.
- \`ThresholdResearchResult\`: \`methodVersion\`, \`status = estimate | below_range | above_range | inconclusive\`, \`unit\`, \`credibleInterval\`, \`qualityFlags\`, \`calibrationRef\`, \`trialLog\`; \`unit\` ban đầu **chỉ \`dBFS_peak\`** nếu thiếu hiệu chuẩn.
- \`ClinicalInterpretation\`: không có trong MVP. Không tự gán mức WHO từ đầu ra Bayesian chưa được xác thực.

## Milestones / kiểm thử bắt buộc

1. **P0 — Nguồn gốc và quyền dùng mã:** xác nhận quyền tác giả/giấy phép đối với các module mới của \`namlmao130/Hearing_Test\`. Hiện chỉ dẫn liên kết và phân tích, không nhập bất kỳ blob source chưa được cấp phép. Giữ các demo cũ tại \`archive/demos/\` theo chính sách bất biến.
2. **P1 — Core nghiên cứu độc lập:** tự viết/kiểm tra các hàm staircase, xác suất và bộ lựa chọn stimulus từ thông số công bố; kiểm thử tách UI; so với baseline được khai báo.
3. **P2 — Synthetic safety/quality:** giả lập ngưỡng ngoài dải, người trả lời ngẫu nhiên 50/50, biased yes/no, nghe kém một tai, mất hiệu chuẩn giữa phiên, giới hạn tăng mức, đồng bộ audio stale callbacks và thử nghiệm độ trễ.
4. **P3 — Storage & consent:** local-only mặc định, lưu lịch sử riêng với versioning, bảo toàn dữ liệu lỗi, xuất/xóa theo ý người dùng, kiểm soát dữ liệu sức khỏe nhạy cảm và test quota/tab conflict.
5. **P4 — UI nghiên cứu:** chỉ bật qua feature flag sau khi P1–P3 có test; hướng dẫn kiểm tra an toàn, không đưa âm thanh vượt giới hạn digital đặt ra, không ngụ ý giới hạn này bảo đảm SPL an toàn.
6. **P5 — Thiết bị & người thật:** cần đánh giá theo tiêu chuẩn điện–âm, RETSPL, bộ tai nghe, nhiễu, người tham gia và quy trình đạo đức; **chưa đạt** và không có tuyên bố chính xác lâm sàng.

## Những phần KHÔNG tích hợp trực tiếp

- Không copy \`hearing-core.js\`, \`bayesian-core.js\`, \`session-store.js\` từ repo \`UNLICENSED\` hoặc viết lại từng dòng để né giấy phép.
- Không tự động chuyển audiogram giả định của Simulator thành kết quả sàng lọc dB HL.
- Không sao chép audio/corpus hoặc dữ liệu phiên người dùng nếu không biết quyền sử dụng và nguồn.
- Không hiển thị phân mức WHO/khuyến nghị máy trợ thính dựa trên dữ liệu chưa hiệu chuẩn.
- Không xóa hay ghi đè bản demo cũ của Dr. Bunny.

**Giới hạn của cuộc rà soát:** kiểm tra nội dung code, snapshot Git, cấu trúc test và tài liệu trong GitHub; chưa chạy độc lập \`npm test\` cho repository tham chiếu trên máy ở lượt này. Các khẳng định về test của dự án đó là mô tả từ repository, không phải chứng nhận độc lập.
