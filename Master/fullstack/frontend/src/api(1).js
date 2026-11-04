const BASE = import.meta.env.VITE_API_BASE || "/api";

async function fetchWithTimeout(url, opts = {}, ms = 20000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r;
  } finally {
    clearTimeout(id);
  }
}

export async function getConfig() {
  try {
    const [pRes, sRes] = await Promise.all([
      fetchWithTimeout(`${BASE}/presets`, {}, 5000),
      fetchWithTimeout(`${BASE}/sound-items`, {}, 5000),
    ]);
    return { presets: await pRes.json(), soundItems: await sRes.json() };
  } catch {
    return null;
  }
}

export function noiseUrl(scenario, level = "Normal", seconds = 4) {
  const qs = new URLSearchParams({ scenario, level, seconds: String(seconds) });
  return `${BASE}/noise?${qs}`;
}

export async function askDrBunny(audiogramDb, question) {
  try {
    const r = await fetchWithTimeout(`${BASE}/graphrag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audiogram_db: audiogramDb, question }),
    });
    return await r.json();
  } catch {
    const low = Math.round(((audiogramDb["250"] || 10) + (audiogramDb["500"] || 10) + (audiogramDb["1000"] || 10)) / 3);
    const high = Math.round(((audiogramDb["2000"] || 15) + (audiogramDb["4000"] || 15) + (audiogramDb["8000"] || 15)) / 3);
    return {
      mode: "offline",
      nodes: high > 25 ? ["HIGH_FREQ_LOSS", "NOISY_ENVIRONMENT"] : [],
      answer:
        `🐰 [Offline] Ngưỡng bạn đang mô phỏng — trầm-trung: ${low} dB HL, cao: ${high} dB HL. ` +
        (high > 25
          ? "Dải tần số cao bị suy giảm khiến các phụ âm nhẹ (s, x, th, ph, t, k) dễ biến mất, đặc biệt ở nơi đông người. 👉 Hãy nhờ người đối diện nói chậm, rõ chữ và nhìn thẳng mặt."
          : "Với ngưỡng này bạn nghe rõ hầu hết các âm thanh sinh hoạt và lời nói.") +
        " (Đây là mô phỏng & sàng lọc tham khảo, không thay chẩn đoán của bác sĩ.)",
    };
  }
}
