// Cross-language numerical parity against independently executed Python ERB engine.
// Fixture is created by tests/research/generate_auditory_fixtures.py in CI.
import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import { processAuditoryErb } from "../src/util/auditoryErb.js";

const fixture = JSON.parse(readFileSync(new URL("../../tests/research/.auditory-parity-fixture.json", import.meta.url)));
assert.ok(fixture.cases.length >= 5);
for (const testCase of fixture.cases) {
  const input = Float32Array.from(testCase.samples);
  const expected = Float32Array.from(testCase.expected);
  const actual = processAuditoryErb(input, testCase.rate, testCase.freqs, testCase.thresholds);
  assert.equal(actual.length, expected.length, testCase.name);
  let maxError = 0, sumSquared = 0, referenceSumSquared = 0;
  for (let i = 0; i < expected.length; i++) {
    const diff = Math.abs(actual[i] - expected[i]);
    if (!Number.isFinite(actual[i])) throw new Error(testCase.name + ": output nonfinite");
    maxError = Math.max(maxError, diff);
    sumSquared += diff * diff;
    referenceSumSquared += expected[i] * expected[i];
  }
  const relativeRms = Math.sqrt(sumSquared / Math.max(referenceSumSquared, 1e-18));
  assert.ok(maxError < 0.0005, testCase.name + ": max error " + maxError);
  assert.ok(relativeRms < 0.01, testCase.name + ": relative RMS " + relativeRms);
  console.log("PASS Python-JS ERB parity: " + testCase.name +
    ", maxAbs=" + maxError.toExponential(3) + ", relRMS=" + relativeRms.toExponential(3));
}
