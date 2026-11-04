import io
import pathlib
import sys
import unicodedata
import wave
from fastapi.testclient import TestClient

BACKEND = pathlib.Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))

import main as api
from core import gan, graphrag, noise, phoneme as ph

client = TestClient(api.app)
AUD_OK = {"250": 20, "500": 25, "1000": 30, "2000": 55, "4000": 60, "8000": 65}


def test_health():
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_degrade_custom_audiogram_drops_only_affected_bands():
    aud_high_only = {"250": 15, "500": 15, "1000": 15, "2000": 20, "4000": 60, "8000": 70}
    r = client.post("/degrade", json={
        "text": "sáng thứ Bảy con đi",
        "level": "Normal",
        "lang": "vi",
        "audiogram_db": aud_high_only,
    })
    assert r.status_code == 200
    body = r.json()
    assert body["dropped_bands"] == ["HIGH"]
    assert body["degraded"] == " áng   ứ Bảy con đi"


def test_hearing_aid_eq_calculation():
    r = client.post("/hearing-aid-eq", json={"audiogram_db": AUD_OK})
    assert r.status_code == 200
    body = r.json()
    assert body["pta4_db"] == 42.5
    assert body["eq_bands"]["EQ4000_db"] > body["eq_bands"]["EQ500_db"] >= 0.0


def test_noise_is_valid_wav_with_requested_length():
    r = client.get("/noise", params={"scenario": "car", "level": "Moderate", "seconds": 2})
    w = wave.open(io.BytesIO(r.content))
    assert w.getnchannels() == 1 and w.getframerate() == noise.SR
    assert w.getnframes() == 2 * noise.SR
