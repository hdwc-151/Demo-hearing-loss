// Bản sao hằng số phía client. Đồng bộ với backend/core/constants.py (R-06).
export const FREQS = [250, 500, 1000, 2000, 4000, 8000];

export const LEVEL_PRESETS = {
  Normal: [10, 10, 10, 15, 15, 15],
  Mild: [15, 20, 25, 35, 40, 45],
  Moderate: [25, 35, 45, 55, 65, 70],
  Severe: [55, 65, 75, 85, 95, 100],
};
export const LEVELS = ["Normal", "Mild", "Moderate", "Severe"];

export const LEVEL_CUTOFF = { Normal: 8000, Mild: 2600, Moderate: 1100, Severe: 420 };
export const LEVEL_NOISE_GAIN = { Normal: 0.03, Mild: 0.12, Moderate: 0.28, Severe: 0.45 };

export const SCENARIOS = {
  shopping: {
    label: "SHOPPING (SIÊU THỊ)",
    vi: "Vâng, của bác xong hết rồi ạ. Tổng cộng hóa đơn là 276 nghìn.\nBác muốn thanh toán bằng thẻ hay tiền mặt ạ?\nCho bác quẹt thẻ nhé.\nDạ vâng, để cháu quẹt giúp bác ngay đây.",
    en: "Alright, you're all set. Your total is $27.60.\nIs that going to be card, or cash?\nCard please.\nSure, let me run that through for you.",
    noiseFreq: 1800, noiseQ: 1.2,
  },
  conversation: {
    label: "CONVERSATION (TRÒ CHUYỆN)",
    vi: "Bố ơi, cuối tuần này vợ chồng con đưa hai cháu về quê thăm bố mẹ nhé.\nThế à? Các con về thứ Bảy hay Chủ Nhật?\nDạ sáng thứ Bảy tụi con đi sớm cho kịp ăn trưa ạ.",
    en: "Did you hear Sarah is moving to Seattle next month?\nReally? I thought she just bought a house here.\nShe did, but she got a promotion she couldn't refuse.",
    noiseFreq: 600, noiseQ: 0.7,
  },
  meeting: {
    label: "MEETING (CUỘC HỌP)",
    vi: "Chúng ta rà soát lại tiến độ dự án trước khi chốt ngân sách quý ba.\nCó nên ưu tiên vá lỗi bảo mật trước không?\nĐúng vậy, bảo mật và trải nghiệm khách hàng là ưu tiên số một.",
    en: "Let's review the Q3 forecast before we finalize the budget.\nShould we prioritize the security patch first?\nYes, security and client retention are our top priorities.",
    noiseFreq: 1000, noiseQ: 1.0,
  },
  restaurant: {
    label: "RESTAURANT (NHÀ HÀNG)",
    vi: "Em ơi, cho bàn anh xin thêm ít khăn giấy và thanh toán luôn nhé!\nDạ, anh chị dùng thêm tráng miệng trước không ạ?\nCảm ơn em, tối nay nhà anh hơi vội.",
    en: "Excuse me, could we get extra napkins and the check please?\nCertainly! Would you like the dessert menu first?\nNo thanks, we're in a hurry tonight.",
    noiseFreq: 1400, noiseQ: 0.6,
  },
  crowd: {
    label: "CROWD (ĐÁM ĐÔNG)",
    vi: "Đứng gần cổng chính thôi nhé! Bên kia đang đông lắm.\nHồi nãy mình gửi xe ở khu B hay khu C nhỉ?\nKhu C, ngay sát lối ra trạm xe buýt ấy!",
    en: "Stay close to the entrance! It's getting crowded over there.\nWhere did you park, Section B or C?\nSection C, right next to the station exit!",
    noiseFreq: 900, noiseQ: 0.5,
  },
  car: {
    label: "CAR (TRONG XE)",
    vi: "Rẽ phải ở lối ra tiếp theo, rồi rẽ trái ngay ngã tư đèn đỏ nhé.\nCon bảo rẽ trái hay đi thẳng cơ?\nRẽ trái ngay sau trạm xăng phía trước ấy bố.",
    en: "Take the next exit on the right, then turn left at the light.\nDid you say turn left or go straight?\nTurn left right after the gas station.",
    noiseFreq: 220, noiseQ: 2.0,
  },
  music: {
    label: "MUSIC (NGHE NHẠC)",
    vi: "Hãy lắng nghe tiếng violin vút cao hòa cùng tiếng sáo trúc.\nKhi mất dải cao, bản nhạc mất đi độ trong trẻo và sắc thái.",
    en: "Listen to the high violin notes blending with the soft flute.\nWhen highs fade, music loses its sparkle and warmth.",
    noiseFreq: 3200, noiseQ: 1.5,
  },
};

// Phần TRÌNH BÀY (emoji/text) theo id — khớp id với backend/core/constants.py.
// Số liệu freq/db là của backend; cái này chỉ là cách hiển thị.
// AUDIT-21: chữ ở 3 icon âm vị PHẢI khớp band của engine tiếng Việt (phoneme.js): ph_high = band HIGH,
// ph_mid = MID, ph_low = nguyên âm + band LOW. Bản cũ chép từ "speech banana" tiếng Anh nên lệch
// (vd icon ghi h là trung nhưng engine coi h là cao). logic.test.mjs kiểm tra đối chiếu với engine.
export const SOUND_PRESENTATION = {
  water: { emoji: "🚰" }, ph_low: { text: "a e u m n ng b l đ" }, ph_mid: { text: "t c k p ch tr" },
  ph_high: { text: "s x h v ph th kh" }, talk: { emoji: "🧑‍🤝‍🧑" }, birds: { emoji: "🐦" }, dog: { emoji: "🐕" },
  vacuum: { emoji: "🧹" }, piano: { emoji: "🎹" }, truck: { emoji: "🚚" }, firework: { emoji: "🎆" },
  plane: { emoji: "✈️" }, moto: { emoji: "🏍️" },
};

// FALLBACK đầy đủ khi backend offline (freq/db + trình bày gộp sẵn). Nhãn PHẢI trùng backend
// (trước đây có hậu tố "(20dB)" nên online/offline hiển thị khác nhau); check-parity.mjs kiểm tra.
export const SOUND_ITEMS = [
  { id: "water", emoji: "🚰", label: "Vòi nước", freq: 250, db: 20 },
  { id: "ph_low", text: "a e u m n ng b l đ", label: "Nguyên âm & âm trầm", freq: 380, db: 42 },
  { id: "ph_mid", text: "t c k p ch tr", label: "Phụ âm trung-cao", freq: 1800, db: 28 },
  { id: "ph_high", text: "s x h v ph th kh", label: "Phụ âm xát cao", freq: 5500, db: 22 },
  { id: "talk", emoji: "🧑‍🤝‍🧑", label: "Trò chuyện", freq: 1000, db: 45 },
  { id: "birds", emoji: "🐦", label: "Chim hót", freq: 4500, db: 15 },
  { id: "dog", emoji: "🐕", label: "Chó sủa", freq: 320, db: 70 },
  { id: "vacuum", emoji: "🧹", label: "Máy hút bụi", freq: 2600, db: 60 },
  { id: "piano", emoji: "🎹", label: "Đàn piano", freq: 1000, db: 80 },
  { id: "truck", emoji: "🚚", label: "Xe tải", freq: 250, db: 98 },
  { id: "firework", emoji: "🎆", label: "Pháo hoa", freq: 550, db: 105 },
  { id: "plane", emoji: "✈️", label: "Máy bay", freq: 3600, db: 105 },
  { id: "moto", emoji: "🏍️", label: "Mô tô", freq: 7200, db: 98 },
];
