// Dr. Bunny v0.4 audio foundation — original educational DSP implementation.
// dB HL drives a bounded *illustrative* digital attenuation curve. It is NOT
// dB HL -> dBFS conversion or a clinically validated cochlear simulation.
// The Python reference is backend/core/hearing_loss.py.
import { fft } from "./noise.js";

export const AUDIO_FRAME_SIZE = 1024;
export const AUDIO_OUTPUT_PEAK = 0.98;
const REFERENCE_DB_HL = 20;
const SLOPE = 0.5;
const MAX_ATTENUATION_DB = 32;

function validateProfile(freqs, thresholds) {
  if (!freqs || !thresholds || freqs.length < 2 || freqs.length !== thresholds.length) {
    throw new RangeError("Audiogram requires matching frequencies and thresholds");
  }
  for (let i = 0; i < freqs.length; i++) {
    if (!Number.isFinite(freqs[i]) || freqs[i] <= 0 ||
        (i > 0 && freqs[i] <= freqs[i - 1]) ||
        !Number.isFinite(thresholds[i]) || thresholds[i] < -10 || thresholds[i] > 110) {
      throw new RangeError("Invalid audiogram frequency or threshold");
    }
  }
}

export function attenuationDbAt(hz, freqs, thresholds) {
  validateProfile(freqs, thresholds);
  if (!Number.isFinite(hz) || hz < 0) throw new RangeError("Invalid frequency");
  let threshold = thresholds[0];
  if (hz >= freqs[freqs.length - 1]) threshold = thresholds[thresholds.length - 1];
  else if (hz > freqs[0]) {
    let i = 0;
    while (i < freqs.length - 2 && hz > freqs[i + 1]) i++;
    const ratio = Math.log2(hz / freqs[i]) / Math.log2(freqs[i + 1] / freqs[i]);
    threshold = thresholds[i] + (thresholds[i + 1] - thresholds[i]) * ratio;
  }
  return Math.min(MAX_ATTENUATION_DB, Math.max(0, (threshold - REFERENCE_DB_HL) * SLOPE));
}

export function processHearingLoss(samples, sampleRate, freqs, thresholds, frameSize = AUDIO_FRAME_SIZE) {
  validateProfile(freqs, thresholds);
  if (!samples || typeof samples.length !== "number") throw new TypeError("Expected audio samples");
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) {
    throw new RangeError("Invalid sample rate");
  }
  if (!Number.isInteger(frameSize) || frameSize < 64 || (frameSize & (frameSize - 1)) !== 0) {
    throw new RangeError("Frame size must be a power of two >= 64");
  }
  for (const v of samples) if (!Number.isFinite(v)) throw new RangeError("Audio must be finite");
  if (samples.length === 0 || freqs.every((hz) => attenuationDbAt(hz, freqs, thresholds) === 0)) {
    return Float32Array.from(samples);
  }

  const n = frameSize, hop = n / 2;
  const padded = new Float64Array(samples.length + 2 * n);
  padded.set(samples, n);
  const output = new Float64Array(padded.length);
  const denominator = new Float64Array(padded.length);
  const window = new Float64Array(n);
  const gains = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    window[i] = Math.sqrt(0.5 - 0.5 * Math.cos(2 * Math.PI * i / n));
    const hz = Math.min(i, n - i) * sampleRate / n;
    gains[i] = Math.pow(10, -attenuationDbAt(hz, freqs, thresholds) / 20);
  }

  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let pos = 0; pos + n <= padded.length; pos += hop) {
    for (let i = 0; i < n; i++) {
      re[i] = padded[pos + i] * window[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let i = 0; i < n; i++) { re[i] *= gains[i]; im[i] *= gains[i]; }
    fft(re, im, true);
    for (let i = 0; i < n; i++) {
      output[pos + i] += re[i] * window[i];
      denominator[pos + i] += window[i] * window[i];
    }
  }
  const result = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const at = i + n;
    const value = denominator[at] > 1e-10 ? output[at] / denominator[at] : 0;
    result[i] = Math.max(-AUDIO_OUTPUT_PEAK, Math.min(AUDIO_OUTPUT_PEAK, value));
  }
  return result;
}
