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
FIXTURE = pathlib.Path(__file__).resolve().parent / "fixtures" / "parity_fixture.json"


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


def test_parity_fixture_is_fresh():
    """parity_fixture.json (cho check-parity.mjs) phải đúng bằng những gì backend HIỆN TẠI sinh ra.
    Đổi thuật toán/hằng số mà quên chạy `python tests/make_fixtures.py` sẽ bị báo ở đây (AUDIT-13)."""
    import make_fixtures
    on_disk = json.loads(FIXTURE.read_text(encoding="utf-8"))
    fresh = json.loads(json.dumps(make_fixtures.build_fixture(), ensure_ascii=False))
    assert on_disk["cases"], "fixture rỗng"
    assert {c["lang"] for c in on_disk["cases"]} == {"vi", "en"}, "fixture phải phủ cả tiếng Việt và tiếng Anh"
    assert on_disk == fresh, "fixture cũ - chạy: python tests/make_fixtures.py"
    assert make_fixtures.NODES_JS_PATH.read_text(encoding="utf-8") == make_fixtures.build_nodes_js(), \
        "graphrag_nodes.js cũ - chạy: python tests/make_fixtures.py"


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


# ======================================================================
# Rà soát & cải tiến (AUDIT-xx): mỗi bản vá một nhóm test
# ======================================================================
from core import constants  # noqa: E402


# ---- AUDIT-17: các endpoint trước đây chưa có test "đường vui" ----
def test_degrade_happy_path_and_bands_count_letters():
    text = "Dạ sáng thứ Bảy tụi con đi sớm cho kịp ăn trưa ạ."
    r = client.post("/degrade", json={"text": text, "level": "Moderate", "lang": "vi", "dialect": "north"})
    assert r.status_code == 200
    body = r.json()
    assert body["degraded"] == ph.degrade_text(text, "Moderate", "vi", "north")
    # AUDIT-11: mọi band cùng đơn vị "chữ cái" -> tổng bằng số chữ cái của văn bản
    assert sum(body["bands"].values()) == sum(ch.isalpha() for ch in text)


def test_degrade_english_has_no_band_summary():
    r = client.post("/degrade", json={"text": "Thanks for the night shift", "level": "Severe", "lang": "en"})
    assert r.status_code == 200 and r.json()["bands"] is None


def test_read_only_endpoints_have_expected_shape():
    p = client.get("/presets").json()
    assert p["freqs"] == [250, 500, 1000, 2000, 4000, 8000]
    assert set(p["level_presets"]) == set(LEVELS) == set(p["cutoff"]) == set(p["noise_gain"])
    assert all(len(v) == len(p["freqs"]) for v in p["level_presets"].values())
    items = client.get("/sound-items").json()
    assert {"ph_low", "ph_mid", "ph_high"} <= {i["id"] for i in items}
    assert all({"id", "label", "freq", "db"} <= set(i) for i in items)
    assert set(client.get("/scenarios").json()) == set(constants.SCENARIOS)


def test_scenario_table_matches_gan_embedding_size():
    # thêm kịch bản mà quên nâng NUM_SCENARIOS -> chỉ số vượt bảng embedding của GAN
    assert len(constants.SCENARIOS) == gan.NUM_SCENARIOS


def test_graphrag_endpoint_happy_path(monkeypatch):
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    r = client.post("/graphrag", json={"audiogram_db": AUD_OK, "question": "Tại sao tôi nghe tiếng nhưng không rõ chữ?"})
    assert r.status_code == 200
    body = r.json()
    assert body["mode"] == "hardcoded" and graphrag.DISCLAIMER in body["answer"]
    assert isinstance(body["nodes"], list) and body["nodes"]


# ---- AUDIT-04: câu trả lời LLM luôn kèm miễn trừ; lỗi nội bộ không lộ ra API ----
def test_llm_answer_always_carries_disclaimer(monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "sk-test")
    monkeypatch.setattr(graphrag, "_call_llm", lambda sp, q, k: "Bạn nên dùng máy trợ thính ngay.")
    r = graphrag.answer(AUD_OK, "tôi nên làm gì")
    assert r["mode"] == "llm" and graphrag.DISCLAIMER in r["answer"]


def test_llm_answer_does_not_duplicate_disclaimer(monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "sk-test")
    monkeypatch.setattr(graphrag, "_call_llm", lambda sp, q, k: f"Trả lời. {graphrag.DISCLAIMER}")
    assert graphrag.answer(AUD_OK, "hỏi")["answer"].count(graphrag.DISCLAIMER) == 1


def test_llm_failure_hides_internal_details(monkeypatch, caplog):
    monkeypatch.setenv("LLM_API_KEY", "sk-secret-123")

    def boom(sp, q, k):
        raise RuntimeError("401 for url https://internal-llm.corp.example/v1/chat/completions")

    monkeypatch.setattr(graphrag, "_call_llm", boom)
    with caplog.at_level("WARNING", logger="drbunny.graphrag"):
        r = graphrag.answer(AUD_OK, "hỏi")
    assert r["mode"] == "hardcoded" and graphrag.DISCLAIMER in r["answer"]
    assert r["llm_error"] == "RuntimeError"                      # chỉ tên loại lỗi
    blob = json.dumps(r, ensure_ascii=False)
    assert "internal-llm" not in blob and "sk-secret" not in blob
    assert "internal-llm" in caplog.text                         # chi tiết vẫn vào log máy chủ


# ---- AUDIT-12: vòng đời HTTP client ----
def test_http_client_is_shared_and_closed_by_lifespan():
    graphrag.close_client()
    c1 = graphrag._client()
    assert graphrag._client() is c1
    with TestClient(api.app):        # vào/ra context -> chạy lifespan (khởi động rồi tắt server)
        pass
    assert c1.is_closed and graphrag._HTTP is None


def test_http_client_creation_is_thread_safe():
    import concurrent.futures as cf
    graphrag.close_client()
    with cf.ThreadPoolExecutor(16) as ex:
        got = list(ex.map(lambda _: graphrag._client(), range(64)))
    assert len({id(c) for c in got}) == 1
    graphrag.close_client()


def test_llm_timeout_env_is_parsed_safely(monkeypatch):
    monkeypatch.setenv("LLM_TIMEOUT", "không-phải-số")
    assert graphrag._env_float("LLM_TIMEOUT", 15.0) == 15.0     # giá trị hỏng không làm sập server
    monkeypatch.setenv("LLM_TIMEOUT", "7.5")
    assert graphrag._env_float("LLM_TIMEOUT", 15.0) == 7.5


# ---- AUDIT-03: từ khoá trùng sau chuẩn hoá ----
def test_keywords_have_no_duplicates_after_normalization():
    for n in graphrag.NODES:
        assert len(n["keywords"]) == len(set(n["keywords"])), n["id"]


def test_accented_keyword_scores_once():
    with_accent = graphrag.retrieve(AUD_OK, "Tôi bị ù tai", k=6)
    without = graphrag.retrieve(AUD_OK, "Tôi bị u tai", k=6)
    assert with_accent == without                                # có dấu hay không dấu phải cùng điểm
    seek = next(x for x in with_accent if x["id"] == "SEEK_CARE")
    assert seek["hits"].count("u tai") == 1 and seek["score"] == pytest.approx(3.5)


# ---- AUDIT-02: cache âm tiết có chặn trên ----
def test_syllable_cache_is_bounded_regardless_of_input_size():
    ph._segment_cached.cache_clear()
    rng = np.random.default_rng(0)
    letters = list("abcdeghiklmnoprstuvxy")
    for _ in range(60):              # 60 văn bản x 400 "từ" ngẫu nhiên: ~24 nghìn âm tiết khác nhau
        text = " ".join("".join(rng.choice(letters, size=int(rng.integers(2, 9)))) for _ in range(400))
        ph.classify_vi(text)
    info = ph._segment_cached.cache_info()
    assert 0 < info.currsize <= ph.SYLLABLE_CACHE_SIZE


def test_overlong_tokens_bypass_the_cache():
    ph._segment_cached.cache_clear()
    ph.classify_vi("a" * 5000 + " " + "b" * (ph.MAX_CACHED_TOKEN + 1))
    assert ph._segment_cached.cache_info().currsize == 0


def test_cache_does_not_change_results():
    text = "Dạ sáng thứ Bảy tụi con đi sớm cho kịp ăn trưa ạ."
    ph._segment_cached.cache_clear()
    cold = ph.classify_vi(text)
    assert cold == ph.classify_vi(text)                          # lần 2 đi qua cache, kết quả y hệt
    assert "".join(seg for seg, _ in cold) == text               # ghép lại đúng văn bản gốc


# ---- AUDIT-05 + 17: DSP ----
def test_loop_to_keeps_power_constant_at_seams():
    rng = np.random.default_rng(0)
    seg = rng.standard_normal(16384)
    out = noise.loop_to(seg, noise.SR * 6)
    fade, step = noise.CROSSFADE, len(seg) - noise.CROSSFADE
    rms = lambda x: float(np.sqrt(np.mean(x ** 2)))              # noqa: E731
    body = rms(out[2000: step - 2000])
    for k in range(1, 5):
        dip_db = 20 * np.log10(rms(out[k * step: k * step + fade]) / body)
        assert abs(dip_db) < 1.0, f"chỗ nối #{k} lệch {dip_db:.2f} dB (crossfade tuyến tính cho ~-2 dB)"
    assert rms(out[:fade]) == pytest.approx(body, rel=0.15)      # đầu đoạn không bị fade-in từ 0


def test_mix_snr_hits_requested_snr():
    rng = np.random.default_rng(1)
    s = rng.standard_normal(20000) * 0.3
    n = rng.standard_normal(20000) * 0.5
    for snr in (-5.0, 0.0, 10.0):
        added = noise.mix_snr(s, n, snr) - s                     # phần nhiễu đã được nhân hệ số
        measured = 10 * np.log10(np.mean(s ** 2) / np.mean(added ** 2))
        assert measured == pytest.approx(snr, abs=0.01)


def test_procedural_noise_loops_without_a_click():
    """Nhiễu thủ tục sinh bằng irfft nên tuần hoàn theo độ dài -> src.loop=true không bị tiếng tách."""
    wav, _ = noise.generate_wav("shopping", "Moderate", 4.0)
    w = wave.open(io.BytesIO(wav))
    pcm = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(float)
    jump, typical = abs(pcm[0] - pcm[-1]), float(np.mean(np.abs(np.diff(pcm))))
    assert jump < 6 * typical

