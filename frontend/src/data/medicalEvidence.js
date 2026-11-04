/* HearAtlas fact cards, independently paraphrased from linked publications.
 * Metadata is for education/retrieval, NOT diagnosis or training labels.
 * Keep patient data out of these static records.
 */
export const MEDICAL_SOURCES = Object.freeze({
  who2026: {
    title: "WHO — Deafness and hearing loss (03/03/2026)",
    url: "https://www.who.int/news-room/fact-sheets/detail/deafness-and-hearing-loss",
    publisher: "WHO", reviewed: "2026-11-04",
  },
  whoReport: {
    title: "WHO — World Report on Hearing (2021)",
    url: "https://www.who.int/publications/i/item/9789240020481",
    publisher: "WHO", reviewed: "2026-11-04",
  },
  vietnamCare: {
    title: "Sức khỏe & Đời sống — Nghe kém ở người già khi nào cần khám? (08/09/2026)",
    url: "https://suckhoedoisong.vn/nghe-kem-o-nguoi-gia-khi-nao-can-kham-169260907181024361.htm",
    publisher: "Sức khỏe & Đời sống", reviewed: "2026-11-04",
  },
  vietnamAge: {
    title: "Sức khỏe & Đời sống — Lãng tai ở người già (20/05/2026)",
    url: "https://suckhoedoisong.vn/lang-tai-o-nguoi-gia-dau-hieu-suy-giam-thinh-luc-do-tuoi-tac-khong-nen-xem-nhe-169260519082504214.htm",
    publisher: "Sức khỏe & Đời sống", reviewed: "2026-11-04",
  },
  nidcdAge: {
    title: "NIDCD / NIH — Age-Related Hearing Loss",
    url: "https://www.nidcd.nih.gov/health/age-related-hearing-loss",
    publisher: "NIDCD", reviewed: "2026-11-04",
  },
  nidcdSudden: {
    title: "NIDCD / NIH — Sudden Deafness",
    url: "https://www.nidcd.nih.gov/health/sudden-deafness",
    publisher: "NIDCD", reviewed: "2026-11-04",
  },
  dementiaReview: {
    title: "Clinical review — Hearing impairment and dementia (2025)",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12084262/",
    publisher: "PubMed Central", reviewed: "2026-11-04",
  },
  ansiSii: {
    title: "ASA/ANSI S3.5-1997 (R2024) — Speech Intelligibility Index",
    url: "https://webstore.ansi.org/standards/asa/ASAANSIS31997R2024",
    publisher: "ASA/ANSI", reviewed: "2026-11-04",
  },
  mooreGlasberg: {
    title: "Moore & Glasberg (1993) — Loudness recruitment and threshold elevation",
    url: "https://pubmed.ncbi.nlm.nih.gov/8227747/",
    publisher: "JASA / PubMed", reviewed: "2026-11-04",
  },
});

export function normalizeMedicalQuery(value) {
  return (" " + String(value || "").toLowerCase().replace(/đ/g, "d")
    .normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, " ").trim() + " ");
}
const includesAny = (q, keys) => keys.some(k => q.includes(" " + k + " "));
const pack = (answer, keys, emotion = "explaining", risk = "education") => ({
  answer, mode: "evidence", nodes: [], emotion, risk,
  sources: keys.map(id => ({ id, ...MEDICAL_SOURCES[id] })),
});
// Deterministic safety routing takes priority over LLM and local keyword GraphRAG.
// Not a medical diagnosis or validated clinical triage algorithm.
export function answerFromEvidence(question, { profileSource = "simulated" } = {}) {
  const q = normalizeMedicalQuery(question);
  if (includesAny(q, ["dot ngot nghe kem", "nghe kem dot ngot", "mat thinh luc dot ngot", "sudden hearing loss", "diếc dot ngot", "diec dot ngot"])) {
    return pack("Nghe kém xuất hiện đột ngột, kể cả chỉ một tai, cần được đánh giá y tế khẩn cấp ngay. Đừng chờ thử lại bằng ứng dụng hay tự cho rằng do ráy tai. Nguồn NIDCD coi điếc đột ngột là tình huống cấp cứu y khoa.", ["nidcdSudden"], "serious", "urgent");
  }
  if (includesAny(q, ["who 2050", "2 5 ty", "700 trieu", "25 phan tram", "tren 60 tuoi", "60 tuoi"])) {
    return pack("WHO (03/2026) ước tính đến năm 2050 gần 2,5 tỷ người có một mức độ suy giảm thính lực, hơn 700 triệu người sẽ cần phục hồi chức năng nghe. Trên 25% người trên 60 tuổi có suy giảm thính lực gây hạn chế đáng kể; WHO dùng ngưỡng >35 dB ở tai nghe tốt hơn cho khái niệm này. Đây là thống kê quần thể, không đánh giá cá nhân.", ["who2026"], "explaining");
  }
  if (includesAny(q, ["alzheimer", "sa sut tri tue", "dementia"])) {
    return pack("Nghiên cứu ghi nhận mối liên hệ giữa suy giảm thính lực và nguy cơ sa sút trí tuệ, nhưng chưa thể khẳng định nghe kém tự nó gây Alzheimer hay can thiệp nghe sẽ ngăn được một tỷ lệ ca bệnh cụ thể. Tổng quan lâm sàng nêu rõ quan hệ này phức tạp và cơ chế chưa được xác định đầy đủ.", ["dementiaReview"], "careful");
  }
  if (includesAny(q, ["sii", "speech intelligibility index", "chi so hieu loi noi"])) {
    return pack("Speech Intelligibility Index (SII) là chỉ số dựa trên thông tin âm học như phổ lời nói, tiếng ồn và ngưỡng nghe. Không thể tính SII đạt chuẩn chỉ từ sáu điểm audiogram chưa hiệu chuẩn hoặc một file âm thanh không có mức SPL. HearAtlas chưa triển khai SII đúng tiêu chuẩn ASA/ANSI.", ["ansiSii"], "explaining");
  }
  if (includesAny(q, ["oc tai", "cochlear", "loudness recruitment", "gammachirp", "msbg"])) {
    return pack("Nghe kém liên quan ốc tai không chỉ tương đương giảm âm lượng: còn có thay đổi ngưỡng, cảm nhận độ to và chọn lọc tần số. Các bộ lọc ERB/dcGC hiện tại chỉ là mô phỏng kỹ thuật; chưa được xác nhận là tái tạo chính xác thính giác một cá nhân.", ["mooreGlasberg"], "explaining");
  }
  if (includesAny(q, ["nha hang", "sieu thi", "tieng on", "lam bam", "nghe thay nhung khong ro", "khong ro loi"])) {
    return pack("Trong môi trường nhiều tiếng ồn, lời nói dễ bị che lấp nên có thể nghe thấy có người đang nói nhưng khó phân biệt từ. Hãy thử giảm tiếng ồn nền, quay mặt về phía người nói và yêu cầu nói rõ ràng, không hét. Nếu tình trạng lặp lại, nên kiểm tra thính lực.", ["vietnamCare", "nidcdAge"], "supportive");
  }
  if (includesAny(q, ["nguoi nha", "gia dinh", "noi the nao", "noi chuyen", "noi to", "het lon"])) {
    return pack("Khi trò chuyện với người nghe kém: nhìn trực diện, nói rõ và tự nhiên, tránh hét, giảm TV/tiếng ồn, và kiểm tra xem họ đã hiểu nội dung chưa. Đây là cách hỗ trợ giao tiếp, không thay thế đánh giá thính học.", ["nidcdAge", "vietnamCare"], "supportive");
  }
  if (includesAny(q, ["can di kham", "nen di kham", "kham bac si", "kham thinh luc", "lang tai", "nghe kem nguoi gia"])) {
    return pack("Nếu thường xuyên phải nhờ nhắc lại, tăng âm lượng TV, khó hiểu lời nói khi đông người hoặc nghe kém tăng dần, bạn nên hẹn khám Tai Mũi Họng hoặc chuyên gia thính học. Nếu nghe kém xuất hiện đột ngột, cần khám khẩn cấp ngay. Ứng dụng không thể thay việc đo thính lực.", ["vietnamCare", "nidcdAge", "nidcdSudden"], "supportive", "care");
  }
  if (profileSource === "simulated" && includesAny(q, ["toi bi diec", "toi mac benh", "benh gi", "chan doan", "may tro thinh"])) {
    return pack("Đường audiogram đang chọn là dữ liệu mô phỏng, không phải kết quả khám. Không thể dùng nó để chẩn đoán bệnh, kê máy trợ thính hay đánh giá mức nghe thật. Nếu bạn lo lắng về khả năng nghe, hãy hỏi chuyên gia thính học.", ["vietnamCare"], "careful");
  }
  return null;
}
