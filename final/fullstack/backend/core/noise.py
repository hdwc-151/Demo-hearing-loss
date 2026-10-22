"""Nhiễu nền môi trường (WAV 16-bit mono) cho mô phỏng.

Hai đường sinh:
  - GAN (core/gan.py): chỉ khi có torch + GAN_CKPT. Output ~16384 mẫu -> lặp có crossfade.
  - Thủ tục (mặc định): nhiễu trắng -> độ dốc phổ kiểu lời nói -> nhấn dải kịch bản
    -> lowpass mềm theo cấp độ -> điều biên quanh NHỊP ÂM TIẾT ~4 Hz -> chuẩn hoá RMS.

Mọi hằng số độ dốc/điều biên là XẤP XỈ TỰ CHỌN, CHƯA hiệu chuẩn theo LTASS hay dữ liệu babble.
Kết quả được kiểm bằng tính chất (tests/test_backend.py), không bằng đánh giá thính giác.
"""
import functools
import io
import wave
import zlib

import numpy as np

from . import gan
from .constants import SCENARIOS, SCENARIO_IDX, LEVEL_CUTOFF, LEVEL_NOISE_GAIN

SR = 22050
MIN_SECONDS, MAX_SECONDS = 0.5, 10.0

SYLLABLE_HZ = 4.0        # điều biên lời nói tập trung ~4 Hz (nhịp âm tiết, khoảng 2–8 Hz)
SYLLABLE_BW_HZ = 1.5     # độ rộng dải điều biên
MOD_DEPTH = 0.5          # độ sâu điều biên (env = 1 + MOD_DEPTH * b, b có std = 1)

TILT_REF_HZ = 500.0      # trên 500 Hz công suất giảm theo luỹ thừa
TILT_POWER_EXP = 2.0     # công suất ∝ f^-2 ≈ -6 dB/oct (xấp xỉ tự chọn)
LP_ORDER = 4             # độ dốc lowpass mềm (Butterworth bậc 4 trên miền tần số)

RMS_SCALE = 0.35         # RMS = gain_cấp_độ * RMS_SCALE -> peak hiếm khi vượt 1
CROSSFADE = 512          # số mẫu crossfade khi lặp đoạn GAN


def default_seed(scenario: str, level: str) -> int:
    """Seed 32-bit suy ra từ (kịch bản, cấp độ) -> cùng tham số luôn ra cùng nhiễu, cache được."""
    return zlib.crc32(f"{scenario}|{level}".encode()) & 0xFFFFFFFF


def modulation_envelope(n: int, rng: np.random.Generator) -> np.ndarray:
    """Điều biên ngẫu nhiên băng hẹp quanh SYLLABLE_HZ, luôn dương (>= 0.05)."""
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

    # 1) độ dốc phổ kiểu lời nói: phẳng dưới 500 Hz, giảm theo luỹ thừa trên đó
    tilt_pow = np.where(f <= TILT_REF_HZ, 1.0, (fs / TILT_REF_HZ) ** (-TILT_POWER_EXP))
    # 2) nhấn dải đặc trưng kịch bản (gaussian trên trục log2 f)
    fc = cfg["noise_freq"]
    q = max(cfg["noise_q"], 0.1)
    emph = 1.0 + 1.5 * np.exp(-((np.log2(fs) - np.log2(fc)) ** 2) * (q * 2.0))
    # 3) lowpass mềm theo cấp độ (mô phỏng mất dải cao của ốc tai)
    lp = 1.0 / np.sqrt(1.0 + (f / cutoff) ** (2 * LP_ORDER))

    X *= np.sqrt(tilt_pow) * emph * lp   # sqrt: đổi công suất thành biên độ
    X[0] = 0.0                           # bỏ DC
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
    """Lặp một đoạn ngắn thành đúng n mẫu, nối bằng crossfade tuyến tính (tổng trọng số = 1)."""
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
    """Trả (wav_bytes, engine) với engine ∈ {'gan', 'procedural'}. Kết quả xác định theo tham số."""
    seconds = round(min(max(float(seconds), MIN_SECONDS), MAX_SECONDS), 1)
    if seed is None:
        seed = default_seed(scenario, level)
    return _cached(scenario, level, seconds, int(seed))


def mix_snr(speech: np.ndarray, noise: np.ndarray, snr_db: float) -> np.ndarray:
    """Trộn speech + noise theo SNR (blueprint mục 2.2). Cùng chiều dài."""
    n = min(len(speech), len(noise))
    s, no = speech[:n], noise[:n]
    ps = np.mean(s ** 2) or 1e-9
    pn = np.mean(no ** 2) or 1e-9
    k = np.sqrt(ps / (pn * (10 ** (snr_db / 10))))
    return s + k * no
