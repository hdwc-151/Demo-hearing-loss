"""Generate deterministic Python waveform reference data for JavaScript ERB parity."""
from __future__ import annotations

import json
import pathlib
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
from core.auditory_erb import process_auditory_erb

RATE = 16000
FREQS = [250, 500, 1000, 2000, 4000, 8000]
N = 2048
t = np.arange(N) / RATE


def case(label, signal, profile):
    src = np.asarray(signal, dtype=np.float32)
    out = process_auditory_erb(src, RATE, FREQS, profile)
    return {
        "name": label, "rate": RATE, "freqs": FREQS, "thresholds": profile,
        "samples": src.tolist(), "expected": out.tolist(),
    }


def main():
    pulse = np.zeros(N)
    pulse[N // 2] = 0.4
    examples = [
        case("healthy-identity", .2 * np.sin(2 * np.pi * 1000 * t), [10, 10, 10, 15, 15, 15]),
        case("high-frequency-loss", .13 * np.sin(2 * np.pi * 500 * t) +
             .11 * np.sin(2 * np.pi * 4000 * t), [15, 15, 20, 45, 80, 90]),
        case("broad-loss-levels", .03 * np.sin(2 * np.pi * 1250 * t) +
             .25 * np.sin(2 * np.pi * 6000 * t), [70, 70, 70, 70, 70, 70]),
        case("silent", np.zeros(N), [55, 65, 75, 85, 95, 100]),
        case("transient", pulse, [55, 65, 75, 85, 95, 100]),
    ]
    dest = ROOT / "tests" / "research" / ".auditory-parity-fixture.json"
    dest.write_text(json.dumps({"cases": examples}, separators=(",", ":")), encoding="utf-8")
    print("Generated", len(examples), "deterministic Python ERB reference waveforms")


if __name__ == "__main__":
    main()
