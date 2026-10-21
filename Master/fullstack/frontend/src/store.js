// State trung tâm (zustand) — nguồn chân lý duy nhất cho cả 3 tab.
// R-06: dữ liệu số (freqs, presets, cutoff, noise gain, sound items) lấy từ BACKEND lúc mount
// (store.cfg). constants.js chỉ còn là FALLBACK khi offline.
import { create } from "zustand";
import { FREQS, LEVEL_PRESETS, LEVEL_CUTOFF, LEVEL_NOISE_GAIN, SOUND_ITEMS } from "./data/constants";

const FALLBACK_CFG = {
  freqs: FREQS, levelPresets: LEVEL_PRESETS, cutoff: LEVEL_CUTOFF,
  noiseGain: LEVEL_NOISE_GAIN, soundItems: SOUND_ITEMS, source: "local",
};

export const useStore = create((set) => ({
  tab: "simulator",          // simulator | chat | audiogram
  lang: "vi",                // vi | en
  scenario: "shopping",
  dialect: "north",          // north | south (ảnh hưởng phân band d, r)
  level: "Normal",
  audiogramMode: "SOUNDS",   // SOUNDS | PLOTS
  cfg: FALLBACK_CFG,
  backend: "checking",       // checking | online | offline
  thresholds: [...LEVEL_PRESETS.Normal],
  customized: false,         // người dùng đã tự kéo đường ngưỡng
  isPlaying: false,

  // ghi đè hằng số bằng dữ liệu backend; KHÔNG ghi đè đường ngưỡng đã tự kéo
  applyConfig: (partial) =>
    set((s) => {
      const cfg = { ...s.cfg, ...partial, source: "backend" };
      const preset = cfg.levelPresets?.[s.level];
      return { cfg, backend: "online", thresholds: !s.customized && preset ? [...preset] : s.thresholds };
    }),
  setBackend: (backend) => set({ backend }),

  setTab: (tab) => set({ tab }),
  toggleLang: () => set((s) => ({ lang: s.lang === "vi" ? "en" : "vi" })),
  setScenario: (scenario) => set({ scenario }),
  toggleDialect: () => set((s) => ({ dialect: s.dialect === "north" ? "south" : "north" })),
  setLevel: (level) =>
    set((s) => ({ level, customized: false, thresholds: [...(s.cfg.levelPresets[level] || LEVEL_PRESETS[level])] })),
  setMode: (audiogramMode) => set({ audiogramMode }),
  setThreshold: (idx, db) =>
    set((s) => {
      const v = Math.max(-10, Math.min(110, db));
      if (s.thresholds[idx] === v) return s;
      const t = [...s.thresholds];
      t[idx] = v;
      return { thresholds: t, customized: true };
    }),
  setPlaying: (isPlaying) => set({ isPlaying }),
}));
