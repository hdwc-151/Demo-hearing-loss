// Experimental ERB-spaced auditory-band model (original implementation).
// NOT a Compressive Gammachirp and NOT a clinically calibrated cochlear model.
// Band edges follow ERB approximations; fourth-order *symmetric* spectral masks,
// bounded static attenuation, and an illustrative level-dependent expander.
// Reference: backend/core/auditory_erb.py.
import { fft } from "./noise.js";

const N_BANDS = 12;
const FRAME = 1024;
const REF = 0.12;
const PEAK = 0.98;

export function erbHz(freq) {
  if (!Number.isFinite(freq) || freq < 0) throw new RangeError("Invalid frequency");
  return 24.7 * (1 + 4.37 * freq / 1000);
}
export function erbRate(freq) {
  if (!Number.isFinite(freq) || freq < 0) throw new RangeError("Invalid frequency");
  return 21.4 * Math.log10(1 + 0.00437 * freq);
}
export function erbCenters(sampleRate, bands = N_BANDS) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) {
    throw new RangeError("Invalid sample rate");
  }
  if (!Number.isInteger(bands) || bands < 4 || bands > 32) throw new RangeError("Invalid band count");
  const lo = erbRate(250), hi = erbRate(Math.min(8000, sampleRate * 0.43));
  return Float64Array.from({ length: bands }, (_, i) => {
    const r = lo + (hi - lo) * i / (bands - 1);
    return (Math.pow(10, r / 21.4) - 1) / 0.00437;
  });
}

function validate(freqs, thresholds) {
  if (!freqs || !thresholds || freqs.length < 2 || thresholds.length !== freqs.length) {
    throw new RangeError("Invalid audiogram lengths");
  }
  for (let i = 0; i < freqs.length; i++) {
    if (!Number.isFinite(freqs[i]) || freqs[i] <= 0 ||
        (i && freqs[i] <= freqs[i - 1]) ||
        !Number.isFinite(thresholds[i]) || thresholds[i] < -10 || thresholds[i] > 110) {
      throw new RangeError("Invalid audiogram values");
    }
  }
}
function thresholdAt(freq, freqs, thresholds) {
  if (freq <= freqs[0]) return thresholds[0];
  if (freq >= freqs[freqs.length - 1]) return thresholds[thresholds.length - 1];
  let i = 0;
  while (i < freqs.length - 2 && freq > freqs[i + 1]) i++;
  const ratio = Math.log2(freq / freqs[i]) / Math.log2(freqs[i + 1] / freqs[i]);
  return thresholds[i] + ratio * (thresholds[i + 1] - thresholds[i]);
}

export function processAuditoryErb(samples, sampleRate, freqs, thresholds, frameSize = FRAME, bandCount = N_BANDS) {
  validate(freqs, thresholds);
  const centers = erbCenters(sampleRate, bandCount);
  if (!Number.isInteger(frameSize) || frameSize < 64 || (frameSize & (frameSize - 1))) {
    throw new RangeError("Frame size must be a power of two >=64");
  }
  if (!samples || typeof samples.length !== "number") throw new TypeError("Missing audio samples");
  for (const value of samples) if (!Number.isFinite(value)) throw new RangeError("Nonfinite samples");
  if (samples.length === 0 || thresholds.every((db) => db <= 20)) return Float32Array.from(samples);
  const n = frameSize, half = n / 2, hop = half, bands = centers.length;
  const window = new Float64Array(n);
  for (let i = 0; i < n; i++) window[i] = Math.sqrt(0.5 - 0.5 * Math.cos(2 * Math.PI * i / n));
  const masks = Array.from({ length: bands }, () => new Float64Array(half + 1));
  const base = new Float64Array(bands), strength = new Float64Array(bands);
  for (let b = 0; b < bands; b++) {
    const severity = Math.max(0, thresholdAt(centers[b], freqs, thresholds) - 20);
    base[b] = Math.pow(10, -Math.min(18, severity * 0.22) / 20);
    strength[b] = Math.min(0.6, severity / 120);
  }
  for (let k = 0; k <= half; k++) {
    const hz = k * sampleRate / n;
    let sum = 0;
    for (let b = 0; b < bands; b++) {
      const radius = (hz - centers[b]) / (1.02 * erbHz(centers[b]));
      const w = Math.pow(1 + radius * radius, -2);
      masks[b][k] = w; sum += w;
    }
    for (let b = 0; b < bands; b++) masks[b][k] /= sum;
  }
  const padded = new Float64Array(samples.length + 2 * n);
  padded.set(samples, n);
  const output = new Float64Array(padded.length);
  const norm = new Float64Array(padded.length);
  const real = new Float64Array(n), imag = new Float64Array(n);
  const levels = new Float64Array(bands), energies = new Float64Array(bands), gains = new Float64Array(bands);
  let started = false;
  for (let start = 0; start + n <= padded.length; start += hop) {
    for (let k = 0; k < n; k++) {
      real[k] = padded[start + k] * window[k];
      imag[k] = 0;
    }
    fft(real, imag);
    energies.fill(0);
    for (let k = 0; k <= half; k++) {
      const p = (real[k] * real[k] + imag[k] * imag[k]) * ((k > 0 && k < half) ? 2 : 1);
      for (let b = 0; b < bands; b++) energies[b] += masks[b][k] * p;
    }
    for (let b = 0; b < bands; b++) {
      const envelope = 2 / n * Math.sqrt(energies[b]);
      levels[b] = started ? (levels[b] + envelope) / 2 : envelope;
      const ratio = Math.max(1e-7, Math.min(1, levels[b] / REF));
      gains[b] = base[b] * Math.pow(ratio, strength[b]);
    }
    started = true;
    for (let k = 0; k < n; k++) {
      const bin = k <= half ? k : n - k;
      let gain = 0;
      for (let b = 0; b < bands; b++) gain += masks[b][bin] * gains[b];
      real[k] *= gain;
      imag[k] *= gain;
    }
    fft(real, imag, true);
    for (let k = 0; k < n; k++) {
      output[start + k] += real[k] * window[k];
      norm[start + k] += window[k] * window[k];
    }
  }
  const result = new Float32Array(samples.length);
  for (let k = 0; k < samples.length; k++) {
    const i = n + k;
    const value = norm[i] > 1e-10 ? output[i] / norm[i] : 0;
    result[k] = Math.max(-PEAK, Math.min(PEAK, value));
  }
  return result;
}
