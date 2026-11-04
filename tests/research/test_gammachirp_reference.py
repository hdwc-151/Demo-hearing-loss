"""Independent numeric *implementation* reference checks (not clinical validation).

Compares the c=0, fourth-order Gammachirp research kernel with SciPy's
well-tested FIR gammatone implementation. For matched center frequency, sample
rate, order=4, bandwidth factor=1.019 and duration, response magnitudes should
closely agree up to a scale factor. Compares the SHAPE of the frequency response,
not calibrated loudness or clinical accuracy.

SciPy is deliberately a separate test-only dependency (research CI job).
"""
from __future__ import annotations

import pathlib
import sys

import numpy as np
import pytest
from scipy.signal import gammatone

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "backend"))
from core.gammachirp_research import gammachirp_kernel, response_peak_hz
from core.auditory_erb import erb_hz, process_auditory_erb

SAMPLE_RATE = 16000
FFT_SIZE = 32768
FREQS = [250, 500, 1000, 2000, 4000, 8000]
LOSS = [15, 15, 20, 45, 80, 90]


def magnitude_response(impulse):
    spectrum = np.abs(np.fft.rfft(impulse, n=FFT_SIZE))
    return spectrum / np.max(spectrum)


@pytest.mark.parametrize("center_hz", [250, 500, 1000, 2000, 4000])
def test_gammachirp_zero_chirp_matches_scipy_gammatone_shape(center_hz):
    ours = gammachirp_kernel(
        center_hz, SAMPLE_RATE, chirp=0, order=4, bandwidth_factor=1.019,
        phase_rad=0, duration_s=0.08,
    )
    # SciPy's FIR implementation is the reference; this is NOT the dynamic,
    # level-dependent compressive Gammachirp of the research literature.
    scipy_fir, _ = gammatone(
        center_hz, "fir", fs=SAMPLE_RATE, numtaps=len(ours),
    )
    ours_mag = magnitude_response(ours)
    scipy_mag = magnitude_response(scipy_fir)
    hz = np.fft.rfftfreq(FFT_SIZE, d=1 / SAMPLE_RATE)
    within_3erb = np.abs(hz - center_hz) <= 3 * erb_hz(center_hz)
    errors = np.abs(ours_mag[within_3erb] - scipy_mag[within_3erb])
    mean_abs_error = float(errors.mean())
    maximum_error = float(errors.max())
    assert mean_abs_error < 0.002, (center_hz, mean_abs_error)
    assert maximum_error < 0.02, (center_hz, maximum_error)
    assert abs(response_peak_hz(ours, SAMPLE_RATE) - center_hz) < 3


def _tone(frequency_hz, level, seconds=0.5):
    times = np.arange(round(SAMPLE_RATE * seconds)) / SAMPLE_RATE
    return level * np.sin(2 * np.pi * frequency_hz * times)


def _tone_amp(signal, frequency_hz):
    signal = np.asarray(signal, dtype=np.float64)
    time = np.arange(len(signal)) / SAMPLE_RATE
    # Exclude the first/last 50ms to suppress windowed-overlap boundaries.
    mask = (time >= .05) & (time < time[-1] - .05)
    x = signal[mask]
    t = time[mask]
    return abs(2 * np.mean(x * np.exp(-2j * np.pi * frequency_hz * t)))


def test_erb_level_dependent_expansion_is_bounded_and_monotone():
    """Heuristic expansion suppresses *quiet* sounds relatively more than loud.

    These are numerical invariants; no fitting to patient audiograms/psychoacoustics.
    """
    gains = []
    for level in [0.01, 0.04, 0.16]:
        input_tone = _tone(4000, level)
        output = process_auditory_erb(input_tone, SAMPLE_RATE, FREQS, LOSS)
        gain = _tone_amp(output, 4000) / _tone_amp(input_tone, 4000)
        assert np.isfinite(output).all() and abs(output).max() <= .980001
        assert 0 < gain <= 1.001
        gains.append(gain)
    assert gains[0] < gains[1] < gains[2], gains


def test_healthy_audiogram_has_identity_at_all_levels():
    profile = [10, 10, 10, 15, 15, 15]
    for level in [0.01, 0.1, 0.4]:
        signal = _tone(1000, level).astype(np.float32)
        out = process_auditory_erb(signal, SAMPLE_RATE, FREQS, profile)
        np.testing.assert_array_equal(out, signal)
