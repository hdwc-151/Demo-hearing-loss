import test from "node:test";
import assert from "node:assert/strict";
import { attenuationDbAt, processHearingLoss, AUDIO_OUTPUT_PEAK } from "../src/util/hearingLoss.js";

const FREQS = [250, 500, 1000, 2000, 4000, 8000];
const NORMAL = [10, 10, 10, 15, 15, 15];
const HIGH = [10, 10, 10, 20, 95, 95];

test("DSP profile: bounded attenuation and log-frequency interpolation", () => {
  assert.equal(attenuationDbAt(500, FREQS, HIGH), 0);
  assert.equal(attenuationDbAt(4000, FREQS, HIGH), 32);
  assert.ok(attenuationDbAt(2800, FREQS, HIGH) > 0);
});

test("Normal profile is an exact pass-through", () => {
  const x = Float32Array.from([0.3, -0.2, 0, 0.5]);
  assert.deepEqual(processHearingLoss(x, 16000, FREQS, NORMAL), x);
});

function amplitude(signal, freq, sr) {
  let cos = 0, sin = 0;
  for (let i = 0; i < signal.length; i++) {
    const phase = 2 * Math.PI * freq * i / sr;
    cos += signal[i] * Math.cos(phase);
    sin += signal[i] * Math.sin(phase);
  }
  return 2 * Math.hypot(cos, sin) / signal.length;
}

test("filtering makes 4 kHz weaker while retaining a 500 Hz component", () => {
  const fs = 16000;
  const x = Float32Array.from({ length: 8192 }, (_, i) =>
    0.22 * Math.sin(2 * Math.PI * 500 * i / fs) +
    0.22 * Math.sin(2 * Math.PI * 4000 * i / fs));
  const y = processHearingLoss(x, fs, FREQS, HIGH);
  const lowRatio = amplitude(y, 500, fs) / amplitude(x, 500, fs);
  const highRatio = amplitude(y, 4000, fs) / amplitude(x, 4000, fs);
  assert.ok(lowRatio > 0.85 && lowRatio < 1.05, "500 Hz kept: " + lowRatio);
  assert.ok(highRatio < 0.12, "4000 Hz reduced: " + highRatio);
  assert.ok(y.every((v) => Number.isFinite(v) && Math.abs(v) <= AUDIO_OUTPUT_PEAK + 1e-6));
  assert.deepEqual(y, processHearingLoss(x, fs, FREQS, HIGH));
});

test("reject corrupt audiogram and nonfinite samples", () => {
  assert.throws(() => processHearingLoss(new Float32Array(4), 16000, [500, 250], [20, 40]));
  assert.throws(() => processHearingLoss(new Float32Array([NaN]), 16000, FREQS, HIGH));
  assert.throws(() => processHearingLoss(new Float32Array(4), 2000, FREQS, HIGH));
});
