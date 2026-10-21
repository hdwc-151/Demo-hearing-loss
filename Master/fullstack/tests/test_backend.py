"""Kiểm thử backend Dr. Bunny. Chạy:  cd fullstack && python -m pytest tests -q"""
import io
import json
import pathlib
import sys
import unicodedata
import wave

import numpy as np
import pytest
from fastapi.testclient import TestClient

BACKEND = pathlib.Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))

import main as api  # noqa: E402
from core import gan, graphrag, noise, phoneme as ph  # noqa: E402

client = TestClient(api.app)
AUD_OK = {"250": 20, "500": 25, "1000": 30, "2000": 55, "4000": 60, "8000": 65}
LEVELS = ["Normal", "Mild", "Moderate", "Severe"]
FIXTURE = pathlib.Path(__file__).resolve().parent / "fixtures" / "phoneme_vi.json"


# ---------------- API: validation ----------------
def test_health():
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_graphrag_rejects_missing_keys():
    r = client.post("/graphrag", json={"audiogram_db": {"250": 20}, "question": "x"})
    assert r.status_code == 422


def test_graphrag_rejects_out_of_range_db():
    bad = {k: 999 for k in AUD_OK}
    assert client.post("/graphrag", json={"audiogram_db": bad}).status_code == 422


def test_graphrag_rejects_long_question():
    r = client.post("/graphrag", json={"audiogram_db": AUD_OK, "question": "a" * 501})
    assert r.status_code == 422


def test_degrade_rejects_huge_text():
    assert client.post("/degrade", json={"text": "a" * 5001, "level": "Mild"}).status_code == 422


def test_degrade_rejects_unknown_level():
    assert client.post("/degrade", json={"text": "abc", "level": "Extreme"}).status_code == 422


def test_noise_rejects_unknown_scenario():
    assert client.get("/noise", params={"scenario": "<x>", "level": "Mild"}).status_code == 422


def test_noise_rejects_out_of_range_seconds():
    assert client.get("/noise", params={"scenario": "car", "seconds": 99}).status_code == 422


# ---------------- API: CORS ----------------
def test_cors_blocks_foreign_origin():
    r = client.get("/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in {k.lower() for k in r.headers}


def test_cors_allows_dev_origin():
    r = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


# ---------------- Noise: contract ----------------
def test_noise_is_reproducible_and_cacheable():
    a = client.get("/noise", params={"scenario": "shopping", "level": "Mild"})
    b = client.get("/noise", params={"scenario": "shopping", "level": "Mild"})
    assert a.content == b.content
    assert "max-age" in a.headers["cache-control"]


def test_noise_is_valid_wav_with_requested_length():
    r = client.get("/noise", params={"scenario": "car", "level": "Moderate", "seconds": 2})
    w = wave.open(io.BytesIO(r.content))
    assert w.getnchannels() == 1 and w.getframerate() == noise.SR
    assert w.getnframes() == 2 * noise.SR


def test_noise_reports_procedural_engine_without_gan():
    r = client.get("/noise", params={"scenario": "crowd", "level": "Normal"})
    assert r.headers["x-noise-engine"] == "procedural"


# ---------------- Noise: model properties ----------------
def _spectral_centroid(y):
    P = np.abs(np.fft.rfft(y)) ** 2
    f = np.fft.rfftfreq(len(y), 1.0 / noise.SR)
    return float((f * P).sum() / P.sum())


def _hf_fraction(y, cut=2000.0):
    P = np.abs(np.fft.rfft(y)) ** 2
    f = np.fft.rfftfreq(len(y), 1.0 / noise.SR)
    return float(P[f > cut].sum() / P.sum())


def test_envelope_peak_near_syllable_rate():
    n = noise.SR * 8  # 8 s -> độ phân giải 0.125 Hz
    env = noise.modulation_envelope(n, np.random.default_rng(0))
    e = env - env.mean()
    S = np.abs(np.fft.rfft(e))
    f = np.fft.rfftfreq(n, 1.0 / noise.SR)
    mask = (f >= 1) & (f <= 12)
    peak = f[mask][np.argmax(S[mask])]
    assert 3.0 <= peak <= 5.0, f"đỉnh điều biên {peak:.2f} Hz, kỳ vọng quanh 4 Hz"


def test_high_frequency_energy_falls_with_level():
    hf = {lv: _hf_fraction(noise.render_procedural("shopping", lv, 4, 7)) for lv in LEVELS}
    assert hf["Normal"] > hf["Mild"] > hf["Moderate"] > hf["Severe"], hf


def test_rms_increases_with_level():
    rms = {lv: float(np.sqrt(np.mean(noise.render_procedural("car", lv, 3, 1) ** 2))) for lv in LEVELS}
    vals = [rms[lv] for lv in LEVELS]
    assert vals == sorted(vals) and len(set(vals)) == 4, rms


def test_noise_peaks_stay_inside_range():
    y = noise.render_procedural("restaurant", "Severe", 5, 3)
    assert np.max(np.abs(y)) <= 1.0


def test_loop_to_exact_length_and_no_nan():
    seg = np.random.default_rng(1).standard_normal(gan.AUDIO_LEN)
    out = noise.loop_to(seg, noise.SR * 3)
    assert len(out) == noise.SR * 3 and np.all(np.isfinite(out))


# ---------------- GAN: contract ----------------
def test_gan_output_length_equals_audio_len():
    # blueprint cũ cho 16385; sau sửa output_padding phải đúng 16384
    assert gan.expected_length() == gan.AUDIO_LEN == 16384


def test_gan_falls_back_without_checkpoint(monkeypatch):
    monkeypatch.delenv("GAN_CKPT", raising=False)
    gan._state.update(tried=False, model=None)
    assert gan.sample(0, 1) is None


# ---------------- Phoneme ----------------
def test_nfd_and_nfc_give_same_output():
    s = "Dạ sáng thứ Bảy tụi con đi sớm"
    for lv in ["Mild", "Moderate", "Severe"]:
        assert ph.degrade_text(unicodedata.normalize("NFD", s), lv, "vi") == ph.degrade_text(s, lv, "vi")


def test_syllable_known_cases():
    assert ph.degrade_text("gì", "Mild", "vi") == " ì"
    assert ph.degrade_text("gia", "Mild", "vi") == "  a"
    assert [b for _, b in ph.classify_vi("mắt")] == ["LOW", "VOWEL", "MID"]
    assert [b for _, b in ph.classify_vi("măng")] == ["LOW", "VOWEL", "LOW"]


def test_severe_keeps_every_vowel():
    s = "xin chào bố mẹ"
    out = ph.degrade_text(s, "Severe", "vi")
    vowels = lambda t: [c for c in t if unicodedata.normalize("NFD", c)[0].lower() in "aeiouy"]
    assert vowels(out) == vowels(s)


def test_dialect_changes_d_band():
    assert [b for seg, b in ph.classify_vi("dơ", "north") if seg == "d"] == ["HIGH"]
    assert [b for seg, b in ph.classify_vi("dơ", "south") if seg == "d"] == ["LOW"]


def test_phoneme_fixture_is_fresh():
    """Fixture (dùng cho parity JS) phải khớp engine Python hiện tại."""
    data = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert data["cases"], "fixture rỗng"
    for c in data["cases"]:
        assert ph.degrade_text(c["text"], c["level"], "vi", c["dialect"]) == c["expected"], c


# ---------------- GraphRAG ----------------
def test_keywords_are_normalized():
    for n in graphrag.NODES:
        for k in n["keywords"]:
            assert k == graphrag._norm(k).strip(), k


def test_word_boundary_matching():
    # "chu" (từ khoá node HIGH) không được khớp nhầm vào "chuyện"
    hits = {n["id"]: n["hits"] for n in graphrag.retrieve(AUD_OK, "nói chuyện", k=5)}
    assert "chu" not in hits.get("HIGH_FREQ_LOSS", [])


def test_diacritic_keyword_matches():
    assert graphrag.retrieve(AUD_OK, "Tôi bị ù tai", k=1)[0]["id"] == "SEEK_CARE"


def test_llm_off_uses_hardcoded(monkeypatch):
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    r = graphrag.answer(AUD_OK, "siêu thị ồn quá")
    assert r["mode"] == "hardcoded" and "NOISY_ENVIRONMENT" in r["nodes"]


def test_retrieval_regression_floor():
    """Không được tụt dưới mức đã đo. Bộ dev/holdout xem tests/eval_retrieval.py."""
    import importlib.util
    spec = importlib.util.spec_from_file_location("ev", pathlib.Path(__file__).parent / "eval_retrieval.py")
    ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
    dev1, _ = ev.evaluate(verbose=False)
    hold1, _ = ev.evaluate(ev.HOLDOUT, verbose=False)
    assert dev1 >= 1.0 and hold1 >= 1.0
