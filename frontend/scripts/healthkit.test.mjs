import test from "node:test";
import assert from "node:assert/strict";
import { validateHealthAudiogram } from "../src/util/healthkitAudiogram.js";

const good = {found:true,source:"apple_healthkit",unit:"dB HL",measuredAt:"2026-11-03T12:00:00Z",
  sampleId:"private sample id",points:[
   {frequencyHz:4000,leftDbHL:40,rightDbHL:55},
   {frequencyHz:500,leftDbHL:10,rightDbHL:15}
  ]};
test("HealthKit bilateral points retain units, provenance and never expose sample UUID",()=>{
 const r=validateHealthAudiogram(good);
 assert.equal(r.profileSource,"healthkit_measured");
 assert.equal(r.unit,"dB HL");
 assert.equal(r.points[0].frequencyHz,500);
 assert.equal(r.points[1].rightDbHL,55);
 assert.equal(r.sampleId,undefined);
});
test("Missing permission and no data are indistinguishable in HealthKit",()=>{
 assert.equal(validateHealthAudiogram({found:false}).found,false);
});
test("Reject invalid units, frequency, missing side, nonfinite values, dates and oversized records",()=>{
 for(const value of [
 {...good,unit:"dB SPL"},
 {...good,points:[{frequencyHz:0,leftDbHL:10}]},
 {...good,points:[{frequencyHz:500}]},
 {...good,points:[{frequencyHz:500,leftDbHL:NaN}]},
 {...good,points:new Array(31).fill({frequencyHz:250,leftDbHL:10})},
 {...good,measuredAt:"invalid"}
 ]) assert.throws(()=>validateHealthAudiogram(value));
});
