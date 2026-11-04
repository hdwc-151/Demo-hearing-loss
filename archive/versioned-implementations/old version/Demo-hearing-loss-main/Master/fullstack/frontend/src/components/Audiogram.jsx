import { useRef, useMemo, useState } from "react";
import { useStore } from "../store";
import { getAudioCtx } from "../util/audio";

// --- toạ độ trong viewBox 460x330 (giữ nguyên prototype) ---
const VB_W = 460, VB_H = 330;
const freqToX = (f) => ((Math.log2(f) - Math.log2(200)) / (Math.log2(9000) - Math.log2(200))) * 410 + 20;
const dbToY = (db) => ((db + 10) / 120) * 285 + 20;
const yToDb = (y) => Math.max(-10, Math.min(110, Math.round((((y - 20) / 285) * 120 - 10) / 5) * 5));

function userThresholdAt(freq, th, FREQS) {
  if (freq <= FREQS[0]) return th[0];
  if (freq >= FREQS[FREQS.length - 1]) return th[FREQS.length - 1];
  for (let i = 0; i < FREQS.length - 1; i++) {
    if (freq >= FREQS[i] && freq <= FREQS[i + 1]) {
      const t = (Math.log2(freq) - Math.log2(FREQS[i])) / (Math.log2(FREQS[i + 1]) - Math.log2(FREQS[i]));
      return th[i] + t * (th[i + 1] - th[i]);
    }
  }
  return 20;
}

function playTone(freq, db) {
  const ctx = getAudioCtx();                         // dùng chung context với Simulator
  if (ctx.state === "suspended") ctx.resume();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = "sine";
  g.gain.value = Math.min(0.4, Math.pow(10, (db - 90) / 40));
  osc.connect(g); g.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.35);
}

export default function Audiogram() {
  const { thresholds, audiogramMode, setMode, setThreshold, cfg, level, customized } = useStore();
  const FREQS = cfg.freqs;
  const SOUND_ITEMS = cfg.soundItems;
  const svgRef = useRef(null);
  const rafRef = useRef(null);
  const [dragIdx, setDragIdx] = useState(null);

  // Kéo: pointer events (chuột + cảm ứng + bút) + rAF throttle (HF-1).
  // Dùng getScreenCTM để đổi toạ độ màn hình -> viewBox: đúng ở mọi mức zoom/scale.
  const onDrag = (idx) => (e) => {
    e.preventDefault();
    setDragIdx(idx);
    const svg = svgRef.current;
    const toDb = (clientY) => {
      const pt = svg.createSVGPoint();
      pt.x = 0; pt.y = clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return yToDb(p.y);
    };
    let lastY = e.clientY;
    const move = (ev) => {
      lastY = ev.clientY;
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => { rafRef.current = null; setThreshold(idx, toDb(lastY)); });
    };
    const up = () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      setDragIdx(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  // Bàn phím: ↑/↓ 5 dB, PageUp/PageDown 20 dB (truy cập cho người không dùng chuột)
  const onKey = (idx) => (e) => {
    const step = { ArrowUp: -5, ArrowDown: 5, PageUp: -20, PageDown: 20 }[e.key];
    if (step !== undefined) { e.preventDefault(); setThreshold(idx, thresholds[idx] + step); }
  };

  const points = FREQS.map((f, i) => `${freqToX(f)},${dbToY(thresholds[i])}`).join(" ");
  // vùng dưới đường ngưỡng (nghe được) tô nhạt để đọc biểu đồ nhanh hơn
  const area = `${freqToX(FREQS[0])},${dbToY(110)} ${points} ${freqToX(FREQS[FREQS.length - 1])},${dbToY(110)}`;

  const items = useMemo(
    () => SOUND_ITEMS.map((it) => {
      const th = userThresholdAt(it.freq, thresholds, FREQS);
      return { ...it, th, audible: it.db >= th };
    }),
    [SOUND_ITEMS, thresholds, FREQS]
  );
  const audibleCount = items.filter((i) => i.audible).length;

  return (
    <section aria-labelledby="ag-title">
      <h1 id="ag-title" className="h1">Interactive Audiogram</h1>

      <div role="tablist" className="flex w-60 max-w-full mx-auto mb-3 rounded-full bg-bgcard p-1 border border-sage-light">
        {["PLOTS", "SOUNDS"].map((m) => (
          <button key={m} role="tab" aria-selected={audiogramMode === m} onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-full text-sm font-bold transition-colors ${audiogramMode === m ? "bg-sage-dark text-white" : "text-sage-mid hover:text-sage-dark"}`}>
            {m}
          </button>
        ))}
      </div>

      <p className="text-center text-xs mb-2 text-muted">
        <b className="text-ink">Mức: {customized ? "Tuỳ chỉnh" : level}</b> — kéo điểm cam (hoặc chọn rồi dùng ↑/↓) để đổi ngưỡng nghe
      </p>

      {/* Khung vẽ: aspect-ratio = viewBox -> svg & overlay luôn trùng khít khi zoom/resize */}
      <div className="rounded-2xl bg-bgcard border border-sage-light p-2 sm:p-3">
        <div className="relative w-full select-none" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
          <svg ref={svgRef} viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 w-full h-full overflow-visible"
               role="img" aria-label={`Biểu đồ thính lực. ${FREQS.map((f, i) => `${f} Hz: ${thresholds[i]} dB`).join(", ")}`}>
            <polygon points={area} fill="#9BE564" opacity="0.10" />
            {Array.from({ length: 12 }, (_, k) => k * 10).map((db) => (
              <g key={db}>
                <line x1="15" y1={dbToY(db)} x2="440" y2={dbToY(db)} stroke="#DCE8D5" strokeWidth="1" />
                {db % 20 === 0 && <text x="13" y={dbToY(db) + 3} fontSize="9" fill="#6C786A" fontWeight="600" textAnchor="end">{db}</text>}
              </g>
            ))}
            {FREQS.map((f) => (
              <g key={f}>
                <line x1={freqToX(f)} y1="15" x2={freqToX(f)} y2="310" stroke="#DCE8D5" strokeWidth="1" />
                <text x={freqToX(f)} y="8" fontSize="10" textAnchor="middle" fill="#6C786A" fontWeight="700">{f >= 1000 ? `${f / 1000}k` : f}</text>
              </g>
            ))}
            <polyline points={points} fill="none" stroke="#C87A51" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {FREQS.map((f, i) => (
              <g key={f} className="ag-node" tabIndex={0} role="slider"
                 aria-label={`Ngưỡng tại ${f} Hz`} aria-valuemin={-10} aria-valuemax={110} aria-valuenow={thresholds[i]}
                 onPointerDown={onDrag(i)} onKeyDown={onKey(i)} style={{ cursor: "ns-resize", touchAction: "none" }}>
                {/* vùng chạm lớn (vô hình) cho ngón tay */}
                <circle cx={freqToX(f)} cy={dbToY(thresholds[i])} r="18" fill="transparent" />
                <circle cx={freqToX(f)} cy={dbToY(thresholds[i])} r={dragIdx === i ? 10 : 8}
                  fill="#FAFBF8" stroke="#C87A51" strokeWidth="3" className="ag-dot" />
                {(audiogramMode === "PLOTS" || dragIdx === i) && (
                  <text x={freqToX(f)} y={dbToY(thresholds[i]) - 14} fontSize="11" fontWeight="800" fill="#4B5E48" textAnchor="middle">
                    {thresholds[i]} dB
                  </text>
                )}
              </g>
            ))}
          </svg>

          {audiogramMode === "SOUNDS" && (
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
              {items.map((it) => (
                <button key={it.id} type="button"
                  className={`sound-item ${it.audible ? "" : "inaudible"}`}
                  aria-label={`${it.label}: ${it.audible ? "nghe được" : "không nghe được"} (ngưỡng ${Math.round(it.th)} dB)`}
                  title={`${it.label} | Ngưỡng của bạn: ${Math.round(it.th)}dB → ${it.audible ? "NGHE ĐƯỢC" : "ĐÃ XÁM HOÁ"}`}
                  onClick={() => it.audible && playTone(it.freq, it.db)}
                  style={{ left: `${(freqToX(it.freq) / VB_W) * 100}%`, top: `${(dbToY(it.db) / VB_H) * 100}%` }}>
                  {it.emoji
                    ? <span className="sound-emoji">{it.emoji}</span>
                    : <span className="sound-text">{it.text}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
        <div className="bg-bgcard p-2.5 rounded-xl text-center font-semibold">
          Air Conduction<br /><span className="text-blue-600">○ Trái</span> <span className="text-line">✕ Phải</span>
        </div>
        <div className="bg-bgcard p-2.5 rounded-xl text-center font-semibold" aria-live="polite">
          Trạng thái âm thanh<br />
          <span className="text-sage-dark">Nghe rõ: {audibleCount}/{SOUND_ITEMS.length} nhóm</span>
        </div>
      </div>
    </section>
  );
}
