import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { onBackground } from "../native";
import { getAudioCtx } from "../util/audio";
import { attenuationDbAt, processHearingLoss } from "../util/hearingLoss";
import { analyzeAudio } from "../util/audioFeatures";

const LIMIT_BYTES = 12 * 1024 * 1024;
const PLAYBACK_GAIN = 0.5; // digital attenuation; NOT a physical SPL limit

function validateAudio(a) {
  if (!a || !Number.isFinite(a.duration) || a.duration <= 0 || a.duration > 8 ||
      a.numberOfChannels < 1 || a.numberOfChannels > 2 || a.sampleRate < 8000 ||
      a.sampleRate > 192000) throw new Error("Audio: tối đa 8 giây, mono/stereo, 8–192 kHz.");
}
function sampleAudio(ctx) {
  const n = Math.round(ctx.sampleRate * 2), rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, n, rate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const t = i / rate, fade = Math.max(0, Math.min(1, t / 0.04, (n - i - 1) / (rate * 0.04)));
    data[i] = fade * (0.16 * Math.sin(2 * Math.PI * 500 * t) +
      0.13 * Math.sin(2 * Math.PI * 1500 * t) + 0.1 * Math.sin(2 * Math.PI * 4000 * t));
  }
  return buf;
}

export default function AudioLab() {
  const thresholds = useStore((s) => s.thresholds);
  const freqs = useStore((s) => s.cfg.freqs);
  const [input, setInput] = useState(null);
  const [name, setName] = useState("Tín hiệu mẫu: 500 / 1500 / 4000 Hz");
  const [status, setStatus] = useState("Sẵn sàng");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const current = useRef(null), token = useRef(0), cache = useRef(null);

  const curve = useMemo(() => Array.from({ length: 61 }, (_, i) => {
    const hz = 250 * (8000 / 250) ** (i / 60);
    return String(i * 5) + "," + String(attenuationDbAt(hz, freqs, thresholds) * 70 / 32);
  }).join(" "), [freqs, thresholds]);

  useEffect(() => setMetrics(null), [thresholds, freqs, input]);

  function stop() {
    ++token.current;
    const old = current.current;
    current.current = null;
    if (old) {
      try { old.src.stop(); } catch { /* ended */ }
      try { old.src.disconnect(); old.gain.disconnect(); } catch { /* closed */ }
    }
    setBusy(false);
    setStatus("Đã dừng");
  }

  useEffect(() => {
    const unsubscribe = onBackground(stop);
    return () => {
      ++token.current;
      try { current.current?.src?.stop(); } catch { /* ended */ }
      current.current = null;
      unsubscribe();
    };
  }, []);

  async function loadFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    stop(); setError("");
    const request = token.current;
    try {
      if (!file.size || file.size > LIMIT_BYTES) throw new Error("File rỗng hoặc lớn hơn 12 MB.");
      const buffer = await getAudioCtx().decodeAudioData(await file.arrayBuffer());
      validateAudio(buffer);
      if (request !== token.current) return;
      setInput(buffer);
      cache.current = null;
      setName(file.name);
      setStatus("Đã giải mã tại thiết bị; không gửi file lên máy chủ");
    } catch (e) {
      if (request === token.current) setError("Không đọc được file: " + e.message);
    } finally {
      event.target.value = "";
    }
  }

  function resetSample() {
    stop();
    setInput(sampleAudio(getAudioCtx()));
    cache.current = null;
    setName("Tín hiệu mẫu: 500 / 1500 / 4000 Hz");
    setError("");
    setStatus("Đã tạo tín hiệu kiểm thử ngay trên thiết bị");
  }

  async function play(filtered) {
    stop(); setBusy(true); setError("");
    const request = token.current;
    try {
      const ctx = getAudioCtx();
      if (ctx.state === "suspended") await ctx.resume();
      const original = input || sampleAudio(ctx);
      validateAudio(original);
      let buffer = original;
      if (filtered) {
        const key = String(original.sampleRate) + "|" + freqs.join(",") + "|" + thresholds.join(",");
        if (cache.current?.input === original && cache.current?.key === key) {
          buffer = cache.current.output;
        } else {
          buffer = ctx.createBuffer(original.numberOfChannels, original.length, original.sampleRate);
          for (let c = 0; c < original.numberOfChannels; c++) {
            buffer.copyToChannel(processHearingLoss(original.getChannelData(c), original.sampleRate, freqs, thresholds), c);
          }
          cache.current = { input: original, key, output: buffer };
        }
      }
      if (request !== token.current) return;
      if (filtered) setMetrics({ original: analyzeAudio(original.getChannelData(0), original.sampleRate),
        output: analyzeAudio(buffer.getChannelData(0), buffer.sampleRate) });
      const src = ctx.createBufferSource(), gain = ctx.createGain();
      src.buffer = buffer;
      gain.gain.value = PLAYBACK_GAIN;
      src.connect(gain); gain.connect(ctx.destination);
      src.onended = () => {
        if (request === token.current) {
          current.current = null;
          setBusy(false);
          setStatus("Đã phát xong");
        }
        try { src.disconnect(); gain.disconnect(); } catch { /* closed */ }
      };
      current.current = { src, gain };
      src.start();
      setStatus(filtered ? "Đang phát: mô phỏng suy giảm theo audiogram" : "Đang phát: tín hiệu gốc");
    } catch (e) {
      if (request === token.current) setError("Không phát được: " + e.message);
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="audio-lab-title" className="space-y-4">
      <h1 id="audio-lab-title" className="h1">Audio Lab</h1>
      <p className="text-sm text-muted">So sánh A/B trên tín hiệu thật. Bộ lọc phụ thuộc trực tiếp vào audiogram 6 tần số và chạy offline trong trình duyệt.</p>
      <div className="rounded-2xl bg-bgcard p-4 border border-sage-light space-y-3">
        <p className="text-sm font-semibold">Nguồn: {name}</p>
        <label htmlFor="lab-file" className="block text-sm font-semibold">Tải audio lên từ thiết bị (tối đa 8 giây, 12 MB)</label>
        <input id="lab-file" aria-label="Nạp file âm thanh" type="file" accept="audio/*,.wav,.mp3,.ogg,.m4a" onChange={loadFile} className="w-full text-xs" />
        <button type="button" className="btn-ghost" onClick={resetSample}>Dùng tín hiệu kiểm thử 3 tần số</button>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-primary" disabled={busy} onClick={() => play(false)} aria-label="Phát âm thanh gốc">A · Nghe gốc</button>
          <button className="btn-primary" disabled={busy} onClick={() => play(true)} aria-label="Phát mô phỏng theo audiogram">B · Nghe mô phỏng</button>
        </div>
        <button className="btn-ghost w-full" onClick={stop} aria-label="Dừng Audio Lab">■ Dừng</button>
        <p className="text-xs text-muted" role="status">{status}</p>
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      </div>
      <div className="rounded-2xl bg-bgcard border border-sage-light p-4">
        <h2 className="h2">Đáp ứng suy giảm minh hoạ</h2>
        <svg className="w-full h-auto" viewBox="-35 -15 350 115" role="img" aria-label="Đường suy giảm theo tần số, 0 đến 32 dB">
          {[0, 16, 32].map((d) => <g key={d}>
            <line x1="0" y1={d * 70 / 32} x2="300" y2={d * 70 / 32} stroke="#C8D6C0"/>
            <text x="-6" y={d * 70 / 32 + 3} textAnchor="end" fontSize="10" fill="#59685B">{d}</text>
          </g>)}
          <polyline points={curve} fill="none" stroke="#C87A51" strokeWidth="3"/>
          <text x="0" y="87" fontSize="10" fill="#59685B">250 Hz</text>
          <text x="300" y="87" fontSize="10" fill="#59685B" textAnchor="end">8 kHz</text>
          <text x="150" y="102" fontSize="10" fill="#59685B" textAnchor="middle">Suy giảm số (dB), không phải dB HL</text>
        </svg>
        <p className="text-xs text-muted">Đổi ngưỡng ở tab Audiogram rồi quay lại Audio Lab. Chọn Moderate/Severe để quan sát sự khác biệt. Đây là mô hình tuyến tính, không phải Gammachirp.</p>
      </div>
      {metrics && (
        <div className="rounded-2xl bg-bgcard border border-sage-light p-4" role="region" aria-label="Đặc trưng tín hiệu">
          <h2 className="h2">Phân tích tín hiệu A/B</h2>
          <p className="text-xs text-muted">Đo trên kênh audio thứ nhất sau lần phát B gần nhất; không phải phép đo thính lực.</p>
          <table className="w-full text-xs sm:text-sm mt-2">
            <thead><tr><th scope="col" className="text-left">Đặc trưng</th><th scope="col">Gốc</th><th scope="col">Mô phỏng</th></tr></thead>
            <tbody>
              <tr><th scope="row" className="text-left">RMS số</th><td className="text-center">{metrics.original.rms.toFixed(3)}</td><td className="text-center">{metrics.output.rms.toFixed(3)}</td></tr>
              <tr><th scope="row" className="text-left">Trọng tâm phổ</th><td className="text-center">{Math.round(metrics.original.centroidHz)} Hz</td><td className="text-center">{Math.round(metrics.output.centroidHz)} Hz</td></tr>
              <tr><th scope="row" className="text-left">Năng lượng ≥4 kHz</th><td className="text-center">{metrics.original.highPercent.toFixed(1)}%</td><td className="text-center">{metrics.output.highPercent.toFixed(1)}%</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-muted">RMS: biên độ hiệu dụng trong miền số. Trọng tâm phổ: trung bình tần số có trọng số năng lượng. Không suy diễn thành mức nghe dB HL hoặc dB SPL.</p>
        </div>
      )}
      <p className="text-xs text-muted">Công cụ giáo dục, chưa hiệu chuẩn tai nghe và không dùng để đo thính lực. Gain phát số là 0,5; vẫn phải đặt âm lượng loa/tai nghe ở mức thấp để nghe an toàn.</p>
    </section>
  );
}
