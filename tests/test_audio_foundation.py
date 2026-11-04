"""Regression tests for the illustrative audio foundation (independent Python reference)."""
import pathlib
import sys

import numpy as np
import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "backend"))
from core.hearing_loss import attenuation_db, process_audio


FREQS = [250, 500, 1000, 2000, 4000, 8000]
NORMAL = [10, 10, 10, 15, 15, 15]
HIGH = [10, 10, 10, 20, 95, 95]


def test_attenuation_is_bounded_and_interpolates_on_log_axis():
    assert attenuation_db(500, FREQS, HIGH) == 0
    assert attenuation_db(4000, FREQS, HIGH) == 32
    assert attenuation_db(2**11, FREQS, HIGH) > 0
    assert np.all(attenuation_db([200, 8000, 25000], FREQS, HIGH) <= 32)


def test_normal_profile_is_exact_passthrough():
    signal = np.linspace(-0.3, 0.3, 100, dtype=np.float32)
    np.testing.assert_array_equal(process_audio(signal, 16000, FREQS, NORMAL), signal)


def _tone_amplitude(data, frequency, fs):
    t = np.arange(len(data)) / fs
    # Project away from endpoints; synthetic tones fall on integer cycles.
    return np.abs(2 * np.mean(data * np.exp(-2j * np.pi * frequency * t)))


def test_high_frequency_is_suppressed_more_than_low():
    fs = 16000
    t = np.arange(8192) / fs
    x = 0.22 * np.sin(2 * np.pi * 500 * t) + 0.22 * np.sin(2 * np.pi * 4000 * t)
    y = process_audio(x, fs, FREQS, HIGH)
    ratio_low = _tone_amplitude(y, 500, fs) / _tone_amplitude(x, 500, fs)
    ratio_high = _tone_amplitude(y, 4000, fs) / _tone_amplitude(x, 4000, fs)
    assert 0.85 <= ratio_low <= 1.05
    assert ratio_high < 0.12


def test_stereo_shape_peak_and_determinism():
    x = np.tile(np.array([[0.4, -0.4], [0.1, 0.2]], dtype=np.float32), (4096, 1))
    a = process_audio(x, 16000, FREQS, HIGH)
    b = process_audio(x, 16000, FREQS, HIGH)
    assert a.shape == x.shape
    assert a.dtype == np.float32
    assert np.max(np.abs(a)) <= 0.98001
    np.testing.assert_array_equal(a, b)


@pytest.mark.parametrize("freqs,thresholds", [
    ([500, 250], [30, 40]),
    ([0, 250], [30, 40]),
    ([250, 500], [30, float("nan")]),
    ([250, 500], [30, 111]),
    ([250, 500], [30]),
])
def test_bad_audiograms_fail_closed(freqs, thresholds):
    with pytest.raises(ValueError):
        process_audio(np.zeros(100), 16000, freqs, thresholds)


def test_rejects_invalid_signal_and_sample_rate():
    with pytest.raises(ValueError):
        process_audio(np.array([0.0, np.nan]), 16000, FREQS, HIGH)
    with pytest.raises(ValueError):
        process_audio(np.zeros(100), 3000, FREQS, HIGH)
