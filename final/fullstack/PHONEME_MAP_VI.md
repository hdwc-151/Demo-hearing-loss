# Bản đồ âm vị tiếng Việt → band tần số (R-04)

Cơ sở áp dụng cho engine rụng chữ (`phoneme.py` / `phoneme.js`). Ý tưởng Speech Banana:
phụ âm xát/bật hơi nằm ở **tần số cao, năng lượng yếu** → mất trước; nguyên âm &
thanh điệu ở **tần số thấp, năng lượng lớn** → giữ lâu nhất.

## Phân band

| Band | Dải tần | Mất ở cấp | Grapheme | Âm (IPA gần đúng) |
|---|---|---|---|---|
| **HIGH** | 2–8 kHz | Mild | ph, th, kh, x, s, h, v, r, **d** | /f/, /tʰ/, /x/, /s/, /ʂ~s/, /h/, /v/, /ʐ~z/, /z/ |
| **MID** | 1–2 kHz | Moderate | **âm đầu:** tr, ch, qu, t, c, k, q, p · **âm cuối:** p, t, c, ch | /ʈ~c/, /c/, /kw/, /t/, /k/, /p/; âm cuối tắc không bật /p̚ t̚ k̚/ |
| **LOW** | 250–1000 Hz | Severe | **âm đầu:** ngh, ng, nh, gh, g, m, n, l, b, đ · **âm cuối:** m, n, ng, nh | /ŋ/, /ɲ/, /ɣ/, /m/, /n/, /l/, /ɓ/, /ɗ/; âm cuối mũi |
| **VOWEL** | 250–1000 Hz + F0 | không xoá, chỉ *fade* ở Severe | a ă â e ê i o ô ơ u ư y + mọi dấu thanh | — |

## Quy tắc rụng theo cấp độ

| Cấp | Band bị xoá | Kết quả |
|---|---|---|
| Normal | — | nguyên văn |
| Mild | HIGH | mất âm xát/bật hơi cao (s, x, th, ph, kh, h, d…) |
| Moderate | HIGH + MID | mất thêm âm tắc (t, c, k, p, ch, tr…) |
| Severe | HIGH + MID + LOW | chỉ còn **nguyên âm + thanh điệu** (mờ) — mô phỏng "nghe được giai điệu, mất phụ âm" |

Ví dụ `"Dạ sáng thứ Bảy … trưa ạ"`:
- Mild → `ạ  áng  ứ Bảy … trưa ạ` (d, s, th rụng)
- Moderate → `ạ  áng  ứ Bảy  ụi  on … ưa ạ` (thêm t, c, tr…)
- Severe → `ạ  á    ứ  ảy  ụi  o … ưa ạ` (chỉ còn nguyên âm + dấu)

## Giọng Bắc / Nam (`dialect`)

| Grapheme | Bắc (mặc định) | Nam |
|---|---|---|
| d, gi | /z/ → HIGH | /j/ → LOW (xấp xỉ) |
| r | /z~ʐ/ → HIGH | /ɾ~r/ → LOW (xấp xỉ) |
| s / x | đều /s/ (HIGH) | s = /ʂ/ (vẫn HIGH) |
| tr / ch | /ʈ/ vs /c/ (đều MID) | thường nhập làm /c/ (MID) |

Engine hiện chỉ đổi band của **d, r** theo dialect; s/x và tr/ch cùng band nên không đổi.

## Tokenizer âm tiết (bản 2 — đã xử giới hạn 1 & 2)

Engine giờ tách mỗi âm tiết thành **(âm đầu)(nguyên âm)(âm cuối)** rồi mới phân band:
1. Bóc âm đầu greedy theo danh mục `ONSETS` (dài trước: ngh > ng/nh > … > đơn).
2. Bóc âm cuối theo `CODAS` ở cuối phần còn lại (miễn còn nguyên âm làm nhân).
3. Phần giữa = nguyên âm (+ âm đệm/âm lướt), luôn giữ.

Nhờ đó:
- **Phân biệt vị trí:** 'c' đầu /k/ (MID) vs 'c' cuối /k̚/ (MID, không bật), 'ng' đầu vs
  'ng' cuối đều LOW nhưng được nhận đúng vai. Ví dụ `mắt` → m(LOW)+ắ(V)+t(MID);
  `măng` → m(LOW)+ă(V)+ng(LOW).
- **Xử đúng "gi" /z/:** `gia`→gi(HIGH)+a; `gì`→g(HIGH /z/)+ì — âm đầu /z/ rụng ở Mild,
  nguyên âm i + thanh điệu SỐNG. `gà`→g(LOW /ɣ/)+à (g trước nguyên âm không-i = /ɣ/).

## Giới hạn còn lại

1. ~~Vị trí đầu/cuối~~ → **đã xử** (tokenizer âm tiết).
2. ~~"gi" /z/~~ → **đã xử** ('g' trước i = /z/, không nuốt nhân).
3. **Chưa mô hình hoá thanh điệu riêng.** F0 thanh điệu (~80–250 Hz) vẫn coi là "sống
   cùng nguyên âm"; chưa tách kênh audio. Đây là giới hạn còn lại chính.
4. Âm đệm /w/ (viết o/u trong "hoa, quy") coi như nguyên âm — chấp nhận được cho mô phỏng thị giác.

> Vẫn nên có chuyên gia ngữ âm rà nếu dùng thật. Muốn chỉnh band chỉ sửa các tập
> `ONSET_*`, `CODA_*` trong `phoneme.py`/`phoneme.js` (hai bản phải khớp — R-06).
