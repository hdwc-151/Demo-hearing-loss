import functools
import io
import wave
import zlib
import numpy as np

from . import gan
from .constants import SCENARIOS, SCENARIO_IDX, LEVEL_CUTOFF, LEVEL_NOISE_GAIN

SR = 22050
MIN_SECONDS, MAX_SECONDS = 0.5, 10.0

SYLLABLE_HZ = 4.0
SYLLABLE_BW_HZ = 1.5
MOD_DEPTH = 0.5

TILT_REF_HZ = 500.0
TILT_POWER_EXP = 2.0
LP_ORDER = 4

RMS_SCALE = 0.35
CROSSFADE = 512


def default_seed(scenario: str, level: str) -> int:
    return zlib.crc32(f"{scenario}|{level}".encode()) & 0xFFFFFFFF


def modulation_envelope(n: int, rng: np.random.Generator) -> np.ndarray:
    w = rng.standard_normal(n)
    W = np.fft.rfft(w)
    f = np.fft.rfftfreq(n, 1.0 / SR)
    W *= np.exp(-0.5 * ((f - SYLLABLE_HZ) / SYLLABLE_BW_HZ) ** 2)
    b = np.fft.irfft(W, n=n)
    sd = b.std()
    if sd > 0:
        b = b / sd
    return np.clip(1.0 + MOD_DEPTH * b, 0.05, None)


def shaped_noise(n: int, scenario: str, level: str, rng: np.random.Generator) -> np.ndarray:
    cfg = SCENARIOS.get(scenario, {"noise_freq": 1000, "noise_q": 1.0})
    cutoff = LEVEL_CUTOFF.get(level, 8000)

    X = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1.0 / SR)
    fs = np.maximum(f, 1.0)

    tilt_pow = np.where(f <= TILT_REF_HZ, 1.0, (fs / TILT_REF_HZ) ** (-TILT_POWER_EXP))
    fc = cfg["noise_freq"]
    q = max(cfg["noise_q"], 0.1)
    emph = 1.0 + 1.5 * np.exp(-((np.log2(fs) - np.log2(fc)) ** 2) * (q * 2.0))
    lp = 1.0 / np.sqrt(1.0 + (f / cutoff) ** (2 * LP_ORDER))

    X *= np.sqrt(tilt_pow) * emph * lp
    X[0] = 0.0
    return np.fft.irfft(X, n=n)


def _normalize(y: np.ndarray, level: str) -> np.ndarray:
    y = y - y.mean()
    rms = float(np.sqrt(np.mean(y * y)))
    if rms == 0.0:
        return np.zeros(len(y), dtype=np.float32)
    y = y / rms * LEVEL_NOISE_GAIN.get(level, 0.1) * RMS_SCALE
    return np.clip(y, -1.0, 1.0).astype(np.float32)


def render_procedural(scenario: str, level: str, seconds: float, seed: int) -> np.ndarray:
    n = int(round(SR * seconds))
    rng = np.random.default_rng(seed)
    y = shaped_noise(n, scenario, level, rng) * modulation_envelope(n, rng)
    return _normalize(y, level)


def loop_to(seg: np.ndarray, n: int, fade: int = CROSSFADE) -> np.ndarray:
    L = len(seg)
    if L >= n:
        return seg[:n].astype(np.float64)
    fade = min(fade, L // 2)
    s = seg.astype(np.float64).copy()
    if fade > 1:
        ramp = np.linspace(0.0, 1.0, fade)
        s[:fade] *= ramp
        s[-fade:] *= ramp[::-1]
    step = L - fade
    reps = int(np.ceil((n - L) / step)) + 1
    out = np.zeros(reps * step + fade)
    for k in range(reps):
        out[k * step: k * step + L] += s
    return out[:n]


def _gan_samples(scenario: str, level: str, seconds: float, seed: int):
    raw = gan.sample(SCENARIO_IDX.get(scenario, 0), seed)
    if raw is None:
        return None
    n = int(round(SR * seconds))
    return _normalize(loop_to(raw, n), level)


def _to_wav_bytes(y: np.ndarray) -> bytes:
    pcm = (np.clip(y, -1.0, 1.0) * 32767).astype("<i2")
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()


@functools.lru_cache(maxsize=128)
def _cached(scenario: str, level: str, seconds: float, seed: int):
    y = _gan_samples(scenario, level, seconds, seed)
    if y is not None:
        return _to_wav_bytes(y), "gan"
    return _to_wav_bytes(render_procedural(scenario, level, seconds, seed)), "procedural"


def generate_wav(scenario: str, level: str, seconds: float = 3.0, seed=None):
    seconds = round(min(max(float(seconds), MIN_SECONDS), MAX_SECONDS), 1)
    if seed is None:
        seed = default_seed(scenario, level)
    return _cached(scenario, level, seconds, int(seed))


def mix_snr(speech: np.ndarray, noise: np.ndarray, snr_db: float) -> np.ndarray:
    n = min(len(speech), len(noise))
    s, no = speech[:n], noise[:n]
    ps = np.mean(s ** 2) or 1e-9
    pn = np.mean(no ** 2) or 1e-9
    k = np.sqrt(ps / (pn * (10 ** (snr_db / 10))))
    return s + k * no
