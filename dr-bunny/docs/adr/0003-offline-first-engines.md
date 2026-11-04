# ADR-0003: Engine chạy trong máy, backend tuỳ chọn

- **Trạng thái:** chấp nhận · **Ngày:** 2026-10-28
- **Bối cảnh:** app mobile và demo không thể giả định có máy chủ; dữ liệu audiogram là dữ liệu sức khoẻ nên càng ít rời máy càng tốt.
- **Quyết định:** port engine chữ, GraphRAG tầng 1 và nhiễu thủ tục sang JavaScript. `apiBase = "offline"` là mặc định của app mobile và demo; máy chủ là lựa chọn trong Cài đặt. Mất mạng giữa chừng thì tự lùi về engine trong máy.
- **Hệ quả:** (+) chạy offline, riêng tư theo mặc định, độ trễ gần 0. (−) hai bản cài đặt phải giữ song song → ADR-0004. Nhiễu trong máy không trùng từng mẫu với numpy (khác bộ sinh số ngẫu nhiên), chỉ trùng tính chất.
