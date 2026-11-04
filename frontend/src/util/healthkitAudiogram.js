import { Capacitor, registerPlugin } from "@capacitor/core";

// Scoped to native iOS; browser/PWA/Android never request or simulate access.
// No network, storage write, and no forwarding to an LLM in this module.
const HealthAudiogram = registerPlugin("HealthAudiogram");

export function canUseAppleHealth() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export function validateHealthAudiogram(payload) {
  if (!payload || payload.found !== true) {
    return { found: false, message: payload?.message || "Không có dữ liệu audiogram được phép đọc." };
  }
  if (payload.source !== "apple_healthkit" || payload.unit !== "dB HL" ||
      !Array.isArray(payload.points) || payload.points.length > 30) {
    throw new Error("HealthKit trả về audiogram không hợp lệ.");
  }
  const points = payload.points.map(p => {
    const f = Number(p.frequencyHz);
    if (!Number.isFinite(f) || f < 125 || f > 16000) throw new Error("Tần số nằm ngoài giới hạn.");
    const normalized = { frequencyHz: f };
    for (const side of ["leftDbHL", "rightDbHL"]) {
      if (p[side] == null) continue;
      const value = Number(p[side]);
      if (!Number.isFinite(value) || value < -20 || value > 130)
        throw new Error("Dữ liệu ngưỡng nghe nằm ngoài giới hạn.");
      normalized[side] = value;
    }
    if (normalized.leftDbHL == null && normalized.rightDbHL == null)
      throw new Error("Thiếu dữ liệu tai trái/phải.");
    return normalized;
  });
  if (!Number.isFinite(Date.parse(payload.measuredAt || ""))) throw new Error("Thiếu ngày đo.");
  return {
    found: true,
    profileSource: "healthkit_measured",
    unit: "dB HL",
    measuredAt: payload.measuredAt,
    points: points.sort((a,b) => a.frequencyHz-b.frequencyHz),
    // Explicitly no sample UUID in app UI payload; no storage or uploads.
  };
}

export async function readAppleHealthAudiogram() {
  if (!canUseAppleHealth()) throw new Error("Chỉ khả dụng trong ứng dụng HearAtlas trên iPhone.");
  const available = await HealthAudiogram.availability();
  if (!available?.available) throw new Error("Apple HealthKit không khả dụng trên thiết bị này.");
  // Must be called only from an explicit user tap.
  return validateHealthAudiogram(await HealthAudiogram.readLatest());
}
