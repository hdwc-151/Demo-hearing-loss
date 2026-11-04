from typing import Dict, List

BAND_EQ500 = [250, 500]
BAND_EQ2000 = [1000, 2000]
BAND_EQ4000 = [4000, 8000]

GAIN_FACTOR = 0.4
GAIN_MAX_DB = 25.0
GAIN_MIN_DB = 0.0

SAMPLE_PROFILES = {
    "Alice (Lão thính cao tần)": {"250": 15, "500": 25, "1000": 35, "2000": 50, "4000": 65, "8000": 75},
    "Bob (Tiếp xúc tiếng ồn 4kHz)": {"250": 10, "500": 15, "1000": 20, "2000": 35, "4000": 60, "8000": 40},
    "Clara (Suy giảm nhẹ)": {"250": 20, "500": 25, "1000": 25, "2000": 30, "4000": 35, "8000": 40},
}


def compute_eq_from_audiogram(audiogram_db: Dict[str, int]) -> dict:
    int_map = {int(k): float(v) for k, v in audiogram_db.items()}
    ref = min(min(int_map.values()), 15.0)
    losses = {f: max(0.0, int_map[f] - ref) for f in int_map}

    def band_gain(freq_list: List[int]) -> float:
        vals = [losses[f] for f in freq_list if f in losses]
        if not vals:
            return 0.0
        gain = GAIN_FACTOR * (sum(vals) / len(vals))
        return round(max(GAIN_MIN_DB, min(GAIN_MAX_DB, gain)), 1)

    eq500 = band_gain(BAND_EQ500)
    eq2000 = band_gain(BAND_EQ2000)
    eq4000 = band_gain(BAND_EQ4000)

    per_freq_gain = {
        str(f): round(max(GAIN_MIN_DB, min(GAIN_MAX_DB, GAIN_FACTOR * losses[f])), 1)
        for f in sorted(int_map)
    }

    pta4_freqs = [500, 1000, 2000, 4000]
    pta4 = round(sum(int_map[f] for f in pta4_freqs) / 4.0, 1)

    return {
        "pta4_db": pta4,
        "reference_db": round(ref, 1),
        "eq_bands": {
            "EQ500_db": eq500,
            "EQ2000_db": eq2000,
            "EQ4000_db": eq4000,
        },
        "per_freq_gain_db": per_freq_gain,
        "compression_threshold_db": -24.0,
        "compression_ratio": 4.0,
        "rule": f"gain = {GAIN_FACTOR} * loss (clipped {GAIN_MIN_DB}..{GAIN_MAX_DB} dB) + Amplitude Limiter",
    }
