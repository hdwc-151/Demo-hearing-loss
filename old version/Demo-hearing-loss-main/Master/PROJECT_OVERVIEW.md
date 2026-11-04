# DR. BUNNY — TÀI LIỆU TỔNG HỢP DỰ ÁN

> Ứng dụng giáo dục thính học: mô phỏng suy giảm thính lực + sàng lọc tham khảo + tạo sự thấu cảm cho gia đình người nghe kém.
> Tài liệu này gom **mọi thứ** về dự án vào một chỗ: mục tiêu, cơ sở khoa học, kiến trúc, thuật toán, API, giao diện, tối ưu, kiểm thử, rủi ro, lộ trình.
> Cập nhật: 2026-10-20 · Phiên bản code: fullstack v0.2

**File liên quan:** `BUILD_LOG.md` (nhật ký từng quyết định, theo thời gian) · `fullstack/PHONEME_MAP_VI.md` (bảng âm vị) · `fullstack/README.md` (cách chạy) · `SKILL.md` (blueprint gốc v1.0)

---

## MỤC LỤC
1. Tổng quan & định vị
2. Cơ sở khoa học
3. Kiến trúc hệ thống
4. Cấu trúc mã nguồn
5. Các phân hệ chức năng
6. Thuật toán lõi
7. API backend
8. Giao diện & trải nghiệm (UI/UX)
9. Hiệu năng & tối ưu
10. Kiểm thử & kết quả
11. Cấu hình & vận hành
12. Rủi ro, giới hạn, nợ kỹ thuật
13. Lộ trình
14. Lịch sử thay đổi
15. Tài liệu tham khảo

---

## 1. TỔNG QUAN & ĐỊNH VỊ

**Vấn đề.** Người suy giảm thính lực (thường người lớn tuổi) vẫn *nghe thấy* có người nói nhưng *không phân biệt được chữ*, nhất là các phụ âm tần số cao (s, x, th, ch, t, k) ở nơi ồn. Người thân hiểu lầm là "lúc nghe lúc không" và phản ứng bằng cách hét to — vừa không giúp hiểu rõ hơn vừa gây chói tai.

**Giải pháp.** Ba phân hệ gắn chung một trạng thái:
- **Simulator** — cho người nghe bình thường *thấy* (chữ biến mất theo âm vị) và *nghe* (lọc tần số + nhiễu nền) trải nghiệm của người nghe kém.
- **Interactive Audiogram** — kéo đường ngưỡng nghe, các âm thanh đời thường nằm ngoài vùng nghe được tự chuyển xám.
- **Dr. Bunny Chat** — giải thích bằng ngôn ngữ dễ hiểu, dựa trên đồ thị tri thức và chính biểu đồ người dùng đang mô phỏng.

**Định vị pháp lý (ràng buộc cứng).** Công cụ **mô phỏng giáo dục & sàng lọc tham khảo**, *không* phải thiết bị y tế (SaMD), *không* chẩn đoán. Ràng buộc này nằm trong system prompt của LLM và trong mọi câu trả lời fallback.

**Lựa chọn nền tảng (QĐ-01).** Không đo dB tuyệt đối vì mỗi điện thoại/tai nghe có độ nhạy khác nhau, không thể hiệu chuẩn lâm sàng. Thay vào đó mô hình hoá **tương đối**: SNR, lọc tần số trên cùng nguồn phát, và tương phản thị giác — những thứ không phụ thuộc hiệu chuẩn phần cứng.

---

## 2. CƠ SỞ KHOA HỌC

| Khái niệm | Nguồn | Dùng ở đâu trong hệ thống |
|---|---|---|
| Speech Banana / Speech Intelligibility Index | ANSI S3.5-1997; Mueller & Killion (1990) | Thứ tự rụng âm vị theo tần số; vị trí các nhóm âm vị trên audiogram |
| Mô phỏng suy giảm ốc tai `G(f) = 10^(−T(f)/20)` | Moore & Glasberg (1993), JASA | Bộ lọc low-pass theo cấp độ (8000 → 2600 → 1100 → 420 Hz) |
| Trộn nhiễu theo SNR `Y = S + 10^(−SNR/20)·N` | — | `noise.mix_snr()` ở backend |
| Nội suy ngưỡng trên thang log₂ | Quy ước audiogram | Quyết định âm thanh nào bị xám |
| Sinh nhiễu đối kháng (WaveGAN, SEGAN) | Donahue 2019; Pascual 2017 | Hook GAN trong `noise.py` (chưa có checkpoint) |
| GraphRAG | Edge et al. (2024), Microsoft | Truy xuất node tri thức trước khi gọi LLM |
| Transformed up-down | Levitt (1971) | Dự kiến cho bài test thích ứng (chưa làm) |

**Nguyên lý chung.** Nguyên âm và âm mũi mang năng lượng lớn ở dải 250–1000 Hz; phụ âm xát/bật yếu (15–30 dB) nằm ở 2–8 kHz nhưng mang phần lớn thông tin phân biệt chữ. Khi ngưỡng nghe tại tần số *f* vượt cường độ của âm vị, âm vị đó biến mất khỏi nhận thức. Tiếng Việt thêm một lớp: **thanh điệu** nằm ở F0 (~80–250 Hz) nên người nghe kém vẫn bắt được "giai điệu" của câu dù mất phụ âm — hệ thống mô phỏng điều này bằng cách giữ nguyên âm có dấu đến cấp Severe.

---

## 3. KIẾN TRÚC HỆ THỐNG

```
┌──────────────────────────── FRONTEND (React 18 + Vite 5 + Tailwind 3) ────────────────────────────┐
│                                                                                                   │
│   store.js (zustand) — NGUỒN TRẠNG THÁI DUY NHẤT                                                  │
│   tab · lang · dialect · scenario · level · thresholds[6] · customized · cfg · backend · isPlaying │
│        │                         │                              │                                 │
│   ┌────▼─────────┐        ┌──────▼──────────┐           ┌───────▼────────┐                        │
│   │  Simulator   │        │   Audiogram     │           │     Chat       │                        │
│   │ phoneme.js   │        │ SVG + overlay   │           │ askDrBunny()   │                        │
│   │ Web Audio    │        │ masking log₂    │           │                │                        │
│   └────┬─────────┘        └──────┬──────────┘           └───────┬────────┘                        │
│        │ /noise (WAV)            │ /presets /sound-items        │ /graphrag                       │
└────────┼─────────────────────────┼──────────────────────────────┼─────────────────────────────────┘
         │      vite proxy /api → :8000 (dev)                     │
┌────────▼─────────────────────────▼──────────────────────────────▼─────────────────────────────────┐
│                              BACKEND (FastAPI, Python 3)                                          │
│  main.py ── routes                                                                                │
│  core/constants.py  ← NGUỒN CHÂN LÝ số liệu (freq, dB, preset, cutoff, noise gain)               │
│  core/phoneme.py    ← tokenizer âm tiết tiếng Việt + engine tiếng Anh                             │
│  core/graphrag.py   ← 6 node tri thức, chấm điểm theo audiogram + câu hỏi, LLM tuỳ chọn           │
│  core/noise.py      ← nhiễu procedural (FFT) / hook GAN, LRU cache, mix SNR                       │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Nguyên tắc thiết kế.**
- **Một nguồn trạng thái** (zustand): kéo audiogram ở tab 3 → chat ở tab 2 đọc ngay ngưỡng mới.
- **Một nguồn số liệu** (backend `constants.py`): frontend nạp lúc khởi động; `constants.js` chỉ là dự phòng offline.
- **Không bao giờ chết khi mất mạng**: mọi lời gọi API có fallback (nhiễu tạo tại chỗ, chat trả lời offline, hằng số cục bộ).
- **Tách số liệu và trình bày**: freq/dB ở backend; emoji/chữ hiển thị ở frontend, ghép theo `id`.

---

## 4. CẤU TRÚC MÃ NGUỒN

```
drbunny/
├── PROJECT_OVERVIEW.md        ← file này
├── BUILD_LOG.md               ← nhật ký quyết định & sửa lỗi
├── index.html                 ← prototype 1 file (đã fix B-01, HF-1/2/3)
├── backend_core.py            ← code Python gốc trích từ blueprint
└── fullstack/
    ├── README.md              ← cách chạy
    ├── PHONEME_MAP_VI.md      ← bảng âm vị → band tần số
    ├── backend/
    │   ├── main.py                (90 dòng)  routes FastAPI
    │   ├── requirements.txt
    │   └── core/
    │       ├── constants.py       (45)   số liệu dùng chung
    │       ├── phoneme.py         (160)  tokenizer âm tiết VI + engine EN
    │       ├── graphrag.py        (153)  KG + truy xuất + LLM
    │       └── noise.py           (120)  sinh nhiễu + cache + SNR
    └── frontend/
        ├── package.json · vite.config.js · tailwind.config.js · postcss.config.js · index.html
        └── src/
            ├── main.jsx · App.jsx (61) · store.js (50) · api.js (56) · index.css (105)
            ├── data/constants.js  (84)   fallback + phần trình bày
            ├── util/phoneme.js    (111)  bản JS của tokenizer (khớp 100% bản Python)
            └── components/
                ├── Simulator.jsx  (175)
                ├── Audiogram.jsx  (179)
                └── Chat.jsx       (78)
```
Tổng mã nguồn fullstack: ~1.480 dòng.

---

## 5. CÁC PHÂN HỆ CHỨC NĂNG

### 5.1 Simulator (Tab 1)
- **7 kịch bản**: siêu thị, trò chuyện gia đình, cuộc họp, nhà hàng, đám đông, trong xe, nghe nhạc — mỗi kịch bản có lời thoại VI/EN và dải tần nhiễu đặc trưng.
- **Rụng chữ theo âm vị**: chữ bị mất được thay bằng khoảng trống cùng độ rộng (câu không co lại, thấy đúng chỗ khuyết). Có bộ đếm "Mất x/y chữ cái".
- **Âm thanh**: giọng đọc (Web Speech API) + nhiễu nền qua bộ lọc low-pass và gain theo cấp độ. **Đổi cấp độ khi đang phát** → cutoff/gain trượt mượt trong ~0.1 s, không ngắt tiếng.
- **Điều khiển**: thanh trượt 4 nấc (kéo, bấm nhãn, hoặc phím ←/→), chọn ngôn ngữ, chọn giọng Bắc/Nam.

### 5.2 Interactive Audiogram (Tab 3)
- 6 mốc tần số 250–8000 Hz, ngưỡng −10 đến 110 dB, bước 5 dB.
- **SOUNDS**: 13 nhóm âm thanh (vòi nước, chim hót, trò chuyện, chó sủa, piano, xe tải, máy bay…, 3 cụm âm vị). Âm thanh nằm trên đường ngưỡng → xám + không bấm được; dưới đường → bấm nghe tone mẫu.
- **PLOTS**: hiện giá trị dB trên từng điểm.
- Vùng nghe được tô nhạt; đếm "Nghe rõ x/13 nhóm"; nhãn "Mức: Mild / Tuỳ chỉnh".

### 5.3 Dr. Bunny Chat (Tab 2)
- 5 câu hỏi nhanh + ô nhập tự do.
- Mỗi câu trả lời kèm **thẻ node tri thức đã dùng** (ví dụ "Môi trường ồn", "Tần số cao") và chế độ (`hardcoded` / `llm`) — người dùng thấy câu trả lời dựa trên gì.
- Tự cuộn mượt, hiệu ứng "đang soạn", khoá nút khi đang chờ, hết thời gian chờ sau 20 s.

---

## 6. THUẬT TOÁN LÕI

### 6.1 Tokenizer âm tiết tiếng Việt (`phoneme.py` / `phoneme.js`)
Mỗi âm tiết được tách **(âm đầu)(nguyên âm)(âm cuối)**:
1. Âm đầu: so khớp tham lam theo danh mục dài trước `ngh > ng, nh, ph, th, kh, tr, ch, gh, gi, qu > đơn`.
2. Âm cuối: bóc từ cuối theo `ng, nh, ch, c, m, n, p, t` (miễn còn nguyên âm làm nhân).
3. Phần giữa: nguyên âm (nhận diện bằng chuẩn hoá NFD → gốc ∈ a e i o u y, nên bắt mọi dấu thanh).

| Band | Âm đầu | Âm cuối | Mất từ cấp |
|---|---|---|---|
| HIGH 2–8 kHz | ph th kh x s h v r d gi | — | Mild |
| MID 1–2 kHz | tr ch qu t c k q p | p t c ch (tắc không bật) | Moderate |
| LOW 250–1000 Hz | ng ngh nh gh g m n l b đ | m n ng nh | Severe |
| Nguyên âm + thanh | — | — | không xoá, chỉ mờ ở Severe |

Trường hợp đặc biệt: `g` trước nguyên âm *i* = /z/ (`gì` → g+ì, âm đầu rụng ở Mild, *ì* giữ nguyên); `g` trước nguyên âm khác = /ɣ/ (`gà`, band LOW). Giọng Nam chuyển d/gi/r sang band LOW (/j/).

Ví dụ *"Dạ sáng thứ Bảy tụi con đi sớm cho kịp ăn trưa ạ."*
- Mild → `ạ  áng   ứ Bảy tụi con đi  ớm cho kịp ăn trưa ạ.`
- Moderate → `ạ  áng   ứ Bảy  ụi  on đi  ớm   o  ị  ăn   ưa ạ.`
- Severe → `ạ  á     ứ  ảy  ụi  o   i  ớ    o  ị  ă    ưa ạ.` (chỉ còn nguyên âm + dấu)

### 6.2 Masking audiogram
```
T_user(f) = dB₁ + [log₂f − log₂f₁] / [log₂f₂ − log₂f₁] · (dB₂ − dB₁)      (nội suy giữa 2 mốc kề)
nghe được  ⇔  dB_âm_thanh ≥ T_user(f_âm_thanh)
```
Toạ độ màn hình ↔ viewBox đổi bằng `svg.getScreenCTM()` nên đúng ở mọi mức zoom.

### 6.3 Chuỗi xử lý âm thanh
```
WAV nhiễu (backend, dải đầy đủ, theo kịch bản) ─► BufferSource(loop) ─► BiquadFilter lowpass(cutoff[level]) ─► Gain(noiseGain[level]/noiseGain.Normal) ─► loa
SpeechSynthesis (vi-VN/en-US, volume theo cấp độ) ───────────────────────────────────────────────────────────────────────────────► loa
```
Nhiễu procedural: nhiễu trắng → FFT → cắt trên cutoff → nhấn quanh tần số đặc trưng kịch bản (gaussian trên trục log, bề rộng theo Q) → IFFT → điều biên kiểu "babble" → chuẩn hoá.

### 6.4 GraphRAG
- **6 node**: Tần số cao · Trầm-trung · Môi trường ồn · Giao tiếp gia đình · Loudness recruitment (chói tai) · Khi nào đi khám.
- **Điểm node** = 2 (nếu điều kiện audiogram thoả, dựa trên PTA cao/thấp) + 1.5 × số từ khoá khớp câu hỏi. So khớp sau khi **bỏ dấu** nên "sieu thi" và "siêu thị" như nhau.
- Lấy top-3 làm context. Có `LLM_API_KEY` → gọi LLM với system prompt giới hạn trong context; không có hoặc lỗi → trả lời bằng chính nội dung node (tầng 1).

---

## 7. API BACKEND

| Method | Path | Vào | Ra |
|---|---|---|---|
| GET | `/health` | — | `{status, service, version}` |
| GET | `/presets` | — | `{freqs, level_presets, cutoff, noise_gain}` |
| GET | `/sound-items` | — | `[{id, label, freq, db}]` ×13 |
| GET | `/scenarios` | — | `{tên: {noise_freq, noise_q}}` ×7 |
| POST | `/degrade` | `{text, level, lang="vi", dialect="north"}` | `{degraded, bands}` |
| POST | `/graphrag` | `{audiogram_db: {"250":..,"8000":..}, question}` | `{answer, mode, nodes, context}` |
| GET | `/noise` | `scenario, level, seconds(0.5–10), seed?` | `audio/wav` 22050 Hz, header `X-Noise-Engine`, cache 1 ngày |

---

## 8. GIAO DIỆN & TRẢI NGHIỆM (UI/UX)

**Tự thích ứng màn hình & zoom**
- Khung audiogram dùng `aspect-ratio: 460/330` (đúng tỉ lệ viewBox) và overlay phủ đúng khung → icon luôn trùng toạ độ thật trên đồ thị ở mọi bề rộng/mức zoom. Đã đo: sai lệch ≤ 0.02 px ở 5 cấu hình.
- Cỡ chữ gốc `clamp(14px, …, 17px)`; tiêu đề, khung chữ, icon, chiều cao chat đều dùng `clamp()` theo `vw`/`vh`.
- Màn < 360 px: thanh điều hướng chỉ còn icon. Màn thấp < 560 px: ẩn linh vật. Màn ≥ 820 px: linh vật đặt ngoài cột nội dung. Đã đo: 0 chồng lấn chữ, 0 cuộn ngang ở 6 kích thước × 3 tab.
- `viewport-fit=cover` + `env(safe-area-inset-bottom)` cho điện thoại có tai thỏ/thanh home; **không** khoá zoom của người dùng.

**Tương tác mượt**
- Kéo điểm bằng Pointer Events (chuột, cảm ứng, bút) + gộp theo khung hình (`requestAnimationFrame`); vùng chạm vô hình bán kính 18 cho ngón tay; điểm phóng to khi đang kéo và hiện số dB.
- Âm thanh có fade-in/fade-out (không tiếng "bụp"); tone mẫu có envelope; dùng chung một AudioContext.
- Chữ rụng/hiện có chuyển tiếp opacity 0.35 s; chuyển tab có hiệu ứng trượt nhẹ; tin nhắn chat "pop" vào.
- Rời tab Simulator → âm thanh tự dừng. Đổi kịch bản/ngôn ngữ khi đang phát → tự phát đoạn mới.

**Truy cập (accessibility)**
- Điểm audiogram là `role="slider"`, dùng ↑/↓ (5 dB) và PageUp/PageDown (20 dB). Thanh cấp độ là `<input type=range>` gốc. Phím 1/2/3 chuyển tab.
- Vòng focus rõ ràng khi dùng bàn phím; `aria-live` cho bộ đếm và chat; `aria-label` mô tả biểu đồ cho trình đọc màn hình.
- Tôn trọng `prefers-reduced-motion` (tắt mọi hiệu ứng).

**Trạng thái hệ thống**: huy hiệu ONLINE / OFFLINE / … ở góc trên cho biết đang dùng dữ liệu máy chủ hay cục bộ.

---

## 9. HIỆU NĂNG & TỐI ƯU

| Hạng mục | Trước | Sau |
|---|---|---|
| Render khi kéo audiogram | render lại mỗi `mousemove` | tối đa 1 lần/khung hình (rAF) |
| Dựng lưới SVG (prototype) | ~15 lần `innerHTML +=` | 1 lần gán (HF-2) |
| Sinh nhiễu backend | 44.7 ms mỗi lần | 3.4 ms khi trúng cache (LRU 64, seed xác định) |
| Tải nhiễu frontend | tải lại mỗi lần bấm ▶ / đổi mức | cache AudioBuffer theo kịch bản; đổi mức chỉ trượt tham số |
| Tính token chữ / masking | mỗi lần render | `useMemo` theo đúng phụ thuộc |
| Trình duyệt cache WAV | không | `Cache-Control: public, max-age=86400` |
| Bundle | — | JS 171 KB (gzip 58 KB), CSS 17 KB (gzip 4.4 KB) |

---

## 10. KIỂM THỬ & KẾT QUẢ

| Lớp | Cách kiểm | Kết quả |
|---|---|---|
| Backend | FastAPI TestClient, 7 endpoint | 200 toàn bộ; WAV hợp lệ; truy xuất đúng node cho 4 câu hỏi mẫu (kể cả không dấu); người nghe bình thường không nhận lời khuyên thừa |
| Tokenizer | 19 từ khó (gì, gia, giêng, gà, ghế, nghe, nhanh, mắt, măng, ông, quà…) | phân tích đúng âm đầu/nhân/âm cuối |
| Parity Py ↔ JS | cùng câu, 3 cấp độ | khớp 100% |
| Build | `vite build` | 0 lỗi, 0 cảnh báo |
| E2E đa màn hình | Chromium headless, 320 / 375@2x / 768 / 1280 / zoom 200% | sai lệch icon ≤ 0.02 px; kéo, phím, chat, thanh trượt OK; 0 lỗi trang |
| Bố cục | 6 kích thước × 3 tab | 0 chồng lấn chữ, 0 cuộn ngang |

**Chưa kiểm được trong môi trường hiện tại**: nghe âm thanh thật bằng tai; Safari/iOS thật; giọng `vi-VN` của SpeechSynthesis trên từng máy; LLM thật (cần khoá API).

---

## 11. CẤU HÌNH & VẬN HÀNH

```bash
# Backend
cd fullstack/backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000
# Frontend
cd fullstack/frontend && npm install && npm run dev        # http://localhost:5173
```

| Biến môi trường | Tác dụng | Mặc định |
|---|---|---|
| `LLM_API_KEY` | bật tầng 2 chat (LLM thật) | trống → tầng 1 |
| `LLM_BASE_URL` | endpoint tương thích OpenAI | GLM `open.bigmodel.cn/api/paas/v4` |
| `LLM_MODEL` | tên model | `glm-4-flash` |
| `GAN_CKPT` | đường dẫn checkpoint GAN (cần `torch` + `gan_model.py`) | trống → nhiễu procedural |
| `VITE_API_BASE` | địa chỉ API cho frontend khi deploy | `/api` (proxy dev) |

**Lưu ý deploy**: CORS hiện mở `*` (cho phát triển) — phải siết lại theo domain thật; build frontend bằng `npm run build` và đặt `VITE_API_BASE` trỏ tới backend.

---

## 12. RỦI RO, GIỚI HẠN, NỢ KỸ THUẬT

| ID | Nội dung | Trạng thái |
|---|---|---|
| R-01 | Nhiễu chưa phải GAN thật (chưa có checkpoint/dữ liệu train) | Mở — hook sẵn |
| R-02 | Dấu bất đẳng thức masking blueprint vs code | Đóng — đã verify khớp |
| R-03 | SpeechSynthesis không đồng nhất giữa máy, giọng vi-VN yếu | Mở — nên dùng audio thu sẵn |
| R-04 | Âm vị tiếng Việt | Phần lớn đóng — tokenizer âm tiết; còn: thanh điệu chưa tách kênh, âm đệm o/u coi như nguyên âm |
| R-05 | LLM có thể "bịa" | Giảm thiểu — system prompt giới hạn trong context + fallback; chưa có kiểm định đầu ra |
| R-06 | Hằng số trùng lặp Py/JS | Đóng phần số liệu — frontend nạp từ backend. **Còn**: tokenizer vẫn có 2 bản Py/JS phải giữ khớp tay |
| R-07 | CORS mở `*` | Mở — siết khi deploy |
| R-08 | Âm lượng giọng đọc không đổi được giữa câu (giới hạn Web Speech) | Mở — chỉ áp dụng khi phát lại |
| R-09 | Chưa có test tự động trong repo (test hiện là script ngoài) | Mở — nên chuyển thành `pytest` + Playwright test suite |

---

## 13. LỘ TRÌNH

**Ngắn hạn**
- Chuyển các script kiểm thử thành bộ test trong repo (`pytest`, Playwright) + chạy CI.
- Audio lời thoại thu sẵn (VI/EN) thay SpeechSynthesis → lọc được *chính giọng nói* qua DSP, không chỉ nhiễu nền.
- Bộ test chung cho tokenizer Py/JS (cùng file JSON đầu vào/đầu ra) để chặn lệch hai bản.

**Trung hạn**
- Train/nhúng GAN nhiễu theo kịch bản (dữ liệu gợi ý: DEMAND, WHAM!).
- Tách thanh điệu (F0) thành kênh riêng trong mô phỏng tiếng Việt.
- Ký hiệu dẫn truyền xương (`<` `>`) và tai trái/phải riêng trong chế độ PLOTS.
- Bài test bậc thang thích ứng (Levitt up-down) ở dạng sàng lọc tham khảo.

**Dài hạn**
- Lưu/chia sẻ hồ sơ audiogram; chế độ trình chiếu cho buổi nói chuyện với gia đình.
- Đánh giá với người dùng thật (người lớn tuổi + người thân) và chuyên gia thính học/ngữ âm.

---

## 14. LỊCH SỬ THAY ĐỔI

| Mốc | Nội dung |
|---|---|
| v1.0 blueprint | `SKILL.md`: prototype 1 file + code Python mẫu |
| Kiểm tra prototype | Trích code; **B-01**: namespace SVG dính cú pháp markdown làm hỏng điểm kéo-thả → sửa; R-02 xác nhận không lỗi |
| Hotfix prototype | HF-1 rAF khi kéo · HF-2 dựng SVG 1 lần · HF-3 căn overlay icon |
| Giai đoạn B | Tách FastAPI (7 endpoint) + React/Vite/Tailwind; e2e frontend ↔ backend |
| Âm vị VI bản 1 | Phân band theo cụm phụ âm, tham số giọng Bắc/Nam |
| Âm vị VI bản 2 | Tokenizer âm tiết (âm đầu/nhân/âm cuối), xử "gi" |
| R-06 | Frontend nạp hằng số từ backend |
| v0.2 (hiện tại) | GraphRAG 6 node + chấm điểm theo câu hỏi; cache nhiễu; responsive theo aspect-ratio; kéo/phím/a11y; audio trượt mượt; sửa linh vật che chữ; file tổng hợp này |

Chi tiết từng bước và lý do: xem `BUILD_LOG.md`.

---

## 15. TÀI LIỆU THAM KHẢO

**Học thuật**: ANSI S3.5-1997 · Mueller & Killion 1990 (*The Hearing Journal*) · Moore & Glasberg 1993 (*JASA* 94(6)) · Donahue, McAuley & Puckette 2019 (WaveGAN, ICLR) · Pascual, Bonafonte & Serrà 2017 (SEGAN, Interspeech) · Edge et al. 2024 (GraphRAG, Microsoft Research) · Levitt 1971 (*JASA* 49(2B)).

**Tài liệu đi kèm dự án**: Bài giảng Xử lý tín hiệu số (2 bộ PDF) · *Applied Digital Signal Processing – Theory and Practice* (2011) · CS425 Audio & Speech Processing (Hodgkinson 2012).

**Repo tham khảo**: HearingLossSimulator · MPCCForHearingLoss · audio-processing-hearing-aid · hearingaid · Audio-Processing-in-Hearing-Aid-using-MATLAB · Opensource-Audiometry · audiometry-analysis-pipeline · sap-oticon-hearing-aid-impulse-responses · audio_test_battery. *(Dùng làm tham chiếu, chưa tích hợp code trực tiếp.)*
