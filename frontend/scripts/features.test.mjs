import test from "node:test";
import assert from "node:assert/strict";
import { analyzeAudio } from "../src/util/audioFeatures.js";

function sine(freq, fs = 16000, n = 8192) {
  return Float32Array.from({ length: n }, (_, i) => 0.25 * Math.sin(2 * Math.PI * freq * i / fs));
}

test("spectral features: silence is zero and bands sum to 100 for nonzero data", () => {
  const silence = analyzeAudio(new Float32Array(2048), 16000);
  assert.equal(silence.rms, 0);
  assert.equal(silence.centroidHz, 0);
  const values = analyzeAudio(sine(2000), 16000);
  assert.ok(Math.abs(values.lowPercent + values.midPercent + values.highPercent - 100) < 1e-8);
});

test("spectral centroid and band fractions follow 500 Hz and 5000 Hz tones", () => {
  const low = analyzeAudio(sine(500), 16000);
  const high = analyzeAudio(sine(5000), 16000);
  assert.ok(low.centroidHz > 475 && low.centroidHz < 525, low.centroidHz);
  assert.ok(high.centroidHz > 4950 && high.centroidHz < 5050, high.centroidHz);
  assert.ok(low.lowPercent > 95, low.lowPercent);
  assert.ok(high.highPercent > 95, high.highPercent);
  assert.ok(low.rms > 0.17 && low.rms < 0.18);
});

test("feature extractor validates decoded audio", () => {
  assert.throws(() => analyzeAudio(Float32Array.from([1, NaN]), 16000));
  assert.throws(() => analyzeAudio(new Float32Array(), 16000));
  assert.throws(() => analyzeAudio(sine(500), 1000));
});
