import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import { processAdvancedAudio } from "../src/util/auditoryAdvanced.js";

const fixture = JSON.parse(readFileSync(new URL("../../tests/research/.advanced-parity-fixture.json", import.meta.url)));
assert.ok(fixture.cases.length >= 12);
for(const item of fixture.cases) {
  const input = Float32Array.from(item.pcm);
  const expected = Float32Array.from(item.expected);
  const actual = processAdvancedAudio(input, item.sampleRate, item.freqs, item.thresholds, item.mode);
  assert.equal(actual.length, expected.length, item.case + "/" + item.mode);
  let maximum=0, sum=0, reference=0;
  for(let i=0;i<expected.length;i++){
    assert.ok(Number.isFinite(actual[i]));
    const e=actual[i]-expected[i];
    maximum=Math.max(maximum, Math.abs(e));
    sum+=e*e;
    reference+=expected[i]*expected[i];
  }
  const relative=Math.sqrt(sum/Math.max(reference,1e-18));
  assert.ok(maximum < 0.0005, item.mode+"/"+item.case+": max "+maximum);
  assert.ok(relative < 0.01, item.mode+"/"+item.case+": relative RMS "+relative);
  console.log("PASS advanced Python/JS: "+item.mode+"/"+item.case+" max="+maximum.toExponential(3));
}
