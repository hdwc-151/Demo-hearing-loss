import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "./store";
import { SCENARIOS, LEVELS } from "../data/constants";
import { degradeTokens } from "../util/phoneme";
import { noiseUrl } from "../api";
import {
  getAudioCtx,
  peekAudioCtx,
  createCochlearFilterBank,
  cutoffFromThresholds,
  computeHearingAidEQ,
} from "../util/audio";

const noiseCache = new Map();
const getCtx = getAudioCtx;

function localNoise(ctx, seconds = 3) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / (ctx.sampleRate * 0.25)));
  }
  return buf;
}

export default function Simulator() {
  const {
    scenario, setScenario, level, setLevel, lang, toggleLang,
    dialect, toggleDialect, isPlaying, setPlaying, cfg,
    thresholds, customized, hearingAidOn, toggleHearingAid,
  } = useStore();
  const LEVEL_CUTOFF = cfg.cutoff;
  const NOISE_GAIN = cfg.noiseGain;
  const nodes = useRef({});
  const session = useRef(0);
  const [loading, setLoading] = useState(false);

  const eqInfo = useMemo(() => computeHearingAidEQ(thresholds), [thresholds]);
  const activeThresholds = hearingAidOn ? eqInfo.compensatedThresholds : thresholds;
  const effectiveCutoff = customized || hearingAidOn
    ? cutoffFromThresholds(activeThresholds)
    : LEVEL_CUTOFF[level];

  const text = SCENARIOS[scenario][lang];
  const tokens = useMemo(
    () =>
      degradeTokens(
        text,
        level,
        lang,
        dialect,
        customized || hearingAidOn ? activeThresholds : null
      ),
    [text, level, lang, dialect, customized, hearingAidOn, activeThresholds]
  );
  const hiddenCount = useMemo(
    () => tokens.filter((t) => t.cls === "hide").reduce((n, t) => n + (t.t.match(/\p{L}/gu) || []).length, 0),
    [tokens]
  );
  const letterCount = useMemo(() => (text.match(/\p{L}/gu) || []).length, [text]);

  async function loadNoise(ctx) {
    const key = scenario;
    if (noiseCache.has(key)) return noiseCache.get(key);
    try {
      const ab = await fetch(noiseUrl(scenario, "Normal", 4)).then((r) => {
        if (!r.ok) throw new Error(r.status);
        return r.arrayBuffer();
      });
      const buf = await ctx.decodeAudioData(ab);
      noiseCache.set(key, buf);
      return buf;
    } catch {
      return localNoise(ctx);
    }
  }

  async function start() {
    stop();
    const sid = ++session.current;
    const ctx = getCtx();
    if (ctx.state === "suspended") await ctx.resume();
    setLoading(true);
    const buf = await loadNoise(ctx);
    setLoading(false);
    if (sid !== session.current) return;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const bank = createCochlearFilterBank(ctx, thresholds, effectiveCutoff, hearingAidOn);
    const gain = ctx.createGain();
    const baseGain = NOISE_GAIN[level] / NOISE_GAIN.Normal;
    const targetGain = hearingAidOn ? baseGain * 0.45 : baseGain;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 0.25);

    src.connect(bank.input);
    bank.output.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    nodes.current = { src, lp: bank.lp, bank, gain };

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === "vi" ? "vi-VN" : "en-US";
      const rawVol = { Severe: 0.22, Moderate: 0.48, Mild: 0.75 }[level] ?? 1.0;
      u.volume = hearingAidOn ? Math.min(1.0, rawVol + 0.35) : rawVol;
      u.rate = 0.95;
      u.onend = () => {
        if (sid === session.current) stop();
      };
      window.speechSynthesis.speak(u);
    }
    setPlaying(true);
  }

  function stop() {
    session.current++;
    const { src, gain } = nodes.current;
    if (src && gain && peekAudioCtx()) {
      const t = peekAudioCtx().currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(0, t, 0.05);
      try {
        src.stop(t + 0.25);
      } catch {}
    }
    nodes.current = {};
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setPlaying(false);
  }

  useEffect(() => {
    const { bank, gain } = nodes.current;
    if (!bank || !peekAudioCtx()) return;
    const t = peekAudioCtx().currentTime;
    bank.update(thresholds, effectiveCutoff, hearingAidOn, 0.08);
    const baseGain = NOISE_GAIN[level] / NOISE_GAIN.Normal;
    gain.gain.setTargetAtTime(hearingAidOn ? baseGain * 0.45 : baseGain, t, 0.08);
  }, [level, thresholds, effectiveCutoff, hearingAidOn, NOISE_GAIN]);

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (useStore.getState().isPlaying) {
      stop();
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, lang]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => stop(), []);

  const lvIdx = LEVELS.indexOf(level);

  return (
    <section aria-labelledby="sim-title">
      <h1 id="sim-title" className="h1">Hearing Loss Simulator</h1>

      <div className="flex flex-wrap justify-center gap-2 mb-3">
        <select
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          aria-label="Kịch bản"
          className="bg-sage-mid text-white font-bold text-xs sm:text-sm px-4 sm:px-6 py-2.5 rounded-full border-2 border-sage-dark uppercase max-w-full"
        >
          {Object.entries(SCENARIOS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button onClick={toggleLang} className="pill" aria-label="Đổi ngôn ngữ">{lang.toUpperCase()}</button>
        {lang === "vi" && (
          <button onClick={toggleDialect} className="pill" title="Giọng ảnh hưởng cách phân band d, r, gi">
            {dialect === "north" ? "Giọng Bắc" : "Giọng Nam"}
          </button>
        )}
        <button
          onClick={toggleHearingAid}
          className={`pill ${hearingAidOn ? "!bg-sage-dark !text-white" : ""}`}
          title="Mô phỏng bù tần số 3-Band Peaking EQ + Nén chống chói (DynamicsCompressor)"
        >
          🦻 {hearingAidOn ? "Trợ thính: BẬT" : "Trợ thính: TẮT"}
        </button>
      </div>

      {hearingAidOn && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-accent/25 text-xs font-semibold text-sage-dark flex flex-wrap justify-between gap-2">
          <span>Bù 3-Band EQ (0.4×Loss):</span>
          <span>EQ500: +{eqInfo.eq500} dB · EQ2k: +{eqInfo.eq2000} dB · EQ4k: +{eqInfo.eq4000} dB</span>
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <h2 className="h2">Visualization</h2>
        <span className="text-xs text-muted" aria-live="polite">
          {hiddenCount === 0 ? "Nghe đủ chữ" : `Mất ${hiddenCount}/${letterCount} chữ cái`}
          {hearingAidOn ? " (Đã bù trợ thính)" : customized ? " (Audiogram tuỳ chỉnh)" : ""}
        </span>
      </div>
      <div className="viz-box">
        {tokens.map((tk, i) =>
          tk.cls === "hide" ? (
            <span key={i} className="ch-hide" aria-hidden="true">{tk.t}</span>
          ) : tk.cls === "fade" ? (
            <span key={i} className="char-fade-sev">{tk.t}</span>
          ) : (
            <span key={i} className="ch">{tk.t}</span>
          )
        )}
      </div>

      <h2 className="h2 mt-4">Hearing Loss Level</h2>
      <div className="px-1">
        <input
          type="range"
          min="0"
          max="3"
          step="1"
          value={lvIdx}
          onChange={(e) => setLevel(LEVELS[+e.target.value])}
          className="level-range"
          aria-label="Mức suy giảm thính lực"
          aria-valuetext={level}
          style={{ "--p": `${(lvIdx / 3) * 100}%` }}
        />
        <div className="flex justify-between text-xs font-semibold mt-1">
          {LEVELS.map((lv) => (
            <button
              key={lv}
              onClick={() => setLevel(lv)}
              title={lv}
              className={`px-1 rounded transition-colors ${level === lv ? "text-sage-dark" : "text-muted"}`}
            >
              {lv}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 mt-5">
        <button
          onClick={isPlaying ? stop : start}
          disabled={loading}
          aria-label={isPlaying ? "Dừng" : "Phát mô phỏng"}
          className="play-btn"
        >
          {loading ? <span className="spinner" /> : isPlaying ? "⏸" : "▶"}
        </button>
        <p className="text-xs text-sage-mid font-semibold text-center">
          {isPlaying
            ? `Đang mô phỏng ${level} — cắt trên ${effectiveCutoff} Hz ${hearingAidOn ? "+ Bù EQ Trợ thính" : "+ nhiễu nền"}`
            : "Bấm ▶ để nghe giọng qua bộ lọc DSP + nhiễu nền. Đổi mức khi đang phát để so sánh."}
        </p>
      </div>
    </section>
  );
}
