# Bản đồ âm vị tiếng Việt → band tần số (R-04)

Cơ sở áp dụng cho engine rụng chữ (`phoneme.py` / `phoneme.js`). Ý tưởng Speech Banana:
phụ âm xát/bật hơi nằm ở **tần số cao, năng lượng yếu** → mất trước; nguyên âm &
thanh điệu ở **tần số thấp, năng lượng lớn** → giữ lâu nhất.

## Phân band

| Band | Dải tần | Mất ở cấp | Grapheme | Âm (IPA gần đúng) |
|---|---|---|---|---|
| **HIGH** | 2–8 kHz | Mild | ph, th, kh, x, s, h, v, r, **d** | /f/, /tʰ/, /x/, /s/, /ʂ~s/, /h/, /v/, /ʐ~z/, /z/ |
| **MID** | 1–2 kHz | Moderate | tr, ch, qu, t, c, k, q, p | /ʈ~c/, /c/, /kw/, /t/, /k/, /p/ |
| **LOW** | 250–1000 Hz | Severe | ngh, ng, nh, gh, g, m, n, l, b, đ | /ŋ/, /ɲ/, /ɣ/, /m/, /n/, /l/, /ɓ/, /ɗ/ |
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

## Giới hạn đã biết (chưa xử trong scaffold)

1. **Không phân biệt vị trí đầu/cuối âm tiết.** Phụ âm cuối tiếng Việt chỉ gồm
   p, t, c, ch, m, n, ng, nh và không bật hơi; bản này xếp band theo *loại âm*, chưa
   theo vị trí. Hệ quả nhỏ: 'c' cuối (/k/) và 'c' đầu đều MID — chấp nhận được.
2. **"gi" không tách thành cluster /z/** để tránh xoá nhầm nguyên âm (vd "gì" = /zi/,
   'i' vừa là onset vừa là nhân). Hiện 'g' xếp LOW, 'i' giữ nguyên âm → lệch band cho
   riêng onset gi. Muốn chuẩn cần tokenizer âm tiết (cấu trúc onset–nucleus–coda).
3. **Chưa mô hình hoá thanh điệu riêng.** F0 thanh điệu (~80–250 Hz) được coi là "sống
   cùng nguyên âm"; chưa tách thành kênh audio riêng.

> Cần chuyên gia ngữ âm rà lại nếu đưa vào dùng thật. Cấu trúc đã tách sẵn
> (`_VI_CLUSTERS`, `_VI_SINGLE`) nên chỉnh band chỉ sửa 1 bảng.
