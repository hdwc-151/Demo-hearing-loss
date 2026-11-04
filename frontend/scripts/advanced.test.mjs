import test from "node:test";
import assert from "node:assert/strict";
import { passiveGC, asymmetricHP, processAdvancedAudio, ADVANCED_MAX_PEAK } from "../src/util/auditoryAdvanced.js";

const F = [250, 500, 1000, 2000, 4000, 8000];
const NORMAL = [10, 10, 10, 15, 15, 15];
const LOSS = [15, 15, 20, 45, 80, 90];
const SR = 16000;
const tone = (hz, level, n=4096) => Float32Array.from({length:n},
    (_,i) => level*Math.sin(2*Math.PI*hz*i/SR));
function amplitude(x, freq) {
  let re=0, im=0;
  for(let i=0;i<x.length;i++){
    const phase=2*Math.PI*freq*i/SR;
    re+=x[i]*Math.cos(phase); im+=x[i]*Math.sin(phase);
  }
  return 2*Math.hypot(re,im)/x.length;
}
test("passive Gammachirp-shaped magnitude and asymmetric high-pass are bounded", () => {
  for(const center of [250,1000,4000]){
    for(const hz of [0,center,8000]){
      assert.ok(Number.isFinite(passiveGC(hz,center)) && passiveGC(hz,center)>=0);
      assert.ok(asymmetricHP(hz,center,.6)>=0 && asymmetricHP(hz,center,.6)<=1);
    }
    assert.ok(asymmetricHP(0,center,.6)<asymmetricHP(8000,center,.6));
  }
});
for(const mode of ["dcgc","aid"]){
  test(mode+" healthy identity, bounds, deterministic, invalid input",()=>{
    const signal=tone(1000,.2);
    assert.deepEqual(processAdvancedAudio(signal,SR,F,NORMAL,mode),signal);
    const processed=processAdvancedAudio(signal,SR,F,LOSS,mode);
    assert.deepEqual(processed,processAdvancedAudio(signal,SR,F,LOSS,mode));
    assert.ok([...processed].every(v=>Number.isFinite(v)&&Math.abs(v)<=ADVANCED_MAX_PEAK+.00001));
    assert.throws(()=>processAdvancedAudio(signal,2200,F,LOSS,mode));
    assert.throws(()=>processAdvancedAudio(signal,SR,[500,250],LOSS,mode));
    assert.throws(()=>processAdvancedAudio(Float32Array.of(NaN),SR,F,LOSS,mode));
  });
}
test("dcGC output changes with input-level-dependent control",()=>{
  const quiet=tone(4000,.03),loud=tone(4000,.3);
  const q=amplitude(processAdvancedAudio(quiet,SR,F,LOSS,"dcgc"),4000)/amplitude(quiet,4000);
  const l=amplitude(processAdvancedAudio(loud,SR,F,LOSS,"dcgc"),4000)/amplitude(loud,4000);
  assert.ok(q>0 && q<l && l<1, String([q,l]));
});
test("educational WDRC boosts relatively quiet input more than loud input",()=>{
  const quiet=tone(4000,.008),loud=tone(4000,.4);
  const q=amplitude(processAdvancedAudio(quiet,SR,F,LOSS,"aid"),4000)/amplitude(quiet,4000);
  const l=amplitude(processAdvancedAudio(loud,SR,F,LOSS,"aid"),4000)/amplitude(loud,4000);
  assert.ok(q>l, String([q,l]));
  const transient=new Float32Array(4096); transient[2048]=1.4;
  assert.ok(Math.max(...processAdvancedAudio(transient,SR,F,LOSS,"aid"))<=ADVANCED_MAX_PEAK+.00001);
});
