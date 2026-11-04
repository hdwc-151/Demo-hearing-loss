"""Analytic checks for the research-only Gammachirp kernel, not clinical data."""
import pathlib
import sys

import numpy as np
import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "backend"))
from core.gammachirp_research import gammachirp_kernel, response_peak_hz


def _response_at(values, freq, sr=16000):
    f = np.fft.rfftfreq(32768, 1 / sr)
    s = abs(np.fft.rfft(values, n=32768))
    return s[np.argmin(abs(f - freq))]


def test_c_equals_zero_is_symmetric_gammatone_like():
    x = gammachirp_kernel(1000, 16000, chirp=0)
    assert len(x) == 1280 and np.isfinite(x).all()
    assert np.linalg.norm(x) == pytest.approx(1, abs=1e-12)
    assert response_peak_hz(x, 16000) == pytest.approx(1000, abs=2)
    assert _response_at(x, 900) / _response_at(x, 1100) == pytest.approx(1, rel=0.05)


def test_chirp_sign_controls_spectral_asymmetry():
    neg = gammachirp_kernel(1000, 16000, chirp=-2)
    pos = gammachirp_kernel(1000, 16000, chirp=2)
    assert response_peak_hz(neg, 16000) < 1000
    assert response_peak_hz(pos, 16000) > 1000
    assert _response_at(neg, 900) > _response_at(neg, 1100)
    assert _response_at(pos, 900) < _response_at(pos, 1100)


def test_impulse_response_determinism():
    x = gammachirp_kernel(500, 16000, chirp=0.5, order=4)
    np.testing.assert_array_equal(x, gammachirp_kernel(500, 16000, chirp=0.5, order=4))


@pytest.mark.parametrize("kwargs", [
    {"center_hz": 8000, "sample_rate": 16000},
    {"center_hz": 50, "sample_rate": 16000},
    {"center_hz": 1000, "sample_rate": 16000, "chirp": float("nan")},
    {"center_hz": 1000, "sample_rate": 16000, "order": 0},
    {"center_hz": 1000, "sample_rate": 16000, "duration_s": 1.0},
])
def test_invalid_params_rejected(kwargs):
    with pytest.raises(ValueError):
        gammachirp_kernel(**kwargs)
