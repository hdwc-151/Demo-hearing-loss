import { SOUND_PRESENTATION } from "./data/constants.js";
import { answerLocal } from "./util/graphrag.js";
// Client gọi backend FastAPI, có đường lùi về bộ máy chạy trong máy (util/graphrag.js, util/noise.js) nên
// ứng dụng vẫn đầy đủ chức năng khi không có backend (app mobile, bản demo, mất mạng).
// `?.` sau import.meta.env: dưới Node (test) import.meta.env là undefined; dưới Vite luôn có.
export const IS_DEMO = import.meta.env?.VITE_DEMO === "1";
const DEFAULT_BASE = import.meta.env?.VITE_API_BASE || "/api";
export const OFFLINE = "offline";   // giá trị đặc biệt của apiBase: không gọi mạng, dùng bộ máy trong máy

let apiBase = DEFAULT_BASE;
export const getApiBase = () => apiBase;
export const setApiBase = (v) => { apiBase = (v || DEFAULT_BASE).replace(/\/+$/, ""); };
export const isOfflineMode = () => IS_DEMO || apiBase === OFFLINE;

const CHAT_TIMEOUT_MS = 20000;   // lớn hơn LLM_TIMEOUT (15 s) của backend để backend tự lùi tầng trước
const CONFIG_TIMEOUT_MS = 5000;  // cấu hình nhỏ; quá 5 s coi như offline thay vì treo ở "checking"

// GET JSON có timeout; timer luôn được dọn (finally) kể cả khi lỗi mạng.
async function getJson(path, ms = CONFIG_TIMEOUT_MS) {
  if (isOfflineMode()) throw new Error("chế độ offline");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(`${apiBase}${path}`, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

// Gói lỗi thành câu trả lời hiển thị được, PHÂN BIỆT nguyên nhân (AUDIT-07).
function chatFailure(kind, detail) {
  const text = {
    timeout: "⚠️ Backend phản hồi quá lâu (hơn 20 giây). Hãy thử lại sau.",
    invalid: "⚠️ Backend từ chối dữ liệu gửi đi (mã 4xx). Câu hỏi có thể quá dài hoặc audiogram không hợp lệ.",
    error: "⚠️ Backend gặp lỗi nội bộ (mã 5xx). Xem log máy chủ để biết chi tiết.",
  }[kind];
  return { answer: text, mode: kind, error: String(detail) };
}

// Không kết nối được máy chủ: thay vì báo lỗi, trả lời bằng bộ tri thức trong máy (cùng nội dung tầng 1 của backend).
function chatLocal(audiogramDb, question, detail) {
  const r = answerLocal(audiogramDb, question);
  return { ...r, answer: "📴 Máy chủ không khả dụng; HearAtlas Guide trả lời bằng tri thức lưu trên thiết bị. " + r.answer, error: String(detail), fallback: true };
}

export async function askDrBunny(audiogramDb, question, timeoutMs = CHAT_TIMEOUT_MS) {
  if (isOfflineMode()) return answerLocal(audiogramDb, question);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs); // không để UI treo nếu LLM chậm
  try {
    const r = await fetch(`${apiBase}/graphrag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audiogram_db: audiogramDb, question }),
      signal: ctrl.signal,
    });
    // Static Pages / stale backend may answer /graphrag with 404/405/422 or 5xx.
    // NEVER show an opaque HTTP diagnostic as the chatbot's only reply:
    // locally cached knowledge is intentionally available without the server.
    if (!r.ok) return chatLocal(audiogramDb, question, `HTTP ${r.status}`);
    return await r.json(); // vẫn nằm trong try -> timeout cũng phủ cả việc đọc body
  } catch (e) {
    return chatLocal(audiogramDb, question, e?.name === "AbortError" ? "timeout" : e);
  } finally {
    clearTimeout(timer);
  }
}

// Trả URL WAV nhiễu từ backend (luôn là chuỗi). Ở chế độ offline Simulator không gọi hàm này mà tự sinh nhiễu.
export function noiseUrl(scenario, level, seconds = 3, seed) {
  const q = new URLSearchParams({ scenario, level, seconds: String(seconds) });
  if (seed != null) q.set("seed", String(seed));
  return `${apiBase}/noise?${q.toString()}`;
}

// R-06: lấy hằng số số học từ backend (nguồn chân lý). Gộp emoji/text (trình bày) theo id.
// Trả null nếu offline/timeout -> store giữ bản dự phòng cục bộ.
export async function getConfig(timeoutMs = CONFIG_TIMEOUT_MS) {
  if (isOfflineMode()) return null;
  try {
    const [presets, items] = await Promise.all([getJson("/presets", timeoutMs), getJson("/sound-items", timeoutMs)]);
    const soundItems = items.map((it) => ({ ...it, ...(SOUND_PRESENTATION[it.id] || {}) }));
    return {
      freqs: presets.freqs, levelPresets: presets.level_presets, cutoff: presets.cutoff,
      ...(presets.noise_gain ? { noiseGain: presets.noise_gain } : {}), soundItems,
    };
  } catch {
    return null;
  }
}

export async function health() {
  try {
    return await getJson("/health");
  } catch {
    return null;
  }
}

// Dùng ở màn Cài đặt: thử kết nối tới một địa chỉ máy chủ bất kỳ (không đổi cấu hình đang dùng).
export async function testConnection(base, ms = CONFIG_TIMEOUT_MS) {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(`${String(base).replace(/\/+$/, "")}/health`, { signal: ctrl.signal });
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
    const j = await r.json();
    return { ok: j?.status === "ok", ms: Date.now() - t0, version: j?.version };
  } catch (e) {
    return { ok: false, error: e?.name === "AbortError" ? "quá hạn" : String(e?.message || e) };
  } finally {
    clearTimeout(timer);
  }
}
