// Cầu nối với nền tảng gốc (iOS/Android) qua Capacitor. Trên web mọi hàm đều an toàn: không làm gì hoặc dùng
// Web API tương đương (Vibration API), nên cùng một mã chạy ở trình duyệt, PWA và app.
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { App } from "@capacitor/app";

export const isNative = () => { try { return Capacitor.isNativePlatform(); } catch { return false; } };
export const platform = () => { try { return Capacitor.getPlatform(); } catch { return "web"; } };

let hapticsOn = true;
export const setHapticsEnabled = (on) => { hapticsOn = !!on; };

// Rung nhẹ khi đổi một bước ngưỡng (5 dB) hoặc khi chọn mức. Web: Vibration API nếu có (Android Chrome);
// iOS Safari không hỗ trợ nên bỏ qua.
export async function tick(kind = "light") {
  if (!hapticsOn) return;
  try {
    if (isNative()) await Haptics.impact({ style: kind === "medium" ? ImpactStyle.Medium : ImpactStyle.Light });
    else if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(kind === "medium" ? 18 : 8);
  } catch { /* thiết bị không hỗ trợ */ }
}

// Gọi một lần khi app sẵn sàng: thanh trạng thái chữ tối trên nền sáng, ẩn màn hình chờ.
export async function initNative() {
  if (!isNative()) return;
  try { await StatusBar.setStyle({ style: Style.Light }); } catch { /* bỏ qua */ }
  try { await SplashScreen.hide(); } catch { /* bỏ qua */ }
}

// Gọi `cb` khi app bị đưa xuống nền: trên app là sự kiện appStateChange của Capacitor, trên web là tab bị ẩn.
// Dùng để dừng âm thanh khi người dùng chuyển app hay khoá màn hình. Trả về hàm huỷ đăng ký.
export function onBackground(cb) {
  const onVisibility = () => { if (document.hidden) cb(); };
  document.addEventListener("visibilitychange", onVisibility);
  let handle = null;
  if (isNative()) App.addListener("appStateChange", ({ isActive }) => { if (!isActive) cb(); }).then((h) => { handle = h; }).catch(() => {});
  return () => { document.removeEventListener("visibilitychange", onVisibility); handle?.remove?.(); };
}
