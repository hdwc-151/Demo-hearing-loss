import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { askDrBunny } from "../api";

const PILLS = [
  { key: "analyze", label: "📊 Phân tích biểu đồ của tôi", q: "Phân tích biểu đồ thính lực hiện tại của tôi" },
  { key: "letters", label: "🔤 Vì sao chữ cái biến mất?", q: "Tại sao chữ cái và phụ âm biến mất khi nghe kém?" },
  { key: "noisy", label: "🛒 Nghe tiếng nhưng không rõ chữ?", q: "Tại sao ở siêu thị tôi nghe tiếng nhưng không rõ chữ?" },
  { key: "family", label: "👨‍👩‍👧 Người nhà nên nói thế nào?", q: "Người nhà nên giao tiếp thế nào cho dễ nghe?" },
  { key: "care", label: "🩺 Khi nào nên đi khám?", q: "Tôi có nên đi khám bác sĩ không?" },
];

const NODE_LABEL = {
  HIGH_FREQ_LOSS: "Tần số cao", LOW_MID_FREQ_LOSS: "Trầm-trung", NOISY_ENVIRONMENT: "Môi trường ồn",
  FAMILY_COMMUNICATION: "Giao tiếp gia đình", LOUDNESS_RECRUITMENT: "Chói tai", SEEK_CARE: "Đi khám",
};

export default function Chat() {
  const { thresholds, cfg } = useStore();
  const [msgs, setMsgs] = useState([
    { role: "bot", text: "🐰 Xin chào! Mình là Bác sĩ Thỏ. Mình đọc trực tiếp biểu đồ thính lực bạn đang mô phỏng. Chọn câu hỏi nhanh hoặc gõ câu bất kỳ nhé!" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  async function send(q) {
    if (!q.trim() || busy) return;
    const audiogramDb = Object.fromEntries(cfg.freqs.map((f, i) => [String(f), thresholds[i]]));
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    const res = await askDrBunny(audiogramDb, q);
    setMsgs((m) => [...m, { role: "bot", text: res.answer, mode: res.mode, nodes: res.nodes || [] }]);
    setBusy(false);
  }

  return (
    <section aria-labelledby="chat-title" className="flex flex-col">
      <h1 id="chat-title" className="h1">Dr. Bunny AI Audiologist</h1>

      <div ref={boxRef} className="chat-box" role="log" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role === "bot" ? "msg-bot" : "msg-user"}`}>
            {m.text}
            {m.nodes?.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {m.nodes.map((n) => <span key={n} className="node-tag">{NODE_LABEL[n] || n}</span>)}
                {m.mode && <span className="node-tag opacity-60">{m.mode}</span>}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="msg msg-bot typing" aria-label="Đang soạn"><i /><i /><i /></div>}
      </div>

      <div className="flex gap-1.5 mt-2.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        {PILLS.map((p) => (
          <button key={p.key} onClick={() => send(p.q)} disabled={busy} className="pill shrink-0">{p.label}</button>
        ))}
      </div>

      <form className="flex gap-2 mt-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} aria-label="Câu hỏi"
          placeholder="Hỏi Bác sĩ Thỏ…" maxLength={500}
          className="flex-1 min-w-0 px-3.5 py-2.5 rounded-full border border-sage-light bg-white outline-none focus:border-sage-mid" />
        <button type="submit" disabled={busy || !input.trim()}
          className="bg-sage-dark text-white px-4 rounded-full font-bold disabled:opacity-40 transition-opacity">Gửi</button>
      </form>
    </section>
  );
}
