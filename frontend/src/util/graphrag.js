// GraphRAG tầng 1 chạy ngay trong máy (không cần mạng, không cần backend).
// Là bản JavaScript của backend/core/graphrag.py: cùng dữ liệu 6 nút (frontend/src/data/graphrag_nodes.js do
// tests/make_fixtures.py tự sinh), cùng cách chuẩn hoá, cùng trọng số, cùng câu trả lời. check-parity.mjs so
// từng ca với Python nên hai bên không thể lệch nhau mà không bị báo đỏ.
import DATA from "../data/graphrag_nodes.js";

export const DISCLAIMER = DATA.disclaimer;
const W = DATA.weights;   // { condition: 1.0, word: 1.5, phrase: 2.5 }

// Chữ thường, bỏ dấu (kể cả đ), chỉ giữ [a-z0-9], nối bằng 1 khoảng trắng và bọc khoảng trắng hai đầu
// để " cụm từ " khớp theo ranh giới từ. Giống hệt _norm trong graphrag.py.
export const norm = (s) =>
  " " + (String(s ?? "").toLowerCase().normalize("NFD").replace(/đ/g, "d").replace(/\p{Mn}/gu, "").match(/[a-z0-9]+/g) || []).join(" ") + " ";

// Điều kiện kích hoạt của từng nút trên hồ sơ audiogram (high = TB 2k/4k/8k, low = TB 250/500/1k).
const WHEN = {
  HIGH_FREQ_LOSS: (p) => p.high > 25,
  LOW_MID_FREQ_LOSS: (p) => p.low > 25,
  NOISY_ENVIRONMENT: (p) => p.high > 20,
  FAMILY_COMMUNICATION: (p) => p.high > 20,
  LOUDNESS_RECRUITMENT: (p) => p.high > 40,
  SEEK_CARE: (p) => p.high > 40 || p.low > 30,
};

export function profile(aud) {
  const v = (k) => Number(aud?.[k]) || 0;   // thiếu khoá thì coi là 0 để giao diện không bao giờ văng lỗi
  return { high: (v("2000") + v("4000") + v("8000")) / 3, low: (v("250") + v("500") + v("1000")) / 3 };
}

export function retrieve(aud, question = "", k = 3) {
  const p = profile(aud);
  const q = norm(question);
  const scored = [];
  for (const n of DATA.nodes) {
    let score = WHEN[n.id]?.(p) ? W.condition : 0;
    const hits = [];
    for (const kw of n.keywords) {
      if (q.includes(` ${kw} `)) {
        hits.push(kw);
        score += kw.includes(" ") ? W.phrase : W.word;
      }
    }
    if (score > 0) scored.push({ score, n, hits });
  }
  scored.sort((a, b) => b.score - a.score);   // sort của JS ổn định: hoà điểm thì giữ thứ tự khai báo
  return scored.slice(0, k).map(({ score, n, hits }) => ({
    id: n.id, score: Math.round(score * 10) / 10, hits, text: n.text, advice: n.advice }));
}

export function fallbackAnswer(aud, question) {
  const p = profile(aud);
  const nodes = retrieve(aud, question, 2);
  const head = `🐰 Ngưỡng bạn đang mô phỏng — trầm-trung: ${Math.round(p.low)} dB HL, cao: ${Math.round(p.high)} dB HL. `;
  if (!nodes.length) return head + "Với mức này bạn nghe rõ hầu hết âm thanh và phụ âm. " + DISCLAIMER;
  return head + nodes.map((n) => `${n.text} 👉 ${n.advice}`).join(" ") + " " + DISCLAIMER;
}

// Cùng hình dạng với phản hồi của POST /graphrag: { answer, mode, nodes }.
export function answerLocal(aud, question) {
  const q = (question || "").trim();
  return { answer: fallbackAnswer(aud, q), mode: "local", nodes: retrieve(aud, q).map((n) => n.id) };
}
