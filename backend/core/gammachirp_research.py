"""Research-only analytic Gammachirp impulse-response prototype.

Mathematical formulation, independently written from published auditory-filter
principles (Irino/Patterson). NOT the complete *compressive* Gammachirp:
no level-dependent chirp control, no adaptive HPAF stage, no OHC/IHC fitting,
no calibrated SPL and no verified psychoacoustic reference corpus.

For t > 0:
  g(t) = t^(n-1) * exp(-2*pi*b*ERB(fc)*t)
                  * cos(2*pi*fc*t + c*ln(fc*t) + phase).
The coefficient c controls frequency-response asymmetry. c=0 is a
real-valued fourth-order gammatone-like impulse response.

A unit-L2 normalization is for numerical experiments ONLY and makes no
statement about audio amplification or calibrated auditory sensitivity.
"""
from __future__ import annotations

import numpy as np

from .auditory_erb import erb_hz


def gammachirp_kernel(
    center_hz: float,
    sample_rate: int,
    chirp: float = 0.0,
    order: int = 4,
    bandwidth_factor: float = 1.019,
    phase_rad: float = 0.0,
    duration_s: float = 0.08,
) -> np.ndarray:
    if not isinstance(sample_rate, int) or not 8000 <= sample_rate <= 192000:
        raise ValueError("sample rate must be an integer in [8000, 192000]")
    if not np.isfinite(center_hz) or not 80 <= center_hz < 0.45 * sample_rate:
        raise ValueError("center frequency outside usable analysis range")
    if not isinstance(order, int) or not 2 <= order <= 8:
        raise ValueError("order must be an integer 2..8")
    if (not np.isfinite(chirp) or abs(chirp) > 6 or
        not np.isfinite(bandwidth_factor) or not 0.2 <= bandwidth_factor <= 4 or
        not np.isfinite(phase_rad) or
        not np.isfinite(duration_s) or not 0.01 <= duration_s <= 0.25):
        raise ValueError("invalid experimental Gammachirp parameters")

    count = round(sample_rate * duration_s)
    t = (np.arange(count, dtype=np.float64) + 1.0) / sample_rate
    envelope = t ** (order - 1) * np.exp(
        -2.0 * np.pi * bandwidth_factor * erb_hz(center_hz) * t
    )
    instantaneous_phase = (2.0 * np.pi * center_hz * t +
                           chirp * np.log(center_hz * t) + phase_rad)
    kernel = envelope * np.cos(instantaneous_phase)
    norm = np.linalg.norm(kernel)
    if not np.isfinite(norm) or norm < np.finfo(float).tiny:
        raise ValueError("kernel is numerically degenerate")
    return (kernel / norm).astype(np.float64)


def response_peak_hz(kernel: np.ndarray, sample_rate: int, fft_size: int = 32768) -> float:
    """Peak magnitude in Hz, for controlled laboratory comparisons only."""
    values = np.asarray(kernel, dtype=np.float64)
    if values.ndim != 1 or values.size < 2 or values.size > fft_size or not np.all(np.isfinite(values)):
        raise ValueError("invalid impulse response")
    if not isinstance(fft_size, int) or fft_size < 2 or fft_size & (fft_size - 1):
        raise ValueError("fft_size must be a power of two")
    if not isinstance(sample_rate, int) or sample_rate < 8000 or sample_rate > 192000:
        raise ValueError("invalid sample rate")
    spectrum = np.abs(np.fft.rfft(values, n=fft_size))
    frequencies = np.fft.rfftfreq(fft_size, 1.0 / sample_rate)
    return float(frequencies[int(np.argmax(spectrum))])
