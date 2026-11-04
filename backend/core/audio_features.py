"""Signal-level measurements for educational A/B comparison, NOT audiometry.

RMS and peak use digital full-scale sample amplitudes. Spectral centroid and
band-energy fractions are measured on Hann-windowed FFT frames; no feature
represents hearing sensitivity, dB HL, calibrated SPL, or speech intelligibility.
"""
from __future__ import annotations

import numpy as np


def analyze_audio(samples, sample_rate, frame_size=1024):
    if not isinstance(sample_rate, (int, np.integer)) or not 8000 <= sample_rate <= 192000:
        raise ValueError("sample_rate must be an integer from 8 kHz to 192 kHz")
    if not isinstance(frame_size, int) or frame_size < 64 or (frame_size & (frame_size - 1)):
        raise ValueError("frame_size must be a power of two >= 64")
    x = np.asarray(samples, dtype=np.float64)
    if x.ndim != 1 or x.size == 0 or not np.all(np.isfinite(x)):
        raise ValueError("samples must be nonempty, finite, and mono")
    rms = float(np.sqrt(np.mean(x**2)))
    peak = float(np.max(np.abs(x)))
    n, hop = frame_size, frame_size // 2
    window = np.sqrt(0.5 - 0.5 * np.cos(2 * np.pi * np.arange(n) / n))
    centers = np.arange(n // 2 + 1) * sample_rate / n
    low = mid = high = first_moment = total = 0.0
    for start in range(0, len(x), hop):
        chunk = np.zeros(n, dtype=np.float64)
        count = min(n, len(x) - start)
        chunk[:count] = x[start:start + count]
        spectrum = np.fft.rfft(chunk * window)
        energy = (spectrum.real ** 2 + spectrum.imag ** 2)
        # One-sided energy: double bins with negative-frequency partners.
        if n > 2:
            energy[1:-1] *= 2
        low += float(np.sum(energy[centers < 1000]))
        mid += float(np.sum(energy[(centers >= 1000) & (centers < 4000)]))
        high += float(np.sum(energy[centers >= 4000]))
        first_moment += float(np.sum(centers * energy))
        total += float(np.sum(energy))
    return {
        "rms": rms,
        "peak": peak,
        "centroidHz": first_moment / total if total > 1e-20 else 0.0,
        "lowPercent": 100 * low / total if total > 1e-20 else 0.0,
        "midPercent": 100 * mid / total if total > 1e-20 else 0.0,
        "highPercent": 100 * high / total if total > 1e-20 else 0.0,
    }
