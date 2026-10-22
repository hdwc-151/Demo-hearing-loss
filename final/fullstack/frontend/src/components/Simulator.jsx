import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { SCENARIOS, LEVELS } from "../data/constants";
import { degradeTokens } from "../util/phoneme";
import { noiseUrl } from "../api";
import { getAudioCtx, peekAudioCtx } from "../util/audio";

// Cache AudioBuffer nhiễu theo kịch bản (sống qua các lần mở/đóng tab)
const noiseCache = new Map();
const getCtx = getAudioCtx;

// Nhiễu nền tạo tại chỗ khi backend offline (để nút ▶ luôn có tác dụng)
function localNoise(ctx, seconds = 3) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / (ctx.sampleRate * 0.25)));
  return buf;
}

export default function Simulator() {
  const { scenario, setScenario, level, setLevel, lang, toggleLang, dialect, toggleDialect, isPlaying, setPlaying, cfg } = useStore();
  const LEVEL_CUTOFF = cfg.cutoff;
  const NOISE_GAIN = cfg.noiseGain;
  const nodes = useRef({});           // { src, lp, gain }
  const session = useRef(0);             // tăng mỗi lần dừng/bắt đầu để vô hiệu hoá phiên cũ
  const [loading, setLoading] = useState(false);

  const text = SCENARIOS[scenario][lang];
  const tokens = useMemo(() => degradeTokens(text, level, lang, dialect), [text, level, lang, dialect]);
  const hiddenCount = useMemo(() => tokens.filter((t) => t.cls === "hide").reduce((n, t) => n + t.t.trim().length, 0), [tokens]);
  const letterCount = useMemo(() => (text.match(/\p{L}/gu) || []).length, [text]);

  async function loadNoise(ctx) {
    // Lấy nhiễu ở mức "Normal" (dải đầy đủ) rồi lọc/khuếch đại phía client
    // -> đổi cấp độ khi đang phát chỉ cần trượt tham số, không tải lại.
    const key = scenario;
    if (noiseCache.has(key)) return noiseCache.get(key);
    try {
      const ab = await fetch(noiseUrl(scenario, "Normal", 4)).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); });
      const buf = await ctx.decodeAudioData(ab);
      noiseCache.set(key, buf);
      return buf;
    } catch {
      return localNoise(ctx);
    }
  }

  async function start() {
    stop();                                           // dừng phiên cũ trước (không bao giờ có 2 nguồn phát)
    const sid = ++session.current;                    // phiên mới; callback/tải của phiên cũ sẽ bị bỏ qua
    const ctx = getCtx();
    if (ctx.state === "suspended") await ctx.resume();
    setLoading(true);
    const buf = await loadNoise(ctx);
    setLoading(false);
    if (sid !== session.current) return;             // người dùng đã dừng/đổi trong lúc tải nhiễu

    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = LEVEL_CUTOFF[level];
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);                       // fade-in tránh tiếng bụp
    gain.gain.linearRampToValueAtTime(NOISE_GAIN[level] / NOISE_GAIN.Normal, ctx.currentTime + 0.25);
    src.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
    src.start();
    nodes.current = { src, lp, gain };

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === "vi" ? "vi-VN" : "en-US";
      u.volume = { Severe: 0.22, Moderate: 0.48, Mild: 0.75 }[level] ?? 1.0;
      u.rate = 0.95;
      // onend của phiên cũ (kể cả khi bị cancel) KHÔNG được dừng phiên mới
      u.onend = () => { if (sid === session.current) stop(); };
      window.speechSynthesis.speak(u);
    }
    setPlaying(true);
  }

  function stop() {
    session.current++;                                // vô hiệu hoá mọi callback/tải đang chờ
    const { src, gain } = nodes.current;
    if (src && gain && peekAudioCtx()) {
      const t = peekAudioCtx().currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(0, t, 0.05);                            // fade-out
      try { src.stop(t + 0.25); } catch {}
    }
    nodes.current = {};
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setPlaying(false);
  }

  // Đổi cấp độ khi đang phát: trượt cutoff + gain mượt (~0.1s)
  useEffect(() => {
    const { lp, gain } = nodes.current;
    if (!lp || !peekAudioCtx()) return;
    const t = peekAudioCtx().currentTime;
    lp.frequency.setTargetAtTime(LEVEL_CUTOFF[level], t, 0.08);
    gain.gain.setTargetAtTime(NOISE_GAIN[level] / NOISE_GAIN.Normal, t, 0.08);
  }, [level, LEVEL_CUTOFF, NOISE_GAIN]);

  // Đổi kịch bản/ngôn ngữ khi đang phát -> phát lại đoạn mới
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    if (useStore.getState().isPlaying) { stop(); start(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, lang]);

  // Rời tab -> dừng âm thanh
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => stop(), []);

  const lvIdx = LEVELS.indexOf(level);

  return (
    <section aria-labelledby="sim-title">
      <h1 id="sim-title" className="h1">Hearing Loss Simulator</h1>

      <div className="flex flex-wrap justify-center gap-2 mb-3">
        <select value={scenario} onChange={(e) => setScenario(e.target.value)} aria-label="Kịch bản"
          className="bg-sage-mid text-white font-bold text-xs sm:text-sm px-4 sm:px-6 py-2.5 rounded-full border-2 border-sage-dark uppercase max-w-full">
          {Object.entries(SCENARIOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={toggleLang} className="pill" aria-label="Đổi ngôn ngữ">{lang.toUpperCase()}</button>
        {lang === "vi" && (
          <button onClick={toggleDialect} className="pill" title="Giọng ảnh hưởng cách phân band d, r, gi">
            {dialect === "north" ? "Giọng Bắc" : "Giọng Nam"}
          </button>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <h2 className="h2">Visualization</h2>
        <span className="text-xs text-muted" aria-live="polite">
          {level === "Normal" ? "Nghe đủ chữ" : `Mất ${hiddenCount}/${letterCount} chữ cái`}
        </span>
      </div>
      <div className="viz-box">
        {tokens.map((tk, i) =>
          tk.cls === "hide" ? <span key={i} className="ch-hide" aria-hidden="true">{tk.t}</span>
          : tk.cls === "fade" ? <span key={i} className="char-fade-sev">{tk.t}</span>
          : <span key={i} className="ch">{tk.t}</span>
        )}
      </div>

      <h2 className="h2 mt-4">Hearing Loss Level</h2>
      {/* Thanh trượt gốc (range) -> kéo được, bấm được, dùng phím ←/→ */}
      <div className="px-1">
        <input type="range" min="0" max="3" step="1" value={lvIdx}
          onChange={(e) => setLevel(LEVELS[+e.target.value])}
          className="level-range" aria-label="Mức suy giảm thính lực"
          aria-valuetext={level} style={{ "--p": `${(lvIdx / 3) * 100}%` }} />
        <div className="flex justify-between text-xs font-semibold mt-1">
          {LEVELS.map((lv) => (
            <button key={lv} onClick={() => setLevel(lv)} title={lv}
              className={`px-1 rounded transition-colors ${level === lv ? "text-sage-dark" : "text-muted"}`}>{lv}</button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 mt-5">
        <button onClick={isPlaying ? stop : start} disabled={loading}
          aria-label={isPlaying ? "Dừng" : "Phát mô phỏng"}
          className="play-btn">
          {loading ? <span className="spinner" /> : isPlaying ? "⏸" : "▶"}
        </button>
        <p className="text-xs text-sage-mid font-semibold text-center">
          {isPlaying ? `Đang mô phỏng ${level} — cắt trên ${LEVEL_CUTOFF[level]} Hz + nhiễu nền` : "Bấm ▶ để nghe giọng qua bộ lọc DSP + nhiễu nền. Đổi mức khi đang phát để so sánh."}
        </p>
      </div>
    </section>
  );
}
