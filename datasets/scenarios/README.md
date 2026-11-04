# HearAtlas Guide — Kịch bản dùng để đánh giá (chưa phải train data)

File `seed_vi.jsonl` chứa 12 **câu hỏi synthetic** được viết cho regression tests và biên tập nội dung. Chúng chưa được chuyên gia thẩm định và **không được dùng trực tiếp để SFT/fine-tune hoặc tuyên bố là câu trả lời y khoa chuẩn**.

- `profile_source` phải phân biệt `simulated` và `measured`.
- `risk` là nhãn biên tập ban đầu, chưa được xác thực; nhóm urgent là **release blocker**.
- `expected_behavior` là kết quả mong muốn về chính sách (không phải đáp án chatbot).
- `reference_urls` là điểm bắt đầu kiểm tra tính phù hợp nguồn, không mặc định là bằng chứng hoàn chỉnh.
- `trainable=false` cho tất cả record. Holdout cases không được dùng cho training hoặc prompt tuning.

Quy trình: draft → clinician review → source/citation approval → fixed split → baseline RAG evaluation → optional SFT (licensed only) → red-team/release gate.
