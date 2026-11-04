"""Non-clinical invariants for experimental ERB auditory-band filtering."""
import pathlib
import sys

import numpy as np
import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "backend"))
from core.auditory_erb import erb_centers, erb_hz, erb_rate, process_auditory_erb

FREQS = [250, 500, 1000, 2000, 4000, 8000]
NORMAL = [10, 10, 10, 15, 15, 15]
LOSS = [15, 15, 20, 45, 80, 90]


def tone(f, amplitude, fs=16000, size=8192):
    return amplitude * np.sin(2 * np.pi * f * np.arange(size) / fs)


def spectral_amplitude(x, f, fs=16000):
    return abs(2 * np.mean(np.asarray(x) * np.exp(-2j * np.pi * f * np.arange(len(x)) / fs)))


def test_erb_analytic_reference():
    assert erb_hz(1000) == pytest.approx(24.7 * 5.37, rel=1e-12)
    assert erb_rate(1000) == pytest.approx(21.4 * np.log10(5.37), rel=1e-12)
    c = erb_centers(16000)
    assert len(c) == 12 and np.all(np.diff(c) > 0)
    assert c[0] == pytest.approx(250, rel=1e-9)
    assert c[-1] == pytest.approx(6880, rel=1e-9)


def test_normal_profile_exact_identity():
    x = tone(1000, 0.2)
    np.testing.assert_array_equal(process_auditory_erb(x, 16000, FREQS, NORMAL), x.astype(np.float32))


def test_erb_model_attenuates_high_frequency_more():
    x = tone(500, 0.2) + tone(4000, 0.2)
    y = process_auditory_erb(x, 16000, FREQS, LOSS)
    low = spectral_amplitude(y, 500) / spectral_amplitude(x, 500)
    high = spectral_amplitude(y, 4000) / spectral_amplitude(x, 4000)
    assert low > high, (low, high)
    assert high < 0.8


def test_level_dependent_expansion_is_not_linear_gain():
    quiet = tone(4000, 0.02)
    loud = tone(4000, 0.3)
    quiet_out = process_auditory_erb(quiet, 16000, FREQS, LOSS)
    loud_out = process_auditory_erb(loud, 16000, FREQS, LOSS)
    q = spectral_amplitude(quiet_out, 4000) / spectral_amplitude(quiet, 4000)
    l = spectral_amplitude(loud_out, 4000) / spectral_amplitude(loud, 4000)
    assert q < l < 1.0, (q, l)


def test_bounds_shape_stereo_and_determinism():
    x = np.stack([tone(500, 0.25), tone(4000, 0.25)], axis=1)
    a = process_auditory_erb(x, 16000, FREQS, LOSS)
    b = process_auditory_erb(x, 16000, FREQS, LOSS)
    assert a.shape == x.shape
    assert a.dtype == np.float32 and np.all(np.isfinite(a))
    assert np.max(np.abs(a)) <= 0.980001
    np.testing.assert_array_equal(a, b)


@pytest.mark.parametrize("bad", [0, 900, 5000])
def test_invalid_sample_rate_rejected(bad):
    with pytest.raises(ValueError):
        process_auditory_erb(tone(500, 0.2), bad, FREQS, LOSS)


def test_nonfinite_and_bad_audiogram_rejected():
    with pytest.raises(ValueError):
        process_auditory_erb([0.1, np.nan], 16000, FREQS, LOSS)
    with pytest.raises(ValueError):
        process_auditory_erb([0.1], 16000, FREQS[::-1], LOSS)
