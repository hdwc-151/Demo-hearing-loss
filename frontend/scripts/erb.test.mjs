import test from "node:test";
import assert from "node:assert/strict";
import { erbHz, erbRate, erbCenters, processAuditoryErb } from "../src/util/auditoryErb.js";

const FREQS = [250, 500, 1000, 2000, 4000, 8000];
const NORMAL = [10, 10, 10, 15, 15, 15];
const LOSS = [15, 15, 20, 45, 80, 90];
const SR = 16000;
const tone = (freq, level, n = 8192) => Float32Array.from({ length: n },
  (_, i) => level * Math.sin(2 * Math.PI * freq * i / SR));
function amplitude(x, frequency) {
  let real = 0, imag = 0;
  for (let i = 0; i < x.length; i++) {
    const angle = 2 * Math.PI * frequency * i / SR;
    real += x[i] * Math.cos(angle);
    imag += x[i] * Math.sin(angle);
  }
  return 2 * Math.hypot(real, imag) / x.length;
}
test("ERB formulas and ascending filterbank centers", () => {
  assert.ok(Math.abs(erbHz(1000) - 24.7 * 5.37) < 1e-10);
  assert.ok(Math.abs(erbRate(1000) - 21.4 * Math.log10(5.37)) < 1e-10);
  const c = erbCenters(SR);
  assert.equal(c.length, 12);
  assert.ok(Math.abs(c[0] - 250) < 1e-8);
  assert.ok(Math.abs(c.at(-1) - 6880) < 1e-7);
  assert.ok([...c].every((v, i) => !i || v > c[i - 1]));
});
test("healthy profile is an exact pass-through", () => {
  const x = tone(1000, 0.2);
  assert.deepEqual(processAuditoryErb(x, SR, FREQS, NORMAL), x);
});
test("upper band is attenuated more strongly", () => {
  const x = tone(500, 0.2);
  const z = tone(4000, 0.2);
  const mix = Float32Array.from(x, (v, i) => v + z[i]);
  const y = processAuditoryErb(mix, SR, FREQS, LOSS);
  const lo = amplitude(y, 500) / amplitude(mix, 500);
  const hi = amplitude(y, 4000) / amplitude(mix, 4000);
  assert.ok(lo > hi && hi < 0.8, String([lo, hi]));
  assert.ok(y.every((v) => Number.isFinite(v) && Math.abs(v) <= 0.980001));
});
test("quiet input receives stronger loss than loud input (illustrative expansion)", () => {
  const quiet = tone(4000, 0.02), loud = tone(4000, 0.3);
  const q = amplitude(processAuditoryErb(quiet, SR, FREQS, LOSS), 4000) / amplitude(quiet, 4000);
  const l = amplitude(processAuditoryErb(loud, SR, FREQS, LOSS), 4000) / amplitude(loud, 4000);
  assert.ok(q < l && l < 1, String([q, l]));
});
test("invalid input rejected and output repeatable", () => {
  const x = tone(4000, 0.25);
  assert.deepEqual(processAuditoryErb(x, SR, FREQS, LOSS), processAuditoryErb(x, SR, FREQS, LOSS));
  assert.throws(() => processAuditoryErb(x, SR, [...FREQS].reverse(), LOSS));
  assert.throws(() => processAuditoryErb(Float32Array.from([NaN]), SR, FREQS, LOSS));
  assert.throws(() => processAuditoryErb(x, 3000, FREQS, LOSS));
});
