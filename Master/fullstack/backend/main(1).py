import os
from typing import Dict, Literal, Optional

from fastapi import FastAPI, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from core import constants, phoneme, graphrag, noise, audiometry_eq

Level = Literal["Normal", "Mild", "Moderate", "Severe"]
Lang = Literal["vi", "en"]
Dialect = Literal["north", "south"]
Scenario = Literal["shopping", "conversation", "meeting", "restaurant", "crowd", "car", "music"]

FREQ_KEYS = {str(f) for f in constants.FREQS}
MAX_TEXT = 5000
MAX_QUESTION = 500
DB_MIN, DB_MAX = -10, 110

app = FastAPI(title="Dr. Bunny API", version="0.4.0")

_origins = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    expose_headers=["X-Noise-Engine"],
)


def _validate_audiogram_dict(v: Dict[str, int]) -> Dict[str, int]:
    if set(v) != FREQ_KEYS:
        raise ValueError(f"audiogram_db phải đủ đúng các tần số {sorted(FREQ_KEYS, key=int)}")
    bad = {k: db for k, db in v.items() if not DB_MIN <= db <= DB_MAX}
    if bad:
        raise ValueError(f"ngưỡng ngoài khoảng [{DB_MIN}, {DB_MAX}] dB: {bad}")
    return v


class DegradeReq(BaseModel):
    text: str = Field(default="", max_length=MAX_TEXT)
    level: Level = "Normal"
    lang: Lang = "vi"
    dialect: Dialect = "north"
    audiogram_db: Optional[Dict[str, int]] = None

    @field_validator("audiogram_db")
    @classmethod
    def _check_opt_audiogram(cls, v: Optional[Dict[str, int]]) -> Optional[Dict[str, int]]:
        return _validate_audiogram_dict(v) if v is not None else None


class GraphRagReq(BaseModel):
    audiogram_db: Dict[str, int]
    question: Optional[str] = Field(default=None, max_length=MAX_QUESTION)

    @field_validator("audiogram_db")
    @classmethod
    def _check_audiogram(cls, v: Dict[str, int]) -> Dict[str, int]:
        return _validate_audiogram_dict(v)


class HearingAidEqReq(BaseModel):
    audiogram_db: Dict[str, int]

    @field_validator("audiogram_db")
    @classmethod
    def _check_audiogram(cls, v: Dict[str, int]) -> Dict[str, int]:
        return _validate_audiogram_dict(v)


@app.get("/health")
def health():
    return {"status": "ok", "service": "dr-bunny", "version": app.version}


@app.get("/scenarios")
def scenarios():
    return constants.SCENARIOS


@app.get("/sound-items")
def sound_items():
    return constants.SOUND_ITEMS


@app.get("/presets")
def presets():
    return {
        "freqs": constants.FREQS,
        "level_presets": constants.LEVEL_PRESETS,
        "cutoff": constants.LEVEL_CUTOFF,
        "noise_gain": constants.LEVEL_NOISE_GAIN,
        "sample_profiles": audiometry_eq.SAMPLE_PROFILES,
    }


@app.post("/degrade")
def degrade(req: DegradeReq):
    return {
        "level": req.level,
        "lang": req.lang,
        "degraded": phoneme.degrade_text(req.text, req.level, req.lang, req.dialect, req.audiogram_db),
        "bands": phoneme.band_summary(req.text, req.dialect) if req.lang == "vi" else None,
        "dropped_bands": sorted(phoneme.bands_from_audiogram(req.audiogram_db)) if req.audiogram_db else None,
    }


@app.post("/hearing-aid-eq")
def hearing_aid_eq(req: HearingAidEqReq):
    return audiometry_eq.compute_eq_from_audiogram(req.audiogram_db)


@app.post("/graphrag")
def graphrag_ep(req: GraphRagReq):
    return graphrag.answer(req.audiogram_db, req.question)


@app.get("/noise")
def noise_ep(
    scenario: Scenario = Query("shopping"),
    level: Level = Query("Normal"),
    seconds: float = Query(3.0, ge=0.5, le=10.0),
    seed: Optional[int] = Query(None, ge=0, le=2**32 - 1),
):
    wav, engine = noise.generate_wav(scenario, level, seconds, seed)
    return Response(
        content=wav,
        media_type="audio/wav",
        headers={
            "X-Noise-Engine": engine,
            "Cache-Control": "public, max-age=86400",
        },
    )
