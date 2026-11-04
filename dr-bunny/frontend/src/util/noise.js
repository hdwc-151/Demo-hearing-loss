// Nhiễu nền thủ tục chạy ngay trong máy: cùng thuật toán với backend/core/noise.py (độ dốc phổ kiểu lời nói,
// nhấn dải theo kịch bản, lọc thông thấp mềm theo mức, điều biên ~4 Hz, chuẩn hoá RMS).
// Dùng khi backend offline, trong app mobile và trong bản demo. Số ngẫu nhiên khác numpy nên KHÔNG khớp từng mẫu
// với Python; thay vào đó logic.test.mjs kiểm các tính chất (tỉ lệ năng lượng cao, đỉnh điều biên, tuần hoàn...).
import { SCENARIOS, LEVEL_CUTOFF, LEVEL_NOISE_GAIN } from "../data/constants.js";

export const SR = 22050;
export const DEFAULT_N = 65536;   // 2^16 mẫu ≈ 2,97 giây; luỹ thừa của 2 để dùng FFT cơ số 2
const SYLLABLE_HZ = 4.0, SYLLABLE_BW_HZ = 1.5, MOD_DEPTH = 0.5;
const TILT_REF_HZ = 500.0, TILT_POWER_EXP = 2.0, LP_ORDER = 4, RMS_SCALE = 0.35;

// ---------- số ngẫu nhiên có seed ----------
export function seedFromString(s) {            // FNV-1a 32 bit
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export function rngFromSeed(seed) {            // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function gaussianArray(n, rand) {       // Box–Muller
  const out = new Float64Array(n);
  for (let i = 0; i < n; i += 2) {
    const u = Math.max(rand(), 1e-12), v = rand();
    const r = Math.sqrt(-2 * Math.log(u)), th = 2 * Math.PI * v;
    out[i] = r * Math.cos(th);
    if (i + 1 < n) out[i + 1] = r * Math.sin(th);
  }
  return out;
}

// ---------- FFT cơ số 2 tại chỗ ----------
export function fft(re, im, inverse = false) {
  const n = re.length;
  if (n & (n - 1)) throw new RangeError("độ dài phải là luỹ thừa của 2");
  for (let i = 1, j = 0; i < n; i++) {         // đảo bit
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((2 * Math.PI) / len) * (inverse ? 1 : -1);
    const wr = Math.cos(ang), wi = Math.sin(ang), half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k, b = a + half;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const nc = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nc;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

// Lọc tín hiệu thực bằng một độ lợi THỰC đối xứng theo tần số (gainAt nhận Hz). Vì độ lợi thực và đối xứng nên
// kết quả của IFFT vẫn là tín hiệu thực, tương đương rfft/irfft của numpy.
export function filterReal(x, gainAt) {
  const n = x.length, re = Float64Array.from(x), im = new Float64Array(n);
  fft(re, im, false);
  for (let k = 0; k < n; k++) {
    const g = gainAt((k <= n / 2 ? k : n - k) * SR / n);
    re[k] *= g; im[k] *= g;
  }
  fft(re, im, true);
  return re;
}

// ---------- thuật toán nhiễu ----------
export function modulationEnvelope(n, rand) {
  const b = filterReal(gaussianArray(n, rand), (f) => Math.exp(-0.5 * ((f - SYLLABLE_HZ) / SYLLABLE_BW_HZ) ** 2));
  let mean = 0; for (const v of b) mean += v; mean /= n;
  let ss = 0; for (const v of b) ss += (v - mean) ** 2;
  const sd = Math.sqrt(ss / n);
  const env = new Float64Array(n);
  for (let i = 0; i < n; i++) env[i] = Math.max(0.05, 1 + MOD_DEPTH * (sd > 0 ? b[i] / sd : b[i]));
  return env;
}

export function shapedNoise(n, scenario, level, rand) {
  const cfg = SCENARIOS[scenario] ?? { noiseFreq: 1000, noiseQ: 1.0 };
  const cutoff = LEVEL_CUTOFF[level] ?? 8000;
  const fc = cfg.noiseFreq, q = Math.max(cfg.noiseQ, 0.1);
  return filterReal(gaussianArray(n, rand), (f) => {
    if (f === 0) return 0;                                   // bỏ DC
    const fs = Math.max(f, 1);
    const tiltPow = f <= TILT_REF_HZ ? 1.0 : (fs / TILT_REF_HZ) ** -TILT_POWER_EXP;
    const emph = 1.0 + 1.5 * Math.exp(-((Math.log2(fs) - Math.log2(fc)) ** 2) * (q * 2.0));
    const lp = 1.0 / Math.sqrt(1.0 + (f / cutoff) ** (2 * LP_ORDER));
    return Math.sqrt(tiltPow) * emph * lp;
  });
}

export function normalize(y, level) {
  const n = y.length;
  let mean = 0; for (const v of y) mean += v; mean /= n;
  let ss = 0; for (const v of y) ss += (v - mean) ** 2;
  const rms = Math.sqrt(ss / n);
  const out = new Float32Array(n);
  if (rms === 0) return out;
  const k = (LEVEL_NOISE_GAIN[level] ?? 0.1) * RMS_SCALE / rms;
  for (let i = 0; i < n; i++) out[i] = Math.max(-1, Math.min(1, (y[i] - mean) * k));
  return out;
}

// Trả Float32Array n mẫu ở SR = 22050 Hz. Tín hiệu sinh bằng IFFT nên tuần hoàn chu kỳ n: lặp lại liền mạch.
export function renderProcedural(scenario, level = "Normal", n = DEFAULT_N, seed = seedFromString(`${scenario}|${level}`)) {
  const rand = rngFromSeed(seed);
  const shaped = shapedNoise(n, scenario, level, rand);
  const env = modulationEnvelope(n, rand);
  for (let i = 0; i < n; i++) shaped[i] *= env[i];
  return normalize(shaped, level);
}
