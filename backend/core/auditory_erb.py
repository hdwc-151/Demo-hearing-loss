"""Experimental ERB-spaced auditory-band model (original educational DSP).

NOT a Gammachirp implementation and NOT a validated physiological simulation.
The ERB-rate axis and ERB(f)=24.7*(1+4.37*f/1000) follow common psychoacoustics
approximations. The fourth-order spectral weights and envelope-dependent
attenuation are a phenomenological model: they demonstrate bandwidth and
compression-loss behaviour, not OHC/IHC parameters from clinical audiograms.
Never interpret input dB HL values as dBFS or calibrated sound pressure.
"""
from __future__ import annotations

import numpy as np

from .hearing_loss import _validate_profile

N_BANDS = 12
FRAME_SIZE = 1024
MAX_PEAK = 0.98
ENVELOPE_REFERENCE = 0.12


def erb_hz(freq_hz):
    f = np.asarray(freq_hz, dtype=np.float64)
    if np.any(~np.isfinite(f)) or np.any(f < 0):
        raise ValueError("frequency must be finite and nonnegative")
    result = 24.7 * (1.0 + 4.37 * f / 1000.0)
    return float(result) if result.ndim == 0 else result


def erb_rate(freq_hz):
    f = np.asarray(freq_hz, dtype=np.float64)
    if np.any(~np.isfinite(f)) or np.any(f < 0):
        raise ValueError("frequency must be finite and nonnegative")
    result = 21.4 * np.log10(1.0 + 0.00437 * f)
    return float(result) if result.ndim == 0 else result


def erb_centers(sample_rate, bands=N_BANDS):
    if not isinstance(sample_rate, (int, np.integer)) or not 8000 <= sample_rate <= 192000:
        raise ValueError("sample rate outside 8–192 kHz")
    if not isinstance(bands, int) or not 4 <= bands <= 32:
        raise ValueError("bands must be 4..32")
    start, stop = erb_rate(250), erb_rate(min(8000.0, sample_rate * 0.43))
    r = np.linspace(start, stop, bands)
    return np.expm1(r * np.log(10) / 21.4) / 0.00437


def _profiles(freqs_hz, thresholds_db_hl, centers):
    freqs, thresholds = _validate_profile(freqs_hz, thresholds_db_hl)
    interp = np.interp(np.log2(centers), np.log2(freqs), thresholds)
    severity = np.maximum(0.0, interp - 20.0)
    base_db = np.minimum(18.0, severity * 0.22)
    strength = np.minimum(0.6, severity / 120.0)
    return base_db, strength


def _masks(sample_rate, frame_size, centers):
    hz = np.fft.rfftfreq(frame_size, d=1.0 / sample_rate)[None, :]
    centers = centers[:, None]
    # Symmetric fourth-order auditory-band approximation, NOT an asymmetric gammachirp.
    radius = (hz - centers) / (1.02 * erb_hz(centers))
    raw = (1.0 + radius**2) ** -2
    # Partition of unity across bands, allowing bypass to preserve energy.
    return raw / np.sum(raw, axis=0, keepdims=True)


def process_auditory_erb(samples, sample_rate, freqs_hz, thresholds_db_hl,
                        frame_size=FRAME_SIZE, bands=N_BANDS):
    """Offline, causality-free demo processor for mono/stereo float PCM.

    Frequency selectivity is represented by ERB-spaced spectral bands and a
    per-frame *illustrative expander* for loss-of-compression behaviour.
    This is NOT a clinical fitting formula and has no hearing-aid compensation.
    """
    freqs, thresholds = _validate_profile(freqs_hz, thresholds_db_hl)
    centers = erb_centers(sample_rate, bands)
    if not isinstance(frame_size, int) or frame_size < 64 or frame_size & (frame_size - 1):
        raise ValueError("frame_size must be a power of two >=64")
    x = np.asarray(samples, dtype=np.float64)
    if x.ndim not in (1, 2) or (x.ndim == 2 and x.shape[1] not in (1, 2)):
        raise ValueError("samples must be mono or stereo PCM")
    if not np.all(np.isfinite(x)):
        raise ValueError("samples must be finite")
    if len(x) == 0 or np.all(thresholds <= 20):
        return x.astype(np.float32)

    base_db, strength = _profiles(freqs, thresholds, centers)
    masks = _masks(sample_rate, frame_size, centers)
    n, hop = frame_size, frame_size // 2
    window = np.sqrt(0.5 - 0.5 * np.cos(2 * np.pi * np.arange(n) / n))
    weights = window * window
    base_gain = 10.0 ** (-base_db / 20.0)

    def channel(data):
        padded = np.pad(data, (n, n))
        out = np.zeros_like(padded)
        denom = np.zeros_like(padded)
        smoothed = np.zeros(bands)
        started = False
        for start in range(0, len(padded) - n + 1, hop):
            spec = np.fft.rfft(padded[start:start + n] * window)
            power = np.abs(spec) ** 2
            power[1:-1] *= 2
            # Digital relative band envelope; not SPL or a loudness measure.
            amplitude = 2.0 / n * np.sqrt(masks @ power)
            smoothed = (smoothed * 0.5 + amplitude * 0.5) if started else amplitude
            started = True
            ratio = np.clip(smoothed / ENVELOPE_REFERENCE, 1e-7, 1.0)
            dynamic_gain = base_gain * ratio**strength
            gain_bins = masks.T @ dynamic_gain
            frame = np.fft.irfft(spec * gain_bins, n=n)
            out[start:start + n] += frame * window
            denom[start:start + n] += weights
        valid = denom > 1e-10
        out[valid] /= denom[valid]
        return np.clip(out[n:n + len(data)], -MAX_PEAK, MAX_PEAK).astype(np.float32)

    if x.ndim == 1:
        return channel(x)
    return np.stack([channel(x[:, c]) for c in range(x.shape[1])], axis=1)
