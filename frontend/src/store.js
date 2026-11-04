// State trung tâm (zustand) — nguồn chân lý duy nhất cho cả 3 tab.
// R-06: dữ liệu số (freqs, presets, cutoff, noise gain, sound items) lấy từ BACKEND lúc mount
// (store.cfg). constants.js chỉ còn là FALLBACK khi offline.
// Import có đuôi .js để file này chạy được dưới Node thuần khi test (scripts/logic.test.mjs).
import { create } from "zustand";
import { FREQS, LEVELS, LEVEL_PRESETS, LEVEL_CUTOFF, LEVEL_NOISE_GAIN, SOUND_ITEMS } from "./data/constants.js";
import { nearestLevel } from "./util/level.js";
import { setApiBase, getApiBase, isOfflineMode, getConfig, IS_DEMO, OFFLINE } from "./api.js";
import { getJSON, setJSON } from "./storage.js";
import { isNative, setHapticsEnabled } from "./native.js";

const FALLBACK_CFG = {
  freqs: FREQS, levelPresets: LEVEL_PRESETS, cutoff: LEVEL_CUTOFF,
  noiseGain: LEVEL_NOISE_GAIN, soundItems: SOUND_ITEMS, source: "local",
};

// Cài đặt người dùng (lưu bền qua storage.js). apiBase = "offline" nghĩa là chạy hoàn toàn trong máy (mặc định của
// app mobile và bản demo); web phát triển mặc định dùng proxy "/api". onboarded = đã đọc hướng dẫn an toàn.
const defaultSettings = () => ({ apiBase: IS_DEMO || isNative() ? OFFLINE : getApiBase(), haptics: true, onboarded: false });

// Lời chào của Bác sĩ Thỏ. Lịch sử chat nằm trong store (không phải state cục bộ của Chat) để
// không bị xoá mỗi lần đổi tab, vì App dùng <main key={tab}> nên component bị tạo lại (AUDIT-09).
export const GREETING = {
  role: "bot",
  text: "🎧 Xin chào! Mình là HearAtlas Guide, trợ lý kiến thức thính giác. Biểu đồ bạn đang chọn là mô phỏng, không phải kết quả khám. Bạn muốn tìm hiểu điều gì?",
};

export const useStore = create((set, get) => ({
  tab: "simulator",          // simulator | chat | audiogram
  lang: "vi",                // vi | en
  scenario: "shopping",
  dialect: "north",          // north | south (ảnh hưởng phân band d, r)
  level: "Normal",
  audiogramMode: "SOUNDS",   // SOUNDS | PLOTS
  cfg: FALLBACK_CFG,
  backend: "checking",       // checking | online | offline | local (chủ động chạy trong máy)
  thresholds: [...LEVEL_PRESETS.Normal],
  customized: false,         // người dùng đã tự kéo đường ngưỡng
  isPlaying: false,
  chat: [GREETING],          // lịch sử hội thoại với Bác sĩ Thỏ
  settings: defaultSettings(),
  ready: false,              // đã đọc xong cài đặt đã lưu
  settingsOpen: false,
  onboardingOpen: false,     // mở lại hướng dẫn an toàn từ màn Cài đặt

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
      // AUDIT-20: luôn làm tròn — backend khai báo audiogram_db là int nên số lẻ sẽ bị trả 422
      const v = Math.max(-10, Math.min(110, Math.round(db)));
      if (s.thresholds[idx] === v) return s;
      const t = [...s.thresholds];
      t[idx] = v;
      return { thresholds: t, customized: true };
    }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  addChat: (msg) => set((s) => ({ chat: [...s.chat, msg] })),

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openOnboarding: () => set({ onboardingOpen: true, settingsOpen: false }),
  loadSettings: async () => {
    const settings = { ...defaultSettings(), ...(await getJSON("settings", {})) };
    setApiBase(settings.apiBase);
    setHapticsEnabled(settings.haptics);
    set({ settings, ready: true });
  },
  saveSettings: async (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    setApiBase(settings.apiBase);
    setHapticsEnabled(settings.haptics);
    await setJSON("settings", settings);
  },
  acceptOnboarding: async () => {
    set({ onboardingOpen: false });
    await get().saveSettings({ onboarded: true });
  },
  // Nạp lại cấu hình theo chế độ dữ liệu hiện tại: chạy trong máy -> bản dự phòng cục bộ; có máy chủ -> hỏi backend.
  refreshBackend: async () => {
    if (isOfflineMode()) { set({ backend: "local", cfg: FALLBACK_CFG }); return; }
    set({ backend: "checking" });
    const c = await getConfig();
    if (c) get().applyConfig(c); else set({ backend: "offline" });
  },
}));

// Mức dùng để MÔ PHỎNG: preset đang chọn, hoặc — nếu người dùng đã tự kéo audiogram — preset
// gần nhất với đường ngưỡng đó. Trước đây Simulator chỉ nhìn `level` nên kéo audiogram không có
// tác dụng gì lên văn bản/nhiễu/giọng đọc (AUDIT-06). Trả về chuỗi nên dùng làm selector được.
export const selectEffectiveLevel = (s) =>
  s.customized ? nearestLevel(s.thresholds, s.cfg.levelPresets, LEVELS) : s.level;
