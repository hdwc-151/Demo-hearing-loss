"""Experimental dynamic Gammachirp-shaped spectrum and hearing-aid EQ/WDRC.

Research-only approximation: STFT magnitudes, not the true causal IIR dcGC.
Digital amplitude/dBFS is NOT calibrated stimulus dB SPL or hearing threshold
dB HL. No parameter is appropriate for programming a real hearing aid.
"""
from __future__ import annotations
import numpy as np
from .auditory_erb import erb_centers, erb_hz
from .hearing_loss import _validate_profile

MAX_PEAK = .8


def passive_gc(freq, center, chirp=-1.0):
    z = (freq - center) / (1.019 * erb_hz(center))
    return (1 + z * z) ** -2 * np.exp(chirp * np.arctan(z))


def asymmetric_hp(freq, shifted_center, strength):
    theta = np.arctan((freq - shifted_center) / erb_hz(shifted_center))
    return np.exp(strength * (theta - np.pi / 2))


def _process(audio, sr, freqs, thresholds, mode, frame=1024, bands=12):
    freqs, thresholds = _validate_profile(freqs, thresholds)
    if not isinstance(sr, (int, np.integer)) or not 8000 <= sr <= 48000:
        raise ValueError("sample rate must be between 8 and 48 kHz")
    if not isinstance(frame, int) or frame < 256 or frame & (frame - 1):
        raise ValueError("frame size must be a power of two >=256")
    if not isinstance(bands, int) or not 4 <= bands <= 32:
        raise ValueError("bands outside 4..32")
    x = np.asarray(audio, dtype=np.float64)
    if x.ndim not in (1, 2) or (x.ndim == 2 and x.shape[1] not in (1, 2)):
        raise ValueError("mono/stereo PCM required")
    if not np.all(np.isfinite(x)):
        raise ValueError("nonfinite audio")
    if len(x) == 0 or np.all(thresholds <= 20):
        return x.astype(np.float32)
    centers = erb_centers(sr, bands)
    profile = np.interp(np.log2(centers), np.log2(freqs), thresholds)
    severity = np.maximum(0, profile - 20)
    hz = np.fft.rfftfreq(frame, 1/sr)
    raw = np.stack([passive_gc(hz, f, -1.0 if mode == "dcgc" else 0.0)
                    for f in centers])
    masks = raw / np.sum(raw, axis=0, keepdims=True)
    base_gain = 10 ** (-np.minimum(18, severity * .20)/20)
    exp_strength = np.minimum(.5, severity/130)
    boost_db = np.minimum(6.0, severity * .075)
    n, hop = frame, frame//2
    window = np.sqrt(.5 - .5 * np.cos(2*np.pi*np.arange(n)/n))
    attack = np.exp(-hop/(sr*.015))
    release = np.exp(-hop/(sr*.125))

    def channel(data):
        padded = np.pad(data, (n, n))
        out, denominator = np.zeros_like(padded), np.zeros_like(padded)
        envelope = np.zeros(bands)
        previous = np.ones(bands)
        started = False
        for at in range(0, len(padded)-n+1, hop):
            spec = np.fft.rfft(padded[at:at+n]*window)
            power = np.abs(spec)**2
            power[1:-1] *= 2
            measured = 2/n*np.sqrt(masks @ power)
            if started:
                alpha = np.where(measured > envelope, attack, release)
                envelope = alpha*envelope + (1-alpha)*measured
            else:
                envelope = measured.copy()
            level_db = 20*np.log10(np.maximum(envelope, 1e-8))
            if mode == "dcgc":
                level = np.clip((level_db+70)/55, 0, 1)
                shifted = centers*(.80+.28*level)
                strengths = .95*(1-np.minimum(.75, severity/145))
                hp = np.stack([asymmetric_hp(hz, shifted[i], strengths[i])
                               for i in range(bands)])
                extra = np.maximum(1e-6, np.minimum(1, envelope/.12))**exp_strength
                gain_bins = np.sum(masks*hp*(base_gain*extra)[:,None], axis=0)
            elif mode == "aid":
                target_db = np.clip(boost_db-.5*np.maximum(0, level_db+35), -9, 6)
                target = 10**(target_db/20)
                if not started:
                    previous = target
                else:
                    alpha = np.where(target < previous, attack, release)
                    previous = alpha*previous+(1-alpha)*target
                gain_bins = masks.T @ previous
            else:
                raise ValueError("unknown mode")
            started = True
            frame_out = np.fft.irfft(spec*gain_bins, n=n)
            out[at:at+n] += frame_out*window
            denominator[at:at+n] += window**2
        good = denominator > 1e-10
        out[good] /= denominator[good]
        return out[n:n+len(data)]
    result = channel(x) if x.ndim == 1 else np.stack(
        [channel(x[:,c]) for c in range(x.shape[1])],axis=1)
    peak = np.max(np.abs(result)) if result.size else 0
    if peak > MAX_PEAK:
        result *= MAX_PEAK/peak
    return result.astype(np.float32)


def process_dynamic_gammachirp(samples, sample_rate, freqs_hz, thresholds_db_hl):
    return _process(samples, sample_rate, freqs_hz, thresholds_db_hl, "dcgc")


def process_hearing_aid_wdrc(samples, sample_rate, freqs_hz, thresholds_db_hl):
    return _process(samples, sample_rate, freqs_hz, thresholds_db_hl, "aid")
