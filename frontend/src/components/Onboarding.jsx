import { useEffect, useRef } from "react";
import { useStore } from "../store";

// Hướng dẫn an toàn hiện ở lần mở đầu tiên (và khi người dùng chọn xem lại trong Cài đặt). Cửa hàng ứng dụng
// yêu cầu nói rõ app y tế/sức khoẻ không phải thiết bị chẩn đoán; phần âm lượng bảo vệ thính giác của chính người dùng.
export default function Onboarding() {
  const { settings, ready, onboardingOpen, acceptOnboarding } = useStore();
  const open = onboardingOpen || (ready && !settings.onboarded);
  const btn = useRef(null);
  useEffect(() => { if (open) btn.current?.focus(); }, [open]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" role="presentation">
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="onb-title">
        <div className="text-4xl" aria-hidden="true">🎧</div>
        <h2 id="onb-title" className="h2">Trước khi bắt đầu</h2>
        <ul className="sheet-list">
          <li><b>Đây là nền tảng giáo dục và nghiên cứu thính giác.</b> Không phải thiết bị y tế, không chẩn đoán và không thay thế đo thính lực chuẩn tại cơ sở y tế.</li>
          <li><b>Hạ âm lượng trước khi bấm ▶.</b> Nhiễu nền và tiếng bíp có thể to hơn bạn nghĩ; hãy bắt đầu ở mức thấp và tăng dần.</li>
          <li><b>Dữ liệu ở lại trong máy.</b> Mặc định mọi thứ chạy ngay trên thiết bị. Chỉ khi bạn bật máy chủ trong Cài đặt thì audiogram và câu hỏi mới được gửi đi.</li>
        </ul>
        <button ref={btn} className="btn-primary" onClick={acceptOnboarding}>Tôi hiểu, bắt đầu</button>
      </section>
    </div>
  );
}
