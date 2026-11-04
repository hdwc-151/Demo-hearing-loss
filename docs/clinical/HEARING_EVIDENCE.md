# HearAtlas · Nguồn y khoa và ứng dụng tính năng

**Phiên bản biên tập:** 2026-11-04. Nội dung giáo dục; chưa có hội đồng thẩm định lâm sàng; không dùng để chẩn đoán, chỉ định thiết bị trợ thính hoặc huấn luyện mô hình khi chưa có giấy phép.

## Bằng chứng có thể đưa vào sản phẩm

| Nguồn | Điều đã xác minh hoặc phạm vi tham khảo | Gắn với tính năng | Giới hạn |
|---|---|---|---|
| [WHO Fact Sheet, 03/03/2026](https://www.who.int/news-room/fact-sheets/detail/deafness-and-hearing-loss) | >25% người trên 60 tuổi gặp disabling hearing loss; gần 2,5 tỷ người có mức độ suy giảm nghe năm 2050, hơn 700 triệu cần phục hồi; chi phí gần 1.000 tỷ USD/năm | Trang giáo dục về quy mô vấn đề, fact card chatbot | Dân số, không là xác suất hay kết quả chẩn đoán cá nhân; **>35 dB** ở tai nghe tốt hơn là định nghĩa WHO |
| [WHO World Report on Hearing, 2021](https://www.who.int/publications/i/item/9789240020481) | Hệ thống chăm sóc tai-thính giác lấy con người làm trung tâm, dữ liệu dịch tễ và giải pháp | Roadmap cho module nguồn, tác động xã hội, accessibility | Không trích toàn văn hoặc mặc định cho phép train |
| [NIDCD Age-Related Hearing Loss](https://www.nidcd.nih.gov/health/age-related-hearing-loss) | 1/3 người 65–74 tuổi tại **Mỹ**; gần nửa người >75 tuổi gặp khó khăn nghe | Hướng dẫn giao tiếp gia đình và khi nên tìm chuyên gia | Không khái quát thành số liệu Việt Nam |
| [NIDCD Sudden Deafness](https://www.nidcd.nih.gov/health/sudden-deafness) | Suy giảm thính lực đột ngột cần đánh giá y tế khẩn cấp | Bộ phát hiện câu hỏi nguy cơ cao trước khi gọi LLM | Quy tắc keyword chỉ là safety backstop, **không phải clinical triage đã xác thực** |
| [Sức khỏe & Đời sống, 09/2026](https://suckhoedoisong.vn/nghe-kem-o-nguoi-gia-khi-nao-can-kham-169260907181024361.htm) | Nguồn tham khảo Việt ngữ do người dùng cung cấp về khó hiểu lời nói trong nhiễu | Câu chuyện nhà hàng, siêu thị, gia đình | Cần biên tập xác nhận từng nhận định và cập nhật bản quyền trước phát hành |
| [Sức khỏe & Đời sống, 05/2026](https://suckhoedoisong.vn/lang-tai-o-nguoi-gia-dau-hieu-suy-giam-thinh-luc-do-tuoi-tac-khong-nen-xem-nhe-169260519082504214.htm) | Mất nghe theo tuổi tác và nhận biết sớm | Giáo dục về cơ chế, tuổi tác | Không biến các yếu tố nguy cơ thành quan hệ nhân quả chắc chắn |
| [Review hearing loss–dementia](https://pmc.ncbi.nlm.nih.gov/articles/PMC12084262/) | Mối tương quan và giả thuyết cơ chế | Hỏi đáp rủi ro | Không coi tỷ lệ nguy cơ quy trách nhiệm quần thể là nguy cơ cá nhân hay kết luận phòng ngừa chắc chắn |
| ANSI/ASA S3.5-1997 Speech Intelligibility Index | Tiêu chuẩn phương pháp tính SII | Future research-only SII, sau khi đủ thông số âm học | Tiêu chuẩn có bản quyền; **không triển khai SII chuẩn** bằng ngưỡng 6 điểm và audio chưa hiệu chuẩn |
| Moore & Glasberg (1993) | Mô hình cảm nhận độ to, suy giảm ốc tai, cần xét cả chọn lọc phổ và recruitment | DSP research gate | Không đồng nhất low-pass hay expander hiện tại với MSBG đã kiểm chứng |

**Không gắn kết luận “âm vị chắc chắn biến mất” khi một đường audiogram vượt một tọa độ speech-banana.** Tính nghe hiểu phụ thuộc phổ tín hiệu theo thời gian, noise/masking, công suất âm, ngôn ngữ, ngữ cảnh, nhận thức và thiết bị.

## Audit các tài liệu ban đầu

- Hai bản mô tả nguyên thủy đưa công thức \`G(f)=10^{-T(f)/20}\` chỉ có giá trị làm minh họa giảm biên độ số; không phải suy luận được response của ốc tai từ dB HL đơn thuần.
- Một chỉ số SII hoàn chỉnh đòi phổ lời nói, nhiễu, phổ che, thông tin calibration và tầm quan trọng theo dải. Các ví dụ cố định \`f_p,I_p\` cho nguyên âm/phụ âm **không đủ** làm SII.
- GAN trong tài liệu gốc là ý tưởng/kiến trúc; chưa có checkpoint và kiểm chứng khách quan cho dữ liệu âm thanh. Không ghi là đã có GAN production.
- Không dùng “gần 7% số ca dementia do suy giảm thính lực” như xác suất mắc bệnh của một người; các ước lượng population-attributable fraction phụ thuộc giả định nghiên cứu và không chứng minh nhân quả.
- Cảnh báo **urgent symptoms** phải tồn tại độc lập ở tầng offline, kể cả khi API lỗi.

## Chatbot emotion contract

\`welcome, explaining, supportive, careful, serious, thinking\` là trạng thái biểu cảm của linh vật, **không phải phân tích tâm lý người dùng**. Emoji chỉ thuộc icon/chip/mascot, không rải trong câu trả lời văn bản. Rủi ro cao luôn dùng trạng thái \`serious\`, ngôn ngữ cụ thể và nguồn tham khảo, không đùa vui hoặc hứa hẹn an toàn.

## Kiểm thử phân tách

- Unit: route question-to-evidence, nguồn URL, cờ urgent, không khẳng định chẩn đoán, giới hạn emotion, số nguồn.
- Frontend/backend/E2E: câu hỏi tự do, fallback, source links a11y, không lỗi khi offline.
- Clinical review sau cùng: kiểm thử chính tả, biến thể tiếng Việt, phủ định câu, đặt câu hỏi có nhiều triệu chứng, ngữ cảnh cá nhân và độ nhạy red flag trên tập thử độc lập.

\`medicalEvidence.js\` là bộ **fact-card và routing quy tắc**, không phải hệ thống RAG đầy đủ hay mô hình được huấn luyện.
