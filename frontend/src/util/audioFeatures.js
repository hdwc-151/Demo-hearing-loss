// Digital-signal features only — not calibrated SPL, dB HL, or speech intelligibility.
// Mirrors backend/core/audio_features.py. FFT is shared with the procedural noise engine.
import { fft } from "./noise.js";

export function analyzeAudio(samples, sampleRate, frameSize = 1024) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) {
    throw new RangeError("Invalid sample rate");
  }
  if (!Number.isInteger(frameSize) || frameSize < 64 || (frameSize & (frameSize - 1)) !== 0) {
    throw new RangeError("Invalid frame size");
  }
  if (!samples || samples.length === 0) throw new RangeError("Empty audio signal");
  let sq = 0, peak = 0;
  for (const value of samples) {
    if (!Number.isFinite(value)) throw new RangeError("Audio must be finite");
    sq += value * value;
    peak = Math.max(peak, Math.abs(value));
  }
  const n = frameSize, hop = n / 2, win = new Float64Array(n);
  for (let k = 0; k < n; k++) win[k] = Math.sqrt(0.5 - 0.5 * Math.cos(2 * Math.PI * k / n));
  const re = new Float64Array(n), im = new Float64Array(n);
  let low = 0, mid = 0, high = 0, moment = 0, total = 0;
  for (let start = 0; start < samples.length; start += hop) {
    for (let k = 0; k < n; k++) {
      re[k] = (start + k < samples.length ? samples[start + k] : 0) * win[k];
      im[k] = 0;
    }
    fft(re, im);
    for (let k = 0; k <= n / 2; k++) {
      const freq = k * sampleRate / n;
      const power = (re[k] * re[k] + im[k] * im[k]) * ((k > 0 && k < n / 2) ? 2 : 1);
      total += power;
      moment += power * freq;
      if (freq < 1000) low += power;
      else if (freq < 4000) mid += power;
      else high += power;
    }
  }
  const percent = (v) => total > 1e-20 ? 100 * v / total : 0;
  return {
    rms: Math.sqrt(sq / samples.length), peak,
    centroidHz: total > 1e-20 ? moment / total : 0,
    lowPercent: percent(low), midPercent: percent(mid), highPercent: percent(high),
  };
}
