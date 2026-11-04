// Lưu cài đặt nhỏ. App mobile dùng Capacitor Preferences (UserDefaults trên iOS, SharedPreferences trên Android);
// web dùng localStorage. Mọi thao tác bọc try/catch: bị chặn (chế độ riêng tư, iframe sandbox) thì lùi về bộ nhớ
// trong phiên, giao diện không bao giờ văng lỗi vì lưu trữ.
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const PREFIX = "drbunny.";
const mem = new Map();
const native = () => { try { return Capacitor.isNativePlatform(); } catch { return false; } };

export async function getItem(key) {
  try {
    if (native()) return (await Preferences.get({ key: PREFIX + key })).value ?? null;
    const v = globalThis.localStorage?.getItem(PREFIX + key);
    if (v != null) return v;
  } catch { /* lùi về bộ nhớ phiên */ }
  return mem.get(key) ?? null;
}

export async function setItem(key, value) {
  mem.set(key, value);
  try {
    if (native()) await Preferences.set({ key: PREFIX + key, value });
    else globalThis.localStorage?.setItem(PREFIX + key, value);
  } catch { /* chỉ còn bộ nhớ phiên */ }
}

export async function getJSON(key, fallback = null) {
  try { const v = await getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
export const setJSON = (key, obj) => setItem(key, JSON.stringify(obj));
