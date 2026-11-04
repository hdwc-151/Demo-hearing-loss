import { useState } from "react";
import { canUseAppleHealth, readAppleHealthAudiogram } from "../util/healthkitAudiogram.js";

// This panel never writes health records to Zustand, storage or API.
// Import is READ-ONLY preview until clinically reviewed bilateral profile support.
export default function HealthImport() {
  const [state, setState] = useState({ status: "idle", data: null, error: null });
  if (!canUseAppleHealth()) return null;

  const load = async () => {
    setState({ status: "loading", data: null, error: null });
    try {
      const result = await readAppleHealthAudiogram();
      setState({ status: result.found ? "loaded" : "empty", data: result, error: null });
    } catch (e) {
      setState({ status: "error", data: null, error: String(e?.message || "Không thể truy cập Apple Health.") });
    }
  };
  return (
    <section aria-labelledby="healthkit-title" className="border border-sage-light rounded-xl p-3 mt-3">
      <h3 id="healthkit-title" className="font-bold text-sm">Apple Health · Audiogram</h3>
      <p className="text-xs text-muted my-2">Chỉ đọc khi bạn bấm nút dưới đây. Dữ liệu chỉ hiển thị trong phiên này, không tự lưu, không tải lên máy chủ hoặc dùng để train AI.</p>
      <button className="btn-primary" type="button" disabled={state.status === "loading"} onClick={load}>
        {state.status === "loading" ? "Đang đọc từ Apple Health…" : "Đọc audiogram từ Apple Health"}
      </button>
      {state.status === "error" && <p role="alert" className="text-sm mt-2">{state.error}</p>}
      {state.status === "empty" && <p role="status" className="text-sm mt-2">{state.data?.message}</p>}
      {state.status === "loaded" && <div className="mt-3">
        <p className="text-xs mb-2"><b>Dữ liệu HealthKit</b> · {new Date(state.data.measuredAt).toLocaleDateString("vi-VN")} · dB HL. Không phải chẩn đoán hay kết quả của mô phỏng.</p>
        <div className="overflow-x-auto"><table className="text-xs w-full text-left">
          <thead><tr><th scope="col">Tần số (Hz)</th><th scope="col">Tai trái</th><th scope="col">Tai phải</th></tr></thead>
          <tbody>{state.data.points.map((p,i) => <tr key={p.frequencyHz+"-"+i}>
            <td>{p.frequencyHz}</td><td>{p.leftDbHL ?? "—"}</td><td>{p.rightDbHL ?? "—"}</td>
          </tr>)}</tbody>
        </table></div>
        <button type="button" className="btn-ghost mt-2" onClick={() => setState({ status: "idle", data: null, error: null })}>Xóa khỏi màn hình</button>
      </div>}
    </section>
  );
}
