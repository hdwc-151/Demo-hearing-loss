import { FREQS } from "../data/constants";

let sharedCtx = null;

export function getAudioCtx() {
  if (!sharedCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    sharedCtx = new AC();
  }
  return sharedCtx;
}

export function peekAudioCtx() {
  return sharedCtx;
}

export function computeHearingAidEQ(thresholds = [10, 10, 10, 15, 15, 15]) {
  const ref = Math.min(...thresholds, 15);
  const losses = thresholds.map((t) => Math.max(0, t - ref));
  const clip = (g) => Math.round(Math.max(0, Math.min(25, g)) * 10) / 10;

  const eq500 = clip(0.4 * ((losses[0] + losses[1]) / 2));
  const eq2000 = clip(0.4 * ((losses[2] + losses[3]) / 2));
  const eq4000 = clip(0.4 * ((losses[4] + losses[5]) / 2));
  const pta4 = Math.round(((thresholds[1] + thresholds[2] + thresholds[3] + thresholds[4]) / 4) * 10) / 10;

  const compensatedThresholds = thresholds.map((t, i) => {
    const g = i < 2 ? eq500 : i < 4 ? eq2000 : eq4000;
    return Math.max(10, Math.round(t - g));
  });

  return { eq500, eq2000, eq4000, pta4, compensatedThresholds };
}

export function createCochlearFilterBank(
  ctx,
  thresholds = [10, 10, 10, 15, 15, 15],
  cutoffHz = 8000,
  hearingAidOn = false
) {
  const filters = FREQS.map((freq, idx) => {
    const f = ctx.createBiquadFilter();
    f.type = idx === 0 ? "lowshelf" : idx === FREQS.length - 1 ? "highshelf" : "peaking";
    f.frequency.value = freq;
    f.Q.value = 1.4;
    return f;
  });

  const eqBands = [500, 2000, 4000].map((hz) => {
    const eq = ctx.createBiquadFilter();
    eq.type = "peaking";
    eq.frequency.value = hz;
    eq.Q.value = 1.0;
    eq.gain.value = 0;
    return eq;
  });

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = cutoffHz;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 12;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.15;

  for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);
  filters[filters.length - 1].connect(eqBands[0]);
  eqBands[0].connect(eqBands[1]);
  eqBands[1].connect(eqBands[2]);
  eqBands[2].connect(lp);
  lp.connect(compressor);

  const applyParams = (th, cut, aidOn, tc = 0.08) => {
    const t = ctx.currentTime;
    const { eq500, eq2000, eq4000 } = computeHearingAidEQ(th);
    filters.forEach((f, idx) => {
      const lossDb = Math.max(0, (th[idx] ?? 15) - 15);
      f.gain.setTargetAtTime(-Math.min(36, lossDb * 0.45), t, tc);
    });
    eqBands[0].gain.setTargetAtTime(aidOn ? eq500 : 0, t, tc);
    eqBands[1].gain.setTargetAtTime(aidOn ? eq2000 : 0, t, tc);
    eqBands[2].gain.setTargetAtTime(aidOn ? eq4000 : 0, t, tc);
    const targetCut = aidOn ? Math.min(8000, Math.round(cut * 2.1)) : cut;
    lp.frequency.setTargetAtTime(targetCut, t, tc);
  };

  applyParams(thresholds, cutoffHz, hearingAidOn, 0.001);

  return {
    input: filters[0],
    output: compressor,
    filters,
    eqBands,
    lp,
    compressor,
    update: applyParams,
  };
}

export function cutoffFromThresholds(thresholds = [10, 10, 10, 15, 15, 15]) {
  const highAvg = ((thresholds[3] ?? 15) + (thresholds[4] ?? 15) + (thresholds[5] ?? 15)) / 3;
  if (highAvg <= 20) return 8000;
  if (highAvg >= 90) return 420;
  const ratio = (highAvg - 20) / 70;
  return Math.round(8000 * Math.pow(420 / 8000, ratio));
}

export class Staircase2Down1Up {
  constructor(startDb = 40) {
    this.levelDb = startDb;
    this.step = 10;
    this.reversals = [];
    this.lastDir = null;
    this.correctStreak = 0;
  }

  update(correct) {
    let newDir = this.lastDir;
    if (correct) {
      this.correctStreak += 1;
      if (this.correctStreak >= 2) {
        this.correctStreak = 0;
        newDir = "down";
        this.levelDb -= this.step;
      }
    } else {
      this.correctStreak = 0;
      newDir = "up";
      this.levelDb += this.step;
    }

    if (this.lastDir !== null && newDir !== null && newDir !== this.lastDir) {
      this.reversals.push(this.levelDb);
    }
    this.lastDir = newDir;
    if (this.reversals.length >= 2) this.step = 5;
    this.levelDb = Math.max(0, Math.min(100, Math.round(this.levelDb / 5) * 5));
  }

  done(maxReversals = 4) {
    return this.reversals.length >= maxReversals;
  }

  threshold() {
    if (!this.reversals.length) return this.levelDb;
    const tail = this.reversals.slice(-3);
    const avg = tail.reduce((a, b) => a + b, 0) / tail.length;
    return Math.round(avg / 5) * 5;
  }
}
