import { useEffect, useState } from "react";
import { useStore } from "../store";
import { testConnection, OFFLINE } from "../api";
import HealthImport from "./HealthImport";

const VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

// Cài đặt dạng "bottom sheet": chế độ dữ liệu (trong máy hoặc máy chủ HearAtlas), rung phản hồi, xem lại hướng dẫn.
export default function Settings() {
  const { settings, settingsOpen, closeSettings, saveSettings, refreshBackend, openOnboarding } = useStore();
  const [url, setUrl] = useState(settings.apiBase === OFFLINE ? "" : settings.apiBase);
  const [probe, setProbe] = useState(null);   // null | "busy" | { ok, ms, version, error }

  useEffect(() => {                           // Esc để đóng
    if (!settingsOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape") closeSettings(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settingsOpen, closeSettings]);

  if (!settingsOpen) return null;
  const serverMode = settings.apiBase !== OFFLINE;
  const apply = async (patch) => { await saveSettings(patch); await refreshBackend(); };
  const check = async () => { setProbe("busy"); setProbe(await testConnection(url.trim() || "/api")); };

  return (
    <div className="sheet-backdrop" onClick={closeSettings} role="presentation">
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="set-title" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 id="set-title" className="h2">Cài đặt</h2>
          <button className="gear-btn" onClick={closeSettings} aria-label="Đóng cài đặt">✕</button>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-bold mb-1">Nguồn dữ liệu</legend>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="mode" checked={!serverMode} onChange={() => apply({ apiBase: OFFLINE })} />
            <span><b>Trong máy (khuyên dùng).</b> Không cần mạng; audiogram và câu hỏi không rời thiết bị.</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="mode" checked={serverMode} onChange={() => apply({ apiBase: url.trim() || "/api" })} />
            <span><b>Máy chủ HearAtlas.</b> Nhiễu do backend sinh; có thể bật LLM trên máy chủ.</span>
          </label>
          <input className="border border-line rounded-xl px-3 py-2 text-sm bg-white" value={url} onChange={(e) => setUrl(e.target.value)}
                 placeholder="https://api.ten-mien-cua-ban.com  (hoặc /api khi chạy dev)" aria-label="Địa chỉ máy chủ" inputMode="url" autoCapitalize="off" autoCorrect="off" />
          <div className="flex gap-2 flex-wrap">
            <button className="btn-ghost" onClick={check} disabled={probe === "busy"}>Kiểm tra kết nối</button>
            <button className="btn-ghost" onClick={() => apply({ apiBase: url.trim() || "/api" })}>Lưu và kết nối</button>
          </div>
          {probe && probe !== "busy" && (
            <p className="text-xs" role="status">{probe.ok ? `✅ Kết nối được (${probe.ms} ms${probe.version ? `, phiên bản ${probe.version}` : ""})` : `⚠️ Không kết nối được: ${probe.error}`}</p>
          )}
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.haptics} onChange={(e) => saveSettings({ haptics: e.target.checked })} />
          <span>Rung nhẹ khi kéo audiogram</span>
        </label>

        <HealthImport />
        <button className="btn-ghost self-start" onClick={openOnboarding}>Xem lại hướng dẫn an toàn</button>
        <p className="text-xs text-muted">HearAtlas v{VERSION} · Mô phỏng giáo dục, không phải thiết bị y tế.</p>
      </section>
    </div>
  );
}
