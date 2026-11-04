import { useEffect } from "react";
import { useStore } from "./store";
import { initNative } from "./native";
import { IS_DEMO } from "./api";
import Simulator from "./components/Simulator";
import Chat from "./components/Chat";
import Audiogram from "./components/Audiogram";
import AudioLab from "./components/AudioLab";
import Settings from "./components/Settings";
import Onboarding from "./components/Onboarding";

const TABS = [
  { id: "simulator", icon: "🎧", label: "Simulator", El: Simulator },
  { id: "chat", icon: "💬", label: "Chat", El: Chat },
  { id: "audiogram", icon: "📈", label: "Audiogram", El: Audiogram },
  { id: "audio-lab", icon: "🎚️", label: "Audio Lab", El: AudioLab },
];

export default function App() {
  const { tab, setTab, backend, loadSettings, refreshBackend, openSettings } = useStore();

  // Lúc mount: đọc cài đặt đã lưu, chuẩn bị nền tảng gốc (thanh trạng thái, màn hình chờ), rồi nạp cấu hình theo
  // chế độ dữ liệu (R-06: có máy chủ thì lấy hằng số từ backend; chạy trong máy thì dùng bản dự phòng cục bộ).
  useEffect(() => {
    (async () => {
      await loadSettings();
      await initNative();
      await refreshBackend();
    })();
  }, [loadSettings, refreshBackend]);

  // phím tắt 1/2/3/4 chuyển tab (bỏ qua khi đang gõ hoặc khi giữ Ctrl/Cmd/Alt)
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return; // AUDIT-16: không cướp Ctrl/Cmd+1.. (chuyển tab trình duyệt)
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) || e.target.isContentEditable) return;
      const t = TABS[Number(e.key) - 1];
      if (t) setTab(t.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setTab]);

  const Active = TABS.find((t) => t.id === tab)?.El ?? Simulator;

  return (
    <div className="app-shell">
      {IS_DEMO && <p className="demo-banner" role="note">NGOẠI TUYẾN · xử lý trực tiếp trên thiết bị</p>}
      <header className="flex items-center justify-end gap-2 pt-3">
        <span className={`status-dot ${backend}`} title={{ online: "Đã kết nối máy chủ", offline: "Không kết nối được máy chủ (dùng dữ liệu trong máy)", local: "Chạy hoàn toàn trong máy" }[backend] || "Đang kết nối…"}>
          {{ online: "online", offline: "offline", local: "local" }[backend] || "…"}
        </span>
        <button className="gear-btn" onClick={openSettings} aria-label="Cài đặt" title="Cài đặt">⚙️</button>
      </header>

      <main key={tab} className="tab-enter">
        <Active />
      </main>

      <button onClick={() => setTab("chat")} className="mascot" title="Hỏi trợ lý HearAtlas" aria-label="Mở trợ lý HearAtlas">🎧</button>

      <nav className="bottom-nav" aria-label="Điều hướng">
        <div className="nav-inner">
          {TABS.map((t) => (
            <button key={t.id} aria-label={t.label} onClick={() => setTab(t.id)} aria-current={tab === t.id ? "page" : undefined}
              className={`nav-tab ${tab === t.id ? "active" : ""}`}>
              <span aria-hidden="true">{t.icon}</span><span className="nav-label">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <Onboarding />
      <Settings />
    </div>
  );
}
