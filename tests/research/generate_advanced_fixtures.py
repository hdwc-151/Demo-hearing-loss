"""Temporary waveform fixtures: cross-check advanced DSP Python ↔ JS in CI.

Generated files remain in runner workspace only; never publish audio fixtures
or include user recordings. Levels are dimensionless digital full-scale.
"""
from __future__ import annotations

import json
import pathlib
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
from core.auditory_advanced import process_dynamic_gammachirp, process_hearing_aid_wdrc

FS = 16000
FREQS = [250, 500, 1000, 2000, 4000, 8000]
t = np.arange(2048) / FS


def main():
    pulse = np.zeros(len(t))
    pulse[len(t)//2] = 0.8
    samples = [
        ("normal", .11*np.sin(2*np.pi*1000*t), [10, 10, 10, 15, 15, 15]),
        ("high-frequency-loss", .14*np.sin(2*np.pi*500*t) + .12*np.sin(2*np.pi*4000*t), [15,15,20,45,80,90]),
        ("quiet", .01*np.sin(2*np.pi*4000*t), [15,15,20,45,80,90]),
        ("broad-loss", .20*np.sin(2*np.pi*2500*t), [65,65,65,65,65,65]),
        ("silence", np.zeros(len(t)), [75,75,75,75,75,75]),
        ("transient", pulse, [15,15,20,45,80,90]),
    ]
    cases = []
    for name, src, profile in samples:
        x = np.asarray(src, dtype=np.float32)
        for mode, processor in [("dcgc",process_dynamic_gammachirp),
                                ("aid",process_hearing_aid_wdrc)]:
            out = processor(x, FS, FREQS, profile)
            cases.append({"case":name,"mode":mode,"sampleRate":FS,"freqs":FREQS,
                          "thresholds":profile,"pcm":x.tolist(),"expected":out.tolist()})
    dest=ROOT/"tests"/"research"/".advanced-parity-fixture.json"
    dest.write_text(json.dumps({"cases":cases},separators=(",",":")),encoding="utf-8")
    print("Generated",len(cases),"advanced Python audio regression vectors")


if __name__ == "__main__":
    main()
