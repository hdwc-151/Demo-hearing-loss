import { useEffect } from "react";
import { useStore } from "./store";
import { getConfig } from "./api";
import Simulator from "./components/Simulator";
import Chat from "./components/Chat";
import Audiogram from "./components/Audiogram";

const TABS = [
  { id: "simulator", icon: "🎧", label: "Simulator", El: Simulator },
  { id: "chat", icon: "💬", label: "Chat", El: Chat },
  { id: "audiogram", icon: "📈", label: "Audiogram", El: Audiogram },
];

export default function App() {
  const { tab, setTab, applyConfig, setBackend, backend } = useStore();

  // R-06: nạp hằng số từ backend lúc mount; offline thì giữ fallback local.
  useEffect(() => {
    getConfig().then((c) => (c ? applyConfig(c) : setBackend("offline")));
  }, [applyConfig, setBackend]);

  // phím tắt 1/2/3 chuyển tab (bỏ qua khi đang gõ)
  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      const t = TABS[Number(e.key) - 1];
      if (t) setTab(t.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setTab]);

  const Active = TABS.find((t) => t.id === tab)?.El ?? Simulator;

  return (
    <div className="app-shell">
      <header className="flex justify-end pt-3">
        <span className={`status-dot ${backend}`} title={backend === "online" ? "Đã kết nối máy chủ" : backend === "offline" ? "Chế độ offline (dữ liệu cục bộ)" : "Đang kết nối…"}>
          {backend === "online" ? "online" : backend === "offline" ? "offline" : "…"}
        </span>
      </header>

      <main key={tab} className="tab-enter">
        <Active />
      </main>

      <button onClick={() => setTab("chat")} className="mascot" title="Hỏi Bác sĩ Thỏ" aria-label="Mở chat Bác sĩ Thỏ">🐰🩺</button>

      <nav className="bottom-nav" aria-label="Điều hướng">
        <div className="nav-inner">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? "page" : undefined}
              className={`nav-tab ${tab === t.id ? "active" : ""}`}>
              <span aria-hidden="true">{t.icon}</span><span className="nav-label">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
