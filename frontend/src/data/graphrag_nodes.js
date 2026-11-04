// TỰ SINH bởi tests/make_fixtures.py từ backend/core/graphrag.py — KHÔNG sửa tay.
// Điều kiện `when` của từng nút nằm ở util/graphrag.js và được check-parity.mjs kiểm tra.
export default {
 "disclaimer": "(Đây là mô phỏng & sàng lọc tham khảo, không thay chẩn đoán của bác sĩ.)",
 "weights": {
  "condition": 1.0,
  "word": 1.5,
  "phrase": 2.5
 },
 "nodes": [
  {
   "id": "HIGH_FREQ_LOSS",
   "keywords": [
    "chu",
    "phu am",
    "khong ro",
    "nham",
    "s",
    "x",
    "th",
    "ch",
    "thi tham",
    "chim",
    "tre em",
    "phu nu",
    "bien mat"
   ],
   "text": "Tần số cao (2000–8000 Hz) bị giảm nên các phụ âm s, x, ph, th, kh, t, ch, k, p dễ 'rụng' khỏi câu nói; tiếng chim, tiếng thì thầm, giọng trẻ em và phụ nữ khó nghe hơn.",
   "advice": "Nhờ người nói nhìn thẳng mặt để đọc khẩu hình, nói chậm và tách rõ từng chữ."
  },
  {
   "id": "LOW_MID_FREQ_LOSS",
   "keywords": [
    "nho",
    "be",
    "yen tinh",
    "tram",
    "buoc chan",
    "am luong",
    "ca am thanh",
    "giot",
    "nuoc"
   ],
   "text": "Dải trầm-trung (250–1000 Hz) cũng giảm nên âm thanh nói chung nhỏ đi rõ rệt, kể cả trong phòng yên tĩnh.",
   "advice": "Nên đo thính lực lâm sàng tại chuyên khoa Tai-Mũi-Họng để kiểm tra cả dẫn truyền khí và xương."
  },
  {
   "id": "NOISY_ENVIRONMENT",
   "keywords": [
    "on",
    "sieu thi",
    "nha hang",
    "dong nguoi",
    "hop",
    "xe",
    "tieng on",
    "nghe tieng",
    "khong ro chu",
    "tieng xe",
    "xe co",
    "duong pho",
    "giao thong",
    "quan ca phe"
   ],
   "text": "Ở nơi ồn (siêu thị, nhà hàng, cuộc họp), tiếng ồn nền che lấp các phụ âm yếu tần số cao. Bạn vẫn nghe được nguyên âm nên biết có người nói, nhưng não phải tự đoán phụ âm → nghe nhầm và mệt mỏi thính giác.",
   "advice": "Chọn chỗ ngồi xa nguồn ồn, quay mặt về phía người nói, giảm tiếng TV/nhạc nền khi trò chuyện."
  },
  {
   "id": "FAMILY_COMMUNICATION",
   "keywords": [
    "nguoi nha",
    "gia dinh",
    "con chau",
    "noi the nao",
    "giao tiep",
    "ong ba",
    "bo me",
    "het len",
    "noi to"
   ],
   "text": "Người thân thường nói to hơn khi thấy ông bà nghe kém, nhưng nói to chủ yếu tăng âm trầm, không giúp phụ âm cao rõ hơn.",
   "advice": "3 nguyên tắc: nói chậm & rõ (không hét), nhìn thẳng mặt khi nói, giảm tiếng ồn nền trước khi trò chuyện."
  },
  {
   "id": "LOUDNESS_RECRUITMENT",
   "keywords": [
    "choi tai",
    "to qua",
    "het",
    "kho chiu",
    "nhuc tai",
    "am to",
    "dau tai"
   ],
   "text": "Với suy giảm tiếp nhận, khoảng cách giữa 'vừa nghe thấy' và 'quá to, khó chịu' bị thu hẹp (loudness recruitment): nói nhỏ thì không nghe, hét lên lại thấy chói.",
   "advice": "Giữ âm lượng vừa phải và ổn định, ưu tiên nói rõ thay vì nói to."
  },
  {
   "id": "SEEK_CARE",
   "keywords": [
    "di kham",
    "bac si",
    "may tro thinh",
    "dieu tri",
    "co sao khong",
    "nghiem trong",
    "o tai",
    "u tai"
   ],
   "text": "Mức ngưỡng bạn đang mô phỏng nằm trong vùng nên được đo thính lực chuẩn để biết chính xác.",
   "advice": "Đặt lịch khám Tai-Mũi-Họng / trung tâm thính học; chỉ chuyên gia mới tư vấn máy trợ thính phù hợp."
  }
 ]
};
