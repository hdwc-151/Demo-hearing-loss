import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { askDrBunny } from "../api";
import { answerFromEvidence } from "../data/medicalEvidence.js";
import BunnyAvatar from "./BunnyAvatar";
import { selectBunnyEmotion, stripDecorativeEmoji } from "../util/bunnyPersona.js";

const PILLS = [
  { key: "analyze", label: "Phân tích audiogram", q: "Phân tích biểu đồ thính lực hiện tại của tôi" },
  { key: "letters", label: "Hiểu lời nói", q: "Tại sao chữ cái và phụ âm biến mất khi nghe kém?" },
  { key: "noisy", label: "Nghe trong tiếng ồn", q: "Tại sao ở siêu thị tôi nghe tiếng nhưng không rõ chữ?" },
  { key: "family", label: "Giao tiếp gia đình", q: "Người nhà nên giao tiếp thế nào cho dễ nghe?" },
  { key: "care", label: "Khi nào đi khám?", q: "Tôi có nên đi khám bác sĩ không?" },
];

const NODE_LABEL = {
  HIGH_FREQ_LOSS: "Tần số cao", LOW_MID_FREQ_LOSS: "Trầm-trung", NOISY_ENVIRONMENT: "Môi trường ồn",
  FAMILY_COMMUNICATION: "Giao tiếp gia đình", LOUDNESS_RECRUITMENT: "Chói tai", SEEK_CARE: "Đi khám",
};

export default function Chat() {
  // `chat` + `addChat` nằm trong store: đổi tab (Chat bị tạo lại) không làm mất hội thoại,
  // và câu trả lời tới muộn vẫn được lưu dù người dùng đã rời tab.
  const { thresholds, cfg, chat, addChat } = useStore();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  // tự cuộn xuống tin mới, mượt
  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chat, busy]);

  async function send(q) {
    if (!q.trim() || busy) return;
    const audiogramDb = Object.fromEntries(cfg.freqs.map((f, i) => [String(f), thresholds[i]]));
    addChat({ role: "user", text: q });
    setInput("");
    setBusy(true);
    let res;
    try {
      res = answerFromEvidence(q, { profileSource: "simulated" }) || await askDrBunny(audiogramDb, q);
    } catch {
      res = { answer: "Hiện không thể trả lời câu này. Bạn có thể thử lại hoặc tham khảo chuyên gia thính học.", mode: "unavailable", emotion: "careful" };
    }
    addChat({ role: "bot", text: stripDecorativeEmoji(res.answer), mode: res.mode, nodes: res.nodes || [], sources: res.sources || [], emotion: res.emotion, risk: res.risk });
    setBusy(false);
  }

  return (
    <section aria-labelledby="chat-title" className="flex flex-col">
      <div className="flex items-center gap-3 mb-3"><BunnyAvatar emotion="welcome" size={50} /><div><h1 id="chat-title" className="h1 !mb-0">Dr. Bunny</h1><p className="text-xs text-muted">Trợ lý kiến thức trong HearAtlas · Không thay bác sĩ</p></div></div>

      <div ref={boxRef} className="chat-box" role="log" aria-live="polite">
        {chat.map((m, i) => (
          <div key={i} className={`msg ${m.role === "bot" ? "msg-bot" : "msg-user"}`}>
            {m.role === "bot" && <span className="block mb-2"><BunnyAvatar emotion={selectBunnyEmotion(m)} size={30} /></span>}
            {stripDecorativeEmoji(m.text)}
            {m.sources?.length > 0 && <div className="mt-2 text-xs" aria-label="Nguồn tham khảo"><strong>Nguồn tham khảo:</strong><ul className="list-disc ml-4">{m.sources.map(s => <li key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer" className="underline text-sage-dark">{s.publisher} — {s.title}</a></li>)}</ul></div>}
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
          placeholder="Hỏi Dr. Bunny…" maxLength={500}
          className="flex-1 min-w-0 px-3.5 py-2.5 rounded-full border border-sage-light bg-white outline-none focus:border-sage-mid" />
        <button type="submit" disabled={busy || !input.trim()}
          className="bg-sage-dark text-white px-4 rounded-full font-bold disabled:opacity-40 transition-opacity">Gửi</button>
      </form>
    </section>
  );
}
