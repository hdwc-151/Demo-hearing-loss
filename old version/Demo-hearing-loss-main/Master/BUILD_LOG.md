# NHẬT KÝ SUY LUẬN & XÂY DỰNG HỆ THỐNG — DR. BUNNY AI AUDIOLOGIST

> **File đồng hành với:** `SKILL.md` (blueprint v1.0)
> **Mục đích:** Ghi lại chuỗi suy luận (vì sao chọn giải pháp X) + tiến trình build-up (làm theo thứ tự nào, đã xong tới đâu) để dễ theo dõi và truy vết khi mở rộng.
> **Cách đọc:** Mỗi quyết định đều có format `Bài toán → Lựa chọn → Lý do → Đánh đổi → Trạng thái`. Phần cuối là checklist build theo giai đoạn.

---

## 0. BẢN ĐỒ NHANH (đọc 30 giây)

| Thành phần | Vai trò | File hiện thực | Trạng thái |
|---|---|---|---|
| Blueprint tổng | Đặc tả toàn hệ thống | `SKILL.md` (attachment) | ✅ v1.0 |
| Prototype local | Chạy thử 3 tab không cần backend | `index.html` (mục 6 blueprint) | ✅ Demo chạy được |
| Core Python | GANs noise + phoneme + GraphRAG | `backend_core.py` (đã trích ra file) | ⚠️ Skeleton, import OK, chưa train/serve |
| Prototype local | 3 tab | `index.html` (đã trích ra file) | ✅ Đã fix B-01, parse OK |
| Nhật ký này | Truy vết suy luận + build | `BUILD_LOG.md` | ✅ |

> **Đã trích code từ blueprint ra 2 file chạy được** (`index.html`, `backend_core.py`) và kiểm tra: `backend_core.py` import OK (các hàm `degrade_text_by_hearing_loss`, `retrieve_graph_context` chạy đúng; lớp GAN chỉ khởi tạo khi có `torch`). `index.html` parse OK sau khi fix B-01.

**3 module chức năng:** `Simulator` (Tab 1) · `Dr. Bunny Chat` (Tab 2) · `Interactive Audiogram` (Tab 3).
**Trục kỹ thuật:** Web Audio DSP → GANs noise → Phoneme visual degradation → Audiogram masking → Hybrid GraphRAG.

---

## 1. CHUỖI SUY LUẬN GỐC (vì sao hệ thống tồn tại)

### QĐ-01 · Không đo dB tuyệt đối, chuyển sang mô hình SNR + đa giác quan
- **Bài toán:** Muốn mô phỏng/sàng lọc suy giảm thính lực trên điện thoại người dùng.
- **Lựa chọn:** Bỏ đo dB tuyệt đối; dùng DSP trên cùng một nguồn phát + mô hình hóa SNR, đồng bộ với hiệu ứng mất chữ theo âm vị.
- **Lý do:** Mỗi dòng máy/tai nghe có độ nhạy âm học khác nhau → không thể hiệu chuẩn dB lâm sàng qua phần cứng dân dụng. SNR và tương phản trực quan thì **không phụ thuộc hiệu chuẩn tuyệt đối**.
- **Đánh đổi:** Mất khả năng cho ra con số chẩn đoán lâm sàng; đổi lại chạy được đại trà, an toàn pháp lý.
- **Trạng thái:** ✅ Chốt — đây là ràng buộc nền, mọi module phải tuân theo.

### QĐ-02 · Định vị SaMD = công cụ mô phỏng + sàng lọc tham khảo
- **Bài toán:** Tránh rủi ro pháp lý khi đụng tới y tế.
- **Lựa chọn:** Hệ thống **không chẩn đoán**, chỉ mô phỏng trực quan và gợi ý đi khám.
- **Lý do:** Tránh phạm quy định thiết bị y tế (SaMD); giữ đúng vai trò EdTech + empathy tool.
- **Trạng thái:** ✅ Chốt — ràng buộc này được hard-code vào System Prompt của Dr. Bunny (xem QĐ-09).

---

## 2. NỀN TẢNG TOÁN HỌC (cái gì chống lưng cho từng hiệu ứng)

> Đây là phần "vì sao hiệu ứng trông đúng". Mỗi công thức gắn với một hành vi cụ thể trên UI.

### 2.1 Speech Banana → quyết định chữ nào biến mất
- **Nguồn:** ANSI S3.5-1997; Mueller & Killion (1990).
- **Ý chính:** Nguyên âm + âm mũi mang **năng lượng lớn, tần số thấp** (250–1000 Hz). Phụ âm xát/bật quyết định ~80% độ rõ nghĩa nhưng **tần số cao (2–8 kHz), cường độ yếu (15–30 dB)**.
- **Hệ quả cài đặt:** Khi ngưỡng nghe `T(f)` > cường độ âm vị `p` → âm vị đó biến mất. → Đây chính là lý do thứ tự rụng chữ: `s,f,th,x` (cao) rụng trước, rồi `t,k,ch,p` (trung-cao), nguyên âm giữ lại lâu nhất.

### 2.2 Cochlear Loss DSP → quyết định cách lọc âm
- **Nguồn:** Moore & Glasberg (1993), JASA.
- **Công thức suy giảm biên độ:** `G(f) = 10^(−T(f)/20)`.
- **Trộn nhiễu theo SNR:** `Y(t) = Filter(S(t), G(f)) + 10^(−SNR_dB/20) · N_GAN(t)`.
- **Hệ quả cài đặt:** Low-pass cutoff giảm dần theo cấp độ: Normal 8000 → Mild ~2600 → Moderate ~1100 → Severe ~420 Hz. Gain nhiễu tăng dần theo cấp độ.

### 2.3 Nội suy ngưỡng nghe trên thang log → quyết định icon nào bị xám
- **Công thức:** `T_user(f) = dB₁ + [log₂(f) − log₂(f₁)] / [log₂(f₂) − log₂(f₁)] · (dB₂ − dB₁)`.
- **Hệ quả cài đặt:** Với mỗi icon tại `(f_item, dB_item)`: nếu `dB_item < T_user(f_item)` → nằm trên đường ngưỡng → **xám + khóa phát**. Ngược lại → đủ màu + bấm phát được.
- **Lưu ý truy vết:** Dấu bất đẳng thức trong blueprint và trong code `index.html` cần kiểm tra khớp nhau (xem RỦI RO R-02).

### 2.4 GANs noise & Adaptive testing (lý thuyết cho bản full)
- **GANs:** Donahue (WaveGAN, 2019); Pascual (SEGAN, 2017) → sinh nhiễu nền phi tĩnh theo bối cảnh `c ∈ {Shopping, Restaurant, Meeting, Car, Crowd}`.
- **Adaptive:** Levitt (1971) transformed up-down → nền cho bài test bậc thang thích ứng (chưa cài trong prototype).
- **GraphRAG:** Edge et al. (2024, Microsoft) → truy xuất subgraph tri thức y khoa trước khi gọi LLM.

---

## 3. KIẾN TRÚC & LUỒNG DỮ LIỆU (build-up logic)

### 3.1 State trung tâm là nguồn chân lý duy nhất
- Một object `state` phản ứng (reactive): `lang, scenario, level, audiogramMode, thresholds[6], isPlaying`.
- **Lý do:** 3 tab phải đồng bộ. Kéo audiogram (Tab 3) phải đổi chữ (Tab 1) và phân tích chat (Tab 2) ngay. State tập trung tránh lệch dữ liệu giữa các tab.
- **Quy tắc:** Mọi thay đổi đi qua setter (`setLossLevel`, `updateScenario`, drag handler) → gọi lại các hàm render liên quan. Không component nào tự giữ bản sao ngưỡng nghe riêng.

### 3.2 Chuỗi phụ thuộc khi đổi cấp độ (dependency chain)
```
setLossLevel(level)
  ├─ state.level + state.thresholds := LEVEL_PRESETS[level]
  ├─ renderDegradedText()      // Tab 1: rụng chữ theo set âm vị
  ├─ renderAudiogram()         // Tab 3: vẽ lại đường + tính lại icon xám
  └─ updateAudioFilterLive()   // DSP: dời cutoff + gain nhiễu (nếu đang phát)
```

### 3.3 Schema dữ liệu
- `audiogram_db`: 6 mốc `{250,500,1000,2000,4000,8000}` → dB HL.
- `sound_landscape_items`: mỗi âm `{id,label,icon/text,freq_hz,db_hl,category}` để đặt lên lưới (Hz × dB) và so với đường ngưỡng.
- **Preset 4 cấp** (Normal/Mild/Moderate/Severe) có sẵn trong `LEVEL_PRESETS`.

---

## 4. HIỆN THỰC TỪNG MODULE (đã làm gì, theo thứ tự nào)

### Module 1 — Simulator
**Thứ tự build:** (1) render text gốc theo scenario+lang → (2) engine rụng chữ theo set âm vị → (3) DSP low-pass + nhiễu bandpass theo scenario → (4) đồng bộ SpeechSynthesis.
- **Rụng chữ:** xử lý digraph trước (`th, sh, ph, kh`; rồi `ch, tr, gh, ght`), sau đó mới tới ký tự đơn theo 3 set `mildSet / modSet / sevSet`. Giữ khoảng trắng để câu không co lại → người xem thấy đúng chỗ bị khuyết.
- **DSP:** nhiễu nền = buffer noise có điều biên (`envMod` dạng sin) → bandpass theo `noiseFreq/noiseQ` của scenario → low-pass theo cấp độ → gain. Giọng đọc qua SpeechSynthesis, `volume` giảm dần theo cấp độ.
- ⚠️ **Hạn chế đã biết:** nhiễu hiện là noise điều biên, **chưa phải GANs thật** (xem R-01). SpeechSynthesis phụ thuộc giọng OS → chất lượng không đồng nhất giữa máy.

### Module 2 — Dr. Bunny Chat (Hybrid)
**Tầng 1 (Hardcoded):** 4 quick-pill đọc trực tiếp `state.thresholds`, tính `PTA_low` (250–1000) và `PTA_high` (2000–8000), liệt kê icon đang bị xám → trả lời tức thì 0ms, không cần API.
**Tầng 2 (GraphRAG):** `sendCustomChat` hiện mới là stub — echo lại `highAvg` + gợi ý sang tab Audiogram. Chưa nối LLM thật.
- **Lý do tách 2 tầng:** demo luôn chạy được dù chưa có API key; tầng 2 nâng cấp sau mà không phá tầng 1.

### Module 3 — Interactive Audiogram
**Thứ tự build:** (1) hàm chiếu `freqToX` (log) / `dbToY` / `yToDb` → (2) vẽ lưới + đường gấp khúc → (3) điểm tròn kéo-thả (mouse+touch) → (4) chế độ SOUNDS: tính `getUserThresholdAt` cho từng icon → xám/hoặc phát tone mẫu.
- **Masking:** `isAudible = item.db >= userThresh` → class `inaudible` (grayscale + khóa click).
- Có đếm `audibleCount` hiển thị "Nghe rõ: x/13 nhóm âm thanh".

---

## 5. NHẬT KÝ QUYẾT ĐỊNH KỸ THUẬT (decision log)

| ID | Quyết định | Lý do | Đánh đổi | TT |
|---|---|---|---|---|
| QĐ-03 | All-in-one `index.html`, không build tool | Mở bằng trình duyệt là chạy, dễ phát tán cho người lớn tuổi | Khó mở rộng lớn; không module hóa | ✅ |
| QĐ-04 | Rụng chữ bằng khoảng trắng giữ độ rộng | Giữ layout câu, thấy đúng vị trí khuyết | Không mô phỏng được "đoán sai từ" | ✅ |
| QĐ-05 | Trục Hz theo thang log₂ | Khớp cảm nhận tần số của tai người | Toán nội suy phức tạp hơn | ✅ |
| QĐ-06 | Chat Hybrid 2 tầng | Demo chạy offline, LLM nâng cấp sau | Tầng 2 còn stub | ⚠️ |
| QĐ-07 | Nhiễu xấp xỉ bằng Web Audio (chưa GANs) | Prototype nhẹ, không cần model | Chưa phải nhiễu phi tĩnh thật | ⚠️ |
| QĐ-08 | Preset 4 cấp cố định | Dễ hiểu cho người dùng phổ thông | Kém linh hoạt so với kéo tự do | ✅ |
| QĐ-09 | Hard-code "không chẩn đoán" vào System Prompt | Ràng buộc SaMD (QĐ-02) | — | ✅ |

---

## 6. CHECKLIST BUILD THEO GIAI ĐOẠN

### Giai đoạn A — Prototype local (hiện tại)
- [x] State trung tâm + điều hướng 3 tab
- [x] Engine rụng chữ theo âm vị (4 cấp)
- [x] DSP low-pass + nhiễu bandpass theo scenario
- [x] Audiogram kéo-thả + masking icon
- [x] Chat tầng 1 (hardcoded, bám state)
- [x] Kiểm thử runtime (Chromium headless): không lỗi JS, 6/6 điểm kéo-thả, drag đổi ngưỡng OK, rụng chữ Severe OK, chat pill OK (xem mục 6b)
- [ ] Kiểm thử thật trên Safari/Edge + mobile touch (chưa)
- [x] Rà dấu bất đẳng thức masking blueprint vs code (R-02) → khớp

### 6b — Kết quả kiểm thử runtime (Chromium headless, 2026-10-20)
| Hạng mục | Kỳ vọng | Thực tế | TT |
|---|---|---|---|
| Lỗi JS / console | 0 | 0 page error, 0 err/warn | ✅ |
| Điểm kéo-thả SVG (B-01) | 6 | 6 | ✅ |
| Kéo điểm đổi ngưỡng | có | threshold[0] 10→45 dB | ✅ |
| Masking icon theo đường | đổi theo | Severe+drag → "Nghe rõ 5/13", icon trên đường xám, dưới đủ màu | ✅ |
| Rụng chữ mức Severe | có span mờ | 181 span `.char-fade-sev` | ✅ |
| Chat pill bám state | trả lời | 3 message sau khi bấm | ✅ |

> *Giới hạn:* chưa nghe được audio thật (headless không phát loa) và chưa test trên Safari/mobile. DSP graph dựng không lỗi nhưng chất lượng âm thanh runtime chưa nghiệm thu bằng tai.

### 7d. NÂNG CẤP NGỮ ÂM TIẾNG VIỆT (R-04, 2026-10-20)
- Engine rụng chữ viết lại theo **band tần số âm vị tiếng Việt** thay vì set ký tự Anh–Việt. Chi tiết bảng ánh xạ: `fullstack/PHONEME_MAP_VI.md`.
- Đồng bộ 2 bản (`backend/core/phoneme.py`, `frontend/src/util/phoneme.js`) — verify cùng input ra cùng output 3 cấp Mild/Moderate/Severe; nguyên âm + thanh điệu sống tới Severe (chỉ fade).
- `/degrade` nhận thêm `lang`, `dialect`; trả thêm `bands` (đếm âm vị theo band) khi lang=vi. Simulator có nút chuyển giọng **Bắc/Nam**.
- Backend TestClient + frontend `npm run build` + node parity: pass, 0 lỗi.

### Giai đoạn B — Full-stack (mục 7 blueprint) → ĐÃ SCAFFOLD, xem 6c
- [x] `/frontend` React + Vite + TailwindCSS, port nguyên 3 logic lõi (zustand state trung tâm)
- [x] `/backend` FastAPI (routes: health, scenarios, sound-items, presets, degrade, graphrag, noise)
- [~] Conditional 1D-GAN noise generator — **hook sẵn** (env `GAN_CKPT`), chưa có checkpoint → chạy nhiễu procedural (R-01)
- [x] GraphRAG engine + **hook LLM** tương thích OpenAI (env `LLM_API_KEY`/`LLM_BASE_URL`/`LLM_MODEL`); không key → fallback hardcoded
- [x] Nối tầng 2 chat vào backend `/graphrag` (bỏ stub; e2e đã verify gọi thật qua proxy)

### 6c — Kết quả Giai đoạn B (2026-10-20)
| Kiểm | Cách | Kết quả |
|---|---|---|
| Backend 7 endpoint | `fastapi.testclient` | tất cả 200; `/degrade`, `/graphrag` (hardcoded), `/noise` trả WAV 22050Hz hợp lệ (engine=procedural) ✅ |
| Frontend build | `npm run build` (Vite 5) | 51 modules, 0 lỗi, bundle ~162KB (gzip 54KB) ✅ |
| E2E React↔FastAPI | uvicorn + vite dev + Chromium headless | Audiogram 6 điểm/13 icon; **Chat bấm pill → nhận đúng reply "[Hardcoded] Ngưỡng… dB HL" từ backend qua proxy**; Simulator Severe→91 span mờ; 0 page error ✅ |

> *Kiến trúc chốt:* `backend/core/constants.py` là nguồn chân lý; frontend giữ bản sao `src/data/constants.js`. **R-06 (mới):** hai file này phải đồng bộ thủ công — lệch là sai masking/scenario. Hướng tốt hơn ở bản sau: frontend fetch `/presets`, `/sound-items`, `/scenarios` lúc mount thay vì hard-code.

### 7e. XỬ R-04 (bản 2) & R-06 (2026-10-20)
- **R-04 → tokenizer âm tiết.** Thay model "set ký tự" bằng tách **(âm đầu)(nguyên âm)(âm cuối)**: phân band theo loại âm + **vị trí** (final stop p/t/c/ch = MID, final nasal m/n/ng/nh = LOW); xử đúng **"gi" /z/** không nuốt nguyên âm (`gì`→g+ì, `gia`→gi+a, `gà`→g /ɣ/). Giới hạn 1 & 2 cũ đã đóng; còn lại: thanh điệu chưa tách kênh (mục 3 trong PHONEME_MAP_VI.md). Py↔JS verify khớp từng từ.
- **R-06 → frontend lấy hằng số từ backend.** App fetch `/presets` + `/sound-items` lúc mount → `store.cfg` (ghi đè FREQS/presets/cutoff/sound-items). `constants.js` chỉ còn là **fallback offline**. Số liệu freq/db single-source ở backend; emoji/text (trình bày) gộp theo `id` ở frontend. E2e xác nhận trình duyệt thật gọi cả 2 endpoint (`/presets=True, /sound-items=True`), audiogram 6 điểm/13 item, chat gọi backend, 0 page error.

### Giai đoạn C — Nâng cao
- [ ] Bài test bậc thang thích ứng (Levitt up-down)
- [ ] Ký hiệu bone conduction (`<`/`>`) trong mode PLOTS
- [ ] Lưu/chia sẻ hồ sơ audiogram

---

## 7. RỦI RO & CÂU HỎI MỞ (cần chốt khi lên bản full)

- **R-01 · Nhiễu không phải GANs thật.** Prototype dùng noise điều biên. Bản full cần GAN checkpoint — chưa có dữ liệu train/pretrained. → *Câu hỏi:* train từ đầu hay dùng mô hình sẵn (DEMAND, WHAM! dataset)?
- **R-02 · Khớp công thức masking. → ✅ ĐÃ VERIFY, NHẤT QUÁN.** Blueprint 4.2: `dB_item < T_user → xám (không nghe)`. Code: `isAudible = item.db >= userThresh` → không audible thì gắn class `.inaudible` (grayscale). Hai bên khớp dấu. Không phải lỗi.
- **R-03 · SpeechSynthesis không đồng nhất.** Chất lượng/âm sắc phụ thuộc OS, giọng vi-VN yếu trên nhiều máy. → cân nhắc audio thu sẵn cho bản chính thức.
- **R-04 · Phoneme set tiếng Việt. → ✅ ĐÃ XỬ (một phần, có tài liệu).** Viết lại engine theo ngữ âm tiếng Việt: tách cluster (ngh/ng/nh/gh/ph/th/kh/tr/ch/qu) trước ký tự đơn, phân 3 band HIGH/MID/LOW theo loại âm, giữ nguyên âm + thanh điệu lâu nhất (Severe chỉ *fade*). Thêm tham số `dialect` (Bắc/Nam đổi band d, r). Py↔JS khớp 100% (đã test cùng câu). Bảng đầy đủ: `fullstack/PHONEME_MAP_VI.md`. **Còn tồn (ghi trong file đó):** chưa phân vị trí đầu/cuối âm tiết; "gi" chưa tách cluster /z/ để tránh xoá nhầm nguyên âm; thanh điệu chưa tách kênh riêng. Cần chuyên gia ngữ âm rà nếu dùng thật.
- **R-05 · An toàn LLM.** Tầng 2 phải chặn hallucination y khoa — ràng buộc chỉ trả lời trong phạm vi subgraph đã truy xuất.

---

## 7b. NHẬT KÝ LỖI (bugs found & fixed)

| ID | Lỗi | Vị trí | Hậu quả | Fix | TT |
|---|---|---|---|---|---|
| B-01 | Namespace SVG bị dính cú pháp markdown-link: `createElementNS("[http://...](http://...)", "circle")` | `index.html` dòng ~587 (`renderAudiogram`) | `createElementNS` với namespace sai → **các điểm tròn kéo-thả trên audiogram không được tạo đúng** → không vẽ/không kéo được ngưỡng nghe | Sửa về `createElementNS("http://www.w3.org/2000/svg", "circle")` | ✅ Đã fix |

> *Nguồn lỗi:* artifact khi blueprint tự động hóa link URL trong markdown. Đã quét toàn bộ 2 file, chỉ còn đúng 1 chỗ dạng này. **Khi copy code trực tiếp từ `SKILL.md` nhớ kiểm lại dòng này.**

### 7c. NHẬT KÝ TỐI ƯU / HOTFIX (2026-10-20, đã test runtime lại, 0 lỗi)

| ID | Vấn đề | Fix | Lợi ích | TT |
|---|---|---|---|---|
| HF-1 | `renderAudiogram()` gọi lại **mỗi mousemove** khi kéo điểm → giật, tốn CPU | Gộp bằng `requestAnimationFrame` (tối đa 1 render/frame) + bỏ qua nếu dB không đổi; `cancelAnimationFrame` khi nhả chuột | Kéo mượt, không dồn render thừa | ✅ |
| HF-2 | Dựng lưới/đường cong bằng nhiều lần `svg.innerHTML +=` (~15 lần reparse/reflow mỗi render) | Dồn thành 1 chuỗi `parts`, gán `svg.innerHTML` **1 lần** | Giảm mạnh reflow, nhất là khi kéo liên tục | ✅ |
| HF-3 | Icon âm thanh **lệch** so với đường cong: overlay % tính theo padding-box của board (có padding trái 36px), còn SVG vẽ trong content-box → lệch ngang | Cho `#soundOverlayLayer` phủ đúng vùng SVG (`top16 left36 right10 bottom16`), `z-index:5` (trên SVG z4), `pointer-events:none` + item `pointer-events:auto` | Icon khớp đúng cột Hz & đường ngưỡng; vẫn kéo điểm xuyên qua được | ✅ |

> *Kiểm chứng:* chạy lại test Chromium headless — 6/6 điểm kéo-thả, drag `threshold[0] 10→45`, masking đổi 13/13 → 5/13 khi kéo xuống, 0 page error. Screenshot `shot_audiogram.png` cho thấy piano(1000Hz)/máy bay(3600Hz)/mô-tô(7200Hz) nằm đúng cột tần số của chúng (trước HF-3 bị dịch trái).
> *Chưa đụng tới:* chất lượng âm thanh runtime (cần tai người), phoneme set tiếng Việt (R-04), nhiễu GANs thật (R-01), tầng 2 GraphRAG (QĐ-06). Đây là các hạng mục Giai đoạn B, không phải hotfix.

---

## 8. TRUY VẾT NGUỒN THAM KHẢO (ánh xạ tài liệu → phần dùng)

| Tài liệu đính kèm | Dùng cho phần |
|---|---|
| `SKILL.md` (attachment) | Blueprint gốc toàn hệ thống |
| Bài giảng XLTHS / Xử lý tín hiệu số (PDF) | Nền lý thuyết bộ lọc, FFT, biquad |
| Applied DSP – Theory & Practice (PDF) | Tham chiếu sâu DSP (low-pass, filter design) |
| CS425 Audio & Speech Processing (PDF) | Xử lý tiếng nói, phoneme |
| `HearingLossSimulator`, `MPCCForHearingLoss` (repo) | Tham chiếu thuật toán mô phỏng suy giảm |
| `audio-processing-hearing-aid`, `hearingaid`, MATLAB repo | Tham chiếu pipeline khuếch đại/bù thính lực |
| `Opensource-Audiometry`, `audiometry-analysis-pipeline` | Tham chiếu đo & phân tích thính lực |
| `sap-oticon-hearing-aid-impulse-responses` | Impulse response thực tế cho mô phỏng |

> *Lưu ý:* các repo/PDF trên là **nguồn tham khảo**, chưa được tích hợp trực tiếp vào prototype. Khi dùng đoạn code/dữ liệu nào từ chúng, ghi lại ở đây để truy vết.

---

## 9. CÁCH CẬP NHẬT FILE NÀY

Mỗi lần sửa hệ thống, thêm một dòng vào decision log (mục 5) hoặc tick checklist (mục 6). Khi phát sinh ràng buộc mới → thêm vào rủi ro (mục 7). Giữ format `Bài toán → Lựa chọn → Lý do → Đánh đổi → Trạng thái` để sau này đọc lại vẫn hiểu *vì sao*, không chỉ *cái gì*.

### 7f. v0.2 — TỐI ƯU UI/UX, TRUY XUẤT & HỆ THỐNG (2026-10-20)
| ID | Hạng mục | Thay đổi | Kiểm chứng |
|---|---|---|---|
| OPT-01 | GraphRAG | KG 2 → 6 node; điểm = điều kiện audiogram (+2) + từ khoá câu hỏi bỏ dấu (+1.5/từ); top-3; tầng 1 trả lời bằng chính node truy xuất | 4 câu mẫu ra đúng node đầu; người nghe bình thường không nhận lời khuyên thừa |
| OPT-02 | Cache nhiễu | seed xác định theo (kịch bản, mức) + LRU 64 + `Cache-Control` 1 ngày | 44.7 ms → 3.4 ms |
| OPT-03 | Audio client | tải nhiễu 1 lần/kịch bản, đổi mức chỉ trượt cutoff/gain (~0.1 s); fade in/out; dừng khi rời tab | build + e2e OK (chưa nghe bằng tai) |
| UX-01 | Responsive audiogram | khung `aspect-ratio` = viewBox, overlay phủ khít; đổi toạ độ bằng `getScreenCTM` | sai lệch icon ≤ 0.02 px ở 320/375/768/1280/zoom 200% |
| UX-02 | Tương tác | Pointer Events + vùng chạm r=18; ↑/↓ PageUp/Down; thanh cấp độ `<input range>`; phím 1/2/3 đổi tab | e2e kéo + phím OK ở 5 cấu hình |
| UX-03 | Bố cục | `clamp()` cho chữ/khung; nav chỉ icon < 360 px; safe-area; reduced-motion | 0 cuộn ngang |
| BUG-02 | Linh vật che chữ trên desktop | mascot sang phải (màn hẹp) / ngoài cột (≥ 820 px); padding đáy 8.5rem | 6 kích thước × 3 tab: 0 chồng lấn |
| UX-04 | Chat | tự cuộn, typing indicator, khoá khi chờ, timeout 20 s, thẻ node đã dùng | e2e: 4 thẻ hiển thị |

> Tổng hợp toàn dự án: `PROJECT_OVERVIEW.md`. Rủi ro mới ghi ở đó: R-07 (CORS `*`), R-08 (âm lượng giọng đọc), R-09 (test chưa nằm trong repo).

### 7g. Tối ưu mô hình & hệ thống — đợt 2 (2026-10-20)
| ID | Hạng mục | Thay đổi | Kiểm chứng |
|---|---|---|---|
| MOD-01 | GAN | `output_padding` lớp cuối 2 → 1 (blueprint cho 16385 mẫu); `core/gan.py` thay cho import `gan_model` không tồn tại; `backend_core.py` sửa cùng | `expected_length() == 16384` (test) |
| MOD-02 | Nhiễu procedural | độ dốc phổ kiểu lời nói trên 500 Hz; điều biên ~4 Hz (nhịp âm tiết); chuẩn hoá RMS theo cấp độ; seed 32-bit xác định; lặp đoạn GAN bằng crossfade | 4 test tính chất: đỉnh điều biên 3–5 Hz; năng lượng ≥ 2 kHz giảm theo cấp độ; RMS tăng đơn điệu; peak ≤ 1 |
| MOD-03 | Âm vị VI | chuẩn hoá NFC trước khi tách (NFD từ macOS làm vỡ âm tiết); cache LRU; ép phương ngữ hợp lệ | NFD = NFC; parity JS↔Python 87/87 |
| MOD-04 | GraphRAG | từ khoá có dấu được chuẩn hoá lúc import (trước đây không bao giờ khớp); khớp theo ranh giới từ (`chu` không khớp `chuyện`); điều kiện audiogram không lấn ý câu hỏi; client LLM dùng lại kết nối | dev: top-1 75% → 100%; holdout: 87.5% → 100% (holdout đã bị dùng, xem ghi chú) |
| SYS-01 | Validation API | Pydantic: đúng 6 tần số, giá trị [-10, 110] dB, câu hỏi ≤ 500 ký tự, scenario/level/dialect là Literal | thiếu khoá: 500 → 422; 999 dB: 200 → 422; text > 5000: 422 |
| SYS-02 | CORS | origin lấy từ `ALLOWED_ORIGINS`, chỉ GET/POST | origin lạ không có `Access-Control-Allow-Origin` |
| SYS-03 | Cache nhiễu | `/noise` có `Cache-Control` 1 ngày; LRU 128 buffer; seed xác định | 2 lần phát: 1 request `/api/noise` |
| UI-01 | Simulator race | session token: dừng hoặc đổi tab lúc đang tải nhiễu → không phát sau đó; `onend` của phiên cũ bị bỏ qua | e2e F1; gỡ guard thì F1 FAIL (đã thử) |
| UI-02 | AudioContext | một `AudioContext` dùng chung (`util/audio.js`) cho Simulator và tone Audiogram | e2e E: 1 context sau 3 tone + phát |

**Kết quả đo:** pytest 30/30; e2e trình duyệt 16/16; parity 87/87; build JS 169 kB (gzip 57 kB). Backend: render nhiễu 3 s chưa cache ~13 ms, cache hit ~0 ms. `lru_cache` đã có từ trước nên lợi ích tốc độ nhỏ; phần chính là đúng đắn và validation.

**Ghi chú trung thực**
- Holdout đã dùng để kiểm tra khi chỉnh từ khoá → 100% không còn là ước lượng không thiên lệch.
- Đường GAN chưa chạy thật: chưa cài torch, chưa có checkpoint.
- Hằng số nhiễu là xấp xỉ tự chọn, chưa hiệu chuẩn theo LTASS/babble; chưa có đánh giá thính giác.
- Chưa test Safari/mobile thật; thanh điệu chưa tách kênh riêng.
