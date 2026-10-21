// Dữ liệu đường thính lực hiện tại do người dùng kéo thả trên đồ thị (Hz -> dB HL)

const userAudiogram = [
  { freq: 250, db: 10 },
  { freq: 500, db: 30 },
  { freq: 1000, db: 30 },
  { freq: 2000, db: 50 },
  { freq: 4000, db: 40 },
  { freq: 8000, db: 20 }
];

// Danh sách các âm thanh đời thường & chữ cái trên biểu đồ 
const soundObjects = [
  { id: "water_drip", name: "Tiếng vòi nước nhỏ giọt", freq: 250, db: 20, icon: "🚰" },
  { id: "whisper", name: "Tiếng thì thầm", freq: 2000, db: 25, icon: "🤫" },
  { id: "birds", name: "Tiếng chim hót", freq: 5000, db: 15, icon: "🐦" },
  { id: "phonemes_high", name: "Âm p, h, ch, f, s, th", freq: 3000, db: 25, icon: "🔤" },
  { id: "conversation", name: "Cuộc trò chuyện bình thường", freq: 1000, db: 45, icon: "🗣️" },
  { id: "vacuum", name: "Máy hút bụi", freq: 3000, db: 60, icon: "🧹" },
  { id: "dog_bark", name: "Tiếng chó sủa", freq: 350, db: 70, icon: "🐕" },
  { id: "piano", name: "Đàn Piano", freq: 1000, db: 80, icon: "🎹" },
  { id: "truck", name: "Xe tải lớn", freq: 180, db: 95, icon: "🚚" },
  { id: "airplane", name: "Máy bay phản lực", freq: 4000, db: 105, icon: "✈️" }
];

// Hàm nội suy ngưỡng nghe của người dùng tại bất kỳ tần số f nào (theo thang Log2 của Audiogram)

function getUserThresholdAtFreq(f, audiogram) {
  if (f <= audiogram[0].freq) return audiogram[0].db;
  if (f >= audiogram[audiogram.length - 1].freq) return audiogram[audiogram.length - 1].db;

  for (let i = 0; i < audiogram.length - 1; i++) {
    const p1 = audiogram[i];
    const p2 = audiogram[i + 1];
    if (f >= p1.freq && f <= p2.freq) {
      // Nội suy tuyến tính trên trục tần số Logarit cơ số 2

      const t = (Math.log2(f) - Math.log2(p1.freq)) / (Math.log2(p2.freq) - Math.log2(p1.freq));
      return p1.db + t * (p2.db - p1.db);
    }
  }
  return 0;
}

// Kiểm tra từng âm thanh: Nếu dB của âm thanh NHỎ HƠN ngưỡng nghe (nằm phía trên đường kẻ) -> Bị điếc âm đó (Xám xịt!)

function evaluateSoundVisibility(soundObjects, userAudiogram) {
  return soundObjects.map(item => {
    const threshold = getUserThresholdAtFreq(item.freq, userAudiogram);
    const isAudible = item.db >= threshold; // Nằm từ đường kẻ trở xuống mới nghe thấy
    return {
      ...item,
      userThreshold: Math.round(threshold),
      isAudible: isAudible,
      uiStyle: isAudible 
        ? "filter: none; opacity: 1.0; pointer-events: auto;" 
        : "filter: grayscale(100%); opacity: 0.2; pointer-events: none;" // Chuyển sang màu xám xịt!
    };
  });
}