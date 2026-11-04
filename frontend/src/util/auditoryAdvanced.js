// Original Dr. Bunny auditory DSP prototypes. Not medically validated.
// dcGC-shaped: passive Gammachirp *magnitude proxy* + level-controlled
// asymmetric HP-AF on STFT bins, not a causal physiologic dcGC filterbank.
// WDRC: separate bounded educational multiband compressor on original PCM.
// No dB HL -> dB SPL/dBFS calibration, real hearing-aid fitting or diagnosis.
import { fft } from "./noise.js";
import { erbCenters, erbHz } from "./auditoryErb.js";

export const ADVANCED_MAX_PEAK = 0.8;

export function passiveGC(hz, center, chirp = -1) {
  if (!Number.isFinite(hz) || hz < 0 || !Number.isFinite(center) || center <= 0)
    throw new RangeError("Invalid Gammachirp inputs");
  const z = (hz - center) / (1.019 * erbHz(center));
  return Math.pow(1 + z * z, -2) * Math.exp(chirp * Math.atan(z));
}

export function asymmetricHP(hz, center, strength) {
  if (!Number.isFinite(hz) || hz < 0 || !Number.isFinite(center) ||
      center <= 0 || !Number.isFinite(strength) || strength < 0)
    throw new RangeError("Invalid asymmetric HP parameters");
  const theta = Math.atan((hz - center) / erbHz(center));
  return Math.exp(strength * (theta - Math.PI / 2));
}

function validateProfile(freqs, values) {
  if (!freqs || !values || freqs.length < 2 || values.length !== freqs.length)
    throw new RangeError("Invalid audiogram lengths");
  for (let i = 0; i < freqs.length; i++) {
    if (!Number.isFinite(freqs[i]) || freqs[i] <= 0 ||
        (i > 0 && freqs[i] <= freqs[i - 1]) ||
        !Number.isFinite(values[i]) || values[i] < -10 || values[i] > 110)
      throw new RangeError("Invalid audiogram values");
  }
}

function interp(hz, freqs, values) {
  if (hz <= freqs[0]) return values[0];
  if (hz >= freqs[freqs.length - 1]) return values[values.length - 1];
  let i = 0;
  while (i < freqs.length - 2 && hz > freqs[i + 1]) i++;
  const frac = Math.log2(hz / freqs[i]) / Math.log2(freqs[i + 1] / freqs[i]);
  return values[i] + frac * (values[i + 1] - values[i]);
}

export function processAdvancedAudio(samples, sampleRate, freqs, thresholds, mode) {
  validateProfile(freqs, thresholds);
  if (mode !== "dcgc" && mode !== "aid") throw new RangeError("Unknown DSP mode");
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 48000)
    throw new RangeError("Unsupported experimental sample rate");
  if (!samples || typeof samples.length !== "number") throw new TypeError("Expected PCM samples");
  for (const v of samples) if (!Number.isFinite(v)) throw new RangeError("Invalid PCM data");
  if (samples.length === 0 || thresholds.every((v) => v <= 20))
    return Float32Array.from(samples);
  const n = 1024, half = n/2, hop = half, bands = 12;
  const centers = erbCenters(sampleRate, bands), severity = new Float64Array(bands);
  const base = new Float64Array(bands), strength = new Float64Array(bands);
  const boost = new Float64Array(bands);
  const hz = Float64Array.from({ length: half+1 }, (_, k) => k*sampleRate/n);
  const masks = Array.from({ length: bands }, () => new Float64Array(half+1));
  const win = Float64Array.from({ length: n },
    (_, k) => Math.sqrt(.5-.5*Math.cos(2*Math.PI*k/n)));
  const attack = Math.exp(-hop/(sampleRate*.015));
  const release = Math.exp(-hop/(sampleRate*.125));
  for (let b = 0; b < bands; b++) {
    severity[b] = Math.max(0, interp(centers[b], freqs, thresholds)-20);
    base[b] = Math.pow(10, -Math.min(18, severity[b]*.20)/20);
    strength[b] = Math.min(.5, severity[b]/130);
    boost[b] = Math.min(6, severity[b]*.075);
  }
  for (let k = 0; k <= half; k++) {
    let total = 0;
    for (let b = 0; b < bands; b++) {
      masks[b][k] = passiveGC(hz[k], centers[b], mode === "dcgc" ? -1 : 0);
      total += masks[b][k];
    }
    for (let b = 0; b < bands; b++) masks[b][k] /= total;
  }
  const padded = new Float64Array(samples.length+2*n);
  padded.set(samples, n);
  const output = new Float64Array(padded.length), denom = new Float64Array(padded.length);
  const real = new Float64Array(n), imag = new Float64Array(n);
  const energy = new Float64Array(bands), envelope = new Float64Array(bands);
  const gains = new Float64Array(bands), last = new Float64Array(bands).fill(1);
  const shifted = new Float64Array(bands), hpStrength = new Float64Array(bands);
  let started = false;
  for (let start = 0; start+n <= padded.length; start += hop) {
    for (let k = 0; k < n; k++) { real[k] = padded[start+k]*win[k]; imag[k] = 0; }
    fft(real, imag);
    energy.fill(0);
    for (let k = 0; k <= half; k++) {
      const v = (real[k]*real[k]+imag[k]*imag[k])*
        ((k > 0 && k < half) ? 2 : 1);
      for (let b = 0; b < bands; b++) energy[b] += masks[b][k]*v;
    }
    for (let b = 0; b < bands; b++) {
      const measured = 2/n*Math.sqrt(energy[b]);
      if (started) {
        const alpha = measured > envelope[b] ? attack : release;
        envelope[b] = alpha*envelope[b]+(1-alpha)*measured;
      } else envelope[b] = measured;
      const levelDb = 20*Math.log10(Math.max(envelope[b],1e-8));
      if (mode === "dcgc") {
        const level = Math.max(0,Math.min(1,(levelDb+70)/55));
        shifted[b] = centers[b]*(.80+.28*level);
        hpStrength[b] = .95*(1-Math.min(.75,severity[b]/145));
        gains[b] = base[b]*Math.pow(Math.max(1e-6,Math.min(1,envelope[b]/.12)),strength[b]);
      } else {
        const targetDb = Math.max(-9,Math.min(6,boost[b]-.5*Math.max(0,levelDb+35)));
        const target = Math.pow(10,targetDb/20);
        if (!started) last[b] = target;
        else {
          const alpha = target < last[b] ? attack : release;
          last[b] = alpha*last[b]+(1-alpha)*target;
        }
        gains[b] = last[b];
      }
    }
    started = true;
    for (let k = 0; k < n; k++) {
      const bin = k <= half ? k : n-k;
      let gain = 0;
      for (let b = 0; b < bands; b++) {
        const hp = mode === "dcgc" ? asymmetricHP(hz[bin],shifted[b],hpStrength[b]) : 1;
        gain += masks[b][bin]*hp*gains[b];
      }
      real[k] *= gain; imag[k] *= gain;
    }
    fft(real,imag,true);
    for (let k = 0; k < n; k++) {
      output[start+k] += real[k]*win[k];
      denom[start+k] += win[k]*win[k];
    }
  }
  const result = new Float32Array(samples.length);
  let peak = 0;
  for (let k = 0; k < result.length; k++) {
    const at = k+n;
    result[k] = denom[at] > 1e-10 ? output[at]/denom[at] : 0;
    peak = Math.max(peak, Math.abs(result[k]));
  }
  if (peak > ADVANCED_MAX_PEAK)
    for (let k = 0; k < result.length; k++) result[k] *= ADVANCED_MAX_PEAK/peak;
  return result;
}
