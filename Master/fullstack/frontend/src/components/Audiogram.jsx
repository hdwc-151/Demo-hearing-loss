import { useRef, useMemo, useState } from "react";
import { useStore } from "../store";
import { getAudioCtx, computeHearingAidEQ, Staircase2Down1Up } from "../util/audio";

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

function playTone(freq, db, duration = 0.35) {
  const ctx = getAudioCtx();
  if (ctx.state === "suspended") ctx.resume();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = "sine";
  g.gain.value = db <= -10 ? 0 : Math.min(0.4, Math.pow(10, (db - 90) / 40));
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export default function Audiogram() {
  const { thresholds, audiogramMode, setMode, setThreshold, cfg, level, customized } = useStore();
  const FREQS = cfg.freqs;
  const SOUND_ITEMS = cfg.soundItems;
  const svgRef = useRef(null);
  const rafRef = useRef(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [testState, setTestState] = useState(null);

  const eqInfo = useMemo(() => computeHearingAidEQ(thresholds), [thresholds]);

  const onDrag = (idx) => (e) => {
    e.preventDefault();
    setDragIdx(idx);
    const svg = svgRef.current;
    const toDb = (clientY) => {
      const pt = svg.createSVGPoint();
      pt.x = 0;
      pt.y = clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return yToDb(p.y);
    };
    let lastY = e.clientY;
    const move = (ev) => {
      lastY = ev.clientY;
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setThreshold(idx, toDb(lastY));
      });
    };
    const up = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setDragIdx(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const onKey = (idx) => (e) => {
    const step = { ArrowUp: -5, ArrowDown: 5, PageUp: -20, PageDown: 20 }[e.key];
    if (step !== undefined) {
      e.preventDefault();
      setThreshold(idx, thresholds[idx] + step);
    }
  };

  function play2AFCTrial(freqIdx, sc) {
    const correctInterval = Math.random() < 0.5 ? 1 : 2;
    const hz = FREQS[freqIdx];
    const lvl = sc.levelDb;
    setTestState({ freqIdx, sc, correctInterval, status: "playing" });
    if (correctInterval === 1) playTone(hz, lvl, 0.4);
    setTimeout(() => {
      if (correctInterval === 2) playTone(hz, lvl, 0.4);
      setTimeout(() => {
        setTestState((prev) => (prev ? { ...prev, status: "awaiting" } : null));
      }, 420);
    }, 600);
  }

  function start2AFCTest() {
    const sc = new Staircase2Down1Up(35);
    play2AFCTrial(0, sc);
  }

  function answer2AFC(choice) {
    if (!testState || testState.status !== "awaiting") return;
    const { freqIdx, sc, correctInterval } = testState;
    sc.update(choice === correctInterval);
    if (sc.done(3)) {
      const thr = sc.threshold();
      setThreshold(freqIdx, thr);
      if (freqIdx + 1 < FREQS.length) {
        const nextSc = new Staircase2Down1Up(thr);
        play2AFCTrial(freqIdx + 1, nextSc);
      } else {
        setTestState(null);
      }
    } else {
      play2AFCTrial(freqIdx, sc);
    }
  }

  const points = FREQS.map((f, i) => `${freqToX(f)},${dbToY(thresholds[i])}`).join(" ");
  const area = `${freqToX(FREQS[0])},${dbToY(110)} ${points} ${freqToX(FREQS[FREQS.length - 1])},${dbToY(110)}`;

  const items = useMemo(
    () =>
      SOUND_ITEMS.map((it) => {
        const th = userThresholdAt(it.freq, thresholds, FREQS);
        return { ...it, th, audible: it.db >= th };
      }),
    [SOUND_ITEMS, thresholds, FREQS]
  );
  const audibleCount = items.filter((i) => i.audible).length;

  return (
    <section aria-labelledby="ag-title">
      <h1 id="ag-title" className="h1">Interactive Audiogram</h1>

      <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
        <div role="tablist" className="flex w-52 rounded-full bg-bgcard p-1 border border-sage-light">
          {["PLOTS", "SOUNDS"].map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={audiogramMode === m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-colors ${
                audiogramMode === m ? "bg-sage-dark text-white" : "text-sage-mid hover:text-sage-dark"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          onClick={testState ? () => setTestState(null) : start2AFCTest}
          className="pill"
          title="Đo sàng lọc thích ứng 2AFC Staircase (2-Down-1-Up)"
        >
          {testState ? "⏹ Dừng đo 2AFC" : "🎧 Đo 2AFC (A/B)"}
        </button>
      </div>

      {testState && (
        <div className="mb-3 p-3 rounded-2xl bg-bgcard border border-sage-mid text-xs flex items-center justify-between gap-2">
          <div>
            <b>Đo 2AFC [{testState.freqIdx + 1}/{FREQS.length}]: {FREQS[testState.freqIdx]} Hz</b> ({testState.sc.levelDb} dB) —{" "}
            {testState.status === "playing" ? "Đang phát khoảng A rồi B…" : "Âm thanh kêu ở khoảng nào?"}
          </div>
          <div className="flex gap-1.5">
            <button disabled={testState.status !== "awaiting"} onClick={() => answer2AFC(1)} className="pill">Khoảng A</button>
            <button disabled={testState.status !== "awaiting"} onClick={() => answer2AFC(2)} className="pill">Khoảng B</button>
          </div>
        </div>
      )}

      <p className="text-center text-xs mb-2 text-muted">
        <b className="text-ink">Mức: {customized ? "Tuỳ chỉnh" : level}</b> (PTA-4: <b>{eqInfo.pta4} dB HL</b>) — kéo điểm cam (hoặc chọn rồi dùng ↑/↓) để đổi ngưỡng nghe
      </p>

      <div className="rounded-2xl bg-bgcard border border-sage-light p-2 sm:p-3">
        <div className="relative w-full select-none" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="absolute inset-0 w-full h-full overflow-visible"
            role="img"
            aria-label={`Biểu đồ thính lực. ${FREQS.map((f, i) => `${f} Hz: ${thresholds[i]} dB`).join(", ")}`}
          >
            <polygon points={area} fill="#9BE564" opacity="0.10" />
            {Array.from({ length: 12 }, (_, k) => k * 10).map((db) => (
              <g key={db}>
                <line x1="15" y1={dbToY(db)} x2="440" y2={dbToY(db)} stroke="#DCE8D5" strokeWidth="1" />
                {db % 20 === 0 && (
                  <text x="13" y={dbToY(db) + 3} fontSize="9" fill="#6C786A" fontWeight="600" textAnchor="end">
                    {db}
                  </text>
                )}
              </g>
            ))}
            {FREQS.map((f) => (
              <g key={f}>
                <line x1={freqToX(f)} y1="15" x2={freqToX(f)} y2="310" stroke="#DCE8D5" strokeWidth="1" />
                <text x={freqToX(f)} y="8" fontSize="10" textAnchor="middle" fill="#6C786A" fontWeight="700">
                  {f >= 1000 ? `${f / 1000}k` : f}
                </text>
              </g>
            ))}
            <polyline points={points} fill="none" stroke="#C87A51" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {FREQS.map((f, i) => (
              <g
                key={f}
                className="ag-node"
                tabIndex={0}
                role="slider"
                aria-label={`Ngưỡng tại ${f} Hz`}
                aria-valuemin={-10}
                aria-valuemax={110}
                aria-valuenow={thresholds[i]}
                onPointerDown={onDrag(i)}
                onKeyDown={onKey(i)}
                style={{ cursor: "ns-resize", touchAction: "none" }}
              >
                <circle cx={freqToX(f)} cy={dbToY(thresholds[i])} r="18" fill="transparent" />
                <circle
                  cx={freqToX(f)}
                  cy={dbToY(thresholds[i])}
                  r={dragIdx === i ? 10 : 8}
                  fill="#FAFBF8"
                  stroke="#C87A51"
                  strokeWidth="3"
                  className="ag-dot"
                />
                {thresholds[i] >= 105 && (
                  <text x={freqToX(f)} y={dbToY(thresholds[i]) + 18} fontSize="11" fontWeight="800" fill="#C87A51" textAnchor="middle">
                    ↓NR
                  </text>
                )}
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
                <button
                  key={it.id}
                  type="button"
                  className={`sound-item ${it.audible ? "" : "inaudible"}`}
                  aria-label={`${it.label}: ${it.audible ? "nghe được" : "không nghe được"} (ngưỡng ${Math.round(it.th)} dB)`}
                  title={`${it.label} | Ngưỡng của bạn: ${Math.round(it.th)}dB → ${it.audible ? "NGHE ĐƯỢC" : "ĐÃ XÁM HOÁ"}`}
                  onClick={() => it.audible && playTone(it.freq, it.db)}
                  style={{ left: `${(freqToX(it.freq) / VB_W) * 100}%`, top: `${(dbToY(it.db) / VB_H) * 100}%` }}
                >
                  {it.emoji ? <span className="sound-emoji">{it.emoji}</span> : <span className="sound-text">{it.text}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
        <div className="bg-bgcard p-2.5 rounded-xl text-center font-semibold">
          Bù trợ thính đề xuất (0.4×Loss)<br />
          <span className="text-sage-dark">
            500Hz: +{eqInfo.eq500}dB · 2k: +{eqInfo.eq2000}dB · 4k: +{eqInfo.eq4000}dB
          </span>
        </div>
        <div className="bg-bgcard p-2.5 rounded-xl text-center font-semibold" aria-live="polite">
          Trạng thái âm thanh<br />
          <span className="text-sage-dark">Nghe rõ: {audibleCount}/{SOUND_ITEMS.length} nhóm</span>
        </div>
      </div>
    </section>
  );
}
