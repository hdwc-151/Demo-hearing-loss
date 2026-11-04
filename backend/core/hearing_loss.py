"""Educational frequency-selective attenuation for a *recorded waveform*.

This is intentionally NOT a cochlear model, a hearing aid, or an audiometry
calibration. Audiogram dB HL values select a bounded, heuristic gain curve.
Digital sample levels (dBFS) are never presented as dB HL or dB SPL.

The Python reference and frontend/src/util/hearingLoss.js use the same:
  periodic sqrt-Hann STFT, 50% hop, gain in the frequency domain,
  overlap/add with squared-window normalization and a bounded output.
No third-party repository source has been copied into this implementation.
"""
from __future__ import annotations

import numpy as np

DEFAULT_FRAME_SIZE = 1024
REFERENCE_DB_HL = 20.0
SLOPE = 0.5
MAX_ATTENUATION_DB = 32.0
OUTPUT_PEAK = 0.98


def _validate_profile(freqs_hz, thresholds_db_hl):
    freqs = np.asarray(freqs_hz, dtype=np.float64)
    thresholds = np.asarray(thresholds_db_hl, dtype=np.float64)
    if freqs.ndim != 1 or len(freqs) < 2 or thresholds.shape != freqs.shape:
        raise ValueError("freqs and thresholds must be matching 1-D vectors with >=2 points")
    if not np.all(np.isfinite(freqs)) or np.any(freqs <= 0) or np.any(np.diff(freqs) <= 0):
        raise ValueError("frequencies must be positive, finite and strictly increasing")
    if not np.all(np.isfinite(thresholds)) or np.any((thresholds < -10) | (thresholds > 110)):
        raise ValueError("thresholds must be finite in [-10, 110] dB HL")
    return freqs, thresholds


def attenuation_db(freq_hz, freqs_hz, thresholds_db_hl):
    """Heuristic *digital attenuation*, NOT the actual threshold in dB HL.

    Interpolate the input profile in log-frequency, subtract a 20 dB HL
    reference, scale by 0.5 and cap the resulting reduction at 32 dB.
    These constants are illustrative assumptions, not clinical fitting rules.
    """
    freqs, thresholds = _validate_profile(freqs_hz, thresholds_db_hl)
    frequency = np.asarray(freq_hz, dtype=np.float64)
    if not np.all(np.isfinite(frequency)) or np.any(frequency < 0):
        raise ValueError("requested frequency must be finite and nonnegative")
    interp = np.interp(
        np.log2(np.maximum(frequency, freqs[0])),
        np.log2(freqs),
        thresholds,
    )
    reduction = np.clip((interp - REFERENCE_DB_HL) * SLOPE, 0.0, MAX_ATTENUATION_DB)
    return float(reduction) if reduction.ndim == 0 else reduction


def process_audio(samples, sample_rate, freqs_hz, thresholds_db_hl, frame_size=DEFAULT_FRAME_SIZE):
    """Return filtered mono/stereo float samples of the same shape.

    This is an **offline** reference; clients enforce their own duration limits.
    Input shape: (samples,) or (samples, channels) with at most 2 channels.
    The function does not upmix, amplify, normalize loudness or write a file.
    """
    freqs, thresholds = _validate_profile(freqs_hz, thresholds_db_hl)
    if not isinstance(sample_rate, (int, np.integer)) or not 8000 <= sample_rate <= 192000:
        raise ValueError("sample_rate must be an integer in [8000, 192000]")
    if not isinstance(frame_size, int) or frame_size < 64 or frame_size & (frame_size - 1):
        raise ValueError("frame_size must be a power of two >= 64")
    x = np.asarray(samples, dtype=np.float64)
    if x.ndim not in (1, 2) or (x.ndim == 2 and x.shape[1] not in (1, 2)):
        raise ValueError("expected mono or stereo samples")
    if not np.all(np.isfinite(x)):
        raise ValueError("samples must be finite")
    if len(x) == 0:
        return x.astype(np.float32)
    if np.max(attenuation_db(freqs, freqs, thresholds)) == 0:
        return x.astype(np.float32)  # identity for an unaffected profile

    def process_channel(data):
        n = frame_size
        hop = n // 2
        window = np.sqrt(0.5 - 0.5 * np.cos(2 * np.pi * np.arange(n) / n))
        weights = window * window
        gains = 10 ** (-attenuation_db(np.fft.rfftfreq(n, 1 / sample_rate), freqs, thresholds) / 20)
        padded = np.pad(data, (n, n))
        result = np.zeros_like(padded)
        denominator = np.zeros_like(padded)
        for start in range(0, len(padded) - n + 1, hop):
            spectrum = np.fft.rfft(padded[start:start + n] * window)
            frame = np.fft.irfft(spectrum * gains, n=n)
            result[start:start + n] += frame * window
            denominator[start:start + n] += weights
        nonzero = denominator > 1e-10
        result[nonzero] /= denominator[nonzero]
        return np.clip(result[n:n + len(data)], -OUTPUT_PEAK, OUTPUT_PEAK).astype(np.float32)

    if x.ndim == 1:
        return process_channel(x)
    return np.stack([process_channel(x[:, c]) for c in range(x.shape[1])], axis=1)
