# API (FastAPI)

Tài liệu tương tác tự sinh: `http://localhost:8000/docs`. Mọi endpoint nhận/trả JSON trừ `/noise` (WAV).

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/health` | `{status: "ok", service, version}` |
| GET | `/scenarios` | Cấu hình 7 kịch bản nhiễu (`noise_freq`, `noise_q`) |
| GET | `/sound-items` | 13 âm thanh trên audiogram (`id, label, freq, db`) |
| GET | `/presets` | `{freqs, level_presets, cutoff, noise_gain}` |
| POST | `/degrade` | Làm rụng chữ (UI không gọi; dành cho client khác) |
| POST | `/graphrag` | Hỏi Bác sĩ Thỏ |
| GET | `/noise` | Nhiễu nền WAV 22.050 Hz, 16-bit, mono |

## POST /degrade
```json
{ "text": "Dạ sáng thứ Bảy tụi con đi sớm ạ.", "level": "Moderate", "lang": "vi", "dialect": "north" }
```
`level` ∈ `Normal|Mild|Moderate|Severe`, `lang` ∈ `vi|en`, `dialect` ∈ `north|south`, `text` ≤ 5000 ký tự. Trả `{level, lang, degraded, bands}`; `bands` đếm **chữ cái** theo band (HIGH/MID/LOW/VOWEL/OTHER), `null` với tiếng Anh.

## POST /graphrag
```json
{ "audiogram_db": {"250":20,"500":25,"1000":30,"2000":55,"4000":60,"8000":65}, "question": "Tôi bị ù tai" }
```
`audiogram_db` phải có **đúng 6 khoá** tần số, giá trị **số nguyên** trong [-10, 110] dB; `question` ≤ 500 ký tự. Trả `{answer, mode, nodes, context}` với `mode` = `hardcoded` hoặc `llm`; khi LLM lỗi có thêm `llm_error` (chỉ tên loại lỗi). `answer` luôn chứa câu miễn trừ.

## GET /noise
`scenario` (shopping, conversation, meeting, restaurant, crowd, car, music), `level`, `seconds` ∈ [0.5, 10], `seed` ∈ [0, 2³²−1] tuỳ chọn. Cùng tham số cho cùng byte. Header: `X-Noise-Engine` (`procedural` hoặc `gan`), `Cache-Control: public, max-age=86400`.

## Lỗi
`422` dữ liệu không hợp lệ (kiểu, khoảng giá trị, độ dài, thiếu khoá); `500` lỗi nội bộ (chi tiết chỉ ở log máy chủ).

## Cấu hình (biến môi trường)
`ALLOWED_ORIGINS`, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_TIMEOUT` (giây, mặc định 15), `GAN_CKPT`. Xem `.env.example`.
