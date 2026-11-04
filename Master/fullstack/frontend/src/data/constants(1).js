export const LEVELS = ["Normal", "Mild", "Moderate", "Severe"];
export const FREQS = [250, 500, 1000, 2000, 4000, 8000];

export const LEVEL_PRESETS = {
  Normal:   [10, 10, 10, 15, 15, 15],
  Mild:     [15, 20, 25, 35, 40, 45],
  Moderate: [25, 35, 45, 55, 65, 70],
  Severe:   [55, 65, 75, 85, 95, 100],
};

export const LEVEL_CUTOFF = { Normal: 8000, Mild: 2600, Moderate: 1100, Severe: 420 };
export const LEVEL_NOISE_GAIN = { Normal: 0.03, Mild: 0.12, Moderate: 0.28, Severe: 0.45 };

export const SCENARIOS = {
  shopping: {
    label: "SHOPPING (SIÊU THỊ)",
    en: "Alright, you're all set. Your total is $27.60.\n\nIs that going to be... card, or?\n\nYeah, can I put it on the card?\n\nSure. Of course. Let me get that run through for you, here.",
    vi: "Vâng, của bác xong hết rồi ạ. Tổng cộng hóa đơn là 276 nghìn.\nBác muốn thanh toán bằng thẻ hay tiền mặt ạ?\nCho bác quẹt thẻ nhé.\nDạ vâng, để cháu quẹt giúp bác ngay đây.",
    noiseFreq: 1800, noiseQ: 1.2,
  },
  conversation: {
    label: "CONVERSATION (TRÒ CHUYỆN)",
    en: "Did you hear that Sarah is moving to Seattle next month?\n\nReally? I thought she just bought a house here.\n\nShe did, but she got a promotion she couldn't refuse.",
    vi: "Bố ơi, cuối tuần này vợ chồng con đưa hai cháu về quê thăm bố mẹ nhé.\nThế à? Các con về hôm thứ Bảy hay Chủ Nhật?\nDạ sáng thứ Bảy tụi con đi sớm cho kịp ăn trưa ạ.",
    noiseFreq: 600, noiseQ: 0.7,
  },
  meeting: {
    label: "MEETING (CUỘC HỌP)",
    en: "Let's review the third quarter forecast before we finalize the budget.\n\nShould we prioritize the software security patch first?\n\nYes, security and client retention are our top priorities.",
    vi: "Chúng ta rà soát lại tiến độ dự án trước khi chốt ngân sách quý ba.\nMình có nên ưu tiên vá lỗi bảo mật hệ thống trước không?\nĐúng vậy, bảo mật và trải nghiệm khách hàng là ưu tiên số một.",
    noiseFreq: 1000, noiseQ: 1.0,
  },
  restaurant: {
    label: "RESTAURANT (NHÀ HÀNG)",
    en: "Excuse me, could we get some extra napkins and the check please?\n\nCertainly! Would you like to see the dessert menu first?\n\nNo thanks, we're in a bit of a hurry tonight.",
    vi: "Em ơi, cho bàn anh xin thêm ít khăn giấy và thanh toán luôn nhé!\nDạ vâng! Anh chị có muốn dùng thêm tráng miệng trước không ạ?\nCảm ơn em, tối nay nhà anh hơi vội nên tính tiền luôn giúp anh.",
    noiseFreq: 1400, noiseQ: 0.6,
  },
  crowd: {
    label: "CROWD (ĐÁM ĐÔNG)",
    en: "Stay close to the entrance! It's getting really crowded over there.\n\nWhere did you park the car? Section B or Section C?\n\nSection C, right next to the station exit!",
    vi: "Đứng gần cổng chính thôi nhé! Bên kia đang đông lắm.\nHồi nãy mình gửi xe ở khu B hay khu C nhỉ?\nKhu C, ngay sát lối ra trạm xe buýt ấy!",
    noiseFreq: 900, noiseQ: 0.5,
  },
  car: {
    label: "CAR (TRONG XE HƠI)",
    en: "Take the next exit on the right, then turn left at the traffic light.\n\nDid you say turn left or go straight?\n\nTurn left right after the gas station.",
    vi: "Rẽ phải ở lối ra tiếp theo, rồi rẽ trái ngay ngã tư đèn đỏ nhé.\nCon bảo rẽ trái hay đi thẳng cơ?\nRẽ trái ngay sau trạm xăng phía trước ấy bố ạ.",
    noiseFreq: 220, noiseQ: 2.0,
  },
  music: {
    label: "MUSIC (NGHE NHẠC)",
    en: "Listen to the high violin notes blending with the soft flute melody.\n\nWhen high frequencies fade, music loses its sparkle and warmth.",
    vi: "Hãy lắng nghe tiếng violin vút cao hòa cùng tiếng sáo trúc.\nKhi mất dải tần số cao, bản nhạc sẽ mất đi độ trong trẻo và sắc thái.",
    noiseFreq: 3200, noiseQ: 1.5,
  },
};

export const SOUND_ITEM_META = {
  water:    { emoji: "🚰" },
  ph_low:   { text: "z v j m d b n ng e u" },
  ph_mid:   { text: "p h ch g k t" },
  ph_high:  { text: "f s th x" },
  talk:     { emoji: "🧑‍🤝‍🧑" },
  birds:    { emoji: "🐦" },
  dog:      { emoji: "🐕" },
  vacuum:   { emoji: "🧹" },
  piano:    { emoji: "🎹" },
  truck:    { emoji: "🚚" },
  firework: { emoji: "🎆" },
  plane:    { emoji: "✈️" },
  moto:     { emoji: "🏍️" },
};

export const DEFAULT_SOUND_ITEMS = [
  { id: "water",    label: "Vòi nước",            freq: 250,  db: 20,  ...SOUND_ITEM_META.water },
  { id: "ph_low",   label: "Nguyên âm & âm trầm", freq: 380,  db: 42,  ...SOUND_ITEM_META.ph_low },
  { id: "ph_mid",   label: "Phụ âm trung-cao",    freq: 1800, db: 28,  ...SOUND_ITEM_META.ph_mid },
  { id: "ph_high",  label: "Phụ âm xát cao",      freq: 5500, db: 22,  ...SOUND_ITEM_META.ph_high },
  { id: "talk",     label: "Trò chuyện",          freq: 1000, db: 45,  ...SOUND_ITEM_META.talk },
  { id: "birds",    label: "Chim hót",            freq: 4500, db: 15,  ...SOUND_ITEM_META.birds },
  { id: "dog",      label: "Chó sủa",             freq: 320,  db: 70,  ...SOUND_ITEM_META.dog },
  { id: "vacuum",   label: "Máy hút bụi",         freq: 2600, db: 60,  ...SOUND_ITEM_META.vacuum },
  { id: "piano",    label: "Đàn piano",           freq: 1000, db: 80,  ...SOUND_ITEM_META.piano },
  { id: "truck",    label: "Xe tải",              freq: 250,  db: 98,  ...SOUND_ITEM_META.truck },
  { id: "firework", label: "Pháo hoa",            freq: 550,  db: 105, ...SOUND_ITEM_META.firework },
  { id: "plane",    label: "Máy bay",             freq: 3600, db: 105, ...SOUND_ITEM_META.plane },
  { id: "moto",     label: "Mô tô",               freq: 7200, db: 98,  ...SOUND_ITEM_META.moto },
];
