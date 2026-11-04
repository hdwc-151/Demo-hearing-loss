import pathlib
import sys

import numpy as np
import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "backend"))
from core.audio_features import analyze_audio


def test_silent_audio_has_zero_spectrum():
    v = analyze_audio(np.zeros(4096), 16000)
    assert v["rms"] == v["peak"] == v["centroidHz"] == v["highPercent"] == 0


def test_tone_features_track_frequency():
    fs, n = 16000, 8192
    time = np.arange(n) / fs
    low = analyze_audio(0.25 * np.sin(2 * np.pi * 500 * time), fs)
    high = analyze_audio(0.25 * np.sin(2 * np.pi * 5000 * time), fs)
    assert 475 < low["centroidHz"] < 525
    assert 4950 < high["centroidHz"] < 5050
    assert low["lowPercent"] > 95
    assert high["highPercent"] > 95
    assert 0.17 < low["rms"] < 0.18
    assert 0.24 < low["peak"] <= 0.25001


def test_proportions_sum_to_100_and_reject_nonfinite():
    x = np.sin(2 * np.pi * 1000 * np.arange(2048) / 16000)
    values = analyze_audio(x, 16000)
    assert abs(sum(values[k] for k in ("lowPercent", "midPercent", "highPercent")) - 100) < 1e-7
    with pytest.raises(ValueError):
        analyze_audio(np.array([1, np.inf]), 16000)
    with pytest.raises(ValueError):
        analyze_audio(np.array([]), 16000)
    with pytest.raises(ValueError):
        analyze_audio(np.array([[0, 1]]), 16000)
