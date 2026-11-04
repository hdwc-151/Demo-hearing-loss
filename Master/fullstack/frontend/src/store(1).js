import { create } from "zustand";
import { FREQS, LEVEL_PRESETS, LEVEL_CUTOFF, LEVEL_NOISE_GAIN, DEFAULT_SOUND_ITEMS, SOUND_ITEM_META } from "./data/constants";

const defaultCfg = {
  freqs: FREQS,
  presets: LEVEL_PRESETS,
  cutoff: LEVEL_CUTOFF,
  noiseGain: LEVEL_NOISE_GAIN,
  soundItems: DEFAULT_SOUND_ITEMS,
};

export const useStore = create((set) => ({
  tab: "simulator",
  lang: "vi",
  dialect: "north",
  scenario: "shopping",
  level: "Normal",
  audiogramMode: "SOUNDS",
  thresholds: [...LEVEL_PRESETS.Normal],
  customized: false,
  hearingAidOn: false,
  isPlaying: false,
  backend: "checking",
  cfg: defaultCfg,

  setTab: (tab) => set({ tab }),
  toggleLang: () => set((s) => ({ lang: s.lang === "vi" ? "en" : "vi" })),
  toggleDialect: () => set((s) => ({ dialect: s.dialect === "north" ? "south" : "north" })),
  setScenario: (scenario) => set({ scenario }),
  toggleHearingAid: () => set((s) => ({ hearingAidOn: !s.hearingAidOn })),
  setLevel: (level) =>
    set((s) => ({
      level,
      thresholds: [...(s.cfg.presets[level] || LEVEL_PRESETS[level])],
      customized: false,
    })),
  setMode: (audiogramMode) => set({ audiogramMode }),
  setThreshold: (idx, db) =>
    set((s) => {
      const clamped = Math.max(-10, Math.min(110, Math.round(db / 5) * 5));
      if (s.thresholds[idx] === clamped) return s;
      const next = [...s.thresholds];
      next[idx] = clamped;
      return { thresholds: next, customized: true };
    }),
  setThresholdsAll: (arr, levelName = "Normal", customized = true) =>
    set({ thresholds: [...arr], level: levelName, customized }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setBackend: (backend) => set({ backend }),
  applyConfig: ({ presets, soundItems }) =>
    set((s) => ({
      backend: "online",
      cfg: {
        freqs: presets?.freqs || s.cfg.freqs,
        presets: presets?.level_presets || s.cfg.presets,
        cutoff: presets?.cutoff || s.cfg.cutoff,
        noiseGain: presets?.noise_gain || s.cfg.noiseGain,
        soundItems: soundItems
          ? soundItems.map((it) => ({ ...it, ...(SOUND_ITEM_META[it.id] || {}) }))
          : s.cfg.soundItems,
      },
    })),
}));
