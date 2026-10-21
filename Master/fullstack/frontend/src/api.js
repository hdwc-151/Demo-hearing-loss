import { SOUND_PRESENTATION } from "./data/constants";
// Client gọi backend FastAPI. Mặc định qua proxy '/api' (vite.config.js).
// Mọi hàm đều có fallback để UI không chết khi backend offline.
const BASE = import.meta.env.VITE_API_BASE || "/api";

export async function askDrBunny(audiogramDb, question) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000); // không để UI treo nếu LLM chậm
  try {
    const r = await fetch(`${BASE}/graphrag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audiogram_db: audiogramDb, question }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } catch (e) {
    return { answer: "⚠️ Không gọi được backend — đang chạy ở chế độ offline. Hãy bật FastAPI (cổng 8000).", mode: "offline", error: String(e) };
  }
}

// Trả URL WAV nhiễu từ backend; null nếu offline để caller tự dựng nhiễu local.
export function noiseUrl(scenario, level, seconds = 3, seed) {
  const q = new URLSearchParams({ scenario, level, seconds: String(seconds) });
  if (seed != null) q.set("seed", String(seed));
  return `${BASE}/noise?${q.toString()}`;
}

// R-06: lấy hằng số số học từ backend (nguồn chân lý). Gộp emoji/text (trình bày) theo id.
// Trả null nếu offline -> store giữ fallback local.
export async function getConfig() {
  try {
    const [presets, items] = await Promise.all([
      fetch(`${BASE}/presets`).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(`${BASE}/sound-items`).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
    ]);
    const soundItems = items.map((it) => ({ ...it, ...(SOUND_PRESENTATION[it.id] || {}) }));
    return {
      freqs: presets.freqs, levelPresets: presets.level_presets, cutoff: presets.cutoff,
      ...(presets.noise_gain ? { noiseGain: presets.noise_gain } : {}), soundItems,
    };
  } catch (e) {
    return null;
  }
}

export async function health() {
  try {
    const r = await fetch(`${BASE}/health`);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
