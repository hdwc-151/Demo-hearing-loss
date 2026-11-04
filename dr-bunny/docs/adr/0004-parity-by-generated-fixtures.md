# ADR-0004: Giữ parity bằng fixture sinh từ Python

- **Trạng thái:** chấp nhận · **Ngày:** 2026-10-28
- **Bối cảnh:** hai engine có thể lệch âm thầm (đã gặp: nhãn icon, từ khoá trùng, bộ đếm).
- **Quyết định:** `tests/make_fixtures.py` chạy backend để sinh `parity_fixture.json` (ca chữ vi/en, hằng số, ca GraphRAG) và `frontend/src/data/graphrag_nodes.js`. `check-parity.mjs` so JS với fixture; `test_parity_fixture_is_fresh` đỏ nếu fixture cũ.
- **Hệ quả:** (+) Python là nguồn chân lý duy nhất, lệch là đỏ. (−) file sinh ra nằm trong git (đánh dấu `linguist-generated`); điều kiện `when` của GraphRAG vẫn viết tay ở JS và chỉ được bảo vệ bởi ca test.
