# Khai báo dữ liệu cho cửa hàng

*Đối chiếu với biểu mẫu hiện hành của từng cửa hàng khi nộp; dưới đây là câu trả lời đúng với hành vi của app ở bản 0.3.0, chế độ mặc định (Trong máy).*

## Google Play — Data safety
| Câu hỏi | Trả lời |
|---|---|
| Ứng dụng có thu thập hoặc chia sẻ dữ liệu người dùng bắt buộc? | **Không** |
| Dữ liệu được mã hoá khi truyền? | Không áp dụng (không truyền); chế độ máy chủ tuỳ chọn dùng HTTPS do người dùng cấu hình |
| Người dùng có thể yêu cầu xoá dữ liệu? | Không áp dụng (dữ liệu chỉ ở trong máy; gỡ app là xoá hết) |
| Health apps declaration | Khai báo **ứng dụng thông tin/giáo dục sức khoẻ, không phải thiết bị y tế, không chẩn đoán** |

## Apple — App Privacy ("nutrition label")
| Mục | Trả lời |
|---|---|
| Data Not Collected | **Có** (không thu thập dữ liệu nào) |
| Tracking | Không |
| Xuất khẩu mã hoá | Chỉ mã hoá chuẩn (HTTPS) → `ITSAppUsesNonExemptEncryption = false` (đã đặt trong `Info.plist`) |
| Độ tuổi | Đề xuất 12+ (nội dung sức khoẻ, không có nội dung nhạy cảm) |

> Nếu sau này bật máy chủ do bạn vận hành làm mặc định, phải khai báo lại: dữ liệu *audiogram/câu hỏi* được gửi tới máy chủ của bạn.
